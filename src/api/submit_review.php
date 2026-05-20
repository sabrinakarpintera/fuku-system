<?php
/**
 * submit_review.php
 * Inserts reviews for each item in a completed order.
 * Resolves product_id from order_items.product_id (added via migration.sql).
 *
 * POST body (JSON):
 * {
 *   "order_id": 42,          ← orders.id  (integer)
 *   "user_id":  7,
 *   "reviews": [
 *     { "product_name": "Fuku Tee", "rating": 5, "comment": "Love it!", "color": "Black", "size": "M" },
 *     ...
 *   ]
 * }
 */

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["success" => false, "message" => "Method not allowed."]);
    exit;
}

require_once __DIR__ . "/db.php"; // provides $conn (mysqli)

$body    = json_decode(file_get_contents("php://input"), true);
$orderId = intval($body["order_id"] ?? 0);
$userId  = intval($body["user_id"]  ?? 0);
$reviews = $body["reviews"] ?? [];

if (!$orderId || !$userId || empty($reviews)) {
    echo json_encode(["success" => false, "message" => "Missing required fields."]);
    exit;
}

// ── Verify order belongs to this user ─────────────────────────────────────────
$chk = $conn->prepare("SELECT id FROM orders WHERE id = ? AND user_id = ? LIMIT 1");
$chk->bind_param("ii", $orderId, $userId);
$chk->execute();
if ($chk->get_result()->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Order not found or access denied."]);
    exit;
}
$chk->close();

// ── Build a product_name → product_id map from order_items ───────────────────
// After running migration.sql, order_items.product_id is populated.
// We look it up here so the frontend never needs to send a product_id.
$mapStmt = $conn->prepare(
    "SELECT oi.product_name, oi.product_id
     FROM   order_items oi
     WHERE  oi.order_id = ? AND oi.product_id IS NOT NULL"
);
$mapStmt->bind_param("i", $orderId);
$mapStmt->execute();
$mapResult  = $mapStmt->get_result();
$productMap = []; // product_name → product_id

while ($row = $mapResult->fetch_assoc()) {
    $productMap[$row["product_name"]] = (int) $row["product_id"];
}
$mapStmt->close();

// Fallback: if order_items.product_id is still NULL for some rows,
// resolve by matching product name in the products table.
$fallbackStmt = $conn->prepare("SELECT id FROM products WHERE name = ? LIMIT 1");

foreach ($reviews as &$r) {
    $name = trim($r["product_name"] ?? "");
    if (!isset($productMap[$name])) {
        $fallbackStmt->bind_param("s", $name);
        $fallbackStmt->execute();
        $row = $fallbackStmt->get_result()->fetch_assoc();
        $productMap[$name] = $row ? (int) $row["id"] : 0;
    }
}
unset($r);
$fallbackStmt->close();

// ── Validate ratings ──────────────────────────────────────────────────────────
foreach ($reviews as $r) {
    $rating = intval($r["rating"] ?? 0);
    if ($rating < 1 || $rating > 5) {
        echo json_encode(["success" => false, "message" => "Rating must be between 1 and 5."]);
        exit;
    }
    $name = trim($r["product_name"] ?? "");
    if (empty($productMap[$name])) {
        echo json_encode(["success" => false, "message" => "Could not resolve product_id for: $name"]);
        exit;
    }
}

// ── Insert reviews in a transaction ──────────────────────────────────────────
$ins = $conn->prepare(
    "INSERT IGNORE INTO reviews
        (order_id, user_id, product_id, product_name, color, size, rating, comment)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    // IGNORE silently skips the unique constraint (user+order+product) on re-submit
);

if (!$ins) {
    echo json_encode(["success" => false, "message" => "Prepare failed: " . $conn->error]);
    exit;
}

$conn->begin_transaction();

try {
    foreach ($reviews as $r) {
        $name      = substr(trim($r["product_name"] ?? ""), 0, 255);
        $productId = $productMap[$name];
        $color     = substr(trim($r["color"]   ?? ""), 0, 100);
        $size      = substr(trim($r["size"]    ?? ""), 0, 50);
        $rating    = intval($r["rating"]);
        $comment   = substr(trim($r["comment"] ?? ""), 0, 1000);

        $ins->bind_param("iiisssis", $orderId, $userId, $productId, $name, $color, $size, $rating, $comment);

        if (!$ins->execute()) {
            throw new Exception("Insert failed: " . $ins->error);
        }
    }

    // Mark order as Completed
    $upd = $conn->prepare("UPDATE orders SET status = 'Completed' WHERE id = ? AND user_id = ?");
    if (!$upd) throw new Exception("Update prepare failed: " . $conn->error);
    $upd->bind_param("ii", $orderId, $userId);
    if (!$upd->execute()) throw new Exception("Update failed: " . $upd->error);
    $upd->close();

    $conn->commit();
    echo json_encode(["success" => true, "message" => "Reviews submitted successfully."]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}

$ins->close();
$conn->close();