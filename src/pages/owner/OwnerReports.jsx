
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../services/firebase";
import { fetchOwnerReportsData } from "../../services/reportService";
import {
  DollarSign, TrendingUp, Building2, Calendar, Download, Loader2,
  BarChart3, CheckCircle2, Clock, XCircle, FileSpreadsheet, Printer,
  Send, Filter, CreditCard, RefreshCw, Wallet, ArrowUpRight,
  CalendarDays, PieChart, RotateCcw,
} from "lucide-react";

const COLORS = {
  primary: "#4f46e5",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  background: "#f8fafc",
};

const cardStyle = {
  background: "#fff",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 12,
  padding: 20,
  minWidth: 0,
  boxShadow: "0 1px 3px rgba(15,23,42,.04)",
};

const headerStyle = {
  padding: "10px 12px",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const dateOptions = [
  { value: "all", label: "All Time" },
  { value: "day", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "3months", label: "Last 3 Months" },
  { value: "custom", label: "Custom Date" },
];

const paidStatuses = ["paid", "completed", "success", "successful"];
const failedStatuses = ["failed", "rejected", "cancelled", "canceled"];

function toDate(value) {
  if (value == null || value === "") return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value?.toDate === "function") {
    try {
      const date = value.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime())
        ? date
        : null;
    } catch {
      return null;
    }
  }

  if (typeof value === "object" && typeof value.seconds === "number") {
    const date = new Date(value.seconds * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) return null;
    return date;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getTransactionDate(booking) {
  // Use the same date for filtering and displaying the transaction.
  return (
    booking.reportDate ??
    booking.paidAt ??
    booking.createdAt ??
    booking.updatedAt ??
    booking.bookingDate ??
    booking.startDate ??
    null
  );
}

function getAmount(booking) {
  const value =
    booking.bookingAmount ??
    booking.totalAmount ??
    booking.price ??
    booking.amount ??
    0;

  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function getPaymentStatus(booking) {
  return String(
    booking.paymentStatus ??
    booking.payment_status ??
    booking.paymentState ??
    "pending"
  ).trim().toLowerCase();
}

function isPaid(booking) {
  return paidStatuses.includes(getPaymentStatus(booking));
}

function isFailed(booking) {
  return failedStatuses.includes(getPaymentStatus(booking));
}

function formatUSD(value) {
  const amount = Number(value);
  return `$${(Number.isFinite(amount) ? amount : 0).toLocaleString(
    "en-US",
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  )}`;
}

function formatDate(value) {
  const date = toDate(value);
  if (!date) return "N/A";

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatShortDate(value) {
  if (!value) return "";
  return formatDate(`${value}T12:00:00`);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function getDateRange(filter, startDate, endDate) {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  if (filter === "all") return { range: null, error: "" };

  if (filter === "custom") {
    if (!startDate || !endDate) {
      return {
        range: null,
        error: "Please select both the start date and end date.",
      };
    }

    const start = toDate(startDate);
    const end = toDate(endDate);

    if (!start || !end) {
      return { range: null, error: "Please select valid dates." };
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      return {
        range: null,
        error: "The start date must be before or equal to the end date.",
      };
    }

    return { range: { start, end }, error: "" };
  }

  if (filter === "day") {
    return {
      range: { start: startOfToday, end: endOfToday },
      error: "",
    };
  }

  if (filter === "week") {
    const start = new Date(startOfToday);
    const day = start.getDay();
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
    return { range: { start, end: endOfToday }, error: "" };
  }

  if (filter === "month") {
    const start = new Date(startOfToday);
    start.setDate(1);
    return { range: { start, end: endOfToday }, error: "" };
  }

  if (filter === "3months") {
    const start = new Date(startOfToday);
    start.setMonth(start.getMonth() - 3);
    return { range: { start, end: endOfToday }, error: "" };
  }

  return { range: null, error: "" };
}

export default function OwnerReports() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [loadError, setLoadError] = useState("");

  const [timeFilter, setTimeFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [transactionFilter, setTransactionFilter] = useState("all");

  const loadReport = useCallback(async (ownerId, isRefresh = false) => {
    if (!ownerId) {
      setReportData(null);
      setLoadError("Please sign in to view your reports.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setLoadError("");

    try {
      const data = await fetchOwnerReportsData(ownerId);
      setReportData(data ?? { summary: {}, recentBookings: [], properties: [] });
    } catch (error) {
      console.error("Failed to load owner reports:", error);
      setLoadError(
        "Unable to load reports. Check your connection and Firebase permissions, then try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        loadReport(user.uid);
      } else {
        setReportData(null);
        setLoadError("Please sign in to view your reports.");
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [loadReport]);

  const bookings = useMemo(() => {
    const list = reportData?.recentBookings;
    return Array.isArray(list) ? list : [];
  }, [reportData]);

  const { range: selectedDateRange, error: dateError } = useMemo(
    () => getDateRange(timeFilter, customStartDate, customEndDate),
    [timeFilter, customStartDate, customEndDate]
  );

  const filteredBookings = useMemo(() => {
    // Invalid custom dates must not silently display unfiltered data.
    if (dateError) return [];

    return bookings.filter((booking) => {
      if (!selectedDateRange) return true;

      const date = toDate(getTransactionDate(booking));
      if (!date) return false;

      return date >= selectedDateRange.start &&
        date <= selectedDateRange.end;
    });
  }, [bookings, selectedDateRange, dateError]);

  const filteredSummary = useMemo(() => {
    const statusCounts = {
      approved: 0,
      pending: 0,
      cancelled: 0,
      rejected: 0,
      completed: 0,
    };

    const categoryMap = {};
    let totalRevenue = 0;
    let totalPaidRevenue = 0;
    let pendingPayments = 0;
    let failedPayments = 0;
    let paidTransactions = 0;
    let pendingTransactions = 0;
    let failedTransactions = 0;

    filteredBookings.forEach((booking) => {
      const amount = getAmount(booking);
      totalRevenue += amount;

      if (isPaid(booking)) {
        totalPaidRevenue += amount;
        paidTransactions++;
      } else if (isFailed(booking)) {
        failedPayments += amount;
        failedTransactions++;
      } else {
        pendingPayments += amount;
        pendingTransactions++;
      }

      const status = String(booking.status || "pending").toLowerCase();
      if (Object.prototype.hasOwnProperty.call(statusCounts, status)) {
        statusCounts[status]++;
      } else {
        statusCounts.pending++;
      }

      const category =
        booking.category || booking.propertyCategory || "Other";

      categoryMap[category] = (categoryMap[category] || 0) + amount;
    });

    const sourceSummary = reportData?.summary || {};
    const totalProperties = Number(sourceSummary.totalProperties) || 0;
    const occupiedProperties = Number(sourceSummary.occupiedProperties) || 0;

    const occupancyRate = totalProperties > 0
      ? Math.round((occupiedProperties / totalProperties) * 100)
      : Number(sourceSummary.occupancyRate) || 0;

    return {
      totalRevenue,
      totalPaidRevenue,
      pendingPayments,
      failedPayments,
      totalBookings: filteredBookings.length,
      totalProperties,
      occupiedProperties,
      occupancyRate,
      paidTransactions,
      pendingTransactions,
      failedTransactions,
      statusCounts,
      categoryRevenue: Object.entries(categoryMap)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount),
    };
  }, [filteredBookings, reportData]);

  const filteredTransactions = useMemo(() => {
    if (transactionFilter === "paid") return filteredBookings.filter(isPaid);
    if (transactionFilter === "pending") {
      return filteredBookings.filter((booking) => !isPaid(booking) && !isFailed(booking));
    }
    if (transactionFilter === "failed") return filteredBookings.filter(isFailed);
    return filteredBookings;
  }, [filteredBookings, transactionFilter]);

  const reportPeriodLabel = useMemo(() => {
    const option = dateOptions.find((item) => item.value === timeFilter);

    if (timeFilter === "custom") {
      if (!customStartDate || !customEndDate) return "Custom Date";
      return `${formatShortDate(customStartDate)} - ${formatShortDate(customEndDate)}`;
    }

    return option?.label || "All Time";
  }, [timeFilter, customStartDate, customEndDate]);

  const handleRefresh = () => {
    if (auth.currentUser) loadReport(auth.currentUser.uid, true);
  };

  const resetFilters = () => {
    setTimeFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setTransactionFilter("all");
  };

  const handleShareTelegram = () => {
    const message = [
      "RentEase Owner Financial Report",
      `Report Period: ${reportPeriodLabel}`,
      `Total Revenue: ${formatUSD(filteredSummary.totalRevenue)}`,
      `Paid Revenue: ${formatUSD(filteredSummary.totalPaidRevenue)}`,
      `Pending Payments: ${formatUSD(filteredSummary.pendingPayments)}`,
      `Failed Payments: ${formatUSD(filteredSummary.failedPayments)}`,
      `Total Bookings: ${filteredSummary.totalBookings}`,
      `Paid Transactions: ${filteredSummary.paidTransactions}`,
      `Pending Transactions: ${filteredSummary.pendingTransactions}`,
      `Failed Transactions: ${filteredSummary.failedTransactions}`,
      `Generated: ${new Date().toLocaleString()}`,
    ].join("\n");

    const url = `https://t.me/share/url?url=${encodeURIComponent(
      window.location.origin
    )}&text=${encodeURIComponent(message)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handlePrintReport = () => {
    const printWindow = window.open("", "_blank", "width=1200,height=900");

    if (!printWindow) {
      alert("Please allow pop-ups to print the report.");
      return;
    }

    const transactionRows = filteredTransactions.length
      ? filteredTransactions.map((booking) => `
        <tr>
          <td>${escapeHtml(booking.id || "")}</td>
          <td>${escapeHtml(booking.renterName || "Guest Renter")}</td>
          <td>${escapeHtml(booking.propertyTitle || "Property")}</td>
          <td>${escapeHtml(booking.status || "Pending")}</td>
          <td>${escapeHtml(getPaymentStatus(booking))}</td>
          <td>${formatUSD(getAmount(booking))}</td>
          <td>${formatDate(getTransactionDate(booking))}</td>
        </tr>
      `).join("")
      : `<tr><td colspan="7">No financial records found.</td></tr>`;

    const categoryRows = filteredSummary.categoryRevenue.length
      ? filteredSummary.categoryRevenue.map((category) => `
        <tr>
          <td>${escapeHtml(category.category)}</td>
          <td>${formatUSD(category.amount)}</td>
        </tr>
      `).join("")
      : `<tr><td colspan="2">No category data</td></tr>`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>RentEase Financial Report</title>
        <style>
          body{font-family:Arial,sans-serif;color:#0f172a;padding:24px}
          h1{font-size:24px}
          h2{font-size:17px;margin-top:28px}
          .muted{color:#64748b}
          .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
          .card{border:1px solid #e2e8f0;padding:14px;border-radius:8px}
          table{width:100%;border-collapse:collapse;font-size:12px}
          th,td{text-align:left;padding:9px;border-bottom:1px solid #e2e8f0}
          th{background:#f8fafc}
          @media print{body{padding:5px}}
        </style>
      </head>
      <body>
        <h1>Financial & Revenue Report</h1>
        <p class="muted">RentEase Owner Financial Report</p>
        <p><strong>Report Period:</strong> ${escapeHtml(reportPeriodLabel)}</p>
        <p><strong>Generated:</strong> ${escapeHtml(new Date().toLocaleString())}</p>
        <div class="cards">
          <div class="card">Total Revenue<h2>${formatUSD(filteredSummary.totalRevenue)}</h2></div>
          <div class="card">Paid Revenue<h2>${formatUSD(filteredSummary.totalPaidRevenue)}</h2></div>
          <div class="card">Pending Payments<h2>${formatUSD(filteredSummary.pendingPayments)}</h2></div>
          <div class="card">Failed Payments<h2>${formatUSD(filteredSummary.failedPayments)}</h2></div>
        </div>
        <h2>Payment Summary</h2>
        <table>
          <thead><tr><th>Status</th><th>Transactions</th><th>Amount</th></tr></thead>
          <tbody>
            <tr><td>Paid</td><td>${filteredSummary.paidTransactions}</td><td>${formatUSD(filteredSummary.totalPaidRevenue)}</td></tr>
            <tr><td>Pending</td><td>${filteredSummary.pendingTransactions}</td><td>${formatUSD(filteredSummary.pendingPayments)}</td></tr>
            <tr><td>Failed</td><td>${filteredSummary.failedTransactions}</td><td>${formatUSD(filteredSummary.failedPayments)}</td></tr>
          </tbody>
        </table>
        <h2>Revenue by Category</h2>
        <table><thead><tr><th>Category</th><th>Revenue</th></tr></thead><tbody>${categoryRows}</tbody></table>
        <h2>Financial Transactions</h2>
        <table>
          <thead><tr><th>Booking ID</th><th>Renter</th><th>Property</th><th>Status</th><th>Payment</th><th>Amount</th><th>Date</th></tr></thead>
          <tbody>${transactionRows}</tbody>
        </table>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };

  const handleExportExcel = async () => {
    try {
      const XLSX = await import("xlsx");

      const summaryRows = [
        { Metric: "Report Period", Value: reportPeriodLabel },
        { Metric: "Total Revenue", Value: filteredSummary.totalRevenue },
        { Metric: "Paid Revenue", Value: filteredSummary.totalPaidRevenue },
        { Metric: "Pending Payments", Value: filteredSummary.pendingPayments },
        { Metric: "Failed Payments", Value: filteredSummary.failedPayments },
        { Metric: "Total Bookings", Value: filteredSummary.totalBookings },
        { Metric: "Paid Transactions", Value: filteredSummary.paidTransactions },
        { Metric: "Pending Transactions", Value: filteredSummary.pendingTransactions },
        { Metric: "Failed Transactions", Value: filteredSummary.failedTransactions },
        { Metric: "Total Properties", Value: filteredSummary.totalProperties },
        { Metric: "Occupancy Rate", Value: `${filteredSummary.occupancyRate}%` },
      ];

      const transactionRows = filteredTransactions.map((booking) => ({
        "Booking ID": booking.id || "",
        Renter: booking.renterName || "Guest Renter",
        Property: booking.propertyTitle || "Property",
        Status: booking.status || "Pending",
        "Payment Status": getPaymentStatus(booking),
        "Payment Method": booking.paymentMethod || "N/A",
        "Amount (USD)": getAmount(booking),
        Date: formatDate(getTransactionDate(booking)),
      }));

      const categoryRows = filteredSummary.categoryRevenue.map((category) => ({
        Category: category.category,
        "Revenue (USD)": category.amount,
      }));

      const workbook = XLSX.utils.book_new();

      const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
      summarySheet["!cols"] = [{ wch: 28 }, { wch: 32 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      const transactionSheet = XLSX.utils.json_to_sheet(transactionRows, {
        header: [
          "Booking ID", "Renter", "Property", "Status",
          "Payment Status", "Payment Method", "Amount (USD)", "Date",
        ],
      });
      transactionSheet["!cols"] = [
        { wch: 24 }, { wch: 22 }, { wch: 28 }, { wch: 16 },
        { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
      ];
      XLSX.utils.book_append_sheet(workbook, transactionSheet, "Transactions");

      const categorySheet = XLSX.utils.json_to_sheet(categoryRows, {
        header: ["Category", "Revenue (USD)"],
      });
      XLSX.utils.book_append_sheet(workbook, categorySheet, "Revenue by Category");

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet([
          { Status: "Paid", Transactions: filteredSummary.paidTransactions, Amount: filteredSummary.totalPaidRevenue },
          { Status: "Pending", Transactions: filteredSummary.pendingTransactions, Amount: filteredSummary.pendingPayments },
          { Status: "Failed", Transactions: filteredSummary.failedTransactions, Amount: filteredSummary.failedPayments },
        ]),
        "Payment Summary"
      );

      XLSX.writeFile(
        workbook,
        `RentEase_Financial_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (error) {
      console.error("Excel export failed:", error);
      alert("Excel export failed. Install the xlsx package using: npm install xlsx");
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "70vh", display: "flex",
        justifyContent: "center", alignItems: "center",
      }}>
        <Loader2 className="animate-spin" size={36} color={COLORS.primary} />
      </div>
    );
  }

  if (loadError && !reportData) {
    return (
      <div style={{ width: "100%", padding: 24, boxSizing: "border-box" }}>
        <div style={{ ...cardStyle, textAlign: "center", padding: 40 }}>
          <XCircle size={36} color="#dc2626" />
          <h2>Unable to load reports</h2>
          <p style={{ color: COLORS.muted }}>{loadError}</p>
          <button style={buttonStyle} onClick={handleRefresh}>
            <RefreshCw size={15} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <main style={{
      width: "100%",
      maxWidth: "none",
      minWidth: 0,
      minHeight: "100vh",
      margin: 0,
      padding: "24px",
      paddingBottom: 40,
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      gap: 20,
      background: "#f8fafc",
    }}>
      {/* Header */}
      <header style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", flexWrap: "wrap", gap: 16,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11,
              display: "grid", placeItems: "center",
              background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
            }}>
              <BarChart3 color="white" size={21} />
            </div>
            <h1 style={{ margin: 0, fontSize: 25, color: COLORS.text }}>
              Financial Reports
            </h1>
          </div>
          <p style={{ margin: "8px 0 0", color: COLORS.muted, fontSize: 14 }}>
            Track property revenue, payments, transactions and financial performance.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={buttonStyle} onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <button style={{ ...buttonStyle, background: "#229ed9", color: "#fff", border: 0 }}
            onClick={handleShareTelegram}>
            <Send size={15} /> Telegram
          </button>
          <button style={{ ...buttonStyle, background: "#0f172a", color: "#fff", border: 0 }}
            onClick={handlePrintReport}>
            <Printer size={15} /> Print
          </button>
          <button style={{ ...buttonStyle, background: "#16a34a", color: "#fff", border: 0 }}
            onClick={handleExportExcel}>
            <FileSpreadsheet size={15} /> Excel
          </button>
        </div>
      </header>

      {/* Date Filter */}
      <section style={cardStyle}>
        <SectionTitle icon={<Filter size={18} color={COLORS.primary} />}
          title="Report Date" subtitle="Select a period to filter all financial data." />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {dateOptions.map((option) => {
            const active = timeFilter === option.value;
            return (
              <button key={option.value}
                onClick={() => setTimeFilter(option.value)}
                style={{
                  ...buttonStyle,
                  background: active ? "#eef2ff" : "#fff",
                  borderColor: active ? COLORS.primary : COLORS.border,
                  color: active ? "#4338ca" : "#475569",
                }}>
                {option.label}
              </button>
            );
          })}
          <button onClick={resetFilters} style={buttonStyle}>
            <RotateCcw size={14} /> Reset
          </button>
        </div>

        {timeFilter === "custom" && (
          <div style={{
            marginTop: 18, paddingTop: 18,
            borderTop: `1px solid ${COLORS.border}`,
            display: "flex", alignItems: "end", gap: 14, flexWrap: "wrap",
          }}>
            <DateInput label="FROM DATE" value={customStartDate}
              max={customEndDate || undefined}
              onChange={setCustomStartDate} />
            <DateInput label="TO DATE" value={customEndDate}
              min={customStartDate || undefined}
              onChange={setCustomEndDate} />
            <button style={buttonStyle} onClick={() => {
              setCustomStartDate("");
              setCustomEndDate("");
            }}>
              Clear Dates
            </button>
          </div>
        )}

        {dateError && (
          <p role="alert" style={{
            margin: "12px 0 0", color: "#b91c1c", fontSize: 13,
          }}>
            {dateError}
          </p>
        )}
      </section>

      {/* Period Summary */}
      <section style={{
        display: "flex", justifyContent: "space-between",
        gap: 12, flexWrap: "wrap", alignItems: "center",
        background: "#eef2ff", border: "1px solid #c7d2fe",
        borderRadius: 10, padding: "13px 16px",
      }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", color: "#3730a3" }}>
          <Calendar size={17} />
          <strong>Report Period:</strong> {reportPeriodLabel}
        </div>
        <span style={{ color: "#4338ca", fontSize: 13 }}>
          {filteredBookings.length} records found
        </span>
      </section>

      {loadError && (
        <p role="alert" style={{ color: "#b91c1c", margin: 0 }}>{loadError}</p>
      )}

      {/* KPI Cards */}
      <section style={gridStyle(230)}>
        <KpiCard title="Total Revenue" value={formatUSD(filteredSummary.totalRevenue)}
          subtitle={`${filteredSummary.totalBookings} bookings`}
          icon={<DollarSign color="#16a34a" />} bg="#f0fdf4" />
        <KpiCard title="Paid Revenue" value={formatUSD(filteredSummary.totalPaidRevenue)}
          subtitle={`${filteredSummary.paidTransactions} paid transactions`}
          icon={<TrendingUp color="#2563eb" />} bg="#eff6ff" />
        <KpiCard title="Pending Payments" value={formatUSD(filteredSummary.pendingPayments)}
          subtitle={`${filteredSummary.pendingTransactions} pending`}
          icon={<Clock color="#d97706" />} bg="#fffbeb" />
        <KpiCard title="Failed Payments" value={formatUSD(filteredSummary.failedPayments)}
          subtitle={`${filteredSummary.failedTransactions} failed`}
          icon={<XCircle color="#dc2626" />} bg="#fef2f2" />
      </section>

      {/* Secondary Statistics */}
      <section style={gridStyle(180)}>
        <MiniStat label="Total Bookings" value={filteredSummary.totalBookings}
          icon={<Building2 size={16} />} />
        <MiniStat label="Paid Transactions" value={filteredSummary.paidTransactions}
          icon={<CreditCard size={16} />} />
        <MiniStat label="Properties" value={filteredSummary.totalProperties}
          icon={<Building2 size={16} />} />
        <MiniStat label="Occupancy" value={`${filteredSummary.occupancyRate}%`}
          icon={<ArrowUpRight size={16} />} />
      </section>

      {/* Analytics */}
      <section style={gridStyle(320)}>
        <div style={cardStyle}>
          <SectionTitle icon={<BarChart3 size={18} color={COLORS.primary} />}
            title="Booking Status" subtitle="Bookings for the selected period" />
          <StatusRow label="Approved / Confirmed"
            count={filteredSummary.statusCounts.approved}
            icon={<CheckCircle2 size={16} color="#16a34a" />} color="#dcfce7" />
          <StatusRow label="Pending Review"
            count={filteredSummary.statusCounts.pending}
            icon={<Clock size={16} color="#d97706" />} color="#fef3c7" />
          <StatusRow label="Completed"
            count={filteredSummary.statusCounts.completed}
            icon={<CheckCircle2 size={16} color="#2563eb" />} color="#dbeafe" />
          <StatusRow label="Cancelled"
            count={filteredSummary.statusCounts.cancelled}
            icon={<XCircle size={16} color="#dc2626" />} color="#fee2e2" />
          <StatusRow label="Rejected"
            count={filteredSummary.statusCounts.rejected}
            icon={<XCircle size={16} color="#dc2626" />} color="#fee2e2" />
        </div>

        <div style={cardStyle}>
          <SectionTitle icon={<Wallet size={18} color={COLORS.primary} />}
            title="Payment Summary" subtitle="Payment status for the selected period" />
          <PaymentSummaryRow label="Paid"
            count={filteredSummary.paidTransactions}
            amount={filteredSummary.totalPaidRevenue}
            background="#f0fdf4" color="#15803d" />
          <PaymentSummaryRow label="Pending"
            count={filteredSummary.pendingTransactions}
            amount={filteredSummary.pendingPayments}
            background="#fffbeb" color="#b45309" />
          <PaymentSummaryRow label="Failed"
            count={filteredSummary.failedTransactions}
            amount={filteredSummary.failedPayments}
            background="#fef2f2" color="#b91c1c" />
        </div>

        <div style={cardStyle}>
          <SectionTitle icon={<PieChart size={18} color={COLORS.primary} />}
            title="Revenue by Category" subtitle="Revenue grouped by category" />
          {filteredSummary.categoryRevenue.length === 0 ? (
            <EmptyState>No category data available for this period.</EmptyState>
          ) : filteredSummary.categoryRevenue.map((item) => (
            <div key={item.category} style={{
              display: "flex", justifyContent: "space-between", gap: 10,
              padding: "12px", marginBottom: 8,
              background: COLORS.background, borderRadius: 8,
            }}>
              <span style={{ color: "#334155", fontSize: 13 }}>{item.category}</span>
              <strong style={{ color: COLORS.text, fontSize: 13 }}>
                {formatUSD(item.amount)}
              </strong>
            </div>
          ))}
        </div>
      </section>

      {/* Transactions */}
      <section style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", flexWrap: "wrap", gap: 12, padding: 20,
        }}>
          <div>
            <h2 style={{ margin: 0, color: COLORS.text, fontSize: 18 }}>
              Financial Transactions
            </h2>
            <p style={{ margin: "5px 0 0", color: COLORS.muted, fontSize: 12 }}>
              Payment records for {reportPeriodLabel}
            </p>
          </div>
          <button style={{ ...buttonStyle, color: "#15803d", background: "#f0fdf4" }}
            onClick={handleExportExcel}>
            <Download size={15} /> Export Report
          </button>
        </div>

        <div style={{
          display: "flex", gap: 6, flexWrap: "wrap",
          padding: "0 20px 16px",
        }}>
          {[
            { value: "all", label: "All", count: filteredBookings.length },
            { value: "paid", label: "Paid", count: filteredSummary.paidTransactions },
            { value: "pending", label: "Pending", count: filteredSummary.pendingTransactions },
            { value: "failed", label: "Failed", count: filteredSummary.failedTransactions },
          ].map((tab) => (
            <button key={tab.value}
              onClick={() => setTransactionFilter(tab.value)}
              style={{
                ...buttonStyle,
                background: transactionFilter === tab.value ? "#eef2ff" : "#f8fafc",
                color: transactionFilter === tab.value ? "#4338ca" : COLORS.muted,
                borderColor: transactionFilter === tab.value ? "#c7d2fe" : COLORS.border,
              }}>
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div style={{ width: "100%", overflowX: "auto" }}>
          <table style={{
            width: "100%", minWidth: 900, borderCollapse: "collapse",
            textAlign: "left", fontSize: 13,
          }}>
            <thead>
              <tr style={{
                background: COLORS.background, borderTop: `1px solid ${COLORS.border}`,
                borderBottom: `1px solid ${COLORS.border}`,
                color: COLORS.muted, fontSize: 11, textTransform: "uppercase",
              }}>
                <th style={headerStyle}>Booking ID</th>
                <th style={headerStyle}>Renter</th>
                <th style={headerStyle}>Property</th>
                <th style={headerStyle}>Payment Method</th>
                <th style={headerStyle}>Payment</th>
                <th style={{ ...headerStyle, textAlign: "right" }}>Amount</th>
                <th style={headerStyle}>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 50, textAlign: "center" }}>
                    <EmptyState>
                      <CreditCard size={30} color="#cbd5e1" />
                      <strong style={{ color: "#64748b" }}>No transactions found</strong>
                      <span style={{ color: "#94a3b8", fontSize: 12 }}>
                        {dateError
                          ? "Please correct your date selection."
                          : `No ${transactionFilter === "all" ? "" : transactionFilter + " "}
                            transactions for ${reportPeriodLabel}.`}
                      </span>
                    </EmptyState>
                  </td>
                </tr>
              ) : filteredTransactions.map((booking) => {
                const status = getPaymentStatus(booking);
                const paid = isPaid(booking);
                const failed = isFailed(booking);

                return (
                  <tr key={booking.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: 12, fontFamily: "monospace", color: COLORS.muted }}>
                      #{String(booking.id || "").slice(0, 10)}
                    </td>
                    <td style={{ padding: 12, color: COLORS.text, fontWeight: 600 }}>
                      {booking.renterName || "Guest Renter"}
                    </td>
                    <td style={{ padding: 12, color: "#334155" }}>
                      {booking.propertyTitle || "Property"}
                    </td>
                    <td style={{ padding: 12, color: COLORS.muted }}>
                      {booking.paymentMethod || "N/A"}
                    </td>
                    <td style={{ padding: 12 }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "5px 9px", borderRadius: 20, fontSize: 11,
                        fontWeight: 700, textTransform: "capitalize",
                        background: paid ? "#dcfce7" : failed ? "#fee2e2" : "#fef3c7",
                        color: paid ? "#15803d" : failed ? "#b91c1c" : "#b45309",
                      }}>
                        {paid ? <CheckCircle2 size={12} /> :
                          failed ? <XCircle size={12} /> : <Clock size={12} />}
                        {status}
                      </span>
                    </td>
                    <td style={{
                      padding: 12, textAlign: "right", fontWeight: 700,
                      color: paid ? "#15803d" : COLORS.text, whiteSpace: "nowrap",
                    }}>
                      {formatUSD(getAmount(booking))}
                    </td>
                    <td style={{ padding: 12, color: COLORS.muted, whiteSpace: "nowrap" }}>
                      {formatDate(getTransactionDate(booking))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function gridStyle(minWidth) {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minWidth}px), 1fr))`,
    gap: 16,
    minWidth: 0,
  };
}

const buttonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  padding: "9px 12px",
  borderRadius: 8,
  border: `1px solid ${COLORS.border}`,
  background: "#fff",
  color: "#475569",
  fontSize: 12,
  fontWeight: 650,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

function DateInput({ label, value, onChange, min, max }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.muted }}>
        {label}
      </span>
      <span style={{ position: "relative" }}>
        <CalendarDays size={15} color={COLORS.muted}
          style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input type="date" value={value} min={min} max={max}
          onChange={(event) => onChange(event.target.value)}
          style={{
            boxSizing: "border-box", minHeight: 38, padding: "8px 10px 8px 34px",
            borderRadius: 8, border: `1px solid ${COLORS.border}`,
            color: COLORS.text, fontSize: 13, background: "#fff",
          }} />
      </span>
    </label>
  );
}

function SectionTitle({ icon, title, subtitle }) {
  return (
    <div style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 16 }}>
      <div style={{ marginTop: 1 }}>{icon}</div>
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 750, color: COLORS.text, margin: 0 }}>
          {title}
        </h3>
        <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0" }}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function KpiCard({ title, value, subtitle, icon, bg }) {
  return (
    <div style={{
      ...cardStyle, display: "flex", alignItems: "center",
      justifyContent: "space-between", gap: 12, padding: 17,
    }}>
      <div style={{ minWidth: 0 }}>
        <span style={{ fontSize: 11, color: COLORS.muted, fontWeight: 650 }}>{title}</span>
        <h2 style={{
          fontSize: "clamp(17px, 2vw, 22px)", fontWeight: 750,
          color: COLORS.text, margin: "5px 0",
          overflowWrap: "anywhere",
        }}>{value}</h2>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>{subtitle}</span>
      </div>
      <div style={{
        flexShrink: 0, width: 42, height: 42, borderRadius: 11,
        background: bg, display: "grid", placeItems: "center",
      }}>{icon}</div>
    </div>
  );
}

function MiniStat({ label, value, icon }) {
  return (
    <div style={{ ...cardStyle, padding: "13px 15px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, color: COLORS.muted, fontSize: 12 }}>
        {icon}{label}
      </div>
      <div style={{ marginTop: 6, fontSize: 19, fontWeight: 750, color: COLORS.text }}>
        {value}
      </div>
    </div>
  );
}

function StatusRow({ label, count, icon, color }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      gap: 10, padding: "11px 12px", marginBottom: 8,
      borderRadius: 8, background: COLORS.background,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>{label}</span>
      </div>
      <span style={{
        padding: "4px 9px", borderRadius: 12, background: color,
        fontSize: 11, fontWeight: 700, color: COLORS.text,
      }}>{count}</span>
    </div>
  );
}

function PaymentSummaryRow({ label, count, amount, background, color }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      gap: 12, padding: "13px", marginBottom: 9,
      borderRadius: 9, background,
    }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color }}>{label}</div>
        <div style={{ fontSize: 11, color, opacity: 0.8, marginTop: 3 }}>
          {count} transaction{count !== 1 ? "s" : ""}
        </div>
      </div>
      <strong style={{ fontSize: 14, color, whiteSpace: "nowrap" }}>
        {formatUSD(amount)}
      </strong>
    </div>
  );
}

function EmptyState({ children }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 9, textAlign: "center",
    }}>
      {children}
    </div>
  );
}
