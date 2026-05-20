<?php
// send_status_email.php
// Handles all order status update emails, including refund-specific ones.

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../../vendor/autoload.php';

function sendStatusUpdateEmail($toEmail, $customerName, $orderCode, $status)
{
    $mail = new PHPMailer(true);

    // ── Build email subject + body based on status ──────────────────
    $subject = "Order Status Updated – {$orderCode}";
    $body    = buildEmailBody($customerName, $orderCode, $status);

    // Override subject for refund statuses
    if ($status === "Refund Approved") {
        $subject = "Your Refund Request Has Been Approved – {$orderCode}";
    } elseif ($status === "Refunded") {
        $subject = "Your Refund Has Been Processed – {$orderCode}";
    }

    try {
        // SMTP
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;

        // ✅ YOUR GMAIL
        $mail->Username   = 'csbln10@gmail.com';

        // ✅ YOUR APP PASSWORD
        $mail->Password   = 'luys yjdh ezed hcco';

        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        // EMAIL DETAILS
        $mail->setFrom('csbln10@gmail.com', 'FUKU STORE');
        $mail->addAddress($toEmail, $customerName);

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $body;

        $mail->send();
        return true;

    } catch (Exception $e) {
        error_log("Mailer Error: " . $mail->ErrorInfo);
        return false;
    }
}

// ── Email body builder ───────────────────────────────────────────────
function buildEmailBody($customerName, $orderCode, $status)
{
    // Shared wrapper styles
    $wrap  = "font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937;";
    $hr    = "<hr style='border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;'>";
    $small = "font-size: 12px; color: #9ca3af;";

    // ── Refund Approved ────────────────────────────────────────────
    if ($status === "Refund Approved") {
        return "
        <div style='{$wrap}'>
            <h2 style='color: #065f46;'>✅ Refund Request Approved</h2>
            <p>Hello, <strong>{$customerName}</strong> 👋</p>
            <p>Great news! Your refund request for the order below has been <strong>approved</strong>.</p>
            {$hr}
            <p><b>Order Code:</b> {$orderCode}</p>
            <p><b>Status:</b> <span style='color:#065f46; font-weight:bold;'>Refund Approved</span></p>
            {$hr}
            <p>Our team is now processing your refund. You will receive another email once the refund has been completed.</p>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <br>
            <p style='{$small}'>Thank you for shopping with <strong>Fuku Clothing</strong> 💖</p>
        </div>
        ";
    }

    // ── Refunded ───────────────────────────────────────────────────
    if ($status === "Refunded") {
        return "
        <div style='{$wrap}'>
            <h2 style='color: #5b21b6;'>💜 Refund Completed</h2>
            <p>Hello, <strong>{$customerName}</strong> 👋</p>
            <p>Your refund for the order below has been <strong>successfully processed</strong>.</p>
            {$hr}
            <p><b>Order Code:</b> {$orderCode}</p>
            <p><b>Status:</b> <span style='color:#5b21b6; font-weight:bold;'>Refunded</span></p>
            {$hr}
            <p>The refunded amount should reflect in your original payment method within <strong>3–7 business days</strong>, depending on your bank or payment provider.</p>
            <p>We're sorry for any inconvenience and hope to see you again!</p>
            <br>
            <p style='{$small}'>Thank you for shopping with <strong>Fuku Clothing</strong> 💖</p>
        </div>
        ";
    }

    // ── Default status update template ────────────────────────────
    $statusColor = match($status) {
        "Processing" => "#f59e0b",
        "Shipped"    => "#3b82f6",
        "Delivered"  => "#10b981",
        "Completed"  => "#6366f1",
        "Cancelled"  => "#ef4444",
        default      => "#e91e63",
    };

    return "
    <div style='{$wrap}'>
        <h2 style='color: #111827;'>Hello, {$customerName} 👋</h2>
        <p>Your order status has been updated.</p>
        {$hr}
        <p><b>Order Code:</b> {$orderCode}</p>
        <p>
            <b>New Status:</b>
            <span style='color:{$statusColor}; font-weight:bold;'>
                {$status}
            </span>
        </p>
        {$hr}
        <p style='{$small}'>Thank you for shopping with <strong>Fuku Clothing</strong> 💖</p>
    </div>
    ";
}
?>