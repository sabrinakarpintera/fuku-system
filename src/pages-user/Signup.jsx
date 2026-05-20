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

    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    const phoneRegex = /^09\d{9}$/;
    const strongPass = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])\S{8,}$/;

    if (!gmailRegex.test(form.email)) {
      setMessage({
        text: "Only @gmail.com email addresses are allowed.",
        type: "error",
      });
      return;
    }

    if (!phoneRegex.test(form.phone)) {
      setMessage({
        text: "Phone number must be 11 digits and start with 09.",
        type: "error",
      });
      return;
    }

    if (!strongPass.test(form.password)) {
      setMessage({
        text: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
        type: "error",
      });
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }

    setLoading(true);

    try {
      // ✅ FIXED: Changed http:// to https:// to prevent Mixed Content blocking
      const response = await fetch("http://fuku-system.rf.gd/api/register.php", {
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

      // ✅ FIXED: Check if the response is actually JSON before parsing.
      // InfinityFree sometimes returns an HTML challenge page instead of JSON,
      // which would cause response.json() to throw and show a misleading
      // "Network error" message. This gives a clearer error instead.
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned an unexpected response. If this persists, the hosting provider may be intercepting API requests.");
      }

      const data = await response.json();

      if (data.success) {
        setMessage({ text: "Account created! Redirecting…", type: "success" });
        setTimeout(() => navigate("/"), 1200);
      } else {
        setMessage({
          text: data.message || "Registration failed.",
          type: "error",
        });
      }
    } catch (err) {
      setMessage({
        text: err.message || "Network error. Please try again.",
        type: "error",
      });
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
              placeholder="example@gmail.com"
              value={form.email}
              onChange={handleChange}
              required
            />

            <input
              type="tel"
              name="phone"
              placeholder="09XXXXXXXXX"
              value={form.phone}
              onChange={handleChange}
              pattern="09\d{9}"
              maxLength="11"
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
            <button
              type="button"
              className="login"
              onClick={() => navigate("/")}
            >
              Login
            </button>
          </p>

        </form>
      </div>

      <div className="bg">
        <img
          src={bgImage}
          alt="Man & Woman Shopping"
          className="bg-illustration"
        />
      </div>

    </div>
  );
}