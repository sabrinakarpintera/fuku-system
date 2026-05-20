<?php
session_start();

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

require_once "db.php"; 

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    echo json_encode(["message" => "Invalid JSON input"]);
    exit();
}

$user_id = $_SESSION['user_id'];
$product_id = $data['product_id'];
$size = $data['size'];
$color = $data['color'];
$quantity = $data['quantity'];

$check = $conn->prepare("
SELECT id, quantity FROM cart 
WHERE user_id=? AND product_id=? AND size=? AND color=?
");

$check->bind_param("iiss", $user_id, $product_id, $size, $color);
$check->execute();
$result = $check->get_result();

if ($result->num_rows > 0) {

    $row = $result->fetch_assoc();
    $newQty = $row['quantity'] + $quantity;

    $update = $conn->prepare("UPDATE cart SET quantity=? WHERE id=?");
    $update->bind_param("ii", $newQty, $row['id']);
    $update->execute();

} else {

    $insert = $conn->prepare("
    INSERT INTO cart (user_id, product_id, size, color, quantity)
    VALUES (?, ?, ?, ?, ?)
    ");
    $insert->bind_param("iissi", $user_id, $product_id, $size, $color, $quantity);
    $insert->execute();
}

echo json_encode([
  "message" => "Added to cart",
  "user_id" => $_SESSION['user_id']
]);
?>