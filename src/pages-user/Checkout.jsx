import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import "./style/Checkout.css";
import QR from "../assets/qrcode.jpg";
import gcash from "../assets/gcash.png";
import maya from "../assets/maya.png";

const GCASH_QR  = "../assets/qrcode.jpg";
const MAYA_QR   = "../assets/qrcode.jpg";

export default function Checkout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const ids       = location.state?.ids || [];

  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);

  const [paymentMethod, setPaymentMethod] = useState(""); 
  const [eWallet,       setEWallet]       = useState("");  
  const [paymentStep,   setPaymentStep]   = useState("select"); 

  const [refNumber,   setRefNumber]   = useState("");
  const [senderName,  setSenderName]  = useState("");
  const [proofImage,  setProofImage]  = useState(null);
  const [proofPreview,setProofPreview]= useState("");
  const [placing,     setPlacing]     = useState(false);

  const proofInputRef = useRef();

  useEffect(() => {
    if (ids.length === 0) {
      alert("No items selected");
      navigate("/mycart");
      return;
    }

    fetch("http://localhost/Fuku/src/api/checkout.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ids }),
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
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

  const handleSelectWallet = (wallet) => {
    setEWallet(wallet);
    setPaymentStep("qr");
  };

  const handleQRDone = () => setPaymentStep("proof");

  const handleProofImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProofImage(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const canPlaceOrder = () => {
    if (!paymentMethod) return false;
    if (paymentMethod === "cod") return true;
    if (paymentMethod === "online") {
      return paymentStep === "proof" && refNumber.trim() && senderName.trim() && proofImage;
    }
    return false;
  };

  const handlePlaceOrder = async () => {
  if (!canPlaceOrder()) return;

  setPlacing(true);

  const formData = new FormData();

  formData.append("user_id", localStorage.getItem("user_id"));
  
  formData.append("ids", JSON.stringify(ids));
  formData.append("payment_method", paymentMethod);

  if (paymentMethod === "online") {
    formData.append("e_wallet", eWallet);
    formData.append("ref_number", refNumber);
    formData.append("sender_name", senderName);
    formData.append("proof", proofImage);
  }

  try {
    const res = await fetch("http://localhost/Fuku/src/api/place_order.php", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const text = await res.text();

    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      console.error("Invalid JSON from PHP:", text);
      alert("Server error. Please check PHP logs.");
      return;
    }

    if (result.success) {
      alert(result.message || "Order placed successfully!");
    } else {
      alert(result.message || "Failed to place order.");
    }

  } catch (err) {
    console.error(err);
    alert("Something went wrong. Please try again.");
  } finally {
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
  const subtotal = items.reduce((t, i) => t + i.price * i.quantity, 0);

  return (
    <div className="ck-page">
      <a href="/mycart" className="back-btn" aria-label="Back to dashboard">
            <span className="material-symbols-outlined">arrow_back</span>
          </a>
      <div className="ck-container">

        <h1 className="ck-title">Checkout</h1>

        <section className="ck-card">
          <div className="ck-card-header">
            <div className="ck-card-label">Delivery Details</div>
            <button className="ck-edit-btn" onClick={() => navigate("/myaccount")}>Edit</button>
          </div>
          <div className="ck-address-block">
            <p className="ck-addr-name">{user?.name || "—"}</p>
            <p className="ck-addr-line">{user?.phone || "—"}</p>
            <p className="ck-addr-line">{user?.address || "—"}</p>
          </div>
        </section>

        <section className="ck-card">
          <div className="ck-card-label"> Order Items</div>
          <div className="ck-items">
            {items.map(item => (
              <div className="ck-item" key={item.id}>
                <img
                  className="ck-item-img"
                  src={`http://localhost/Fuku/src/api/${item.image}`}
                  alt={item.name}
                />
                <div className="ck-item-info">
                  <p className="ck-item-name">{item.name}</p>
                  <p className="ck-item-meta">Color: {item.color} · Size: {item.size}</p>
                </div>
                <div className="ck-item-qty">×{item.quantity}</div>
                <div className="ck-item-price">
                  ₱{(item.price * item.quantity).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="ck-card">
          <div className="ck-card-label">Order Summary</div>
          <div className="ck-summary">
            <div className="ck-row"><span>Subtotal</span><span>₱{subtotal.toFixed(2)}</span></div>
            <div className="ck-row"><span>Shipping</span>₱0.00</div>
            <div className="ck-row ck-total"><span>Total</span><span>₱{subtotal.toFixed(2)}</span></div>
          </div>
        </section>

        <section className="ck-card">
          <div className="ck-card-label"> Payment Method
          </div>

          <div className="ck-payment-options">

            <button
              className={`ck-pay-card ${paymentMethod === "online" ? "selected" : ""}`}
              onClick={() => handlePaymentMethod("online")}
              type="button"
            >

              <div className="ck-pay-text">
                <span className="ck-pay-title">Online Payment</span>
                <span className="ck-pay-sub">GCash · Maya</span>
              </div>
              <span className="ck-pay-radio">{paymentMethod === "online" ? "●" : "○"}</span>
            </button>

            <button
              className={`ck-pay-card ${paymentMethod === "cod" ? "selected" : ""}`}
              onClick={() => handlePaymentMethod("cod")}
              type="button"
            >

              <div className="ck-pay-text">
                <span className="ck-pay-title">Cash on Delivery</span>
                <span className="ck-pay-sub">Pay when it arrives</span>
              </div>
              <span className="ck-pay-radio">{paymentMethod === "cod" ? "●" : "○"}</span>
            </button>

          </div>

          {paymentMethod === "online" && paymentStep === "select" && (
            <div className="ck-wallet-section ck-animate-in">
              <p className="ck-wallet-label">Choose your e-wallet</p>
              <div className="ck-wallet-options">

                <button
                  className="ck-wallet-card gcash"
                  onClick={() => handleSelectWallet("gcash")}
                  type="button"
                >
                  <img src={gcash} alt="GCash" className="ck-wallet-logo" />
                </button>

                <button
                  className="ck-wallet-card maya"
                  onClick={() => handleSelectWallet("maya")}
                  type="button"
                >
                  <img src={maya} alt="Maya" className="ck-wallet-logo" />
                </button>

              </div>
            </div>
          )}

          {paymentMethod === "online" && paymentStep === "proof" && (
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
                      : <>
                          <span>Click to upload screenshot</span>
                        </>
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

      {paymentMethod === "online" && paymentStep === "qr" && (
        <div className="ck-overlay" onClick={() => {}}>
          <div className="ck-qr-modal ck-animate-in">

            <div className="ck-qr-header">
              <h3 className="ck-qr-title">Scan to Pay</h3>
              <p className="ck-qr-amount">
                ₱{subtotal.toFixed(2)}
              </p>
            </div>

            <div className="ck-qr-box">
              <img src={QR} alt="QR Code" className="ck-qr-image" />
            </div>

            <p className="ck-qr-hint">
              Open your {eWallet === "gcash" ? "GCash" : "Maya"} app and scan the QR code above to complete payment.
            </p>

            <div className="ck-qr-actions">
              <button className="ck-qr-back" onClick={() => { setPaymentStep("select"); setEWallet(""); }}>
                Change ewallet
              </button>
              <button className="ck-qr-done" onClick={handleQRDone}>
                Done 
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}