import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "./style/AdminDashboard1.css";
import logoImage from "../assets/fuku-logo.png";

const Icon = ({ name }) => <span className="material-icons">{name}</span>;

const statusColors = {
  Delivered: "status-delivered",
  Shipped: "status-shipped",
  Processing: "status-processing",
  Cancelled: "status-cancelled",
};

const trackingSteps = ["Processing", "Shipped", "Delivered"];

function getTrackingIndex(status) {
  if (status === "Cancelled") return -1;
  return trackingSteps.indexOf(status);
}

export default function OrderDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);

  const fetchOrders = () => {
    fetch("http://localhost/Fuku/src/api/get_orders.php")
      .then((res) => res.json())
      .then((data) => setOrders(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filters = ["All", "Processing", "Shipped", "Delivered", "Cancelled"];

  const filteredOrders =
    filterStatus === "All"
      ? orders
      : orders.filter((o) => o.status === filterStatus);

  const navItems = [
    { label: "Home", icon: "home", path: "/admin/dashboard" },
    { label: "Product Listed", icon: "inventory_2", path: "/admin/productlist" },
    { label: "Order Details", icon: "receipt_long", path: "/admin/orderdetails" },
  ];

  const handleStatusUpdate = (updatedOrder) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
    );
    setSelectedOrder(updatedOrder);
  };

  return (
    <div className="admin-root">
      <header className="admin-header">
    <div className="admin-header-inner">

          <span className="logo">

            <img src={logoImage} alt="Fuku Logo" />

          </span>

          <nav className="admin-nav">

            {navItems.map((item) => (

              <button

                key={item.label}

                className={`nav-btn ${item.path === currentPath ? "nav-btn--active" : ""}`}

                onClick={() => navigate(item.path)}

              >

                <Icon name={item.icon} />

                <span>{item.label}</span>

              </button>

            ))}

          </nav>

          <button className="signout-btn" onClick={handleLogout}>

            <Icon name="logout" />

            <span>Sign Out</span>

          </button>

        </div>
      </header>

      <main className="admin-main">
            <div className="page-orders">

          <div className="page-title-row">

            <h1 className="page-title">Order Details</h1>

          </div>

          <div className="filter-row">

            {filters.map((f) => (

              <button

                key={f}

                className={`filter-btn ${filterStatus === f ? "filter-btn--active" : ""}`}

                onClick={() => setFilterStatus(f)}

              >

                {f}

              </button>

            ))}

          </div>
        <div className="section-card">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <OrderRowWithAction
                  key={order.id}
                  order={order}
                  onView={setSelectedOrder}
                />
              ))}
            </tbody>
          </table>
        </div>
        </div>
      </main>

      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
}

function OrderRowWithAction({ order, onView }) {
  return (
    <tr className="order-row">
      <td className="order-id">{order.id}</td>
      <td>{order.customer}</td>
      <td>{order.date}</td>
      <td>{order.item_count} {order.item_count === 1 ? "item" : "items"}</td>
      <td className="order-total">
        ₱{order.total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
      </td>
      <td>
        <span className={`status-badge ${statusColors[order.status]}`}>
          {order.status}
        </span>
      </td>
      <td className="action-cell">
        <button className="action-view" onClick={() => onView(order)}>
          View
        </button>
      </td>
    </tr>
  );
}

const statusActions = {
  Processing: [
    {
      label: "Mark as Shipped",
      nextStatus: "Shipped",
      icon: "local_shipping",
      className: "status-action-btn status-action-ship",
    },
    {
      label: "Cancel Order",
      nextStatus: "Cancelled",
      icon: "cancel",
      className: "status-action-btn status-action-cancel",
    },
  ],
  Shipped: [
    {
      label: "Mark as Delivered",
      nextStatus: "Delivered",
      icon: "check_circle",
      className: "status-action-btn status-action-deliver",
    },
  ],
  Delivered: [],   
  Cancelled: [],  
};

function OrderModal({ order, onClose, onStatusUpdate }) {
  const trackIdx = getTrackingIndex(order.status);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const handleStatusChange = (nextStatus) => {
    setUpdating(true);
    fetch("http://localhost/Fuku/src/api/update_order_status.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: order.id, status: nextStatus }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          onStatusUpdate({ ...order, status: nextStatus });
        } else {
          alert("Failed to update status.");
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {
        setUpdating(false);
        setConfirmAction(null);
      });
  };

  const actions = statusActions[order.status] || [];

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}>✕</button>
          <h2 className="modal-title">Order Details</h2>
          <p className="modal-subtitle">{order.id} · {order.date}</p>

        
        {order.status !== "Cancelled" ? (

            <div className="tracking-bar">

              {trackingSteps.map((step, i) => (

                <div key={step} className="tracking-step-wrap">

                  <div className={`tracking-circle ${i <= trackIdx ? "tracking-done" : ""}`}>

                    {i <= trackIdx ? "✓" : ""}

                  </div>

                  <span className={`tracking-label ${i <= trackIdx ? "tracking-label-done" : ""}`}>

                    {step}

                  </span>

                  {i < trackingSteps.length - 1 && (

                    <div className={`tracking-line ${i < trackIdx ? "tracking-line-done" : ""}`} />

                  )}

                </div>

              ))}

            </div>

          ) : (

            <div className="cancelled-badge-large">Order Cancelled</div>

          )}



          <div className="modal-divider" />




          {actions.length > 0 && (

            <>

              <div className="status-actions-section">

                <span className="status-actions-label">

                  <Icon name="tune" /> Manage Order Status

                </span>

                <div className="status-actions-row">

                  {actions.map((action) => (

                    <button

                      key={action.nextStatus}

                      className={action.className}

                      disabled={updating}

                      onClick={() => setConfirmAction(action)}

                    >

                      <Icon name={action.icon} />

                      {action.label}

                    </button>

                  ))}

                </div>

              </div>

              <div className="modal-divider" />

            </>

          )}

          <div className="modal-customer-row">

            <span className="modal-field-label">Customer</span>

            <span className="modal-field-value">{order.customer}</span>

          </div>

          <div className="modal-divider" />

          <div className="modal-products">
            {order.items && order.items.map((p, i) => (
              <div key={i} className="modal-product-row">
                <div className="modal-product-img-wrap">
                  <img 
                    src={`http://localhost/Fuku/src/api/${p.image}`} 
                    alt={p.name} 
                    className="modal-product-img" 
                    onError={(e) => { e.target.src = 'placeholder-url'; }}
                  />
                </div>
                <div className="modal-product-info">
                  <span className="modal-product-name">{p.name}</span>
                  <span className="modal-product-meta">
                    Color: {p.color} · Size: {p.size} · x{p.qty}
                  </span>
                </div>
                <span className="modal-product-price">
                  ₱{p.price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>

          <div className="modal-divider" />

          <div className="modal-summary">
            <div className="modal-summary-row">
              <span>Subtotal</span>
              <span>₱{order.subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="modal-summary-row">
              <span>Shipping</span>
              <span>₱{order.shipping.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="modal-summary-row">
              <span>Payment</span>
              <span>{order.payment}</span>
            </div>
            <div className="modal-summary-row">
              <span>Address</span>
              <span className="modal-address">{order.address}</span>
            </div>
          </div>

          <div className="modal-divider" />
          <div className="modal-total-row">
            <span className="modal-total-label">Total</span>
            <span className="modal-total-value">
              ₱{order.total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="modal-divider" />
          <div className="modal-payment-verify-row">
            <button className="payment-verify-btn" onClick={() => setShowPaymentModal(true)}>
              <Icon name="verified" /> View Payment Verification
            </button>
          </div>
        </div>
      </div>

      {confirmAction && (
        <ConfirmStatusModal
          action={confirmAction}
          order={order}
          updating={updating}
          onConfirm={() => handleStatusChange(confirmAction.nextStatus)}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {showPaymentModal && (
        <PaymentVerificationModal
          payment={{
            ref_number: order.refNumber,
            sender_name: order.sender,
            proof_image: order.proof,
          }}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </>
  );
}

function ConfirmStatusModal({ action, order, updating, onConfirm, onCancel }) {
  const isCancelling = action.nextStatus === "Cancelled";

  return (
    <div className="modal-overlay confirm-overlay" onClick={onCancel}>
      <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
        <div className={`confirm-icon-wrap ${isCancelling ? "confirm-icon-cancel" : "confirm-icon-proceed"}`}>
          <Icon name={action.icon} />
        </div>
        <h3 className="confirm-title">{action.label}?</h3>
        <p className="confirm-desc">
          {isCancelling
            ? `This will cancel order ${order.id}. This action cannot be undone.`
            : `You're about to mark order ${order.id} as "${action.nextStatus}".`}
        </p>
        <div className="confirm-actions">
          <button className="confirm-btn-no" onClick={onCancel} disabled={updating}>
            No, Go Back
          </button>
          <button
            className={`confirm-btn-yes ${isCancelling ? "confirm-btn-yes--danger" : ""}`}
            onClick={onConfirm}
            disabled={updating}
          >
            {updating ? (
              <><Icon name="hourglass_top" /> Updating...</>
            ) : (
              <><Icon name="check" /> Yes, Confirm</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentVerificationModal({ payment, onClose }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="modal-overlay payment-verify-overlay" onClick={onClose}>
      <div className="modal-box payment-verify-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="payment-verify-header">
          <Icon name="receipt" />
          <h2 className="modal-title">Payment Verification</h2>
        </div>

        <div className="modal-divider" />

        <div className="payment-verify-field">
          <span className="payment-verify-label">
            <Icon name="tag" /> Reference Number
          </span>
          <span className="payment-verify-value">{payment.ref_number || "—"}</span>
        </div>

        <div className="payment-verify-field">
          <span className="payment-verify-label">
            <Icon name="person" /> Sender Name
          </span>
          <span className="payment-verify-value">{payment.sender_name || "—"}</span>
        </div>

        <div className="modal-divider" />

        <div className="payment-verify-proof">
          <span className="payment-verify-label">
            <Icon name="image" /> Proof of Payment
          </span>
          <div className="payment-verify-img-wrap">
            {payment.proof_image && !imgError ? (
              <img
                src={`http://localhost/Fuku/src/api/${payment.proof_image}`}
                className="payment-verify-img"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="payment-verify-img-placeholder">
                <Icon name="broken_image" />
                <span>No image available</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}