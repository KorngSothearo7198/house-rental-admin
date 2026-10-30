
import { db } from "./firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
} from "firebase/firestore";

export const formatDate = (dateVal) => {
  if (!dateVal) return "N/A";
  if (typeof dateVal === "string") return dateVal;
  if (dateVal?.toDate && typeof dateVal.toDate === "function") {
    return dateVal.toDate().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  if (typeof dateVal === "object" && dateVal.seconds !== undefined) {
    return new Date(dateVal.seconds * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  return "N/A";
};

export const fetchOwnerRenters = async (ownerId) => {
  const q = query(collection(db, "bookings"), where("ownerId", "==", ownerId));
  const snap = await getDocs(q);

  const rentersList = [];

  for (const docSnap of snap.docs) {
    const data = docSnap.data();

    // 1. Resolve Renter Name (Check multiple field keys)
    let renterName = data.renterName || data.userName || data.clientName || data.name;
    const targetRenterId = data.renterId || data.userId || data.clientId;

    if ((!renterName || renterName === "Unknown Renter") && targetRenterId) {
      try {
        const uSnap = await getDoc(doc(db, "users", targetRenterId));
        if (uSnap.exists()) {
          const uData = uSnap.data();
          renterName = uData.fullName || uData.displayName || uData.name || uData.email;
        }
      } catch (e) {
        console.error("Error fetching user details:", e);
      }
    }

    // 2. Resolve Property Title (Check all possible field keys)
    let propertyTitle = data.propertyTitle || data.title || data.houseTitle || data.roomTitle;
    
    // Check key variations for property ID in booking doc
    const targetPropertyId = 
      data.propertyId || 
      data.roomId || 
      data.propId || 
      data.houseId || 
      data.listingId;

    if ((!propertyTitle || propertyTitle === "N/A") && targetPropertyId) {
      try {
        const pSnap = await getDoc(doc(db, "properties", targetPropertyId));
        if (pSnap.exists()) {
          const pData = pSnap.data();
          // Fetch property title or fallback to category + location
          propertyTitle = pData.title || pData.name || `${pData.category || "Property"} in ${pData.location || "Unknown"}`;
        }
      } catch (e) {
        console.error("Error fetching property details:", e);
      }
    }

    rentersList.push({
      bookingId: docSnap.id,
      renterId: targetRenterId || null,
      renterName: renterName || "Guest User",
      propertyTitle: propertyTitle || "Untitled Property",
      status: data.status || "Pending",
      paymentStatus: data.paymentStatus || "Pending",
      totalAmount: data.totalAmount || data.price || 0,
      createdAt: data.createdAt,
    });
  }

  return rentersList;
};

export const fetchRenterFullDetails = async (renterId, ownerId) => {
  let profile = null;
  let bookings = [];
  let payments = [];
  let messages = [];

  if (renterId) {
    try {
      const userSnap = await getDoc(doc(db, "users", renterId));
      if (userSnap.exists()) {
        const { password, token, ...safeData } = userSnap.data();
        profile = safeData;
      }
    } catch (e) {
      console.error("Error fetching renter profile:", e);
    }
  }

  try {
    const bQuery = query(
      collection(db, "bookings"),
      where("ownerId", "==", ownerId),
      where("renterId", "==", renterId)
    );
    const bSnap = await getDocs(bQuery);
    bookings = bSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("Error fetching renter bookings:", e);
  }

  try {
    const pQuery = query(
      collection(db, "payments"),
      where("renterId", "==", renterId),
      where("ownerId", "==", ownerId)
    );
    const pSnap = await getDocs(pQuery);
    // payments = pSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    payments = pSnap.docs.map((d) => {
  const data = d.data();
  return {
    id: d.id,
    ...data,
    // Prefer bookingAmount (USD) for display
    displayAmount: data.bookingAmount ?? data.amount ?? 0,
    displayCurrency: data.bookingCurrency || data.currency || "USD",
  };
});
  } catch (e) {
    console.error("Error fetching renter payments:", e);
  }

  try {
    const convQuery = query(
      collection(db, "conversations"),
      where("renterId", "==", renterId),
      where("ownerId", "==", ownerId)
    );
    const convSnap = await getDocs(convQuery);

    if (!convSnap.empty) {
      for (const convDoc of convSnap.docs) {
        const msgRef = collection(db, "conversations", convDoc.id, "messages");
        const msgQuery = query(msgRef, orderBy("createdAt", "asc"));
        const msgSnap = await getDocs(msgQuery);

        const convMessages = msgSnap.docs.map((mDoc) => ({
          id: mDoc.id,
          conversationId: convDoc.id,
          ...mDoc.data(),
        }));
        messages.push(...convMessages);
      }
    }
  } catch (e) {
    console.error("Error fetching conversation messages:", e);
  }

  return { profile, bookings, payments, messages };
};