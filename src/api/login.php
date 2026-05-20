<?php
session_start();

/* ───────────────── CORS ───────────────── */
$allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174"
];

if (isset($_SERVER['HTTP_ORIGIN']) && in_array($_SERVER['HTTP_ORIGIN'], $allowedOrigins)) {
    header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
}

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

/* ───────────────── DATABASE ───────────────── */
$conn = new mysqli("sql213.infinityfree.com", "if0_41971414", "charity3614856", "if0_41971414_fuku");

if ($conn->connect_error) {
    echo json_encode([
        "success" => false,
        "message" => "Database connection failed"
    ]);
    exit();
}

/* ───────────────── GET DATA ───────────────── */
$data = json_decode(file_get_contents("php://input"), true);

$username = trim($data['username'] ?? '');
$password = trim($data['password'] ?? '');

/* ───────────────── VALIDATION ───────────────── */
if (empty($username) || empty($password)) {
    echo json_encode([
        "success" => false,
        "message" => "Please fill in all fields"
    ]);
    exit();
}

/* ───────────────── LOGIN ───────────────── */
$stmt = $conn->prepare("SELECT id, username, password, role FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();

$result = $stmt->get_result();

if ($result->num_rows === 0) {

    echo json_encode([
        "success" => false,
        "message" => "User not found"
    ]);

    exit();
}

$user = $result->fetch_assoc();

/* ───────────────── VERIFY PASSWORD ───────────────── */
if (!password_verify($password, $user['password'])) {

    echo json_encode([
        "success" => false,
        "message" => "Incorrect password"
    ]);

    exit();
}

/* ───────────────── SESSION ───────────────── */
session_regenerate_id(true);

$_SESSION['user_id'] = $user['id'];
$_SESSION['username'] = $user['username'];
$_SESSION['role'] = $user['role'];

/* ───────────────── SUCCESS RESPONSE ───────────────── */
echo json_encode([
    "success" => true,
    "message" => "Login successful",
    "user_id" => $user['id'],
    "username" => $user['username'],
    "role" => $user['role'] ?: "user"
]);

$stmt->close();
$conn->close();
?>