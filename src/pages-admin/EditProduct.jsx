import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./style/editProduct.css";
import logoImage from "../assets/fuku-logo.png";

const Icon = ({ name }) => <span className="material-icons">{name}</span>;

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [existingImage,setExistingImage]= useState("");
  const [newImage,     setNewImage]     = useState(null);
  const [previewUrl,   setPreviewUrl]   = useState("");
  const [error,        setError]        = useState("");

  const [product, setProduct] = useState({
    name: "", price: "", description: "", category: "ALL",
  });

  // Comma-separated inputs — derived from loaded data
  const [sizeInput,  setSizeInput]  = useState("");
  const [colorInput, setColorInput] = useState("");

  // Variant qty map: "size||color" → number
  const [variantQty, setVariantQty] = useState({});

  // Derive clean arrays
  const sizes = useMemo(
    () => [...new Set(sizeInput.split(",").map((s) => s.trim()).filter(Boolean))],
    [sizeInput]
  );
  const colors = useMemo(
    () => [...new Set(colorInput.split(",").map((c) => c.trim()).filter(Boolean))],
    [colorInput]
  );

  const getQty = (size, color) => variantQty[`${size}||${color}`] ?? 0;
  const handleQtyChange = (size, color, value) => {
    const key = `${size}||${color}`;
    setVariantQty((prev) => ({ ...prev, [key]: Math.max(0, parseInt(value) || 0) }));
  };

  const totalStock = useMemo(() => {
    return sizes.reduce((sum, s) =>
      sum + colors.reduce((cSum, c) => cSum + getQty(s, c), 0), 0
    );
  }, [variantQty, sizes, colors]);

  // ── Load existing product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res  = await fetch(`http://localhost/Fuku/src/api/ad_get_product.php?id=${id}`);
        const data = await res.json();

        setProduct({
          name:        data.name        ?? "",
          price:       data.price       ?? "",
          description: data.description ?? "",
          category:    data.category    ?? "ALL",
        });

        setExistingImage(data.image ?? "");
        setPreviewUrl(`http://localhost/Fuku/src/api/${data.image}`);

        // Restore size/color inputs from existing variants
        if (data.variants?.length > 0) {
          const existingSizes  = [...new Set(data.variants.map((v) => v.size))];
          const existingColors = [...new Set(data.variants.map((v) => v.color))];
          setSizeInput(existingSizes.join(", "));
          setColorInput(existingColors.join(", "));

          // Populate variant quantities from saved data
          const qtyMap = {};
          data.variants.forEach((v) => {
            qtyMap[`${v.size}||${v.color}`] = v.stock;
          });
          setVariantQty(qtyMap);
        } else {
          // Fallback: no variants yet — prefill from sizes/colors arrays
          setSizeInput((data.sizes  ?? []).join(", "));
          setColorInput((data.colors ?? []).join(", "));
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load product.");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleChange = (e) =>
    setProduct({ ...product, [e.target.name]: e.target.value });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setNewImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (sizes.length === 0 || colors.length === 0) {
      setError("Please enter at least one size and one color.");
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
    formData.append("id",             id);
    formData.append("name",           product.name);
    formData.append("price",          product.price);
    formData.append("description",    product.description);
    formData.append("category",       product.category);
    formData.append("variants",       JSON.stringify(variants));
    formData.append("existing_image", existingImage);
    if (newImage) formData.append("image", newImage);

    try {
      const res  = await fetch("http://localhost/Fuku/src/api/update_product.php", {
        method: "POST",
        body:   formData,
      });
      const data = await res.json();
      if (data.success) {
        navigate("/admin/productlist");
      } else {
        setError(data.message || "Update failed.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const navItems = [
    { label: "Home",           icon: "home",         path: "/admin/dashboard"   },
    { label: "Product Listed", icon: "inventory_2",  path: "/admin/productlist" },
    { label: "Order Details",  icon: "receipt_long", path: "/admin/orderdetails"},
  ];
  const currentPath = "/admin/editproduct";

  if (loading) {
    return (
      <div className="admin-root">
        <div className="pl-loading" style={{ marginTop: "20vh" }}>
          <div className="pl-spinner" />
          <span>Loading product...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-root">
      {/* ── Header ── */}
      <header className="admin-header">
        <div className="admin-header-inner">
          <span className="logo"><img src={logoImage} alt="Fuku Logo" /></span>
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
          <button className="signout-btn" onClick={() => { localStorage.clear(); navigate("/"); }}>
            <Icon name="logout" /><span>Sign Out</span>
          </button>
        </div>
      </header>

      <div className="ep-wrapper">
        <div className="ep-header">
          <button className="ep-back-btn" onClick={() => navigate("/admin/productlist")}>
            ← Back
          </button>
          <div>
            <div className="ep-title">Edit Product</div>
            <div className="ep-subtitle">Update the details below and save changes.</div>
          </div>
        </div>

        <form className="ep-form" onSubmit={handleSubmit}>
          <div className="ep-grid">

            {/* ── Left: Image ── */}
            <div className="ep-image-section">
              <div className="ep-image-preview">
                {previewUrl
                  ? <img className="ep-preview-img" src={previewUrl} alt="Preview" />
                  : <span className="ep-no-image">No image</span>}
              </div>
              <label className="ep-image-label">
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleImageChange}
                />
                <span className="ep-image-btn">
                  {newImage ? "✓ Image Selected" : "Change Image"}
                </span>
              </label>
              {newImage && <span className="ep-image-filename">{newImage.name}</span>}
            </div>

            {/* ── Right: Fields ── */}
            <div className="ep-fields">

              {/* Name */}
              <div className="ep-field-group">
                <label className="ep-label">Product Name</label>
                <input
                  className="ep-input"
                  name="name"
                  value={product.name}
                  onChange={handleChange}
                  placeholder="Product Name"
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
                    value={product.price}
                    onChange={handleChange}
                    placeholder="0.00"
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
                  value={product.description}
                  onChange={handleChange}
                  placeholder="Product description..."
                />
              </div>

              <hr className="ep-divider" />

              {/* Sizes */}
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

              {/* Colors */}
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
                          {/* Column totals */}
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
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>

            </div>
          </div>
        </form>
      </div>
    </div>
  );
}