import { useState, useEffect, useRef } from "react";
import "./style/OrderManagement.css";
import ReviewModal from "./ReviewModal";

const STEPS = ["Processing", "Shipped", "Delivered"];

const BASE_URL = "http://fuku-system.rf.gd/api/";

const STATUS_CLASS = {
  Delivered:          "badge-delivered",
  Shipped:            "badge-shipped",
  Processing:         "badge-processing",
  Cancelled:          "badge-cancelled",
  Completed:          "badge-completed",
  "To Review":        "badge-toreview",
  "Refund Requested": "badge-refund",
};

function resolveImage(raw) {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  return BASE_URL + raw.replace(/^\/+/, "");
}

function RefundModal({ order, onClose, onSubmitted }) {
  const [form, setForm] = useState({
    requester_name: "",
    reason:         "",
    ewallet:        "",
    account_name:   "",
    account_number: "",
    additional:     "",
  });
  const [images,     setImages]     = useState([]);      
  const [previews,   setPreviews]   = useState([]);      
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const fileInputRef = useRef();

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleImages = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    // Cap at 5 images total
    const merged = [...images, ...files].slice(0, 5);
    setImages(merged);
    setPreviews(merged.map((f) => URL.createObjectURL(f)));
  };

  const removeImage = (idx) => {
    const next = images.filter((_, i) => i !== idx);
    setImages(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async () => {
    const { requester_name, reason, ewallet, account_name, account_number } = form;
    if (!requester_name || !reason || !ewallet || !account_name || !account_number) {
      setError("Please fill in all required fields.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      // Use FormData so we can send files alongside text fields
      const formData = new FormData();
      formData.append("order_code",     order.id);
      formData.append("requester_name", form.requester_name);
      formData.append("reason",         form.reason);
      formData.append("ewallet",        form.ewallet);
      formData.append("account_name",   form.account_name);
      formData.append("account_number", form.account_number);
      formData.append("additional",     form.additional);
      images.forEach((img) => formData.append("product_images[]", img));

      const res  = await fetch(`${BASE_URL}submit_refund.php`, {
        method:      "POST",
        credentials: "include",
        body:        formData,   // no Content-Type header — browser sets multipart boundary
      });
      const data = await res.json();
      if (data.success) {
        onSubmitted(order.id);
      } else {
        setError(data.message || "Something went wrong.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal refund-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-x" onClick={onClose} aria-label="Close">✕</button>

        <div className="modal-header">
          <h2 className="modal-title">Request a Refund</h2>
          <p className="modal-sub">{order.id}</p>
        </div>

        <p className="refund-intro">
          Fill in the form below and our team will review your refund request within 3–5 business days.
        </p>

        <div className="refund-form">

          <div className="refund-field">
            <label>Full Name <span className="req">*</span></label>
            <input
              type="text"
              placeholder="Your full name"
              value={form.requester_name}
              onChange={set("requester_name")}
            />
          </div>

          <div className="refund-field">
            <label>Reason for Refund <span className="req">*</span></label>
            <select value={form.reason} onChange={set("reason")}>
              <option value="">— Select a reason —</option>
              <option value="Item not as described">Item not as described</option>
              <option value="Wrong item received">Wrong item received</option>
              <option value="Defective / damaged item">Defective / damaged item</option>
              <option value="Item did not arrive">Item did not arrive</option>
              <option value="Changed my mind">Changed my mind</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="refund-field">
            <label>Additional Details</label>
            <textarea
              placeholder="Describe the issue in more detail (optional)"
              rows={3}
              value={form.additional}
              onChange={set("additional")}
            />
          </div>

          <div className="refund-field">
            <label>Product Photo(s) <span className="refund-label-hint">(up to 5 images)</span></label>
            <div
              className="refund-upload-zone"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="material-symbols-outlined refund-upload-icon">add_photo_alternate</span>
              <span>Click to upload photos of the item</span>
              <span className="refund-upload-sub">{images.length}/5 selected</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={handleImages}
            />
            {previews.length > 0 && (
              <div className="refund-previews">
                {previews.map((src, idx) => (
                  <div key={idx} className="refund-preview-wrap">
                    <img src={src} alt={`Upload ${idx + 1}`} className="refund-preview-img" />
                    <button
                      type="button"
                      className="refund-preview-remove"
                      onClick={() => removeImage(idx)}
                      aria-label="Remove image"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="refund-divider">Refund Account Details</div>

          <div className="refund-field">
            <label>E-Wallet <span className="req">*</span></label>
            <div className="refund-wallet-group">
              {["GCash", "Maya"].map((w) => (
                <button
                  key={w}
                  type="button"
                  className={`refund-wallet-btn ${form.ewallet === w ? "selected" : ""}`}
                  onClick={() => setForm((f) => ({ ...f, ewallet: w }))}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          <div className="refund-field">
            <label>Account Name <span className="req">*</span></label>
            <input
              type="text"
              placeholder={`Name registered on ${form.ewallet || "your e-wallet"}`}
              value={form.account_name}
              onChange={set("account_name")}
            />
          </div>

          <div className="refund-field">
            <label>Account Number / Mobile Number <span className="req">*</span></label>
            <input
              type="text"
              placeholder="e.g. 09XXXXXXXXX"
              value={form.account_number}
              onChange={set("account_number")}
            />
          </div>

          {error && <p className="refund-error">{error}</p>}

          <button
            className="btn-submit-refund"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Submit Refund Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrderManagement() {
  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState(null);
  const [filter,      setFilter]      = useState("All");
  const [cancelId,    setCancelId]    = useState(null);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [refundOrder, setRefundOrder] = useState(null);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (!userId) { setLoading(false); return; }

    fetch(`${BASE_URL}get_user_orders.php?user_id=${userId}`)
      .then(res => { if (!res.ok) throw new Error("Network error"); return res.json(); })
      .then(data => { setOrders(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(err => { console.error("Failed to fetch orders:", err); setLoading(false); });
  }, []);

  const filtered = filter === "All"
    ? orders
    : orders.filter(o => o.status === filter);

  const doCancel = (orderCode) => {
    fetch(`${BASE_URL}update_order_status.php`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: orderCode, status: "Cancelled" }),
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

  const doConfirmDelivery = (order) => {
    fetch(`${BASE_URL}update_order_status.php`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: order.id, status: "To Review" }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const updated = { ...order, status: "To Review" };
          setOrders(prev => prev.map(o => o.id === order.id ? updated : o));
          setSelected(null);
          setReviewOrder(updated);
        } else {
          alert("Could not confirm delivery: " + data.message);
        }
      })
      .catch(err => console.error("Error confirming delivery:", err));
  };

  const handleReviewSubmitted = (orderCode) => {
    setOrders(prev => prev.map(o => o.id === orderCode ? { ...o, status: "Completed" } : o));
    setReviewOrder(null);
  };

  const handleRefundSubmitted = (orderCode) => {
    setOrders(prev => prev.map(o =>
      o.id === orderCode ? { ...o, status: "Refund Requested" } : o
    ));
    setRefundOrder(null);
    setSelected(null);
  };

  const getStepIdx = (status) => {
    if (status === "Completed" || status === "To Review") return STEPS.length - 1;
    return STEPS.indexOf(status);
  };

  const stepIdx = selected ? getStepIdx(selected.status) : -1;

  if (loading) {
    return (
      <div className="root">
        <main className="main"><p>Loading orders…</p></main>
      </div>
    );
  }

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
          {["All", "Processing", "Shipped", "Delivered", "To Review", "Completed", "Refund Requested", "Cancelled"].map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => (
                <tr key={order.id} className="table-row" onClick={() => setSelected(order)}>
                  <td className="order-id">{order.id}</td>
                  <td>{order.date}</td>
                  <td>{order.items?.length || 0} item{order.items?.length !== 1 ? "s" : ""}</td>
                  <td><strong>₱{Number(order.total).toLocaleString()}.00</strong></td>
                  <td>
                    <span className={`badge ${STATUS_CLASS[order.status] ?? ""}`}>
                      {order.status}
                    </span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn-view" onClick={() => setSelected(order)}>View</button>

                    {order.status === "Processing" && (
                      <button className="btn-cancel" onClick={() => setCancelId(order.id)}>
                        Cancel
                      </button>
                    )}

                    {order.status === "Delivered" && (
                      <button
                        className="btn-refund"
                        onClick={() => setRefundOrder(order)}
                      >
                        Refund
                      </button>
                    )}

                    {order.status === "To Review" && (
                      <button className="btn-review" onClick={() => setReviewOrder(order)}>
                        ⭐ Review
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {!filtered.length && (
                <tr>
                  <td colSpan={6} className="empty">No orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>

            <button className="modal-close-x" onClick={() => setSelected(null)} aria-label="Close modal">✕</button>

            <div className="modal-header">
              <div>
                <h2 className="modal-title">Order Details</h2>
                <p className="modal-sub">{selected.id} · {selected.date}</p>
              </div>
            </div>

            {selected.status === "Cancelled" ? (
              <div className="cancelled-banner">Order Cancelled</div>
            ) : selected.status === "Refund Requested" ? (
              <div className="refund-requested-banner">
                🔄 Refund Requested — Our team is reviewing your request.
              </div>
            ) : (selected.status === "Completed" || selected.status === "To Review") ? (
              <div className="tracker">
                {STEPS.map((step, i) => (
                  <div key={step} className="step-wrap">
                    <div className="step step-done">
                      <div className="step-dot">✓</div>
                      <span className="step-label">{step}</span>
                    </div>
                    {i < STEPS.length - 1 && <div className="step-line line-done" />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="tracker">
                {STEPS.map((step, i) => (
                  <div key={step} className="step-wrap">
                    <div className={`step ${i <= stepIdx ? "step-done" : ""}`}>
                      <div className="step-dot">{i <= stepIdx ? "✓" : i + 1}</div>
                      <span className="step-label">{step}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`step-line ${i < stepIdx ? "line-done" : ""}`} />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="modal-items">
              {selected.items.map((item, i) => {
                const src = resolveImage(item.image);
                return (
                  <div key={i} className="modal-item">
                    {src ? (
                      <img src={src} alt={item.name} onError={e => { e.currentTarget.style.display = "none"; }} />
                    ) : (
                      <div className="img-placeholder" />
                    )}
                    <div className="item-info">
                      <p className="item-name">{item.name}</p>
                      <p className="item-sub">Color: {item.color} · Size: {item.size} · x{item.qty}</p>
                    </div>
                    <p className="item-price">₱{(item.price * item.qty).toLocaleString()}.00</p>
                  </div>
                );
              })}
            </div>

            <div className="summary">
              {[
                ["Subtotal", `₱${Number(selected.subtotal).toLocaleString()}.00`],
                ["Shipping", selected.shipping === "0" ? "Free" : `₱${Number(selected.shipping).toLocaleString()}.00`],
                ["Payment",  selected.payment],
                ["Address",  selected.address],
              ].map(([k, v]) => (
                <div key={k} className="summary-row">
                  <span>{k}</span><span>{v}</span>
                </div>
              ))}
              <div className="summary-row summary-total">
                <span>Total</span>
                <span>₱{Number(selected.total).toLocaleString()}.00</span>
              </div>
            </div>

            {selected.status === "Delivered" && (
              <div className="modal-cta-row">
                <button
                  className="btn-confirm-delivery enabled"
                  onClick={() => doConfirmDelivery(selected)}
                >
                  ✓ Order Received
                </button>
                <button
                  className="btn-refund-modal"
                  onClick={() => { setSelected(null); setRefundOrder(selected); }}
                >
                  Request Refund
                </button>
              </div>
            )}

            {selected.status === "To Review" && (
              <button
                className="btn-confirm-delivery enabled btn-write-review"
                onClick={() => { setSelected(null); setReviewOrder(selected); }}
              >
                ⭐ Write a Review
              </button>
            )}

            {selected.status === "Refund Requested" && (
              <div className="refund-pending-note">
                Your refund request has been submitted and is under review. We'll contact you within 3–5 business days.
              </div>
            )}

            {selected.status === "Completed" && (
              <div className="completed-banner">✓ Order Completed · Thank you!</div>
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

      {reviewOrder && (
        <ReviewModal
          order={reviewOrder}
          onClose={() => setReviewOrder(null)}
          onSubmitted={handleReviewSubmitted}
        />
      )}

      {refundOrder && (
        <RefundModal
          order={refundOrder}
          onClose={() => setRefundOrder(null)}
          onSubmitted={handleRefundSubmitted}
        />
      )}
    </div>
  );
}