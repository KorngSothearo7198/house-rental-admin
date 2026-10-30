import React, { useState, useEffect } from "react";
import { auth, db } from "../services/firebase";

import { onAuthStateChanged, signOut } from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
} from "firebase/firestore";

import { useNavigate } from "react-router-dom";

import {
  LogOut,
  User,
  Loader2,
  X,
  Mail,
  Phone,
  Shield,
  Calendar,
  Briefcase,
  MapPin,
  Bell,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";

export default function Navbar() {
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showProfileModal, setShowProfileModal] = useState(false);

  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const navigate = useNavigate();

  // ============================================================
  // GET CURRENT ADMIN
  // ============================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const data = userDocSnap.data();

            setAdminData({
              id: user.uid,
              fullName: data.fullName || data.name || "System Admin",
              email: data.email || user.email || "N/A",
              phone: data.phone || "N/A",

              role: data.role
                ? data.role.charAt(0).toUpperCase() + data.role.slice(1)
                : "Admin",

              address: data.address || "N/A",
              occupation: data.occupation || "Administrator",

              profileImage:
                data.profileImage ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,

              regDate: data.createdAt?.toDate
                ? data.createdAt.toDate().toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "N/A",
            });
          } else {
            setAdminData({
              id: user.uid,
              fullName: user.displayName || "System Admin",
              email: user.email || "N/A",
              phone: "N/A",
              role: "Admin",
              address: "Phnom Penh",
              occupation: "Administrator",

              profileImage: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,

              regDate: "N/A",
            });
          }
        } catch (error) {
          console.error("Error fetching admin data:", error);
        }
      } else {
        setAdminData(null);
        setNotifications([]);
        setUnreadCount(0);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ============================================================
  // REAL-TIME ADMIN NOTIFICATIONS
  // ============================================================

  useEffect(() => {
    if (!adminData?.id) {
      return;
    }

    console.log("Listening notifications for admin:", adminData.id);

    const notificationsRef = collection(db, "notifications");

    const q = query(
      notificationsRef,
      where("userId", "==", adminData.id),
      where("role", "==", "admin"),
      orderBy("createdAt", "desc"),
      limit(20),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notificationList = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        setNotifications(notificationList);

        const unread = notificationList.filter(
          (notification) => notification.isRead === false,
        ).length;

        setUnreadCount(unread);
      },
      (error) => {
        console.error("Notification listener error:", error);

        // If Firestore index is missing, this will show the error.
        // Firebase Console will normally provide an index link.
      },
    );

    return () => unsubscribe();
  }, [adminData?.id]);

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to log out?")) {
      try {
        await signOut(auth);
        navigate("/login");
      } catch (error) {
        console.error("Logout error:", error);
      }
    }
  };

  // ============================================================
  // FORMAT NOTIFICATION TIME
  // ============================================================

  const formatNotificationTime = (timestamp) => {
    if (!timestamp?.toDate) {
      return "";
    }

    const date = timestamp.toDate();

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ============================================================
  // OPEN NOTIFICATION
  // ============================================================

  const handleNotificationClick = async (notification) => {
  try {
    if (!notification.isRead) {
      await updateDoc(doc(db, "notifications", notification.id), {
        isRead: true,
      });
    }

    setShowNotifications(false);

    const supportTypes = [
      "support_ticket",
      "support_ticket_reply",
      "support_ticket_status",
    ];

    if (
      supportTypes.includes(notification.type) &&
      notification.relatedId
    ) {
      navigate(`/admin/support-tickets/${notification.relatedId}`);
    }
  } catch (error) {
    console.error("Error opening notification:", error);
  }
};

  // ============================================================
  // MARK ALL AS READ
  // ============================================================

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(
        (notification) => notification.isRead === false,
      );

      await Promise.all(
        unreadNotifications.map((notification) =>
          updateDoc(doc(db, "notifications", notification.id), {
            isRead: true,
          }),
        ),
      );
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };

  return (
    <>
      {/* =========================================================
          NAVBAR
      ========================================================== */}

      <header
        style={{
          height: "60px",
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          boxSizing: "border-box",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Branding */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <h3
            style={{
              fontSize: "16px",
              fontWeight: "700",
              color: "#0f172a",
              margin: 0,
            }}
          >
            Admin Control Panel
          </h3>
        </div>

        {/* Right Side */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          {loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "#64748b",
                fontSize: "13px",
              }}
            >
              <Loader2 className="animate-spin" size={16} />
              Loading...
            </div>
          ) : adminData ? (
            <>
              {/* =================================================
                  NOTIFICATION BUTTON
              ================================================== */}

              <div
                style={{
                  position: "relative",
                }}
              >
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  title="Notifications"
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    backgroundColor: showNotifications ? "#f1f5f9" : "#ffffff",
                    color: "#475569",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  <Bell size={18} />

                  {/* Unread Badge */}

                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: "-5px",
                        right: "-5px",
                        minWidth: "18px",
                        height: "18px",
                        padding: "0 4px",
                        borderRadius: "10px",
                        backgroundColor: "#ef4444",
                        color: "#ffffff",
                        fontSize: "10px",
                        fontWeight: "700",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px solid #ffffff",
                      }}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* =================================================
                    NOTIFICATION DROPDOWN
                ================================================== */}

                {showNotifications && (
                  <div
                    style={{
                      position: "absolute",
                      top: "46px",
                      right: 0,
                      width: "380px",
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 20px 40px rgba(15, 23, 42, 0.15)",
                      zIndex: 2000,
                      overflow: "hidden",
                    }}
                  >
                    {/* Header */}

                    <div
                      style={{
                        padding: "14px 16px",
                        borderBottom: "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <h4
                          style={{
                            margin: 0,
                            fontSize: "15px",
                            fontWeight: "700",
                            color: "#0f172a",
                          }}
                        >
                          Notifications
                        </h4>

                        <span
                          style={{
                            fontSize: "11px",
                            color: "#64748b",
                          }}
                        >
                          {unreadCount} unread
                        </span>
                      </div>

                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          style={{
                            border: "none",
                            background: "none",
                            color: "#4f46e5",
                            fontSize: "11px",
                            fontWeight: "600",
                            cursor: "pointer",
                          }}
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    {/* Notification List */}

                    <div
                      style={{
                        maxHeight: "420px",
                        overflowY: "auto",
                      }}
                    >
                      {notifications.length === 0 ? (
                        <div
                          style={{
                            padding: "40px 20px",
                            textAlign: "center",
                            color: "#94a3b8",
                          }}
                        >
                          <Bell
                            size={30}
                            style={{
                              marginBottom: "8px",
                              opacity: 0.5,
                            }}
                          />

                          <div
                            style={{
                              fontSize: "13px",
                              fontWeight: "500",
                            }}
                          >
                            No notifications
                          </div>

                          <div
                            style={{
                              fontSize: "11px",
                              marginTop: "4px",
                            }}
                          >
                            You're all caught up.
                          </div>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            onClick={() =>
                              handleNotificationClick(notification)
                            }
                            style={{
                              padding: "14px 16px",
                              display: "flex",
                              gap: "12px",
                              cursor: "pointer",
                              borderBottom: "1px solid #f1f5f9",
                              backgroundColor: notification.isRead
                                ? "#ffffff"
                                : "#f8fafc",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#f1f5f9";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                notification.isRead ? "#ffffff" : "#f8fafc";
                            }}
                          >
                            {/* Icon */}

                            <div
                              style={{
                                width: "36px",
                                height: "36px",
                                minWidth: "36px",
                                borderRadius: "9px",
                                backgroundColor:
                                  notification.type === "support_ticket"
                                    ? "#ede9fe"
                                    : "#e0f2fe",
                                color:
                                  notification.type === "support_ticket"
                                    ? "#7c3aed"
                                    : "#0284c7",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {notification.type === "support_ticket" ? (
                                <MessageSquare size={17} />
                              ) : (
                                <Bell size={17} />
                              )}
                            </div>

                            {/* Content */}

                            <div
                              style={{
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: "8px",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "13px",
                                    fontWeight: notification.isRead
                                      ? "500"
                                      : "700",
                                    color: "#1e293b",
                                  }}
                                >
                                  {notification.title}
                                </span>

                                {!notification.isRead && (
                                  <span
                                    style={{
                                      width: "7px",
                                      height: "7px",
                                      minWidth: "7px",
                                      borderRadius: "50%",
                                      backgroundColor: "#4f46e5",
                                      marginTop: "5px",
                                    }}
                                  />
                                )}
                              </div>

                              <div
                                style={{
                                  fontSize: "12px",
                                  color: "#475569",
                                  marginTop: "3px",
                                  lineHeight: "1.4",
                                }}
                              >
                                {notification.body}
                              </div>

                              {notification.subject && (
                                <div
                                  style={{
                                    fontSize: "11px",
                                    color: "#64748b",
                                    marginTop: "4px",
                                  }}
                                >
                                  Subject: {notification.subject}
                                </div>
                              )}

                              <div
                                style={{
                                  fontSize: "10px",
                                  color: "#94a3b8",
                                  marginTop: "6px",
                                }}
                              >
                                {formatNotificationTime(notification.createdAt)}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* =================================================
                  ADMIN PROFILE
              ================================================== */}

              <div
                onClick={() => setShowProfileModal(true)}
                title="Click to view full profile"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "8px",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f1f5f9")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <img
                  src={adminData.profileImage}
                  alt={adminData.fullName}
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    backgroundColor: "#e2e8f0",
                    border: "1px solid #cbd5e1",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#1e293b",
                      lineHeight: "1.2",
                    }}
                  >
                    {adminData.fullName}
                  </span>

                  <span
                    style={{
                      fontSize: "11px",
                      color: "#0284c7",
                      fontWeight: "500",
                    }}
                  >
                    {adminData.role}
                  </span>
                </div>
              </div>

              {/* Logout */}

              <button
                onClick={handleLogout}
                title="Logout"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginLeft: "8px",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid #fee2e2",
                  backgroundColor: "#fef2f2",
                  color: "#dc2626",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                <LogOut size={14} />
                Logout
              </button>
            </>
          ) : (
            <div
              style={{
                fontSize: "13px",
                color: "#64748b",
              }}
            >
              Not logged in
            </div>
          )}
        </div>
      </header>

      {/* =========================================================
          ADMIN PROFILE MODAL
      ========================================================== */}

      {showProfileModal && adminData && (
        <div style={modalOverlayStyle}>
          <div
            style={{
              ...modalContentStyle,
              width: "420px",
            }}
          >
            {/* Header */}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: "12px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: "#0f172a",
                  fontSize: "18px",
                  fontWeight: "700",
                }}
              >
                Admin Profile
              </h3>

              <button
                onClick={() => setShowProfileModal(false)}
                style={{
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={20} color="#64748b" />
              </button>
            </div>

            {/* Avatar */}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                marginTop: "16px",
                marginBottom: "16px",
              }}
            >
              <img
                src={adminData.profileImage}
                alt={adminData.fullName}
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  backgroundColor: "#e2e8f0",
                  border: "2px solid #0284c7",
                }}
              />

              <h2
                style={{
                  margin: 0,
                  fontSize: "18px",
                  color: "#0f172a",
                  fontWeight: "700",
                }}
              >
                {adminData.fullName}
              </h2>

              <span
                style={{
                  padding: "2px 10px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: "600",
                  backgroundColor: "#e0f2fe",
                  color: "#0284c7",
                }}
              >
                {adminData.role}
              </span>
            </div>

            {/* Details */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: "12px",
                backgroundColor: "#f8fafc",
                padding: "16px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            >
              <DetailItem
                icon={<Mail size={16} color="#0284c7" />}
                label="Email"
                value={adminData.email}
              />

              <DetailItem
                icon={<Phone size={16} color="#0284c7" />}
                label="Phone"
                value={adminData.phone}
              />

              <DetailItem
                icon={<Briefcase size={16} color="#0284c7" />}
                label="Occupation"
                value={adminData.occupation}
              />

              <DetailItem
                icon={<MapPin size={16} color="#0284c7" />}
                label="Address"
                value={adminData.address}
              />

              <DetailItem
                icon={<Calendar size={16} color="#0284c7" />}
                label="Joined Date"
                value={adminData.regDate}
              />

              <DetailItem
                icon={<Shield size={16} color="#0284c7" />}
                label="UID"
                value={adminData.id}
              />
            </div>

            {/* Footer */}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "20px",
              }}
            >
              <button
                onClick={() => setShowProfileModal(false)}
                style={secondaryBtnStyle}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ================================================================
// DETAIL ITEM
// ================================================================

function DetailItem({ icon, label, value }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "28px",
          height: "28px",
          backgroundColor: "#ffffff",
          borderRadius: "6px",
          border: "1px solid #e2e8f0",
        }}
      >
        {icon}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            color: "#64748b",
            fontWeight: "500",
          }}
        >
          {label}
        </span>

        <span
          style={{
            fontSize: "13px",
            fontWeight: "600",
            color: "#1e293b",
            wordBreak: "break-all",
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

// ================================================================
// STYLES
// ================================================================

const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "rgba(15, 23, 42, 0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalContentStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  padding: "20px",
  maxWidth: "95%",
  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
};

const secondaryBtnStyle = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "13px",
  color: "#334155",
};
