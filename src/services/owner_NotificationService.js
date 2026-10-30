
import { db } from "./firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  serverTimestamp,
  writeBatch,
  limit,
} from "firebase/firestore";

// Format notification date
export const formatNotificationDate = (dateVal) => {
  if (!dateVal) return "Just now";

  let dateObj = null;

  if (typeof dateVal === "string") {
    dateObj = new Date(dateVal);
  } else if (typeof dateVal?.toDate === "function") {
    dateObj = dateVal.toDate();
  } else if (typeof dateVal === "object" && dateVal.seconds !== undefined) {
    dateObj = new Date(dateVal.seconds * 1000);
  }

  if (!dateObj || Number.isNaN(dateObj.getTime())) return "Just now";

  return dateObj.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateOnly = (value) => {
  if (!value) return "—";

  let date;

  if (typeof value?.toDate === "function") {
    date = value.toDate();
  } else if (value?.seconds !== undefined) {
    date = new Date(value.seconds * 1000);
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Normalize notification type
const normalizeType = (type = "") => {
  const t = type.toLowerCase();

  if (
    t === "rental_payment" ||
    t === "payment" ||
    t === "payment_received"
  ) {
    return "PAYMENT_RECEIVED";
  }

  if (
    t === "new_booking" ||
    t === "booking" ||
    t === "booking_request"
  ) {
    return "NEW_BOOKING";
  }

  if (t === "booking_cancelled" || t === "cancelled") {
    return "BOOKING_CANCELLED";
  }

  if (t === "new_message" || t === "message") {
    return "NEW_MESSAGE";
  }

  if (t === "property_status_change") {
    return "PROPERTY_STATUS_CHANGE";
  }

  return type ? type.toUpperCase() : "SYSTEM";
};

const getTime = (value) => {
  if (!value) return 0;
  if (typeof value?.toDate === "function") {
    return value.toDate().getTime();
  }
  if (value.seconds !== undefined) return value.seconds * 1000;
  if (typeof value === "string") return new Date(value).getTime();
  return 0;
};

// Read a document safely
const readDocument = async (collectionName, documentId) => {
  if (!documentId) return null;

  try {
    const snapshot = await getDoc(doc(db, collectionName, documentId));

    return snapshot.exists()
      ? { id: snapshot.id, ...snapshot.data() }
      : null;
  } catch (error) {
    console.error(`Unable to read ${collectionName} document:`, error);
    return null;
  }
};

// Find a document by one of its fields
const findDocumentByField = async (
  collectionName,
  fieldName,
  fieldValue,
) => {
  if (!fieldValue) return null;

  try {
    const q = query(
      collection(db, collectionName),
      where(fieldName, "==", fieldValue),
      limit(1),
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const result = snapshot.docs[0];

    return { id: result.id, ...result.data() };
  } catch (error) {
    console.error(`Unable to find ${collectionName} document:`, error);
    return null;
  }
};

// Load readable details for a notification.
// The dialog displays names and useful details, not document IDs.
export const getOwnerNotificationDetails = async (notification) => {
  const bookingId = notification?.bookingId || null;
  const paymentId = notification?.paymentId || null;
  const houseId = notification?.houseId || null;

  let booking = await readDocument("bookings", bookingId);

  // Fallback: locate the booking using its paymentId.
  if (!booking && paymentId) {
    booking = await findDocumentByField(
      "bookings",
      "paymentId",
      paymentId,
    );
  }

  const actualHouseId = houseId || booking?.houseId || null;

  const property = await readDocument("properties", actualHouseId);

  const renterId = booking?.renterId || null;

  const renter = await readDocument("users", renterId);

  // Payment documents may use their paymentId as the document ID,
  // or store it as a field inside the document.
  let payment = await readDocument("payments", paymentId);

  if (!payment && paymentId) {
    payment = await findDocumentByField(
      "payments",
      "paymentId",
      paymentId,
    );
  }

  return {
    propertyName: property?.title || property?.name || "Property details unavailable",

    propertyLocation: property?.location || "",

    renterName:
      renter?.fullName ||
      renter?.displayName ||
      renter?.name ||
      renter?.username ||
      "Renter details unavailable",

    bookingStatus: booking?.status || "—",

    startDate: formatDateOnly(booking?.startDate),
    endDate: formatDateOnly(booking?.endDate),

    paymentMethod:
      payment?.paymentMethod || booking?.paymentMethod || "—",

    paymentStatus:
      payment?.status ||
      booking?.paymentStatus ||
      booking?.status ||
      "—",

    paidAmount:
      payment?.amount ??
      booking?.paidAmount ??
      null,

    paidCurrency:
      payment?.currency ||
      booking?.paidCurrency ||
      null,

    bookingAmount:
      booking?.bookingAmount ??
      booking?.totalAmount ??
      null,

    bookingCurrency:
      booking?.bookingCurrency ||
      booking?.currency ||
      null,

    propertyStatus: property?.status || "",
  };
};

// Real-time notification subscription
export const subscribeOwnerNotifications = (ownerId, callback) => {
  if (!ownerId) return () => {};

  const q = query(
    collection(db, "ownerNotifications"),
    where("userId", "==", ownerId),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();

        return {
          id: docSnap.id,
          ...data,
          type: normalizeType(data.type),
          title: data.title || "Notification",
          message: data.body || data.message || "",
          isRead: data.isRead === true,
          formattedDate: formatNotificationDate(data.createdAt),
          rawCreatedAt: data.createdAt,
          bookingId: data.bookingId || null,
          paymentId: data.paymentId || data.relatedId || null,
          houseId: data.houseId || null,
          amount: data.amount ?? null,
          currency: data.currency || null,
          targetRoute: data.targetRoute || "",
        };
      });

      list.sort(
        (a, b) => getTime(b.rawCreatedAt) - getTime(a.rawCreatedAt),
      );

      callback(list);
    },
    (error) => {
      console.error("Error fetching notifications:", error);
    },
  );
};

// Mark one notification as read
export const markNotificationAsRead = async (notificationId) => {
  if (!notificationId) return;

  try {
    await updateDoc(doc(db, "ownerNotifications", notificationId), {
      isRead: true,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (notifications = []) => {
  const unread = notifications.filter((notification) => !notification.isRead);

  if (unread.length === 0) return;

  try {
    const batch = writeBatch(db);

    unread.forEach((notification) => {
      batch.update(doc(db, "ownerNotifications", notification.id), {
        isRead: true,
      });
    });

    await batch.commit();
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
  }
};

// Send notification
export const sendNotification = async ({
  userId,
  type,
  title,
  message,
  bookingId = null,
  paymentId = null,
  houseId = null,
  amount = null,
  currency = null,
  targetRoute = "",
}) => {
  try {
    await addDoc(collection(db, "ownerNotifications"), {
      userId,
      type,
      title,
      body: message,
      message,
      bookingId,
      paymentId,
      houseId,
      amount,
      currency,
      relatedId: paymentId || bookingId || null,
      relatedType: paymentId ? "payment" : bookingId ? "booking" : null,
      role: "owner",
      targetRoute,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};
