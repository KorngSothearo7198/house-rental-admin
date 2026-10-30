import React, { useEffect, useMemo, useState } from "react";
import { auth } from "../../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  fetchOwnerPayments,
  calculatePaymentSummary,
} from "../../services/paymentService";
import {
  Search,
  Eye,
  Printer,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  User,
  Loader2,
  X,
  ShieldCheck,
} from "lucide-react";

export default function OwnerPayments() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");

  // Search states
  const [searchPaymentId, setSearchPaymentId] = useState("");
  const [searchRenter, setSearchRenter] = useState("");
  const [searchProperty, setSearchProperty] = useState("");

  // Modal state
  const [selectedPayment, setSelectedPayment] = useState(null);

  // ---------------------------------------------------------
  // Load owner payments
  // ---------------------------------------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const data = await fetchOwnerPayments(user.uid);
        setPayments(data);
      } catch (err) {
        console.error("Error loading payments:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // ---------------------------------------------------------
  // Summary metrics
  // ---------------------------------------------------------
  const summary = useMemo(() => {
    return calculatePaymentSummary(payments);
  }, [payments]);

  // ---------------------------------------------------------
  // Filter & Search
  // ---------------------------------------------------------
  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      const paymentId = String(item.paymentId || item.id || "").toLowerCase();

      const renterName = String(item.renterName || "").toLowerCase();

      const propertyTitle = String(item.propertyTitle || "").toLowerCase();

      const matchId = paymentId.includes(searchPaymentId.toLowerCase());

      const matchRenter = renterName.includes(searchRenter.toLowerCase());

      const matchProperty = propertyTitle.includes(
        searchProperty.toLowerCase(),
      );

      const matchesStatus =
        statusFilter === "all" || item.status?.toLowerCase() === statusFilter;

      return matchId && matchRenter && matchProperty && matchesStatus;
    });
  }, [payments, searchPaymentId, searchRenter, searchProperty, statusFilter]);

  // ---------------------------------------------------------
  // Print payment
  // ---------------------------------------------------------
  const handlePrintPayment = (payment) => {
    const printWindow = window.open("", "_blank", "width=650,height=500");

    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt - ${payment.paymentId}</title>

          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
              line-height: 1.6;
              color: #0f172a;
            }

            h2 {
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 8px;
              margin-bottom: 16px;
            }

            .badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-weight: bold;
              font-size: 12px;
            }

            .paid {
              background: #ecfdf5;
              color: #059669;
            }

            .pending {
              background: #fffbeb;
              color: #d97706;
            }

            .failed {
              background: #fef2f2;
              color: #dc2626;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 16px;
            }

            th,
            td {
              border: 1px solid #cbd5e1;
              padding: 10px;
              text-align: left;
              font-size: 13px;
            }

            th {
              background-color: #f8fafc;
            }
          </style>
        </head>

        <body>

          <h2>Rental Payment Receipt</h2>

          <p>
            <strong>Payment ID:</strong>
            ${payment.paymentId}
          </p>

          <p>
            <strong>Status:</strong>
            <span class="badge ${payment.status?.toLowerCase()}">
              ${payment.status}
            </span>
          </p>

          <table>

            <tr>
              <th>Booking Amount</th>
              <td>
                <strong>
                  $${Number(payment.bookingAmount || 0).toFixed(2)}
                  ${payment.bookingCurrency}
                </strong>
              </td>
            </tr>

            <tr>
              <th>Payment Method</th>
              <td>${payment.paymentMethod}</td>
            </tr>

            <tr>
              <th>From Account</th>
              <td>${payment.fromAccountId}</td>
            </tr>

            <tr>
              <th>To Account</th>
              <td>${payment.toAccountId}</td>
            </tr>

            <tr>
              <th>Transaction Hash</th>
              <td>
                <small>
                  ${payment.bakongTransactionHash || "N/A"}
                </small>
              </td>
            </tr>

            <tr>
              <th>Date</th>
              <td>${payment.fullDate}</td>
            </tr>

            <tr>
              <th>Booking ID</th>
              <td>#${payment.bookingId}</td>
            </tr>

            <tr>
              <th>Property</th>
              <td>${payment.propertyTitle}</td>
            </tr>

            <tr>
              <th>Renter Name</th>
              <td>${payment.renterName}</td>
            </tr>

          </table>

        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // ---------------------------------------------------------
  // Telegram share
  // ---------------------------------------------------------
  const handleShareTelegram = (payment) => {
    const text = `💳 *Rental Payment Details*

🆔 *Payment ID:* ${payment.paymentId}
👤 *Renter:* ${payment.renterName}
🏠 *Property:* ${payment.propertyTitle}
🔖 *Booking:* #${payment.bookingId}
💵 *Booking Amount:* $${Number(payment.bookingAmount || 0).toFixed(
      2,
    )} ${payment.bookingCurrency}
💳 *Method:* ${payment.paymentMethod}
📊 *Status:* ${payment.status}
📅 *Date:* ${payment.fullDate}`;

    const url = `https://t.me/share/url?url=${encodeURIComponent(
      window.location.href,
    )}&text=${encodeURIComponent(text)}`;

    window.open(url, "_blank");
  };

  // ---------------------------------------------------------
  // Loading
  // ---------------------------------------------------------
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
        <Loader2 className="animate-spin" size={32} color="#0284c7" />
      </div>
    );
  }

  // ---------------------------------------------------------
  // Main UI
  // ---------------------------------------------------------
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            margin: 0,
            color: "#0f172a",
          }}
        >
          Payment Management & Controls
        </h1>

        <p
          style={{
            color: "#64748b",
            margin: "4px 0 0 0",
            fontSize: "14px",
          }}
        >
          Track booking revenue, Bakong transactions, and settlement activity.
        </p>
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
        }}
      >
        <SummaryCard
          label="Total Revenue"
          value={`$${summary.totalRevenue.toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}`}
          color="#0284c7"
          bg="#f0f9ff"
          icon={<TrendingUp size={20} />}
        />

        <SummaryCard
          label="Paid Revenue"
          value={`$${summary.paid.toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}`}
          color="#059669"
          bg="#ecfdf5"
          icon={<CheckCircle2 size={20} />}
        />

        <SummaryCard
          label="Pending Payments"
          value={`$${summary.pending.toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}`}
          color="#d97706"
          bg="#fffbeb"
          icon={<Clock size={20} />}
        />

        <SummaryCard
          label="Failed Payments"
          value={`$${summary.failed.toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}`}
          color="#dc2626"
          bg="#fef2f2"
          icon={<XCircle size={20} />}
        />
      </div>

      {/* =====================================================
          PAYMENT REVENUE BREAKDOWN
          ===================================================== */}
      <div
        style={{
          backgroundColor: "#ffffff",
          padding: "20px",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            marginBottom: "20px",
          }}
        >
          <h3
            style={{
              fontSize: "16px",
              fontWeight: "bold",
              color: "#0f172a",
              margin: 0,
            }}
          >
            Payment Revenue Breakdown (USD)
          </h3>

          <p
            style={{
              fontSize: "13px",
              color: "#64748b",
              margin: "4px 0 0",
            }}
          >
            Revenue distribution by payment status.
          </p>
        </div>

        <RevenueDonutChart summary={summary} />
      </div>

      {/* Search and Filters */}
      <div
        style={{
          backgroundColor: "#ffffff",
          padding: "16px",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
          }}
        >
          <SearchInput
            placeholder="Search Payment ID / Hash..."
            value={searchPaymentId}
            onChange={(e) => setSearchPaymentId(e.target.value)}
          />

          <SearchInput
            placeholder="Search Renter..."
            value={searchRenter}
            onChange={(e) => setSearchRenter(e.target.value)}
          />

          <SearchInput
            placeholder="Search Property Title..."
            value={searchProperty}
            onChange={(e) => setSearchProperty(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            borderTop: "1px solid #f1f5f9",
            paddingTop: "12px",
          }}
        >
          {["all", "paid", "pending", "failed"].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              style={{
                padding: "6px 16px",
                borderRadius: "6px",
                border: "none",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                textTransform: "capitalize",
                backgroundColor: statusFilter === tab ? "#0284c7" : "#f1f5f9",
                color: statusFilter === tab ? "#ffffff" : "#64748b",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* =====================================================
          PAYMENT TABLE
          ===================================================== */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              minWidth: "950px",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: "14px",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                  color: "#475569",
                }}
              >
                <th style={thStyle}>Payment ID</th>
                <th style={thStyle}>Renter</th>
                <th style={thStyle}>Property</th>
                <th style={thStyle}>Paid Amount</th>
                <th style={thStyle}>Method</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Date</th>
                <th
                  style={{
                    ...thStyle,
                    textAlign: "center",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: "32px",
                      textAlign: "center",
                      color: "#64748b",
                    }}
                  >
                    No transaction records found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    {/* Payment ID */}
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: "700",
                        color: "#0f172a",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>{p.paymentId}</span>

                        {p.generatedPaymentId && (
                          <span
                            style={{
                              fontSize: "9px",
                              backgroundColor: "#eff6ff",
                              color: "#0284c7",
                              padding: "2px 5px",
                              borderRadius: "4px",
                              fontWeight: "600",
                            }}
                            title="Generated payment identity"
                          >
                            ID
                          </span>
                        )}

                        {p.testPayment && (
                          <span
                            style={{
                              fontSize: "10px",
                              backgroundColor: "#fef3c7",
                              color: "#d97706",
                              padding: "1px 4px",
                              borderRadius: "3px",
                            }}
                          >
                            Test
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Renter */}
                    <td style={tdStyle}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <User size={14} color="#64748b" />
                        {p.renterName}
                      </div>
                    </td>

                    {/* Property */}
                    <td style={tdStyle}>{p.propertyTitle}</td>

                    {/* Paid Amount */}
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: "700",
                        color:
                          p.status?.toLowerCase() === "paid"
                            ? "#059669"
                            : "#475569",
                      }}
                    >
                      ${Number(p.bookingAmount || 0).toFixed(2)} USD
                    </td>

                    {/* Method */}
                    <td style={tdStyle}>{p.paymentMethod}</td>

                    {/* Status */}
                    <td style={tdStyle}>
                      <StatusBadge status={p.status} />
                    </td>

                    {/* Date */}
                    <td style={tdStyle}>{p.formattedDate}</td>

                    {/* Actions */}
                    <td style={tdStyle}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        <button
                          onClick={() => setSelectedPayment(p)}
                          title="View Payment Detail"
                          style={iconBtnStyle}
                        >
                          <Eye size={15} color="#0284c7" />
                        </button>

                        <button
                          onClick={() => handlePrintPayment(p)}
                          title="Print Receipt"
                          style={iconBtnStyle}
                        >
                          <Printer size={15} color="#475569" />
                        </button>

                        <button
                          onClick={() => handleShareTelegram(p)}
                          title="Share to Telegram"
                          style={{
                            ...iconBtnStyle,
                            backgroundColor: "#eff6ff",
                          }}
                        >
                          <Send size={15} color="#0284c7" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================
          PAYMENT DETAIL MODAL
          ===================================================== */}
      {selectedPayment && (
        <div style={modalOverlayStyle}>
          <div
            style={{
              ...modalContentStyle,
              maxWidth: "600px",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <ShieldCheck size={20} color="#0284c7" />

                <h2
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    margin: 0,
                    color: "#0f172a",
                  }}
                >
                  Transaction Details
                </h2>
              </div>

              <button
                onClick={() => setSelectedPayment(null)}
                style={closeBtnStyle}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                marginTop: "16px",
                maxHeight: "70vh",
                overflowY: "auto",
              }}
            >
              {/* Payment Identity */}
              <div
                style={{
                  ...boxStyle,
                  backgroundColor: "#eff6ff",
                  borderColor: "#bfdbfe",
                }}
              >
                <div style={rowStyle}>
                  <span style={labelStyle}>Payment ID</span>

                  <strong
                    style={{
                      color: "#0369a1",
                      fontSize: "16px",
                    }}
                  >
                    {selectedPayment.paymentId}
                  </strong>
                </div>

                <div style={rowStyle}>
                  <span style={labelStyle}>Payment Status</span>

                  <StatusBadge status={selectedPayment.status} />
                </div>
              </div>

              {/* Financial Information */}
              <div
                style={{
                  ...boxStyle,
                  backgroundColor: "#f0fdf4",
                  borderColor: "#bbf7d0",
                }}
              >
                <div style={rowStyle}>
                  <span style={labelStyle}>Booking Amount</span>

                  <strong
                    style={{
                      color: "#15803d",
                      fontSize: "18px",
                    }}
                  >
                    ${Number(selectedPayment.bookingAmount || 0).toFixed(2)}{" "}
                    {selectedPayment.bookingCurrency}
                  </strong>
                </div>
              </div>

              {/* Bakong Information */}
              <div style={boxStyle}>
                <h4
                  style={{
                    margin: "0 0 10px 0",
                    fontSize: "13px",
                    color: "#0284c7",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                  }}
                >
                  Bakong Audit Information
                </h4>

                <div style={rowStyle}>
                  <span style={labelStyle}>Payment Method</span>

                  <strong style={{ color: "#0f172a" }}>
                    {selectedPayment.paymentMethod}
                  </strong>
                </div>

                <div style={rowStyle}>
                  <span style={labelStyle}>From Account</span>

                  <span>{selectedPayment.fromAccountId}</span>
                </div>

                <div style={rowStyle}>
                  <span style={labelStyle}>To Account</span>

                  <span>{selectedPayment.toAccountId}</span>
                </div>

                <div
                  style={{
                    ...rowStyle,
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "4px",
                  }}
                >
                  <span style={labelStyle}>Transaction Hash</span>

                  <code
                    style={{
                      fontSize: "11px",
                      wordBreak: "break-all",
                      backgroundColor: "#e2e8f0",
                      padding: "6px 8px",
                      borderRadius: "4px",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    {selectedPayment.bakongTransactionHash || "N/A"}
                  </code>
                </div>
              </div>

              {/* Booking Information */}
              <div style={boxStyle}>
                <h4
                  style={{
                    margin: "0 0 10px 0",
                    fontSize: "13px",
                    color: "#0284c7",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                  }}
                >
                  Booking Link
                </h4>

                <div style={rowStyle}>
                  <span style={labelStyle}>Booking ID</span>

                  <strong style={{ color: "#0f172a" }}>
                    #{selectedPayment.bookingId}
                  </strong>
                </div>

                <div style={rowStyle}>
                  <span style={labelStyle}>Property Title</span>

                  <span>{selectedPayment.propertyTitle}</span>
                </div>

                <div style={rowStyle}>
                  <span style={labelStyle}>Renter Name</span>

                  <span>{selectedPayment.renterName}</span>
                </div>

                <div style={rowStyle}>
                  <span style={labelStyle}>Timestamp</span>

                  <span>{selectedPayment.fullDate}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "16px",
                paddingTop: "12px",
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <button
                onClick={() => handlePrintPayment(selectedPayment)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#fff",
                  color: "#475569",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Printer size={15} />
                Print
              </button>

              <button
                onClick={() => setSelectedPayment(null)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "#0284c7",
                  color: "#fff",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SUMMARY CARD
   ========================================================= */

function SummaryCard({ label, value, color, bg, icon }) {
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
      <div
        style={{
          color,
          padding: "8px",
          borderRadius: "8px",
          backgroundColor: "#ffffff",
        }}
      >
        {icon}
      </div>

      <div>
        <div
          style={{
            fontSize: "20px",
            fontWeight: "bold",
            color,
          }}
        >
          {value}
        </div>

        <div
          style={{
            fontSize: "13px",
            fontWeight: "600",
            color: "#475569",
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DONUT PIE CHART
   ========================================================= */

function RevenueDonutChart({ summary }) {
  const total = Number(summary.totalRevenue || 0);

  const paid = Number(summary.paid || 0);
  const pending = Number(summary.pending || 0);
  const failed = Number(summary.failed || 0);

  const getPercentage = (value) => {
    if (total <= 0) return 0;

    return (value / total) * 100;
  };

  const paidPercent = getPercentage(paid);
  const pendingPercent = getPercentage(pending);
  const failedPercent = getPercentage(failed);

  const radius = 72;
  const circumference = 2 * Math.PI * radius;

  const paidLength = (paidPercent / 100) * circumference;

  const pendingLength = (pendingPercent / 100) * circumference;

  const failedLength = (failedPercent / 100) * circumference;

  const formatMoney = (value) =>
    `$${Number(value || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(260px, 360px) 1fr",
        gap: "30px",
        alignItems: "center",
      }}
    >
      {/* Donut */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "220px",
            height: "220px",
          }}
        >
          <svg
            width="220"
            height="220"
            viewBox="0 0 220 220"
            style={{
              transform: "rotate(-90deg)",
            }}
          >
            {/* Background */}
            <circle
              cx="110"
              cy="110"
              r={radius}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="28"
            />

            {/* Paid */}
            {paid > 0 && (
              <circle
                cx="110"
                cy="110"
                r={radius}
                fill="none"
                stroke="#059669"
                strokeWidth="28"
                strokeDasharray={`${paidLength} ${circumference}`}
                strokeDashoffset="0"
              />
            )}

            {/* Pending */}
            {pending > 0 && (
              <circle
                cx="110"
                cy="110"
                r={radius}
                fill="none"
                stroke="#d97706"
                strokeWidth="28"
                strokeDasharray={`${pendingLength} ${circumference}`}
                strokeDashoffset={-paidLength}
              />
            )}

            {/* Failed */}
            {failed > 0 && (
              <circle
                cx="110"
                cy="110"
                r={radius}
                fill="none"
                stroke="#dc2626"
                strokeWidth="28"
                strokeDasharray={`${failedLength} ${circumference}`}
                strokeDashoffset={-(paidLength + pendingLength)}
              />
            )}
          </svg>

          {/* Center */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                color: "#64748b",
                fontWeight: "600",
              }}
            >
              Total Revenue
            </span>

            <strong
              style={{
                fontSize: "22px",
                color: "#0f172a",
                marginTop: "4px",
              }}
            >
              {formatMoney(total)}
            </strong>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <RevenueStatusRow
          label="Paid"
          value={paid}
          percentage={paidPercent}
          dotColor="#059669"
          formatMoney={formatMoney}
        />

        <RevenueStatusRow
          label="Pending"
          value={pending}
          percentage={pendingPercent}
          dotColor="#d97706"
          formatMoney={formatMoney}
        />

        <RevenueStatusRow
          label="Failed"
          value={failed}
          percentage={failedPercent}
          dotColor="#dc2626"
          formatMoney={formatMoney}
        />

        {/* Total */}
        <div
          style={{
            marginTop: "4px",
            paddingTop: "14px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "14px",
              fontWeight: "700",
              color: "#334155",
            }}
          >
            Total Revenue
          </span>

          <strong
            style={{
              fontSize: "18px",
              color: "#0f172a",
            }}
          >
            {formatMoney(total)}
          </strong>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   REVENUE STATUS ROW
   ========================================================= */

function RevenueStatusRow({ label, value, percentage, dotColor, formatMoney }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "7px",
      }}
    >
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
            gap: "8px",
          }}
        >
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: dotColor,
              display: "inline-block",
            }}
          />

          <span
            style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "#334155",
            }}
          >
            {label}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <strong
            style={{
              color: "#0f172a",
              fontSize: "14px",
            }}
          >
            {formatMoney(value)}
          </strong>

          <span
            style={{
              minWidth: "52px",
              textAlign: "right",
              color: "#64748b",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            {percentage.toFixed(1)}%
          </span>
        </div>
      </div>

      <div
        style={{
          width: "100%",
          height: "7px",
          backgroundColor: "#f1f5f9",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.min(percentage, 100)}%`,
            height: "100%",
            backgroundColor: dotColor,
            borderRadius: "10px",
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

/* =========================================================
   SEARCH INPUT
   ========================================================= */

function SearchInput({ placeholder, value, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        backgroundColor: "#f8fafc",
        border: "1px solid #cbd5e1",
        borderRadius: "6px",
        padding: "8px 12px",
      }}
    >
      <Search size={16} color="#64748b" />

      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{
          border: "none",
          outline: "none",
          background: "transparent",
          width: "100%",
          fontSize: "13px",
        }}
      />
    </div>
  );
}

/* =========================================================
   STATUS BADGE
   ========================================================= */

function StatusBadge({ status }) {
  const s = (status || "pending").toLowerCase();

  let bg = "#fffbeb";
  let color = "#d97706";

  if (s === "paid") {
    bg = "#ecfdf5";
    color = "#059669";
  } else if (s === "failed") {
    bg = "#fef2f2";
    color = "#dc2626";
  }

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

/* =========================================================
   STYLES
   ========================================================= */

const thStyle = {
  padding: "12px 14px",
  fontSize: "13px",
  fontWeight: "600",
};

const tdStyle = {
  padding: "12px 14px",
  color: "#334155",
};

const iconBtnStyle = {
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  backgroundColor: "#ffffff",
  padding: "6px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
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
  padding: "20px",
  boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
};

const closeBtnStyle = {
  border: "none",
  background: "none",
  cursor: "pointer",
  color: "#64748b",
  padding: "4px",
};

const boxStyle = {
  backgroundColor: "#f8fafc",
  padding: "14px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
};

const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "6px 0",
  fontSize: "14px",
};

const labelStyle = {
  color: "#64748b",
  fontSize: "13px",
};
