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

require_once __DIR__ . '/../../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$conn = new mysqli("sql213.infinityfree.com", "if0_41971414", "charity3614856", "if0_41971414_fuku");

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$action = trim($data['action'] ?? '');

if ($action === 'send_otp') {
    $email = trim($data['email'] ?? '');

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(["success" => false, "message" => "Please enter a valid email."]);
        exit();
    }

    $stmt = $conn->prepare("SELECT ud.user_id, u.username FROM user_details ud JOIN users u ON u.id = ud.user_id WHERE ud.email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode(["success" => false, "message" => "No account found with that email."]);
        exit();
    }

    $row = $result->fetch_assoc();
    $stmt->close();

    $del = $conn->prepare("DELETE FROM password_resets WHERE email = ?");
    $del->bind_param("s", $email);
    $del->execute();
    $del->close();

    $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

    // ✅ Let MySQL set the expiry so both INSERT and NOW() use the same clock
    $ins = $conn->prepare(
        "INSERT INTO password_resets (email, otp, expires_at)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))"
    );
    $ins->bind_param("ss", $email, $otp);
    $ins->execute();
    $ins->close();

    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'csbln10@gmail.com';
        $mail->Password   = 'luys yjdh ezed hcco';
        $mail->SMTPSecure = 'tls';
        $mail->Port       = 587;

        $mail->setFrom('csbln10@gmail.com', 'FUKU STORE');
        $mail->addAddress($email, $row['username']);

        $mail->isHTML(true);
        $mail->Subject = 'Your Fuku Password Reset OTP';
        $mail->Body    = "
            <div style='font-family: Outfit, sans-serif; max-width: 480px; margin: auto;'>
                <h2 style='color:#1a1a1a;'>Password Reset</h2>
                <p>Hi <strong>{$row['username']}</strong>,</p>
                <p>Your one-time password (OTP) is:</p>
                <div style='font-size:2.5rem; font-weight:700; letter-spacing:0.4rem; color:#c8a98a; margin: 1rem 0;'>
                    {$otp}
                </div>
                <p style='color:#888; font-size:0.9rem;'>This OTP expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
                <p style='color:#888; font-size:0.9rem;'>If you didn't request this, you can ignore this email.</p>
            </div>
        ";

        $mail->send();
        echo json_encode(["success" => true, "message" => "OTP sent to your email."]);

    } catch (Exception $e) {
        $del2 = $conn->prepare("DELETE FROM password_resets WHERE email = ?");
        $del2->bind_param("s", $email);
        $del2->execute();
        $del2->close();
        echo json_encode(["success" => false, "message" => "Failed to send email. Please try again."]);
    }
}

elseif ($action === 'verify_otp') {
    $email = trim($data['email'] ?? '');
    $otp   = trim($data['otp'] ?? '');

    if (empty($email) || empty($otp)) {
        echo json_encode(["success" => false, "message" => "Email and OTP are required."]);
        exit();
    }

    $stmt = $conn->prepare("SELECT * FROM password_resets WHERE email = ? AND otp = ? AND expires_at > NOW()");
    $stmt->bind_param("ss", $email, $otp);
    $stmt->execute();
    $result = $stmt->get_result();
    $stmt->close();

    if ($result->num_rows === 0) {
        echo json_encode(["success" => false, "message" => "Invalid or expired OTP."]);
        exit();
    }

    echo json_encode(["success" => true, "message" => "OTP verified."]);
}

elseif ($action === 'reset_password') {
    $email       = trim($data['email'] ?? '');
    $otp         = trim($data['otp'] ?? '');
    $newPassword = trim($data['new_password'] ?? '');

    if (empty($email) || empty($otp) || empty($newPassword)) {
        echo json_encode(["success" => false, "message" => "All fields are required."]);
        exit();
    }

    if (strlen($newPassword) < 8) {
        echo json_encode(["success" => false, "message" => "Password must be at least 8 characters."]);
        exit();
    }

    $stmt = $conn->prepare("SELECT * FROM password_resets WHERE email = ? AND otp = ? AND expires_at > NOW()");
    $stmt->bind_param("ss", $email, $otp);
    $stmt->execute();
    $result = $stmt->get_result();
    $stmt->close();

    if ($result->num_rows === 0) {
        echo json_encode(["success" => false, "message" => "OTP expired. Please start over."]);
        exit();
    }

    $find = $conn->prepare("SELECT user_id FROM user_details WHERE email = ?");
    $find->bind_param("s", $email);
    $find->execute();
    $findResult = $find->get_result();
    $find->close();

    if ($findResult->num_rows === 0) {
        echo json_encode(["success" => false, "message" => "Account not found."]);
        exit();
    }

    $userId = $findResult->fetch_assoc()['user_id'];
    $hashed = password_hash($newPassword, PASSWORD_DEFAULT);

    $upd = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
    $upd->bind_param("si", $hashed, $userId);
    $upd->execute();
    $upd->close();

    $del = $conn->prepare("DELETE FROM password_resets WHERE email = ?");
    $del->bind_param("s", $email);
    $del->execute();
    $del->close();

    echo json_encode(["success" => true, "message" => "Password reset successfully."]);
}

else {
    echo json_encode(["success" => false, "message" => "Invalid action."]);
}

$conn->close();
?>