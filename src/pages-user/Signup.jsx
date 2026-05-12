import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./style/Signup.css";
import logoImage from "../assets/fuku-logo.png";
import bgImage from "../assets/fuku-bg.png";

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    if (form.password !== form.confirmPassword) {
      setMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost/Fuku/src/api/register.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          username: form.username,
          email: form.email,
          phone: form.phone,
          password: form.password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ text: "Account created! Redirecting…", type: "success" });
        setTimeout(() => navigate("/"), 1200);
      } else {
        setMessage({ text: data.message || "Registration failed.", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Network error. Please try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signBody">

      <div className="container1">

        <div className="logo1">
          <img src={logoImage} alt="Fuku Logo" />
        </div>

        <form onSubmit={handleSubmit}>

          <h2>Hello, Welcome!</h2>
          <h4>Create an account.</h4>

          <div className="input-row">
            <input
              type="text"
              name="name"
              placeholder="Name"
              value={form.name}
              onChange={handleChange}
              required
            />
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-row">
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
            />
            <input
              type="tel"
              name="phone"
              placeholder="Contact Number"
              value={form.phone}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-row">
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
            />
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          {message.text && (
            <p className={message.type === "success" ? "success" : "error"}>
              {message.text}
            </p>
          )}

          <button type="submit" className="register" disabled={loading}>
            {loading ? "Signing up…" : "Sign Up"}
          </button>

          <p>
            Already have an account?{" "}
            <button type="button" className="login" onClick={() => navigate("/")}>
              Login
            </button>
          </p>

        </form>
      </div>

      <div className="bg">
        <img src={bgImage} alt="Man & Woman Shopping" className="bg-illustration" />
      </div>

    </div>
  );
}