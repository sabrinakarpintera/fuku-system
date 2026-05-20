import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "./style/AdminDashboard1.css";
import logoImage from "../assets/fuku-logo.png";

const statusColors = {
  Delivered: "status-delivered",
  Shipped: "status-shipped",
  Processing: "status-processing",
  Cancelled: "status-cancelled",
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const handleDownloadPDF = () => {
  const existing = document.getElementById("dashboard-printable");
  if (existing) existing.remove();

  const today = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const cards = [
    { label: "Total Sales",     value: `₱${stats.totalSales.toLocaleString("en-PH", { minimumFractionDigits: 2 })}` },
    { label: "Total Customers", value: stats.totalCustomers },
    { label: "Total Orders",    value: stats.totalOrders },
    { label: "Pending Orders",  value: stats.pendingOrders },
    { label: "Daily Sales",     value: `₱${stats.dailySales.toLocaleString("en-PH", { minimumFractionDigits: 2 })}` },
  ];

  const cardHTML = cards.map((c) => `
    <div class="dash-print-card">
      <div class="dash-print-card-label">${c.label}</div>
      <div class="dash-print-card-value">${c.value}</div>
    </div>
  `).join("");

  const div = document.createElement("div");
  div.id = "dashboard-printable";
  div.innerHTML = `
    <div class="dash-print-header">
      <div class="dash-print-store">FUKU</div>
      <div class="dash-print-sub">Dashboard Report</div>
    </div>
    <div class="dash-print-date">Generated: ${today}</div>
    <hr class="dash-print-divider" />
    <div class="dash-print-grid">${cardHTML}</div>
    <hr class="dash-print-divider" />
    <div class="dash-print-footer">Fuku Admin Dashboard · Confidential</div>
  `;

  document.body.appendChild(div);
  window.print();
  setTimeout(() => div.remove(), 1000);
};

  const navItems = [
    { label: "Home",           icon: HomeIcon,    onClick: () => navigate("/admin/dashboard")   },
    { label: "Product Listed", icon: ProductIcon, onClick: () => navigate("/admin/productlist") },
    { label: "Order Details",  icon: OrderIcon,   onClick: () => navigate("/admin/orderdetails")},
  ];

  useEffect(() => {
    fetch("http://fuku-system.rf.gd/api/admin_dashboard.php")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(data.stats);
          setOrders(data.orders);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

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
                className={`nav-btn ${item.label === "Home" ? "nav-btn--active" : ""}`}
                onClick={() => item.onClick && item.onClick()}
              >
                <item.icon />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <button className="signout-btn" onClick={handleLogout}>
            <SignOutIcon />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="admin-main">
        {!loading && stats && (
          <HomePage
            stats={stats}
            orders={orders}
            onView={(o) => setSelectedOrder(o)}
            onDownloadPDF={handleDownloadPDF}
          />
        )}
      </main>

      {selectedOrder && (
        <OrderModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
}

// ── Added onDownloadPDF prop ──────────────────────────────────────────────────
function HomePage({ stats, orders, onView, onDownloadPDF }) {
  const recentOrders = orders.slice(0, 5);

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="page-home">
      <div className="page-title-row">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <span className="page-date">{today}</span>
        </div>

        {/* ── Download PDF button ── */}
        <button className="download-pdf-btn" onClick={onDownloadPDF}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.5"
               strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download PDF
        </button>
      </div>

      <div className="stats-grid">
        <StatCard label="Total Sales"     value={`₱${stats.totalSales.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`} icon={<SalesIcon />}     accent="accent-brown" />
        <StatCard label="Total Customers" value={stats.totalCustomers}                                                           icon={<CustomersIcon />}  accent="accent-sage"  />
        <StatCard label="Total Orders"    value={stats.totalOrders}                                                              icon={<OrderIcon />}      accent="accent-blush" />
        <StatCard label="Pending Orders"  value={stats.pendingOrders}                                                            icon={<PendingIcon />}    accent="accent-amber" />
        <StatCard label="Daily Sales"     value={`₱${stats.dailySales.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`}  icon={<DailyIcon />}      accent="accent-teal"  />
      </div>

      <div className="section-card">
        <div className="section-header">
          <h2 className="section-title">Recent Orders</h2>
        </div>
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((order) => (
              <OrderRow key={order.id} order={order} onView={onView} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, accent }) {
  return (
    <div className={`stat-card ${accent}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-info">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
      </div>
    </div>
  );
}

function OrderRow({ order, onView }) {
  return (
    <tr className="order-row">
      <td className="order-id">{order.id}</td>
      <td>{order.customer}</td>
      <td>{order.date}</td>
      <td>{order.items} {order.items === 1 ? "item" : "items"}</td>
      <td className="order-total">₱{order.total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
      <td>
        <span className={`status-badge ${statusColors[order.status]}`}>{order.status}</span>
      </td>
    </tr>
  );
}

const trackingSteps = ["Processing", "Shipped", "Delivered"];

function getTrackingIndex(status) {
  if (status === "Cancelled") return -1;
  return trackingSteps.indexOf(status);
}

function OrderModal({ order, onClose }) {
  const trackIdx = getTrackingIndex(order.status);
  return (
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
                <span className={`tracking-label ${i <= trackIdx ? "tracking-label-done" : ""}`}>{step}</span>
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
        <div className="modal-customer-row">
          <span className="modal-field-label">Customer</span>
          <span className="modal-field-value">{order.customer}</span>
        </div>
        <div className="modal-divider" />

        <div className="modal-products">
          {order.products.map((p, i) => (
            <div key={i} className="modal-product-row">
              <div className="modal-product-img" />
              <div className="modal-product-info">
                <span className="modal-product-name">{p.name}</span>
                <span className="modal-product-meta">Color: {p.color} · Size: {p.size} · x{p.qty}</span>
              </div>
              <span className="modal-product-price">₱{p.price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
        </div>

        <div className="modal-divider" />
        <div className="modal-summary">
          <div className="modal-summary-row"><span>Subtotal</span><span>₱{order.subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span></div>
          <div className="modal-summary-row"><span>Shipping</span><span>₱{order.shipping.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span></div>
          <div className="modal-summary-row"><span>Payment</span><span>{order.payment}</span></div>
          <div className="modal-summary-row"><span>Address</span><span className="modal-address">{order.address}</span></div>
        </div>
        <div className="modal-divider" />
        <div className="modal-total-row">
          <span className="modal-total-label">Total</span>
          <span className="modal-total-value">₱{order.total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  );
}

function HomeIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
}
function ProductIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>;
}
function OrderIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>;
}
function SignOutIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
}
function SalesIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
}
function CustomersIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function PendingIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
}
function DailyIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;
}