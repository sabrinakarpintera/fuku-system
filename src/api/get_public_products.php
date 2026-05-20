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
    echo json_encode(["message" => "Database connection failed"]);
    exit();
}

$result = $conn->query("SELECT * FROM products ORDER BY id DESC");

if (!$result) {
    echo json_encode(["message" => "Query failed: " . $conn->error]);
    exit();
}

$products = [];

while ($product = $result->fetch_assoc()) {
    $pid = (int)$product['id'];

    $sizes = [];
    $sq = $conn->query("SELECT size FROM product_sizes WHERE product_id = $pid");
    while ($row = $sq->fetch_assoc()) $sizes[] = $row['size'];

    $colors = [];
    $cq = $conn->query("SELECT color FROM product_colors WHERE product_id = $pid");
    while ($row = $cq->fetch_assoc()) $colors[] = $row['color'];

    $variants = [];
    $vq = $conn->query("SELECT size, color, quantity FROM product_variants WHERE product_id = $pid");
    while ($row = $vq->fetch_assoc()) {
        $variants[] = [
            "size"     => $row['size'],
            "color"    => $row['color'],
            "quantity" => (int)$row['quantity'],
        ];
    }

    $product['sizes']    = $sizes;
    $product['colors']   = $colors;
    $product['variants'] = $variants;

    $products[] = $product;
}

echo json_encode($products);
$conn->close();
?>