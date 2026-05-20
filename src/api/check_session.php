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
if (isset($_SESSION['user_id'])) {

    echo json_encode([
        "loggedIn" => true,
        "user_id" => $_SESSION['user_id'],
        "username" => $_SESSION['username']
    ]);

} else {

    http_response_code(401);

    echo json_encode([
        "loggedIn" => false
    ]);

}
?>