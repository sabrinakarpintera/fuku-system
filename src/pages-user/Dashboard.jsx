import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./style/Shop.css";
import logoImage from "../assets/fuku-logo.png";

const API = "http://fuku-system.rf.gd/api/";

// ── Price formatter: ₱0,000.00 ───────────────────────────────────────────────
const formatPrice = (amount) =>
  "₱" + Number(amount).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ── Helpers ──────────────────────────────────────────────────────────────────

function StarDisplay({ rating, size = "sm" }) {
  return (
    <span className={`star-display star-display--${size}`} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= Math.round(rating) ? "star-on" : "star-off"}>★</span>
      ))}
    </span>
  );
}

function RatingBar({ star, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="rating-bar-row">
      <span className="rating-bar-label">{star}★</span>
      <div className="rating-bar-track">
        <div className="rating-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="rating-bar-count">{count}</span>
    </div>
  );
}

function ReviewSection({ productId }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(0);
  const PAGE_SIZE = 4;

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    setPage(0);
    fetch(`${API}/get_product_reviews.php?product_id=${productId}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [productId]);

  if (loading) return <div className="reviews-loading">Loading reviews…</div>;
  if (!data?.success || data.total_reviews === 0)
    return <div className="reviews-empty">No reviews yet. Be the first!</div>;

  const { average_rating, total_reviews, star_breakdown, reviews } = data;
  const totalPages = Math.ceil(reviews.length / PAGE_SIZE);
  const visible    = reviews.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const formatDate = (str) =>
    new Date(str).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="reviews-section">
      <div className="reviews-summary">
        <div className="reviews-avg-block">
          <span className="reviews-avg-num">{average_rating.toFixed(1)}</span>
          <StarDisplay rating={average_rating} size="md" />
          <span className="reviews-avg-total">{total_reviews} review{total_reviews !== 1 ? "s" : ""}</span>
        </div>
        <div className="reviews-bars">
          {[5, 4, 3, 2, 1].map((s) => (
            <RatingBar key={s} star={s} count={star_breakdown[s] ?? 0} total={total_reviews} />
          ))}
        </div>
      </div>
      <div className="reviews-list">
        {visible.map((r) => (
          <div key={r.id} className="review-card">
            <div className="review-card-top">
              <div className="review-avatar" aria-hidden="true">{r.user_name.charAt(0)}</div>
              <div className="review-card-meta">
                <span className="review-user">{r.user_name}</span>
                <span className="review-variant">{[r.color, r.size].filter(Boolean).join(" · ")}</span>
              </div>
              <div className="review-card-right">
                <StarDisplay rating={r.rating} size="sm" />
                <span className="review-date">{formatDate(r.created_at)}</span>
              </div>
            </div>
            {r.comment && <p className="review-comment">{r.comment}</p>}
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="reviews-pagination">
          <button className="rv-pg-btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            ‹ Prev
          </button>
          <span className="rv-pg-info">{page + 1} / {totalPages}</span>
          <button className="rv-pg-btn" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}

// ── Stock badge ───────────────────────────────────────────────────────────────

function StockBadge({ stock }) {
  if (stock === null)
    return <span className="modal-stock modal-stock--neutral">Select size &amp; color to see stock</span>;
  if (stock === 0)
    return <span className="modal-stock modal-stock--soldout">Sold Out</span>;
  if (stock <= 10)
    return <span className="modal-stock modal-stock--low">Only {stock} left!</span>;
  return <span className="modal-stock modal-stock--ok">{stock} in stock</span>;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize,    setSelectedSize]    = useState("");
  const [selectedColor,   setSelectedColor]   = useState("");
  const [quantity,        setQuantity]        = useState(1);
  const [menuOpen,        setMenuOpen]        = useState(false);
  const [products,        setProducts]        = useState([]);
  const [search,          setSearch]          = useState("");
  const [category,        setCategory]        = useState("ALL");
  const [filterOpen,      setFilterOpen]      = useState(false);
  const [filterSize,      setFilterSize]      = useState("");
  const [filterColor,     setFilterColor]     = useState("");
  const [minPrice,        setMinPrice]        = useState("");
  const [maxPrice,        setMaxPrice]        = useState("");
  const [toasts,          setToasts]          = useState([]);
  const [activeTab,       setActiveTab]       = useState("details");

  const navigate       = useNavigate();
  const modalRef       = useRef(null);
  const closeModalBtnRef = useRef(null);
  const triggerRef     = useRef(null);
  const profileBtnRef  = useRef(null);
  const menuRef        = useRef(null);

  // ── Derive variant stock from selected size + color ──────────────────────
  const variantStock = (() => {
    if (!selectedProduct || !selectedSize || !selectedColor) return null;
    const v = selectedProduct.variants?.find(
      (v) => v.size === selectedSize && v.color === selectedColor
    );
    return v ? v.quantity : 0;
  })();

  // ── Which sizes/colors are available (have stock > 0) ────────────────────
  const availableSizes = (selectedProduct?.variants ?? [])
    .filter((v) => !selectedColor || v.color === selectedColor)
    .filter((v) => v.quantity > 0)
    .map((v) => v.size);

  const availableColors = (selectedProduct?.variants ?? [])
    .filter((v) => !selectedSize || v.size === selectedSize)
    .filter((v) => v.quantity > 0)
    .map((v) => v.color);

  // ── Session / auth ────────────────────────────────────────────────────────
  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) { navigate("/", { replace: true }); return; }
    fetch(`${API}/check_session.php`, { method: "GET", credentials: "include" })
      .then((res) => {
        if (res.status === 401) { localStorage.removeItem("user"); navigate("/", { replace: true }); return null; }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        if (!data.loggedIn) { localStorage.removeItem("user"); navigate("/", { replace: true }); }
      })
      .catch((err) => console.error("Session check failed:", err));
  }, [navigate]);

  // ── Fetch products ────────────────────────────────────────────────────────
  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) return;
    fetch(`${API}/get_products.php`, { credentials: "include" })
      .then((res) => {
        if (res.status === 401) { localStorage.removeItem("user"); navigate("/", { replace: true }); return null; }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        const parsed = data.map((p) => ({
          ...p,
          sizes:    typeof p.sizes    === "string" ? JSON.parse(p.sizes)    : (p.sizes    ?? []),
          colors:   typeof p.colors   === "string" ? JSON.parse(p.colors)   : (p.colors   ?? []),
          variants: typeof p.variants === "string" ? JSON.parse(p.variants) : (p.variants ?? []),
        }));
        setProducts(parsed);
      })
      .catch((err) => console.error("Fetch products error:", err));
  }, [navigate]);

  const showToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const handleLogout = async () => {
    try { await fetch(`${API}/logout.php`, { method: "POST", credentials: "include" }); }
    catch (err) { console.error("Logout failed:", err); }
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  const addToCart = async () => {
    const user = localStorage.getItem("user");
    if (!user) { navigate("/", { replace: true }); return; }
    try {
      const res = await fetch(`${API}/add_to_cart.php`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          product_id: selectedProduct.id,
          size:       selectedSize,
          color:      selectedColor,
          quantity,
        }),
      });
      if (res.status === 401) { localStorage.removeItem("user"); navigate("/", { replace: true }); return; }
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        showToast(data.message || "Item added to cart!", "success");
        closeModal();
      } catch {
        showToast("Something went wrong. Please try again.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Server error.", "error");
    }
  };

  const openModal = (product, buttonEl) => {
    triggerRef.current = buttonEl;
    setSelectedProduct(product);
    setQuantity(1);
    setSelectedSize("");
    setSelectedColor("");
    setActiveTab("details");
  };

  const closeModal = useCallback(() => {
    setSelectedProduct(null);
    setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (selectedProduct) setTimeout(() => closeModalBtnRef.current?.focus(), 0);
  }, [selectedProduct]);

  // Reset quantity when variant changes
  useEffect(() => {
    setQuantity(1);
  }, [selectedSize, selectedColor]);

  const handleModalKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") { closeModal(); return; }
      if (e.key !== "Tab") return;
      const focusable = modalRef.current?.querySelectorAll(
        'button:not([disabled]), input, [tabindex="0"]'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    },
    [closeModal]
  );

  const handleMenuBlur = (e) => {
    if (!menuRef.current?.contains(e.relatedTarget)) setMenuOpen(false);
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const getTotalStock = (product) =>
    (product.variants ?? []).reduce((sum, v) => sum + v.quantity, 0);

  const filteredProducts = products.filter((product) => {
    const matchSearch   = product.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "ALL" || product.category === category;
    const matchSize     = !filterSize  || product.sizes?.includes(filterSize);
    const matchColor    = !filterColor || product.colors?.includes(filterColor);
    const matchPrice    =
      (!minPrice || product.price >= minPrice) &&
      (!maxPrice || product.price <= maxPrice);
    return matchSearch && matchCategory && matchSize && matchColor && matchPrice;
  });

  const canAddToCart = selectedSize && selectedColor && variantStock > 0;

  return (
    <>
      {/* ── Toasts ── */}
      <div className="toast-container" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`} role="alert">
            <span className="toast-icon material-symbols-outlined" aria-hidden="true">
              {toast.type === "success" ? "check_circle" : "error"}
            </span>
            <span className="toast-message">{toast.message}</span>
            <button
              className="toast-close"
              aria-label="Dismiss notification"
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            >✕</button>
          </div>
        ))}
      </div>

      <div className="page-wrapper">
        <div className="shop-container">

          {/* ── Header ── */}
          <div className="shop-header">
            <div className="profile-wrapper" ref={menuRef} onBlur={handleMenuBlur}>
              <button
                ref={profileBtnRef}
                className="profile-icon"
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
                onKeyDown={(e) => { if (e.key === "Escape") setMenuOpen(false); }}
              >
                <span className="material-symbols-outlined" aria-hidden="true">account_circle</span>
              </button>
              {menuOpen && (
                <div className="menu" role="menu" aria-label="Account options">
                  {[
                    { label: "Home",   action: () => navigate("/dashboard") },
                    { label: "Orders", action: () => navigate("/ordermanagement") },
                    { label: "Log Out",action: handleLogout },
                  ].map(({ label, action }) => (
                    <button
                      key={label}
                      role="menuitem"
                      className="menu-item"
                      onClick={() => { action(); setMenuOpen(false); }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") { setMenuOpen(false); profileBtnRef.current?.focus(); }
                      }}
                    >{label}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="logo">
              <img src={logoImage} alt="Fuku — home" />
            </div>

            <button className="cart-icon" aria-label="View shopping cart" onClick={() => navigate("/mycart")}>
              <span className="material-symbols-outlined" aria-hidden="true">shopping_cart</span>
            </button>
          </div>

          {/* ── Search / Filter ── */}
          <div className="browse">
            <div className="search-row">
              <div className="search-bar">
                <label htmlFor="product-search" className="sr-only">Search products</label>
                <input
                  id="product-search"
                  type="search"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button
                className="filter-group"
                aria-label="Toggle filters"
                aria-expanded={filterOpen}
                aria-controls="filter-panel"
                onClick={() => setFilterOpen((o) => !o)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">filter_list</span>
              </button>
            </div>

            {filterOpen && (
              <div id="filter-panel" className="filter" role="group" aria-label="Filters">
                <label htmlFor="filter-size">Size</label>
                <input id="filter-size" value={filterSize} onChange={(e) => setFilterSize(e.target.value)} />
                <label htmlFor="filter-color">Color</label>
                <input id="filter-color" value={filterColor} onChange={(e) => setFilterColor(e.target.value)} />
                <label htmlFor="filter-min-price">Min price</label>
                <input id="filter-min-price" type="number" placeholder="min" onChange={(e) => setMinPrice(e.target.value)} />
                <span aria-hidden="true">—</span>
                <label htmlFor="filter-max-price">Max price</label>
                <input id="filter-max-price" type="number" placeholder="max" onChange={(e) => setMaxPrice(e.target.value)} />
              </div>
            )}

            <div className="category" role="group" aria-label="Filter by category">
              {["ALL", "MEN", "WOMEN", "KIDS"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  aria-pressed={category === cat}
                >
                  {cat === "ALL" ? "All" : cat.charAt(0) + cat.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* ── Product Grid ── */}
          <div className="products" role="list" aria-label="Products">
            {filteredProducts.length === 0 ? (
              <p style={{ textAlign: "center" }}>No products yet.</p>
            ) : (
              filteredProducts.map((product) => {
                const totalStock = getTotalStock(product);
                return (
                  <div className="product-card" key={product.id} role="listitem">
                    <div
                      className="product-image-wrapper"
                      tabIndex={0}
                      role="button"
                      aria-label={`${product.name}, ${formatPrice(product.price)} — press Enter to view`}
                      onClick={(e) => openModal(product, e.currentTarget)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(product, e.currentTarget); }
                      }}
                    >
                      <img src={`${API}/${product.image}`} alt="" />
                      {totalStock === 0 && (
                        <div className="card-soldout-overlay" aria-hidden="true">Sold Out</div>
                      )}
                      <button
                        className="add-to-cart-btn"
                        tabIndex={0}
                        aria-label={`Add ${product.name} to cart`}
                        onClick={(e) => { e.stopPropagation(); openModal(product, e.currentTarget); }}
                      >
                        {totalStock === 0 ? "View Item" : "Add to Cart"}
                      </button>
                    </div>
                    <div className="product-info">
                      <h4>{product.name}</h4>
                      {/* ── Fixed: consistent ₱0,000.00 price format ── */}
                      <p aria-label={`Price: ${formatPrice(product.price)}`}>{formatPrice(product.price)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <footer className="footer">
          <p>© 2026 Fuku. All rights reserved.</p>
        </footer>
      </div>

      {/* ── Product Modal ── */}
      {selectedProduct && (
        <div
          className="modal_overlay"
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            className="modal1"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedProduct.name} — details`}
            ref={modalRef}
            onKeyDown={handleModalKeyDown}
          >
            <button ref={closeModalBtnRef} className="close-btn" aria-label="Close dialog" onClick={closeModal}>
              ✕
            </button>

            <div className="modal_content">
              {/* ── Left: image + stock ── */}
              <div className="modal_product">
                <div className="modal_image_box">
                  <img src={`${API}/${selectedProduct.image}`} alt={selectedProduct.name} />
                </div>

                <StockBadge stock={variantStock} />

                <h2>{selectedProduct.name}</h2>
                {/* ── Fixed: consistent ₱0,000.00 price format ── */}
                <p className="price" aria-label={`Price: ${formatPrice(selectedProduct.price)}`}>
                  {formatPrice(selectedProduct.price)}
                </p>
              </div>

              {/* ── Right: tabbed panel ── */}
              <div className="modal_details">
                <div className="modal-tabs" role="tablist">
                  <button
                    role="tab"
                    aria-selected={activeTab === "details"}
                    className={`modal-tab ${activeTab === "details" ? "modal-tab--active" : ""}`}
                    onClick={() => setActiveTab("details")}
                  >Details</button>
                  <button
                    role="tab"
                    aria-selected={activeTab === "reviews"}
                    className={`modal-tab ${activeTab === "reviews" ? "modal-tab--active" : ""}`}
                    onClick={() => setActiveTab("reviews")}
                  >Reviews</button>
                </div>

                {activeTab === "details" && (
                  <>
                    <label className="modal_label">Description</label>
                    <div className="modal_description">{selectedProduct.description}</div>

                    <fieldset className="pill-fieldset">
                      <legend className="modal_label">Size</legend>
                      <div className="pill-group" role="group">
                        {selectedProduct.sizes?.map((size) => {
                          const hasStock = availableSizes.includes(size);
                          return (
                            <button
                              key={size}
                              className={`pill ${selectedSize === size ? "pill-active" : ""} ${!hasStock ? "pill-disabled" : ""}`}
                              aria-pressed={selectedSize === size}
                              aria-disabled={!hasStock}
                              disabled={!hasStock}
                              onClick={() => {
                                setSelectedSize(size);
                                if (selectedColor) {
                                  const valid = selectedProduct.variants?.find(
                                    (v) => v.size === size && v.color === selectedColor && v.quantity > 0
                                  );
                                  if (!valid) setSelectedColor("");
                                }
                              }}
                            >{size}</button>
                          );
                        })}
                      </div>
                    </fieldset>

                    <fieldset className="pill-fieldset">
                      <legend className="modal_label">Color</legend>
                      <div className="pill-group" role="group">
                        {selectedProduct.colors?.map((color) => {
                          const hasStock = availableColors.includes(color);
                          return (
                            <button
                              key={color}
                              className={`pill ${selectedColor === color ? "pill-active" : ""} ${!hasStock ? "pill-disabled" : ""}`}
                              aria-pressed={selectedColor === color}
                              aria-disabled={!hasStock}
                              disabled={!hasStock}
                              onClick={() => {
                                setSelectedColor(color);
                                if (selectedSize) {
                                  const valid = selectedProduct.variants?.find(
                                    (v) => v.color === color && v.size === selectedSize && v.quantity > 0
                                  );
                                  if (!valid) setSelectedSize("");
                                }
                              }}
                            >{color}</button>
                          );
                        })}
                      </div>
                    </fieldset>

                    <label className="modal_label" htmlFor="modal-quantity">Quantity</label>
                    <div className="pill-group">
                      <div className="quantity1">
                        <input
                          id="modal-quantity"
                          type="number"
                          value={quantity}
                          min="1"
                          max={variantStock ?? 1}
                          disabled={!variantStock}
                          aria-label={`Quantity${variantStock ? `, max ${variantStock}` : " — select size and color first"}`}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            const max = variantStock ?? 1;
                            if (v < 1) setQuantity(1);
                            else if (v > max) setQuantity(max);
                            else setQuantity(v);
                          }}
                        />
                      </div>
                    </div>

                    <div className="modal-actions">
                      <button
                        className="confirm-add"
                        onClick={addToCart}
                        disabled={!canAddToCart}
                        aria-disabled={!canAddToCart}
                      >
                        Add to Cart
                      </button>
                      <button
                        className="buy-now-btn"
                        disabled={!canAddToCart}
                        aria-disabled={!canAddToCart}
                        onClick={() => {
                          if (!canAddToCart) return;
                          // ── Fixed: pass image path so Checkout can render the image ──
                          navigate("/checkout", {
                            state: {
                              items: [{
                                product_id: selectedProduct.id,
                                name:       selectedProduct.name,
                                // Pass the raw image path (e.g. "uploads/img.jpg")
                                // Checkout's imgSrc() helper will build the full URL
                                image:      selectedProduct.image,
                                price:      selectedProduct.price,
                                size:       selectedSize,
                                color:      selectedColor,
                                quantity,
                              }],
                            },
                          });
                        }}
                      >
                        Buy Now
                      </button>
                    </div>
                  </>
                )}

                {activeTab === "reviews" && (
                  <ReviewSection productId={selectedProduct.id} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
