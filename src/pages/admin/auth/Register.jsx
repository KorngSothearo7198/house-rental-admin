import { useEffect, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

import { auth, db } from "../../../services/firebase";

import { UserPlus, Loader2, AlertCircle } from "lucide-react";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const navigate = useNavigate();

  // ============================================================
  // CHECK CURRENT USER
  // ONLY ADMIN CAN OPEN THIS PAGE
  // ============================================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        // No Firebase user
        if (!user) {
          setIsAdmin(false);
          navigate("/login", { replace: true });
          return;
        }

        // Get current user's Firestore document
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        // User document doesn't exist
        if (!userDocSnap.exists()) {
          await signOut(auth);

          setIsAdmin(false);
          navigate("/login", { replace: true });
          return;
        }

        const userData = userDocSnap.data();

        // Normalize role
        const role = String(userData.role || "")
          .trim()
          .toLowerCase();

        // ONLY ADMIN
        if (role !== "admin") {
          await signOut(auth);

          setIsAdmin(false);
          navigate("/login", { replace: true });
          return;
        }

        // Current user is admin
        setIsAdmin(true);
      } catch (err) {
        console.error("Admin verification error:", err);

        setIsAdmin(false);

        await signOut(auth);

        navigate("/login", { replace: true });
      } finally {
        setCheckingAdmin(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // ============================================================
  // CREATE ADMIN ACCOUNT
  // ============================================================
  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");

    // Extra protection
    if (!isAdmin) {
      setError("Access denied. Only administrators can create accounts.");
      return;
    }

    setLoading(true);

    try {
      // ========================================================
      // 1. Create Firebase Authentication account
      // ========================================================
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      const user = userCredential.user;

      // ========================================================
      // 2. Create Firestore user document
      // ========================================================
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,

        fullName: fullName.trim() || "System Admin",

        email: email.trim(),

        phone: phone.trim() || "N/A",

        // IMPORTANT
        role: "admin",

        accountStatus: "active",

        address: "Phnom Penh",

        occupation: "Administrator",

        profileImage: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,

        createdAt: serverTimestamp(),

        updatedAt: serverTimestamp(),
      });

      // ========================================================
      // 3. New account created successfully
      // ========================================================
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Registration Error:", err);

      // If Firestore creation fails after Auth account creation,
      // the Auth account may already exist.
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered!");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err.code === "permission-denied") {
        setError("You do not have permission to create this account.");
      } else {
        setError("Failed to create admin account.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // CHECKING ADMIN
  // ============================================================
  if (checkingAdmin) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#f8fafc",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#475569",
            fontSize: "14px",
          }}
        >
          <Loader2
            size={18}
            style={{
              animation: "spin 1s linear infinite",
            }}
          />
          Checking administrator access...
        </div>

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
          `}
        </style>
      </div>
    );
  }

  // ============================================================
  // DO NOT RENDER REGISTER PAGE IF NOT ADMIN
  // ============================================================
  if (!isAdmin) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        fontFamily: "Inter, sans-serif",
        padding: "20px",
      }}
    >
      <form
        onSubmit={handleRegister}
        style={{
          background: "#ffffff",
          padding: "32px",
          borderRadius: "12px",
          boxShadow:
            "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
          width: "360px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          border: "1px solid #e2e8f0",
        }}
      >
        {/* Header */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              backgroundColor: "#e0f2fe",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <UserPlus color="#0284c7" size={24} />
          </div>

          <h2
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: "22px",
              fontWeight: "700",
            }}
          >
            Register Admin
          </h2>

          <p
            style={{
              margin: "4px 0 0",
              fontSize: "13px",
              color: "#64748b",
            }}
          >
            Create a new administrative account
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "#fef2f2",
              color: "#dc2626",
              padding: "10px",
              borderRadius: "6px",
              fontSize: "13px",
              border: "1px solid #fecaca",
            }}
          >
            <AlertCircle
              size={16}
              style={{
                flexShrink: 0,
              }}
            />

            <span>{error}</span>
          </div>
        )}

        {/* Full Name */}
        <div>
          <label style={labelStyle}>Full Name</label>

          <input
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        {/* Email */}
        <div>
          <label style={labelStyle}>Email Address</label>

          <input
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        {/* Phone */}
        <div>
          <label style={labelStyle}>Phone Number</label>

          <input
            type="tel"
            placeholder="096XXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Password */}
        <div>
          <label style={labelStyle}>Password</label>

          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />
        </div>

        {/* Create Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: loading ? "#7dd3fc" : "#0284c7",

            color: "#ffffff",

            padding: "10px",

            border: "none",

            borderRadius: "6px",

            cursor: loading ? "not-allowed" : "pointer",

            fontWeight: "600",

            fontSize: "14px",

            display: "flex",

            alignItems: "center",

            justifyContent: "center",

            gap: "8px",

            marginTop: "8px",
          }}
        >
          {loading ? (
            <>
              <Loader2
                size={18}
                style={{
                  animation: "spin 1s linear infinite",
                }}
              />
              Creating Admin...
            </>
          ) : (
            "Create Admin Account"
          )}
        </button>

        {/* Login */}
        <p
          style={{
            fontSize: "13px",
            textAlign: "center",
            color: "#64748b",
            margin: 0,
          }}
        >
          Already have an account?{" "}
          <Link
            to="/login"
            style={{
              color: "#0284c7",
              textDecoration: "none",
              fontWeight: "600",
            }}
          >
            Login
          </Link>
        </p>
      </form>

      {/* Animation */}
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
        `}
      </style>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: "12px",
  fontWeight: "600",
  color: "#475569",
  marginBottom: "4px",
};

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: "6px",
  border: "1px solid #cbd5e1",
  outline: "none",
  fontSize: "14px",
  boxSizing: "border-box",
};
