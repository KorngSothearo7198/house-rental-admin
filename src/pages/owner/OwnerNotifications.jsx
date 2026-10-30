import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../services/firebase";
import {
  subscribeOwnerNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getOwnerNotificationDetails,
} from "../../services/owner_NotificationService";
import {
  CalendarPlus,
  CalendarX,
  CreditCard,
  MessageSquare,
  Home,
  Bell,
  CheckCheck,
  ChevronRight,
  Loader2,
  X,
  ExternalLink,
} from "lucide-react";

const dialogStyles = `
@keyframes popDialogFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes popDialogScaleIn {
  from { opacity: 0; transform: scale(0.92) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
`;

const formatAmount = (amount, currency = "USD") => {
  if (amount === null || amount === undefined || amount === "") {
    return "—";
  }

  const number = Number(amount);

  if (!Number.isFinite(number)) {
    return `${amount} ${currency}`;
  }

  return `${number.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
};

const detailRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  fontSize: 13,
};

const detailLabelStyle = {
  color: "#64748b",
  flexShrink: 0,
};

const detailValueStyle = {
  color: "#0f172a",
  fontWeight: 600,
  textAlign: "right",
  overflowWrap: "anywhere",
};

export default function OwnerNotifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [notificationDetails, setNotificationDetails] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setLoading(false);
      return undefined;
    }

    const unsubscribe = subscribeOwnerNotifications(user.uid, (data) => {
      setNotifications(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenDialog = async (notification) => {
    setSelectedNotif(notification);
    setNotificationDetails(null);
    setDetailLoading(true);

    if (!notification.isRead) {
      await markNotificationAsRead(notification.id);
    }

    try {
      const details = await getOwnerNotificationDetails(notification);
      setNotificationDetails(details);
    } catch (error) {
      console.error("Unable to load notification details:", error);
      setNotificationDetails({});
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setSelectedNotif(null);
    setNotificationDetails(null);
    setDetailLoading(false);
  };

  const handleNavigateTarget = (notification) => {
    handleCloseDialog();

    if (notification.targetRoute) {
      navigate(notification.targetRoute);
      return;
    }

    const type = (notification.type || "").toUpperCase();

    if (type.includes("PAYMENT") || notification.paymentId) {
      navigate("/owner/payments");
      return;
    }

    if (type.includes("BOOKING") || notification.bookingId) {
      navigate("/owner/bookings");
      return;
    }

    if (type.includes("MESSAGE")) {
      navigate("/owner/messages");
      return;
    }

    if (type.includes("PROPERTY") || notification.houseId) {
      navigate("/owner/properties");
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const type = (item.type || "").toUpperCase();

      if (filter === "UNREAD") return !item.isRead;

      if (filter === "BOOKING") {
        return type.includes("BOOKING");
      }

      if (filter === "PAYMENT") {
        return type.includes("PAYMENT") || type === "RENTAL_PAYMENT";
      }

      if (filter === "MESSAGES") {
        return type.includes("MESSAGE");
      }

      return true;
    });
  }, [notifications, filter]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications],
  );

  const getNotificationConfig = (type = "") => {
    const normalizedType = type.toUpperCase();

    if (normalizedType.includes("PAYMENT")) {
      return {
        icon: CreditCard,
        bg: "#e0e7ff",
        color: "#4f46e5",
        label: "Payment Received",
        actionText: "View Payments",
      };
    }

    if (normalizedType.includes("CANCEL")) {
      return {
        icon: CalendarX,
        bg: "#fee2e2",
        color: "#dc2626",
        label: "Booking Cancelled",
        actionText: "View Bookings",
      };
    }

    if (normalizedType.includes("BOOKING")) {
      return {
        icon: CalendarPlus,
        bg: "#dcfce7",
        color: "#16a34a",
        label: "Booking Update",
        actionText: "View Bookings",
      };
    }

    if (normalizedType.includes("MESSAGE")) {
      return {
        icon: MessageSquare,
        bg: "#e0f2fe",
        color: "#0284c7",
        label: "New Message",
        actionText: "Open Messages",
      };
    }

    if (normalizedType.includes("PROPERTY")) {
      return {
        icon: Home,
        bg: "#fef3c7",
        color: "#d97706",
        label: "Property Update",
        actionText: "View Properties",
      };
    }

    return {
      icon: Bell,
      bg: "#f1f5f9",
      color: "#475569",
      label: "Notification",
      actionText: "View Details",
    };
  };

  const dialogConfig = selectedNotif
    ? getNotificationConfig(selectedNotif.type)
    : null;

  const DialogIcon = dialogConfig?.icon || Bell;

  const showValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return "—";
    }

    return value;
  };

  return (
    <div
      style={{
        width: "100%",
        padding: "20px 16px 40px",
        boxSizing: "border-box",
      }}
    >
      <style>{dialogStyles}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            Notifications
          </h2>

          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
            Stay updated on bookings, payments, and messages
            {unreadCount > 0 && (
              <span
                style={{
                  marginLeft: 8,
                  fontWeight: 600,
                  color: "#16a34a",
                }}
              >
                · {unreadCount} unread
              </span>
            )}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllNotificationsAsRead(notifications)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              background: "#fff",
              color: "#0f172a",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <CheckCheck size={16} color="#16a34a" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 20,
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: 10,
          overflowX: "auto",
        }}
      >
        {["ALL", "UNREAD", "BOOKING", "PAYMENT", "MESSAGES"].map((tab) => {
          const active = filter === tab;

          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "none",
                background: active ? "#0f172a" : "#f1f5f9",
                color: active ? "#fff" : "#475569",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
                whiteSpace: "nowrap",
              }}
            >
              {tab.toLowerCase()}
            </button>
          );
        })}
      </div>

      {/* Notification list */}
      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 60,
            color: "#64748b",
            gap: 10,
          }}
        >
          <Loader2 size={22} className="animate-spin" />
          Loading notifications...
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
          }}
        >
          <Bell size={36} color="#94a3b8" style={{ marginBottom: 12 }} />

          <h4 style={{ margin: 0, color: "#0f172a", fontSize: 16 }}>
            No notifications found
          </h4>

          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>
            You're all caught up! New events will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredNotifications.map((item) => {
            const config = getNotificationConfig(item.type);
            const Icon = config.icon;
            const isUnread = !item.isRead;

            return (
              <div
                key={item.id}
                onClick={() => handleOpenDialog(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleOpenDialog(item);
                  }
                }}
                style={{
                  background: isUnread ? "#f0fdf4" : "#fff",
                  border: isUnread ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 16,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: isUnread
                    ? "0 2px 8px rgba(22, 163, 74, 0.06)"
                    : "none",
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: config.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} color={config.color} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: config.color,
                        textTransform: "uppercase",
                        letterSpacing: "0.4px",
                      }}
                    >
                      {config.label}
                    </span>

                    <span
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        flexShrink: 0,
                      }}
                    >
                      {item.formattedDate}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: "0 0 4px",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#0f172a",
                    }}
                  >
                    {item.title || "Notification"}
                  </p>

                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: "#475569",
                      lineHeight: 1.5,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.message || ""}
                  </p>

                  {item.amount != null && (
                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#16a34a",
                      }}
                    >
                      {formatAmount(item.amount, item.currency || "USD")}
                    </p>
                  )}

                  <div
                    style={{
                      marginTop: 10,
                      color: config.color,
                      fontSize: 13,
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    View Details
                    <ChevronRight size={14} />
                  </div>
                </div>

                {isUnread && (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#16a34a",
                      flexShrink: 0,
                      marginTop: 6,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Notification details dialog */}
      {selectedNotif && dialogConfig && (
        <div
          onClick={handleCloseDialog}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            animation: "popDialogFadeIn 0.2s ease-out forwards",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-dialog-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              width: "100%",
              maxWidth: 500,
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
              animation:
                "popDialogScaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          >
            {/* Dialog header */}
            <div
              style={{
                padding: "20px",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                borderBottom: "1px solid #f1f5f9",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: dialogConfig.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <DialogIcon size={22} color={dialogConfig.color} />
                </div>

                <div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: dialogConfig.color,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {dialogConfig.label}
                  </span>

                  <h3
                    id="notification-dialog-title"
                    style={{
                      margin: "2px 0 0",
                      fontSize: 17,
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    {selectedNotif.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={handleCloseDialog}
                aria-label="Close dialog"
                style={{
                  border: "none",
                  background: "#f1f5f9",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#64748b",
                  flexShrink: 0,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Dialog body */}
            <div style={{ padding: 20 }}>
              <p
                style={{
                  margin: "0 0 16px",
                  fontSize: 14,
                  color: "#334155",
                  lineHeight: 1.6,
                }}
              >
                {selectedNotif.message || "No additional message."}
              </p>

              {detailLoading ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 10,
                    padding: 28,
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  <Loader2 size={20} className="animate-spin" />
                  Loading booking and property details...
                </div>
              ) : (
                <div
                  style={{
                    background: "#f8fafc",
                    borderRadius: 10,
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 13,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div style={detailRowStyle}>
                    <span style={detailLabelStyle}>Date Received</span>
                    <span style={detailValueStyle}>
                      {selectedNotif.formattedDate || "Just now"}
                    </span>
                  </div>

                  {selectedNotif.amount != null && (
                    <div style={detailRowStyle}>
                      <span style={detailLabelStyle}>Notification Amount</span>
                      <span
                        style={{
                          ...detailValueStyle,
                          color: "#16a34a",
                          fontSize: 14,
                        }}
                      >
                        {formatAmount(
                          selectedNotif.amount,
                          selectedNotif.currency || "USD",
                        )}
                      </span>
                    </div>
                  )}

                  {notificationDetails?.propertyName && (
                    <div style={detailRowStyle}>
                      <span style={detailLabelStyle}>Property</span>
                      <span style={detailValueStyle}>
                        {notificationDetails.propertyName}
                      </span>
                    </div>
                  )}

                  {notificationDetails?.propertyLocation && (
                    <div style={detailRowStyle}>
                      <span style={detailLabelStyle}>Location</span>
                      <span style={detailValueStyle}>
                        {notificationDetails.propertyLocation}
                      </span>
                    </div>
                  )}

                  {notificationDetails?.renterName && (
                    <div style={detailRowStyle}>
                      <span style={detailLabelStyle}>Renter</span>
                      <span style={detailValueStyle}>
                        {notificationDetails.renterName}
                      </span>
                    </div>
                  )}

                  {notificationDetails?.bookingStatus && (
                    <div style={detailRowStyle}>
                      <span style={detailLabelStyle}>Booking Status</span>
                      <span
                        style={{
                          ...detailValueStyle,
                          textTransform: "capitalize",
                        }}
                      >
                        {notificationDetails.bookingStatus}
                      </span>
                    </div>
                  )}

                  {notificationDetails?.startDate && (
                    <div style={detailRowStyle}>
                      <span style={detailLabelStyle}>Start Date</span>
                      <span style={detailValueStyle}>
                        {notificationDetails.startDate}
                      </span>
                    </div>
                  )}

                  {notificationDetails?.endDate && (
                    <div style={detailRowStyle}>
                      <span style={detailLabelStyle}>End Date</span>
                      <span style={detailValueStyle}>
                        {notificationDetails.endDate}
                      </span>
                    </div>
                  )}

                  {notificationDetails?.paymentMethod &&
                    notificationDetails.paymentMethod !== "—" && (
                      <div style={detailRowStyle}>
                        <span style={detailLabelStyle}>Payment Method</span>
                        <span style={detailValueStyle}>
                          {notificationDetails.paymentMethod}
                        </span>
                      </div>
                    )}

                  {notificationDetails?.paymentStatus &&
                    notificationDetails.paymentStatus !== "—" && (
                      <div style={detailRowStyle}>
                        <span style={detailLabelStyle}>Payment Status</span>
                        <span
                          style={{
                            ...detailValueStyle,
                            color:
                              notificationDetails.paymentStatus.toLowerCase() ===
                              "paid"
                                ? "#16a34a"
                                : "#0f172a",
                          }}
                        >
                          {notificationDetails.paymentStatus}
                        </span>
                      </div>
                    )}
                </div>
              )}
            </div>

            {/* Dialog footer */}
            <div
              style={{
                padding: "0 20px 20px",
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={handleCloseDialog}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  color: "#475569",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close
              </button>

              <button
                onClick={() => handleNavigateTarget(selectedNotif)}
                style={{
                  padding: "10px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: "#0f172a",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {dialogConfig.actionText}
                <ExternalLink size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
