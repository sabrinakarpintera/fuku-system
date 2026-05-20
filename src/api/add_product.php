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

// ── Validate category
$allowed = ["ALL", "MEN", "WOMEN", "KIDS"];
$category = trim($_POST["category"] ?? "");
if (!in_array($category, $allowed)) {
    echo json_encode(["success" => false, "message" => "Invalid category"]);
    exit;
}

$name        = trim($_POST["name"] ?? "");
$price       = trim($_POST["price"] ?? "");
$description = trim($_POST["description"] ?? "");

// ── Parse variants [{size, color, quantity}, ...]
$variants = json_decode($_POST["variants"] ?? "[]", true);
if (!is_array($variants) || count($variants) === 0) {
    echo json_encode(["success" => false, "message" => "At least one variant is required."]);
    exit;
}

// ── Total quantity = sum of all variant quantities
$totalQty = array_sum(array_column($variants, "quantity"));

// ── Upload image
if (empty($_FILES["image"]["tmp_name"])) {
    echo json_encode(["success" => false, "message" => "Image is required."]);
    exit;
}
$uploadDir = "uploads/";
if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
$ext       = pathinfo($_FILES["image"]["name"], PATHINFO_EXTENSION);
$imageName = uniqid("prod_") . "." . $ext;
$uploadPath = $uploadDir . $imageName;

if (!move_uploaded_file($_FILES["image"]["tmp_name"], $uploadPath)) {
    echo json_encode(["success" => false, "message" => "Failed to upload image."]);
    exit;
}

// ── Insert product (total quantity stored here)
$stmt = $conn->prepare(
    "INSERT INTO products (name, price, description, quantity, image, category)
     VALUES (?, ?, ?, ?, ?, ?)"
);
$stmt->bind_param("sssiss", $name, $price, $description, $totalQty, $uploadPath, $category);
$stmt->execute();
$product_id = $conn->insert_id;
$stmt->close();

// ── Insert unique sizes
$uniqueSizes = array_unique(array_column($variants, "size"));
$sizeStmt = $conn->prepare("INSERT INTO product_sizes (product_id, size) VALUES (?, ?)");
foreach ($uniqueSizes as $size) {
    $size = trim($size);
    if ($size === "") continue;
    $sizeStmt->bind_param("is", $product_id, $size);
    $sizeStmt->execute();
}
$sizeStmt->close();

// ── Insert unique colors
$uniqueColors = array_unique(array_column($variants, "color"));
$colorStmt = $conn->prepare("INSERT INTO product_colors (product_id, color) VALUES (?, ?)");
foreach ($uniqueColors as $color) {
    $color = trim($color);
    if ($color === "") continue;
    $colorStmt->bind_param("is", $product_id, $color);
    $colorStmt->execute();
}
$colorStmt->close();

// ── Insert each variant with its quantity
$varStmt = $conn->prepare(
    "INSERT INTO product_variants (product_id, size, color, quantity) VALUES (?, ?, ?, ?)"
);
foreach ($variants as $v) {
    $size  = trim($v["size"] ?? "");
    $color = trim($v["color"] ?? "");
    $qty   = intval($v["quantity"] ?? 0);
    if ($size === "" || $color === "") continue;
    $varStmt->bind_param("issi", $product_id, $size, $color, $qty);
    $varStmt->execute();
}
$varStmt->close();

echo json_encode(["success" => true, "message" => "Product added successfully."]);
$conn->close();
?>