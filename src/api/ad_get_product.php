<?php

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$conn = new mysqli("localhost", "root", "", "fuku");

if ($conn->connect_error) {
    echo json_encode(["error" => "Connection failed"]);
    exit;
}

$id = intval($_GET["id"]);

$stmt = $conn->prepare("
    SELECT id, name, price, description, quantity, image, category, sold
    FROM products WHERE id = ?
");
$stmt->bind_param("i", $id);
$stmt->execute();
$result = $stmt->get_result();
$product = $result->fetch_assoc();

if (!$product) {
    echo json_encode(["error" => "Product not found"]);
    exit;
}

$sizes = [];
$sizeResult = $conn->query("SELECT size FROM product_sizes WHERE product_id = $id");
while ($row = $sizeResult->fetch_assoc()) {
    $sizes[] = $row["size"];
}

$colors = [];
$colorResult = $conn->query("SELECT color FROM product_colors WHERE product_id = $id");
while ($row = $colorResult->fetch_assoc()) {
    $colors[] = $row["color"];
}

$product["sizes"]  = $sizes;
$product["colors"] = $colors;

echo json_encode($product);

$conn->close();
?>