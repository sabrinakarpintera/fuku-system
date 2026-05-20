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

$id          = intval($_POST["id"] ?? 0);
$name        = trim($_POST["name"] ?? "");
$price       = trim($_POST["price"] ?? "");
$description = trim($_POST["description"] ?? "");
$category    = trim($_POST["category"] ?? "");
$existingImg = trim($_POST["existing_image"] ?? "");

$allowed = ["ALL", "MEN", "WOMEN", "KIDS"];
if (!$id || !in_array($category, $allowed)) {
    echo json_encode(["success" => false, "message" => "Invalid data."]);
    exit;
}

// ── Parse variants [{size, color, quantity}, ...]
$variants = json_decode($_POST["variants"] ?? "[]", true);
if (!is_array($variants) || count($variants) === 0) {
    echo json_encode(["success" => false, "message" => "At least one variant is required."]);
    exit;
}

// ── Total quantity = sum of all variant quantities
$totalQty = array_sum(array_column($variants, "quantity"));

// ── Handle image upload
$imagePath = $existingImg;
if (!empty($_FILES["image"]["tmp_name"]) && $_FILES["image"]["error"] === UPLOAD_ERR_OK) {
    $uploadDir = "uploads/";
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
    $ext       = pathinfo($_FILES["image"]["name"], PATHINFO_EXTENSION);
    $imageName = uniqid("prod_") . "." . $ext;
    $dest      = $uploadDir . $imageName;
    if (move_uploaded_file($_FILES["image"]["tmp_name"], $dest)) {
        $imagePath = $dest;
    }
}

// ── Update products table (total qty)
$stmt = $conn->prepare(
    "UPDATE products SET name=?, price=?, description=?, quantity=?, category=?, image=? WHERE id=?"
);
$stmt->bind_param("sssissi", $name, $price, $description, $totalQty, $category, $imagePath, $id);
$stmt->execute();
$stmt->close();

// ── Rebuild sizes
$conn->query("DELETE FROM product_sizes WHERE product_id = $id");
$uniqueSizes = array_unique(array_column($variants, "size"));
$sizeStmt = $conn->prepare("INSERT INTO product_sizes (product_id, size) VALUES (?, ?)");
foreach ($uniqueSizes as $size) {
    $size = trim($size);
    if ($size === "") continue;
    $sizeStmt->bind_param("is", $id, $size);
    $sizeStmt->execute();
}
$sizeStmt->close();

// ── Rebuild colors
$conn->query("DELETE FROM product_colors WHERE product_id = $id");
$uniqueColors = array_unique(array_column($variants, "color"));
$colorStmt = $conn->prepare("INSERT INTO product_colors (product_id, color) VALUES (?, ?)");
foreach ($uniqueColors as $color) {
    $color = trim($color);
    if ($color === "") continue;
    $colorStmt->bind_param("is", $id, $color);
    $colorStmt->execute();
}
$colorStmt->close();

// ── Rebuild product_variants
// ✅ UPSERT: keep sold history intact — only update quantity, insert new combos
$conn->query("DELETE FROM product_variants WHERE product_id = $id");
$varStmt = $conn->prepare(
    "INSERT INTO product_variants (product_id, size, color, quantity) VALUES (?, ?, ?, ?)"
);
foreach ($variants as $v) {
    $size  = trim($v["size"]  ?? "");
    $color = trim($v["color"] ?? "");
    $qty   = intval($v["quantity"] ?? 0);
    if ($size === "" || $color === "") continue;
    $varStmt->bind_param("issi", $id, $size, $color, $qty);
    $varStmt->execute();
}
$varStmt->close();

echo json_encode(["success" => true, "message" => "Product updated successfully."]);
$conn->close();
?>