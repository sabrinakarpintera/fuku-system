import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./style/ProductList.css";
import logoImage from "../assets/fuku-logo.png";

const Icon = ({ name }) => <span className="material-icons">{name}</span>;

const STATUS = (qty) => {
  if (qty === 0) return { label: "Sold Out", cls: "badge-soldout" };
  if (qty <= 10) return { label: "Low Stock", cls: "badge-low" };
  return { label: "In Stock", cls: "badge-instock" };
};

export default function ProductList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const currentPath = "/admin/productlist";

  const handleLogout = () => {
    localStorage.removeItem("token");
    sessionStorage.clear();
    navigate("/login");
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost/Fuku/src/api/ad_get_products.php");
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (id) => {
    setDetailLoading(true);
    setSelected(null);
    try {
      const res = await fetch(`http://localhost/Fuku/src/api/ad_get_product.php?id=${id}`);
      const data = await res.json();
      setSelected(data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => setSelected(null);

  const handleDelete = async (id) => {
    try {
      const res = await fetch("http://localhost/Fuku/src/api/delete_product.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setProducts(products.filter((p) => p.id !== id));
        setSelected(null);
        setDeleteConfirm(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const CATEGORIES = ["ALL", "MEN", "WOMEN", "KIDS"];

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "ALL" || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const navItems = [
    { label: "Home", icon: "home", path: "/admin/dashboard" },
    
    { label: "Product Listed", icon: "inventory_2", path: "/admin/productlist" },
    { label: "Order Details", icon: "receipt_long", path: "/admin/orderdetails" },
  ];

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

      <div className="pl-wrapper">
        <div className="pl-header">
          <div className="pl-title-block">
            <h1 className="pl-title">Products</h1>
            <span className="pl-count">{products.length} total</span>
          </div>
          <button className="pl-add-btn" onClick={() => navigate("/admin/addproduct")}>
            + Add Product
          </button>
        </div>

        <div className="pl-controls">
          <div className="pl-search-wrap">
            <span className="pl-search-icon">⌕</span>
            <input
              className="pl-search"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="pl-cats">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`pl-cat-btn ${categoryFilter === cat ? "active" : ""}`}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="pl-loading">
            <div className="pl-spinner" />
            <span>Loading products...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="pl-empty">
            <span className="pl-empty-icon">📦</span>
            <p>No products found.</p>
          </div>
        ) : (
          <div className="pl-grid">
            {filtered.map((p) => {
              const status = STATUS(Number(p.quantity));
              return (
                <div className="pl-card" key={p.id} onClick={() => openDetail(p.id)}>
                  <div className="pl-card-img-wrap">
                    <img
                      src={`http://localhost/Fuku/src/api/${p.image}`}
                      alt={p.name}
                      className="pl-card-img"
                    />
                    <span className={`pl-badge ${status.cls}`}>{status.label}</span>
                  </div>
                  <div className="pl-card-body">
                    <span className="pl-card-cat">{p.category}</span>
                    <h3 className="pl-card-name">{p.name}</h3>
                    <div className="pl-card-footer">
                      <span className="pl-card-price">₱{Number(p.price).toLocaleString()}</span>
                      <span className="pl-card-qty">Qty: {p.quantity}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(selected || detailLoading) && (
          <div className="pl-overlay" onClick={closeDetail}>
            <div className="pl-modal" onClick={(e) => e.stopPropagation()}>
              <button className="pl-modal-close" onClick={closeDetail}>✕</button>

              {detailLoading ? (
                <div className="pl-loading">
                  <div className="pl-spinner" />
                </div>
              ) : selected && (
                <>
                  <div className="pm-top">
                    <div className="pm-img-wrap">
                      <img
                        src={`http://localhost/Fuku/src/api/${selected.image}`}
                        alt={selected.name}
                        className="pm-img"
                      />
                    </div>
                    <div className="pm-info">
                      <div className="pm-meta">
                        <span className="pm-cat-badge">{selected.category}</span>
                        <span className={`pl-badge ${STATUS(Number(selected.quantity)).cls}`}>
                          {STATUS(Number(selected.quantity)).label}
                        </span>
                      </div>
                      <h2 className="pm-name">{selected.name}</h2>
                      <p className="pm-price">₱{Number(selected.price).toLocaleString()}</p>
                      <p className="pm-desc">{selected.description || "No description provided."}</p>

                      <div className="pm-tags-section">
                        <div className="pm-tag-group">
                          <span className="pm-tag-label">Sizes</span>
                          <div className="pm-tags">
                            {selected.sizes?.length > 0
                              ? selected.sizes.map((s, i) => <span className="pm-tag" key={i}>{s}</span>)
                              : <span className="pm-no-tag">None</span>}
                          </div>
                        </div>
                        <div className="pm-tag-group">
                          <span className="pm-tag-label">Colors</span>
                          <div className="pm-tags">
                            {selected.colors?.length > 0
                              ? selected.colors.map((c, i) => (
                                  <span className="pm-tag pm-color-tag" key={i}>
                                    <span
                                      className="pm-color-dot"
                                      style={{ background: c.toLowerCase() }}
                                    />
                                    {c}
                                  </span>
                                ))
                              : <span className="pm-no-tag">None</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pm-stats">
                    <div className="pm-stat">
                      <span className="pm-stat-label">Current Stock</span>
                      <span className="pm-stat-value">{selected.quantity}</span>
                    </div>
                    <div className="pm-stat">
                      <span className="pm-stat-label">Items Sold</span>
                      <span className="pm-stat-value">{selected.sold ?? 0}</span>
                    </div>
                    <div className="pm-stat">
                      <span className="pm-stat-label">Total Revenue</span>
                      <span className="pm-stat-value">
                        ₱{((selected.sold ?? 0) * Number(selected.price)).toLocaleString()}
                      </span>
                    </div>
                    <div className="pm-stat">
                      <span className="pm-stat-label">Status</span>
                      <span className={`pm-stat-status ${STATUS(Number(selected.quantity)).cls}`}>
                        {STATUS(Number(selected.quantity)).label}
                      </span>
                    </div>
                  </div>

                  <div className="pm-actions">
                    <button
                      className="pm-btn-edit"
                      onClick={() => navigate(`/admin/edit-product/${selected.id}`)}
                    >
                      ✎ Edit Product
                    </button>
                    <button
                      className="pm-btn-delete"
                      onClick={() => setDeleteConfirm(selected.id)}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {deleteConfirm && (
          <div className="pl-overlay">
            <div className="pl-confirm">
              <h3>Delete Product?</h3>
              <p>This action cannot be undone. The product and all its data will be permanently removed.</p>
              <div className="pl-confirm-actions">
                <button className="pm-btn-delete" onClick={() => handleDelete(deleteConfirm)}>
                  Yes, Delete
                </button>
                <button className="pm-btn-cancel" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}