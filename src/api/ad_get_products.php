<?php
 
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

// Handle preflight request (IMPORTANT)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$conn = new mysqli("sql213.infinityfree.com", "if0_41971414", "charity3614856", "if0_41971414_fuku");
if ($conn->connect_error) {
    echo json_encode(["error" => "Connection failed"]);
    exit;
}

// ✅ current_stock = sum of product_variants (not quantity - sold)
// ✅ sold & revenue = real-time from order_items, excluding Cancelled
$result = $conn->query("
    SELECT
        p.id,
        p.name,
        p.price,
        p.description,
        p.quantity,
        p.image,
        p.category,
        (
            SELECT COALESCE(SUM(pv.quantity), 0)
            FROM product_variants pv
            WHERE pv.product_id = p.id
        ) AS current_stock,
        (
            SELECT COALESCE(SUM(oi.quantity), 0)
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE oi.product_name = p.name AND o.status != 'Cancelled'
        ) AS sold,
        (
            SELECT COALESCE(SUM(oi.quantity * oi.price), 0)
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE oi.product_name = p.name AND o.status != 'Cancelled'
        ) AS revenue
    FROM products p
    ORDER BY p.id DESC
");

$products = [];
while ($row = $result->fetch_assoc()) {
    $products[] = $row;
}

echo json_encode($products);
$conn->close();
?>