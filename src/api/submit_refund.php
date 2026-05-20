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
    echo json_encode(["success" => false, "message" => "Not logged in."]);
    exit;
}

$conn = new mysqli("sql213.infinityfree.com", "if0_41971414", "charity3614856", "if0_41971414_fuku");
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "DB connection failed."]);
    exit;
}

// All fields come via multipart/form-data (because we're uploading files)
$order_code     = trim($_POST["order_code"]     ?? "");
$requester_name = trim($_POST["requester_name"] ?? "");
$reason         = trim($_POST["reason"]         ?? "");
$ewallet        = trim($_POST["ewallet"]        ?? "");
$account_name   = trim($_POST["account_name"]   ?? "");
$account_number = trim($_POST["account_number"] ?? "");
$additional     = trim($_POST["additional"]     ?? "");

if (!$order_code || !$requester_name || !$reason || !$ewallet || !$account_name || !$account_number) {
    echo json_encode(["success" => false, "message" => "Please fill in all required fields."]);
    exit;
}

$user_id = intval($_SESSION['user_id']);

// Verify the order belongs to this user and is in Delivered status
$check = $conn->prepare("
    SELECT id FROM orders
    WHERE order_code = ? AND user_id = ? AND status = 'Delivered'
");
$check->bind_param("si", $order_code, $user_id);
$check->execute();
$row = $check->get_result()->fetch_assoc();

if (!$row) {
    echo json_encode(["success" => false, "message" => "Order not eligible for refund."]);
    exit;
}

// ── Handle product image uploads ─────────────────────────────────────────────
$uploadDir = __DIR__ . "/uploads/refunds/";
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$imagePaths   = [];
$allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

if (!empty($_FILES["product_images"]["name"][0])) {
    $files     = $_FILES["product_images"];
    $fileCount = min(count($files["name"]), 5); // cap at 5

    for ($i = 0; $i < $fileCount; $i++) {
        if ($files["error"][$i] !== UPLOAD_ERR_OK) continue;

        $mime = mime_content_type($files["tmp_name"][$i]);
        if (!in_array($mime, $allowedTypes)) continue;

        $ext      = pathinfo($files["name"][$i], PATHINFO_EXTENSION);
        $filename = "refund_" . $user_id . "_" . time() . "_" . $i . "." . $ext;
        $target   = $uploadDir . $filename;

        if (move_uploaded_file($files["tmp_name"][$i], $target)) {
            $imagePaths[] = "uploads/refunds/" . $filename;
        }
    }
}

$imagesJson = json_encode($imagePaths);

// Insert refund request
$stmt = $conn->prepare("
    INSERT INTO refund_requests
        (order_code, user_id, requester_name, reason, ewallet,
         account_name, account_number, additional_info, product_images, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NOW())
");
$stmt->bind_param(
    "sisssssss",
    $order_code,
    $user_id,
    $requester_name,
    $reason,
    $ewallet,
    $account_name,
    $account_number,
    $additional,
    $imagesJson
);

if (!$stmt->execute()) {
    echo json_encode(["success" => false, "message" => "Failed to submit refund request."]);
    exit;
}

// Flip order status
$upd = $conn->prepare("UPDATE orders SET status = 'Refund Requested' WHERE order_code = ?");
$upd->bind_param("s", $order_code);
$upd->execute();

echo json_encode(["success" => true, "message" => "Refund request submitted successfully."]);
$conn->close();
?>