import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./style/Signup.css";
import logoImage from "../assets/fuku-logo.png";
import bgImage from "../assets/fuku-bg.png";

const API = "http://localhost/Fuku/src/api/forgot_password.php";

// ── Forgot Password Modal ──────────────────────────────────────
function ForgotPasswordModal({ onClose }) {
  const [step, setStep] = useState(1); // 1=email, 2=otp, 3=new password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const otpRefs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  const setMsg = (type, text) => setMessage({ type, text });
  const clearMsg = () => setMessage({ type: "", text: "" });

  // ── Step 1: Send OTP
  const handleSendOtp = async () => {
    clearMsg();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return setMsg("error", "Please enter a valid email address.");
    }
    setLoading(true);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_otp", email }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg("success", "OTP sent! Check your inbox.");
        setStep(2);
        setTimer(60);
      } else {
        setMsg("error", data.message);
      }
    } catch {
      setMsg("error", "Server error. Try again.");
    }
    setLoading(false);
  };

  // ── OTP input handling
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value.slice(-1);
    setOtp(updated);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  // ── Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    clearMsg();
    const otpStr = otp.join("");
    if (otpStr.length < 6) return setMsg("error", "Please enter the full 6-digit OTP.");
    setLoading(true);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_otp", email, otp: otpStr }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg("success", "OTP verified!");
        setStep(3);
      } else {
        setMsg("error", data.message);
      }
    } catch {
      setMsg("error", "Server error. Try again.");
    }
    setLoading(false);
  };

  // ── Step 3: Reset Password
  const handleResetPassword = async () => {
    clearMsg();

    // ✅ Same strong password rule as Signup
    const strongPass = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])\S{8,}$/;
    if (!strongPass.test(newPassword))
      return setMsg(
        "error",
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
      );

    if (newPassword !== confirmPassword)
      return setMsg("error", "Passwords do not match.");

    setLoading(true);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_password",
          email,
          otp: otp.join(""),
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg("success", "Password reset! You can now log in.");
        setTimeout(onClose, 2000);
      } else {
        setMsg("error", data.message);
      }
    } catch {
      setMsg("error", "Server error. Try again.");
    }
    setLoading(false);
  };

  const handleResend = () => {
    setOtp(["", "", "", "", "", ""]);
    clearMsg();
    handleSendOtp();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <button className="modal-close" onClick={onClose} type="button">×</button>

        {/* ── Step 1: Email ── */}
        {step === 1 && (
          <>
            <h3>Forgot Password</h3>
            <p className="modal-sub">Enter the email linked to your account.</p>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
            />
            {message.text && (
              <p className={message.type === "error" ? "error" : "success"}>
                {message.text}
              </p>
            )}
            <button className="register" onClick={handleSendOtp} disabled={loading} type="button">
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </>
        )}

        {/* ── Step 2: OTP ── */}
        {step === 2 && (
          <>
            <h3>Enter OTP</h3>
            <p className="modal-sub">
              We sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.
            </p>
            <div className="otp-row" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  ref={(el) => (otpRefs.current[i] = el)}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                />
              ))}
            </div>
            {message.text && (
              <p className={message.type === "error" ? "error" : "success"}>
                {message.text}
              </p>
            )}
            <button className="register" onClick={handleVerifyOtp} disabled={loading} type="button">
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
            <p className="resend-row">
              Didn't receive it?{" "}
              <button
                className="resend-btn"
                onClick={handleResend}
                disabled={timer > 0 || loading}
                type="button"
              >
                {timer > 0 ? `Resend in ${timer}s` : "Resend OTP"}
              </button>
            </p>
          </>
        )}

        {/* ── Step 3: New Password ── */}
        {step === 3 && (
          <>
            <h3>New Password</h3>
            <p className="modal-sub">Choose a strong new password.</p>
            <input
              type="password"
              placeholder="New password (min. 8 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
            />
            {message.text && (
              <p className={message.type === "error" ? "error" : "success"}>
                {message.text}
              </p>
            )}
            <button className="register" onClick={handleResetPassword} disabled={loading} type="button">
              {loading ? "Saving..." : "Reset Password"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Login Page ─────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return;
    try {
      const user = JSON.parse(storedUser);
      if (user.role === "admin") navigate("/admin/dashboard");
      else navigate("/dashboard");
    } catch {
      localStorage.removeItem("user");
    }
  }, [navigate]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
  e.preventDefault();

  setLoading(true);
  setMessage("");

  try {
    const response = await fetch("http://localhost/Fuku/src/api/login.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(form),
    });

    const data = await response.json();

    console.log("LOGIN RESPONSE:", data);

    if (data.success) {

      const userData = {
        id: data.user_id,
        username: data.username,
        role: data.role || "user",
      };

      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("user_id", data.user_id);

      // force redirect
      if (userData.role === "admin") {
        window.location.href = "/admin/dashboard";
      } else {
        window.location.href = "/dashboard";
      }

    } else {
      setMessage(data.message || "Login failed");
    }

  } catch (error) {
    console.error(error);
    setMessage("Server error. Try again.");
  }

  setLoading(false);
};

  return (
    <div className="signBody">
      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}

      <div className="container1">
        <div className="logo1">
          <img src={logoImage} alt="Fuku Logo" />
        </div>

        <form onSubmit={handleSubmit}>
          <h2>Welcome back!</h2>
          <h4>Please login to your account.</h4>

          <input
            type="text"
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <button
            type="button"
            className="forgot-link"
            onClick={() => setShowForgot(true)}
          >
            Forgot password?
          </button>

          {message && <p className="error">{message}</p>}

          <button type="submit" className="register" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

          <p>
            No account?
            <button type="button" className="login" onClick={() => navigate("/signup")}>
              Sign Up
            </button>
          </p>
        </form>
      </div>

      <div className="bg">
        <img src={bgImage} alt="Shopping Background" className="bg-illustration" />
      </div>
    </div>
  );
}