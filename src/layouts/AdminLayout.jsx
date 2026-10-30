import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import AdminSidebar from "../components/AdminSidebar";

export default function AdminLayout() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        backgroundColor: "#f1f5f9",
        overflow: "hidden",
      }}
    >
      {/* Admin Navbar */}
      <Navbar />

      {/* Main Area */}
      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          width: "100%",
        }}
      >
        {/* Admin Sidebar */}
        <AdminSidebar />

        {/* Admin Content */}
        <main
          style={{
            flex: 1,
            padding: "24px",
            overflowY: "auto",
            minWidth: 0,
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}