import React, { useState, useEffect, useMemo } from "react";
import { auth } from "../../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  fetchOwnerBookings,
  approveBooking,
  rejectBooking,
  fetchRenterProfile,
  formatDate,
} from "../../services/bookingService";
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  Calendar,
  DollarSign,
  User,
  Building2,
  Loader2,
  X,
  Share2,
  Printer,
  LayoutGrid,
  List,
  BarChart3,
  TrendingUp,
} from "lucide-react";

export default function OwnerBookings() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"

  // Modals
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [renterData, setRenterData] = useState(null);
  const [fetchingRenter, setFetchingRenter] = useState(false);
  const [rejectingBookingId, setRejectingBookingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const list = await fetchOwnerBookings(user.uid);
        setBookings(list);
      } catch (err) {
        console.error("Error fetching bookings:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // ===== Stats =====
  const stats = useMemo(() => {
    const pending = bookings.filter((b) => b.status?.toLowerCase() === "pending").length;
    const approved = bookings.filter((b) => b.status?.toLowerCase() === "approved").length;
    const rejected = bookings.filter((b) => b.status?.toLowerCase() === "rejected").length;
    const cancelled = bookings.filter((b) => b.status?.toLowerCase() === "cancelled").length;
    const total = bookings.length;
    const totalRevenue = bookings
      .filter((b) => b.status?.toLowerCase() === "approved")
      .reduce((sum, b) => sum + (Number(b.totalAmount) || Number(b.price) || 0), 0);

    return { pending, approved, rejected, cancelled, total, totalRevenue };
  }, [bookings]);

  // Chart data (percentage for bars)
  const chartData = useMemo(() => {
    const total = stats.total || 1;
    return [
      { label: "Pending", value: stats.pending, percent: (stats.pending / total) * 100, color: "#d97706" },
      { label: "Approved", value: stats.approved, percent: (stats.approved / total) * 100, color: "#059669" },
      { label: "Rejected", value: stats.rejected, percent: (stats.rejected / total) * 100, color: "#dc2626" },
      { label: "Cancelled", value: stats.cancelled, percent: (stats.cancelled / total) * 100, color: "#64748b" },
    ];
  }, [stats]);

  // Filtered list
  const filteredBookings = useMemo(() => {
    return bookings.filter((item) => {
      const matchesSearch =
        (item.propertyTitle || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.renterName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.id || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || item.status?.toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchTerm, statusFilter]);

  // ===== Actions =====
  const handleApprove = async (booking) => {
    if (!window.confirm(`Approve booking request from ${booking.renterName || "Renter"}?`)) return;
    setProcessingAction(true);
    try {
      await approveBooking(booking);
      setBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? { ...b, status: "Approved" } : b))
      );
      if (selectedBooking?.id === booking.id) {
        setSelectedBooking((prev) => ({ ...prev, status: "Approved" }));
      }
    } catch (err) {
      console.error("Approve error:", err);
      alert("Failed to approve booking.");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectingBookingId) return;
    setProcessingAction(true);
    try {
      const targetBooking = bookings.find((b) => b.id === rejectingBookingId);
      await rejectBooking(rejectingBookingId, targetBooking, rejectReason);
      setBookings((prev) =>
        prev.map((b) =>
          b.id === rejectingBookingId
            ? { ...b, status: "Rejected", ownerNote: rejectReason }
            : b
        )
      );
      if (selectedBooking?.id === rejectingBookingId) {
        setSelectedBooking((prev) => ({ ...prev, status: "Rejected" }));
      }
      setRejectingBookingId(null);
      setRejectReason("");
    } catch (err) {
      console.error("Reject error:", err);
      alert("Failed to reject booking.");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleOpenDetail = async (booking) => {
    setSelectedBooking(booking);
    setRenterData(null);
    if (!booking.renterId) return;
    setFetchingRenter(true);
    try {
      const data = await fetchRenterProfile(booking.renterId);
      setRenterData(data);
    } catch (err) {
      console.error("Error fetching renter profile:", err);
    } finally {
      setFetchingRenter(false);
    }
  };

  // ===== Share to Telegram =====
  const handleShareTelegram = (booking) => {
    const text = encodeURIComponent(
      `🏠 Booking Request\n` +
        `Property: ${booking.propertyTitle || "N/A"}\n` +
        `Renter: ${booking.renterName || "N/A"}\n` +
        `Status: ${booking.status || "Pending"}\n` +
        `Amount: $${booking.totalAmount || booking.price || 0}\n` +
        `Period: ${formatDate(booking.startDate)} → ${formatDate(booking.endDate)}\n` +
        `ID: ${booking.id}`
    );
    const url = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // ===== Print =====
  const handlePrint = () => {
    const printContent = document.getElementById("bookings-print-area");
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Booking Requests - Print</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #0f172a; }
            h1 { margin-bottom: 4px; }
            .meta { color: #64748b; font-size: 13px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; font-size: 13px; }
            th { background: #f8fafc; font-weight: 700; }
            .badge { padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; }
            .pending { background: #fffbeb; color: #d97706; }
            .approved { background: #ecfdf5; color: #059669; }
            .rejected { background: #fef2f2; color: #dc2626; }
            .cancelled { background: #f1f5f9; color: #475569; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Booking Requests Report</h1>
          <div class="meta">Generated on ${new Date().toLocaleString()}</div>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <Loader2 className="animate-spin" size={32} color="#0284c7" />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: 0, color: "#0f172a" }}>
            Booking Requests
          </h1>
          <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "14px" }}>
            Review, approve, or decline incoming tenant rental applications.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            onClick={handlePrint}
            style={actionBtnStyle}
            title="Print report"
          >
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
        <StatCard label="Pending" value={stats.pending} color="#d97706" bg="#fffbeb" icon={<Clock size={20} />} />
        <StatCard label="Approved" value={stats.approved} color="#059669" bg="#ecfdf5" icon={<CheckCircle2 size={20} />} />
        <StatCard label="Rejected" value={stats.rejected} color="#dc2626" bg="#fef2f2" icon={<XCircle size={20} />} />
        <StatCard label="Cancelled" value={stats.cancelled} color="#475569" bg="#f1f5f9" icon={<AlertCircle size={20} />} />
      </div>

      {/* ===== CHARTS SECTION ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
        {/* Status Distribution Chart */}
        <div style={chartCardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <BarChart3 size={18} color="#0284c7" />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
              Status Distribution
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {chartData.map((item) => (
              <div key={item.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                  <span style={{ color: "#475569", fontWeight: 600 }}>{item.label}</span>
                  <span style={{ color: "#0f172a", fontWeight: 700 }}>
                    {item.value} ({item.percent.toFixed(0)}%)
                  </span>
                </div>
                <div style={{ height: "10px", background: "#f1f5f9", borderRadius: "6px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.max(item.percent, 2)}%`,
                      background: item.color,
                      borderRadius: "6px",
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Summary */}
        <div style={chartCardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <TrendingUp size={18} color="#059669" />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
              Revenue Overview
            </h3>
          </div>

          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>
              Total from Approved Bookings
            </div>
            <div style={{ fontSize: "32px", fontWeight: "800", color: "#059669" }}>
              ${stats.totalRevenue.toLocaleString()}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "8px" }}>
            <div style={{ background: "#f0fdf4", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#059669" }}>{stats.approved}</div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>Approved</div>
            </div>
            <div style={{ background: "#fffbeb", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#d97706" }}>{stats.pending}</div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>Pending</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
          backgroundColor: "#ffffff",
          padding: "16px",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "#f8fafc",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            padding: "8px 12px",
            flex: 1,
            minWidth: "260px",
          }}
        >
          <Search size={18} color="#64748b" />
          <input
            type="text"
            placeholder="Search renter name, property, or booking ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: "14px" }}
          />
        </div>

        <div style={{ display: "flex", gap: "4px", backgroundColor: "#f1f5f9", padding: "4px", borderRadius: "8px", flexWrap: "wrap" }}>
          {["all", "pending", "approved", "rejected", "cancelled"].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                textTransform: "capitalize",
                backgroundColor: statusFilter === tab ? "#ffffff" : "transparent",
                color: statusFilter === tab ? "#0284c7" : "#64748b",
                boxShadow: statusFilter === tab ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div style={{ display: "flex", gap: "4px", backgroundColor: "#f1f5f9", padding: "4px", borderRadius: "8px" }}>
          <button
            onClick={() => setViewMode("grid")}
            style={{
              ...viewBtnStyle,
              backgroundColor: viewMode === "grid" ? "#ffffff" : "transparent",
              color: viewMode === "grid" ? "#0284c7" : "#64748b",
              boxShadow: viewMode === "grid" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
            }}
          >
            <LayoutGrid size={16} /> Grid
          </button>
          <button
            onClick={() => setViewMode("table")}
            style={{
              ...viewBtnStyle,
              backgroundColor: viewMode === "table" ? "#ffffff" : "transparent",
              color: viewMode === "table" ? "#0284c7" : "#64748b",
              boxShadow: viewMode === "table" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
            }}
          >
            <List size={16} /> Table
          </button>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      {filteredBookings.length === 0 ? (
        <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "40px", textAlign: "center" }}>
          <Building2 size={40} color="#94a3b8" style={{ marginBottom: "8px" }} />
          <p style={{ color: "#64748b", margin: 0 }}>No booking requests found matching your filter.</p>
        </div>
      ) : viewMode === "grid" ? (
        /* ===== GRID VIEW ===== */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
          {filteredBookings.map((b) => (
            <div
              key={b.id}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                padding: "18px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>
                    ID: {b.id?.substring(0, 8)}...
                  </span>
                  <h3 style={{ fontSize: "16px", fontWeight: "bold", margin: "2px 0 0 0", color: "#0f172a" }}>
                    {b.propertyTitle || "Untitled Property"}
                  </h3>
                </div>
                <StatusBadge status={b.status} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", color: "#475569" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Renter:</span>
                  <strong style={{ color: "#0f172a" }}>{b.renterName || "—"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Start:</span>
                  <span>{formatDate(b.startDate)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>End:</span>
                  <span>{formatDate(b.endDate)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Duration:</span>
                  <span>{b.duration || b.totalDays || 1} Days</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Total:</span>
                  <strong style={{ color: "#059669", fontSize: "14px" }}>
                    ${b.totalAmount || b.price || 0}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Payment:</span>
                  <span style={{ fontWeight: "600", color: b.paymentStatus === "Paid" ? "#059669" : "#d97706" }}>
                    {b.paymentStatus || "Pending"}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "auto", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
                <button onClick={() => handleOpenDetail(b)} style={secondaryBtnStyle}>
                  <Eye size={14} /> Details
                </button>
                <button onClick={() => handleShareTelegram(b)} style={secondaryBtnStyle} title="Share to Telegram">
                  <Share2 size={14} />
                </button>

                {b.status?.toLowerCase() === "pending" && (
                  <>
                    <button
                      onClick={() => handleApprove(b)}
                      disabled={processingAction}
                      style={{ ...primaryBtnStyle, backgroundColor: "#059669" }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setRejectingBookingId(b.id)}
                      disabled={processingAction}
                      style={{ ...primaryBtnStyle, backgroundColor: "#ef4444" }}
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ===== TABLE VIEW ===== */
        <div
          id="bookings-print-area"
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={thStyle}>Property</th>
                  <th style={thStyle}>Renter</th>
                  <th style={thStyle}>Period</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Payment</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => (
                  <tr key={b.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>
                        {b.propertyTitle || "Untitled"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                        {b.id?.substring(0, 10)}...
                      </div>
                    </td>
                    <td style={tdStyle}>{b.renterName || "—"}</td>
                    <td style={tdStyle}>
                      <div>{formatDate(b.startDate)}</div>
                      <div style={{ color: "#64748b", fontSize: "12px" }}>
                        → {formatDate(b.endDate)}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: "#059669" }}>
                      ${b.totalAmount || b.price || 0}
                    </td>
                    <td style={tdStyle}>
                      <StatusBadge status={b.status} />
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          fontWeight: 600,
                          color: b.paymentStatus === "Paid" ? "#059669" : "#d97706",
                        }}
                      >
                        {b.paymentStatus || "Pending"}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                        <button onClick={() => handleOpenDetail(b)} style={iconBtnStyle} title="Details">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => handleShareTelegram(b)} style={iconBtnStyle} title="Share to Telegram">
                          <Share2 size={14} />
                        </button>
                        {b.status?.toLowerCase() === "pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(b)}
                              disabled={processingAction}
                              style={{ ...iconBtnStyle, color: "#059669" }}
                              title="Approve"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                            <button
                              onClick={() => setRejectingBookingId(b.id)}
                              disabled={processingAction}
                              style={{ ...iconBtnStyle, color: "#ef4444" }}
                              title="Reject"
                            >
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingBookingId && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: "450px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "bold", margin: 0, color: "#991b1b" }}>
                Reject Booking Request
              </h3>
              <button onClick={() => setRejectingBookingId(null)} style={closeBtnStyle}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmReject}>
              <p style={{ fontSize: "14px", color: "#475569", marginTop: 0 }}>
                Please specify a reason for declining this request.
              </p>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                Reason for Rejection
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Property unavailable during those dates..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  outline: "none",
                  resize: "vertical",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button type="button" onClick={() => setRejectingBookingId(null)} style={secondaryBtnStyle}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingAction}
                  style={{ ...primaryBtnStyle, backgroundColor: "#dc2626" }}
                >
                  {processingAction ? "Rejecting..." : "Reject Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedBooking && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: "700px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: "12px",
                marginBottom: "16px",
              }}
            >
              <div>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                  Booking ID: {selectedBooking.id}
                </span>
                <h2 style={{ fontSize: "20px", fontWeight: "bold", margin: 0, color: "#0f172a" }}>
                  Booking Details
                </h2>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => handleShareTelegram(selectedBooking)}
                  style={secondaryBtnStyle}
                  title="Share to Telegram"
                >
                  <Share2 size={15} /> Share
                </button>
                <button onClick={() => setSelectedBooking(null)} style={closeBtnStyle}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxHeight: "75vh", overflowY: "auto", paddingRight: "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8fafc", padding: "12px 16px", borderRadius: "8px" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Status</div>
                  <StatusBadge status={selectedBooking.status} />
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Created</div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}>
                    {formatDate(selectedBooking.createdAt) || selectedBooking.formattedCreatedAt}
                  </div>
                </div>
              </div>

              <div style={detailBoxStyle}>
                <h4 style={detailBoxTitleStyle}>
                  <Building2 size={16} color="#0284c7" /> Property Overview
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "14px" }}>
                  <div><strong>Title:</strong> {selectedBooking.propertyTitle || "—"}</div>
                  <div><strong>Category:</strong> {selectedBooking.category || "—"}</div>
                  <div><strong>Location:</strong> {selectedBooking.location || "—"}</div>
                  <div><strong>Rate:</strong> ${Number(selectedBooking.monthlyPrice || 0).toFixed(2)}/mo</div>
                </div>
              </div>

              <div style={detailBoxStyle}>
                <h4 style={detailBoxTitleStyle}>
                  <Calendar size={16} color="#0284c7" /> Rental Period
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", fontSize: "14px" }}>
                  <div><strong>Start:</strong><br />{formatDate(selectedBooking.startDate)}</div>
                  <div><strong>End:</strong><br />{formatDate(selectedBooking.endDate)}</div>
                  <div><strong>Days:</strong><br />{selectedBooking.duration || selectedBooking.totalDays || "—"}</div>
                </div>
              </div>

              <div style={detailBoxStyle}>
                <h4 style={detailBoxTitleStyle}>
                  <DollarSign size={16} color="#059669" /> Financial Information
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "14px" }}>
                  <div><strong>Monthly Rate:</strong> ${selectedBooking.monthlyPrice || 0}</div>
                  <div>
                    <strong>Total Amount:</strong>{" "}
                    <span style={{ color: "#059669", fontWeight: "bold" }}>
                      ${selectedBooking.totalAmount || 0}
                    </span>
                  </div>
                  <div><strong>Payment Status:</strong> {selectedBooking.paymentStatus || "Pending"}</div>
                  <div><strong>Payment Ref:</strong> {selectedBooking.paymentId || "—"}</div>
                </div>
              </div>

              <div style={detailBoxStyle}>
                <h4 style={detailBoxTitleStyle}>
                  <User size={16} color="#0284c7" /> Renter Information
                </h4>
                {fetchingRenter ? (
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", color: "#64748b", padding: "10px" }}>
                    <Loader2 className="animate-spin" size={16} /> Loading profile...
                  </div>
                ) : renterData ? (
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-start" }}>
                    <img
                      src={renterData.profileImage || renterData.photoURL || "https://via.placeholder.com/80?text=User"}
                      alt="Renter"
                      style={{ width: "70px", height: "70px", borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0" }}
                    />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", flex: 1, fontSize: "13px" }}>
                      <div><strong>Name:</strong> {renterData.fullName || renterData.displayName || selectedBooking.renterName || "—"}</div>
                      <div><strong>Email:</strong> {renterData.email || "—"}</div>
                      <div><strong>Phone:</strong> {renterData.phone || renterData.phoneNumber || "—"}</div>
                      <div><strong>Gender / Age:</strong> {renterData.gender || "—"} / {renterData.age || "—"}</div>
                      <div><strong>Occupation:</strong> {renterData.occupation || "—"}</div>
                      <div><strong>Address:</strong> {renterData.address || "—"}</div>
                      <div style={{ gridColumn: "span 2" }}>
                        <strong>Bio:</strong> {renterData.bio || "No bio available."}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: "13px", color: "#64748b" }}>
                    Renter ID: <code>{selectedBooking.renterId}</code>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px", paddingTop: "12px", borderTop: "1px solid #e2e8f0" }}>
              {selectedBooking.status?.toLowerCase() === "pending" && (
                <>
                  <button
                    onClick={() => {
                      const b = selectedBooking;
                      setSelectedBooking(null);
                      setRejectingBookingId(b.id);
                    }}
                    style={{ ...primaryBtnStyle, backgroundColor: "#ef4444" }}
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(selectedBooking)}
                    style={{ ...primaryBtnStyle, backgroundColor: "#059669" }}
                  >
                    Approve Request
                  </button>
                </>
              )}
              <button onClick={() => setSelectedBooking(null)} style={secondaryBtnStyle}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== Sub Components ========== */
function StatCard({ label, value, color, bg, icon }) {
  return (
    <div
      style={{
        backgroundColor: bg,
        border: `1px solid ${color}30`,
        borderRadius: "10px",
        padding: "16px",
        display: "flex",
        alignItems: "center",
        gap: "14px",
      }}
    >
      <div style={{ color, padding: "8px", borderRadius: "8px", backgroundColor: "#ffffff" }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "22px", fontWeight: "bold", color }}>{value}</div>
        <div style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>{label}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = (status || "pending").toLowerCase();
  let bg = "#fffbeb";
  let color = "#d97706";
  if (s === "approved") { bg = "#ecfdf5"; color = "#059669"; }
  else if (s === "rejected") { bg = "#fef2f2"; color = "#dc2626"; }
  else if (s === "cancelled") { bg = "#f1f5f9"; color = "#475569"; }

  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: "700",
        backgroundColor: bg,
        color,
        textTransform: "capitalize",
      }}
    >
      {status || "Pending"}
    </span>
  );
}

/* ========== Styles ========== */
const actionBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 14px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
};

const viewBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 12px",
  borderRadius: "6px",
  border: "none",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
};

const primaryBtnStyle = {
  padding: "8px 14px",
  border: "none",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryBtnStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  padding: "8px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  backgroundColor: "#fff",
  color: "#334155",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
};

const iconBtnStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "32px",
  height: "32px",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  background: "#fff",
  cursor: "pointer",
  color: "#475569",
};

const thStyle = {
  padding: "12px 16px",
  textAlign: "left",
  fontSize: "12px",
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

const tdStyle = {
  padding: "14px 16px",
  verticalAlign: "middle",
  color: "#334155",
};

const chartCardStyle = {
  background: "#ffffff",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  padding: "20px",
};

const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(15, 23, 42, 0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: "16px",
};

const modalContentStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  width: "100%",
  padding: "24px",
  boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
  position: "relative",
};

const closeBtnStyle = {
  border: "none",
  background: "none",
  cursor: "pointer",
  color: "#64748b",
  padding: "4px",
};

const detailBoxStyle = {
  backgroundColor: "#f8fafc",
  padding: "14px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
};

const detailBoxTitleStyle = {
  margin: "0 0 10px 0",
  fontSize: "14px",
  fontWeight: "bold",
  color: "#0f172a",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};