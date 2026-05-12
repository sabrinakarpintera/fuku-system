import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./style/AddProduct.css";
import logoImage from "../assets/fuku-logo.png";


const Icon = ({ name }) => <span className="material-icons">{name}</span>;

export default function AddProduct() {
  const navigate = useNavigate();

  const [sizes, setSizes] = useState([""]);
  const [colors, setColors] = useState([""]);

  const [product, setProduct] = useState({
    name: "",
    price: "",
    description: "",
    quantity: "",
    category: "ALL",
  });

  const [image, setImage] = useState(null);

  const handleChange = (e) => {
    setProduct({ ...product, [e.target.name]: e.target.value });
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const addSize = () => setSizes([...sizes, ""]);
  const addColor = () => setColors([...colors, ""]);

  const removeSize = (i) => setSizes(sizes.filter((_, idx) => idx !== i));
  const removeColor = (i) => setColors(colors.filter((_, idx) => idx !== i));

  const handleSizeChange = (i, value) => {
    const newSizes = [...sizes];
    newSizes[i] = value;
    setSizes(newSizes);
  };

  const handleColorChange = (i, value) => {
    const newColors = [...colors];
    newColors[i] = value;
    setColors(newColors);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("name", product.name);
    formData.append("price", product.price);
    formData.append("description", product.description);
    formData.append("quantity", product.quantity);
    formData.append("category", product.category);
    formData.append("sizes", JSON.stringify(sizes));
    formData.append("colors", JSON.stringify(colors));
    formData.append("image", image);

    try {
      const res = await fetch("http://localhost/Fuku/src/api/add_product.php", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      alert(data.message);
      navigate("/admin/dashboard");
    } catch (error) {
      console.error(error);
      alert("Failed to add product");
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
              <img src={logoImage} alt="Fuku Logo"/>
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

      <div className="add-product-wrapper">
        <h2>Add Product</h2>

        <form className="add-product-form" onSubmit={handleSubmit}>
          <input name="name" placeholder="Product Name" onChange={handleChange} required />
          <input name="price" placeholder="Price" type="number" step="0.01" onChange={handleChange} required />
          <input name="quantity" placeholder="Quantity" type="number" onChange={handleChange} required />
          <textarea name="description" placeholder="Description" onChange={handleChange} />

          <hr className="form-divider" />

          <h3>Category</h3>
          <select
            name="category"
            value={product.category}
            onChange={handleChange}
            className="category-select"
            required
          >
            <option value="ALL">All</option>
            <option value="MEN">Men</option>
            <option value="WOMEN">Women</option>
            <option value="KIDS">Kids</option>
          </select>

          <hr className="form-divider" />

          <h3>Sizes</h3>
          <div className="field-list">
            {sizes.map((size, index) => (
              <div className="field-row" key={index}>
                <input
                  placeholder={`Size ${index + 1}`}
                  value={size}
                  onChange={(e) => handleSizeChange(index, e.target.value)}
                />
                {sizes.length > 1 && (
                  <button
                    type="button"
                    className="btn-delete-field"
                    onClick={() => removeSize(index)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="btn-add-field" onClick={addSize}>
            + Add Size
          </button>

          <hr className="form-divider" />

          <h3>Colors</h3>
          <div className="field-list">
            {colors.map((color, index) => (
              <div className="field-row" key={index}>
                <input
                  placeholder={`Color ${index + 1}`}
                  value={color}
                  onChange={(e) => handleColorChange(index, e.target.value)}
                />
                {colors.length > 1 && (
                  <button
                    type="button"
                    className="btn-delete-field"
                    onClick={() => removeColor(index)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="btn-add-field" onClick={addColor}>
            + Add Color
          </button>

          <hr className="form-divider" />

          <div className="file-input-wrapper">
            <span className="file-input-label">Product Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
              required
            />
          </div>

          <button type="submit" className="btn-submit">
            Add Product
          </button>
        </form>
      </div>
    </div>
  );
}