import { db } from "./firebase";

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";

/* =========================================================
   DATE FORMATTER
   ========================================================= */

export const formatDate = (dateVal, fullFormat = false) => {
  if (!dateVal) return "N/A";

  let dateObj = null;

  if (typeof dateVal === "string") {
    dateObj = new Date(dateVal);
  } else if (dateVal?.toDate && typeof dateVal.toDate === "function") {
    dateObj = dateVal.toDate();
  } else if (typeof dateVal === "object" && dateVal.seconds !== undefined) {
    dateObj = new Date(dateVal.seconds * 1000);
  }

  if (!dateObj || Number.isNaN(dateObj.getTime())) {
    return "N/A";
  }

  if (fullFormat) {
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return dateObj.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* =========================================================
   PAYMENT ID GENERATOR
   ========================================================= */

const generatePaymentId = (index) => {
  return `PAY-${String(index + 1).padStart(4, "0")}`;
};

/* =========================================================
   FETCH OWNER PAYMENTS
   ========================================================= */

export const fetchOwnerPayments = async (ownerId) => {
  const q = query(collection(db, "payments"), where("ownerId", "==", ownerId));

  const snap = await getDocs(q);

  const paymentsList = await Promise.all(
    snap.docs.map(async (docSnap, index) => {
      const data = docSnap.data();

      let renterName = "Unknown Renter";

      let propertyTitle = "N/A";

      /* -----------------------------------------------------
         Fetch Renter Name
         ----------------------------------------------------- */

      if (data.renterId) {
        try {
          const userSnap = await getDoc(doc(db, "users", data.renterId));

          if (userSnap.exists()) {
            const userData = userSnap.data();

            renterName =
              userData.fullName ||
              userData.displayName ||
              userData.name ||
              renterName;
          }
        } catch (e) {
          console.error("Error fetching renter details:", e);
        }
      }

      /* -----------------------------------------------------
         Fetch Property Title
         ----------------------------------------------------- */

      const targetPropertyId = data.houseId || data.propertyId;

      if (targetPropertyId) {
        try {
          const propSnap = await getDoc(
            doc(db, "properties", targetPropertyId),
          );

          if (propSnap.exists()) {
            const propData = propSnap.data();

            propertyTitle = propData.title || propData.name || propertyTitle;
          }
        } catch (e) {
          console.error("Error fetching property details:", e);
        }
      }

      /* -----------------------------------------------------
         Main Booking Amount
         ----------------------------------------------------- */

      const primaryBookingAmount = Number(
        data.bookingAmount !== undefined
          ? data.bookingAmount
          : data.amount || 0,
      );

      /* -----------------------------------------------------
         Payment Identity
         ----------------------------------------------------- */

      const hasPaymentId = Boolean(data.paymentId);

      const paymentId = hasPaymentId
        ? String(data.paymentId)
        : generatePaymentId(index);

      /* -----------------------------------------------------
         Return Payment Object
         ----------------------------------------------------- */

      return {
        id: docSnap.id,

        // Keep Firebase paymentId if available.
        // Otherwise generate PAY-0001, PAY-0002...
        paymentId,

        generatedPaymentId: !hasPaymentId,

        bookingAmount: primaryBookingAmount,

        bookingCurrency: data.bookingCurrency || "USD",

        rawAmount: Number(data.amount || 0),

        rawCurrency: data.currency || "KHR",

        expectedAmount: Number(data.expectedAmount || 0),

        bookingId: data.bookingId || "N/A",

        houseId: targetPropertyId || "N/A",

        renterId: data.renterId || "N/A",

        renterName: data.renterName || renterName,

        propertyTitle: data.propertyTitle || propertyTitle,

        paymentMethod: data.paymentMethod || "Bakong",

        status: data.status || "Pending",

        createdAt: data.createdAt || data.paidAt,

        formattedDate: formatDate(data.createdAt || data.paidAt),

        fullDate: formatDate(data.createdAt || data.paidAt, true),

        /* ---------------------------------------------------
           Bakong Information
           --------------------------------------------------- */

        bakongAccount: data.bakongAccount || "N/A",

        bakongMd5: data.bakongMd5 || "",

        bakongTransactionHash: data.bakongTransactionHash || "",

        fromAccountId: data.fromAccountId || "N/A",

        toAccountId: data.toAccountId || "N/A",

        testPayment: Boolean(data.testPayment),
      };
    }),
  );

  /* =======================================================
     SORT NEWEST FIRST
     ======================================================= */

  paymentsList.sort((a, b) => {
    const getTimestamp = (value) => {
      if (!value) return 0;

      if (typeof value?.toDate === "function") {
        return value.toDate().getTime();
      }

      if (typeof value === "object" && value.seconds !== undefined) {
        return value.seconds * 1000;
      }

      const timestamp = new Date(value).getTime();

      return Number.isNaN(timestamp) ? 0 : timestamp;
    };

    return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
  });

  /* =======================================================
     IMPORTANT:
     Re-number generated IDs AFTER SORTING
     ======================================================= */

  let generatedCounter = 1;

  paymentsList.forEach((payment) => {
    if (payment.generatedPaymentId) {
      payment.paymentId = `PAY-${String(generatedCounter).padStart(4, "0")}`;

      generatedCounter++;
    }
  });

  return paymentsList;
};

/* =========================================================
   PAYMENT SUMMARY
   ========================================================= */

export const calculatePaymentSummary = (payments) => {
  return payments.reduce(
    (acc, item) => {
      const amt = Number(item.bookingAmount || 0);

      acc.totalRevenue += amt;

      const status = (item.status || "").toLowerCase();

      if (status === "paid") {
        acc.paid += amt;
      } else if (status === "pending") {
        acc.pending += amt;
      } else if (status === "failed") {
        acc.failed += amt;
      }

      return acc;
    },
    {
      totalRevenue: 0,
      paid: 0,
      pending: 0,
      failed: 0,
    },
  );
};
