// import React from "react";
// import { NavLink, useNavigate } from "react-router-dom";
// import { signOut } from "firebase/auth";
// import { auth } from "../services/firebase"; // ✅ Path ត្រូវហើយសម្រាប់ src/components/Sidebar.jsx
// import {
//   LayoutDashboard,
//   Users,
//   Building2,
//   Home,
//   Grid,
//   CalendarCheck,
//   BarChart3,
//   Settings,
//   LogOut,
//   Building
// } from "lucide-react";

// export default function Sidebar() {
//   const navigate = useNavigate();

//   const handleLogout = async () => {
//     try {
//       await signOut(auth);
//       navigate("/login");
//     } catch (error) {
//       console.error("Logout error:", error);
//     }
//   };

//   const mainNavs = [
//     { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
//     { name: "Users", path: "/admin/users", icon: Users },
//     { name: "Owners", path: "/admin/owners", icon: Building2 },
//     { name: "Rooms", path: "/admin/rooms", icon: Home },
//     { name: "Categories", path: "/admin/categories", icon: Grid },
//     { name: "Bookings", path: "/admin/bookings", icon: CalendarCheck },
//   ];

//   const secondaryNavs = [
//     { name: "Reports", path: "/admin/reports", icon: BarChart3 },
//     { name: "Settings", path: "/admin/settings", icon: Settings },
//   ];

//   return (
//     <aside style={{
//       width: "260px",
//       minWidth: "260px",
//       height: "100vh",
//       backgroundColor: "#0f172a", // Slate 900
//       color: "#f8fafc",
//       padding: "24px 16px",
//       display: "flex",
//       flexDirection: "column",
//       justifyContent: "space-between",
//       boxSizing: "border-box",
//       borderRight: "1px solid #1e293b",
//       fontFamily: "Inter, sans-serif"
//     }}>
//       <div>
//         {/* 🏢 BRAND LOGO HEADER */}
//         <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0 8px 24px 8px", borderBottom: "1px solid #1e293b" }}>
//           <div style={{
//             backgroundColor: "#0284c7",
//             padding: "8px",
//             borderRadius: "10px",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             boxShadow: "0 4px 12px rgba(2, 132, 199, 0.3)"
//           }}>
//             <Building size={20} color="#ffffff" />
//           </div>
//           <div>
//             <h2 style={{ color: "#ffffff", fontSize: "16px", fontWeight: "700", margin: 0, letterSpacing: "-0.3px" }}>
//               House Rental
//             </h2>
//             <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "500" }}>Admin Portal</span>
//           </div>
//         </div>

//         {/* 📌 MAIN NAVIGATION */}
//         <div style={{ marginTop: "24px" }}>
//           <p style={sectionHeaderStyle}>Main Menu</p>
//           <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
//             {mainNavs.map((item) => (
//               <SidebarItem key={item.path} item={item} />
//             ))}
//           </nav>
//         </div>

//         {/* 📊 ANALYTICS & SYSTEM */}
//         <div style={{ marginTop: "24px" }}>
//           <p style={sectionHeaderStyle}>Analytics & System</p>
//           <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
//             {secondaryNavs.map((item) => (
//               <SidebarItem key={item.path} item={item} />
//             ))}
//           </nav>
//         </div>
//       </div>

//       {/* 🚪 LOGOUT BUTTON */}
//       <div style={{ borderTop: "1px solid #1e293b", paddingTop: "16px" }}>
//         <button
//           onClick={handleLogout}
//           style={logoutButtonStyle}
//           onMouseEnter={(e) => {
//             e.currentTarget.style.backgroundColor = "#ef4444";
//             e.currentTarget.style.color = "#ffffff";
//           }}
//           onMouseLeave={(e) => {
//             e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
//             e.currentTarget.style.color = "#f87171";
//           }}
//         >
//           <LogOut size={18} />
//           <span>Logout</span>
//         </button>
//       </div>
//     </aside>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // HELPER COMPONENTS & STYLES
// // ─────────────────────────────────────────────────────────────────────────────

// function SidebarItem({ item }) {
//   const Icon = item.icon;

//   return (
//     <NavLink
//       to={item.path}
//       end={item.path === "/"} // ការពារកុំឱ្យ Dashboard Active រហូតពេលចូល Route ផ្សេង
//       style={({ isActive }) => ({
//         display: "flex",
//         alignItems: "center",
//         gap: "12px",
//         padding: "10px 12px",
//         borderRadius: "8px",
//         textDecoration: "none",
//         fontSize: "14px",
//         fontWeight: isActive ? "600" : "500",
//         color: isActive ? "#ffffff" : "#94a3b8",
//         backgroundColor: isActive ? "#0284c7" : "transparent",
//         boxShadow: isActive ? "0 2px 8px rgba(2, 132, 199, 0.25)" : "none",
//         transition: "all 0.2s ease"
//       })}
//     >
//       {({ isActive }) => (
//         <>
//           <Icon size={18} color={isActive ? "#ffffff" : "#94a3b8"} />
//           <span>{item.name}</span>
//         </>
//       )}
//     </NavLink>
//   );
// }

// const sectionHeaderStyle = {
//   fontSize: "11px",
//   fontWeight: "700",
//   color: "#475569",
//   textTransform: "uppercase",
//   letterSpacing: "0.8px",
//   margin: "0 0 8px 12px"
// };

// const logoutButtonStyle = {
//   display: "flex",
//   alignItems: "center",
//   justifyContent: "center",
//   gap: "10px",
//   width: "100%",
//   padding: "10px",
//   backgroundColor: "rgba(239, 68, 68, 0.1)",
//   color: "#f87171",
//   border: "1px solid rgba(239, 68, 68, 0.2)",
//   borderRadius: "8px",
//   cursor: "pointer",
//   fontWeight: "600",
//   fontSize: "14px",
//   transition: "all 0.2s ease"
// };


import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import {
  LayoutDashboard,
  Users,
  Building2,
  Home,
  Grid,
  CalendarCheck,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut
} from "lucide-react";

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navItems = [ 
    { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { name: "Users", path: "/admin/users", icon: Users },
    { name: "subscriptions", path: "/admin/subscriptions", icon: Users },
    { name: "Owners", path: "/admin/owners", icon: Building2 },
    { name: "Rooms", path: "/admin/rooms", icon: Home },
    { name: "Categories", path: "/admin/categories", icon: Grid },
    // { name: "Bookings", path: "/admin/bookings", icon: CalendarCheck },
    { name: "Settings", path: "/admin/settings", icon: Settings },
    { name: "Help", path: "/admin/help", icon: HelpCircle },
  ];

  return (
    <aside
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        width: "80px",
        height: "calc(100vh - 150px)",
        margin: "20px 12px",
        boxSizing: "border-box"
      }}
    >
      {/* ⚪ TOP FLOATING CAPSULE NAVIGATION */}
      <div
        style={{
          width: "100%",
          backgroundColor: "#ffffff",
          borderRadius: "44px",
          padding: "8px 0 24px 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.03)"
        }}
      >
        {navItems.map((item) => (
          <SidebarItem key={item.path} item={item} />
        ))}
      </div>

      {/* 🚪 BOTTOM ACTIONS (LOGOUT & AVATAR) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
          marginBottom: "10px"
        }}
      >
        <button
          onClick={handleLogout}
          title="Logout"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#1e1e24"
          }}
        >
          <LogOut size={24} strokeWidth={1.8} />
        </button>

        {/* PROFILE AVATAR */}
        {/* <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            overflow: "hidden",
            backgroundColor: "#e2e8f0"
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"
            alt="Profile"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div> */}
      </div>
    </aside>
  );
}

function SidebarItem({ item }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      end={item.path === "/admin"}
      title={item.name}
      style={({ isActive }) => ({
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "56px",
        height: "56px",
        borderRadius: "50%",
        textDecoration: "none",
        backgroundColor: isActive ? "#232328" : "transparent",
        color: isActive ? "#ffffff" : "#1e1e24",
        transition: "all 0.2s ease"
      })}
    >
      {({ isActive }) => (
        <Icon size={24} strokeWidth={1.8} color={isActive ? "#ffffff" : "#1e1e24"} />
      )}
    </NavLink>
  );
}