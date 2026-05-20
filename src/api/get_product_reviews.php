<?php
/**
 * get_product_reviews.php
 * Fetch all reviews for a product by its products.id.
 *
 * GET /api/get_product_reviews.php?product_id=12
 */
session_start();

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

require_once __DIR__ . "/db.php"; // provides $conn (mysqli)

$productId = intval($_GET["product_id"] ?? 0);

if (!$productId) {
    echo json_encode(["success" => false, "message" => "product_id is required."]);
    exit;
}

// ── Confirm product exists ────────────────────────────────────────────────────
$chk = $conn->prepare("SELECT id FROM products WHERE id = ? LIMIT 1");
$chk->bind_param("i", $productId);
$chk->execute();
if ($chk->get_result()->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Product not found."]);
    exit;
}
$chk->close();

// ── Aggregate stats ───────────────────────────────────────────────────────────
$aggStmt = $conn->prepare(
    "SELECT
        COUNT(*)              AS total_reviews,
        ROUND(AVG(rating), 1) AS average_rating,
        SUM(rating = 5)       AS star5,
        SUM(rating = 4)       AS star4,
        SUM(rating = 3)       AS star3,
        SUM(rating = 2)       AS star2,
        SUM(rating = 1)       AS star1
     FROM reviews
     WHERE product_id = ?"
);

if (!$aggStmt) {
    echo json_encode(["success" => false, "message" => "Aggregate query failed: " . $conn->error]);
    exit;
}

$aggStmt->bind_param("i", $productId);
$aggStmt->execute();
$agg = $aggStmt->get_result()->fetch_assoc();
$aggStmt->close();

// ── Individual reviews ────────────────────────────────────────────────────────
// users.name is a single "Full Name" column.
// Display as "Maria S." for privacy.
$revStmt = $conn->prepare(
    "SELECT
        r.id,
        CONCAT(
            SUBSTRING_INDEX(u.name, ' ', 1),
            ' ',
            LEFT(SUBSTRING_INDEX(u.name, ' ', -1), 1),
            '.'
        )             AS user_name,
        r.rating,
        r.comment,
        r.color,
        r.size,
        r.created_at
     FROM reviews r
     JOIN users u ON u.id = r.user_id
     WHERE r.product_id = ?
     ORDER BY r.created_at DESC
     LIMIT 50"
);

if (!$revStmt) {
    echo json_encode(["success" => false, "message" => "Review query failed: " . $conn->error]);
    exit;
}

$revStmt->bind_param("i", $productId);
$revStmt->execute();
$result  = $revStmt->get_result();
$reviews = [];

while ($row = $result->fetch_assoc()) {
    $reviews[] = [
        "id"         => (int) $row["id"],
        "user_name"  => $row["user_name"],
        "rating"     => (int) $row["rating"],
        "comment"    => $row["comment"] ?? "",
        "color"      => $row["color"]   ?? "",
        "size"       => $row["size"]    ?? "",
        "created_at" => $row["created_at"],
    ];
}

$revStmt->close();
$conn->close();

echo json_encode([
    "success"        => true,
    "product_id"     => $productId,
    "average_rating" => $agg["total_reviews"] > 0 ? (float) $agg["average_rating"] : null,
    "total_reviews"  => (int) $agg["total_reviews"],
    "star_breakdown" => [
        "5" => (int) $agg["star5"],
        "4" => (int) $agg["star4"],
        "3" => (int) $agg["star3"],
        "2" => (int) $agg["star2"],
        "1" => (int) $agg["star1"],
    ],
    "reviews" => $reviews,
]);