<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$conn = new mysqli("localhost", "root", "", "fuku");
if ($conn->connect_error) {
    echo json_encode(["error" => "Connection failed"]);
    exit;
}

$id = intval($_GET['id'] ?? 0);
if (!$id) {
    echo json_encode(["error" => "Invalid product ID"]);
    exit;
}

// ── Base product with overall stats
$stmt = $conn->prepare("
    SELECT
        p.id,
        p.name,
        p.price,
        p.description,
        p.quantity,
        p.image,
        p.category,
        (
            SELECT COALESCE(SUM(pv.quantity), 0)
            FROM product_variants pv
            WHERE pv.product_id = p.id
        ) AS current_stock,
        (
            SELECT COALESCE(SUM(oi.quantity), 0)
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE oi.product_name = p.name AND o.status != 'Cancelled'
        ) AS sold,
        (
            SELECT COALESCE(SUM(oi.quantity * oi.price), 0)
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE oi.product_name = p.name AND o.status != 'Cancelled'
        ) AS revenue
    FROM products p
    WHERE p.id = ?
");
$stmt->bind_param("i", $id);
$stmt->execute();
$product = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$product) {
    echo json_encode(["error" => "Product not found"]);
    exit;
}

// ── Unique sizes
$sizes = [];
$s = $conn->prepare("SELECT DISTINCT size FROM product_sizes WHERE product_id = ? ORDER BY size");
$s->bind_param("i", $id);
$s->execute();
$sr = $s->get_result();
while ($row = $sr->fetch_assoc()) $sizes[] = $row['size'];
$s->close();

// ── Unique colors
$colors = [];
$c = $conn->prepare("SELECT DISTINCT color FROM product_colors WHERE product_id = ? ORDER BY color");
$c->bind_param("i", $id);
$c->execute();
$cr = $c->get_result();
while ($row = $cr->fetch_assoc()) $colors[] = $row['color'];
$c->close();

// ── Per-variant stats: stock from product_variants, sold/revenue from order_items
// ✅ Joined by product_name + size + color so each cell is accurate
$varStmt = $conn->prepare("
    SELECT
        pv.size,
        pv.color,
        pv.quantity                                                                   AS stock,
        COALESCE(SUM(CASE WHEN o.status != 'Cancelled' THEN oi.quantity    ELSE 0 END), 0) AS sold,
        COALESCE(SUM(CASE WHEN o.status != 'Cancelled' THEN oi.quantity * oi.price ELSE 0 END), 0) AS revenue
    FROM product_variants pv
    LEFT JOIN order_items oi
           ON oi.product_name = ?
          AND oi.size          = pv.size
          AND oi.color         = pv.color
    LEFT JOIN orders o ON o.id = oi.order_id
    WHERE pv.product_id = ?
    GROUP BY pv.id, pv.size, pv.color
");
$varStmt->bind_param("si", $product['name'], $id);
$varStmt->execute();
$varResult = $varStmt->get_result();
$variants = [];
while ($row = $varResult->fetch_assoc()) {
    $variants[] = [
        "size"    => $row['size'],
        "color"   => $row['color'],
        "stock"   => (int)$row['stock'],
        "sold"    => (int)$row['sold'],
        "revenue" => (float)$row['revenue'],
    ];
}
$varStmt->close();

$product['sizes']    = $sizes;
$product['colors']   = $colors;
$product['variants'] = $variants;

echo json_encode($product);
$conn->close();
?>