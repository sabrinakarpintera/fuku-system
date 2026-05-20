<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../../vendor/autoload.php';

function sendOrderProcessingEmail($toEmail, $customerName, $orderCode, $total)
{
    $mail = new PHPMailer(true);

    try {

        // SMTP SETTINGS
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

        $mail->Subject = 'Your Order is Being Processed';

        $mail->Body = "
            <div style='font-family: Arial, sans-serif; padding:20px;'>
                <h2>Hello, {$customerName} 👋</h2>

                <p>Thank you for ordering from <b>Fuku Clothing</b>.</p>

                <p>Your order is now being processed.</p>

                <hr>

                <p><b>Order Code:</b> {$orderCode}</p>
                <p><b>Total Amount:</b> ₱" . number_format($total, 2) . "</p>

                <hr>

                <p>We will notify you once your order has been shipped.</p>

                <p>Thank you for shopping with us 💖</p>
            </div>
        ";

        $mail->send();

        return true;

    } catch (Exception $e) {

        error_log("Mailer Error: " . $mail->ErrorInfo);

        return false;
    }
}
?>