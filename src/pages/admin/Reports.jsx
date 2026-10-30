import React, { useState, useEffect, useMemo } from "react";
import { auth, db } from "../../services/firebase";
import { collection, getDocs } from "firebase/firestore";

import { 
  Users, 
  Home, 
  Calendar, 
  Building2, 
  UserCheck, 
  UserX, 
  DoorOpen, 
  DoorClosed, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  MapPin,
  Tag,
  TrendingUp,
  BarChart3,
  Loader2
} from "lucide-react";

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from "recharts";

const CATEGORY_COLORS = ["#0284c7", "#0d9488", "#8b5cf6", "#f59e0b", "#ec4899", "#6366f1"];

export default function Reports() {
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);

  // Firestore Raw Data States
  const [rawUsers, setRawUsers] = useState([]);
  const [rawProperties, setRawProperties] = useState([]);
  const [rawBookings, setRawBookings] = useState([]);

  // 1. 🔄 FETCH REAL DATA FROM FIREBASE FIRESTORE
  useEffect(() => {
    const fetchRealData = async () => {
      setLoading(true);
      try {
        const [usersSnap, propertiesSnap, bookingsSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "properties")),
          getDocs(collection(db, "bookings"))
        ]);

        const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const properties = propertiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const bookings = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setRawUsers(users);
        setRawProperties(properties);
        setRawBookings(bookings);
      } catch (error) {
        console.error("Error loading real data for reports:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRealData();
  }, []);

  // 2. 📊 AGGREGATE & PROCESS REAL DATA
  const reportData = useMemo(() => {
    // A. Users Calculations
    const renters = rawUsers.filter(u => u.role === "renter");
    const owners = rawUsers.filter(u => u.role === "owner");
    const blocked = rawUsers.filter(u => u.status === "blocked" || u.isBlocked === true);

    // Filter New Users (created in current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newUsersCount = rawUsers.filter(u => {
      if (!u.createdAt) return false;
      const createdDate = u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
      return createdDate >= startOfMonth;
    }).length;

    // B. Rental Rooms Calculations
    const totalRooms = rawProperties.length;
    
    // Check rented rooms based on approved bookings
    const approvedBookings = rawBookings.filter(b => (b.status || "").toLowerCase() === "approved");
    const rentedHouseIds = new Set(approvedBookings.map(b => b.houseId || b.propertyId));
    
    const rentedRoomsCount = rawProperties.filter(p => rentedHouseIds.has(p.id) || p.status === "rented").length;
    const suspendedRoomsCount = rawProperties.filter(p => p.status === "suspended" || p.status === "inactive").length;
    const availableRoomsCount = Math.max(0, totalRooms - rentedRoomsCount - suspendedRoomsCount);

    // Group Rooms by Category
    const categoryMap = {};
    rawProperties.forEach(p => {
      const cat = p.category || p.type || "Other";
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });
    const byCategory = Object.keys(categoryMap).map((cat, index) => ({
      name: cat,
      count: categoryMap[cat],
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
    }));

    // Group Rooms by Location
    const locationMap = {};
    rawProperties.forEach(p => {
      const loc = p.location || p.city || p.address || "Unknown";
      locationMap[loc] = (locationMap[loc] || 0) + 1;
    });
    const byLocation = Object.keys(locationMap).map(loc => ({
      location: loc,
      count: locationMap[loc]
    })).sort((a, b) => b.count - a.count).slice(0, 5); // Top 5 locations

    // C. Bookings Calculations
    const totalBookingsCount = rawBookings.length;
    const pendingBookings = rawBookings.filter(b => (b.status || "").toLowerCase() === "pending").length;
    const approvedBookingsCount = approvedBookings.length;
    const rejectedBookings = rawBookings.filter(b => (b.status || "").toLowerCase() === "rejected").length;
    const cancelledBookings = rawBookings.filter(b => (b.status || "").toLowerCase() === "cancelled").length;

    // D. Top Owners Activity
    const ownerBookingMap = {};
    rawBookings.forEach(b => {
      if (b.ownerId) {
        ownerBookingMap[b.ownerId] = (ownerBookingMap[b.ownerId] || 0) + 1;
      }
    });

    const topOwners = owners.map(owner => {
      const ownerRooms = rawProperties.filter(p => p.ownerId === owner.id || p.userId === owner.id).length;
      return {
        id: owner.id,
        name: owner.displayName || owner.name || owner.email || "Unknown Owner",
        roomsCount: ownerRooms,
        totalBookings: ownerBookingMap[owner.id] || 0,
        status: owner.status || "Active"
      };
    }).sort((a, b) => b.totalBookings - a.totalBookings).slice(0, 5);

    return {
      users: {
        totalRenters: renters.length,
        totalOwners: owners.length,
        newUsers: newUsersCount,
        blockedUsers: blocked.length
      },
      rentals: {
        totalRooms,
        availableRooms: availableRoomsCount,
        rentedRooms: rentedRoomsCount,
        suspendedRooms: suspendedRoomsCount,
        byCategory: byCategory.length > 0 ? byCategory : [{ name: "No Data", count: 1, color: "#cbd5e1" }],
        byLocation: byLocation.length > 0 ? byLocation : [{ location: "No Data", count: 0 }]
      },
      bookings: {
        totalBookings: totalBookingsCount,
        pendingBookings,
        approvedBookings: approvedBookingsCount,
        rejectedBookings,
        cancelledBookings
      },
      owners: {
        totalOwners: owners.length,
        activeOwners: owners.filter(o => o.status !== "blocked").length,
        topOwners
      }
    };
  }, [rawUsers, rawProperties, rawBookings]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", fontFamily: "Inter, sans-serif" }}>
      
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#0f172a", margin: 0 }}>
            Reports & Analytics
          </h1>
          <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "14px" }}>
            Real-time aggregated analytics directly from Firestore.
          </p>
        </div>

        {/* Tab Filters */}
        <div style={{ display: "flex", gap: "6px", backgroundColor: "#f1f5f9", padding: "4px", borderRadius: "8px" }}>
          {["all", "users", "rentals", "bookings", "owners"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "none",
                fontSize: "13px",
                fontWeight: "600",
                textTransform: "capitalize",
                cursor: "pointer",
                backgroundColor: activeTab === tab ? "#ffffff" : "transparent",
                color: activeTab === tab ? "#0284c7" : "#64748b",
                boxShadow: activeTab === tab ? "0 1px 2px rgba(0,0,0,0.05)" : "none"
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "80px", color: "#0284c7", gap: "10px" }}>
          <Loader2 className="animate-spin" size={24} /> Generating Real-Time Reports...
        </div>
      ) : (
        <>
          {/* SECTION 1: USER REPORTS */}
          {(activeTab === "all" || activeTab === "users") && (
            <ReportSection title="User Reports" icon={<Users size={20} color="#0284c7" />}>
              <div style={grid4Style}>
                <MetricCard title="Total Renters" value={reportData.users.totalRenters} icon={<Users color="#0284c7" />} />
                <MetricCard title="Total Owners" value={reportData.users.totalOwners} icon={<Building2 color="#8b5cf6" />} />
                <MetricCard title="New Users" value={reportData.users.newUsers} icon={<UserCheck color="#10b981" />} badge="This Month" />
                <MetricCard title="Blocked Users" value={reportData.users.blockedUsers} icon={<UserX color="#ef4444" />} danger />
              </div>
            </ReportSection>
          )}

          {/* SECTION 2: RENTAL ROOM REPORTS */}
          {(activeTab === "all" || activeTab === "rentals") && (
            <ReportSection title="Rental Room Reports" icon={<Home size={20} color="#8b5cf6" />}>
              <div style={grid4Style}>
                <MetricCard title="Total Rooms" value={reportData.rentals.totalRooms} icon={<Home color="#8b5cf6" />} />
                <MetricCard title="Available Rooms" value={reportData.rentals.availableRooms} icon={<DoorOpen color="#10b981" />} />
                <MetricCard title="Rented Rooms" value={reportData.rentals.rentedRooms} icon={<DoorClosed color="#f59e0b" />} />
                <MetricCard title="Suspended Rooms" value={reportData.rentals.suspendedRooms} icon={<ShieldAlert color="#ef4444" />} danger />
              </div>

              {/* Room Charts Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px", marginTop: "16px" }}>
                {/* Category Chart */}
                <div style={cardBoxStyle}>
                  <h4 style={cardHeaderStyle}><Tag size={16} color="#0284c7" /> Rooms by Category</h4>
                  <div style={{ width: "100%", height: 220, marginTop: "10px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={reportData.rentals.byCategory} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                          {reportData.rentals.byCategory.map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Location Chart */}
                <div style={cardBoxStyle}>
                  <h4 style={cardHeaderStyle}><MapPin size={16} color="#f59e0b" /> Rooms by Location</h4>
                  <div style={{ width: "100%", height: 220, marginTop: "10px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportData.rentals.byLocation} layout="vertical">
                        <XAxis type="number" fontSize={11} stroke="#64748b" />
                        <YAxis dataKey="location" type="category" fontSize={11} stroke="#64748b" width={90} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </ReportSection>
          )}

          {/* SECTION 3: BOOKING REPORTS */}
          {(activeTab === "all" || activeTab === "bookings") && (
            <ReportSection title="Booking Reports" icon={<Calendar size={20} color="#10b981" />}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                <MetricCard title="Total Bookings" value={reportData.bookings.totalBookings} icon={<BarChart3 color="#0284c7" />} />
                <MetricCard title="Pending" value={reportData.bookings.pendingBookings} icon={<Clock color="#f59e0b" />} />
                <MetricCard title="Approved" value={reportData.bookings.approvedBookings} icon={<CheckCircle2 color="#10b981" />} />
                <MetricCard title="Rejected" value={reportData.bookings.rejectedBookings} icon={<XCircle color="#ef4444" />} />
                <MetricCard title="Cancelled" value={reportData.bookings.cancelledBookings} icon={<AlertCircle color="#64748b" />} />
              </div>
            </ReportSection>
          )}

          {/* SECTION 4: OWNER REPORTS */}
          {(activeTab === "all" || activeTab === "owners") && (
            <ReportSection title="Owner Reports & Activity" icon={<Building2 size={20} color="#8b5cf6" />}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "16px" }}>
                <MetricCard title="Total Owners" value={reportData.owners.totalOwners} icon={<Building2 color="#8b5cf6" />} />
                <MetricCard title="Active Owners" value={reportData.owners.activeOwners} icon={<UserCheck color="#10b981" />} />
              </div>

              {/* Top Owners Table / Activity */}
              <div style={cardBoxStyle}>
                <h4 style={cardHeaderStyle}><TrendingUp size={16} color="#10b981" /> Top Owner Booking Activity</h4>
                <div style={{ overflowX: "auto", marginTop: "12px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                        <th style={thStyle}>Owner Name</th>
                        <th style={thStyle}>Total Rooms</th>
                        <th style={thStyle}>Total Booking Activity</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.owners.topOwners.length > 0 ? (
                        reportData.owners.topOwners.map((owner) => (
                          <tr key={owner.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ ...tdStyle, fontWeight: "600", color: "#0f172a" }}>{owner.name}</td>
                            <td style={tdStyle}>{owner.roomsCount} Rooms</td>
                            <td style={{ ...tdStyle, fontWeight: "600", color: "#0284c7" }}>{owner.totalBookings} Bookings</td>
                            <td style={{ ...tdStyle, textAlign: "right" }}>
                              <span style={{ backgroundColor: "#ecfdf5", color: "#059669", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>
                                {owner.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ textAlign: "center", padding: "16px", color: "#94a3b8" }}>No owner records found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </ReportSection>
          )}
        </>
      )}

    </div>
  );
}

// HELPER COMPONENTS & STYLES
function ReportSection({ title, icon, children }) {
  return (
    <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", padding: "20px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid #f1f5f9" }}>
        {icon}
        <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#0f172a", margin: 0 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function MetricCard({ title, value, icon, badge, danger }) {
  return (
    <div style={{
      backgroundColor: "#f8fafc",
      borderRadius: "8px",
      padding: "16px",
      border: danger ? "1px solid #fecaca" : "1px solid #e2e8f0",
      display: "flex",
      justifySpace: "space-between",
      alignItems: "flex-start"
    }}>
      <div>
        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "500", display: "block" }}>{title}</span>
        <span style={{ fontSize: "22px", fontWeight: "bold", color: danger ? "#dc2626" : "#0f172a", marginTop: "4px", display: "block" }}>
          {value.toLocaleString()}
        </span>
        {badge && (
          <span style={{ fontSize: "10px", backgroundColor: "#e0f2fe", color: "#0369a1", padding: "2px 6px", borderRadius: "4px", marginTop: "4px", display: "inline-block", fontWeight: "600" }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{ backgroundColor: "#ffffff", padding: "8px", borderRadius: "6px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
        {icon}
      </div>
    </div>
  );
}

const grid4Style = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" };
const cardBoxStyle = { backgroundColor: "#ffffff", borderRadius: "8px", padding: "16px", border: "1px solid #e2e8f0" };
const cardHeaderStyle = { margin: 0, fontSize: "14px", fontWeight: "bold", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" };

const thStyle = { padding: "10px 12px", color: "#64748b", fontWeight: "600" };
const tdStyle = { padding: "10px 12px" };