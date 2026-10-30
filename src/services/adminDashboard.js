import { db } from "./firebase";

import {
  collection,
  getDocs,
} from "firebase/firestore";

/* =========================================================
   DATE PARSER
========================================================= */

const parseFirestoreDate = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value?.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
};

/* =========================================================
   FETCH DASHBOARD DATA
========================================================= */

export const fetchDashboardRawData = async () => {
  try {
    const [
      usersSnap,
      propertiesSnap,
      bookingsSnap,
      subscriptionsSnap,
    ] = await Promise.all([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "properties")),
      getDocs(collection(db, "bookings")),
      getDocs(collection(db, "subscriptions")),
    ]);

    /* =====================================================
       USERS
    ===================================================== */

    const users = usersSnap.docs
      .map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          ...data,

          dateObj: parseFirestoreDate(
            data.createdAt
          ),
        };
      })
      .filter(
        (user) =>
          (user.role || "").toLowerCase() !== "admin"
      );

    /* =====================================================
       PROPERTIES
    ===================================================== */

    const properties = propertiesSnap.docs.map(
      (doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          ...data,

          dateObj: parseFirestoreDate(
            data.createdAt ||
              data.listedDate ||
              data.lastUpdated
          ),
        };
      }
    );

    /* =====================================================
       BOOKINGS
    ===================================================== */

    const bookings = bookingsSnap.docs.map(
      (doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          ...data,

          dateObj: parseFirestoreDate(
            data.createdAt
          ),

          startObj: parseFirestoreDate(
            data.startDate
          ),

          endObj: parseFirestoreDate(
            data.endDate
          ),

          updatedObj: parseFirestoreDate(
            data.updatedAt
          ),

          paidObj: parseFirestoreDate(
            data.paidAt
          ),
        };
      }
    );

    /* =====================================================
       SUBSCRIPTIONS
    ===================================================== */

    const subscriptions =
      subscriptionsSnap.docs.map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          ...data,

          dateObj: parseFirestoreDate(
            data.createdAt
          ),

          startObj: parseFirestoreDate(
            data.startDate
          ),

          endObj: parseFirestoreDate(
            data.endDate
          ),

          approvedObj: parseFirestoreDate(
            data.approvedAt
          ),

          updatedObj: parseFirestoreDate(
            data.updatedAt
          ),
        };
      });

    /* =====================================================
       DEBUG
    ===================================================== */

    console.log(
      "========== ADMIN DASHBOARD DATA =========="
    );

    console.log(
      "Users:",
      users.length
    );

    console.log(
      "Properties:",
      properties.length
    );

    console.log(
      "Bookings:",
      bookings.length
    );

    console.log(
      "Subscriptions:",
      subscriptions.length
    );

    console.log(
      "=========================================="
    );

    /* =====================================================
       RETURN
    ===================================================== */

    return {
      users,
      properties,
      bookings,
      subscriptions,
    };
  } catch (error) {
    console.error(
      "Error fetching dashboard data:",
      error
    );

    throw error;
  }
};

/* =========================================================
   DATE RANGE
========================================================= */

export const calculateDateRange = (
  filterType,
  customStartDate,
  customEndDate
) => {
  const now = new Date();

  let start = new Date(now);
  let end = new Date(now);

  start.setHours(
    0,
    0,
    0,
    0
  );

  end.setHours(
    23,
    59,
    59,
    999
  );

  switch (filterType) {
    /* -----------------------------------------------------
       TODAY
    ----------------------------------------------------- */

    case "today":
      break;

    /* -----------------------------------------------------
       YESTERDAY
    ----------------------------------------------------- */

    case "yesterday":
      start.setDate(
        now.getDate() - 1
      );

      end.setDate(
        now.getDate() - 1
      );

      break;

    /* -----------------------------------------------------
       TOMORROW
    ----------------------------------------------------- */

    case "tomorrow":
      start.setDate(
        now.getDate() + 1
      );

      end.setDate(
        now.getDate() + 1
      );

      break;

    /* -----------------------------------------------------
       THIS WEEK
    ----------------------------------------------------- */

    case "this_week": {
      const day = now.getDay();

      const diff =
        now.getDate() -
        day +
        (day === 0 ? -6 : 1);

      start.setDate(diff);

      end = new Date(start);

      end.setDate(
        start.getDate() + 6
      );

      end.setHours(
        23,
        59,
        59,
        999
      );

      break;
    }

    /* -----------------------------------------------------
       LAST WEEK
    ----------------------------------------------------- */

    case "last_week": {
      const day = now.getDay();

      const diff =
        now.getDate() -
        day +
        (day === 0 ? -6 : 1) -
        7;

      start.setDate(diff);

      end = new Date(start);

      end.setDate(
        start.getDate() + 6
      );

      end.setHours(
        23,
        59,
        59,
        999
      );

      break;
    }

    /* -----------------------------------------------------
       NEXT WEEK
    ----------------------------------------------------- */

    case "next_week": {
      const day = now.getDay();

      const diff =
        now.getDate() -
        day +
        (day === 0 ? -6 : 1) +
        7;

      start.setDate(diff);

      end = new Date(start);

      end.setDate(
        start.getDate() + 6
      );

      end.setHours(
        23,
        59,
        59,
        999
      );

      break;
    }

    /* -----------------------------------------------------
       THIS MONTH
    ----------------------------------------------------- */

    case "this_month":
      start = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );

      end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );

      break;

    /* -----------------------------------------------------
       LAST MONTH
    ----------------------------------------------------- */

    case "last_month":
      start = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      );

      end = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999
      );

      break;

    /* -----------------------------------------------------
       NEXT MONTH
    ----------------------------------------------------- */

    case "next_month":
      start = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1
      );

      end = new Date(
        now.getFullYear(),
        now.getMonth() + 2,
        0,
        23,
        59,
        59,
        999
      );

      break;

    /* -----------------------------------------------------
       LAST 3 MONTHS
    ----------------------------------------------------- */

    case "last_3_months":
      start = new Date(
        now.getFullYear(),
        now.getMonth() - 2,
        1
      );

      end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );

      break;

    /* -----------------------------------------------------
       LAST 6 MONTHS
    ----------------------------------------------------- */

    case "last_6_months":
      start = new Date(
        now.getFullYear(),
        now.getMonth() - 5,
        1
      );

      end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );

      break;

    /* -----------------------------------------------------
       THIS YEAR
    ----------------------------------------------------- */

    case "this_year":
      start = new Date(
        now.getFullYear(),
        0,
        1
      );

      end = new Date(
        now.getFullYear(),
        11,
        31,
        23,
        59,
        59,
        999
      );

      break;

    /* -----------------------------------------------------
       CUSTOM
    ----------------------------------------------------- */

    case "custom":
      if (customStartDate) {
        start = new Date(
          customStartDate
        );

        start.setHours(
          0,
          0,
          0,
          0
        );
      }

      if (customEndDate) {
        end = new Date(
          customEndDate
        );

        end.setHours(
          23,
          59,
          59,
          999
        );
      }

      break;

    default:
      break;
  }

  return {
    start,
    end,
  };
};

/* =========================================================
   AGGREGATE DASHBOARD DATA
========================================================= */

export const aggregateDashboardData = (
  rawUsers,
  rawProperties,
  rawBookings,
  rawSubscriptions,
  dateRange,
  filterType,
  subscriptionUserFilter = "all"
) => {
  const {
    start,
    end,
  } = dateRange;

  /* =======================================================
     DATE CHECK
  ======================================================= */

  const isWithinRange = (date) => {
    if (!date) {
      return false;
    }

    return (
      date >= start &&
      date <= end
    );
  };

  /* =======================================================
     USERS
  ======================================================= */

  const totalUsers =
    rawUsers.length;

  const owners =
    rawUsers.filter(
      (user) =>
        (user.role || "").toLowerCase() ===
        "owner"
    );

  const renters =
    rawUsers.filter(
      (user) =>
        (user.role || "").toLowerCase() ===
        "renter"
    );

  /* =======================================================
     PROPERTIES
  ======================================================= */

  const totalProperties =
    rawProperties.length;

  /* =======================================================
     BOOKINGS
  ======================================================= */

  const bookingsInPeriod =
    rawBookings.filter(
      (booking) =>
        booking.dateObj &&
        isWithinRange(
          booking.dateObj
        )
    );

  /* =======================================================
     BOOKING STATUS

     Kept because dashboard still displays
     "Booking Status".
  ======================================================= */

  const bookingStatus = {
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    completed: 0,
  };

  bookingsInPeriod.forEach(
    (booking) => {
      const status = (
        booking.status || ""
      ).toLowerCase();

      if (
        status === "pending"
      ) {
        bookingStatus.pending += 1;
      }

      if (
        status === "approved"
      ) {
        bookingStatus.approved += 1;
      }

      if (
        status === "rejected"
      ) {
        bookingStatus.rejected += 1;
      }

      if (
        status === "cancelled"
      ) {
        bookingStatus.cancelled += 1;
      }

      if (
        status === "completed"
      ) {
        bookingStatus.completed += 1;
      }
    }
  );

  /* =======================================================
     APPROVED BOOKINGS
  ======================================================= */

  const approvedBookings =
    rawBookings.filter(
      (booking) =>
        (
          booking.status ||
          ""
        ).toLowerCase() ===
        "approved"
    );

  /* =======================================================
     RENTED PROPERTIES
  ======================================================= */

  const bookedHouseIds =
    new Set(
      approvedBookings
        .map(
          (booking) =>
            booking.houseId
        )
        .filter(Boolean)
    );

  const rentedRooms =
    rawProperties.filter(
      (property) =>
        bookedHouseIds.has(
          property.id
        )
    ).length;

  const availableRooms =
    Math.max(
      0,
      totalProperties -
        rentedRooms
    );

  /* =======================================================
     USER LOOKUP

     Used to identify subscription owner/renter.
  ======================================================= */

  const userMap = new Map();

  rawUsers.forEach(
    (user) => {
      userMap.set(
        user.id,
        user
      );
    }
  );

  /* =======================================================
     SUBSCRIPTION USER TYPE

     Current subscription structure:
       ownerId

     Future renter subscription:
       renterId
  ======================================================= */

  const getSubscriptionUser = (
    subscription
  ) => {
    if (
      subscription.ownerId
    ) {
      const user =
        userMap.get(
          subscription.ownerId
        );

      return {
        type: "owner",
        user,
      };
    }

    if (
      subscription.renterId
    ) {
      const user =
        userMap.get(
          subscription.renterId
        );

      return {
        type: "renter",
        user,
      };
    }

    return {
      type: "unknown",
      user: null,
    };
  };

  /* =======================================================
     SUBSCRIPTIONS IN PERIOD
  ======================================================= */

  let subscriptionsInPeriod =
    rawSubscriptions.filter(
      (subscription) =>
        subscription.dateObj &&
        isWithinRange(
          subscription.dateObj
        )
    );

  /* =======================================================
     APPLY OWNER / RENTER FILTER
  ======================================================= */

  if (
    subscriptionUserFilter !==
      "all"
  ) {
    subscriptionsInPeriod =
      subscriptionsInPeriod.filter(
        (subscription) => {
          const {
            type,
          } =
            getSubscriptionUser(
              subscription
            );

          return (
            type ===
            subscriptionUserFilter
          );
        }
      );
  }

  /* =======================================================
     TOTAL SUBSCRIPTIONS
  ======================================================= */

  const totalSubscriptions =
    subscriptionsInPeriod.length;

  /* =======================================================
     SUBSCRIPTION STATUS
  ======================================================= */

  const pendingSubscriptions =
    subscriptionsInPeriod.filter(
      (subscription) =>
        (
          subscription.status ||
          ""
        ).toLowerCase() ===
        "pending"
    );

  const activeSubscriptions =
    subscriptionsInPeriod.filter(
      (subscription) =>
        (
          subscription.status ||
          ""
        ).toLowerCase() ===
        "active"
    );

  const rejectedSubscriptions =
    subscriptionsInPeriod.filter(
      (subscription) =>
        (
          subscription.status ||
          ""
        ).toLowerCase() ===
        "rejected"
    );

  const cancelledSubscriptions =
    subscriptionsInPeriod.filter(
      (subscription) =>
        (
          subscription.status ||
          ""
        ).toLowerCase() ===
        "cancelled"
    );

  const expiredSubscriptions =
    subscriptionsInPeriod.filter(
      (subscription) =>
        (
          subscription.status ||
          ""
        ).toLowerCase() ===
        "expired"
    );

  /* =======================================================
     SUBSCRIPTION AMOUNT

     IMPORTANT:
     Uses subscription.amount

     Does NOT use:
     testPaymentAmount
  ======================================================= */

  const getSubscriptionAmount = (
    subscription
  ) => {
    const amount = Number(
      subscription.amount
    );

    return Number.isFinite(
      amount
    )
      ? amount
      : 0;
  };

  /* =======================================================
     PAID SUBSCRIPTION CHECK
  ======================================================= */

  const isSubscriptionPaid = (
    subscription
  ) => {
    const paymentStatus = (
      subscription.paymentStatus ||
      ""
    ).toLowerCase();

    return (
      paymentStatus === "paid" ||
      paymentStatus === "success" ||
      paymentStatus === "completed"
    );
  };

  /* =======================================================
     PAID SUBSCRIPTIONS
  ======================================================= */

  const paidSubscriptions =
    subscriptionsInPeriod.filter(
      isSubscriptionPaid
    );

  /* =======================================================
     TOTAL SUBSCRIPTION AMOUNT
  ======================================================= */

  const totalSubscriptionAmount =
    paidSubscriptions.reduce(
      (
        total,
        subscription
      ) => {
        return (
          total +
          getSubscriptionAmount(
            subscription
          )
        );
      },
      0
    );

  /* =======================================================
     SUBSCRIPTION CHART
  ======================================================= */

  const chartMap = {};

  subscriptionsInPeriod.forEach(
    (subscription) => {
      if (
        !subscription.dateObj
      ) {
        return;
      }

      /* ---------------------------------------------------
         PERIOD LABEL
      --------------------------------------------------- */

      let period;

      if (
        [
          "this_year",
          "last_6_months",
          "last_3_months",
        ].includes(filterType)
      ) {
        period =
          subscription.dateObj.toLocaleDateString(
            "en-US",
            {
              month: "short",
              year: "numeric",
            }
          );
      } else {
        period =
          subscription.dateObj.toLocaleDateString(
            "en-US",
            {
              month: "short",
              day: "numeric",
            }
          );
      }

      /* ---------------------------------------------------
         CREATE PERIOD
      --------------------------------------------------- */

      if (
        !chartMap[period]
      ) {
        chartMap[period] = {
          period,

          subscriptions: 0,

          ownerSubscriptions: 0,

          renterSubscriptions: 0,

          active: 0,

          pending: 0,

          rejected: 0,

          cancelled: 0,

          expired: 0,

          amount: 0,

          rawTimestamp:
            subscription.dateObj.getTime(),
        };
      }

      /* ---------------------------------------------------
         SUBSCRIPTION COUNT
      --------------------------------------------------- */

      chartMap[
        period
      ].subscriptions += 1;

      /* ---------------------------------------------------
         USER TYPE
      --------------------------------------------------- */

      const {
        type: userType,
      } =
        getSubscriptionUser(
          subscription
        );

      if (
        userType === "owner"
      ) {
        chartMap[
          period
        ].ownerSubscriptions += 1;
      }

      if (
        userType === "renter"
      ) {
        chartMap[
          period
        ].renterSubscriptions += 1;
      }

      /* ---------------------------------------------------
         STATUS
      --------------------------------------------------- */

      const status = (
        subscription.status ||
        ""
      ).toLowerCase();

      if (
        status === "active"
      ) {
        chartMap[
          period
        ].active += 1;
      }

      if (
        status === "pending"
      ) {
        chartMap[
          period
        ].pending += 1;
      }

      if (
        status === "rejected"
      ) {
        chartMap[
          period
        ].rejected += 1;
      }

      if (
        status === "cancelled"
      ) {
        chartMap[
          period
        ].cancelled += 1;
      }

      if (
        status === "expired"
      ) {
        chartMap[
          period
        ].expired += 1;
      }

      /* ---------------------------------------------------
         PAID AMOUNT

         Only paid subscriptions contribute.
      --------------------------------------------------- */

      if (
        isSubscriptionPaid(
          subscription
        )
      ) {
        chartMap[
          period
        ].amount +=
          getSubscriptionAmount(
            subscription
          );
      }
    }
  );

  /* =======================================================
     SORT CHART
  ======================================================= */

  const subscriptionChart =
    Object.values(
      chartMap
    ).sort(
      (a, b) =>
        a.rawTimestamp -
        b.rawTimestamp
    );

  /* =======================================================
     FALLBACK CHART
  ======================================================= */

  const finalSubscriptionChart =
    subscriptionChart.length > 0
      ? subscriptionChart
      : [
          {
            period: "No Data",

            subscriptions: 0,

            ownerSubscriptions: 0,

            renterSubscriptions: 0,

            active: 0,

            pending: 0,

            rejected: 0,

            cancelled: 0,

            expired: 0,

            amount: 0,

            rawTimestamp: 0,
          },
        ];

  /* =======================================================
     RECENT SUBSCRIPTIONS
  ======================================================= */

  const recentSubscriptions =
    [...subscriptionsInPeriod]
      .filter(
        (subscription) =>
          subscription.dateObj
      )
      .sort(
        (a, b) =>
          b.dateObj.getTime() -
          a.dateObj.getTime()
      )
      .slice(0, 5)
      .map(
        (subscription) => {
          const {
            type,
            user,
          } =
            getSubscriptionUser(
              subscription
            );

          return {
            ...subscription,

            userType:
              type,

            userName:
              user?.fullName ||
              user?.name ||
              user?.email ||
              null,
          };
        }
      );

  /* =======================================================
     RECENT SYSTEM ACTIVITIES
  ======================================================= */

  const recentActivities =
    recentSubscriptions.map(
      (subscription) => ({
        id: subscription.id,

        text:
          `Subscription #${subscription.id.substring(
            0,
            6
          )} - ${
            subscription.planName ||
            "Subscription"
          } - ${
            subscription.status ||
            "Pending"
          }`,

        time:
          subscription.dateObj
            ? subscription.dateObj.toLocaleString(
                [],
                {
                  month:
                    "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute:
                    "2-digit",
                }
              )
            : "",
      })
    );

  /* =======================================================
     RETURN
  ======================================================= */

  return {
    /* =====================================================
       STATS
    ===================================================== */

    stats: {
      totalUsers,

      totalOwners:
        owners.length,

      totalRenters:
        renters.length,

      totalProperties,

      totalSubscriptions,

      totalSubscriptionAmount,

      activeSubscriptions:
        activeSubscriptions.length,

      totalBookings:
        bookingsInPeriod.length,
    },

    /* =====================================================
       USERS
    ===================================================== */

    users: {
      renters:
        renters.length,

      owners:
        owners.length,
    },

    /* =====================================================
       ROOMS
    ===================================================== */

    rooms: {
      available:
        availableRooms,

      rented:
        rentedRooms,

      total:
        totalProperties,
    },

    /* =====================================================
       BOOKING STATUS
    ===================================================== */

    bookingStatus,

    /* =====================================================
       SUBSCRIPTION STATUS
    ===================================================== */

    subscriptionStatus: {
      pending:
        pendingSubscriptions.length,

      active:
        activeSubscriptions.length,

      rejected:
        rejectedSubscriptions.length,

      cancelled:
        cancelledSubscriptions.length,

      expired:
        expiredSubscriptions.length,
    },

    /* =====================================================
       SUBSCRIPTION REVENUE
    ===================================================== */

    subscriptionRevenue: {
      total:
        totalSubscriptionAmount,

      paidSubscriptions:
        paidSubscriptions.length,
    },

    /* =====================================================
       SUBSCRIPTION CHART
    ===================================================== */

    subscriptionChart:
      finalSubscriptionChart,

    /* =====================================================
       RECENT SUBSCRIPTIONS
    ===================================================== */

    recentSubscriptions,

    /* =====================================================
       RECENT ACTIVITIES
    ===================================================== */

    recentActivities,
  };
};