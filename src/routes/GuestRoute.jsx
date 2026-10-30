
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";

export default function GuestRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [destination, setDestination] = useState(null);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;

      setLoading(true);
      setDestination(null);

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!active) return;

        if (!userSnap.exists()) {
          setDestination(null);
          return;
        }

        const data = userSnap.data();
        const role = String(data.role || "")
          .trim()
          .toLowerCase();

        const accountStatus = String(
          data.accountStatus || "active"
        )
          .trim()
          .toLowerCase();

        if (accountStatus !== "active") {
          setDestination(null);
          return;
        }

        if (role === "admin") {
          setDestination("/admin/dashboard");
        } else if (role === "owner") {
          setDestination("/owner/dashboard");
        }
      } catch (error) {
        console.error("GuestRoute error:", error);
        setDestination(null);
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
    return (
      <div style={loadingStyle}>
        Checking your session...
      </div>
    );
  }

  if (destination) {
    return <Navigate to={destination} replace />;
  }

  return children;
}

const loadingStyle = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  color: "#475569",
};
