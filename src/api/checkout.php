<?php
session_start();

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["message" => "Not logged in"]);
    exit();
}

$conn = new mysqli("localhost","root","","fuku");

$data = json_decode(file_get_contents("php://input"), true);

$user_id = $_SESSION['user_id'];
$ids = $data['ids'] ?? [];

if (empty($ids)) {
    echo json_encode(["message" => "No items selected"]);
    exit();
}

$ids = array_map('intval', $ids);
$placeholders = implode(',', array_fill(0, count($ids), '?'));

$sql = "
SELECT 
  cart.id,
  cart.quantity,
  cart.size,
  cart.color,
  products.name,
  products.price,
  products.image
FROM cart
JOIN products ON cart.product_id = products.id
WHERE cart.user_id = ? AND cart.id IN ($placeholders)
";

$stmt = $conn->prepare($sql);

$types = "i" . str_repeat("i", count($ids));
$params = array_merge([$user_id], $ids);

$stmt->bind_param($types, ...$params);
$stmt->execute();

$result = $stmt->get_result();

$items = [];

while ($row = $result->fetch_assoc()) {
    $items[] = $row;
}

$userSql = "
SELECT users.name, user_details.phone,
CONCAT(user_details.street, ', ', user_details.barangay, ', ', user_details.city) AS address
FROM users
LEFT JOIN user_details ON users.id = user_details.user_id
WHERE users.id = ?
";

$userStmt = $conn->prepare($userSql);
$userStmt->bind_param("i", $user_id);
$userStmt->execute();

$userResult = $userStmt->get_result();
$user = $userResult->fetch_assoc();

echo json_encode([
    "user" => $user,
    "items" => $items
]);

?>