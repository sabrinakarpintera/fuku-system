<?php
session_start();

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if (!isset($_SESSION['user_id'])) {

    http_response_code(401);

    echo json_encode([
        "message" => "Unauthorized"
    ]);

    exit();
}

$conn = new mysqli("localhost", "root", "", "fuku");

if ($conn->connect_error) {

    echo json_encode([
        "message" => "Database connection failed"
    ]);

    exit();
}

$sql = "SELECT * FROM products ORDER BY id DESC";

$result = $conn->query($sql);

$products = [];

while ($product = $result->fetch_assoc()) {

    $productId = $product['id'];

    $sizes = [];

    $sizeQuery = $conn->query(
        "SELECT size FROM product_sizes WHERE product_id = $productId"
    );

    while ($sizeRow = $sizeQuery->fetch_assoc()) {
        $sizes[] = $sizeRow['size'];
    }

    $colors = [];

    $colorQuery = $conn->query(
        "SELECT color FROM product_colors WHERE product_id = $productId"
    );

    while ($colorRow = $colorQuery->fetch_assoc()) {
        $colors[] = $colorRow['color'];
    }

    $product['sizes'] = $sizes;
    $product['colors'] = $colors;

    $products[] = $product;
}

echo json_encode($products);

$conn->close();
?>