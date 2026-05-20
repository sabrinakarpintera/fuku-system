<?php
// get_refund_details.php

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

$order_code = trim($_GET['order_code'] ?? '');

if (!$order_code) {
    echo json_encode(["success" => false, "message" => "Missing order_code"]);
    exit;
}

$conn = new mysqli("sql213.infinityfree.com", "if0_41971414", "charity3614856", "if0_41971414_fuku");

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "DB connection failed"]);
    exit;
}

/*
  STRATEGY:
  We try two ways to find the refund request:
  1. Direct match on refund_requests.order_code = $order_code
  2. Lookup the order_code from the orders table using the value as
     the numeric id (in case the frontend passes order.id as a number)
     then match refund_requests.order_code = that resolved order_code
*/

// --- Attempt 1: direct match ---
$stmt = $conn->prepare("
    SELECT
        requester_name,
        reason,
        ewallet,
        account_name,
        account_number,
        additional_info,
        product_images,
        status,
        DATE_FORMAT(created_at, '%M %d, %Y %h:%i %p') AS requested_at
    FROM refund_requests
    WHERE order_code = ?
    ORDER BY id DESC
    LIMIT 1
");
$stmt->bind_param("s", $order_code);
$stmt->execute();
$result = $stmt->get_result();
$refund  = $result->fetch_assoc();
$stmt->close();

// --- Attempt 2: resolve via orders table if attempt 1 found nothing ---
if (!$refund) {
    // Try to get the actual order_code from orders using numeric id OR order_code column
    $resolve = $conn->prepare("
        SELECT order_code
        FROM orders
        WHERE id = ? OR order_code = ?
        LIMIT 1
    ");
    $resolve->bind_param("ss", $order_code, $order_code);
    $resolve->execute();
    $row = $resolve->get_result()->fetch_assoc();
    $resolve->close();

    if ($row && $row['order_code'] !== $order_code) {
        // We found a different order_code — try again with it
        $resolved_code = $row['order_code'];
        $stmt2 = $conn->prepare("
            SELECT
                requester_name,
                reason,
                ewallet,
                account_name,
                account_number,
                additional_info,
                product_images,
                status,
                DATE_FORMAT(created_at, '%M %d, %Y %h:%i %p') AS requested_at
            FROM refund_requests
            WHERE order_code = ?
            ORDER BY id DESC
            LIMIT 1
        ");
        $stmt2->bind_param("s", $resolved_code);
        $stmt2->execute();
        $refund = $stmt2->get_result()->fetch_assoc();
        $stmt2->close();
    }
}

if ($refund) {
    // Decode product_images: JSON array of paths or a single path string
    if (!empty($refund['product_images'])) {
        $decoded = json_decode($refund['product_images'], true);
        $refund['product_images'] = is_array($decoded)
            ? $decoded
            : [$refund['product_images']];
    } else {
        $refund['product_images'] = [];
    }

    echo json_encode(["success" => true, "refund" => $refund]);
} else {
    // Return debug info so you can see what value arrived vs what's in DB
    $debug_check = $conn->query("SELECT order_code FROM refund_requests LIMIT 5");
    $samples = [];
    while ($r = $debug_check->fetch_assoc()) {
        $samples[] = $r['order_code'];
    }

    echo json_encode([
        "success"        => true,
        "refund"         => null,
        "debug_received" => $order_code,
        "debug_samples"  => $samples,   // ← remove this line after fixing
    ]);
}

$conn->close();
?>