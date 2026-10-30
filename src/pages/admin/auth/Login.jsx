import { useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Lock, Loader2, AlertCircle } from "lucide-react";

import { auth, db } from "../../../services/firebase";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      // 1. Sign in with Firebase Authentication
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      const user = credential.user;

      // 2. Get the user's Firestore profile
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await signOut(auth);
        setError("Your account profile was not found in Firestore.");
        return;
      }

      const userData = userSnap.data();

      // 3. Check the user's role
      const role = String(userData.role || "")
        .trim()
        .toLowerCase();

      if (role !== "admin") {
        await signOut(auth);
        setError(
          `Access denied. Your account role is "${role || "missing"}", not "admin".`,
        );
        return;
      }

      // 4. Check account status
      const accountStatus = String(userData.accountStatus || "active")
        .trim()
        .toLowerCase();

      if (accountStatus !== "active") {
        await signOut(auth);
        setError(
          `Your admin account is "${accountStatus}". Please contact the administrator.`,
        );
        return;
      }

      // 5. Login successful — keep the session active
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      console.error("Admin login error:", err.code, err.message);

      switch (err.code) {
        case "auth/invalid-credential":
        case "auth/user-not-found":
        case "auth/wrong-password":
          setError("Invalid email or password.");
          break;

        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;

        case "auth/too-many-requests":
          setError("Too many login attempts. Please try again later.");
          break;

        case "auth/user-disabled":
          setError("This account has been disabled.");
          break;

        case "permission-denied":
        case "firestore/permission-denied":
          await signOut(auth);
          setError(
            "Cannot read your user profile. Check your Firestore security rules.",
          );
          break;

        default:
          setError(err.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <form onSubmit={handleLogin} style={styles.card}>
        <div style={styles.logo}>
          <Lock size={25} color="#4f46e5" />
        </div>

        <h1 style={styles.title}>RentEase</h1>

        <p style={styles.subtitle}>Sign in to your account</p>

        <p style={styles.helper}>
          Admin and property owners can use the same login.
        </p>

        {error && (
          <div style={styles.errorBox} role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <div style={styles.field}>
          <label htmlFor="email" style={styles.label}>
            Email address
          </label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            autoComplete="username"
            required
            disabled={loading}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label htmlFor="password" style={styles.label}>
            Password
          </label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            disabled={loading}
            style={styles.input}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            ...styles.button,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="login-spinner" />
              Verifying account...
            </>
          ) : (
            "Sign In"
          )}
        </button>

        <p style={styles.footer}>
          Your dashboard will open automatically based on your account role.
        </p>
      </form>

      <style>{`
        @keyframes login-spin {
          to { transform: rotate(360deg); }
        }

        .login-spinner {
          animation: login-spin 0.8s linear infinite;
        }

        .login-input:focus {
          border-color: #6366f1;
          outline: 3px solid rgba(99, 102, 241, 0.12);
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "24px",
    boxSizing: "border-box",
    background:
      "linear-gradient(135deg, #eef2ff 0%, #f8fafc 55%, #eff6ff 100%)",
    fontFamily: "Inter, Arial, sans-serif",
  },

  card: {
    width: "100%",
    maxWidth: "400px",
    boxSizing: "border-box",
    padding: "36px 32px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)",
  },

  logo: {
    width: "54px",
    height: "54px",
    margin: "0 auto 18px",
    display: "grid",
    placeItems: "center",
    borderRadius: "16px",
    background: "#eef2ff",
  },

  title: {
    margin: 0,
    textAlign: "center",
    color: "#0f172a",
    fontSize: "28px",
    fontWeight: 750,
  },

  subtitle: {
    margin: "8px 0 0",
    textAlign: "center",
    color: "#334155",
    fontSize: "16px",
    fontWeight: 600,
  },

  helper: {
    margin: "8px 0 26px",
    textAlign: "center",
    color: "#64748b",
    fontSize: "13px",
    lineHeight: 1.6,
  },

  errorBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "9px",
    padding: "12px",
    marginBottom: "18px",
    borderRadius: "9px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  field: {
    marginBottom: "18px",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    color: "#334155",
    fontSize: "13px",
    fontWeight: 600,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 13px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "14px",
  },

  button: {
    width: "100%",
    minHeight: "46px",
    marginTop: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    border: "none",
    borderRadius: "9px",
    background: "#4f46e5",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: 650,
  },

  footer: {
    margin: "20px 0 0",
    color: "#64748b",
    textAlign: "center",
    fontSize: "12px",
    lineHeight: 1.6,
  },
};
