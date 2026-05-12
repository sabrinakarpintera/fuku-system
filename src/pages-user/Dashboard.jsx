import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./style/Shop.css";
import logoImage from "../assets/fuku-logo.png";

export default function Dashboard() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSize, setFilterSize] = useState("");
  const [filterColor, setFilterColor] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [toasts, setToasts] = useState([]);

  const navigate = useNavigate();

  const modalRef = useRef(null);
  const closeModalBtnRef = useRef(null);
  const triggerRef = useRef(null); 
  const profileBtnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) { navigate("/", { replace: true }); return; }

    fetch("http://localhost/Fuku/src/api/check_session.php", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => {
        if (res.status === 401) {
          localStorage.removeItem("user");
          navigate("/", { replace: true });
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        if (!data.loggedIn) {
          localStorage.removeItem("user");
          navigate("/", { replace: true });
        }
      })
      .catch((error) => console.error("Session check failed:", error));
  }, [navigate]);

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) return;

    fetch("http://localhost/Fuku/src/api/get_products.php", { credentials: "include" })
      .then((res) => {
        if (res.status === 401) {
          localStorage.removeItem("user");
          navigate("/", { replace: true });
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        const parsed = data.map((p) => ({
          ...p,
          sizes:  typeof p.sizes  === "string" ? JSON.parse(p.sizes)  : p.sizes,
          colors: typeof p.colors === "string" ? JSON.parse(p.colors) : p.colors,
        }));
        setProducts(parsed);
      })
      .catch((error) => console.error("Fetch products error:", error));
  }, [navigate]);

  const showToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const handleLogout = async () => {
    try {
      await fetch("http://localhost/Fuku/src/api/logout.php", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout failed:", error);
    }
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  const addToCart = async () => {
    const user = localStorage.getItem("user");
    if (!user) { navigate("/", { replace: true }); return; }

    try {
      const res = await fetch("http://localhost/Fuku/src/api/add_to_cart.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          product_id: selectedProduct.id,
          size: selectedSize,
          color: selectedColor,
          quantity,
        }),
      });

      if (res.status === 401) {
        localStorage.removeItem("user");
        navigate("/", { replace: true });
        return;
      }

      const text = await res.text();
      console.log("RAW RESPONSE:", text);

      try {
        const data = JSON.parse(text);
        showToast(data.message || "Item added to cart!", "success");
        closeModal();
      } catch {
        showToast("Something went wrong. Please try again.", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Server error.", "error");
    }
  };

  const openModal = (product, buttonEl) => {
    triggerRef.current = buttonEl;
    setSelectedProduct(product);
    setQuantity(1);
    setSelectedSize("");
    setSelectedColor("");
  };

  const closeModal = useCallback(() => {
    setSelectedProduct(null);
    setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      setTimeout(() => closeModalBtnRef.current?.focus(), 0);
    }
  }, [selectedProduct]);

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

  const onKeyActivate = (handler) => (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handler(e); }
  };

  const filteredProducts = products.filter((product) => {
    const matchSearch    = product.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory  = category === "ALL" || product.category === category;
    const matchSize      = !filterSize  || product.sizes?.includes(filterSize);
    const matchColor     = !filterColor || product.colors?.includes(filterColor);
    const matchPrice     =
      (!minPrice || product.price >= minPrice) &&
      (!maxPrice || product.price <= maxPrice);
    return matchSearch && matchCategory && matchSize && matchColor && matchPrice;
  });

  return (
    <>
      <div
        className="toast-container"
        role="region"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type}`}
            role="alert"
          >
            <span className="toast-icon material-symbols-outlined" aria-hidden="true">
              {toast.type === "success" ? "check_circle" : "error"}
            </span>
            <span className="toast-message">{toast.message}</span>
            <button
              className="toast-close"
              aria-label="Dismiss notification"
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="page-wrapper">
        <div className="shop-container">

          <div className="shop-header">

            <div
              className="profile-wrapper"
              ref={menuRef}
              onBlur={handleMenuBlur}
            >
              <button
                ref={profileBtnRef}
                className="profile-icon"
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setMenuOpen(false);
                }}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  account_circle
                </span>
              </button>

              {menuOpen && (
                <div
                  className="menu"
                  role="menu"
                  aria-label="Account options"
                >
                  {[
                    { label: "Home",     action: () => navigate("/dashboard") },
                    { label: "Orders",   action: () => navigate("/ordermanagement") },
                    { label: "Settings", action: () => navigate("/myaccount") },
                    { label: "Log Out",  action: handleLogout },
                  ].map(({ label, action }) => (
                    <button
                      key={label}
                      role="menuitem"
                      className="menu-item"
                      onClick={() => { action(); setMenuOpen(false); }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setMenuOpen(false);
                          profileBtnRef.current?.focus();
                        }
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="logo">
              <img src={logoImage} alt="Fuku — home" />
            </div>

            <button
              className="cart-icon"
              aria-label="View shopping cart"
              onClick={() => navigate("/mycart")}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                shopping_cart
              </span>
            </button>
          </div>

          <div className="browse">
            <div className="search-row">
              <div className="search-bar">
                <label htmlFor="product-search" className="sr-only">
                  Search products
                </label>
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
                <span className="material-symbols-outlined" aria-hidden="true">
                  filter_list
                </span>
              </button>
            </div>

            {filterOpen && (
              <div id="filter-panel" className="filter" role="group" aria-label="Filters">
                <label htmlFor="filter-size">Size</label>
                <input
                  id="filter-size"
                  value={filterSize}
                  onChange={(e) => setFilterSize(e.target.value)}
                />

                <label htmlFor="filter-color">Color</label>
                <input
                  id="filter-color"
                  value={filterColor}
                  onChange={(e) => setFilterColor(e.target.value)}
                />

                <label htmlFor="filter-min-price">Min price</label>
                <input
                  id="filter-min-price"
                  type="number"
                  placeholder="min"
                  onChange={(e) => setMinPrice(e.target.value)}
                />

                <span aria-hidden="true">—</span>

                <label htmlFor="filter-max-price">Max price</label>
                <input
                  id="filter-max-price"
                  type="number"
                  placeholder="max"
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            )}

            <div
              className="category"
              role="group"
              aria-label="Filter by category"
            >
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

       
<div className="products" role="list" aria-label="Products">
  {filteredProducts.length === 0 ? (
    <p style={{ textAlign: "center" }}>No products yet.</p>
  ) : (
    filteredProducts.map((product) => (
      <div
        className="product-card"
        key={product.id}
        role="listitem"
      >
        
        <div
          className="product-image-wrapper"
          tabIndex={0}
          role="button"
          aria-label={`${product.name}, ₱${product.price} — press Enter to add to cart`}
          onClick={(e) => openModal(product, e.currentTarget)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openModal(product, e.currentTarget);
            }
          }}
        >
          <img
            src={`http://localhost/Fuku/src/api/${product.image}`}
            alt=""         
          />

          
          <button
            className="add-to-cart-btn"
            tabIndex={0}
            aria-label={`Add ${product.name} to cart`}
            onClick={(e) => {
              e.stopPropagation(); 
              openModal(product, e.currentTarget);
            }}
          >
            Add to Cart
          </button>
        </div>

        <div className="product-info">
          <h4>{product.name}</h4>
          <p aria-label={`Price: ₱${product.price}`}>₱{product.price}</p>
        </div>
      </div>
    ))
  )}
</div>
        </div>

        <footer className="footer">
          <p>© 2026 Fuku. All rights reserved.</p>
        </footer>
      </div>

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
            aria-label={`${selectedProduct.name} — add to cart`}
            ref={modalRef}
            onKeyDown={handleModalKeyDown}
          >
            <button
              ref={closeModalBtnRef}
              className="close-btn"
              aria-label="Close dialog"
              onClick={closeModal}
            >
              ✕
            </button>

            <div className="modal_content">
              <div className="modal_product">
                <div className="modal_image_box">
                  <img
                    src={`http://localhost/Fuku/src/api/${selectedProduct.image}`}
                    alt={selectedProduct.name}
                  />
                </div>
                <p className="modal_stocks">Stocks: {selectedProduct.quantity}</p>
                <h2>{selectedProduct.name}</h2>
                <p className="price" aria-label={`Price: ₱${selectedProduct.price}`}>
                  ₱{selectedProduct.price}
                </p>
              </div>

              <div className="modal_details">
                <label className="modal_label">Description</label>
                <div className="modal_description">{selectedProduct.description}</div>

                <fieldset className="pill-fieldset">
                  <legend className="modal_label">Size</legend>
                  <div className="pill-group" role="group">
                    {selectedProduct.sizes?.map((size, index) => (
                      <button
                        key={index}
                        className={`pill ${selectedSize === size ? "pill-active" : ""}`}
                        aria-pressed={selectedSize === size}
                        onClick={() => setSelectedSize(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="pill-fieldset">
                  <legend className="modal_label">Color</legend>
                  <div className="pill-group" role="group">
                    {selectedProduct.colors?.map((color, index) => (
                      <button
                        key={index}
                        className={`pill ${selectedColor === color ? "pill-active" : ""}`}
                        aria-pressed={selectedColor === color}
                        onClick={() => setSelectedColor(color)}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <label className="modal_label" htmlFor="modal-quantity">
                  Quantity
                </label>
                <div className="pill-group">
                  <div className="quantity1">
                    <input
                      id="modal-quantity"
                      type="number"
                      value={quantity}
                      min="1"
                      max={selectedProduct.quantity}
                      aria-label={`Quantity, max ${selectedProduct.quantity}`}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (value < 1) setQuantity(1);
                        else if (value > selectedProduct.quantity) setQuantity(selectedProduct.quantity);
                        else setQuantity(value);
                      }}
                    />
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    className="confirm-add"
                    onClick={addToCart}
                    disabled={!selectedSize || !selectedColor}
                    aria-disabled={!selectedSize || !selectedColor}
                  >
                    Add to Cart
                  </button>
                  <button className="buy-now-btn">Buy Now</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}