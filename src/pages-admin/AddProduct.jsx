import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./style/editProduct.css";
import logoImage from "../assets/fuku-logo.png";

const Icon = ({ name }) => <span className="material-icons">{name}</span>;

export default function AddProduct() {
  const navigate = useNavigate();

  const [product, setProduct] = useState({
    name: "",
    price: "",
    description: "",
    category: "ALL",
  });

  // Raw size/color inputs (comma-separated for simplicity → split into arrays)
  const [sizeInput, setSizeInput] = useState("");
  const [colorInput, setColorInput] = useState("");

  // Variant quantities: key = "size||color", value = number
  const [variantQty, setVariantQty] = useState({});

  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Derive clean arrays from inputs
  const sizes = useMemo(
    () => [...new Set(sizeInput.split(",").map((s) => s.trim()).filter(Boolean))],
    [sizeInput]
  );
  const colors = useMemo(
    () => [...new Set(colorInput.split(",").map((c) => c.trim()).filter(Boolean))],
    [colorInput]
  );

  const handleChange = (e) =>
    setProduct({ ...product, [e.target.name]: e.target.value });

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleQtyChange = (size, color, value) => {
    const key = `${size}||${color}`;
    setVariantQty((prev) => ({ ...prev, [key]: Math.max(0, parseInt(value) || 0) }));
  };

  const getQty = (size, color) => variantQty[`${size}||${color}`] ?? 0;

  const totalStock = useMemo(() => {
    return sizes.reduce((sum, s) =>
      sum + colors.reduce((cSum, c) => cSum + getQty(s, c), 0), 0
    );
  }, [variantQty, sizes, colors]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (sizes.length === 0 || colors.length === 0) {
      setError("Please enter at least one size and one color.");
      return;
    }

    if (!image) {
      setError("Please upload a product image.");
      return;
    }

    // Build variants array
    const variants = [];
    for (const size of sizes) {
      for (const color of colors) {
        variants.push({ size, color, quantity: getQty(size, color) });
      }
    }

    setSaving(true);
    const formData = new FormData();
    formData.append("name", product.name);
    formData.append("price", product.price);
    formData.append("description", product.description);
    formData.append("category", product.category);
    formData.append("variants", JSON.stringify(variants));
    formData.append("image", image);

    try {
      const res = await fetch("http://localhost/Fuku/src/api/add_product.php", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        navigate("/admin/productlist");
      } else {
        setError(data.message || "Failed to add product.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const navItems = [
    { label: "Home", icon: "home", path: "/admin/dashboard" },
    { label: "Product Listed", icon: "inventory_2", path: "/admin/productlist" },
    { label: "Order Details", icon: "receipt_long", path: "/admin/orderdetails" },
  ];
  const currentPath = "/admin/addproduct";

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

      <div className="ep-wrapper">
        <div className="ep-header">
          <button className="ep-back-btn" onClick={() => navigate("/admin/productlist")}>
            ← Back
          </button>
          <div>
            <div className="ep-title">Add Product</div>
            <div className="ep-subtitle">Fill in the details to list a new item.</div>
          </div>
        </div>

        <form className="ep-form" onSubmit={handleSubmit}>
          <div className="ep-grid">

            {/* ── Left: Image ── */}
            <div className="ep-image-section">
              <div className="ep-image-preview">
                {imagePreview
                  ? <img className="ep-preview-img" src={imagePreview} alt="Preview" />
                  : <span className="ep-no-image">No image selected</span>}
              </div>
              <label className="ep-image-label">
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleImageChange}
                />
                <span className="ep-image-btn">
                  {imagePreview ? "Change Image" : "Upload Image"}
                </span>
              </label>
              {image && <span className="ep-image-filename">{image.name}</span>}
            </div>

            {/* ── Right: Fields ── */}
            <div className="ep-fields">

              {/* Name */}
              <div className="ep-field-group">
                <label className="ep-label">Product Name</label>
                <input
                  className="ep-input"
                  name="name"
                  placeholder="e.g. Classic White Tee"
                  value={product.name}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Price + Category */}
              <div className="ep-row">
                <div className="ep-field-group">
                  <label className="ep-label">Price (₱)</label>
                  <input
                    className="ep-input"
                    name="price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={product.price}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="ep-field-group">
                  <label className="ep-label">Category</label>
                  <select
                    className="ep-input ep-select"
                    name="category"
                    value={product.category}
                    onChange={handleChange}
                    required
                  >
                    <option value="ALL">All</option>
                    <option value="MEN">Men</option>
                    <option value="WOMEN">Women</option>
                    <option value="KIDS">Kids</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="ep-field-group">
                <label className="ep-label">Description</label>
                <textarea
                  className="ep-input ep-textarea"
                  name="description"
                  placeholder="Describe the product…"
                  value={product.description}
                  onChange={handleChange}
                />
              </div>

              <hr className="ep-divider" />

              {/* Sizes (comma-separated) */}
              <div className="ep-field-group">
                <label className="ep-label">
                  Sizes <span className="ep-hint">(comma-separated, e.g. S, M, L, XL)</span>
                </label>
                <input
                  className="ep-input"
                  placeholder="S, M, L, XL"
                  value={sizeInput}
                  onChange={(e) => setSizeInput(e.target.value)}
                />
                {sizes.length > 0 && (
                  <div className="ep-tag-preview">
                    {sizes.map((s) => <span className="pm-tag" key={s}>{s}</span>)}
                  </div>
                )}
              </div>

              {/* Colors (comma-separated) */}
              <div className="ep-field-group">
                <label className="ep-label">
                  Colors <span className="ep-hint">(comma-separated, e.g. Red, Blue, Black)</span>
                </label>
                <input
                  className="ep-input"
                  placeholder="Red, Blue, Black"
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value)}
                />
                {colors.length > 0 && (
                  <div className="ep-tag-preview">
                    {colors.map((c) => (
                      <span className="pm-tag pm-color-tag" key={c}>
                        <span className="pm-color-dot" style={{ background: c.toLowerCase() }} />
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Variant Stock Table ── */}
              {sizes.length > 0 && colors.length > 0 && (
                <>
                  <hr className="ep-divider" />
                  <div className="ep-field-group">
                    <label className="ep-label">
                      Stock per Variant
                      <span className="ep-hint"> — Total: {totalStock} units</span>
                    </label>
                    <div className="ep-variant-wrap">
                      <table className="ep-variant-table">
                        <thead>
                          <tr>
                            <th className="ep-vt-corner">Size \ Color</th>
                            {colors.map((c) => (
                              <th key={c} className="ep-vt-head">
                                <span className="ep-vt-color-dot" style={{ background: c.toLowerCase() }} />
                                {c}
                              </th>
                            ))}
                            <th className="ep-vt-head">Row Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sizes.map((s) => {
                            const rowTotal = colors.reduce((sum, c) => sum + getQty(s, c), 0);
                            return (
                              <tr key={s}>
                                <td className="ep-vt-size">{s}</td>
                                {colors.map((c) => (
                                  <td key={c} className="ep-vt-cell">
                                    <input
                                      type="number"
                                      min="0"
                                      className="ep-vt-input"
                                      value={getQty(s, c)}
                                      onChange={(e) => handleQtyChange(s, c, e.target.value)}
                                    />
                                  </td>
                                ))}
                                <td className="ep-vt-total">{rowTotal}</td>
                              </tr>
                            );
                          })}
                          {/* Column totals row */}
                          <tr className="ep-vt-footer">
                            <td className="ep-vt-size">Col Total</td>
                            {colors.map((c) => (
                              <td key={c} className="ep-vt-total">
                                {sizes.reduce((sum, s) => sum + getQty(s, c), 0)}
                              </td>
                            ))}
                            <td className="ep-vt-grand">{totalStock}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              <hr className="ep-divider" />

              {error && <p className="error">{error}</p>}

              <div className="ep-form-actions">
                <button
                  type="button"
                  className="ep-cancel-btn"
                  onClick={() => navigate("/admin/productlist")}
                >
                  Cancel
                </button>
                <button type="submit" className="ep-save-btn" disabled={saving}>
                  {saving ? "Adding…" : "Add Product"}
                </button>
              </div>

            </div>
          </div>
        </form>
      </div>
    </div>
  );
}