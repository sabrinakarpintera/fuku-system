<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");

$conn = new mysqli("localhost", "root", "", "fuku");

if ($conn->connect_error) {
    echo json_encode([
        "success" => false,
        "message" => "Database connection failed"
    ]);
    exit;
}

$salesQuery = $conn->query("
    SELECT SUM(total) as totalSales
    FROM orders
    WHERE status != 'Cancelled'
");

$totalSales = $salesQuery->fetch_assoc()["totalSales"] ?? 0;

$customerQuery = $conn->query("
    SELECT COUNT(*) as totalCustomers
    FROM users
    WHERE role = 'user'
");

$totalCustomers = $customerQuery->fetch_assoc()["totalCustomers"] ?? 0;

$orderQuery = $conn->query("
    SELECT COUNT(*) as totalOrders
    FROM orders
");

$totalOrders = $orderQuery->fetch_assoc()["totalOrders"] ?? 0;

$pendingQuery = $conn->query("
    SELECT COUNT(*) as pendingOrders
    FROM orders
    WHERE status = 'Processing'
");

$pendingOrders = $pendingQuery->fetch_assoc()["pendingOrders"] ?? 0;


$dailyQuery = $conn->query("
    SELECT SUM(total) as dailySales
    FROM orders
    WHERE DATE(created_at) = CURDATE()
    AND status != 'Cancelled'
");

$dailySales = $dailyQuery->fetch_assoc()["dailySales"] ?? 0;


$orderResult = $conn->query("
    SELECT *
    FROM orders
    ORDER BY created_at DESC
    LIMIT 5
");

$orders = [];

while ($order = $orderResult->fetch_assoc()) {

    $db_id = $order["id"];

    
    $itemsQuery = $conn->query("
        SELECT *
        FROM order_items
        WHERE order_id = $db_id
    ");

    $products = [];
    $itemCount = 0;

    while ($item = $itemsQuery->fetch_assoc()) {

        $itemCount += (int)$item["quantity"];

        $products[] = [
            "name"  => $item["product_name"],
            "color" => $item["color"],
            "size"  => $item["size"],
            "qty"   => (int)$item["quantity"],
            "price" => (float)$item["price"],
            "image" => $item["image"]
        ];
    }

    $orders[] = [
        "id"        => $order["order_code"],
        "customer"  => $order["customer_name"],
        "date"      => date("F d, Y", strtotime($order["created_at"])),
        "items"     => $itemCount,
        "total"     => (float)$order["total"],
        "status"    => $order["status"],
        "products"  => $products,
        "subtotal"  => (float)$order["subtotal"],
        "shipping"  => 0,
        "payment"   => $order["payment_method"],
        "address"   => $order["address"]
    ];
}


echo json_encode([
    "success" => true,

    "stats" => [
        "totalSales"     => (float)$totalSales,
        "totalCustomers" => (int)$totalCustomers,
        "totalOrders"    => (int)$totalOrders,
        "pendingOrders"  => (int)$pendingOrders,
        "dailySales"     => (float)$dailySales
    ],

    "orders" => $orders
]);

$conn->close();
?>