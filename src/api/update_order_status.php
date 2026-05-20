<?php
// update_order_status.php

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

require_once "send_status_email.php";

$conn = new mysqli("sql213.infinityfree.com", "if0_41971414", "charity3614856", "if0_41971414_fuku");

$data = json_decode(file_get_contents("php://input"), true);

$id     = $data["id"]     ?? "";
$status = $data["status"] ?? "";

if (!$id || !$status) {
    echo json_encode(["success" => false, "message" => "Missing data"]);
    exit;
}

// Allowed statuses to prevent arbitrary writes
$allowed = [
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled",
    "To Review",
    "Completed",
    "Refund Requested",
    "Refund Approved",   // ← Admin approves the refund request
    "Refunded",          // ← Admin confirms refund has been sent
];

if (!in_array($status, $allowed)) {
    echo json_encode(["success" => false, "message" => "Invalid status."]);
    exit;
}

// Fetch order + user email
$get = $conn->prepare("
    SELECT
        orders.customer_name,
        user_details.email
    FROM orders
    INNER JOIN user_details ON orders.user_id = user_details.user_id
    WHERE orders.order_code = ?
");
$get->bind_param("s", $id);
$get->execute();
$order = $get->get_result()->fetch_assoc();

if (!$order) {
    echo json_encode(["success" => false, "message" => "Order not found"]);
    exit;
}

// Update status
$stmt = $conn->prepare("UPDATE orders SET status = ? WHERE order_code = ?");
$stmt->bind_param("ss", $status, $id);

if ($stmt->execute()) {
    // Send email — wrapped so a mail failure doesn't break the response
    try {
        sendStatusUpdateEmail(
            $order["email"],
            $order["customer_name"],
            $id,
            $status
        );
    } catch (\Throwable $e) {
        error_log("Status email failed: " . $e->getMessage());
    }

    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => $conn->error]);
}

$stmt->close();
$conn->close();
?>