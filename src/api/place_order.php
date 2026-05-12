<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {

    $conn = new mysqli("localhost", "root", "", "fuku");

    
    $user_id = isset($_POST["user_id"])
        ? intval($_POST["user_id"])
        : 0;

    if ($user_id <= 0) {
        echo json_encode([
            "success" => false,
            "message" => "Invalid user."
        ]);
        exit;
    }

    
    $ids = json_decode($_POST["ids"] ?? "[]", true);

    if (empty($ids)) {
        echo json_encode([
            "success" => false,
            "message" => "No items selected."
        ]);
        exit;
    }

    
    $payment_method = $_POST["payment_method"] ?? "";
    $e_wallet       = $_POST["e_wallet"] ?? "";
    $ref_number     = $_POST["ref_number"] ?? "";
    $sender_name    = $_POST["sender_name"] ?? "";

    
    $proofPath = "";

    if (!empty($_FILES["proof"]["name"])) {

        $uploadDir = "uploads/";

        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $filename = time() . "_" . basename($_FILES["proof"]["name"]);
        $target   = $uploadDir . $filename;

        if (move_uploaded_file($_FILES["proof"]["tmp_name"], $target)) {
            $proofPath = $target;
        }
    }

    
    $userQuery = $conn->prepare("
        SELECT 
            users.name,
            user_details.phone,
            CONCAT(
                user_details.street, ', ',
                user_details.barangay, ', ',
                user_details.city
            ) AS address
        FROM users
        LEFT JOIN user_details
            ON users.id = user_details.user_id
        WHERE users.id = ?
    ");

    $userQuery->bind_param("i", $user_id);
    $userQuery->execute();

    $user = $userQuery->get_result()->fetch_assoc();

    if (!$user) {
        echo json_encode([
            "success" => false,
            "message" => "User not found."
        ]);
        exit;
    }


    $idList = implode(",", array_map("intval", $ids));

    $cartQuery = $conn->query("
        SELECT 
            cart.id,
            cart.quantity,
            cart.size,
            cart.color,
            products.name,
            products.price,
            products.image
        FROM cart
        INNER JOIN products
            ON cart.product_id = products.id
        WHERE cart.id IN ($idList)
        AND cart.user_id = $user_id
    ");

    $items = [];
    $subtotal = 0;

    while ($row = $cartQuery->fetch_assoc()) {

        $items[] = $row;

        $subtotal += (
            $row["price"] * $row["quantity"]
        );
    }

    if (empty($items)) {
        echo json_encode([
            "success" => false,
            "message" => "Cart items not found."
        ]);
        exit;
    }

    $orderCode = "ORD-" . date("Ymd") . "-" . rand(1000, 9999);

    $orderStmt = $conn->prepare("
        INSERT INTO orders (
            order_code,
            user_id,
            customer_name,
            phone,
            address,
            status,
            payment_method,
            e_wallet,
            ref_number,
            sender_name,
            proof_image,
            subtotal,
            total,
            created_at
        )
        VALUES (
            ?, ?, ?, ?, ?,
            'Processing',
            ?, ?, ?, ?, ?,
            ?, ?, NOW()
        )
    ");

    $orderStmt->bind_param(
        "sissssssssdd",
        $orderCode,
        $user_id,
        $user["name"],
        $user["phone"],
        $user["address"],
        $payment_method,
        $e_wallet,
        $ref_number,
        $sender_name,
        $proofPath,
        $subtotal,
        $subtotal
    );

    $orderStmt->execute();

    $orderId = $conn->insert_id;

    $itemStmt = $conn->prepare("
        INSERT INTO order_items (
            order_id,
            product_name,
            color,
            size,
            quantity,
            price,
            image
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");

    foreach ($items as $item) {

        $itemStmt->bind_param(
            "isssids",
            $orderId,
            $item["name"],
            $item["color"],
            $item["size"],
            $item["quantity"],
            $item["price"],
            $item["image"]
        );

        $itemStmt->execute();

        $conn->query("
            DELETE FROM cart
            WHERE id = " . (int)$item["id"]
        );
    }

    echo json_encode([
        "success" => true,
        "message" => "Order placed successfully!",
        "order_id" => $orderId,
        "order_code" => $orderCode
    ]);

} catch (Exception $e) {

    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
?>