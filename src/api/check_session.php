<?php
session_start();


header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

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