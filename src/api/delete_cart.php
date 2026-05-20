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

$data = json_decode(file_get_contents("php://input"), true);

$user_id = $_SESSION['user_id'];
$ids = $data['ids'] ?? [];

if (empty($ids)) {
    echo json_encode(["message" => "No items selected"]);
    exit();
}

$ids = array_map('intval', $ids);

$placeholders = implode(',', array_fill(0, count($ids), '?'));

$sql = "DELETE FROM cart WHERE id IN ($placeholders) AND user_id = ?";
$stmt = $conn->prepare($sql);

$types = str_repeat('i', count($ids)) . 'i';

$params = [];
$params[] = & $types;

foreach ($ids as $key => $value) {
    $params[] = & $ids[$key];
}

$params[] = & $user_id;

call_user_func_array([$stmt, 'bind_param'], $params);

$stmt->execute();

echo json_encode(["message" => "Deleted"]);
?>