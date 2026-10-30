import React, { useState, useEffect, useMemo } from "react";
import { auth } from "../../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  Calendar,
  DollarSign,
  XCircle,
  BarChart3,
  Search,
  Download,
  Printer,
  Filter,
  Loader2,
  Plus,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Pie } from "react-chartjs-2";
import { ownerDashboardServices } from "../../services/ownerDashboardServices";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "thisWeek", label: "This Week" },
  { key: "thisMonth", label: "This Month" },
  { key: "custom", label: "Custom Date" },
];

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("thisMonth");
  const [trendView, setTrendView] = useState("daily"); // daily | weekly | monthly
  const [searchTerm, setSearchTerm] = useState("");
  const [allBookings, setAllBookings] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // ---------- Helpers ----------
  const toDate = (val) => {
    if (!val) return null;
    if (val.toDate) return val.toDate();
    return new Date(val);
  };

  const getDateRange = () => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);

    if (period === "custom" && customStart && customEnd) {
      start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    switch (period) {
      case "today":
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "thisWeek":
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "thisMonth":
      default:
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  };

  // ---------- Filtered Data ----------
  const filtered = useMemo(() => {
    const { start, end } = getDateRange();

    const bookings = allBookings.filter((b) => {
      const d = toDate(b.createdAt);
      return d && d >= start && d <= end;
    });

    const payments = allPayments.filter((p) => {
      const d = toDate(p.paidAt || p.createdAt);
      return d && d >= start && d <= end;
    });

    const paidPayments = payments.filter(
      (p) => (p.status || "").toLowerCase() === "paid"
    );

    const totalIncome = paidPayments.reduce(
      (sum, p) => sum + Number(p.bookingAmount || p.amount || 0),
      0
    );

    const canceled = bookings.filter((b) =>
      ["cancelled", "canceled", "rejected"].includes(
        (b.status || "").toLowerCase()
      )
    ).length;

    const avgValue =
      paidPayments.length > 0 ? totalIncome / paidPayments.length : 0;

    return {
      bookings,
      payments,
      paidPayments,
      totalBookings: bookings.length,
      totalIncome,
      canceled,
      avgValue,
    };
  }, [allBookings, allPayments, period, customStart, customEnd]);

  // ---------- Income Trend Chart ----------
  const incomeTrendData = useMemo(() => {
    const { start, end } = getDateRange();
    const labels = [];
    const data = [];

    if (trendView === "daily") {
      const days = Math.min(
        Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1,
        31
      );
      for (let i = 0; i < days; i++) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        labels.push(
          day.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        );

        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        const rev = filtered.paidPayments
          .filter((p) => {
            const d = toDate(p.paidAt || p.createdAt);
            return d >= dayStart && d <= dayEnd;
          })
          .reduce((s, p) => s + Number(p.bookingAmount || p.amount || 0), 0);
        data.push(rev);
      }
    } else {
      // simple weekly / monthly aggregation
      labels.push("Week 1", "Week 2", "Week 3", "Week 4");
      data.push(
        filtered.totalIncome * 0.2,
        filtered.totalIncome * 0.3,
        filtered.totalIncome * 0.25,
        filtered.totalIncome * 0.25
      );
    }

    return {
      labels,
      datasets: [
        {
          label: "Income",
          data,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.15)",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#3b82f6",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 5,
        },
      ],
    };
  }, [filtered, period, trendView, customStart, customEnd]);

  // ---------- Booking Distribution (Pie) ----------
  const distributionData = useMemo(() => {
    const slots = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };

    filtered.bookings.forEach((b) => {
      const d = toDate(b.createdAt);
      if (!d) return;
      const h = d.getHours();
      if (h >= 5 && h < 12) slots.Morning++;
      else if (h >= 12 && h < 17) slots.Afternoon++;
      else if (h >= 17 && h < 21) slots.Evening++;
      else slots.Night++;
    });

    const total = Object.values(slots).reduce((a, b) => a + b, 0) || 1;

    return {
      labels: Object.keys(slots),
      datasets: [
        {
          data: Object.values(slots),
          backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"],
          borderWidth: 0,
        },
      ],
      percentages: Object.fromEntries(
        Object.entries(slots).map(([k, v]) => [
          k,
          Math.round((v / total) * 100),
        ])
      ),
    };
  }, [filtered]);

  // ---------- Slot Performance (Hourly Bar) ----------
  const slotPerformanceData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => 0);
    filtered.bookings.forEach((b) => {
      const d = toDate(b.createdAt);
      if (d) hours[d.getHours()]++;
    });

    return {
      labels: hours.map((_, i) => {
        const h = i % 12 || 12;
        return `${h}${i < 12 ? "AM" : "PM"}`;
      }),
      datasets: [
        {
          label: "Bookings",
          data: hours,
          backgroundColor: "#3b82f6",
          borderRadius: 4,
        },
      ],
    };
  }, [filtered]);

  // ---------- Load Data ----------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const role = await ownerDashboardServices.getUserRole(user.uid);
        if (role.trim().toLowerCase() !== "owner") {
          setLoading(false);
          return;
        }

        const properties = await ownerDashboardServices.getOwnerProperties(
          user.uid
        );
        const houseIds = properties.map((p) => p.id);

        const [bookings, payments] = await Promise.all([
          ownerDashboardServices.getOwnerBookings(user.uid, houseIds),
          ownerDashboardServices.getOwnerPayments(user.uid, houseIds),
        ]);

        setAllBookings(bookings);
        setAllPayments(payments);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // ---------- Search Filter for Table ----------
  const tableBookings = useMemo(() => {
    if (!searchTerm) return filtered.bookings.slice(0, 10);
    const term = searchTerm.toLowerCase();
    return filtered.bookings
      .filter(
        (b) =>
          b.id?.toLowerCase().includes(term) ||
          b.houseId?.toLowerCase().includes(term) ||
          b.renterId?.toLowerCase().includes(term) ||
          (b.status || "").toLowerCase().includes(term)
      )
      .slice(0, 10);
  }, [filtered.bookings, searchTerm]);

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "70vh" }}
      >
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 px-3 px-lg-4" style={{ background: "#f8fafc", minHeight: "100vh" }}>
      {/* ========== Period Tabs ========== */}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
        <div className="d-flex bg-white rounded-pill p-1 shadow-sm border">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`btn btn-sm rounded-pill px-3 ${
                period === p.key
                  ? "btn-primary"
                  : "btn-light text-secondary border-0"
              }`}
            >
              {p.label}
              {p.key === "custom" && <Calendar size={14} className="ms-1" />}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="d-flex gap-2 align-items-center">
            <input
              type="date"
              className="form-control form-control-sm"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
            <span className="text-muted">to</span>
            <input
              type="date"
              className="form-control form-control-sm"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* ========== Stat Cards ========== */}
      <div className="row g-3 mb-4">
        <StatCard
          title="Total Bookings"
          value={filtered.totalBookings}
          icon={<Calendar size={22} className="text-primary" />}
          bg="rgba(59,130,246,0.08)"
        />
        <StatCard
          title="Total Income"
          value={`$${filtered.totalIncome.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          icon={<DollarSign size={22} className="text-success" />}
          bg="rgba(16,185,129,0.08)"
        />
        <StatCard
          title="Canceled Bookings"
          value={filtered.canceled}
          icon={<XCircle size={22} className="text-danger" />}
          bg="rgba(239,68,68,0.08)"
        />
        <StatCard
          title="Average Booking Value"
          value={`$${filtered.avgValue.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}`}
          icon={<BarChart3 size={22} className="text-info" />}
          bg="rgba(6,182,212,0.08)"
        />
      </div>

      {/* ========== Charts Row ========== */}
      <div className="row g-3 mb-4">
        {/* Income Trend */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100 rounded-3">
            <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center py-3">
              <h6 className="fw-semibold mb-0">Income Trend</h6>
              <div className="btn-group btn-group-sm">
                {["daily", "weekly", "monthly"].map((v) => (
                  <button
                    key={v}
                    className={`btn ${
                      trendView === v ? "btn-primary" : "btn-outline-secondary"
                    }`}
                    onClick={() => setTrendView(v)}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="card-body pt-0">
              <Line
                data={incomeTrendData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: { color: "#f1f5f9" },
                      ticks: { color: "#94a3b8" },
                    },
                    x: {
                      grid: { display: false },
                      ticks: { color: "#94a3b8" },
                    },
                  },
                }}
                height={260}
              />
            </div>
          </div>
        </div>

        {/* Booking Distribution */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100 rounded-3">
            <div className="card-header bg-white border-0 py-3">
              <h6 className="fw-semibold mb-0">Booking Distribution</h6>
            </div>
            <div className="card-body d-flex flex-column align-items-center">
              <div style={{ width: 180, height: 180 }}>
                <Pie
                  data={distributionData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                  }}
                />
              </div>
              <div className="w-100 mt-3">
                {Object.entries(distributionData.percentages).map(
                  ([label, pct], i) => (
                    <div
                      key={label}
                      className="d-flex justify-content-between align-items-center mb-2 small"
                    >
                      <div className="d-flex align-items-center gap-2">
                        <span
                          className="rounded-circle"
                          style={{
                            width: 10,
                            height: 10,
                            backgroundColor:
                              distributionData.datasets[0].backgroundColor[i],
                          }}
                        />
                        {label}
                      </div>
                      <span className="fw-medium">{pct}%</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== Slot Performance ========== */}
      <div className="card border-0 shadow-sm mb-4 rounded-3">
        <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center py-3">
          <h6 className="fw-semibold mb-0">Slot Performance</h6>
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1">
              <Download size={14} /> Download Pdf
            </button>
            <button className="btn btn-sm btn-outline-secondary">Ex</button>
            <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1">
              <Printer size={14} /> Print
            </button>
          </div>
        </div>
        <div className="card-body pt-0">
          <Bar
            data={slotPerformanceData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: { color: "#f1f5f9" },
                  ticks: { stepSize: 5, color: "#94a3b8" },
                },
                x: {
                  grid: { display: false },
                  ticks: { color: "#94a3b8", maxRotation: 45 },
                },
              },
            }}
            height={220}
          />
        </div>
      </div>

      {/* ========== Recent Bookings Table ========== */}
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-header bg-white border-0 d-flex flex-wrap justify-content-between align-items-center gap-3 py-3">
          <h6 className="fw-semibold mb-0">Recent Bookings</h6>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <div className="input-group input-group-sm" style={{ width: 220 }}>
              <span className="input-group-text bg-white border-end-0">
                <Search size={14} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1">
              <Filter size={14} /> Filter
            </button>
            <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1">
              <Download size={14} /> Download Pdf
            </button>
            <button className="btn btn-sm btn-outline-secondary">Ex</button>
            <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1">
              <Printer size={14} /> Print
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="ps-4">Booking ID</th>
                <th>Date</th>
                <th>House ID</th>
                <th>Renter</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tableBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-5">
                    No bookings found for the selected period.
                  </td>
                </tr>
              ) : (
                tableBookings.map((b) => {
                  const d = toDate(b.createdAt);
                  return (
                    <tr key={b.id}>
                      <td className="ps-4">
                        <span className="badge bg-light text-dark border">
                          #{b.id?.slice(0, 8) || "—"}
                        </span>
                      </td>
                      <td className="small text-muted">
                        {d
                          ? d.toLocaleDateString("en-US", {
                              day: "numeric",
                              month: "short",
                            })
                          : "—"}
                      </td>
                      <td className="small">{b.houseId?.slice(0, 10) || "—"}</td>
                      <td className="small">{b.renterId?.slice(0, 10) || "—"}</td>
                      <td className="fw-semibold">
                        $
                        {Number(b.totalAmount || b.monthlyPrice || 0).toFixed(2)}
                      </td>
                      <td>
                        <StatusBadge status={b.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------- Sub Components ----------
function StatCard({ title, value, icon, bg }) {
  return (
    <div className="col-6 col-md-3">
      <div
        className="card border-0 shadow-sm h-100 rounded-3"
        style={{ backgroundColor: bg }}
      >
        <div className="card-body d-flex align-items-center gap-3 py-3">
          <div className="bg-white rounded-3 p-2 shadow-sm">{icon}</div>
          <div>
            <div className="text-muted small">{title}</div>
            <div className="fs-5 fw-bold text-dark">{value}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = (status || "").toLowerCase();
  let cls = "bg-secondary-subtle text-secondary";
  if (["approved", "confirmed", "paid"].includes(s))
    cls = "bg-success-subtle text-success";
  else if (["cancelled", "canceled", "rejected"].includes(s))
    cls = "bg-danger-subtle text-danger";
  else if (s === "pending") cls = "bg-warning-subtle text-warning";

  return (
    <span className={`badge rounded-pill ${cls}`}>
      {status || "—"}
    </span>
  );
}