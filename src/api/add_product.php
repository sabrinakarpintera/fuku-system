<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: POST");

$conn = new mysqli("localhost", "root", "", "fuku");

if ($conn->connect_error) {
    echo json_encode(["message" => "Connection failed: " . $conn->connect_error]);
    exit;
}

$name        = $conn->real_escape_string($_POST["name"]);
$price       = $conn->real_escape_string($_POST["price"]);
$description = $conn->real_escape_string($_POST["description"]);
$quantity    = $conn->real_escape_string($_POST["quantity"]);
$category    = $conn->real_escape_string($_POST["category"]);

$allowed_categories = ["ALL", "MEN", "WOMEN", "KIDS"];
if (!in_array($category, $allowed_categories)) {
    echo json_encode(["message" => "Invalid category"]);
    exit;
}

$sizes  = json_decode($_POST["sizes"]);
$colors = json_decode($_POST["colors"]);

$imageName = $_FILES["image"]["name"];
$tmp       = $_FILES["image"]["tmp_name"];
$uploadPath = "uploads/" . basename($imageName);

if (!move_uploaded_file($tmp, $uploadPath)) {
    echo json_encode(["message" => "Failed to upload image"]);
    exit;
}

$conn->query("INSERT INTO products (name, price, description, quantity, image, category)
              VALUES ('$name', '$price', '$description', '$quantity', '$uploadPath', '$category')");

$product_id = $conn->insert_id;

foreach ($sizes as $size) {
    $size = $conn->real_escape_string($size);
    $conn->query("INSERT INTO product_sizes (product_id, size)
                  VALUES ('$product_id', '$size')");
}

foreach ($colors as $color) {
    $color = $conn->real_escape_string($color);
    $conn->query("INSERT INTO product_colors (product_id, color)
                  VALUES ('$product_id', '$color')");
}

echo json_encode(["message" => "Product Added"]);

$conn->close();

?>