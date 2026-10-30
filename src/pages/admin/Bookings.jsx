import React, { useState, useEffect, useMemo } from "react";
import { auth, db } from "../../services/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import {
  Search,
  Eye,
  X,
  User,
  Building2,
  Home,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  CreditCard,
  FileText,
  Printer,
  Send,
  LayoutGrid,
  List,
  MapPin,
  Calendar,
  DollarSign,
} from "lucide-react";

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [viewMode, setViewMode] = useState("table"); // table | grid
  const [viewingBooking, setViewingBooking] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loadingPayment, setLoadingPayment] = useState(false);

  // Fetch bookings + related data
  const fetchBookings = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "bookings"));

      const bookingsData = await Promise.all(
        querySnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();

          // Renter
          let renterName = "Unknown Renter";
          let renterEmail = "";
          let renterPhone = "";
          if (data.renterId) {
            try {
              const renterDoc = await getDoc(doc(db, "users", data.renterId));
              if (renterDoc.exists()) {
                const r = renterDoc.data();
                renterName = r.fullName || r.name || r.email || "Renter";
                renterEmail = r.email || "";
                renterPhone = r.phone || "";
              }
            } catch (e) {}
          }

          // Owner
          let ownerName = "Unknown Owner";
          if (data.ownerId) {
            try {
              const ownerDoc = await getDoc(doc(db, "users", data.ownerId));
              if (ownerDoc.exists()) {
                const o = ownerDoc.data();
                ownerName = o.fullName || o.name || o.email || "Owner";
              }
            } catch (e) {}
          }

          // Property
          let houseTitle = "Unknown Property";
          let houseLocation = "";
          let houseImage = "";
          if (data.houseId) {
            try {
              let houseDoc = await getDoc(doc(db, "properties", data.houseId));
              if (!houseDoc.exists()) {
                houseDoc = await getDoc(doc(db, "houses", data.houseId));
              }
              if (houseDoc.exists()) {
                const h = houseDoc.data();
                houseTitle = h.title || h.name || "Property";
                houseLocation = h.location || "";
                houseImage = h.imageUrl || "";
              }
            } catch (e) {}
          }

          const formatDate = (ts) => {
            if (!ts) return "N/A";
            if (ts.toDate)
              return ts.toDate().toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              });
            return new Date(ts).toLocaleDateString();
          };

          return {
            id: docSnap.id,
            renterId: data.renterId || "",
            renterName,
            renterEmail,
            renterPhone,
            ownerId: data.ownerId || "",
            ownerName,
            houseId: data.houseId || "",
            houseTitle,
            houseLocation,
            houseImage,
            monthlyPrice: data.monthlyPrice || 0,
            totalAmount: data.totalAmount || 0,
            totalDays: data.totalDays || 0,
            paymentId: data.paymentId || "",
            paymentStatus: data.paymentStatus || "PENDING",
            status: data.status || "Pending",
            note: data.note || "",
            ownerNote: data.ownerNote || "",
            cancelReason: data.cancelReason || "",
            startDate: formatDate(data.startDate),
            endDate: formatDate(data.endDate),
            createdAt: formatDate(data.createdAt),
            raw: data,
          };
        })
      );

      // Sort newest first
      bookingsData.sort((a, b) => {
        const aSec = a.raw?.createdAt?.seconds || 0;
        const bSec = b.raw?.createdAt?.seconds || 0;
        return bSec - aSec;
      });

      setBookings(bookingsData);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Fetch payment details when opening modal
  const openBookingDetails = async (bk) => {
    setViewingBooking(bk);
    setPaymentDetails(null);

    if (!bk.paymentId && !bk.id) return;

    setLoadingPayment(true);
    try {
      // Try by paymentId first
      let payData = null;

      if (bk.paymentId) {
        const payDoc = await getDoc(doc(db, "payments", bk.paymentId));
        if (payDoc.exists()) {
          payData = { id: payDoc.id, ...payDoc.data() };
        }
      }

      // Fallback: search by bookingId
      if (!payData) {
        const q = query(
          collection(db, "payments"),
          where("bookingId", "==", bk.id)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const d = snap.docs[0];
          payData = { id: d.id, ...d.data() };
        }
      }

      setPaymentDetails(payData);
    } catch (err) {
      console.error("Error fetching payment:", err);
    } finally {
      setLoadingPayment(false);
    }
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((bk) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        bk.id.toLowerCase().includes(term) ||
        bk.renterName.toLowerCase().includes(term) ||
        bk.houseTitle.toLowerCase().includes(term) ||
        bk.ownerName.toLowerCase().includes(term);

      const matchesStatus =
        selectedStatus === "All" ||
        bk.status.toLowerCase() === selectedStatus.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchTerm, selectedStatus]);

  const handlePrint = () => window.print();

  const handleShareTelegram = (bk) => {
    const amount =
      paymentDetails?.bookingAmount ||
      paymentDetails?.amount ||
      bk.totalAmount ||
      0;

    const text = `🏠 *BOOKING DETAILS*
──────────────────────
📌 Booking ID: #${bk.id.slice(0, 10)}
👤 Renter: ${bk.renterName}
🏡 Property: ${bk.houseTitle}
📅 ${bk.startDate} → ${bk.endDate} (${bk.totalDays} days)
💰 Amount: $${amount}
💳 Payment: ${paymentDetails?.status || bk.paymentStatus}
📊 Status: ${bk.status}
──────────────────────`;

    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`,
      "_blank"
    );
  };

  return (
    <div className="container-fluid py-4 px-3 px-lg-4" style={{ background: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">Booking Management</h2>
          <p className="text-muted small mb-0">
            Monitor bookings, payments and rental status
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-body p-3">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <Search size={16} className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search Booking ID, Renter, Property..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="col-12 col-md-auto">
              <div className="d-flex flex-wrap gap-2">
                {["All", "Pending", "Approved", "Rejected", "Cancelled"].map(
                  (s) => (
                    <button
                      key={s}
                      className={`btn btn-sm rounded-pill px-3 ${
                        selectedStatus === s
                          ? "btn-primary"
                          : "btn-outline-secondary"
                      }`}
                      onClick={() => setSelectedStatus(s)}
                    >
                      {s}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="col-12 col-md-auto ms-md-auto">
              <div className="btn-group btn-group-sm">
                <button
                  className={`btn ${viewMode === "table" ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={() => setViewMode("table")}
                >
                  <List size={15} />
                </button>
                <button
                  className={`btn ${viewMode === "grid" ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="d-flex justify-content-center align-items-center py-5">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="card border-0 shadow-sm rounded-3 text-center py-5">
          <div className="card-body text-muted">
            <Home size={40} className="mb-2 opacity-50" />
            <p className="mb-0">No bookings found</p>
          </div>
        </div>
      ) : viewMode === "table" ? (
        /* ========== TABLE VIEW ========== */
        <div className="card border-0 shadow-sm rounded-3 overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <th className="ps-4 py-3 small text-secondary text-uppercase" style={{ fontSize: 12 }}>Booking</th>
                  <th className="py-3 small text-secondary text-uppercase" style={{ fontSize: 12 }}>Renter</th>
                  <th className="py-3 small text-secondary text-uppercase" style={{ fontSize: 12 }}>Property</th>
                  <th className="py-3 small text-secondary text-uppercase" style={{ fontSize: 12 }}>Amount</th>
                  <th className="py-3 small text-secondary text-uppercase" style={{ fontSize: 12 }}>Payment</th>
                  <th className="py-3 small text-secondary text-uppercase" style={{ fontSize: 12 }}>Status</th>
                  <th className="text-end pe-4 py-3 small text-secondary text-uppercase" style={{ fontSize: 12 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((bk) => (
                  <tr key={bk.id}>
                    <td className="ps-4 py-3">
                      <div className="fw-semibold text-primary small">
                        #{bk.id.slice(0, 8)}
                      </div>
                      <div className="text-muted" style={{ fontSize: 11 }}>
                        {bk.createdAt}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="fw-semibold text-dark small">{bk.renterName}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>
                        {bk.renterEmail}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="fw-medium text-dark small text-truncate" style={{ maxWidth: 160 }}>
                        {bk.houseTitle}
                      </div>
                      {bk.houseLocation && (
                        <div className="text-muted d-flex align-items-center gap-1" style={{ fontSize: 11 }}>
                          <MapPin size={11} /> {bk.houseLocation}
                        </div>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="fw-bold text-success">
                        ${Number(bk.totalAmount).toFixed(2)}
                      </div>
                      <div className="text-muted" style={{ fontSize: 11 }}>
                        {bk.totalDays} day{bk.totalDays > 1 ? "s" : ""}
                      </div>
                    </td>
                    <td className="py-3">
                      <PaymentBadge status={bk.paymentStatus} />
                    </td>
                    <td className="py-3">
                      <StatusBadge status={bk.status} />
                    </td>
                    <td className="text-end pe-4 py-3">
                      <button
                        className="btn btn-sm btn-light border"
                        onClick={() => openBookingDetails(bk)}
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ========== GRID VIEW ========== */
        <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
          {filteredBookings.map((bk) => (
            <div key={bk.id} className="col">
              <div className="card border-0 shadow-sm rounded-3 h-100">
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="badge bg-light text-primary border small">
                      #{bk.id.slice(0, 8)}
                    </span>
                    <StatusBadge status={bk.status} />
                  </div>

                  <h6 className="fw-bold text-dark mb-1 text-truncate">
                    {bk.houseTitle}
                  </h6>
                  <p className="text-muted small mb-2 d-flex align-items-center gap-1">
                    <User size={13} /> {bk.renterName}
                  </p>

                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <div className="fw-bold text-success">
                        ${Number(bk.totalAmount).toFixed(2)}
                      </div>
                      <div className="text-muted" style={{ fontSize: 11 }}>
                        {bk.totalDays} days
                      </div>
                    </div>
                    <PaymentBadge status={bk.paymentStatus} />
                  </div>

                  <div className="small text-muted mb-3">
                    <Calendar size={12} className="me-1" />
                    {bk.startDate} → {bk.endDate}
                  </div>

                  <button
                    className="btn btn-sm btn-outline-primary w-100"
                    onClick={() => openBookingDetails(bk)}
                  >
                    <Eye size={14} className="me-1" /> View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= BOOKING DETAILS MODAL ================= */}
      {viewingBooking && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{
            background: "rgba(15,23,42,0.55)",
            zIndex: 1050,
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setViewingBooking(null)}
        >
          <div
            className="bg-white rounded-4 shadow-lg d-flex flex-column"
            style={{ width: "100%", maxWidth: 640, maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center p-3 border-bottom flex-shrink-0">
              <div>
                <h5 className="fw-bold mb-0">Booking Details</h5>
                <div className="small text-muted">
                  #{viewingBooking.id}
                </div>
              </div>
              <button
                className="btn btn-sm btn-light border rounded-circle p-1"
                onClick={() => setViewingBooking(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-grow-1 overflow-auto p-4">
              {/* Status + Amount Banner */}
              <div className="d-flex justify-content-between align-items-center p-3 rounded-3 mb-3" style={{ background: "#f8fafc" }}>
                <div>
                  <div className="small text-muted mb-1">Status</div>
                  <StatusBadge status={viewingBooking.status} />
                </div>
                <div className="text-end">
                  <div className="small text-muted mb-1">Total Amount</div>
                  <div className="fs-4 fw-bold text-success">
                    $
                    {Number(
                      paymentDetails?.bookingAmount ||
                        paymentDetails?.amount ||
                        viewingBooking.totalAmount ||
                        0
                    ).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Renter */}
              <Section title="Renter" icon={<User size={16} className="text-primary" />}>
                <InfoRow label="Name" value={viewingBooking.renterName} />
                <InfoRow label="Email" value={viewingBooking.renterEmail || "—"} />
                <InfoRow label="Phone" value={viewingBooking.renterPhone || "—"} />
              </Section>

              {/* Property */}
              <Section title="Property" icon={<Home size={16} className="text-success" />}>
                <InfoRow label="Title" value={viewingBooking.houseTitle} />
                <InfoRow label="Location" value={viewingBooking.houseLocation || "—"} />
                <InfoRow label="Monthly Price" value={`$${viewingBooking.monthlyPrice}`} />
                <InfoRow label="Duration" value={`${viewingBooking.totalDays} day(s)`} />
                <InfoRow label="Check-in" value={viewingBooking.startDate} />
                <InfoRow label="Check-out" value={viewingBooking.endDate} />
              </Section>

              {/* Payment (from payments collection) */}
              <Section title="Payment Details" icon={<CreditCard size={16} className="text-warning" />}>
                {loadingPayment ? (
                  <div className="text-center py-3">
                    <Loader2 className="animate-spin text-primary" size={20} />
                  </div>
                ) : paymentDetails ? (
                  <>
                    <InfoRow
                      label="Status"
                      value={
                        <span
                          className={`fw-semibold ${
                            (paymentDetails.status || "").toLowerCase() === "paid"
                              ? "text-success"
                              : "text-warning"
                          }`}
                        >
                          {paymentDetails.status || "—"}
                        </span>
                      }
                    />
                    <InfoRow
                      label="Booking Amount"
                      value={
                        <span className="fw-bold text-success">
                          ${Number(paymentDetails.bookingAmount || paymentDetails.amount || 0).toFixed(2)}
                          {paymentDetails.bookingCurrency
                            ? ` ${paymentDetails.bookingCurrency}`
                            : ""}
                        </span>
                      }
                    />
                    <InfoRow
                      label="Paid Amount"
                      value={`${paymentDetails.amount || 0} ${paymentDetails.currency || ""}`}
                    />
                    <InfoRow label="Method" value={paymentDetails.paymentMethod || "—"} />
                    <InfoRow
                      label="Bakong Account"
                      value={
                        <code className="small bg-light px-2 py-1 rounded">
                          {paymentDetails.bakongAccount || "—"}
                        </code>
                      }
                    />
                    <InfoRow
                      label="Transaction Hash"
                      value={
                        <span className="small text-muted text-break">
                          {paymentDetails.bakongTransactionHash
                            ? `${paymentDetails.bakongTransactionHash.slice(0, 16)}...`
                            : "—"}
                        </span>
                      }
                    />
                    <InfoRow label="Payment ID" value={paymentDetails.paymentId || paymentDetails.id || "—"} />
                  </>
                ) : (
                  <div className="text-muted small">
                    No payment record found for this booking.
                    <div className="mt-1">
                      Booking payment status:{" "}
                      <PaymentBadge status={viewingBooking.paymentStatus} />
                    </div>
                  </div>
                )}
              </Section>

              {/* Notes */}
              {(viewingBooking.note ||
                viewingBooking.ownerNote ||
                viewingBooking.cancelReason) && (
                <Section title="Notes" icon={<FileText size={16} className="text-secondary" />}>
                  {viewingBooking.note && (
                    <InfoRow label="Renter Note" value={viewingBooking.note} />
                  )}
                  {viewingBooking.ownerNote && (
                    <InfoRow label="Owner Note" value={viewingBooking.ownerNote} />
                  )}
                  {viewingBooking.cancelReason && (
                    <InfoRow
                      label="Cancel Reason"
                      value={
                        <span className="text-danger">{viewingBooking.cancelReason}</span>
                      }
                    />
                  )}
                </Section>
              )}
            </div>

            {/* Footer */}
            <div className="d-flex justify-content-between align-items-center p-3 border-top flex-shrink-0 gap-2 flex-wrap">
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" onClick={handlePrint}>
                  <Printer size={14} /> Print
                </button>
                <button
                  className="btn btn-sm text-white d-flex align-items-center gap-1"
                  style={{ background: "#229ED9" }}
                  onClick={() => handleShareTelegram(viewingBooking)}
                >
                  <Send size={14} /> Telegram
                </button>
              </div>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setViewingBooking(null)}
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

/* ---------- Helpers ---------- */
function Section({ title, icon, children }) {
  return (
    <div className="mb-3">
      <div className="d-flex align-items-center gap-2 mb-2">
        {icon}
        <span className="fw-semibold small">{title}</span>
      </div>
      <div className="bg-light rounded-3 p-3">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="d-flex justify-content-between align-items-start mb-1 small">
      <span className="text-muted">{label}</span>
      <span className="text-dark text-end" style={{ maxWidth: "60%" }}>
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = (status || "").toLowerCase();
  let bg = "#fef3c7",
    color = "#92400e",
    icon = <Clock size={12} />;

  if (s === "approved" || s === "confirmed") {
    bg = "#dcfce7";
    color = "#166534";
    icon = <CheckCircle2 size={12} />;
  } else if (s === "rejected") {
    bg = "#fee2e2";
    color = "#991b1b";
    icon = <XCircle size={12} />;
  } else if (s === "cancelled" || s === "canceled") {
    bg = "#f1f5f9";
    color = "#475569";
    icon = <AlertCircle size={12} />;
  }

  return (
    <span
      className="badge rounded-pill d-inline-flex align-items-center gap-1 px-2 py-1"
      style={{ background: bg, color, fontSize: 12 }}
    >
      {icon} {status}
    </span>
  );
}

function PaymentBadge({ status }) {
  const s = (status || "").toLowerCase();
  const paid = s === "paid";
  return (
    <span
      className="badge rounded-pill px-2 py-1"
      style={{
        background: paid ? "#dcfce7" : "#fef3c7",
        color: paid ? "#166534" : "#92400e",
        fontSize: 11,
      }}
    >
      {status || "Pending"}
    </span>
  );
}