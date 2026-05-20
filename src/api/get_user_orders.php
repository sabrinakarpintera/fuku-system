<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

$conn = new mysqli("localhost", "root", "", "fuku");

if ($conn->connect_error) {
    echo json_encode(["error" => "Connection failed"]);
    exit;
}

if (!isset($_GET["user_id"]) || empty($_GET["user_id"])) {
    echo json_encode([]);
    exit;
}

$user_id = intval($_GET["user_id"]);

// Base URL for images — no trailing "uploads/" since products.image already
// stores the path from the project root, e.g. "uploads/products/shirt.jpg"
define("BASE_URL", "http://localhost/Fuku/src/api/");

$query = "SELECT id, order_code, address, payment_method, subtotal, total, status, created_at 
          FROM orders 
          WHERE user_id = ? 
          ORDER BY created_at DESC";

$stmt = $conn->prepare($query);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

$orders = [];

// Prefer order_items.image (saved at order time); fall back to products.image
// if the image column is empty (e.g. old orders placed before the bind_param fix)
$itemStmt = $conn->prepare(
    "SELECT oi.product_name, oi.color, oi.size, oi.quantity, oi.price,
            COALESCE(NULLIF(TRIM(oi.image), ''), p.image) AS image
     FROM order_items oi
     LEFT JOIN products p ON p.name = oi.product_name
     WHERE oi.order_id = ?"
);

while ($order = $result->fetch_assoc()) {
    $db_id = $order["id"];

    $itemStmt->bind_param("i", $db_id);
    $itemStmt->execute();
    $itemsResult = $itemStmt->get_result();

    $items     = [];
    $total_qty = 0;

    while ($item = $itemsResult->fetch_assoc()) {
        $total_qty += (int)$item["quantity"];

        // Build the full image URL safely:
        // - If image is empty → null (React will hide it via onError)
        // - If image already starts with "http" → use as-is (already absolute)
        // - Otherwise → prepend BASE_URL (handles "uploads/products/x.jpg")
        $raw = trim($item["image"] ?? "");
        if (!$raw) {
            $imageUrl = null;
        } elseif (str_starts_with($raw, "http")) {
            $imageUrl = $raw;
        } else {
            $imageUrl = BASE_URL . ltrim($raw, "/");
        }

        $items[] = [
            "name"  => $item["product_name"],
            "color" => $item["color"],
            "size"  => $item["size"],
            "qty"   => (int)$item["quantity"],
            "price" => (float)$item["price"],
            "image" => $imageUrl,
        ];
    }

    $orders[] = [
        "id"         => $order["order_code"],
        "db_id"      => (int)$db_id,
        "date"       => date("F d, Y", strtotime($order["created_at"])),
        "status"     => $order["status"],
        "items"      => $items,
        "item_count" => $total_qty,
        "total"      => (float)$order["total"],
        "payment"    => $order["payment_method"],
        "address"    => $order["address"],
        "shipping"   => (float)$order["total"] - (float)$order["subtotal"], // Calculate shipping from total and subtotal
        "subtotal"   => (float)$order["subtotal"],
    ];
}

$itemStmt->close();
$stmt->close();
$conn->close();

echo json_encode($orders);