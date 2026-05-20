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
    echo json_encode(["success" => false, "message" => "Connection failed"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$id   = intval($data["id"]);

if (!$id) {
    echo json_encode(["success" => false, "message" => "Invalid ID"]);
    exit;
}

$result = $conn->query("SELECT image FROM products WHERE id = $id");
$product = $result->fetch_assoc();

$stmt = $conn->prepare("DELETE FROM products WHERE id = ?");
$stmt->bind_param("i", $id);
$stmt->execute();

if ($conn->affected_rows > 0) {
    if ($product && file_exists($product["image"])) {
        unlink($product["image"]);
    }
    echo json_encode(["success" => true, "message" => "Product deleted"]);
} else {
    echo json_encode(["success" => false, "message" => "Product not found"]);
}

$conn->close();
?>
