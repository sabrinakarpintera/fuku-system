<?php

$host = "sql213.infinityfree.com";
$db   = "if0_41971414_fuku";
$user = "if0_41971414";
$pass = "charity3614856";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed: " . $conn->connect_error]);
    exit();
}