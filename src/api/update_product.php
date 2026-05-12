<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

$conn = new mysqli("localhost", "root", "", "fuku");

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Connection failed"]);
    exit;
}

$id             = intval($_POST["id"]);
$name           = $conn->real_escape_string($_POST["name"]);
$price          = $conn->real_escape_string($_POST["price"]);
$description    = $conn->real_escape_string($_POST["description"]);
$quantity       = $conn->real_escape_string($_POST["quantity"]);
$category       = $conn->real_escape_string($_POST["category"]);
$existing_image = $conn->real_escape_string($_POST["existing_image"]);

$allowed_categories = ["ALL", "MEN", "WOMEN", "KIDS"];
if (!in_array($category, $allowed_categories)) {
    echo json_encode(["success" => false, "message" => "Invalid category"]);
    exit;
}

$sizes  = json_decode($_POST["sizes"]);
$colors = json_decode($_POST["colors"]);

$imagePath = $existing_image;

if (isset($_FILES["image"]) && $_FILES["image"]["error"] === UPLOAD_ERR_OK) {
    $imageName = basename($_FILES["image"]["name"]);
    $uploadPath = "uploads/" . $imageName;
    if (move_uploaded_file($_FILES["image"]["tmp_name"], $uploadPath)) {
        $imagePath = $uploadPath;
    }
}

$stmt = $conn->prepare("
    UPDATE products
    SET name=?, price=?, description=?, quantity=?, category=?, image=?
    WHERE id=?
");
$stmt->bind_param("ssssssi", $name, $price, $description, $quantity, $category, $imagePath, $id);
$stmt->execute();

$conn->query("DELETE FROM product_sizes WHERE product_id = $id");
foreach ($sizes as $size) {
    $size = $conn->real_escape_string($size);
    $conn->query("INSERT INTO product_sizes (product_id, size) VALUES ('$id', '$size')");
}

$conn->query("DELETE FROM product_colors WHERE product_id = $id");
foreach ($colors as $color) {
    $color = $conn->real_escape_string($color);
    $conn->query("INSERT INTO product_colors (product_id, color) VALUES ('$id', '$color')");
}

echo json_encode(["success" => true, "message" => "Product updated"]);

$conn->close();
?>
