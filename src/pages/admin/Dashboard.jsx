import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  Users,
  UserCheck,
  Building2,
  CreditCard,
  Calendar,
  ChevronDown,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  DollarSign,
  CalendarDays,
  RefreshCw,
} from "lucide-react";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import {
  fetchDashboardRawData,
  calculateDateRange,
  aggregateDashboardData,
} from "../../services/adminDashboard";

/* =========================================================
   COLORS
========================================================= */

const COLORS = {
  blue: "#2563eb",
  purple: "#7c3aed",
  green: "#10b981",
  orange: "#f59e0b",
  red: "#ef4444",
  slate: "#64748b",
  dark: "#0f172a",
  border: "#e2e8f0",
  light: "#f8fafc",
};

/* =========================================================
   HELPERS
========================================================= */

function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date) {
  if (!date) {
    return "";
  }

  const d = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function normalizePaymentStatus(value) {
  return String(value || "Pending")
    .trim()
    .toLowerCase();
}

/* =========================================================
   CUSTOM TOOLTIP
========================================================= */

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      style={{
        background: "#0f172a",
        color: "#ffffff",
        padding: "12px 14px",
        borderRadius: 10,
        border: "1px solid #334155",
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.22)",
        minWidth: 170,
      }}
    >
      <div
        style={{
          color: "#94a3b8",
          fontSize: 11,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        {label}
      </div>

      {payload.map((item, index) => {
        const isAmount =
          item.dataKey === "amount" ||
          item.name === "Amount" ||
          item.name === "Paid Amount";

        return (
          <div
            key={`${item.dataKey}-${index}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginTop: index === 0 ? 0 : 7,
              fontSize: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: item.color,
                  flexShrink: 0,
                }}
              />

              <span
                style={{
                  color: "#cbd5e1",
                  whiteSpace: "nowrap",
                }}
              >
                {item.name}
              </span>
            </div>

            <strong
              style={{
                color: "#ffffff",
              }}
            >
              {isAmount
                ? formatMoney(item.value)
                : Number(item.value || 0).toLocaleString()}
            </strong>
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================
   KPI CARD
========================================================= */

function StatCard({ title, value, icon, background, iconColor, subtitle }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        padding: "17px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 96,
        boxShadow: "0 2px 5px rgba(15,23,42,0.035)",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          minWidth: 0,
          flex: 1,
        }}
      >
        <div
          style={{
            color: "#64748b",
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.6px",
          }}
        >
          {title}
        </div>

        <div
          style={{
            color: "#0f172a",
            fontSize: 25,
            fontWeight: 800,
            marginTop: 5,
            letterSpacing: "-0.5px",
            wordBreak: "break-word",
          }}
        >
          {value}
        </div>

        {subtitle && (
          <div
            style={{
              color: "#94a3b8",
              fontSize: 11,
              marginTop: 3,
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginLeft: 12,
        }}
      >
        {React.cloneElement(icon, {
          color: iconColor,
          size: 21,
        })}
      </div>
    </div>
  );
}

/* =========================================================
   STATUS ITEM
========================================================= */

function StatusItem({ icon, label, value, color }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "11px 0",
        borderBottom: "1px solid #f1f5f9",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minWidth: 0,
        }}
      >
        {React.cloneElement(icon, {
          size: 16,
          color,
        })}

        <span
          style={{
            fontSize: 13,
            color: "#475569",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      </div>

      <strong
        style={{
          fontSize: 14,
          color,
          flexShrink: 0,
        }}
      >
        {Number(value || 0).toLocaleString()}
      </strong>
    </div>
  );
}

/* =========================================================
   DATE FILTER BUTTON
========================================================= */

function DateFilterButton({
  filterType,
  filterLabel,
  setFilterType,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
}) {
  const [open, setOpen] = useState(false);

  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const options = [
    {
      value: "today",
      label: "Today",
    },
    {
      value: "yesterday",
      label: "Yesterday",
    },
    {
      value: "this_week",
      label: "This Week",
    },
    {
      value: "last_week",
      label: "Last Week",
    },
    {
      value: "this_month",
      label: "This Month",
    },
    {
      value: "last_month",
      label: "Last Month",
    },
    {
      value: "last_3_months",
      label: "Last 3 Months",
    },
    {
      value: "last_6_months",
      label: "Last 6 Months",
    },
    {
      value: "this_year",
      label: "This Year",
    },
    {
      value: "specific_date",
      label: "Specific Date",
    },
    {
      value: "custom",
      label: "Custom Range",
    },
  ];

  const selectOption = (value) => {
    setFilterType(value);

    if (value !== "custom" && value !== "specific_date") {
      setCustomStartDate("");
      setCustomEndDate("");
      setOpen(false);
    }

    if (value === "specific_date" || value === "custom") {
      setOpen(true);
    }
  };

  const applySpecificDate = () => {
    if (!customStartDate) {
      return;
    }

    setCustomEndDate(customStartDate);

    setFilterType("specific_date");

    setOpen(false);
  };

  const applyCustomRange = () => {
    if (!customStartDate || !customEndDate) {
      return;
    }

    if (customEndDate < customStartDate) {
      return;
    }

    setFilterType("custom");
    setOpen(false);
  };

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          border: `1px solid ${COLORS.border}`,
          background: "#ffffff",
          color: "#334155",
          borderRadius: 10,
          padding: "9px 13px",
          minHeight: 40,
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        }}
      >
        <CalendarDays size={16} color="#2563eb" />

        <span>{filterLabel}</span>

        <ChevronDown
          size={15}
          color="#64748b"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "0.2s",
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 270,
            background: "#ffffff",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 14,
            boxShadow: "0 18px 45px rgba(15,23,42,0.15)",
            padding: 8,
            zIndex: 1000,
          }}
        >
          <div
            style={{
              padding: "8px 10px 10px",
              borderBottom: "1px solid #f1f5f9",
              marginBottom: 5,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              Report Period
            </div>

            <div
              style={{
                marginTop: 2,
                fontSize: 10,
                color: "#94a3b8",
              }}
            >
              Select a period to update the dashboard
            </div>
          </div>

          {options.map((option) => {
            const active = filterType === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => selectOption(option.value)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  border: "none",
                  background: active ? "#eff6ff" : "transparent",
                  color: active ? "#2563eb" : "#334155",
                  borderRadius: 8,
                  padding: "9px 10px",
                  marginBottom: 2,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: active ? 800 : 600,
                  textAlign: "left",
                }}
              >
                <span>{option.label}</span>

                {active && <CheckCircle2 size={15} color="#2563eb" />}
              </button>
            );
          })}

          {filterType === "specific_date" && (
            <div
              style={{
                marginTop: 8,
                padding: 10,
                background: "#f8fafc",
                borderRadius: 10,
              }}
            >
              <label
                style={{
                  display: "block",
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#64748b",
                  marginBottom: 5,
                  textTransform: "uppercase",
                }}
              >
                Select Date
              </label>

              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  padding: "8px 9px",
                  fontSize: 12,
                  background: "#ffffff",
                  color: "#334155",
                }}
              />

              <button
                type="button"
                onClick={applySpecificDate}
                disabled={!customStartDate}
                style={{
                  width: "100%",
                  marginTop: 9,
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 10px",
                  background: customStartDate ? "#2563eb" : "#cbd5e1",
                  color: "#ffffff",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: customStartDate ? "pointer" : "not-allowed",
                }}
              >
                Apply Date
              </button>
            </div>
          )}

          {filterType === "custom" && (
            <div
              style={{
                marginTop: 8,
                padding: 10,
                background: "#f8fafc",
                borderRadius: 10,
              }}
            >
              <label
                style={{
                  display: "block",
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#64748b",
                  marginBottom: 5,
                  textTransform: "uppercase",
                }}
              >
                Start Date
              </label>

              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  padding: "8px 9px",
                  fontSize: 12,
                  background: "#ffffff",
                  color: "#334155",
                  marginBottom: 8,
                }}
              />

              <label
                style={{
                  display: "block",
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#64748b",
                  marginBottom: 5,
                  textTransform: "uppercase",
                }}
              >
                End Date
              </label>

              <input
                type="date"
                value={customEndDate}
                min={customStartDate || undefined}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  padding: "8px 9px",
                  fontSize: 12,
                  background: "#ffffff",
                  color: "#334155",
                }}
              />

              <button
                type="button"
                onClick={applyCustomRange}
                disabled={
                  !customStartDate ||
                  !customEndDate ||
                  customEndDate < customStartDate
                }
                style={{
                  width: "100%",
                  marginTop: 9,
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 10px",
                  background:
                    customStartDate &&
                    customEndDate &&
                    customEndDate >= customStartDate
                      ? "#2563eb"
                      : "#cbd5e1",
                  color: "#ffffff",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor:
                    customStartDate &&
                    customEndDate &&
                    customEndDate >= customStartDate
                      ? "pointer"
                      : "not-allowed",
                }}
              >
                Apply Date Range
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SHARED CARD
========================================================= */

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 16,
  boxShadow: "0 2px 5px rgba(15,23,42,0.035)",
  width: "100%",
  boxSizing: "border-box",
};

const cardTitleStyle = {
  margin: 0,
  color: "#0f172a",
  fontSize: 15,
  fontWeight: 800,
};

const cardSubtitleStyle = {
  margin: "4px 0 0",
  color: "#94a3b8",
  fontSize: 11,
};

/* =========================================================
   DASHBOARD
========================================================= */

export default function Dashboard() {
  const [filterType, setFilterType] = useState("this_month");

  const [customStartDate, setCustomStartDate] = useState("");

  const [customEndDate, setCustomEndDate] = useState("");

  const [subscriptionUserFilter, setSubscriptionUserFilter] = useState("all");

  const [loading, setLoading] = useState(true);

  const [rawUsers, setRawUsers] = useState([]);

  const [rawProperties, setRawProperties] = useState([]);

  const [rawBookings, setRawBookings] = useState([]);

  const [rawSubscriptions, setRawSubscriptions] = useState([]);

  /* =========================================================
     LOAD FIRESTORE DATA
  ========================================================= */

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const { users, properties, bookings, subscriptions } =
        await fetchDashboardRawData();

      setRawUsers(users || []);

      setRawProperties(properties || []);

      setRawBookings(bookings || []);

      setRawSubscriptions(subscriptions || []);
    } catch (error) {
      console.error("Failed to load admin dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  /* =========================================================
     DATE RANGE
  ========================================================= */

  const dateRange = useMemo(() => {
    return calculateDateRange(filterType, customStartDate, customEndDate);
  }, [filterType, customStartDate, customEndDate]);

  /* =========================================================
     DASHBOARD AGGREGATION
  ========================================================= */

  const dashboard = useMemo(() => {
    return aggregateDashboardData(
      rawUsers,
      rawProperties,
      rawBookings,
      rawSubscriptions,
      dateRange,
      filterType,
      subscriptionUserFilter,
    );
  }, [
    rawUsers,
    rawProperties,
    rawBookings,
    rawSubscriptions,
    dateRange,
    filterType,
    subscriptionUserFilter,
  ]);

  /* =========================================================
     FILTER LABEL
  ========================================================= */

  const filterLabel = useMemo(() => {
    const labels = {
      today: "Today",
      yesterday: "Yesterday",
      this_week: "This Week",
      last_week: "Last Week",
      this_month: "This Month",
      last_month: "Last Month",
      last_3_months: "Last 3 Months",
      last_6_months: "Last 6 Months",
      this_year: "This Year",

      specific_date: customStartDate
        ? formatDate(new Date(`${customStartDate}T00:00:00`))
        : "Specific Date",

      custom: "Custom Range",
    };

    return labels[filterType] || "Selected Period";
  }, [filterType, customStartDate]);

  /* =========================================================
     SUBSCRIPTION VALUES
  ========================================================= */

  const subscriptionRevenue = dashboard.subscriptionRevenue?.total || 0;

  const paidSubscriptions =
    dashboard.subscriptionRevenue?.paidSubscriptions || 0;

  const pendingSubscriptions =
    dashboard.subscriptionRevenue?.pendingSubscriptions || 0;

  const failedSubscriptions =
    dashboard.subscriptionRevenue?.failedSubscriptions || 0;

  /* =========================================================
     REFRESH
  ========================================================= */

  const handleRefresh = async () => {
    await loadDashboard();
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        width: "100%",
        margin: 0,
        padding: "12px 12px 28px",
        boxSizing: "border-box",
        overflowX: "hidden",
        background: "#f8fafc",
        minHeight: "100%",
      }}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        className="dashboard-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            minWidth: 0,
            flex: "1 1 240px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: "#eff6ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Building2 size={19} color="#2563eb" />
            </div>

            <div>
              <h1
                style={{
                  margin: 0,
                  color: "#0f172a",
                  fontSize: 22,
                  fontWeight: 850,
                  letterSpacing: "-0.5px",
                  lineHeight: 1.2,
                }}
              >
                Admin Dashboard
              </h1>

              <p
                style={{
                  margin: "4px 0 0",
                  color: "#64748b",
                  fontSize: 12,
                }}
              >
                Rental system overview
              </p>
            </div>
          </div>
        </div>

        {/* ===================================================
            DATE BUTTON
        =================================================== */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <DateFilterButton
            filterType={filterType}
            filterLabel={filterLabel}
            setFilterType={setFilterType}
            customStartDate={customStartDate}
            setCustomStartDate={setCustomStartDate}
            customEndDate={customEndDate}
            setCustomEndDate={setCustomEndDate}
          />

          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh dashboard"
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* =====================================================
          SELECTED PERIOD
      ===================================================== */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#eff6ff",
          border: "1px solid #dbeafe",
          borderRadius: 10,
          padding: "9px 12px",
          color: "#1d4ed8",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        <Calendar size={15} />

        <span>Showing dashboard data for:</span>

        <strong>{filterLabel}</strong>
      </div>

      {/* =====================================================
          LOADING
      ===================================================== */}

      {loading ? (
        <div
          style={{
            minHeight: 320,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 10,
            color: "#2563eb",
            fontSize: 14,
          }}
        >
          <Loader2
            size={22}
            style={{
              animation: "spin 1s linear infinite",
            }}
          />
          Loading dashboard...
        </div>
      ) : (
        <>
          {/* =================================================
              KPI CARDS
          ================================================= */}

          <div className="kpi-grid">
            <StatCard
              title="Total Users"
              value={(dashboard.stats?.totalUsers || 0).toLocaleString()}
              icon={<Users />}
              iconColor="#2563eb"
              background="#eff6ff"
              subtitle={`${dashboard.users?.renters || 0} renters · ${
                dashboard.users?.owners || 0
              } owners`}
            />

            <StatCard
              title="Total Owners"
              value={(dashboard.stats?.totalOwners || 0).toLocaleString()}
              icon={<UserCheck />}
              iconColor="#7c3aed"
              background="#f5f3ff"
              subtitle="Registered owner accounts"
            />

            <StatCard
              title="Subscriptions"
              value={(
                dashboard.stats?.totalSubscriptions || 0
              ).toLocaleString()}
              icon={<CreditCard />}
              iconColor="#d97706"
              background="#fffbeb"
              subtitle={`${paidSubscriptions} paid · ${pendingSubscriptions} pending`}
            />

            <div
              style={{
                ...cardStyle,
                padding: "18px",
                minHeight: 150,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#64748b",
                      marginBottom: 6,
                    }}
                  >
                    SUBSCRIPTION PAYMENT
                  </div>

                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 850,
                      color: "#0f172a",
                      lineHeight: 1.1,
                    }}
                  >
                    {formatMoney(subscriptionRevenue)}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: "#94a3b8",
                      marginTop: 6,
                    }}
                  >
                    Paid subscription revenue
                  </div>
                </div>

                {/* Icon */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "#ecfdf5",
                    color: "#10b981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <CreditCard size={22} />
                </div>
              </div>

              {/* Bottom Summary */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 8,
                  marginTop: 16,
                  paddingTop: 12,
                  borderTop: "1px solid #f1f5f9",
                }}
              >
                {/* Paid */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <CheckCircle2 size={15} color="#10b981" />

                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#94a3b8",
                      }}
                    >
                      PAID
                    </div>

                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: "#0f172a",
                      }}
                    >
                      {paidSubscriptions}
                    </div>
                  </div>
                </div>

                {/* Pending */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Clock size={15} color="#f59e0b" />

                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#94a3b8",
                      }}
                    >
                      PENDING
                    </div>

                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: "#0f172a",
                      }}
                    >
                      {pendingSubscriptions}
                    </div>
                  </div>
                </div>

                {/* Failed */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <XCircle size={15} color="#ef4444" />

                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#94a3b8",
                      }}
                    >
                      FAILED
                    </div>

                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: "#0f172a",
                      }}
                    >
                      {failedSubscriptions}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =================================================
              ROW 1
          ================================================= */}

          <div className="row-grid">
            {/* ===============================================
                SUBSCRIPTION TREND
            =============================================== */}

            <div style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 10,
                  marginBottom: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h3 style={cardTitleStyle}>Subscription Trends</h3>

                  <p style={cardSubtitleStyle}>
                    Subscription volume and paid subscriptions
                  </p>
                </div>

                <select
                  value={subscriptionUserFilter}
                  onChange={(e) => setSubscriptionUserFilter(e.target.value)}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    padding: "7px 9px",
                    fontSize: 12,
                    color: "#334155",
                    background: "#fff",
                    outline: "none",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  <option value="all">All Users</option>

                  <option value="owner">Owners</option>

                  <option value="renter">Renters</option>
                </select>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 15,
                  marginBottom: 7,
                  fontSize: 10,
                  color: "#64748b",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 3,
                      background: "#6366f1",
                    }}
                  />
                  All Subscriptions
                </span>

                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#10b981",
                    }}
                  />
                  Paid
                </span>
              </div>

              <div
                style={{
                  width: "100%",
                  height: 270,
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={dashboard.subscriptionChart || []}
                    margin={{
                      top: 10,
                      right: 12,
                      left: -15,
                      bottom: 0,
                    }}
                  >
                    <defs>
                      <linearGradient
                        id="subscriptionBarGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#818cf8" />

                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="4 4"
                      vertical={false}
                      stroke="#eef2f7"
                    />

                    <XAxis
                      dataKey="period"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fill: "#94a3b8",
                      }}
                    />

                    <YAxis
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fill: "#94a3b8",
                      }}
                      allowDecimals={false}
                    />

                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{
                        fill: "#f8fafc",
                      }}
                    />

                    <Bar
                      dataKey="subscriptions"
                      name="Subscriptions"
                      fill="url(#subscriptionBarGradient)"
                      radius={[7, 7, 2, 2]}
                      maxBarSize={32}
                    />

                    <Line
                      type="monotone"
                      dataKey="paid"
                      name="Paid"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{
                        r: 3.5,
                        fill: "#10b981",
                        stroke: "#ffffff",
                        strokeWidth: 2,
                      }}
                      activeDot={{
                        r: 6,
                      }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ===============================================
                USER DISTRIBUTION
            =============================================== */}

            <div
              style={{
                ...cardStyle,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <h3 style={cardTitleStyle}>User Distribution</h3>

              <p style={cardSubtitleStyle}>
                Registered users in selected period
              </p>

              <div
                style={{
                  width: "100%",
                  height: 180,
                  marginTop: 5,
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: "Renters",
                          value: dashboard.users?.renters || 0,
                        },
                        {
                          name: "Owners",
                          value: dashboard.users?.owners || 0,
                        },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#8b5cf6" />
                    </Pie>

                    <Tooltip
                      formatter={(value) => Number(value).toLocaleString()}
                    />

                    <Legend
                      verticalAlign="bottom"
                      height={30}
                      iconType="circle"
                      wrapperStyle={{
                        fontSize: 10,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <StatusItem
                icon={<Users />}
                label="Renters"
                value={dashboard.users?.renters || 0}
                color="#3b82f6"
              />

              <StatusItem
                icon={<Building2 />}
                label="Owners"
                value={dashboard.users?.owners || 0}
                color="#8b5cf6"
              />

              <div
                style={{
                  marginTop: 10,
                  padding: "12px 10px",
                  background: "#f8fafc",
                  borderRadius: 10,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 850,
                    color: "#0f172a",
                  }}
                >
                  {(dashboard.stats?.totalUsers || 0).toLocaleString()}
                </div>

                <div
                  style={{
                    fontSize: 10,
                    color: "#64748b",
                    marginTop: 2,
                  }}
                >
                  Total Users
                </div>
              </div>
            </div>
          </div>

          {/* =================================================
              ROW 2
          ================================================= */}

          <div className="row-grid-2">
            <div
              style={{
                ...cardStyle,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <h3 style={cardTitleStyle}>Recent Subscriptions</h3>

              <p style={cardSubtitleStyle}>Latest subscription activity</p>

              <div
                style={{
                  marginTop: 8,
                  flex: 1,
                  overflowY: "auto",
                  maxHeight: 360,
                }}
              >
                {dashboard.recentSubscriptions?.length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {dashboard.recentSubscriptions.map((subscription) => {
                      const paymentStatus =
                        subscription.normalizedPaymentStatus ||
                        normalizePaymentStatus(subscription.paymentStatus);

                      const isPaid = paymentStatus === "paid";

                      let paymentColor = "#f59e0b";

                      if (isPaid) {
                        paymentColor = "#10b981";
                      }

                      if (
                        paymentStatus === "failed" ||
                        paymentStatus === "rejected"
                      ) {
                        paymentColor = "#ef4444";
                      }

                      return (
                        <div
                          key={subscription.id}
                          style={{
                            padding: "11px 0",
                            borderBottom: "1px solid #f1f5f9",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 8,
                            }}
                          >
                            <strong
                              style={{
                                fontSize: 12,
                                color: "#334155",
                              }}
                            >
                              #{String(subscription.id).substring(0, 7)}
                            </strong>

                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                color: paymentColor,
                                textTransform: "uppercase",
                              }}
                            >
                              {paymentStatus}
                            </span>
                          </div>

                          <div
                            style={{
                              marginTop: 4,
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                color: "#64748b",
                                fontSize: 11,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {subscription.planName || "—"}
                            </span>

                            <strong
                              style={{
                                color: isPaid ? "#10b981" : "#0f172a",
                                fontSize: 12,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {formatMoney(subscription.amount)}
                            </strong>
                          </div>

                          <div
                            style={{
                              marginTop: 4,
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 6,
                            }}
                          >
                            <span
                              style={{
                                color: "#64748b",
                                fontSize: 11,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {subscription.userName || "Unknown user"}
                            </span>

                            <span
                              style={{
                                color: "#6366f1",
                                fontSize: 10,
                                fontWeight: 700,
                              }}
                            >
                              {subscription.userType === "renter"
                                ? "Renter"
                                : subscription.userType === "owner"
                                  ? "Owner"
                                  : "User"}
                            </span>
                          </div>

                          <div
                            style={{
                              marginTop: 4,
                              color: "#94a3b8",
                              fontSize: 10,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Calendar size={10} />

                            {subscription.dateObj
                              ? subscription.dateObj.toLocaleString([], {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Unknown date"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "50px 10px",
                      textAlign: "center",
                      color: "#94a3b8",
                      fontSize: 13,
                    }}
                  >
                    No subscriptions found for this period.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* =====================================================
          CSS
      ===================================================== */}

      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }

          .kpi-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
            width: 100%;
          }

          .row-grid,
          .row-grid-2 {
            display: grid;
            grid-template-columns: 1fr;
            gap: 14px;
            width: 100%;
            align-items: stretch;
          }

          .payment-summary-grid {
            display: grid;
            grid-template-columns: repeat(
              4,
              minmax(0, 1fr)
            );
            gap: 0;
          }

          .payment-summary-grid > div {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 14px 16px;
            border-right: 1px solid #f1f5f9;
          }

          .payment-summary-grid > div:last-child {
            border-right: none;
          }

          .summary-label {
            color: #94a3b8;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.5px;
          }

          .summary-value {
            display: block;
            margin-top: 2px;
            color: #0f172a;
            font-size: 15px;
            font-weight: 850;
          }

          .amount-summary {
            display: flex;
            gap: 24px;
            border-top: 1px solid #f1f5f9;
            padding-top: 13px;
            margin-top: 3px;
            flex-wrap: wrap;
          }

          @media (max-width: 850px) {
            .payment-summary-grid {
              grid-template-columns: repeat(
                2,
                minmax(0, 1fr)
              );
            }

            .payment-summary-grid > div:nth-child(2) {
              border-right: none;
            }

            .payment-summary-grid > div:nth-child(-n + 2) {
              border-bottom: 1px solid #f1f5f9;
            }
          }

          @media (min-width: 640px) {
            .kpi-grid {
              grid-template-columns: repeat(
                2,
                minmax(0, 1fr)
              );
              gap: 14px;
            }
          }

          @media (min-width: 900px) {
            .kpi-grid {
              grid-template-columns: repeat(
                4,
                minmax(0, 1fr)
              );
            }

            .row-grid {
              grid-template-columns:
                minmax(0, 1.6fr)
                minmax(260px, 0.9fr);

              gap: 16px;
            }

            .row-grid-2 {
              grid-template-columns:
                minmax(0, 1.5fr)
                minmax(280px, 0.9fr);

              gap: 16px;
            }
          }

          @media (max-width: 560px) {
            .payment-summary-grid {
              grid-template-columns: 1fr;
            }

            .payment-summary-grid > div {
              border-right: none !important;
              border-bottom: 1px solid #f1f5f9;
            }

            .payment-summary-grid > div:last-child {
              border-bottom: none;
            }
          }
        `}
      </style>
    </div>
  );
}
