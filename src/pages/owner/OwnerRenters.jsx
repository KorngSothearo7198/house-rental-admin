import React, { useState, useEffect, useMemo } from "react";
import { auth } from "../../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  fetchOwnerRenters,
  fetchRenterFullDetails,
  formatDate,
} from "../../services/renterService";
import {
  Search,
  Eye,
  Printer,
  Send,
  User,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  MessageSquare,
  Loader2,
  X,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  LayoutGrid,
  List,
  CalendarDays,
} from "lucide-react";

// Helper to format money cleanly
const formatMoney = (val) => Number(val || 0).toFixed(2);

export default function OwnerRenters() {
  const [loading, setLoading] = useState(true);
  const [renters, setRenters] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const [viewMode, setViewMode] = useState("card");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedRenter, setSelectedRenter] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [renterDetails, setRenterDetails] = useState({
    profile: null,
    bookings: [],
    payments: [],
    messages: [],
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      setCurrentUser(user);
      try {
        const data = await fetchOwnerRenters(user.uid);
        setRenters(data);
      } catch (err) {
        console.error("Error loading renters:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const parseRecordDate = (dateVal) => {
    if (!dateVal) return null;
    if (dateVal?.toDate && typeof dateVal.toDate === "function") {
      return dateVal.toDate();
    }
    if (typeof dateVal === "object" && dateVal.seconds !== undefined) {
      return new Date(dateVal.seconds * 1000);
    }
    const parsed = new Date(dateVal);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const filteredRenters = useMemo(() => {
    return renters.filter((r) => {
      const matchesSearch =
        r.renterName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.propertyTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.bookingId?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter !== "all") {
        const itemStatus = (r.status || "pending").toLowerCase();
        if (itemStatus !== statusFilter.toLowerCase()) return false;
      }

      if (dateFilter !== "all") {
        const recDate = parseRecordDate(r.createdAt);
        if (!recDate) return true;

        const now = new Date();
        const startOfToday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );

        if (dateFilter === "today") {
          if (recDate < startOfToday) return false;
        } else if (dateFilter === "morning") {
          const hours = recDate.getHours();
          if (recDate < startOfToday || hours < 5 || hours >= 12) return false;
        } else if (dateFilter === "afternoon") {
          const hours = recDate.getHours();
          if (recDate < startOfToday || hours < 12 || hours >= 17) return false;
        } else if (dateFilter === "evening") {
          const hours = recDate.getHours();
          if (recDate < startOfToday || hours < 17 || hours >= 23) return false;
        } else if (dateFilter === "last_week") {
          const oneWeekAgo = new Date(now);
          oneWeekAgo.setDate(now.getDate() - 7);
          if (recDate < oneWeekAgo) return false;
        } else if (dateFilter === "last_month") {
          const oneMonthAgo = new Date(now);
          oneMonthAgo.setMonth(now.getMonth() - 1);
          if (recDate < oneMonthAgo) return false;
        } else if (dateFilter === "last_year") {
          const oneYearAgo = new Date(now);
          oneYearAgo.setFullYear(now.getFullYear() - 1);
          if (recDate < oneYearAgo) return false;
        } else if (dateFilter === "custom") {
          if (startDate) {
            const sDate = new Date(startDate);
            sDate.setHours(0, 0, 0, 0);
            if (recDate < sDate) return false;
          }
          if (endDate) {
            const eDate = new Date(endDate);
            eDate.setHours(23, 59, 59, 999);
            if (recDate > eDate) return false;
          }
        }
      }
      return true;
    });
  }, [renters, searchTerm, statusFilter, dateFilter, startDate, endDate]);

  const statusCounts = useMemo(() => {
    return {
      all: renters.length,
      pending: renters.filter(
        (r) => (r.status || "pending").toLowerCase() === "pending",
      ).length,
      approved: renters.filter((r) =>
        ["approved", "confirmed"].includes((r.status || "").toLowerCase()),
      ).length,
      rejected: renters.filter(
        (r) => (r.status || "").toLowerCase() === "rejected",
      ).length,
      cancelled: renters.filter(
        (r) => (r.status || "").toLowerCase() === "cancelled",
      ).length,
    };
  }, [renters]);

  const handleViewRenter = async (renter) => {
    setSelectedRenter(renter);
    setActiveTab("profile");
    setDetailsLoading(true);
    try {
      const details = await fetchRenterFullDetails(
        renter.renterId,
        currentUser?.uid,
      );
      setRenterDetails(details);
    } catch (err) {
      console.error("Error fetching renter details:", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handlePrintRow = (renter) => {
    const printWindow = window.open("", "_blank", "width=700,height=500");
    printWindow.document.write(`
      <html>
        <head>
          <title>Booking Statement - ${renter.renterName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 30px; color: #0f172a; }
            h2 { border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; font-size: 14px; }
            th { background-color: #f8fafc; font-weight: 600; }
          </style>
        </head>
        <body>
          <h2>Booking Statement Summary</h2>
          <table>
            <tr><th>Renter Name</th><td>${renter.renterName}</td></tr>
            <tr><th>Property</th><td>${renter.propertyTitle}</td></tr>
            <tr><th>Booking ID</th><td>#${renter.bookingId}</td></tr>
            <tr><th>Status</th><td>${renter.status}</td></tr>
            <tr><th>Payment Status</th><td>${renter.paymentStatus}</td></tr>
            <tr><th>Total Amount</th><td>$${formatMoney(renter.totalAmount)}</td></tr>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleShareTelegram = (renter) => {
    const text = `📌 *Renter Summary*\n\n👤 *Name:* ${renter.renterName}\n🏠 *Property:* ${renter.propertyTitle}\n🆔 *Booking ID:* #${renter.bookingId}\n📊 *Status:* ${renter.status}\n💳 *Payment:* ${renter.paymentStatus}\n💵 *Amount:* $${formatMoney(renter.totalAmount)}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <Loader2 className="animate-spin" size={32} color="#4f46e5" />
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        width: "100%",
        padding: "0 4px",
      }}
    >
      {/* ===== HEADER ===== */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "#0f172a",
              margin: 0,
            }}
          >
            Renters Management
          </h1>
          <p
            style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "14px" }}
          >
            Overview of tenants and property booking requests.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          {/* View Toggle */}
          <div
            style={{
              display: "flex",
              background: "#f1f5f9",
              padding: 4,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
          >
            <button
              onClick={() => setViewMode("card")}
              style={{
                ...toggleBtn,
                background: viewMode === "card" ? "#fff" : "transparent",
                color: viewMode === "card" ? "#4f46e5" : "#64748b",
                boxShadow:
                  viewMode === "card" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              }}
            >
              <LayoutGrid size={15} /> Card
            </button>
            <button
              onClick={() => setViewMode("table")}
              style={{
                ...toggleBtn,
                background: viewMode === "table" ? "#fff" : "transparent",
                color: viewMode === "table" ? "#4f46e5" : "#64748b",
                boxShadow:
                  viewMode === "table" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              }}
            >
              <List size={15} /> Table
            </button>
          </div>

          {/* Search */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "8px 12px",
              minWidth: 240,
            }}
          >
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search renter, property, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                width: "100%",
                fontSize: 13,
              }}
            />
          </div>
        </div>
      </div>

      {/* ===== FILTERS ===== */}
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* Status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={labelStyle}>Status:</span>
          {[
            { id: "all", label: "All", count: statusCounts.all },
            { id: "pending", label: "Pending", count: statusCounts.pending },
            { id: "approved", label: "Approved", count: statusCounts.approved },
            { id: "rejected", label: "Rejected", count: statusCounts.rejected },
            {
              id: "cancelled",
              label: "Cancelled",
              count: statusCounts.cancelled,
            },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setStatusFilter(btn.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 20,
                border:
                  statusFilter === btn.id
                    ? "1px solid #4f46e5"
                    : "1px solid #e2e8f0",
                background: statusFilter === btn.id ? "#eef2ff" : "#f8fafc",
                color: statusFilter === btn.id ? "#4338ca" : "#475569",
                fontSize: 13,
                fontWeight: statusFilter === btn.id ? 600 : 500,
                cursor: "pointer",
              }}
            >
              {btn.label}
              <span
                style={{
                  fontSize: 11,
                  padding: "1px 6px",
                  borderRadius: 10,
                  background: statusFilter === btn.id ? "#4f46e5" : "#cbd5e1",
                  color: "#fff",
                }}
              >
                {btn.count}
              </span>
            </button>
          ))}
        </div>

        <div style={{ height: 1, background: "#f1f5f9" }} />

        {/* Time */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CalendarDays size={15} color="#64748b" />
            <span style={labelStyle}>Time:</span>
          </div>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#fff",
              fontSize: 13,
              color: "#0f172a",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="morning">Morning (5 AM – 12 PM)</option>
            <option value="afternoon">Afternoon (12 PM – 5 PM)</option>
            <option value="evening">Evening (5 PM – 11 PM)</option>
            <option value="last_week">Last Week</option>
            <option value="last_month">Last Month</option>
            <option value="last_year">Last Year</option>
            <option value="custom">Custom Date Range</option>
          </select>

          {dateFilter === "custom" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={dateInputStyle}
              />
              <span style={{ fontSize: 12, color: "#64748b" }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={dateInputStyle}
              />
            </div>
          )}
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      {filteredRenters.length === 0 ? (
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            padding: 48,
            textAlign: "center",
            color: "#94a3b8",
          }}
        >
          No records found matching your selected filters.
        </div>
      ) : viewMode === "card" ? (
        /* CARD VIEW - Full width */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {filteredRenters.map((r) => (
            <div
              key={r.bookingId}
              style={{
                background: "#fff",
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 14,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                transition: "box-shadow 0.2s",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: "50%",
                      background: "#e0e7ff",
                      color: "#4f46e5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    {(r.renterName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      {r.renterName}
                    </h4>
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: "#64748b",
                      }}
                    >
                      #{r.bookingId?.substring(0, 8)}
                    </span>
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>

              {/* Body */}
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: 8,
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#334155",
                  }}
                >
                  <Building2 size={15} color="#64748b" />
                  <span
                    style={{
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.propertyTitle}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      color: "#64748b",
                    }}
                  >
                    <CreditCard size={14} />
                    <PaymentBadge status={r.paymentStatus} />
                  </div>
                  <strong style={{ color: "#0f172a", fontSize: 15 }}>
                    {/* ${formatMoney(r.totalAmount)} */}
                  </strong>
                </div>

                {r.createdAt && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      color: "#94a3b8",
                      fontSize: 12,
                    }}
                  >
                    <Calendar size={13} />
                    <span>Created: {formatDate(r.createdAt)}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid #f1f5f9",
                  paddingTop: 12,
                }}
              >
                <button onClick={() => handleViewRenter(r)} style={primaryBtn}>
                  <Eye size={14} /> View Details
                </button>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => handlePrintRow(r)}
                    title="Print"
                    style={iconBtn}
                  >
                    <Printer size={15} color="#64748b" />
                  </button>
                  <button
                    onClick={() => handleShareTelegram(r)}
                    title="Telegram"
                    style={iconBtn}
                  >
                    <Send size={15} color="#0284c7" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW - Full width */
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <th style={thStyle}>Renter</th>
                  <th style={thStyle}>Property</th>
                  <th style={thStyle}>Booking ID</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Payment</th>
                  <th style={thStyle}>Amount</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRenters.map((r) => (
                  <tr
                    key={r.bookingId}
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                  >
                    <td style={tdStyle}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            background: "#e0e7ff",
                            color: "#4f46e5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: 13,
                            flexShrink: 0,
                          }}
                        >
                          {(r.renterName || "?").charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, color: "#0f172a" }}>
                          {r.renterName}
                        </span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Building2 size={14} color="#64748b" />
                        {r.propertyTitle}
                      </div>
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        fontFamily: "monospace",
                        color: "#64748b",
                        fontSize: 13,
                      }}
                    >
                      #{r.bookingId?.substring(0, 8)}
                    </td>
                    <td style={tdStyle}>
                      <StatusBadge status={r.status} />
                    </td>
                    <td style={tdStyle}>
                      <PaymentBadge status={r.paymentStatus} />
                    </td>
                    <td
                      style={{ ...tdStyle, fontWeight: 700, color: "#0f172a" }}
                    >
                      ${formatMoney(r.totalAmount)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          onClick={() => handleViewRenter(r)}
                          style={iconBtn}
                          title="Details"
                        >
                          <Eye size={15} color="#4f46e5" />
                        </button>
                        <button
                          onClick={() => handlePrintRow(r)}
                          style={iconBtn}
                          title="Print"
                        >
                          <Printer size={15} color="#64748b" />
                        </button>
                        <button
                          onClick={() => handleShareTelegram(r)}
                          style={iconBtn}
                          title="Telegram"
                        >
                          <Send size={15} color="#0284c7" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== DETAILS MODAL ===== */}
      {selectedRenter && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: 12,
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    margin: 0,
                    color: "#0f172a",
                  }}
                >
                  {selectedRenter.renterName}
                </h3>
                <span
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    fontFamily: "monospace",
                  }}
                >
                  ID: #{selectedRenter.bookingId}
                </span>
              </div>
              <button
                onClick={() => setSelectedRenter(null)}
                style={{
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div
              style={{
                display: "flex",
                gap: 4,
                borderBottom: "1px solid #e2e8f0",
                marginTop: 12,
                overflowX: "auto",
              }}
            >
              {[
                { id: "profile", label: "Profile", icon: <User size={14} /> },
                { id: "contact", label: "Contact", icon: <Phone size={14} /> },
                {
                  id: "history",
                  label: "Bookings",
                  icon: <Calendar size={14} />,
                },
                {
                  id: "payment",
                  label: "Payments",
                  icon: <CreditCard size={14} />,
                },
                {
                  id: "messages",
                  label: "Messages",
                  icon: <MessageSquare size={14} />,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 12px",
                    border: "none",
                    borderBottom:
                      activeTab === tab.id
                        ? "2px solid #4f46e5"
                        : "2px solid transparent",
                    background: "none",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    color: activeTab === tab.id ? "#4f46e5" : "#64748b",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            <div
              style={{
                padding: "16px 0",
                minHeight: 180,
                maxHeight: "55vh",
                overflowY: "auto",
              }}
            >
              {detailsLoading ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: 30,
                  }}
                >
                  <Loader2 className="animate-spin" size={24} color="#4f46e5" />
                </div>
              ) : (
                <>
                  {activeTab === "profile" && (
                    <div
                      style={{ display: "flex", gap: 16, alignItems: "center" }}
                    >
                      <img
                        src={
                          renterDetails.profile?.profileImage ||
                          renterDetails.profile?.photoURL ||
                          "https://via.placeholder.com/70?text=User"
                        }
                        alt="Profile"
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 8,
                          fontSize: 13,
                          color: "#334155",
                          width: "100%",
                        }}
                      >
                        <div>
                          <strong>Full Name:</strong>{" "}
                          {renterDetails.profile?.fullName ||
                            selectedRenter.renterName}
                        </div>
                        <div>
                          <strong>Gender:</strong>{" "}
                          {renterDetails.profile?.gender || "N/A"}
                        </div>
                        <div>
                          <strong>Occupation:</strong>{" "}
                          {renterDetails.profile?.occupation || "N/A"}
                        </div>
                        <div>
                          <strong>Age:</strong>{" "}
                          {renterDetails.profile?.age || "N/A"}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "contact" && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 12,
                        fontSize: 13,
                        color: "#334155",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Mail size={15} color="#4f46e5" />{" "}
                        <strong>Email:</strong>{" "}
                        {renterDetails.profile?.email || "N/A"}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Phone size={15} color="#4f46e5" />{" "}
                        <strong>Phone:</strong>{" "}
                        {renterDetails.profile?.phone || "N/A"}
                      </div>
                    </div>
                  )}

                  {activeTab === "history" && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {renterDetails.bookings.length === 0 ? (
                        <span style={{ fontSize: 13, color: "#94a3b8" }}>
                          No history recorded.
                        </span>
                      ) : (
                        renterDetails.bookings.map((b) => (
                          <div key={b.id} style={cardBox}>
                            <div>
                              <strong style={{ fontSize: 13 }}>
                                {b.propertyTitle || "Property"}
                              </strong>
                              <div style={{ fontSize: 11, color: "#64748b" }}>
                                {formatDate(b.startDate)} –{" "}
                                {formatDate(b.endDate)}
                              </div>
                            </div>
                            <StatusBadge status={b.status} />
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === "payment" && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {renterDetails.payments.length === 0 ? (
                        <span style={{ fontSize: 13, color: "#94a3b8" }}>
                          No payments recorded.
                        </span>
                      ) : (
                        renterDetails.payments.map((p) => (
                          <div key={p.id} style={cardBox}>
                            <div>
                              <strong style={{ fontSize: 13 }}>
                                Ref: {p.id.substring(0, 8)}
                              </strong>
                              <div style={{ fontSize: 11, color: "#64748b" }}>
                                {formatDate(p.createdAt || p.paidAt)}
                              </div>
                              {p.paymentMethod && (
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "#94a3b8",
                                    marginTop: 2,
                                  }}
                                >
                                  {p.paymentMethod}
                                </div>
                              )}
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <strong
                                style={{ color: "#16a34a", fontSize: 14 }}
                              >
                                ${formatMoney(p.bookingAmount ?? p.amount)}
                              </strong>
                              <div style={{ marginTop: 4 }}>
                                <PaymentBadge status={p.status} />
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === "messages" && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {renterDetails.messages.length === 0 ? (
                        <span style={{ fontSize: 13, color: "#94a3b8" }}>
                          No message logs available.
                        </span>
                      ) : (
                        renterDetails.messages.map((m) => (
                          <div
                            key={m.id}
                            style={{
                              ...cardBox,
                              background:
                                m.senderId === currentUser?.uid
                                  ? "#f0fdf4"
                                  : "#f8fafc",
                            }}
                          >
                            <div>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#4f46e5",
                                }}
                              >
                                {m.senderId === currentUser?.uid
                                  ? "You"
                                  : selectedRenter.renterName}
                              </span>
                              <p
                                style={{
                                  margin: "2px 0 0 0",
                                  fontSize: 13,
                                  color: "#334155",
                                }}
                              >
                                {m.text || m.message}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Badges ===== */
function StatusBadge({ status }) {
  const s = (status || "pending").toLowerCase();
  let bg = "#fef3c7",
    color = "#d97706",
    Icon = Clock;

  if (s === "approved" || s === "confirmed") {
    bg = "#dcfce7";
    color = "#15803d";
    Icon = CheckCircle2;
  } else if (s === "cancelled" || s === "rejected") {
    bg = "#fee2e2";
    color = "#b91c1c";
    Icon = XCircle;
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        background: bg,
        color,
        textTransform: "capitalize",
      }}
    >
      <Icon size={12} />
      {status || "Pending"}
    </span>
  );
}

function PaymentBadge({ status }) {
  const s = (status || "pending").toLowerCase();
  let bg = "#fef3c7",
    color = "#d97706";
  if (s === "paid" || s === "completed") {
    bg = "#dcfce7";
    color = "#15803d";
  } else if (s === "failed" || s === "unpaid") {
    bg = "#fee2e2";
    color = "#b91c1c";
  }

  return (
    <span
      style={{
        padding: "3px 8px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        background: bg,
        color,
        textTransform: "uppercase",
      }}
    >
      {status || "Pending"}
    </span>
  );
}

/* ===== Styles ===== */
const toggleBtn = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  border: "none",
  borderRadius: 6,
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const dateInputStyle = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #cbd5e1",
  fontSize: 12,
  outline: "none",
};

const primaryBtn = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 12px",
  borderRadius: 6,
  background: "#4f46e5",
  color: "#fff",
  border: "none",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
};

const iconBtn = {
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  background: "#fff",
  padding: 6,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const thStyle = {
  padding: "12px 16px",
  textAlign: "left",
  fontSize: 12,
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

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 16,
};

const modalContent = {
  background: "#fff",
  borderRadius: 12,
  width: "100%",
  maxWidth: 620,
  padding: 20,
  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
};

const cardBox = {
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: 10,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "#f8fafc",
};
