<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$conn = new mysqli("sql213.infinityfree.com", "if0_41971414", "charity3614856", "if0_41971414_fuku");

if ($conn->connect_error) {
    http_response_code(500);
    die(json_encode(["success" => false, "message" => "Database connection failed"]));
}

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    http_response_code(400);
    die(json_encode(["success" => false, "message" => "Invalid request body"]));
}

$name     = trim($data['name']     ?? '');
$username = trim($data['username'] ?? '');
$email    = trim($data['email']    ?? '');
$phone    = trim($data['phone']    ?? '');
$password = $data['password']      ?? '';

if (!$name || !$username || !$email || !$phone || !$password) {
    http_response_code(400);
    die(json_encode(["success" => false, "message" => "All fields are required"]));
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    die(json_encode(["success" => false, "message" => "Invalid email address"]));
}

$hashed_password = password_hash($password, PASSWORD_DEFAULT);

$conn->begin_transaction();

try {
    $stmt1 = $conn->prepare(
        "INSERT INTO users (name, username, password) VALUES (?, ?, ?)"
    );
    $stmt1->bind_param("sss", $name, $username, $hashed_password);
    $stmt1->execute();
    $stmt1->close();

    $new_user_id = $conn->insert_id;

    $stmt2 = $conn->prepare(
        "INSERT INTO user_details (user_id, email, phone) VALUES (?, ?, ?)"
    );
    $stmt2->bind_param("iss", $new_user_id, $email, $phone);
    $stmt2->execute();
    $stmt2->close();

    $conn->commit();

    http_response_code(201);
    echo json_encode([
        "success" => true,
        "message" => "User registered successfully",
        "user_id" => $new_user_id
    ]);

} catch (Exception $e) {
    $conn->rollback();

    // ✅ FIXED: $conn->errno is reset after rollback(), so we can no longer
    // rely on it. Check the exception message for MySQL error code 1062
    // (duplicate entry / unique key violation) instead.
    if (str_contains($e->getMessage(), '1062')) {
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "Username already exists"]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Registration failed: " . $e->getMessage()]);
    }
}

$conn->close();
?>