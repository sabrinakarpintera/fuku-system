import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./style/MyCart.css";

// Format any number as ₱0,000.00
const formatPrice = (amount) =>
  "₱" +
  Number(amount).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function MyCart() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [checked, setChecked] = useState([]);

  useEffect(() => {
    fetch("http://fuku-system.rf.gd/api/get_cart.php", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setItems(data);
        setChecked(data.map(() => false));
      });
  }, []);

  const toggleOne = (i) => {
    setChecked(checked.map((v, idx) => (idx === i ? !v : v)));
  };

  const allChecked = checked.length > 0 && checked.every(Boolean);

  const toggleAll = () => {
    setChecked(checked.map(() => !allChecked));
  };

  const increaseQuantity = (i) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== i) return item;
        const next = item.quantity + 1;
        return { ...item, quantity: next > item.stocks ? item.stocks : next };
      })
    );
  };

  const decreaseQuantity = (i) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== i) return item;
        const next = item.quantity - 1;
        return { ...item, quantity: next < 1 ? 1 : next };
      })
    );
  };

  const handleQuantityInput = (i, raw) => {
    const value = parseInt(raw, 10);
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== i) return item;
        if (isNaN(value) || value < 1) return { ...item, quantity: 1 };
        if (value > item.stocks) return { ...item, quantity: item.stocks };
        return { ...item, quantity: value };
      })
    );
  };

  const deleteItems = async () => {
    const selectedIds = items
      .filter((item, i) => checked[i])
      .map((item) => item.id);

    if (selectedIds.length === 0) {
      alert("Select item to delete");
      return;
    }

    await fetch("http://fuku-system.rf.gd/api/delete_cart.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ids: selectedIds }),
    });

    const remainingItems = items.filter((item, i) => !checked[i]);
    setItems(remainingItems);
    setChecked(remainingItems.map(() => false));
  };

  const subtotal = items.reduce((total, item, i) => {
    if (checked[i]) return total + item.price * item.quantity;
    return total;
  }, 0);

  const handleCheckout = () => {
    const selectedItems = items.filter((item, i) => checked[i]);

    if (selectedItems.length === 0) {
      alert("Select items first");
      return;
    }

    // Pass cart ids so checkout.php fetches image/price from DB,
    // plus a quantityMap so Checkout.jsx can override with the user-adjusted qty.
    const ids = selectedItems.map((item) => item.id);
    const quantityMap = Object.fromEntries(
      selectedItems.map((item) => [item.id, item.quantity])
    );

    navigate("/checkout", { state: { ids, quantityMap } });
  };

  return (
    <div className="cart-container">
      <div className="page-header">
        <button
          className="back-btn"
          onClick={() => navigate("/dashboard")}
          aria-label="Back to dashboard"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="cart-title">My Cart</h1>
      </div>

      <div className="cart-header">
        <span></span>
        <span className="product-col">Product</span>
        <span>Price</span>
        <span>Quantity</span>
        <span>Total</span>
      </div>

      <hr />

      {items.map((item, i) => (
        <div key={item.id}>
          <div className="cart-item">
            <input
              type="checkbox"
              className="item-check"
              checked={checked[i] || false}
              onChange={() => toggleOne(i)}
            />
            <div className="product-info1">
              <img
                src={`http://fuku-system.rf.gd/api/${item.image}`}
                alt="product"
                className="product-img1"
              />
              <div>
                <h3>{item.name}</h3>
                <p>Color: {item.color}</p>
                <p>Size: {item.size}</p>
              </div>
            </div>

            <div className="price">{formatPrice(item.price)}</div>

            <div className="quantity">
              <button
                className="qty-btn"
                onClick={() => decreaseQuantity(i)}
                disabled={item.quantity <= 1}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <input
                type="number"
                min="1"
                max={item.stocks}
                value={item.quantity}
                onChange={(e) => handleQuantityInput(i, e.target.value)}
              />
              <button
                className="qty-btn"
                onClick={() => increaseQuantity(i)}
                disabled={item.quantity >= item.stocks}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            <div className="total">{formatPrice(item.price * item.quantity)}</div>
          </div>
          <hr />
        </div>
      ))}

      <div className="cart-footer">
        <div className="select-all">
          <input type="checkbox" checked={allChecked} onChange={toggleAll} />
          <span>Select All</span>
        </div>
        <div className="delete-btn" onClick={deleteItems}>
          Delete
        </div>
        <div className="subtotal">
          Subtotal: <span>{formatPrice(subtotal)}</span>
        </div>
        <button className="checkout-btn" onClick={handleCheckout}>
          Checkout
        </button>
      </div>
    </div>
  );
}

export default MyCart;