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
    echo json_encode(["success" => false, "error" => "Not logged in"]);
    exit();
}

$conn = new mysqli("sql213.infinityfree.com", "if0_41971414", "charity3614856", "if0_41971414_fuku");

$user_id = $_SESSION['user_id'];
$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !is_array($data)) {
    echo json_encode(["success" => false, "error" => "No data provided"]);
    exit();
}

$allowed = [
    "name" => "users",
    "email" => "user_details",
    "phone" => "user_details",
    "region" => "user_details",
    "province" => "user_details",
    "city" => "user_details",
    "barangay" => "user_details",
    "street" => "user_details"
];

$usersUpdates = [];
$detailsUpdates = [];

foreach ($data as $key => $value) {
    if (!isset($allowed[$key])) continue;

    if ($allowed[$key] === "users") {
        $usersUpdates[$key] = $value;
    } else {
        $detailsUpdates[$key] = $value;
    }
}

if (!empty($usersUpdates)) {
    $set = [];
    $values = [];

    foreach ($usersUpdates as $k => $v) {
        $set[] = "$k = ?";
        $values[] = $v;
    }

    $values[] = $user_id;

    $sql = "UPDATE users SET " . implode(",", $set) . " WHERE id = ?";
    $stmt = $conn->prepare($sql);

    $types = str_repeat("s", count($usersUpdates)) . "i";
    $stmt->bind_param($types, ...$values);
    $stmt->execute();
}

if (!empty($detailsUpdates)) {

    $conn->query("INSERT IGNORE INTO user_details (user_id) VALUES ($user_id)");

    $set = [];
    $values = [];

    foreach ($detailsUpdates as $k => $v) {
        $set[] = "$k = ?";
        $values[] = $v;
    }

    $values[] = $user_id;

    $sql = "UPDATE user_details SET " . implode(",", $set) . " WHERE user_id = ?";
    $stmt = $conn->prepare($sql);

    $types = str_repeat("s", count($detailsUpdates)) . "i";
    $stmt->bind_param($types, ...$values);
    $stmt->execute();
}

echo json_encode([
    "success" => true,
    "message" => "Updated via PATCH"
]);
?>