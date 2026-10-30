// import { Outlet } from "react-router-dom";
// import Navbar from "../components/Navbar";
// import Sidebar from "../components/Sidebar";

// export default function MainLayout() {
//   return (
//     <div style={{
//       display: "flex",
//       flexDirection: "column",
//       width: "100vw",
//       height: "100vh",
//       position: "fixed",
//       top: 0,
//       left: 0,
//       backgroundColor: "#f1f5f9"
//     }}>
//       {/* Top Navbar */}
//       <Navbar />

//       {/* Main Area */}
//       <div style={{ display: "flex", flex: 1, height: "calc(100vh - 60px)", width: "100%" }}>
//         {/* Left Sidebar */}
//         <Sidebar />

//         {/* Right Page Content */}
//         <main style={{ flex: 1, padding: "24px", overflowY: "auto" }}>
//           <Outlet />
//         </main>
//       </div>
//     </div>
//   );
// }