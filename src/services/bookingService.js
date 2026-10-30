import { db } from "./firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

// Safe date formatter
export const formatDate = (dateVal) => {
  if (!dateVal) return "N/A";
  if (typeof dateVal === "string") return dateVal;

  let date;
  if (dateVal?.toDate && typeof dateVal.toDate === "function") {
    date = dateVal.toDate();
  } else if (typeof dateVal === "object" && dateVal.seconds !== undefined) {
    date = new Date(dateVal.seconds * 1000);
  } else {
    return "N/A";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Format money cleanly (fixes 14.799999999999999)
export const formatMoney = (value) => {
  const num = Number(value) || 0;
  return num.toFixed(2);
};

// Get property info by houseId
const getPropertyInfo = async (houseId) => {
  if (!houseId) {
    return { title: "Untitled Property", location: "—", category: "—", imageUrl: null };
  }

  try {
    // Try the most common collection names
    const collectionsToTry = ["properties", "houses", "listings"];

    for (const col of collectionsToTry) {
      const snap = await getDoc(doc(db, col, houseId));
      if (snap.exists()) {
        const d = snap.data();
        return {
          title: d.title || d.name || d.propertyTitle || "Untitled Property",
          location: d.location || d.address || "—",
          category: d.category || d.type || "—",
          imageUrl: d.imageUrl || (Array.isArray(d.images) ? d.images[0] : null) || null,
        };
      }
    }
  } catch (err) {
    console.warn("Property lookup failed for:", houseId, err);
  }

  return { title: "Untitled Property", location: "—", category: "—", imageUrl: null };
};

// Get basic renter info
const getRenterBasicInfo = async (renterId) => {
  if (!renterId) return { name: "Unknown Renter", email: "", phone: "" };

  try {
    const snap = await getDoc(doc(db, "users", renterId));
    if (snap.exists()) {
      const d = snap.data();
      return {
        name: d.fullName || d.displayName || d.name || "Unknown Renter",
        email: d.email || "",
        phone: d.phone || d.phoneNumber || "",
      };
    }
  } catch (err) {
    console.warn("Renter lookup failed for:", renterId, err);
  }

  return { name: "Unknown Renter", email: "", phone: "" };
};

// ===== Main fetch =====
export const fetchOwnerBookings = async (ownerId) => {
  const q = query(collection(db, "bookings"), where("ownerId", "==", ownerId));
  const snap = await getDocs(q);

  const list = await Promise.all(
    snap.docs.map(async (docSnap) => {
      const data = docSnap.data();

      const [property, renter] = await Promise.all([
        getPropertyInfo(data.houseId),
        getRenterBasicInfo(data.renterId),
      ]);

      return {
        id: docSnap.id,
        ...data,

        // Clean mapped fields for UI
        propertyTitle: property.title,
        location: property.location,
        category: property.category,
        imageUrl: property.imageUrl,
        renterName: renter.name,
        renterEmail: renter.email,
        renterPhone: renter.phone,

        // Formatted helpers
        formattedCreatedAt: formatDate(data.createdAt),
        totalAmountFormatted: formatMoney(data.totalAmount || data.price),
        monthlyPriceFormatted: formatMoney(data.monthlyPrice),
      };
    })
  );

  // Newest first
  list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  return list;
};

// Approve
export const approveBooking = async (booking) => {
  const bookingRef = doc(db, "bookings", booking.id);
  await updateDoc(bookingRef, {
    status: "Approved",
    ownerNote: "Booking approved by owner.",
    updatedAt: serverTimestamp(),
  });

  if (booking.renterId) {
    await addDoc(collection(db, "notifications"), {
      recipientId: booking.renterId,
      type: "BOOKING_APPROVED",
      title: "Booking Request Approved!",
      message: `Your booking request for "${booking.propertyTitle || "Property"}" has been approved.`,
      bookingId: booking.id,
      read: false,
      createdAt: serverTimestamp(),
    });
  }
};

// Reject
export const rejectBooking = async (bookingId, targetBooking, rejectReason) => {
  const bookingRef = doc(db, "bookings", bookingId);
  await updateDoc(bookingRef, {
    status: "Rejected",
    ownerNote: rejectReason || "Declined by property owner.",
    updatedAt: serverTimestamp(),
  });

  if (targetBooking?.renterId) {
    await addDoc(collection(db, "notifications"), {
      recipientId: targetBooking.renterId,
      type: "BOOKING_REJECTED",
      title: "Booking Request Declined",
      message: `Your booking for "${targetBooking.propertyTitle || "Property"}" was declined. Reason: ${rejectReason || "None provided"}`,
      bookingId,
      read: false,
      createdAt: serverTimestamp(),
    });
  }
};

// Full renter profile
export const fetchRenterProfile = async (renterId) => {
  if (!renterId) return null;
  const userRef = doc(db, "users", renterId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const { password, token, authProvider, ...safeUserData } = userSnap.data();
    return safeUserData;
  }
  return null;
};


// import axios from "axios"; import dotenv from "dotenv"; dotenv.config(); // ============================================================ // BAKONG CONFIGURATION // ============================================================ const BAKONG_API_URL = process.env.BAKONG_API_URL || "https://api-bakong.nbc.gov.kh"; const BAKONG_API_TOKEN = process.env.BAKONG_API_TOKEN; const BAKONG_ACCOUNT = process.env.BAKONG_ACCOUNT; // ============================================================ // GET BAKONG ACCOUNT // ============================================================ export function getBakongAccount() { if (!BAKONG_ACCOUNT) { throw new Error( "BAKONG_ACCOUNT is not configured in .env", ); } return BAKONG_ACCOUNT.trim(); } // ============================================================ // GET BAKONG API TOKEN // ============================================================ function getBakongToken() { if (!BAKONG_API_TOKEN) { throw new Error( "BAKONG_API_TOKEN is not configured in .env", ); } return BAKONG_API_TOKEN.trim(); } // ============================================================ // CHECK TRANSACTION BY MD5 // ============================================================ // // Bakong endpoint: // // POST // /v1/check_transaction_by_md5 // // The MD5 comes from the generated KHQR. // // IMPORTANT: // Token is used ONLY on the backend. // Never expose this token to React. // ============================================================ export async function checkTransactionByMd5(md5) { if (!md5) { throw new Error("MD5 is required"); } const token = getBakongToken(); const url = `${BAKONG_API_URL}/v1/check_transaction_by_md5`; try { const response = await axios.post( url, { md5: String(md5).trim(), }, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json", }, timeout: 15000, }, ); return response.data; } catch (error) { console.error( "Bakong API request failed:", { status: error.response?.status, data: error.response?.data, message: error.message, }, ); throw error; } }