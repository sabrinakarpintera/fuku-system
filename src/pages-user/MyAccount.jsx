import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./style/MyAccount.css";

const API = "http://localhost/fuku/src/api";

const fetchJSON = async (url, options = {}) => {
  try {
    const res = await fetch(url, { ...options, credentials: "include" });
    return await res.json();
  } catch (err) {
    console.error(err);
    return {};
  }
};

const isEmpty = (v) => !v || !v.trim();

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const show = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };
  const dismiss = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));
  return { toasts, show, dismiss };
}

function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon material-symbols-outlined">
            {t.type === "success" ? "check_circle" : "error"}
          </span>
          <span className="toast-message">{t.message}</span>
          <button className="toast-close" onClick={() => onDismiss(t.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}

function FieldRow({ label, value, saved, type = "text", onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  const handleEdit   = () => { setDraft(value); setError(""); setEditing(true); };
  const handleCancel = () => { setDraft(value); setError(""); setEditing(false); };

  const handleSave = async () => {
    if (isEmpty(draft)) {
      setError(`${label} is required.`);
      return;
    }

    if (label === "Email") {
      const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
      if (!gmailRegex.test(draft.trim())) {
        setError("Only @gmail.com email addresses are allowed.");
        return;
      }
    }

    if (label === "Contact number") {
      const phoneRegex = /^09\d{9}$/;
      if (!phoneRegex.test(draft.trim())) {
        setError("Phone number must be 11 digits and start with 09.");
        return;
      }
    }

    setLoading(true);
    const ok = await onSave(draft.trim());
    setLoading(false);
    if (ok) setEditing(false);
  };

  return (
    <div className="field-group">
      <div className="field-group-header">
        <span className="field-label">{label}</span>
        {!editing && <button className="badge-edit" onClick={handleEdit}>Edit</button>}
      </div>
      {editing ? (
        <>
          <input
            className={`input ${error ? "input-error" : ""}`}
            type={type}
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setError(""); }}
            placeholder={label}
            autoFocus
            pattern={label === "Contact number" ? "09\\d{9}" : undefined}
            maxLength={label === "Contact number" ? 11 : undefined}
            title={
              label === "Email"
                ? "Only @gmail.com email addresses are allowed."
                : label === "Contact number"
                ? "Phone number must be 11 digits and start with 09."
                : undefined
            }
          />
          {error && <p className="field-error">{error}</p>}
          <div className="field-actions">
            <button className="edit-btn cancel-btn" onClick={handleCancel} disabled={loading}>Cancel</button>
            <button className="edit-btn save-btn" onClick={handleSave} disabled={loading}>
              {loading ? "Saving…" : "Save"}
            </button>
          </div>
        </>
      ) : (
        <p className="field-value">{value || <span className="field-placeholder">Not set</span>}</p>
      )}
    </div>
  );
}

function AddressSection({ saved, onSave }) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [regions, setRegions]     = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities]       = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [regionCode, setRegionCode]     = useState("");
  const [provinceCode, setProvinceCode] = useState("");
  const [cityCode, setCityCode]         = useState("");
  const [barangayCode, setBarangayCode] = useState("");
  const [regionName, setRegionName]     = useState(saved.regionName);
  const [provinceName, setProvinceName] = useState(saved.provinceName);
  const [cityName, setCityName]         = useState(saved.cityName);
  const [barangayName, setBarangayName] = useState(saved.barangayName);
  const [street, setStreet]             = useState(saved.street);
  const [errors, setErrors]             = useState({});

  useEffect(() => {
    if (!editing) {
      setRegionName(saved.regionName); setProvinceName(saved.provinceName);
      setCityName(saved.cityName);     setBarangayName(saved.barangayName);
      setStreet(saved.street);
    }
  }, [saved, editing]);

  useEffect(() => {
    fetch("https://psgc.gitlab.io/api/regions/")
      .then((r) => r.json()).then(setRegions).catch(console.error);
  }, []);

  const handleEdit = () => {
    setRegionCode(""); setProvinceCode(""); setCityCode(""); setBarangayCode("");
    setProvinces([]); setCities([]); setBarangays([]);
    setRegionName(saved.regionName); setProvinceName(saved.provinceName);
    setCityName(saved.cityName);     setBarangayName(saved.barangayName);
    setStreet(saved.street); setErrors({}); setEditing(true);
  };

  const handleCancel = () => { setErrors({}); setEditing(false); };

  const handleRegion = async (e) => {
    const code = e.target.value; const name = e.target.selectedOptions[0].text;
    setRegionCode(code); setRegionName(name);
    setProvinceCode(""); setProvinceName(""); setCityCode(""); setCityName("");
    setBarangayCode(""); setBarangayName(""); setProvinces([]); setCities([]); setBarangays([]);
    if (code) {
      const data = await fetch(`https://psgc.gitlab.io/api/regions/${code}/provinces/`)
        .then((r) => r.json()).catch(() => []);
      setProvinces(data);
    }
  };

  const handleProvince = async (e) => {
    const code = e.target.value; const name = e.target.selectedOptions[0].text;
    setProvinceCode(code); setProvinceName(name);
    setCityCode(""); setCityName(""); setBarangayCode(""); setBarangayName("");
    setCities([]); setBarangays([]);
    if (code) {
      const data = await fetch(`https://psgc.gitlab.io/api/provinces/${code}/cities-municipalities/`)
        .then((r) => r.json()).catch(() => []);
      setCities(data);
    }
  };

  const handleCity = async (e) => {
    const code = e.target.value; const name = e.target.selectedOptions[0].text;
    setCityCode(code); setCityName(name); setBarangayCode(""); setBarangayName(""); setBarangays([]);
    if (code) {
      const data = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${code}/barangays/`)
        .then((r) => r.json()).catch(() => []);
      setBarangays(data);
    }
  };

  const handleBarangay = (e) => {
    setBarangayCode(e.target.value); setBarangayName(e.target.selectedOptions[0].text);
  };

  const handleSave = async () => {
    const errs = {};
    if (!regionCode   && !regionName)   errs.region   = "Region is required.";
    if (!provinceCode && !provinceName) errs.province = "Province is required.";
    if (!cityCode     && !cityName)     errs.city     = "City / municipality is required.";
    if (!barangayCode && !barangayName) errs.barangay = "Barangay is required.";
    if (isEmpty(street))                errs.street   = "Street is required.";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    const ok = await onSave({ regionName, provinceName, cityName, barangayName, street: street.trim() });
    setLoading(false);
    if (ok) setEditing(false);
  };

  const fullAddress = [barangayName, cityName, provinceName, regionName].filter(Boolean).join(", ");

  return (
    <div className="field-group">
      <div className="field-group-header">
        <span className="field-label">Delivery address</span>
        {!editing && <button className="badge-edit" onClick={handleEdit}>Edit</button>}
      </div>
      {editing ? (
        <>
          <select className={`input ${errors.region ? "input-error" : ""}`} value={regionCode} onChange={handleRegion}>
            <option value="">Select region</option>
            {regions.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
          </select>
          {errors.region && <p className="field-error">{errors.region}</p>}

          <select className={`input ${errors.province ? "input-error" : ""}`} value={provinceCode} onChange={handleProvince} disabled={!provinces.length}>
            <option value="">Select province</option>
            {provinces.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
          {errors.province && <p className="field-error">{errors.province}</p>}

          <select className={`input ${errors.city ? "input-error" : ""}`} value={cityCode} onChange={handleCity} disabled={!cities.length}>
            <option value="">Select city / municipality</option>
            {cities.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
          {errors.city && <p className="field-error">{errors.city}</p>}

          <select className={`input ${errors.barangay ? "input-error" : ""}`} value={barangayCode} onChange={handleBarangay} disabled={!barangays.length}>
            <option value="">Select barangay</option>
            {barangays.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
          </select>
          {errors.barangay && <p className="field-error">{errors.barangay}</p>}

          <input
            className={`input ${errors.street ? "input-error" : ""}`}
            value={street}
            onChange={(e) => { setStreet(e.target.value); setErrors((p) => ({ ...p, street: "" })); }}
            placeholder="House no. / building / street"
          />
          {errors.street && <p className="field-error">{errors.street}</p>}

          <div className="field-actions">
            <button className="edit-btn cancel-btn" onClick={handleCancel} disabled={loading}>Cancel</button>
            <button className="edit-btn save-btn" onClick={handleSave} disabled={loading}>
              {loading ? "Saving…" : "Save address"}
            </button>
          </div>
        </>
      ) : (
        <>
          {fullAddress
            ? <><p className="field-value">{fullAddress}</p>{street && <p className="field-sub">{street}</p>}</>
            : <p className="field-placeholder">No address saved yet</p>
          }
        </>
      )}
    </div>
  );
}

export default function MyAccount() {
  const { toasts, show: showToast, dismiss } = useToasts();
  const location = useLocation();
  const navigate  = useNavigate();

  // Detect if we came from the checkout "Edit" button
  const returnToCheckout = location.state?.returnToCheckout ?? false;
  const checkoutState    = location.state?.checkoutState    ?? null;

  const [saved, setSaved] = useState({
    name: "", email: "", phone: "",
    street: "", regionName: "", provinceName: "", cityName: "", barangayName: ""
  });

  useEffect(() => {
    fetchJSON(`${API}/get_user.php`).then((data) => {
      setSaved({
        name:         data.name     || "",
        email:        data.email    || "",
        phone:        data.phone    || "",
        street:       data.street   || "",
        regionName:   data.region   || "",
        provinceName: data.province || "",
        cityName:     data.city     || "",
        barangayName: data.barangay || "",
      });
    });
  }, []);

  const partialSave = async (patch) => {
    const result = await fetchJSON(`${API}/patch_user.php`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (result.success) {
      setSaved((prev) => ({ ...prev, ...patch }));
      showToast("Saved successfully!", "success");

      // If we came from checkout, go back there after a short delay
      if (returnToCheckout && checkoutState) {
        setTimeout(() => {
          navigate("/checkout", { state: checkoutState });
        }, 1200);
      }

      return true;
    } else {
      showToast(result.error || "Update failed.", "error");
      return false;
    }
  };

  const saveName    = (name)  => partialSave({ name });
  const saveEmail   = (email) => partialSave({ email });
  const savePhone   = (phone) => partialSave({ phone });
  const saveAddress = ({ regionName, provinceName, cityName, barangayName, street }) =>
    partialSave({ region: regionName, province: provinceName, city: cityName, barangay: barangayName, street });

  // Back button: return to checkout (preserving cart) or dashboard
  const handleBack = () => {
    if (returnToCheckout && checkoutState) {
      navigate("/checkout", { state: checkoutState });
    } 
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="account-container">
        <div className="page-header">
          <button className="back-btn" onClick={handleBack} aria-label="Go back">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="title">My Account</h1>

          {/* Banner shown when the user arrived from checkout */}
          {returnToCheckout && (
            <button
              className="return-checkout-btn"
              onClick={() => navigate("/checkout", { state: checkoutState })}
            >
            </button>
          )}
        </div>
        <hr />


        <h2 className="section-title">Account Details</h2>

        <FieldRow label="Name"           value={saved.name}  saved={saved.name}  onSave={saveName} />
        <FieldRow label="Email"          value={saved.email} saved={saved.email} type="email" onSave={saveEmail} />
        <FieldRow label="Contact number" value={saved.phone} saved={saved.phone} type="tel"   onSave={savePhone} />

        <h2 className="section-title">Address</h2>

        <AddressSection saved={saved} onSave={saveAddress} />
      </div>
    </>
  );
}