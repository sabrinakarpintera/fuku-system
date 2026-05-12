<?php
session_start();

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit();
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["error" => "Not logged in"]);
    exit();
}

$conn = new mysqli("localhost", "root", "", "fuku");

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed"]);
    exit();
}

$user_id = $_SESSION['user_id'];

$stmt = $conn->prepare("
    SELECT
        u.name,
        u.username,
        COALESCE(d.email,    '') AS email,
        COALESCE(d.phone,    '') AS phone,
        COALESCE(d.region,   '') AS region,
        COALESCE(d.province, '') AS province,
        COALESCE(d.city,     '') AS city,
        COALESCE(d.barangay, '') AS barangay,
        COALESCE(d.street,   '') AS street
    FROM users u
    LEFT JOIN user_details d ON u.id = d.user_id
    WHERE u.id = ?
");

$stmt->bind_param("i", $user_id);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();
$conn->close();

if (!$row) {
    http_response_code(404);
    echo json_encode(["error" => "User not found"]);
    exit();
}

echo json_encode([
    "success"  => true,
    "name"     => $row["name"],
    "username" => $row["username"],
    "email"    => $row["email"],
    "phone"    => $row["phone"],
    "region"   => $row["region"],
    "province" => $row["province"],
    "city"     => $row["city"],
    "barangay" => $row["barangay"],
    "street"   => $row["street"],
]);
?>