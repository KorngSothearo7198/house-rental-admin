import React, { useState, useEffect, useMemo } from "react";
import { auth } from "../../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import {
  Search,
  Eye,
  X,
  User,
  Home,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  CreditCard,
  Calendar,
  MapPin,
  LayoutGrid,
  List,
  DollarSign,
} from "lucide-react";
import {
  fetchOwnerBookings,
  approveBooking,
  rejectBooking,
  formatDate,
} from "../../services/ownerBookingServices"; // use your service file

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState("table"); // table | grid

  const [viewingBooking, setViewingBooking] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [propertyInfo, setPropertyInfo] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Load owner bookings
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const list = await fetchOwnerBookings(user.uid);

        // Enrich with renter + property titles
        const enriched = await Promise.all(
          list.map(async (bk) => {
            let renterName = "Unknown";
            let renterEmail = "";
            if (bk.renterId) {
              try {
                const rDoc = await getDoc(doc(db, "users", bk.renterId));
                if (rDoc.exists()) {
                  const r = rDoc.data();
                  renterName = r.fullName || r.name || r.email || "Renter";
                  renterEmail = r.email || "";
                }
              } catch {}
            }

            let houseTitle = "Unknown Property";
            if (bk.houseId) {
              try {
                const pDoc = await getDoc(doc(db, "properties", bk.houseId));
                if (pDoc.exists()) {
                  houseTitle = pDoc.data().title || "Property";
                }
              } catch {}
            }

            return {
              ...bk,
              renterName,
              renterEmail,
              houseTitle,
              formattedCreatedAt: formatDate(bk.createdAt),
              formattedStart: formatDate(bk.startDate),
              formattedEnd: formatDate(bk.endDate),
            };
          })
        );

        setBookings(enriched);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Open detail + load payment + property
  const openBookingDetail = async (bk) => {
    setViewingBooking(bk);
    setPaymentInfo(null);
    setPropertyInfo(null);
    setLoadingDetail(true);

    try {
      // Load property
      if (bk.houseId) {
        const pDoc = await getDoc(doc(db, "properties", bk.houseId));
        if (pDoc.exists()) {
          setPropertyInfo({ id: pDoc.id, ...pDoc.data() });
        }
      }

      // Load payment by bookingId
      const payQ = query(
        collection(db, "payments"),
        where("bookingId", "==", bk.id)
      );
      const paySnap = await getDocs(payQ);
      if (!paySnap.empty) {
        const pay = paySnap.docs[0].data();
        setPaymentInfo({ id: paySnap.docs[0].id, ...pay });
      } else if (bk.paymentId) {
        // fallback by paymentId
        const payDoc = await getDoc(doc(db, "payments", bk.paymentId));
        if (payDoc.exists()) {
          setPaymentInfo({ id: payDoc.id, ...payDoc.data() });
        }
      }
    } catch (err) {
      console.error("Detail load error:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const filtered = useMemo(() => {
    return bookings.filter((bk) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        bk.id?.toLowerCase().includes(term) ||
        bk.renterName?.toLowerCase().includes(term) ||
        bk.houseTitle?.toLowerCase().includes(term);

      const matchStatus =
        statusFilter === "All" ||
        (bk.status || "").toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchStatus;
    });
  }, [bookings, searchTerm, statusFilter]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <Loader2 className="animate-spin text-primary" size={36} />
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 px-3 px-lg-4" style={{ background: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">Bookings</h2>
          <p className="text-muted small mb-0">Manage booking requests and payments</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-4 rounded-3">
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
                  placeholder="Search booking, renter, property..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="col-12 col-md-auto">
              <div className="d-flex flex-wrap gap-2">
                {["All", "Pending", "Approved", "Rejected", "Cancelled"].map((s) => (
                  <button
                    key={s}
                    className={`btn btn-sm rounded-pill px-3 ${
                      statusFilter === s ? "btn-primary" : "btn-outline-secondary"
                    }`}
                    onClick={() => setStatusFilter(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="col-12 col-md-auto ms-md-auto">
              <div className="btn-group btn-group-sm">
                <button
                  className={`btn ${viewMode === "table" ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={() => setViewMode("table")}
                >
                  <List size={16} />
                </button>
                <button
                  className={`btn ${viewMode === "grid" ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
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
                {filtered.map((bk) => (
                  <tr key={bk.id}>
                    <td className="ps-4 py-3">
                      <div className="fw-semibold text-primary">#{bk.id.slice(0, 8)}</div>
                      <div className="small text-muted">{bk.formattedCreatedAt}</div>
                    </td>
                    <td className="py-3">
                      <div className="fw-medium">{bk.renterName}</div>
                      <div className="small text-muted">{bk.renterEmail}</div>
                    </td>
                    <td className="py-3">
                      <div className="text-truncate" style={{ maxWidth: 160 }}>{bk.houseTitle}</div>
                    </td>
                    <td className="py-3">
                      <div className="fw-bold text-success">${Number(bk.totalAmount || 0).toFixed(2)}</div>
                      <div className="small text-muted">{bk.totalDays || 0} day(s)</div>
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
                        onClick={() => openBookingDetail(bk)}
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
        <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
          {filtered.map((bk) => (
            <div key={bk.id} className="col">
              <div className="card border-0 shadow-sm rounded-3 h-100">
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="badge bg-light text-primary border">#{bk.id.slice(0, 8)}</span>
                    <StatusBadge status={bk.status} />
                  </div>
                  <h6 className="fw-bold mb-1 text-truncate">{bk.houseTitle}</h6>
                  <p className="small text-muted mb-2 d-flex align-items-center gap-1">
                    <User size={13} /> {bk.renterName}
                  </p>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <div className="fw-bold text-success">${Number(bk.totalAmount || 0).toFixed(2)}</div>
                      <div className="small text-muted">{bk.totalDays || 0} days</div>
                    </div>
                    <PaymentBadge status={bk.paymentStatus} />
                  </div>
                  <button
                    className="btn btn-outline-primary btn-sm w-100"
                    onClick={() => openBookingDetail(bk)}
                  >
                    <Eye size={14} className="me-1" /> View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= BOOKING DETAIL MODAL ================= */}
      {viewingBooking && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ background: "rgba(15,23,42,0.55)", zIndex: 1050, backdropFilter: "blur(4px)" }}
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
                <div className="small text-muted">#{viewingBooking.id}</div>
              </div>
              <button className="btn btn-sm btn-light border rounded-circle p-1" onClick={() => setViewingBooking(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-grow-1 overflow-auto p-4">
              {loadingDetail ? (
                <div className="text-center py-5">
                  <Loader2 className="animate-spin text-primary" size={28} />
                </div>
              ) : (
                <>
                  {/* Status + Amount */}
                  <div className="d-flex justify-content-between align-items-center mb-4 p-3 rounded-3" style={{ background: "#f8fafc" }}>
                    <div>
                      <div className="small text-muted mb-1">Status</div>
                      <StatusBadge status={viewingBooking.status} />
                    </div>
                    <div className="text-end">
                      <div className="small text-muted mb-1">Total Amount</div>
                      <div className="fs-4 fw-bold text-success">
                        ${Number(viewingBooking.totalAmount || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Property */}
                  <Section title="Property" icon={<Home size={16} className="text-success" />}>
                    <div className="fw-semibold">{viewingBooking.houseTitle}</div>
                    {propertyInfo && (
                      <div className="small text-muted mt-1 d-flex align-items-center gap-1">
                        <MapPin size={13} /> {propertyInfo.location}
                      </div>
                    )}
                    <div className="row g-2 mt-2 small">
                      <div className="col-6">
                        <span className="text-muted">Start:</span>{" "}
                        <strong>{viewingBooking.formattedStart}</strong>
                      </div>
                      <div className="col-6">
                        <span className="text-muted">End:</span>{" "}
                        <strong>{viewingBooking.formattedEnd}</strong>
                      </div>
                      <div className="col-6">
                        <span className="text-muted">Days:</span>{" "}
                        <strong>{viewingBooking.totalDays || 0}</strong>
                      </div>
                      <div className="col-6">
                        <span className="text-muted">Monthly:</span>{" "}
                        <strong>${viewingBooking.monthlyPrice || 0}</strong>
                      </div>
                    </div>
                  </Section>

                  {/* Renter */}
                  <Section title="Renter" icon={<User size={16} className="text-primary" />}>
                    <div className="fw-semibold">{viewingBooking.renterName}</div>
                    <div className="small text-muted">{viewingBooking.renterEmail}</div>
                  </Section>

                  {/* Payment */}
                  <Section title="Payment" icon={<CreditCard size={16} className="text-warning" />}>
                    {paymentInfo ? (
                      <div className="small">
                        <div className="d-flex justify-content-between mb-1">
                          <span className="text-muted">Status</span>
                          <PaymentBadge status={paymentInfo.status || viewingBooking.paymentStatus} />
