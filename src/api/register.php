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

// Basic validation
if (!$name || !$username || !$email || !$phone || !$password) {
    http_response_code(400);
    die(json_encode(["success" => false, "message" => "All fields are required"]));
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    die(json_encode(["success" => false, "message" => "Invalid email address"]));
}

$hashed_password = password_hash($password, PASSWORD_DEFAULT);

// Start transaction so both inserts succeed or both roll back
$conn->begin_transaction();

try {
    // Step 1: Insert into users (no email/phone — those go to user_details)
    $stmt1 = $conn->prepare(
        "INSERT INTO users (name, username, password) VALUES (?, ?, ?)"
    );
    $stmt1->bind_param("sss", $name, $username, $hashed_password);
    $stmt1->execute();
    $stmt1->close();

    $new_user_id = $conn->insert_id;

    // Step 2: Insert email & phone into user_details
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

    // Duplicate username triggers a unique key violation (errno 1062)
    if ($conn->errno === 1062) {
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "Username already exists"]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Registration failed: " . $e->getMessage()]);
    }
}

$conn->close();
?>