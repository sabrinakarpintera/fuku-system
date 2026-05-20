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

error_reporting(0);
ini_set('display_errors', 0);
ob_start();

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $conn = new mysqli("sql213.infinityfree.com", "if0_41971414", "charity3614856", "if0_41971414_fuku");

    if (!isset($_SESSION['user_id'])) {
        ob_end_clean();
        echo json_encode(["success" => false, "message" => "Not logged in."]);
        exit;
    }
    $user_id = intval($_SESSION['user_id']);

    $payment_method = $_POST["payment_method"] ?? "";
    $region         = $_POST["region"]         ?? "";
    $shipping_fee   = floatval($_POST["shipping_fee"] ?? 0);
    $e_wallet       = $_POST["e_wallet"]       ?? "";
    $ref_number     = $_POST["ref_number"]     ?? "";
    $sender_name    = $_POST["sender_name"]    ?? "";

    // ── quantity_map: cart_id => qty set by user in the UI ────────────────
    $quantityMap = [];
    if (!empty($_POST["quantity_map"])) {
        $decoded = json_decode($_POST["quantity_map"], true);
        if (is_array($decoded)) {
            foreach ($decoded as $cartId => $qty) {
                $quantityMap[intval($cartId)] = intval($qty);
            }
        }
    }

    if (!$payment_method || !$region) {
        ob_end_clean();
        echo json_encode(["success" => false, "message" => "Missing payment method or region."]);
        exit;
    }

    // ── Proof image upload ────────────────────────────────────────────────
    $proofPath = "";
    if ($payment_method === "Online Payment") {
        if (empty($ref_number) || empty($sender_name) || empty($_FILES["proof"]["tmp_name"])) {
            ob_end_clean();
            echo json_encode(["success" => false, "message" => "Missing online payment details."]);
            exit;
        }

        $uploadDir = __DIR__ . "/uploads/proofs/";
        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $ext      = pathinfo($_FILES["proof"]["name"], PATHINFO_EXTENSION);
        $filename = "proof_" . $user_id . "_" . time() . "." . $ext;
        $target   = $uploadDir . $filename;

        if (!move_uploaded_file($_FILES["proof"]["tmp_name"], $target)) {
            ob_end_clean();
            echo json_encode(["success" => false, "message" => "Failed to upload proof image."]);
            exit;
        }

        $proofPath = "uploads/proofs/" . $filename;
    }

    // ── Fetch user ────────────────────────────────────────────────────────
    $userStmt = $conn->prepare("
        SELECT
            users.name,
            user_details.email,
            user_details.phone,
            CONCAT(user_details.street, ', ', user_details.barangay, ', ', user_details.city) AS address
        FROM users
        LEFT JOIN user_details ON users.id = user_details.user_id
        WHERE users.id = ?
    ");
    $userStmt->bind_param("i", $user_id);
    $userStmt->execute();
    $user = $userStmt->get_result()->fetch_assoc();
    $userStmt->close();

    if (!$user) {
        ob_end_clean();
        echo json_encode(["success" => false, "message" => "User not found."]);
        exit;
    }

    // ── Resolve items ─────────────────────────────────────────────────────
    $items    = [];
    $subtotal = 0;

    if (!empty($_POST["buynow_items"])) {
        // Buy Now flow — items passed directly from the frontend
        $raw = json_decode($_POST["buynow_items"], true);
        if (!is_array($raw) || empty($raw)) {
            ob_end_clean();
            echo json_encode(["success" => false, "message" => "Invalid Buy Now items."]);
            exit;
        }
        foreach ($raw as $item) {
            // Frontend sends either `id` or `product_id` depending on the flow
            $product_id = intval($item["product_id"] ?? $item["id"] ?? 0);
            $row = [
                "cart_id"    => null,
                "product_id" => $product_id,
                "name"       => $item["name"],
                "color"      => $item["color"],
                "size"       => $item["size"],
                "quantity"   => intval($item["quantity"]),
                "price"      => floatval($item["price"]),
                "image"      => $item["image"] ?? "",
            ];
            $items[]   = $row;
            $subtotal += $row["price"] * $row["quantity"];
        }

    } elseif (!empty($_POST["ids"])) {
        // Cart flow
        $ids = json_decode($_POST["ids"], true);
        $ids = array_filter(array_map("intval", $ids));

        if (empty($ids)) {
            ob_end_clean();
            echo json_encode(["success" => false, "message" => "No items selected."]);
            exit;
        }

        $idList    = implode(",", $ids);
        $cartQuery = $conn->query("
            SELECT
                cart.id          AS cart_id,
                cart.product_id,
                cart.quantity    AS db_quantity,
                cart.size,
                cart.color,
                products.name,
                products.price,
                products.image
            FROM cart
            INNER JOIN products ON cart.product_id = products.id
            WHERE cart.id IN ($idList)
            AND cart.user_id = $user_id
        ");

        while ($row = $cartQuery->fetch_assoc()) {
            $cartId = intval($row["cart_id"]);
            // Use the quantity the user set in the UI; fall back to DB value
            $qty = isset($quantityMap[$cartId]) ? $quantityMap[$cartId] : intval($row["db_quantity"]);

            $item = [
                "cart_id"    => $cartId,
                "product_id" => intval($row["product_id"]),
                "name"       => $row["name"],
                "color"      => $row["color"],
                "size"       => $row["size"],
                "quantity"   => $qty,
                "price"      => floatval($row["price"]),
                "image"      => $row["image"],
            ];
            $items[]   = $item;
            $subtotal += $item["price"] * $item["quantity"];
        }

        if (empty($items)) {
            ob_end_clean();
            echo json_encode(["success" => false, "message" => "Cart items not found."]);
            exit;
        }

    } else {
        ob_end_clean();
        echo json_encode(["success" => false, "message" => "No items provided."]);
        exit;
    }

    $total     = $subtotal + $shipping_fee;
    $orderCode = "ORD-" . date("Ymd") . "-" . rand(1000, 9999);

    // ── Insert order ──────────────────────────────────────────────────────
    $orderStmt = $conn->prepare("
        INSERT INTO orders (
            order_code, user_id, customer_name, phone, address, region,
            status, payment_method, e_wallet, ref_number, sender_name,
            proof_image, shipping_fee, subtotal, total, created_at
        )
        VALUES (
            ?, ?, ?, ?, ?, ?,
            'Processing',
            ?, ?, ?, ?, ?,
            ?, ?, ?, NOW()
        )
    ");
    $orderStmt->bind_param(
        "sisssssssssddd",
        $orderCode,
        $user_id,
        $user["name"],
        $user["phone"],
        $user["address"],
        $region,
        $payment_method,
        $e_wallet,
        $ref_number,
        $sender_name,
        $proofPath,
        $shipping_fee,
        $subtotal,
        $total
    );
    $orderStmt->execute();
    $orderId = $conn->insert_id;
    $orderStmt->close();

    // ── Prepared statements for the item loop ─────────────────────────────

    // Insert into order_items (includes product_id for traceability)
    $itemStmt = $conn->prepare("
        INSERT INTO order_items (order_id, product_id, product_name, color, size, quantity, price, image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");

    // Deduct from product_variants.quantity for the exact size + color
    // Schema: product_variants.quantity  ← real column name confirmed from your SQL dump
    $stockStmt = $conn->prepare("
        UPDATE product_variants
        SET quantity = GREATEST(0, quantity - ?)
        WHERE product_id = ? AND size = ? AND color = ?
    ");

    // Re-sync products.quantity = SUM of all its variants
    // Schema: products.quantity  ← real column name confirmed from your SQL dump
    // Must use a subquery alias to avoid "can't reopen table" error in MySQL
    $syncStmt = $conn->prepare("
        UPDATE products
        SET quantity = (
            SELECT total FROM (
                SELECT COALESCE(SUM(pv.quantity), 0) AS total
                FROM product_variants pv
                WHERE pv.product_id = ?
            ) AS sub
        )
        WHERE id = ?
    ");

    // Safe cart delete
    $delStmt = $conn->prepare("DELETE FROM cart WHERE id = ? AND user_id = ?");

    foreach ($items as $item) {
        // 1. Insert order item
        $itemStmt->bind_param(
            "iisssids",
            $orderId,
            $item["product_id"],
            $item["name"],
            $item["color"],
            $item["size"],
            $item["quantity"],
            $item["price"],
            $item["image"]
        );
        $itemStmt->execute();

        // 2. Deduct from product_variants (exact size + color match)
        $stockStmt->bind_param(
            "iiss",
            $item["quantity"],
            $item["product_id"],
            $item["size"],
            $item["color"]
        );
        $stockStmt->execute();

        // 3. Re-sync products.quantity to the sum of all its variant quantities
        $syncStmt->bind_param("ii", $item["product_id"], $item["product_id"]);
        $syncStmt->execute();

        // 4. Remove from cart (cart flow only)
        if ($item["cart_id"] !== null) {
            $delStmt->bind_param("ii", $item["cart_id"], $user_id);
            $delStmt->execute();
        }
    }

    $itemStmt->close();
    $stockStmt->close();
    $syncStmt->close();
    $delStmt->close();

    // ── Send confirmation email ───────────────────────────────────────────
    try {
        require_once "send_order_email.php";
        sendOrderProcessingEmail(
            $user["email"],
            $user["name"],
            $orderCode,
            $total
        );
    } catch (\Throwable $e) {
        error_log("Email send failed: " . $e->getMessage());
    }

    ob_end_clean();
    echo json_encode([
        "success"    => true,
        "message"    => "Order placed successfully!",
        "order_id"   => $orderId,
        "order_code" => $orderCode,
    ]);

} catch (Exception $e) {
    ob_end_clean();
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>