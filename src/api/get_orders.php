<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");

session_start();
$conn = new mysqli("localhost", "root", "", "fuku");

if ($conn->connect_error) {
    echo json_encode([]);
    exit;
}

// Support both User-specific (via session/GET) and Admin-wide (if no ID provided)
$user_id = $_SESSION["user_id"] ?? (isset($_GET["user_id"]) ? (int)$_GET["user_id"] : null);

if ($user_id) {
    $stmt = $conn->prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC");
    $stmt->bind_param("i", $user_id);
} else {
    $stmt = $conn->prepare("SELECT * FROM orders ORDER BY created_at DESC");
}

$stmt->execute();
$result = $stmt->get_result();
$orders = [];

while ($order = $result->fetch_assoc()) {
    $db_id = $order["id"]; 

    $itemsQuery = $conn->query("SELECT * FROM order_items WHERE order_id = $db_id");
    $items = [];
    $item_count = 0;

    while ($item = $itemsQuery->fetch_assoc()) {
        $item_count += (int)$item["quantity"];
        $items[] = [
            "name"  => $item["product_name"],
            "color" => $item["color"],
            "size"  => $item["size"],
            "qty"   => (int)$item["quantity"],
            "price" => (float)$item["price"],
            "image" => $item["image"]
        ];
    }

    $orders[] = [
        "id"         => $order["order_code"], 
        "db_id"      => $db_id,               
        "date"       => date("F d, Y", strtotime($order["created_at"])),
        "status"     => $order["status"],
        "items"      => $items,             
        "item_count" => $item_count,          
        "total"      => (float)$order["total"],
        "subtotal"   => (float)$order["subtotal"],
        "shipping"   => 0.00,
        "payment"    => $order["payment_method"],
        "address"    => $order["address"],
        "customer"   => $order["customer_name"],
        "refNumber"  => $order["ref_number"],
        "sender"     => $order["sender_name"],
        "proof"      => $order["proof_image"]
    ];
}

echo json_encode($orders);