import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";

import {
  LayoutDashboard,
  Building,
  PlusCircle,
  CalendarCheck,
  Users,
  CreditCard,
  MessageSquare,
  Bell,
  FolderTree,
  BarChart3,
  User,
  Settings,
  LogOut,
} from "lucide-react";

export default function OwnerSidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const mainNavs = [
    {
      name: "Dashboard",
      path: "/owner/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "My Properties",
      path: "/owner/properties",
      icon: Building,
    },
    
    {
      name: "Bookings",
      path: "/owner/bookings",
      icon: CalendarCheck,
    },
    {
      name: "Renters",
      path: "/owner/renters",
      icon: Users,
    },
    {
      name: "Payments",
      path: "/owner/payments",
      icon: CreditCard,
    },
    {
      name: "Messenger",
      path: "/owner/messages",
      icon: MessageSquare,
    },
    {
      name: "Notifications",
      path: "/owner/notifications",
      icon: Bell,
    },
    // {
    //   name: "Categories",
    //   path: "/owner/categories",
    //   icon: FolderTree,
    // },
    {
      name: "Reports",
      path: "/owner/reports",
      icon: BarChart3,
    },
  ];

  const secondaryNavs = [
    {
      name: "My Profile",
      path: "/owner/profile",
      icon: User,
    },
    {
      name: "Settings",
      path: "/owner/settings",
      icon: Settings,
    },
  ];

  return (
    <aside
      style={{
        width: "260px",
        minWidth: "260px",
        height: "100%",
        backgroundColor: "#0f172a",
        color: "#f8fafc",
        padding: "24px 16px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
        borderRight: "1px solid #1e293b",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{ overflowY: "auto" }}>
        {/* BRAND */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "0 8px 20px 8px",
            borderBottom: "1px solid #1e293b",
          }}
        >
          <div
            style={{
              backgroundColor: "#16a34a",
              padding: "8px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Building size={20} color="#ffffff" />
          </div>

          <div>
            <h2
              style={{
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "700",
                margin: 0,
              }}
            >
              House Rental
            </h2>

            <span
              style={{
                fontSize: "11px",
                color: "#64748b",
                fontWeight: "500",
              }}
            >
              Owner Portal
            </span>
          </div>
        </div>

        {/* MAIN MENU */}
        <div style={{ marginTop: "20px" }}>
          <p style={sectionHeaderStyle}>Main Menu</p>

          <nav
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {mainNavs.map((item) => (
              <SidebarItem key={item.path} item={item} />
            ))}
          </nav>
        </div>

        {/* ACCOUNT MENU */}
        <div style={{ marginTop: "20px" }}>
          <p style={sectionHeaderStyle}>Account</p>

          <nav
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {secondaryNavs.map((item) => (
              <SidebarItem key={item.path} item={item} />
            ))}
          </nav>
        </div>
      </div>

      {/* LOGOUT */}
      <div
        style={{
          borderTop: "1px solid #1e293b",
          paddingTop: "16px",
          marginTop: "16px",
        }}
      >
        <button onClick={handleLogout} style={logoutButtonStyle}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

function SidebarItem({ item }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      style={({ isActive }) => ({
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 12px",
        borderRadius: "8px",
        textDecoration: "none",
        fontSize: "13.5px",
        fontWeight: isActive ? "600" : "500",
        color: isActive ? "#ffffff" : "#94a3b8",
        backgroundColor: isActive ? "#16a34a" : "transparent",
        transition: "all 0.15s ease-in-out",
      })}
    >
      {({ isActive }) => (
        <>
          <Icon size={18} color={isActive ? "#ffffff" : "#94a3b8"} />
          <span>{item.name}</span>
        </>
      )}
    </NavLink>
  );
}

const sectionHeaderStyle = {
  fontSize: "11px",
  fontWeight: "700",
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: "0.8px",
  margin: "0 0 8px 12px",
};

const logoutButtonStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  width: "100%",
  padding: "10px",
  backgroundColor: "rgba(239, 68, 68, 0.1)",
  color: "#f87171",
  border: "1px solid rgba(239, 68, 68, 0.2)",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "14px",
  transition: "background-color 0.15s ease",
};