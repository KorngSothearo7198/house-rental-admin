import { Outlet } from "react-router-dom";
import OwnerNavbar from "../components/OwnerNavbar";
import OwnerSidebar from "../components/OwnerSidebar";

export default function OwnerLayout() {
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
      {/* Owner Navbar */}
      <OwnerNavbar />

      {/* Main Area */}
      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          width: "100%",
        }}
      >
        {/* Owner Sidebar */}
        <OwnerSidebar />

        {/* Owner Content */}
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
