import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./style/EditProduct.css";

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sizes, setSizes] = useState([""]);
  const [colors, setColors] = useState([""]);
  const [existingImage, setExistingImage] = useState("");
  const [newImage, setNewImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [product, setProduct] = useState({
    name: "",
    price: "",
    description: "",
    quantity: "",
    category: "ALL",
  });

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`http://localhost/Fuku/src/api/ad_get_product.php?id=${id}`);
        const data = await res.json();
        setProduct({
          name: data.name,
          price: data.price,
          description: data.description,
          quantity: data.quantity,
          category: data.category,
        });
        setSizes(data.sizes?.length > 0 ? data.sizes : [""]);
        setColors(data.colors?.length > 0 ? data.colors : [""]);
        setExistingImage(data.image);
        setPreviewUrl(`http://localhost/Fuku/src/api/${data.image}`);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleChange = (e) => {
    setProduct({ ...product, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setNewImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const addSize = () => setSizes([...sizes, ""]);
  const addColor = () => setColors([...colors, ""]);
  const removeSize = (i) => setSizes(sizes.filter((_, idx) => idx !== i));
  const removeColor = (i) => setColors(colors.filter((_, idx) => idx !== i));

  const handleSizeChange = (i, val) => {
    const s = [...sizes];
    s[i] = val;
    setSizes(s);
  };

  const handleColorChange = (i, val) => {
    const c = [...colors];
    c[i] = val;
    setColors(c);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData();
    formData.append("id", id);
    formData.append("name", product.name);
    formData.append("price", product.price);
    formData.append("description", product.description);
    formData.append("quantity", product.quantity);
    formData.append("category", product.category);
    formData.append("sizes", JSON.stringify(sizes.filter(Boolean)));
    formData.append("colors", JSON.stringify(colors.filter(Boolean)));
    formData.append("existing_image", existingImage);
    if (newImage) formData.append("image", newImage);

    try {
      const res = await fetch("http://localhost/Fuku/src/api/update_product.php", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        navigate("/admin/products");
      } else {
        alert(data.message || "Update failed");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="ep-loading">
        <div className="ep-spinner" />
        <span>Loading product...</span>
      </div>
    );
  }

  return (
    <div className="ep-wrapper">
      <div className="ep-header">
        <button className="ep-back-btn" onClick={() => navigate("/admin/products")}>
          ← Back
        </button>
        <div>
          <h2 className="ep-title">Edit Product</h2>
          <p className="ep-subtitle">Update the details below and save changes.</p>
        </div>
      </div>

      <form className="ep-form" onSubmit={handleSubmit}>
        <div className="ep-grid">

          <div className="ep-image-section">
            <div className="ep-image-preview">
              {previewUrl ? (
                <img src={previewUrl} alt="preview" className="ep-preview-img" />
              ) : (
                <div className="ep-no-image">No Image</div>
              )}
            </div>
            <label className="ep-image-label">
              <input type="file" accept="image/*" onChange={handleImageChange} hidden />
              <span className="ep-image-btn">
                {newImage ? "✓ Image Selected" : "Change Image"}
              </span>
            </label>
            {newImage && (
              <p className="ep-image-filename">{newImage.name}</p>
            )}
          </div>

          <div className="ep-fields">

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
                <label className="ep-label">Quantity</label>
                <input
                  className="ep-input"
                  name="quantity"
                  type="number"
                  value={product.quantity}
                  onChange={handleChange}
                  placeholder="0"
                  required
                />
              </div>
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

            <div className="ep-field-group">
              <label className="ep-label">Sizes</label>
              <div className="ep-tag-list">
                {sizes.map((size, i) => (
                  <div className="ep-tag-row" key={i}>
                    <input
                      className="ep-input ep-tag-input"
                      placeholder={`Size ${i + 1}`}
                      value={size}
                      onChange={(e) => handleSizeChange(i, e.target.value)}
                    />
                    {sizes.length > 1 && (
                      <button
                        type="button"
                        className="ep-remove-btn"
                        onClick={() => removeSize(i)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" className="ep-add-field-btn" onClick={addSize}>
                + Add Size
              </button>
            </div>

            <hr className="ep-divider" />

            <div className="ep-field-group">
              <label className="ep-label">Colors</label>
              <div className="ep-tag-list">
                {colors.map((color, i) => (
                  <div className="ep-tag-row" key={i}>
                    <input
                      className="ep-input ep-tag-input"
                      placeholder={`Color ${i + 1}`}
                      value={color}
                      onChange={(e) => handleColorChange(i, e.target.value)}
                    />
                    {colors.length > 1 && (
                      <button
                        type="button"
                        className="ep-remove-btn"
                        onClick={() => removeColor(i)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" className="ep-add-field-btn" onClick={addColor}>
                + Add Color
              </button>
            </div>

            <div className="ep-form-actions">
              <button
                type="button"
                className="ep-cancel-btn"
                onClick={() => navigate("/admin/products")}
              >
                Cancel
              </button>
              <button type="submit" className="ep-save-btn" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
