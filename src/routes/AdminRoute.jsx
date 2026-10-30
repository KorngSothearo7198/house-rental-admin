
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";

export default function AdminRoute() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;

      setLoading(true);

      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!active) return;

        if (!userSnap.exists()) {
          setRole("profile-missing");
          return;
        }

        const data = userSnap.data();
        const userRole = String(data.role || "")
          .trim()
          .toLowerCase();

        const accountStatus = String(
          data.accountStatus || "active"
        )
          .trim()
          .toLowerCase();

        if (accountStatus !== "active") {
          setRole("inactive");
          return;
        }

        setRole(userRole);
      } catch (error) {
        console.error("AdminRoute error:", error);

        if (active) {
          setRole("verification-error");
        }
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (loading) {
    return <div style={loadingStyle}>Verifying access...</div>;
  }

  if (!auth.currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (role === "owner") {
    return <Navigate to="/owner/dashboard" replace />;
  }

  if (role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

const loadingStyle = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  color: "#475569",
  fontSize: "15px",
};
