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

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["message" => "Not logged in"]);
    exit();
}

$conn = new mysqli("sql213.infinityfree.com", "if0_41971414", "charity3614856", "if0_41971414_fuku");

$data    = json_decode(file_get_contents("php://input"), true);
$user_id = $_SESSION['user_id'];
$ids     = $data['ids'] ?? [];

// Always fetch user — include email for order emails
$userSql = "
    SELECT
        users.name,
        user_details.email,
        user_details.phone,
        user_details.region,
        CONCAT(user_details.street, ', ', user_details.barangay, ', ', user_details.city) AS address
    FROM users
    LEFT JOIN user_details ON users.id = user_details.user_id
    WHERE users.id = ?
";
$userStmt = $conn->prepare($userSql);
$userStmt->bind_param("i", $user_id);
$userStmt->execute();
$user = $userStmt->get_result()->fetch_assoc();

// Buy Now flow: return user only, no items needed
if (empty($ids)) {
    echo json_encode(["user" => $user, "items" => []]);
    exit();
}

// Cart flow: fetch selected cart items
$ids          = array_map('intval', $ids);
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

$stmt   = $conn->prepare($sql);
$types  = "i" . str_repeat("i", count($ids));
$params = array_merge([$user_id], $ids);
$stmt->bind_param($types, ...$params);
$stmt->execute();

$items  = [];
$result = $stmt->get_result();
while ($row = $result->fetch_assoc()) {
    $items[] = $row;
}

echo json_encode(["user" => $user, "items" => $items]);
?>