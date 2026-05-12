<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

$conn = new mysqli("localhost", "root", "", "fuku");

if ($conn->connect_error) {
    echo json_encode(["error" => "Connection failed"]);
    exit;
}

if (!isset($_GET["user_id"]) || empty($_GET["user_id"])) {
    echo json_encode([]); 
    exit;
}

$user_id = intval($_GET["user_id"]);

$query = "SELECT id, order_code, address, payment_method, subtotal, total, status, created_at 
          FROM orders 
          WHERE user_id = ? 
          ORDER BY created_at DESC";

$stmt = $conn->prepare($query);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

$orders = [];

$itemStmt = $conn->prepare("SELECT product_name, color, size, quantity, price, image 
                            FROM order_items 
                            WHERE order_id = ?");

while ($order = $result->fetch_assoc()) {
    $db_id = $order["id"];
    
    $itemStmt->bind_param("i", $db_id);
    $itemStmt->execute();
    $itemsResult = $itemStmt->get_result();

    $items = [];
    $total_qty = 0;

    while ($item = $itemsResult->fetch_assoc()) {
        $total_qty += (int)$item["quantity"];
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
        "db_id"      => (int)$db_id,
        "date"       => date("F d, Y", strtotime($order["created_at"])),
        "status"     => $order["status"],
        "items"      => $items,
        "item_count" => $total_qty,
        "total"      => (float)$order["total"],
        "payment"    => $order["payment_method"],
        "address"    => $order["address"]
    ];
}

$itemStmt->close();
$stmt->close();
$conn->close();

echo json_encode($orders);