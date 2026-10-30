import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Building2,
  CheckCheck,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import {
  subscribeOwnerNotifications,
  markAllNotificationsAsRead,
} from "../services/owner_NotificationService";

export default function OwnerNavbar() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Realtime Notifications Listener
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeOwnerNotifications(user.uid, (data) => {
      setNotifications(data);
    });
    return () => unsub();
  }, [user?.uid]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/http://localhost:5173/owner/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const displayName =
    user?.displayName || user?.email?.split("@")[0] || "Owner";
  const email = user?.email || "";

  return (
    <header
      style={{
        height: "64px",
        minHeight: "64px",
        width: "100%",
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        boxSizing: "border-box",
        zIndex: 100,
      }}
    >
      {/* LEFT */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            backgroundColor: "#dcfce7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Building2 size={20} color="#16a34a" />
        </div>

        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: "700",
              color: "#0f172a",
            }}
          >
            Owner Dashboard
          </h1>

          <p
            style={{
              margin: 0,
              marginTop: "2px",
              fontSize: "12px",
              color: "#64748b",
            }}
          >
            Manage your rental properties
          </p>
        </div>
      </div>

      {/* RIGHT */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Notification Container */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => {
              setShowNotifMenu(!showNotifMenu);
              setShowMenu(false);
            }}
            style={{
              width: "40px",
              height: "40px",
              border: "none",
              borderRadius: "10px",
              backgroundColor: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              position: "relative",
            }}
          >
            <Bell size={20} color="#475569" />

            {/* Notification Count Badge */}
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "4px",
                  right: "4px",
                  minWidth: "16px",
                  height: "16px",
                  borderRadius: "8px",
                  backgroundColor: "#ef4444",
                  color: "#ffffff",
                  fontSize: "10px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 4px",
                  border: "2px solid #ffffff",
                }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Quick Notification Dropdown */}
          {showNotifMenu && (
            <div
              style={{
                position: "absolute",
                top: "50px",
                right: 0,
                width: "340px",
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
                padding: "12px",
                zIndex: 1000,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "8px",
                  borderBottom: "1px solid #f1f5f9",
                  marginBottom: "8px",
                }}
              >
                <h4 style={{ margin: 0, fontSize: "14px", color: "#0f172a" }}>
                  Notifications
                </h4>

                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllNotificationsAsRead(notifications)}
                    style={{
                      border: "none",
                      backgroundColor: "transparent",
                      color: "#16a34a",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <CheckCheck size={14} /> Mark all read
                  </button>
                )}
              </div>

              {/* List items */}
              <div style={{ maxHeight: "280px", overflowY: "auto" }}>
                {notifications.length === 0 ? (
                  <p
                    style={{
                      textAlign: "center",
                      fontSize: "13px",
                      color: "#94a3b8",
                      margin: "20px 0",
                    }}
                  >
                    No notifications yet
                  </p>
                ) : (
                  notifications.slice(0, 4).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        setShowNotifMenu(false);
                        navigate("/owner/notifications");
                      }}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "8px",
                        backgroundColor: n.isRead ? "transparent" : "#f0fdf4",
                        marginBottom: "4px",
                        cursor: "pointer",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#0f172a",
                        }}
                      >
                        {n.title}
                      </p>
                      <p
                        style={{
                          margin: "2px 0 0",
                          fontSize: "11px",
                          color: "#64748b",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => {
                  setShowNotifMenu(false);
                  navigate("/owner/notifications");
                }}
                style={{
                  width: "100%",
                  marginTop: "8px",
                  padding: "8px",
                  border: "none",
                  borderRadius: "8px",
                  backgroundColor: "#f8fafc",
                  color: "#16a34a",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                View All Notifications
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div
          style={{
            width: "1px",
            height: "32px",
            backgroundColor: "#e2e8f0",
          }}
        />

        {/* Profile Dropdown */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => {
              setShowMenu(!showMenu);
              setShowNotifMenu(false);
            }}
            style={{
              border: "none",
              backgroundColor: "transparent",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
              padding: "4px 6px",
              borderRadius: "10px",
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                backgroundColor: "#16a34a",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontWeight: "700",
                overflow: "hidden",
              }}
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Owner"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>

            <div style={{ textAlign: "left", minWidth: "100px" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#0f172a",
                }}
              >
                {displayName}
              </p>
              <p
                style={{
                  margin: 0,
                  marginTop: "2px",
                  fontSize: "11px",
                  color: "#64748b",
                }}
              >
                Owner
              </p>
            </div>

            <ChevronDown size={16} color="#64748b" />
          </button>

          {showMenu && (
            <div
              style={{
                position: "absolute",
                top: "50px",
                right: 0,
                width: "220px",
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
                padding: "8px",
                zIndex: 1000,
              }}
            >
              <div
                style={{
                  padding: "10px 12px",
                  borderBottom: "1px solid #f1f5f9",
                  marginBottom: "6px",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#0f172a",
                  }}
                >
                  {displayName}
                </p>
                <p
                  style={{
                    margin: "3px 0 0",
                    fontSize: "11px",
                    color: "#64748b",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {email}
                </p>
              </div>

              <DropdownItem
                icon={User}
                label="My Profile"
                onClick={() => {
                  setShowMenu(false);
                  navigate("/owner/profile");
                }}
              />
              <DropdownItem
                icon={Settings}
                label="Settings"
                onClick={() => {
                  setShowMenu(false);
                  navigate("/owner/settings");
                }}
              />
              <DropdownItem
                icon={LogOut}
                label="Logout"
                danger
                onClick={handleLogout}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function DropdownItem({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 12px",
        border: "none",
        borderRadius: "8px",
        backgroundColor: "transparent",
        color: danger ? "#dc2626" : "#475569",
        cursor: "pointer",
        fontSize: "13px",
        fontWeight: "500",
        textAlign: "left",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = danger ? "#fef2f2" : "#f8fafc";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <Icon size={17} />
      <span>{label}</span>
    </button>
  );
}