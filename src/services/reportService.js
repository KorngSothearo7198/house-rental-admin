// // import { db } from "./firebase";

// // import {
// //   collection,
// //   query,
// //   where,
// //   getDocs,
// //   doc,
// //   getDoc,
// // } from "firebase/firestore";

// // /*
// //  * Convert Firestore Timestamp / Date / string
// //  */
// // const convertToDate = (value) => {
// //   if (!value) return null;

// //   if (value?.toDate && typeof value.toDate === "function") {
// //     return value.toDate();
// //   }

// //   if (value?.seconds !== undefined) {
// //     return new Date(value.seconds * 1000);
// //   }

// //   const date = new Date(value);

// //   return Number.isNaN(date.getTime()) ? null : date;
// // };

// // /*
// //  * Fetch Owner Reports
// //  */
// // export const fetchOwnerReportsData = async (ownerId) => {
// //   try {
// //     /*
// //      * 1. Fetch all bookings for this owner
// //      */
// //     const bookingsQ = query(
// //       collection(db, "bookings"),
// //       where("ownerId", "==", ownerId),
// //     );

// //     const bookingsSnap = await getDocs(bookingsQ);

// //     /*
// //      * Fetch renter/property information
// //      */
// //     const bookings = await Promise.all(
// //       bookingsSnap.docs.map(async (bookingDoc) => {
// //         const data = bookingDoc.data();

// //         let renterName = data.renterName || "Guest Renter";
// //         let propertyTitle = data.propertyTitle || "Property";

// //         /*
// //          * Renter
// //          */
// //         if (data.renterId && !data.renterName) {
// //           try {
// //             const renterSnap = await getDoc(doc(db, "users", data.renterId));

// //             if (renterSnap.exists()) {
// //               const renterData = renterSnap.data();

// //               renterName =
// //                 renterData.fullName ||
// //                 renterData.name ||
// //                 renterData.displayName ||
// //                 "Guest Renter";
// //             }
// //           } catch (error) {
// //             console.warn("Could not load renter:", data.renterId, error);
// //           }
// //         }

// //         /*
// //          * Property
// //          */
// //         const propertyId = data.houseId || data.propertyId;

// //         if (propertyId && !data.propertyTitle) {
// //           try {
// //             const propertySnap = await getDoc(
// //               doc(db, "properties", propertyId),
// //             );

// //             if (propertySnap.exists()) {
// //               const propertyData = propertySnap.data();

// //               propertyTitle =
// //                 propertyData.title || propertyData.name || "Property";
// //             }
// //           } catch (error) {
// //             console.warn("Could not load property:", propertyId, error);
// //           }
// //         }

// //         /*
// //          * Amount
// //          *
// //          * Main report currency = USD
// //          */
// //         const totalAmount = Number(
// //           data.totalAmount ||
// //             data.bookingAmount ||
// //             data.price ||
// //             data.amount ||
// //             0,
// //         );

// //         /*
// //          * Booking status
// //          */
// //         const status = data.status || "Pending";

// //         /*
// //          * Payment status
// //          *
// //          * Supports both paymentStatus and status
// //          */
// //         const paymentStatus =
// //           data.paymentStatus ||
// //           data.payment_status ||
// //           data.paymentState ||
// //           "Pending";

// //         /*
// //          * Date
// //          */
// //         const reportDate =
// //           data.createdAt ||
// //           data.updatedAt ||
// //           data.paidAt ||
// //           data.bookingDate ||
// //           data.startDate ||
// //           null;

// //         return {
// //           id: bookingDoc.id,

// //           /*
// //            * Original Firebase data
// //            */
// //           ...data,

// //           /*
// //            * Normalized report fields
// //            */
// //           renterName,
// //           propertyTitle,

// //           totalAmount,

// //           status,
// //           paymentStatus,

// //           createdAt: reportDate,

// //           reportDate: convertToDate(reportDate),

// //           /*
// //            * Useful IDs
// //            */
// //           renterId: data.renterId || "N/A",

// //           ownerId: data.ownerId || ownerId,

// //           propertyId: propertyId || "N/A",
// //         };
// //       }),
// //     );

// //     /*
// //      * 2. Fetch all properties for this owner
// //      */
// //     const propertiesQ = query(
// //       collection(db, "properties"),
// //       where("ownerId", "==", ownerId),
// //     );

// //     const propertiesSnap = await getDocs(propertiesQ);

// //     const properties = propertiesSnap.docs.map((propertyDoc) => ({
// //       id: propertyDoc.id,
// //       ...propertyDoc.data(),
// //     }));

// //     /*
// //      * 3. Aggregate overall metrics
// //      */
// //     let totalRevenue = 0;
// //     let totalPaidRevenue = 0;
// //     let pendingPayments = 0;
// //     let failedPayments = 0;

// //     const monthlyRevenueMap = {};
// //     const categoryRevenueMap = {};

// //     const statusCounts = {
// //       approved: 0,
// //       pending: 0,
// //       cancelled: 0,
// //       rejected: 0,
// //       completed: 0,
// //     };

// //     bookings.forEach((booking) => {
// //       const amount = Number(booking.totalAmount || 0);

// //       const bookingStatus = String(booking.status || "pending").toLowerCase();

// //       const paymentStatus = String(
// //         booking.paymentStatus || "pending",
// //       ).toLowerCase();

// //       /*
// //        * Total Revenue
// //        */
// //       totalRevenue += amount;

// //       /*
// //        * Payment Revenue
// //        */
// //       if (
// //         paymentStatus === "paid" ||
// //         paymentStatus === "completed" ||
// //         paymentStatus === "success"
// //       ) {
// //         totalPaidRevenue += amount;
// //       } else if (paymentStatus === "failed" || paymentStatus === "rejected") {
// //         failedPayments += amount;
// //       } else {
// //         pendingPayments += amount;
// //       }

// //       /*
// //        * Booking Status
// //        */
// //       if (statusCounts[bookingStatus] !== undefined) {
// //         statusCounts[bookingStatus] += 1;
// //       } else {
// //         statusCounts.pending += 1;
// //       }

// //       /*
// //        * Date
// //        */
// //       const dateObj = booking.reportDate || new Date();

// //       /*
// //        * Monthly Revenue
// //        */
// //       const monthKey = dateObj.toLocaleString("en-US", {
// //         month: "short",
// //         year: "numeric",
// //       });

// //       monthlyRevenueMap[monthKey] = (monthlyRevenueMap[monthKey] || 0) + amount;

// //       /*
// //        * Category Revenue
// //        */
// //       const category =
// //         booking.category || booking.propertyCategory || "Single Room";

// //       categoryRevenueMap[category] =
// //         (categoryRevenueMap[category] || 0) + amount;
// //     });

// //     /*
// //      * 4. Property Occupancy
// //      */
// //     const totalProperties = properties.length;

// //     const occupiedProperties = properties.filter((property) => {
// //       const status = String(property.status || "").toLowerCase();

// //       return status === "rented" || status === "occupied";
// //     }).length;

// //     const occupancyRate =
// //       totalProperties > 0
// //         ? Math.round((occupiedProperties / totalProperties) * 100)
// //         : 0;

// //     /*
// //      * 5. Sort newest bookings first
// //      */
// //     bookings.sort((a, b) => {
// //       const dateA = a.reportDate?.getTime?.() || 0;

// //       const dateB = b.reportDate?.getTime?.() || 0;

// //       return dateB - dateA;
// //     });

// //     /*
// //      * 6. Return report data
// //      */
// //     return {
// //       summary: {
// //         totalRevenue,
// //         totalPaidRevenue,
// //         pendingPayments,
// //         failedPayments,

// //         totalBookings: bookings.length,

// //         totalProperties,

// //         occupiedProperties,

// //         occupancyRate,
// //       },

// //       statusCounts,

// //       monthlyRevenue: Object.entries(monthlyRevenueMap).map(
// //         ([month, amount]) => ({
// //           month,
// //           amount,
// //         }),
// //       ),

// //       categoryRevenue: Object.entries(categoryRevenueMap)
// //         .map(([category, amount]) => ({
// //           category,
// //           amount,
// //         }))
// //         .sort((a, b) => b.amount - a.amount),

// //       recentBookings: bookings,
// //     };
// //   } catch (error) {
// //     console.error("Error generating owner reports:", error);

// //     throw error;
// //   }
// // };

// import { db } from "./firebase";

// import {
//   collection,
//   query,
//   where,
//   getDocs,
//   doc,
//   getDoc,
// } from "firebase/firestore";

// // =============================================================================
// // Convert Firestore Timestamp / Date / String
// // =============================================================================

// const convertToDate = (value) => {
//   if (!value) return null;

//   if (value?.toDate && typeof value.toDate === "function") {
//     return value.toDate();
//   }

//   if (value?.seconds !== undefined) {
//     return new Date(value.seconds * 1000);
//   }

//   const date = new Date(value);

//   return Number.isNaN(date.getTime()) ? null : date;
// };

// // =============================================================================
// // Normalize Payment Status
// // =============================================================================

// const normalizePaymentStatus = (data) => {
//   return (
//     data.paymentStatus || data.payment_status || data.paymentState || "Pending"
//   );
// };

// // =============================================================================
// // Get Report Amount
// // =============================================================================
// //
// // RentEase payment structure:
// // bookingAmount = booking amount in USD
// //
// // We prioritize bookingAmount before generic fields.
// //

// const getReportAmount = (data) => {
//   const value =
//     data.bookingAmount ?? data.totalAmount ?? data.price ?? data.amount ?? 0;

//   const amount = Number(value);

//   return Number.isFinite(amount) ? amount : 0;
// };

// // =============================================================================
// // Get Report Date
// // =============================================================================
// //
// // For financial reporting, paidAt should be preferred because
// // the financial transaction happened when the payment was made.
// //

// const getReportDate = (data) => {
//   return (
//     data.paidAt ||
//     data.createdAt ||
//     data.updatedAt ||
//     data.bookingDate ||
//     data.startDate ||
//     null
//   );
// };

// // =============================================================================
// // Check Paid
// // =============================================================================

// const isPaidStatus = (status) => {
//   const normalized = String(status || "").toLowerCase();

//   return ["paid", "completed", "success", "successful"].includes(normalized);
// };

// // =============================================================================
// // Check Failed
// // =============================================================================

// const isFailedStatus = (status) => {
//   const normalized = String(status || "").toLowerCase();

//   return ["failed", "rejected", "cancelled", "canceled"].includes(normalized);
// };

// // =============================================================================
// // Fetch Owner Reports
// // =============================================================================

// export const fetchOwnerReportsData = async (ownerId) => {
//   try {
//     // =======================================================================
//     // 1. Fetch Owner Bookings
//     // =======================================================================

//     const bookingsQ = query(
//       collection(db, "bookings"),
//       where("ownerId", "==", ownerId),
//     );

//     const bookingsSnap = await getDocs(bookingsQ);

//     // =======================================================================
//     // 2. Normalize Booking Data
//     // =======================================================================

//     const bookings = await Promise.all(
//       bookingsSnap.docs.map(async (bookingDoc) => {
//         const data = bookingDoc.data();

//         let renterName = data.renterName || "Guest Renter";

//         let propertyTitle = data.propertyTitle || "Property";

//         // ---------------------------------------------------------------
//         // Renter
//         // ---------------------------------------------------------------

//         if (data.renterId && !data.renterName) {
//           try {
//             const renterSnap = await getDoc(doc(db, "users", data.renterId));

//             if (renterSnap.exists()) {
//               const renterData = renterSnap.data();

//               renterName =
//                 renterData.fullName ||
//                 renterData.name ||
//                 renterData.displayName ||
//                 "Guest Renter";
//             }
//           } catch (error) {
//             console.warn("Could not load renter:", data.renterId, error);
//           }
//         }

//         // ---------------------------------------------------------------
//         // Property
//         // ---------------------------------------------------------------

//         const propertyId = data.houseId || data.propertyId;

//         if (propertyId && !data.propertyTitle) {
//           try {
//             const propertySnap = await getDoc(
//               doc(db, "properties", propertyId),
//             );

//             if (propertySnap.exists()) {
//               const propertyData = propertySnap.data();

//               propertyTitle =
//                 propertyData.title || propertyData.name || "Property";
//             }
//           } catch (error) {
//             console.warn("Could not load property:", propertyId, error);
//           }
//         }

//         // ---------------------------------------------------------------
//         // Amount
//         // ---------------------------------------------------------------

//         const totalAmount = getReportAmount(data);

//         // ---------------------------------------------------------------
//         // Payment Status
//         // ---------------------------------------------------------------

//         const paymentStatus = normalizePaymentStatus(data);

//         // ---------------------------------------------------------------
//         // Booking Status
//         // ---------------------------------------------------------------

//         const status = data.status || "Pending";

//         // ---------------------------------------------------------------
//         // Report Date
//         // ---------------------------------------------------------------

//         const reportDateValue = getReportDate(data);

//         const reportDate = convertToDate(reportDateValue);

//         // ---------------------------------------------------------------
//         // Category
//         // ---------------------------------------------------------------

//         const category = data.category || data.propertyCategory || "Other";

//         // ---------------------------------------------------------------
//         // Return Normalized Record
//         // ---------------------------------------------------------------

//         return {
//           id: bookingDoc.id,

//           // Original Firebase data
//           ...data,

//           // Normalized values
//           renterName,

//           propertyTitle,

//           totalAmount,

//           bookingAmount: Number(data.bookingAmount || 0),

//           amount: totalAmount,

//           status,

//           paymentStatus,

//           paymentMethod: data.paymentMethod || "N/A",

//           category,

//           reportDate,

//           paidAt: data.paidAt || null,

//           // IDs
//           renterId: data.renterId || "N/A",

//           ownerId: data.ownerId || ownerId,

//           propertyId: propertyId || "N/A",
//         };
//       }),
//     );

//     // =======================================================================
//     // 3. Fetch Owner Properties
//     // =======================================================================

//     const propertiesQ = query(
//       collection(db, "properties"),
//       where("ownerId", "==", ownerId),
//     );

//     const propertiesSnap = await getDocs(propertiesQ);

//     const properties = propertiesSnap.docs.map((propertyDoc) => ({
//       id: propertyDoc.id,
//       ...propertyDoc.data(),
//     }));

//     // =======================================================================
//     // 4. Overall Metrics
//     // =======================================================================

//     let totalRevenue = 0;

//     let totalPaidRevenue = 0;

//     let pendingPayments = 0;

//     let failedPayments = 0;

//     let paidTransactions = 0;

//     let pendingTransactions = 0;

//     let failedTransactions = 0;

//     const monthlyRevenueMap = {};

//     const categoryRevenueMap = {};

//     const statusCounts = {
//       approved: 0,
//       pending: 0,
//       cancelled: 0,
//       rejected: 0,
//       completed: 0,
//     };

//     bookings.forEach((booking) => {
//       const amount = Number(booking.totalAmount || 0);

//       const bookingStatus = String(booking.status || "pending").toLowerCase();

//       const paymentStatus = String(
//         booking.paymentStatus || "pending",
//       ).toLowerCase();

//       // ---------------------------------------------------------------
//       // Total Revenue
//       // ---------------------------------------------------------------

//       totalRevenue += amount;

//       // ---------------------------------------------------------------
//       // Payment Revenue
//       // ---------------------------------------------------------------

//       if (isPaidStatus(paymentStatus)) {
//         totalPaidRevenue += amount;

//         paidTransactions += 1;
//       } else if (isFailedStatus(paymentStatus)) {
//         failedPayments += amount;

//         failedTransactions += 1;
//       } else {
//         pendingPayments += amount;

//         pendingTransactions += 1;
//       }

//       // ---------------------------------------------------------------
//       // Booking Status
//       // ---------------------------------------------------------------

//       if (statusCounts[bookingStatus] !== undefined) {
//         statusCounts[bookingStatus] += 1;
//       } else {
//         statusCounts.pending += 1;
//       }

//       // ---------------------------------------------------------------
//       // Monthly Revenue
//       // ---------------------------------------------------------------

//       const dateObj = booking.reportDate;

//       if (dateObj) {
//         const monthKey = dateObj.toLocaleString("en-US", {
//           month: "short",
//           year: "numeric",
//         });

//         monthlyRevenueMap[monthKey] =
//           (monthlyRevenueMap[monthKey] || 0) + amount;
//       }

//       // ---------------------------------------------------------------
//       // Category Revenue
//       // ---------------------------------------------------------------

//       const category = booking.category || "Other";

//       categoryRevenueMap[category] =
//         (categoryRevenueMap[category] || 0) + amount;
//     });

//     // =======================================================================
//     // 5. Property Occupancy
//     // =======================================================================

//     const totalProperties = properties.length;

//     const occupiedProperties = properties.filter((property) => {
//       const propertyStatus = String(property.status || "").toLowerCase();

//       return propertyStatus === "rented" || propertyStatus === "occupied";
//     }).length;

//     const occupancyRate =
//       totalProperties > 0
//         ? Math.round((occupiedProperties / totalProperties) * 100)
//         : 0;

//     // =======================================================================
//     // 6. Sort Newest Transactions
//     // =======================================================================

//     bookings.sort((a, b) => {
//       const dateA = a.reportDate?.getTime?.() || 0;

//       const dateB = b.reportDate?.getTime?.() || 0;

//       return dateB - dateA;
//     });

//     // =======================================================================
//     // 7. Monthly Revenue
//     // =======================================================================

//     const monthlyRevenue = Object.entries(monthlyRevenueMap).map(
//       ([month, amount]) => ({
//         month,
//         amount,
//       }),
//     );

//     // =======================================================================
//     // 8. Category Revenue
//     // =======================================================================

//     const categoryRevenue = Object.entries(categoryRevenueMap)
//       .map(([category, amount]) => ({
//         category,
//         amount,
//       }))
//       .sort((a, b) => b.amount - a.amount);

//     // =======================================================================
//     // 9. Return Report
//     // =======================================================================

//     return {
//       summary: {
//         totalRevenue,

//         totalPaidRevenue,

//         pendingPayments,

//         failedPayments,

//         paidTransactions,

//         pendingTransactions,

//         failedTransactions,

//         totalBookings: bookings.length,

//         totalProperties,

//         occupiedProperties,

//         occupancyRate,
//       },

//       statusCounts,

//       monthlyRevenue,

//       categoryRevenue,

//       recentBookings: bookings,

//       properties,
//     };
//   } catch (error) {
//     console.error("Error generating owner reports:", error);

//     throw error;
//   }
// };



import { db } from "./firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";

function convertToDate(value) {
  if (value == null || value === "") return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value?.toDate === "function") {
    try {
      return convertToDate(value.toDate());
    } catch {
      return null;
    }
  }

  if (typeof value === "object" && typeof value.seconds === "number") {
    const date = new Date(value.seconds * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getReportAmount(data) {
  const value =
    data.bookingAmount ??
    data.totalAmount ??
    data.price ??
    data.amount ??
    0;

  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function getReportDate(data) {
  // Prefer the actual payment date for financial reports.
  return (
    data.paidAt ??
    data.createdAt ??
    data.updatedAt ??
    data.bookingDate ??
    data.startDate ??
    null
  );
}

function normalizePaymentStatus(data) {
  return String(
    data.paymentStatus ??
    data.payment_status ??
    data.paymentState ??
    "pending"
  ).trim().toLowerCase();
}

function isPaidStatus(status) {
  return ["paid", "completed", "success", "successful"].includes(
    String(status || "").toLowerCase()
  );
}

function isFailedStatus(status) {
  return ["failed", "rejected", "cancelled", "canceled"].includes(
    String(status || "").toLowerCase()
  );
}

export const fetchOwnerReportsData = async (ownerId) => {
  if (!ownerId) {
    throw new Error("Owner ID is required to load reports.");
  }

  try {
    // 1. Fetch this owner's bookings.
    const bookingsQuery = query(
      collection(db, "bookings"),
      where("ownerId", "==", ownerId)
    );

    const bookingsSnapshot = await getDocs(bookingsQuery);

    // An empty query result is valid. Continue with empty arrays.
    const bookings = await Promise.all(
      bookingsSnapshot.docs.map(async (bookingDoc) => {
        const data = bookingDoc.data();

        let renterName =
          data.renterName ||
          data.fullName ||
          "Guest Renter";

        let propertyTitle =
          data.propertyTitle ||
          data.houseTitle ||
          data.propertyName ||
          "Property";

        const propertyId = data.houseId || data.propertyId || null;

        // Load renter information when it is missing.
        if (data.renterId && !data.renterName && !data.fullName) {
          try {
            const renterSnapshot = await getDoc(
              doc(db, "users", data.renterId)
            );

            if (renterSnapshot.exists()) {
              const renter = renterSnapshot.data();

              renterName =
                renter.fullName ||
                renter.name ||
                renter.displayName ||
                "Guest Renter";
            }
          } catch (error) {
            console.warn("Could not load renter:", error);
          }
        }

        // Support both properties and houses collections.
        if (
          propertyId &&
          !data.propertyTitle &&
          !data.houseTitle &&
          !data.propertyName
        ) {
          const collectionsToCheck = ["properties", "houses"];

          for (const collectionName of collectionsToCheck) {
            try {
              const propertySnapshot = await getDoc(
                doc(db, collectionName, propertyId)
              );

              if (propertySnapshot.exists()) {
                const property = propertySnapshot.data();

                propertyTitle =
                  property.title ||
                  property.name ||
                  property.propertyTitle ||
                  "Property";

                break;
              }
            } catch (error) {
              console.warn(
                `Could not load ${collectionName} record:`,
                error
              );
            }
          }
        }

        const reportDate = convertToDate(getReportDate(data));

        return {
          ...data,

          id: bookingDoc.id,
          ownerId: data.ownerId || ownerId,
          renterId: data.renterId || null,
          propertyId,

          renterName,
          propertyTitle,

          totalAmount: getReportAmount(data),
          amount: getReportAmount(data),

          status: String(data.status || "pending").toLowerCase(),
          paymentStatus: normalizePaymentStatus(data),
          paymentMethod: data.paymentMethod || "N/A",

          category:
            data.category ||
            data.propertyCategory ||
            "Other",

          // Both values use the same normalized transaction date.
          reportDate,
          reportDateValue: getReportDate(data),
        };
      })
    );

    // 2. Fetch the owner's properties.
    const propertiesQuery = query(
      collection(db, "properties"),
      where("ownerId", "==", ownerId)
    );

    const propertiesSnapshot = await getDocs(propertiesQuery);

    const properties = propertiesSnapshot.docs.map((propertyDoc) => ({
      id: propertyDoc.id,
      ...propertyDoc.data(),
    }));

    // 3. Calculate overall statistics.
    // These are lifetime totals. The component recalculates
    // date-filtered statistics from recentBookings.
    let totalRevenue = 0;
    let totalPaidRevenue = 0;
    let pendingPayments = 0;
    let failedPayments = 0;

    let paidTransactions = 0;
    let pendingTransactions = 0;
    let failedTransactions = 0;

    const monthlyRevenueMap = {};
    const categoryRevenueMap = {};

    const statusCounts = {
      approved: 0,
      pending: 0,
      cancelled: 0,
      rejected: 0,
      completed: 0,
    };

    bookings.forEach((booking) => {
      const amount = booking.totalAmount;
      const paymentStatus = normalizePaymentStatus(booking);
      const bookingStatus = String(
        booking.status || "pending"
      ).toLowerCase();

      totalRevenue += amount;

      if (isPaidStatus(paymentStatus)) {
        totalPaidRevenue += amount;
        paidTransactions++;
      } else if (isFailedStatus(paymentStatus)) {
        failedPayments += amount;
        failedTransactions++;
      } else {
        pendingPayments += amount;
        pendingTransactions++;
      }

      if (Object.prototype.hasOwnProperty.call(statusCounts, bookingStatus)) {
        statusCounts[bookingStatus]++;
      } else {
        statusCounts.pending++;
      }

      const date = booking.reportDate;

      if (date) {
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;

        monthlyRevenueMap[monthKey] =
          (monthlyRevenueMap[monthKey] || 0) + amount;
      }

      const category = booking.category || "Other";

      categoryRevenueMap[category] =
        (categoryRevenueMap[category] || 0) + amount;
    });

    // 4. Calculate property occupancy.
    const totalProperties = properties.length;

    const occupiedProperties = properties.filter((property) => {
      const status = String(property.status || "").toLowerCase();

      return status === "rented" || status === "occupied";
    }).length;

    const occupancyRate = totalProperties > 0
      ? Math.round((occupiedProperties / totalProperties) * 100)
      : 0;

    // 5. Sort by the actual transaction date.
    bookings.sort((a, b) => {
      const dateA = a.reportDate?.getTime() ?? 0;
      const dateB = b.reportDate?.getTime() ?? 0;

      return dateB - dateA;
    });

    // 6. Build chart data.
    const monthlyRevenue = Object.entries(monthlyRevenueMap)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const categoryRevenue = Object.entries(categoryRevenueMap)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    // 7. Return a consistent structure, including when there is no data.
    return {
      summary: {
        totalRevenue,
        totalPaidRevenue,
        pendingPayments,
        failedPayments,
        paidTransactions,
        pendingTransactions,
        failedTransactions,
        totalBookings: bookings.length,
        totalProperties,
        occupiedProperties,
        occupancyRate,
      },

      statusCounts,
      monthlyRevenue,
      categoryRevenue,
      recentBookings: bookings,
      properties,
    };
  } catch (error) {
    console.error("Error generating owner reports:", error);
    throw error;
  }
};
