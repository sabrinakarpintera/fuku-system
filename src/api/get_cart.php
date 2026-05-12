<?php
session_start();

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if (!isset($_SESSION['user_id'])) {
    echo json_encode([]);
    exit();
}

$conn = new mysqli("localhost","root","","fuku");

$user_id = $_SESSION['user_id'];

$stmt = $conn->prepare("
SELECT 
  cart.id,
  products.name,
  products.price,
  products.image,
  products.quantity AS stocks,
  cart.size,
  cart.color,
  cart.quantity
FROM cart
JOIN products ON cart.product_id = products.id
WHERE cart.user_id = ?
");

$stmt->bind_param("i", $user_id);
$stmt->execute();

$result = $stmt->get_result();

$items = [];

while($row = $result->fetch_assoc()){
    $items[] = $row;
}

echo json_encode($items);
?>