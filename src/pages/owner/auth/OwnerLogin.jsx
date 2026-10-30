import React, { useState } from "react";

import { auth, db } from "../../../services/firebase";

import { signInWithEmailAndPassword, signOut } from "firebase/auth";

import { doc, getDoc } from "firebase/firestore";

import { useNavigate } from "react-router-dom";

import {
  Building2,
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

export default function OwnerLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ============================================================
  // OWNER LOGIN
  // ============================================================
  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      // ========================================================
      // 1. LOGIN WITH FIREBASE AUTHENTICATION
      // ========================================================
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      const user = userCredential.user;

      // ========================================================
      // 2. GET USER DOCUMENT
      // users/{uid}
      // ========================================================
      const userDocRef = doc(db, "users", user.uid);

      const userDocSnap = await getDoc(userDocRef);

      // ========================================================
      // 3. USER DOCUMENT DOES NOT EXIST
      // ========================================================
      if (!userDocSnap.exists()) {
        await signOut(auth);

        setError("Access denied. Your user account record was not found.");

        return;
      }

      // ========================================================
      // 4. GET USER DATA
      // ========================================================
      const userData = userDocSnap.data();

      // ========================================================
      // 5. CHECK ROLE
      // ONLY OWNER CAN LOGIN
      // ========================================================
      const role = String(userData.role || "")
        .trim()
        .toLowerCase();

      if (role !== "owner") {
        await signOut(auth);

        setError(
          "Access Restricted: Only owner accounts can access the Owner Portal.",
        );

        return;
      }

      // ========================================================
      // 6. OPTIONAL: CHECK ACCOUNT STATUS
      // ========================================================
      const accountStatus = String(userData.accountStatus || "active")
        .trim()
        .toLowerCase();

      if (accountStatus !== "active") {
        await signOut(auth);

        setError(
          "Your owner account is not active. Please contact the administrator.",
        );

        return;
      }

      // ========================================================
      // 7. OWNER LOGIN SUCCESS
      // ========================================================
      navigate("/owner/dashboard", {
        replace: true,
      });
    } catch (err) {
      console.error("Owner Login Error:", err);

      // ========================================================
      // FIREBASE AUTH ERRORS
      // ========================================================
      switch (err.code) {
        case "auth/invalid-credential":
        case "auth/user-not-found":
        case "auth/wrong-password":
          setError("Invalid email or password.");
          break;

        case "auth/too-many-requests":
          setError("Too many login attempts. Please try again later.");
          break;

        case "auth/user-disabled":
          setError("This account has been disabled.");
          break;

        case "permission-denied":
          setError(
            "You do not have permission to access your account information.",
          );
          break;

        default:
          setError(
            "Sign-in failed. Please check your network and credentials.",
          );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* ======================================================
          LEFT VISUAL SIDE
      ====================================================== */}
      <div className="left-panel" style={styles.leftPanel}>
        <div style={styles.imageWrapper}>
          <img
            src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=2000"
            alt="Modern library architecture"
            style={styles.heroImage}
          />

          <div style={styles.imageOverlay} />
        </div>
      </div>

      {/* ======================================================
          RIGHT FORM SIDE
      ====================================================== */}
      <div style={styles.rightPanel}>
        <div style={styles.formCard}>
          {/* Brand */}
          <div style={styles.brandRow}>
            <div style={styles.logoBadge}>
              <Building2 size={20} color="#0284c7" />
            </div>

            <span style={styles.brandName}>Owner Portal</span>
          </div>

          {/* Heading */}
          <h1 style={styles.heading}>Login to your Account</h1>

          <p style={styles.subheading}>
            Welcome back! Manage your properties and revenue.
          </p>

          {/* Error */}
          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={16} />

              <span>{error}</span>
            </div>
          )}

          {/* Social buttons */}
          <div style={styles.socialRow}>
            <button type="button" style={styles.socialBtn}>
              <img
                src="https://www.svgrepo.com/show/475647/facebook-color.svg"
                alt="Facebook"
                width={18}
                height={18}
              />
              Facebook
            </button>

            <button type="button" style={styles.socialBtn}>
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                width={18}
                height={18}
              />
              Google
            </button>
          </div>

          {/* Divider */}
          <div style={styles.divider}>
            <span>or continue with email</span>
          </div>

          {/* ==================================================
              LOGIN FORM
          ================================================== */}
          <form onSubmit={handleLogin} style={styles.form}>
            {/* Email */}
            <div>
              <label style={styles.label}>Email Address</label>

              <div style={styles.inputWrapper}>
                <Mail size={18} color="#94a3b8" />

                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.input}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={styles.label}>Password</label>

              <div style={styles.inputWrapper}>
                <Lock size={18} color="#94a3b8" />

                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.input}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember / Forgot */}
            <div style={styles.rowBetween}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={styles.checkbox}
                />
                Remember Me
              </label>

              <a
                href="#"
                style={styles.forgotLink}
                onClick={(e) => e.preventDefault()}
              >
                Forgot Password?
              </a>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitBtn,
                opacity: loading ? 0.75 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? (
                <>
                  <Loader2
                    size={20}
                    style={{
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  Checking Owner Access...
                </>
              ) : (
                "Login"
              )}
            </button>
          </form>

          {/* Register */}
          <p style={styles.footerText}>
            New on our platform?{" "}
            <a href="/owner/register" style={styles.createLink}>
              Create an account
            </a>
          </p>
        </div>
      </div>

      {/* Spinner */}
      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }

          @media (min-width: 900px) {
            .left-panel {
              display: block !important;
            }
          }
        `}
      </style>
    </div>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    backgroundColor: "#f1f5f9",
  },

  leftPanel: {
    flex: "1 1 50%",
    display: "none",
    position: "relative",
    overflow: "hidden",
  },

  imageWrapper: {
    position: "absolute",
    inset: 0,
  },

  heroImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  imageOverlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to right, rgba(0,0,0,0.05), transparent)",
  },

  rightPanel: {
    flex: "1 1 50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 24px",
    backgroundColor: "#ffffff",
  },

  formCard: {
    width: "100%",
    maxWidth: "420px",
  },

  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "28px",
  },

  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#e0f2fe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  brandName: {
    fontSize: 16,
    fontWeight: 600,
    color: "#0f172a",
  },

  heading: {
    fontSize: 28,
    fontWeight: 700,
    color: "#0f172a",
    margin: "0 0 8px",
    letterSpacing: "-0.3px",
  },

  subheading: {
    fontSize: 15,
    color: "#64748b",
    margin: "0 0 28px",
  },

  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 14px",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 10,
    color: "#dc2626",
    fontSize: 13.5,
    marginBottom: 20,
  },

  socialRow: {
    display: "flex",
    gap: 12,
    marginBottom: 20,
  },

  socialBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "11px 16px",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    backgroundColor: "#fff",
    fontSize: 14,
    fontWeight: 500,
    color: "#334155",
    cursor: "pointer",
  },

  divider: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "8px 0 24px",
    color: "#94a3b8",
    fontSize: 13,
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },

  label: {
    display: "block",
    fontSize: 13.5,
    fontWeight: 600,
    color: "#334155",
    marginBottom: 6,
  },

  inputWrapper: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    backgroundColor: "#fff",
  },

  input: {
    border: "none",
    outline: "none",
    width: "100%",
    fontSize: 14.5,
    color: "#0f172a",
    background: "transparent",
  },

  eyeBtn: {
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    color: "#94a3b8",
    display: "flex",
  },

  rowBetween: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },

  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: "#475569",
    cursor: "pointer",
  },

  checkbox: {
    width: 16,
    height: 16,
    accentColor: "#0284c7",
  },

  forgotLink: {
    fontSize: 14,
    color: "#0284c7",
    textDecoration: "none",
    fontWeight: 500,
  },

  submitBtn: {
    width: "100%",
    padding: "13px",
    backgroundColor: "#0284c7",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 15.5,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },

  footerText: {
    textAlign: "center",
    marginTop: 28,
    fontSize: 14,
    color: "#64748b",
  },

  createLink: {
    color: "#0284c7",
    fontWeight: 600,
    textDecoration: "none",
  },
};
