import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import "./style/Checkout.css";
import QR from "../assets/qrcode.jpg";
import gcash from "../assets/gcash.png";
import maya from "../assets/maya.png";

const API = "http://fuku-system.rf.gd/api";

const SHIPPING_FEES = {
  "NCR - National Capital Region":          50,
  "Region IV-A - CALABARZON":               50,
  "Region III - Central Luzon":             60,
  "CAR - Cordillera Administrative Region": 70,
  "Region IV-B - MIMAROPA":                 70,
  "Region I - Ilocos Region":               80,
  "Region II - Cagayan Valley":             80,
  "Region V - Bicol Region":                80,
  "Region VI - Western Visayas":            90,
  "Region VII - Central Visayas":           90,
  "Region VIII - Eastern Visayas":         100,
  "Region X - Northern Mindanao":          100,
  "Region XI - Davao Region":              100,
  "Region IX - Zamboanga Peninsula":       110,
  "Region XII - SOCCSKSARGEN":             110,
  "Region XIII - CARAGA":                  110,
  "BARMM - Bangsamoro":                    120,
};

const formatPrice = (amount) =>
  "₱" + Number(amount).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getMatchedRegionKey = (region) =>
  Object.keys(SHIPPING_FEES).find(key =>
    key.toLowerCase().includes((region || "").toLowerCase()) ||
    (region || "").toLowerCase().includes(key.toLowerCase())
  );

const imgSrc = (imagePath) => {
  if (!imagePath) return "";
  if (imagePath.startsWith("http")) return imagePath;
  const clean = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
  return `${API}/${clean}`;
};

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();

  // Cart checkout: ids (number[]) + quantityMap ({ [cart_id]: qty })
  const ids         = location.state?.ids         || [];
  const quantityMap = location.state?.quantityMap || {};

  // Buy Now: items array passed directly from Shop modal
  const buyNowItems = location.state?.items || null;

  const [data,          setData]         = useState(null);
  const [loading,       setLoading]      = useState(true);
  const [paymentMethod, setPaymentMethod]= useState("");
  const [eWallet,       setEWallet]      = useState("");
  const [paymentStep,   setPaymentStep]  = useState("select");
  const [refNumber,     setRefNumber]    = useState("");
  const [senderName,    setSenderName]   = useState("");
  const [proofImage,    setProofImage]   = useState(null);
  const [proofPreview,  setProofPreview] = useState("");
  const [placing,       setPlacing]      = useState(false);
  const [toasts,        setToasts]       = useState([]);

  const proofInputRef = useRef();

  const showToast = (message, type = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  useEffect(() => {
    // ── Buy Now flow ──────────────────────────────────────────────────────
    if (buyNowItems && buyNowItems.length > 0) {
      fetch(`${API}/checkout.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: [] }),
      })
        .then(r => r.json())
        .then(d => {
          const mappedItems = buyNowItems.map(i => ({
            id:       i.product_id ?? i.id,
            name:     i.name,
            image:    i.image,
            price:    Number(i.price),
            quantity: i.quantity,
            color:    i.color,
            size:     i.size,
          }));
          setData({ user: d.user, items: mappedItems });
          setLoading(false);
        })
        .catch(() => setLoading(false));
      return;
    }

    // ── Cart checkout flow ────────────────────────────────────────────────
    if (ids.length === 0) {
      showToast("No items selected.", "error");
      navigate("/mycart");
      return;
    }

    fetch(`${API}/checkout.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ids }),
    })
      .then(r => r.json())
      .then(d => {
        // Override the DB quantity with whatever the user set in MyCart
        const itemsWithUpdatedQty = (d.items || []).map(item => ({
          ...item,
          price:    Number(item.price),
          // quantityMap key is the cart row id (same as item.id from checkout.php)
          quantity: quantityMap[item.id] ?? item.quantity,
        }));
        setData({ user: d.user, items: itemsWithUpdatedQty });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handlePaymentMethod = (val) => {
    setPaymentMethod(val);
    setEWallet("");
    setPaymentStep("select");
    setRefNumber("");
    setSenderName("");
    setProofImage(null);
    setProofPreview("");
  };

  const handleSelectWallet = (wallet) => { setEWallet(wallet); setPaymentStep("qr"); };
  const handleQRDone = () => setPaymentStep("proof");

  const handleProofImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProofImage(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const canPlaceOrder = () => {
    if (!data) return false;
    const { user } = data;
    const hasDeliveryDetails =
      user?.name?.trim() && user?.phone?.trim() && user?.address?.trim();
    if (!hasDeliveryDetails) return false;
    if (!getMatchedRegionKey(user?.region || "")) return false;
    if (!paymentMethod) return false;
    if (paymentMethod === "Cash on Delivery") return true;
    if (paymentMethod === "Online Payment") {
      return paymentStep === "proof" && refNumber.trim() && senderName.trim() && proofImage;
    }
    return false;
  };

  const handleEditDelivery = () => {
    navigate("/myaccount", {
      state: {
        returnToCheckout: true,
        checkoutState: { ids, quantityMap, items: buyNowItems },
      },
    });
  };

  const handlePlaceOrder = async () => {
    if (!canPlaceOrder()) return;
    setPlacing(true);

    const { user, items } = data;
    const userRegion  = user?.region || "";
    const matchedKey  = getMatchedRegionKey(userRegion);
    const shippingFee = matchedKey ? SHIPPING_FEES[matchedKey] : 0;

    const formData = new FormData();
    formData.append("payment_method", paymentMethod);
    formData.append("region",         matchedKey || userRegion);
    formData.append("shipping_fee",   shippingFee);

    if (buyNowItems && buyNowItems.length > 0) {
      formData.append("buynow_items", JSON.stringify(items));
    } else {
      // Send ids + the updated quantities so place_order.php uses correct qtys
      formData.append("ids",          JSON.stringify(ids));
      formData.append("quantity_map", JSON.stringify(quantityMap));
    }

    if (paymentMethod === "Online Payment") {
      formData.append("e_wallet",    eWallet);
      formData.append("ref_number",  refNumber);
      formData.append("sender_name", senderName);
      formData.append("proof",       proofImage);
    }

    try {
      const res  = await fetch(`${API}/place_order.php`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const text = await res.text();
        let result;
        try {
          // Trim leading garbage (PHP notices, warnings, BOMs) before the JSON object
          const jsonStart = text.indexOf("{");
          const clean = jsonStart !== -1 ? text.slice(jsonStart) : text;
          result = JSON.parse(clean);
        } catch (e) {
          console.error("Invalid JSON from PHP:", text);
          showToast("Server error. Please check PHP logs.", "error");
          setPlacing(false);
          return;
        }

      if (result.success) {
        showToast(result.message || "Order placed successfully!", "success");
        setTimeout(() => navigate("/ordermanagement"), 3500);
      } else {
        showToast(result.message || "Failed to place order.", "error");
        setPlacing(false);
      }
    } catch (err) {
      console.error(err);
      showToast("Something went wrong. Please try again.", "error");
      setPlacing(false);
    }
  };

  if (loading) return (
    <div className="ck-loading">
      <div className="ck-spinner" />
      <span>Preparing your order…</span>
    </div>
  );

  if (!data?.items?.length) return (
    <div className="ck-loading"><span>No items found.</span></div>
  );

  const { user, items } = data;
  const subtotal    = items.reduce((t, i) => t + i.price * i.quantity, 0);
  const userRegion  = user?.region || "";
  const matchedKey  = getMatchedRegionKey(userRegion);
  const shippingFee = matchedKey ? SHIPPING_FEES[matchedKey] : null;
  const displayRegion = matchedKey || userRegion;
  const total       = subtotal + (shippingFee ?? 0);

  return (
    <div className="ck-page">

      {/* ── Toast Notifications ── */}
      <div className="ck-toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`ck-toast ck-toast-${toast.type}`}>
            <span className="ck-toast-icon material-symbols-outlined">
              {toast.type === "success" ? "check_circle" : "error"}
            </span>
            <span className="ck-toast-message">{toast.message}</span>
            <button
              className="ck-toast-close"
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            >✕</button>
          </div>
        ))}
      </div>

      <a href="/mycart" className="back-btn" aria-label="Back to cart">
        <span className="material-symbols-outlined">arrow_back</span>
      </a>

      <div className="ck-container">
        <h1 className="ck-title">Checkout</h1>

        {/* ── Delivery Details ── */}
        <section className="ck-card">
          <div className="ck-card-header">
            <div className="ck-card-label">Delivery Details</div>
            <button className="ck-edit-btn" onClick={handleEditDelivery}>Edit</button>
          </div>
          <div className="ck-address-block">
            <p className="ck-addr-name">{user?.name  || "—"}</p>
            <p className="ck-addr-line">{user?.phone || "—"}</p>
            <p className="ck-addr-line">{user?.address || "—"}</p>
            <p className="ck-addr-line">{displayRegion || "—"}</p>
          </div>
          {(!user?.name?.trim() || !user?.phone?.trim() || !user?.address?.trim()) && (
            <p style={{ color: "red", fontSize: "0.8rem", marginTop: "8px" }}>
              ⚠️ Please complete your delivery details before placing an order.
            </p>
          )}
          {!matchedKey && userRegion && (
            <p style={{ color: "red", fontSize: "0.8rem", marginTop: "4px" }}>
              ⚠️ Your region "{userRegion}" doesn't match our shipping zones. Please update your account.
            </p>
          )}
          {!userRegion && (
            <p style={{ color: "red", fontSize: "0.8rem", marginTop: "4px" }}>
              
            </p>
          )}
        </section>

        {/* ── Order Items ── */}
        <section className="ck-card">
          <div className="ck-card-label">Order Items</div>
          <div className="ck-items">
            {items.map((item, idx) => (
              <div className="ck-item" key={item.id ?? idx}>
                <img
                  className="ck-item-img"
                  src={imgSrc(item.image)}
                  alt={item.name}
                  onError={(e) => { e.target.style.background = "#e8dfd4"; e.target.style.display = "block"; }}
                />
                <div className="ck-item-info">
                  <p className="ck-item-name">{item.name}</p>
                  <p className="ck-item-meta">Color: {item.color} · Size: {item.size}</p>
                </div>
                <div className="ck-item-qty">×{item.quantity}</div>
                <div className="ck-item-price">
                  {formatPrice(item.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Order Summary ── */}
        <section className="ck-card">
          <div className="ck-card-label">Order Summary</div>
          <div className="ck-summary">
            <div className="ck-row">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="ck-row">
              <span>Shipping {matchedKey ? `(${matchedKey.split("-")[0].trim()})` : ""}</span>
              <span>{shippingFee !== null ? formatPrice(shippingFee) : "—"}</span>
            </div>
            <div className="ck-row ck-total">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        </section>

        {/* ── Payment Method ── */}
        <section className="ck-card">
          <div className="ck-card-label">Payment Method</div>
          <div className="ck-payment-options">
            <button
              className={`ck-pay-card ${paymentMethod === "Online Payment" ? "selected" : ""}`}
              onClick={() => handlePaymentMethod("Online Payment")}
              type="button"
            >
              <div className="ck-pay-text">
                <span className="ck-pay-title">Online Payment</span>
                <span className="ck-pay-sub">GCash · Maya</span>
              </div>
              <span className="ck-pay-radio">{paymentMethod === "Online Payment" ? "●" : "○"}</span>
            </button>

            <button
              className={`ck-pay-card ${paymentMethod === "Cash on Delivery" ? "selected" : ""}`}
              onClick={() => handlePaymentMethod("Cash on Delivery")}
              type="button"
            >
              <div className="ck-pay-text">
                <span className="ck-pay-title">Cash on Delivery</span>
                <span className="ck-pay-sub">Pay when it arrives</span>
              </div>
              <span className="ck-pay-radio">{paymentMethod === "Cash on Delivery" ? "●" : "○"}</span>
            </button>
          </div>

          {paymentMethod === "Online Payment" && paymentStep === "select" && (
            <div className="ck-wallet-section ck-animate-in">
              <p className="ck-wallet-label">Choose your e-wallet</p>
              <div className="ck-wallet-options">
                <button className="ck-wallet-card gcash" onClick={() => handleSelectWallet("gcash")} type="button">
                  <img src={gcash} alt="GCash" className="ck-wallet-logo" />
                </button>
                <button className="ck-wallet-card maya" onClick={() => handleSelectWallet("maya")} type="button">
                  <img src={maya} alt="Maya" className="ck-wallet-logo" />
                </button>
              </div>
            </div>
          )}

          {paymentMethod === "Online Payment" && paymentStep === "proof" && (
            <div className="ck-proof-section ck-animate-in">
              <div className="ck-proof-header">
                <p className="ck-proof-title">Payment Verification</p>
                <p className="ck-proof-sub">Please fill in your payment details below.</p>
              </div>
              <div className="ck-proof-fields">
                <div className="ck-field">
                  <label className="ck-field-label">Reference Number</label>
                  <input
                    className="ck-field-input"
                    placeholder="e.g. 1234567890"
                    value={refNumber}
                    onChange={e => setRefNumber(e.target.value)}
                  />
                </div>
                <div className="ck-field">
                  <label className="ck-field-label">Sender Name</label>
                  <input
                    className="ck-field-input"
                    placeholder="Name on your e-wallet"
                    value={senderName}
                    onChange={e => setSenderName(e.target.value)}
                  />
                </div>
                <div className="ck-field">
                  <label className="ck-field-label">Payment Screenshot / Proof</label>
                  <div
                    className="ck-proof-upload"
                    onClick={() => proofInputRef.current?.click()}
                  >
                    {proofPreview
                      ? <img src={proofPreview} alt="proof" className="ck-proof-preview" />
                      : <span>Click to upload screenshot</span>
                    }
                  </div>
                  <input
                    ref={proofInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProofImage}
                    hidden
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        <button
          className={`ck-place-btn ${canPlaceOrder() ? "active" : "disabled"}`}
          onClick={handlePlaceOrder}
          disabled={!canPlaceOrder() || placing}
        >
          {placing ? "Placing Order…" : "Place Order"}
        </button>
      </div>

      {/* ── QR Modal ── */}
      {paymentMethod === "Online Payment" && paymentStep === "qr" && (
        <div className="ck-overlay">
          <div className="ck-qr-modal ck-animate-in">
            <div className="ck-qr-header">
              <h3 className="ck-qr-title">Scan to Pay</h3>
              <p className="ck-qr-amount">{formatPrice(total)}</p>
            </div>
            <div className="ck-qr-box">
              <img src={QR} alt="QR Code" className="ck-qr-image" />
            </div>
            <p className="ck-qr-hint">
              Open your {eWallet === "gcash" ? "GCash" : "Maya"} app and scan the QR code above to complete payment.
            </p>
            <div className="ck-qr-actions">
              <button className="ck-qr-back" onClick={() => { setPaymentStep("select"); setEWallet(""); }}>
                Change e-wallet
              </button>
              <button className="ck-qr-done" onClick={handleQRDone}>Done</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}