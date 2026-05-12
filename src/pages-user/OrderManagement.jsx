import { useState, useEffect } from "react";
import "./style/OrderManagement.css";
 
 
const STEPS = ["Processing", "Shipped", "Delivered"];
 
const STATUS_CLASS = {
  Delivered: "badge-delivered",
  Shipped: "badge-shipped",
  Processing: "badge-processing",
  Cancelled: "badge-cancelled",
};
 
export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");

    if (!userId) {
      console.warn("No user_id found in localStorage");
      setLoading(false);
      return; 
    }

    fetch(`http://localhost/Fuku/src/api/get_user_orders.php?user_id=${userId}`)
      .then(res => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setOrders(data);
        } else {
          console.error("Backend error:", data);
          setOrders([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch orders:", err);
        setLoading(false);
      });
  }, []); 

  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("All");
  const [cancelId, setCancelId] = useState(null);
 
  const filtered = filter === "All" ? orders : orders.filter(o => o.status === filter);
 
  const doCancel = (orderCode) => {
    fetch("http://localhost/Fuku/src/api/update_order_status.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        id: orderCode, 
        status: "Cancelled" 
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setOrders(prev => prev.map(o => o.id === orderCode ? { ...o, status: "Cancelled" } : o));
          if (selected?.id === orderCode) setSelected(prev => ({ ...prev, status: "Cancelled" }));
          setCancelId(null);
        } else {
          alert("Could not cancel order: " + data.message);
        }
      })
      .catch(err => console.error("Error cancelling:", err));
  };
 
  const stepIdx = selected ? STEPS.indexOf(selected.status) : -1;
 
  return (
    <div className="root">
      <main className="main">

        <div className="page-header">
          <a href="/dashboard" className="back-btn" aria-label="Back to dashboard">
            <span className="material-symbols-outlined">arrow_back</span>
          </a>
          <h1 className="page-title">My Orders</h1>
        </div>

        <div className="filters">
          {["All", "Processing", "Shipped", "Delivered", "Cancelled"].map(f => (
            <button key={f} className={`filter-btn ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
 
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Order ID</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => (
                <tr key={order.id} className="table-row" onClick={() => setSelected(order)}>
                  <td className="order-id">{order.id}</td>
                  <td>{order.date}</td>
                  <td>
                    {order.items?.length || 0} item{order.items?.length > 1 ? "s" : ""}
                  </td>
                  <td><strong>₱{order.total.toLocaleString()}.00</strong></td>
                  <td><span className={`badge ${STATUS_CLASS[order.status]}`}>{order.status}</span></td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn-view" onClick={() => setSelected(order)}>View</button>
                    {["Processing", "Shipped"].includes(order.status) && (
                      <button className="btn-cancel" onClick={() => setCancelId(order.id)}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={6} className="empty">No orders found.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
 
      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Order Details</h2>
                <p className="modal-sub">{selected.id} · {selected.date}</p>
              </div>
              <button className="close-btn" onClick={() => setSelected(null)}>✕</button>
            </div>
 
            {selected.status !== "Cancelled" ? (
              <div className="tracker">
                {STEPS.map((step, i) => (
                  <div key={step} className="step-wrap">
                    <div className={`step ${i <= stepIdx ? "step-done" : ""}`}>
                      <div className="step-dot">{i <= stepIdx ? "✓" : i + 1}</div>
                      <span className="step-label">{step}</span>
                    </div>
                    {i < STEPS.length - 1 && <div className={`step-line ${i < stepIdx ? "line-done" : ""}`} />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="cancelled-banner">Order Cancelled</div>
            )}
 
            <div className="modal-items">
              {selected.items.map((item, i) => (
                <div key={i} className="modal-item">
                  <img 
                    src={`http://localhost/Fuku/src/assets/images/${item.image}`} 
                    alt={item.name} 
                    className="item-thumb" 
                  />
                  <div className="item-info">
                    <p className="item-name">{item.name}</p>
                    <p className="item-sub">Color: {item.color} · Size: {item.size} · x{item.qty}</p>
                  </div>
                  <p className="item-price">₱{(item.price * item.qty).toLocaleString()}.00</p>
                </div>
              ))}
            </div>
 
            <div className="summary">
              {[["Subtotal", `₱${selected.total.toLocaleString()}.00`], ["Shipping", "₱0.00"], ["Payment", selected.payment], ["Address", selected.address]].map(([k, v]) => (
                <div key={k} className="summary-row"><span>{k}</span><span>{v}</span></div>
              ))}
              <div className="summary-row summary-total"><span>Total</span><span>₱{selected.total.toLocaleString()}.00</span></div>
            </div>
 
            {["Processing", "Shipped"].includes(selected.status) && (
              <button className="btn-cancel-order" onClick={() => setCancelId(selected.id)}>Cancel Order</button>
            )}
          </div>
        </div>
      )}
 
      {cancelId && (
        <div className="overlay" onClick={() => setCancelId(null)}>
          <div className="confirm" onClick={e => e.stopPropagation()}>
            <h3>Cancel Order?</h3>
            <p>Are you sure you want to cancel this order? This cannot be undone.</p>
            <div className="confirm-actions">
              <button className="btn-keep" onClick={() => setCancelId(null)}>Keep Order</button>
              <button className="btn-confirm-cancel" onClick={() => doCancel(cancelId)}>Yes, Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}