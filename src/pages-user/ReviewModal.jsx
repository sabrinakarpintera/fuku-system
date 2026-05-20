import { useState } from "react";
import "./style/ReviewModal.css";

const BASE_URL = "http://localhost/Fuku/src/api/";

function resolveImage(raw) {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  return BASE_URL + raw.replace(/^\/+/, "");
}

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="star-row">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          className={`star-btn ${n <= (hovered || value) ? "star-filled" : "star-empty"}`}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >★</button>
      ))}
      <span className="star-label">
        {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][hovered || value] || "Select rating"}
      </span>
    </div>
  );
}


export default function ReviewModal({ order, onClose, onSubmitted }) {
  const userId = localStorage.getItem("user_id");

  const [reviews, setReviews]   = useState(() =>
    Object.fromEntries(order.items.map((_, i) => [i, { rating: 0, comment: "" }]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState("");

  const setField = (idx, field, val) =>
    setReviews(prev => ({ ...prev, [idx]: { ...prev[idx], [field]: val } }));

  const allRated = order.items.every((_, i) => reviews[i].rating > 0);

  const handleSubmit = async () => {
    if (!allRated) { setError("Please rate all items before submitting."); return; }
    setError("");
    setSubmitting(true);

   
    const payload = {
      order_id: order.db_id ?? order.id,   
      user_id:  userId,
      reviews:  order.items.map((item, i) => ({
        product_name: item.name,           
        rating:       reviews[i].rating,
        comment:      reviews[i].comment.trim(),
        color:        item.color,
        size:         item.size,
      })),
    };

    try {
      const res  = await fetch(`${BASE_URL}submit_review.php`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setSubmitted(true);
        setTimeout(() => onSubmitted(order.id), 1800);
      } else {
        setError(data.message || "Failed to submit review.");
        setSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="rv-overlay" onClick={onClose}>
      <div className="rv-modal" onClick={e => e.stopPropagation()}>

        <div className="rv-header">
          <div className="rv-header-left">
            <span className="rv-icon">⭐</span>
            <div>
              <h2 className="rv-title">Write a Review</h2>
              <p className="rv-sub">Order {order.id} · {order.date}</p>
            </div>
          </div>
          <button className="rv-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {submitted ? (
          <div className="rv-success">
            <div className="rv-success-icon">🎉</div>
            <h3>Review Submitted!</h3>
            <p>Thank you for sharing your feedback.</p>
          </div>
        ) : (
          <>
            <p className="rv-intro">
              Rate each item you received. Your feedback helps other shoppers!
            </p>

            <div className="rv-items">
              {order.items.map((item, i) => {
                const src = resolveImage(item.image);
                return (
                  <div key={i} className="rv-item">
                    <div className="rv-item-top">
                      {src
                        ? <img src={src} alt={item.name} className="rv-item-img"
                            onError={e => { e.currentTarget.style.display = "none"; }} />
                        : <div className="rv-img-placeholder" />
                      }
                      <div className="rv-item-meta">
                        <p className="rv-item-name">{item.name}</p>
                        <p className="rv-item-sub">
                          Color: {item.color} · Size: {item.size} · x{item.qty}
                        </p>
                        <StarRating
                          value={reviews[i].rating}
                          onChange={val => setField(i, "rating", val)}
                        />
                      </div>
                    </div>
                    <textarea
                      className="rv-textarea"
                      placeholder="Share your thoughts about this item… (optional)"
                      rows={3}
                      maxLength={500}
                      value={reviews[i].comment}
                      onChange={e => setField(i, "comment", e.target.value)}
                    />
                    <p className="rv-char-count">{reviews[i].comment.length}/500</p>
                  </div>
                );
              })}
            </div>

            {error && <p className="rv-error">{error}</p>}

            <div className="rv-footer">
              <button className="rv-btn-cancel" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button
                className={`rv-btn-submit ${allRated ? "enabled" : "disabled"}`}
                onClick={handleSubmit}
                disabled={!allRated || submitting}
              >
                {submitting ? "Submitting…" : "Submit Review"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}