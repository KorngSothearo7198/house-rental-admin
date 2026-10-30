import React, { useState, useEffect } from "react";
import { auth, db } from "../../services/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import {
  Search,
  Eye,
  Ban,
  CheckCircle,
  Trash2,
  X,
  Mail,
  Phone,
  Calendar,
  Home,
  Clock,
  Building,
  CheckCircle2,
  XCircle,
  Loader2,
  MapPin,
  User,
} from "lucide-react";

export default function Owners() {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [deletingBookingId, setDeletingBookingId] = useState(null);

  // 1. FETCH OWNERS + PROPERTIES + BOOKINGS
  const fetchOwners = async () => {
    setLoading(true);
    try {
      const usersQuery = query(
        collection(db, "users"),
        where("role", "==", "owner")
      );
      const usersSnapshot = await getDocs(usersQuery);

      const propertiesSnapshot = await getDocs(collection(db, "properties"));
      const allProperties = propertiesSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      const bookingsSnapshot = await getDocs(collection(db, "bookings"));
      const allBookings = bookingsSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      const formatDate = (timestamp) => {
        if (!timestamp) return "N/A";
        if (timestamp.toDate)
          return timestamp.toDate().toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        return new Date(timestamp).toLocaleDateString();
      };

      const formatDateTime = (timestamp) => {
        if (!timestamp) return "N/A";
        const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return d.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      };

      const ownersData = usersSnapshot.docs.map((docSnap) => {
        const uData = docSnap.data();
        const ownerUid = uData.uid || docSnap.id;

        const ownerHouses = allProperties.filter((p) => p.ownerId === ownerUid);

        const ownerBookings = allBookings.filter((b) => b.ownerId === ownerUid);

        const pendingCount = ownerBookings.filter(
          (b) => (b.status || "").toLowerCase() === "pending"
        ).length;
        const approvedCount = ownerBookings.filter(
          (b) => (b.status || "").toLowerCase() === "approved"
        ).length;
        const rejectedCount = ownerBookings.filter((b) => {
          const s = (b.status || "").toLowerCase();
          return s === "rejected" || s === "cancelled";
        }).length;

        return {
          id: docSnap.id,
          uid: ownerUid,
          name: uData.fullName || uData.name || "Unnamed Owner",
          email: uData.email || "No Email",
          phone: uData.phone || "No Phone",
          address: uData.address || "N/A",
          occupation: uData.occupation || "House Business",
          bio: uData.bio || "",
          accountStatus: uData.accountStatus || "active",
          profileImage:
            uData.profileImage ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${
              uData.fullName || "Owner"
            }`,
          createdAt: formatDate(uData.createdAt),
          updatedAt: formatDate(uData.updatedAt),
          houses: ownerHouses.map((h) => ({
            id: h.id,
            title: h.title || "Untitled Property",
            location: h.location || "N/A",
            price: h.price || 0,
            bedrooms: h.bedrooms || 0,
            bathrooms: h.bathrooms || 0,
            category: h.category || "General",
            status: h.status || "published",
          })),
          bookings: ownerBookings
            .map((b) => ({
              id: b.id,
              renterName: b.renterName || b.userName || "Unknown Renter",
              propertyTitle: b.propertyTitle || b.houseTitle || "Property",
              status: (b.status || "pending").toLowerCase(),
              amount: b.amount || b.price || 0,
              createdAt: formatDateTime(b.createdAt || b.date),
              raw: b,
            }))
            .sort((a, b) => {
              // newest first if possible
              const da = a.raw.createdAt?.toDate
                ? a.raw.createdAt.toDate()
                : new Date(a.raw.createdAt || 0);
              const db = b.raw.createdAt?.toDate
                ? b.raw.createdAt.toDate()
                : new Date(b.raw.createdAt || 0);
              return db - da;
            }),
          bookingsStats: {
            pending: pendingCount,
            approved: approvedCount,
            rejected: rejectedCount,
          },
        };
      });

      setOwners(ownersData);
    } catch (error) {
      console.error("Error fetching owners:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwners();
  }, []);

  const filteredOwners = owners.filter(
    (owner) =>
      owner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      owner.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      owner.phone.includes(searchTerm)
  );

  // BLOCK / UNBLOCK
  const toggleBlockStatus = async (ownerDocId) => {
    const ownerObj = owners.find((o) => o.id === ownerDocId);
    if (!ownerObj) return;

    const newStatus = ownerObj.accountStatus === "active" ? "blocked" : "active";

    try {
      const ownerRef = doc(db, "users", ownerDocId);
      await updateDoc(ownerRef, {
        accountStatus: newStatus,
        updatedAt: new Date(),
      });

      setOwners(
        owners.map((o) =>
          o.id === ownerDocId ? { ...o, accountStatus: newStatus } : o
        )
      );

      if (selectedOwner && selectedOwner.id === ownerDocId) {
        setSelectedOwner((prev) => ({ ...prev, accountStatus: newStatus }));
      }
    } catch (error) {
      console.error("Error toggling block status:", error);
      alert("Failed to update account status.");
    }
  };

  // DELETE OWNER
  const handleDeleteOwner = async (ownerDocId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this owner account permanently?"
      )
    )
      return;

    try {
      await deleteDoc(doc(db, "users", ownerDocId));
      setOwners(owners.filter((o) => o.id !== ownerDocId));
      if (selectedOwner?.id === ownerDocId) setSelectedOwner(null);
    } catch (error) {
      console.error("Error deleting owner:", error);
      alert("Failed to delete owner account.");
    }
  };

  // DELETE BOOKING REQUEST
  const handleDeleteBooking = async (bookingId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this booking request permanently?"
      )
    )
      return;

    setDeletingBookingId(bookingId);
    try {
      await deleteDoc(doc(db, "bookings", bookingId));

      // Update local state
      setOwners((prev) =>
        prev.map((owner) => {
          if (!owner.bookings.some((b) => b.id === bookingId)) return owner;

          const newBookings = owner.bookings.filter((b) => b.id !== bookingId);
          const pending = newBookings.filter(
            (b) => b.status === "pending"
          ).length;
          const approved = newBookings.filter(
            (b) => b.status === "approved"
          ).length;
          const rejected = newBookings.filter(
            (b) => b.status === "rejected" || b.status === "cancelled"
          ).length;

          return {
            ...owner,
            bookings: newBookings,
            bookingsStats: { pending, approved, rejected },
          };
        })
      );

      if (selectedOwner) {
        setSelectedOwner((prev) => {
          if (!prev) return prev;
          const newBookings = prev.bookings.filter((b) => b.id !== bookingId);
          const pending = newBookings.filter(
            (b) => b.status === "pending"
          ).length;
          const approved = newBookings.filter(
            (b) => b.status === "approved"
          ).length;
          const rejected = newBookings.filter(
            (b) => b.status === "rejected" || b.status === "cancelled"
          ).length;

          return {
            ...prev,
            bookings: newBookings,
            bookingsStats: { pending, approved, rejected },
          };
        });
      }
    } catch (error) {
      console.error("Error deleting booking:", error);
      alert("Failed to delete booking request.");
    } finally {
      setDeletingBookingId(null);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        width: "100%",
        maxWidth: "100%",
        padding: "12px 12px 24px",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#0f172a",
            margin: 0,
            letterSpacing: "-0.4px",
          }}
        >
          Owner Management
        </h1>
        <p
          style={{
            color: "#64748b",
            margin: "4px 0 0",
            fontSize: 13,
          }}
        >
          Monitor house owners, their properties, and booking requests.
        </p>
      </div>

      {/* Search */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          padding: 12,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "8px 12px",
            flex: 1,
            minWidth: 0,
          }}
        >
          <Search size={16} color="#64748b" style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search name, email or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              width: "100%",
              fontSize: 13,
              color: "#334155",
            }}
          />
        </div>
        <div
          style={{
            fontSize: 12,
            color: "#64748b",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {filteredOwners.length} owner
          {filteredOwners.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 48,
            gap: 10,
            color: "#0284c7",
            fontSize: 14,
          }}
        >
          <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
          Loading owners...
        </div>
      ) : filteredOwners.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 40,
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 14,
          }}
        >
          No house owners found.
        </div>
      ) : (
        /* ===== CARD GRID ===== */
        <div className="owners-grid">
          {filteredOwners.map((owner) => (
            <div
              key={owner.id}
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 14,
                boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
                transition: "box-shadow 0.15s ease",
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <img
                  src={owner.profileImage}
                  alt={owner.name}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    objectFit: "cover",
                    background: "#e2e8f0",
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#0f172a",
                      fontSize: 15,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {owner.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#94a3b8",
                      marginTop: 2,
                    }}
                  >
                    UID: {owner.uid.substring(0, 8)}...
                  </div>
                </div>
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "capitalize",
                    background:
                      owner.accountStatus === "active" ? "#ecfdf5" : "#fef2f2",
                    color:
                      owner.accountStatus === "active" ? "#059669" : "#dc2626",
                    flexShrink: 0,
                  }}
                >
                  {owner.accountStatus}
                </span>
              </div>

              {/* Contact */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: 13,
                  color: "#475569",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    overflow: "hidden",
                  }}
                >
                  <Mail size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {owner.email}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Phone size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
                  {owner.phone}
                </div>
              </div>

              {/* Stats row */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    background: "#f5f3ff",
                    color: "#7c3aed",
                  }}
                >
                  {owner.houses.length} Property
                  {owner.houses.length !== 1 ? "s" : ""}
                </span>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    background: "#fffbeb",
                    color: "#b45309",
                  }}
                >
                  {owner.bookingsStats.pending} Pending
                </span>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    background: "#ecfdf5",
                    color: "#047857",
                  }}
                >
                  {owner.bookingsStats.approved} Approved
                </span>
              </div>

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: "auto",
                  paddingTop: 4,
                  borderTop: "1px solid #f1f5f9",
                }}
              >
                <button
                  onClick={() => {
                    setSelectedOwner(owner);
                    setActiveTab("profile");
                  }}
                  style={cardActionBtn}
                  title="View details"
                >
                  <Eye size={15} color="#0284c7" />
                  <span>View</span>
                </button>
                <button
                  onClick={() => toggleBlockStatus(owner.id)}
                  style={cardActionBtn}
                  title={
                    owner.accountStatus === "active"
                      ? "Block owner"
                      : "Unblock owner"
                  }
                >
                  {owner.accountStatus === "active" ? (
                    <Ban size={15} color="#d97706" />
                  ) : (
                    <CheckCircle size={15} color="#059669" />
                  )}
                  <span>
                    {owner.accountStatus === "active" ? "Block" : "Unblock"}
                  </span>
                </button>
                <button
                  onClick={() => handleDeleteOwner(owner.id)}
                  style={{ ...cardActionBtn, marginLeft: "auto" }}
                  title="Delete owner"
                >
                  <Trash2 size={15} color="#ef4444" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== OWNER DETAILS MODAL ===== */}
      {selectedOwner && (
        <div style={modalOverlayStyle} onClick={() => setSelectedOwner(null)}>
          <div
            style={modalContentStyle}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: 12,
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  minWidth: 0,
                }}
              >
                <img
                  src={selectedOwner.profileImage}
                  alt={selectedOwner.name}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    objectFit: "cover",
                    background: "#e2e8f0",
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <h3
                    style={{
                      margin: 0,
                      color: "#0f172a",
                      fontSize: 17,
                      fontWeight: 700,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {selectedOwner.name}
                  </h3>
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    Registered: {selectedOwner.createdAt}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedOwner(null)}
                style={{
                  border: "none",
                  background: "#f1f5f9",
                  borderRadius: 8,
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <X size={18} color="#64748b" />
              </button>
            </div>

            {/* Tabs */}
            <div
              style={{
                display: "flex",
                gap: 6,
                borderBottom: "1px solid #e2e8f0",
                marginTop: 12,
                paddingBottom: 8,
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <TabBtn
                label="Overview"
                active={activeTab === "profile"}
                onClick={() => setActiveTab("profile")}
              />
              <TabBtn
                label={`Properties (${selectedOwner.houses.length})`}
                active={activeTab === "rooms"}
                onClick={() => setActiveTab("rooms")}
              />
              <TabBtn
                label={`Bookings (${selectedOwner.bookings.length})`}
                active={activeTab === "bookings"}
                onClick={() => setActiveTab("bookings")}
              />
            </div>

            {/* Tab Content */}
            <div
              style={{
                marginTop: 16,
                minHeight: 200,
                maxHeight: "55vh",
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {/* OVERVIEW */}
              {activeTab === "profile" && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  <div
                    className="info-grid"
                    style={{
                      background: "#f8fafc",
                      padding: 14,
                      borderRadius: 10,
                    }}
                  >
                    <InfoItem
                      icon={<Mail size={15} />}
                      label="Email"
                      value={selectedOwner.email}
                    />
                    <InfoItem
                      icon={<Phone size={15} />}
                      label="Phone"
                      value={selectedOwner.phone}
                    />
                    <InfoItem
                      icon={<MapPin size={15} />}
                      label="Address"
                      value={selectedOwner.address}
                    />
                    <InfoItem
                      icon={<Building size={15} />}
                      label="Occupation"
                      value={selectedOwner.occupation}
                    />
                    <InfoItem
                      icon={<Calendar size={15} />}
                      label="Status"
                      value={selectedOwner.accountStatus}
                      color={
                        selectedOwner.accountStatus === "active"
                          ? "#059669"
                          : "#dc2626"
                      }
                    />
                    <InfoItem
                      icon={<Clock size={15} />}
                      label="Last Updated"
                      value={selectedOwner.updatedAt}
                    />
                  </div>

                  {selectedOwner.bio && (
                    <div
                      style={{
                        background: "#f1f5f9",
                        padding: 12,
                        borderRadius: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#64748b",
                          textTransform: "uppercase",
                        }}
                      >
                        Bio
                      </span>
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: 13,
                          color: "#334155",
                          lineHeight: 1.5,
                        }}
                      >
                        {selectedOwner.bio}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* PROPERTIES */}
              {activeTab === "rooms" && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {selectedOwner.houses.length > 0 ? (
                    selectedOwner.houses.map((house) => (
                      <div
                        key={house.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: 12,
                          border: "1px solid #e2e8f0",
                          borderRadius: 10,
                          background: "#f8fafc",
                          gap: 10,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              color: "#0f172a",
                              fontSize: 14,
                            }}
                          >
                            {house.title}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#64748b",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              marginTop: 2,
                            }}
                          >
                            <MapPin size={12} />
                            {house.location} · {house.bedrooms} Bed,{" "}
                            {house.bathrooms} Bath
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#0284c7",
                              display: "block",
                            }}
                          >
                            ${house.price}/mo
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: "#64748b",
                              textTransform: "capitalize",
                            }}
                          >
                            {house.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: 28,
                        color: "#94a3b8",
                        fontSize: 13,
                      }}
                    >
                      No properties listed yet.
                    </div>
                  )}
                </div>
              )}

              {/* BOOKING REQUESTS + DELETE */}
              {activeTab === "bookings" && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  {/* Stats */}
                  <div className="booking-stats-grid">
                    <BookingStatCard
                      icon={<Clock size={18} color="#f59e0b" />}
                      label="Pending"
                      value={selectedOwner.bookingsStats.pending}
                      bg="#fffbeb"
                      color="#b45309"
                    />
                    <BookingStatCard
                      icon={<CheckCircle2 size={18} color="#10b981" />}
                      label="Approved"
                      value={selectedOwner.bookingsStats.approved}
                      bg="#ecfdf5"
                      color="#047857"
                    />
                    <BookingStatCard
                      icon={<XCircle size={18} color="#ef4444" />}
                      label="Rejected"
                      value={selectedOwner.bookingsStats.rejected}
                      bg="#fef2f2"
                      color="#b91c1c"
                    />
                  </div>

                  {/* List of bookings with delete */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.3px",
                      }}
                    >
                      All Requests ({selectedOwner.bookings.length})
                    </div>

                    {selectedOwner.bookings.length > 0 ? (
                      selectedOwner.bookings.map((booking) => {
                        let statusColor = "#f59e0b";
                        let statusBg = "#fffbeb";
                        if (booking.status === "approved") {
                          statusColor = "#059669";
                          statusBg = "#ecfdf5";
                        } else if (
                          booking.status === "rejected" ||
                          booking.status === "cancelled"
                        ) {
                          statusColor = "#dc2626";
                          statusBg = "#fef2f2";
                        }

                        return (
                          <div
                            key={booking.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "12px 12px",
                              border: "1px solid #e2e8f0",
                              borderRadius: 10,
                              background: "#fff",
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  flexWrap: "wrap",
                                }}
                              >
                                <span
                                  style={{
                                    fontWeight: 600,
                                    fontSize: 13,
                                    color: "#0f172a",
                                  }}
                                >
                                  {booking.renterName}
                                </span>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: "2px 7px",
                                    borderRadius: 4,
                                    background: statusBg,
                                    color: statusColor,
                                    textTransform: "capitalize",
                                  }}
                                >
                                  {booking.status}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "#64748b",
                                  marginTop: 3,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {booking.propertyTitle}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#94a3b8",
                                  marginTop: 2,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                <Calendar size={11} />
                                {booking.createdAt}
                                {booking.amount > 0 && (
                                  <span style={{ marginLeft: 6 }}>
                                    · ${Number(booking.amount).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Delete Booking */}
                            <button
                              onClick={() => handleDeleteBooking(booking.id)}
                              disabled={deletingBookingId === booking.id}
                              title="Delete booking request"
                              style={{
                                border: "none",
                                background:
                                  deletingBookingId === booking.id
                                    ? "#f1f5f9"
                                    : "#fef2f2",
                                borderRadius: 8,
                                width: 36,
                                height: 36,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor:
                                  deletingBookingId === booking.id
                                    ? "not-allowed"
                                    : "pointer",
                                flexShrink: 0,
                              }}
                            >
                              {deletingBookingId === booking.id ? (
                                <Loader2
                                  size={15}
                                  color="#94a3b8"
                                  style={{
                                    animation: "spin 1s linear infinite",
                                  }}
                                />
                              ) : (
                                <Trash2 size={15} color="#ef4444" />
                              )}
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div
                        style={{
                          textAlign: "center",
                          padding: 28,
                          color: "#94a3b8",
                          fontSize: 13,
                          background: "#f8fafc",
                          borderRadius: 10,
                        }}
                      >
                        No booking requests yet.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 16,
                paddingTop: 12,
                borderTop: "1px solid #e2e8f0",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => toggleBlockStatus(selectedOwner.id)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  background:
                    selectedOwner.accountStatus === "active"
                      ? "#fef3c7"
                      : "#d1fae5",
                  color:
                    selectedOwner.accountStatus === "active"
                      ? "#d97706"
                      : "#059669",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {selectedOwner.accountStatus === "active"
                  ? "Block Account"
                  : "Unblock Account"}
              </button>
              <button
                onClick={() => setSelectedOwner(null)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#475569",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          .owners-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .info-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .booking-stats-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
          }

          @media (min-width: 480px) {
            .owners-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            .info-grid {
              grid-template-columns: 1fr 1fr;
            }
            .booking-stats-grid {
              grid-template-columns: repeat(3, 1fr);
            }
          }

          @media (min-width: 900px) {
            .owners-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }

          @media (min-width: 1200px) {
            .owners-grid {
              grid-template-columns: repeat(4, minmax(0, 1fr));
            }
          }
        `}
      </style>
    </div>
  );
}

/* ===== HELPERS ===== */

function TabBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 12px",
        borderRadius: 7,
        border: "none",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        background: active ? "#0284c7" : "transparent",
        color: active ? "#fff" : "#64748b",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

function InfoItem({ icon, label, value, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span
        style={{
          fontSize: 11,
          color: "#64748b",
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontWeight: 600,
        }}
      >
        {icon} {label}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: color || "#1e293b",
          textTransform: "capitalize",
          wordBreak: "break-word",
        }}
      >
        {value || "N/A"}
      </span>
    </div>
  );
}

function BookingStatCard({ icon, label, value, bg, color }) {
  return (
    <div
      style={{
        background: bg,
        padding: "12px 10px",
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        textAlign: "center",
      }}
    >
      {icon}
      <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 800, color }}>{value}</span>
    </div>
  );
}

const cardActionBtn = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  border: "1px solid #e2e8f0",
  background: "#fff",
  padding: "6px 10px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
  color: "#475569",
};

const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(15, 23, 42, 0.55)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
  padding: 12,
  boxSizing: "border-box",
};

const modalContentStyle = {
  background: "#fff",
  borderRadius: 14,
  padding: 20,
  width: "100%",
  maxWidth: 520,
  maxHeight: "90vh",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
};