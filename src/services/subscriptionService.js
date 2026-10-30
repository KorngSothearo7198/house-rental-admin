// import { db, auth } from "./firebase";
// import {
//   collection,
//   query,
//   where,
//   getDocs,
//   addDoc,
//   serverTimestamp,
// } from "firebase/firestore";

// export const subscriptionService = {
//   // Get all active plans (sorted in JS — no composite index needed)
//   async getPlans() {
//     const q = query(
//       collection(db, "subscription_plans"),
//       where("status", "==", "active")
//     );
//     const snap = await getDocs(q);

//     const plans = snap.docs.map((d) => ({
//       id: d.id,
//       ...d.data(),
//     }));

//     // Sort by displayOrder in JavaScript
//     plans.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

//     return plans;
//   },

//   async getOwnerSubscription(ownerId) {
//     const q = query(
//       collection(db, "subscriptions"),
//       where("ownerId", "==", ownerId)
//     );
//     const snap = await getDocs(q);
//     if (snap.empty) return null;

//     const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
//     list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
//     return list[0];
//   },

//   async createSubscriptionRequest({
//     planId,
//     planName,
//     amount,
//     paymentMethod,
//     paymentReference,
//   }) {
//     const user = auth.currentUser;
//     if (!user) throw new Error("Not authenticated");

//     const docRef = await addDoc(collection(db, "subscriptions"), {
//       ownerId: user.uid,
//       planId,
//       planName,
//       amount: Number(amount),
//       currency: "USD",
//       paymentMethod,
//       paymentReference,
//       status: "pending",
//       startDate: null,
//       endDate: null,
//       createdAt: serverTimestamp(),
//       updatedAt: serverTimestamp(),
//     });

//     return docRef.id;
//   },
// };

// import { db, auth } from "./firebase";

// import {
//   collection,
//   query,
//   where,
//   getDocs,
//   addDoc,
//   doc,
//   updateDoc,
//   serverTimestamp,
// } from "firebase/firestore";

// export const subscriptionService = {
//   // ============================================================
//   // GET ACTIVE PLANS
//   // ============================================================
//   async getPlans() {
//     const q = query(
//       collection(db, "subscription_plans"),
//       where("status", "==", "active"),
//     );

//     const snap = await getDocs(q);

//     const plans = snap.docs.map((d) => ({
//       id: d.id,
//       ...d.data(),
//     }));

//     // Sort in JavaScript
//     plans.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

//     return plans;
//   },

//   // ============================================================
//   // GET OWNER SUBSCRIPTION
//   // ============================================================
//   async getOwnerSubscription(ownerId) {
//     const q = query(
//       collection(db, "subscriptions"),
//       where("ownerId", "==", ownerId),
//     );

//     const snap = await getDocs(q);

//     if (snap.empty) return null;

//     const list = snap.docs.map((d) => ({
//       id: d.id,
//       ...d.data(),
//     }));

//     list.sort(
//       (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
//     );

//     return list[0];
//   },

//   // ============================================================
//   // CREATE SUBSCRIPTION REQUEST
//   // ============================================================
//   async createSubscriptionRequest({
//     planId,
//     planName,
//     amount,
//     paymentMethod,
//     paymentReference,
//   }) {
//     const user = auth.currentUser;

//     if (!user) {
//       throw new Error("Not authenticated");
//     }

//     const docRef = await addDoc(collection(db, "subscriptions"), {
//       ownerId: user.uid,

//       planId,
//       planName,

//       amount: Number(amount),
//       currency: "USD",

//       paymentMethod,
//       paymentReference,

//       status: "pending",

//       startDate: null,
//       endDate: null,

//       createdAt: serverTimestamp(),
//       updatedAt: serverTimestamp(),
//     });

//     return docRef.id;
//   },

//   // ============================================================
//   // APPROVE / REJECT SUBSCRIPTION
//   // ============================================================
//   async updateSubscriptionStatus({
//     subscriptionId,
//     status,
//     adminId,
//     rejectionReason = "",
//   }) {
//     if (!subscriptionId) {
//       throw new Error("Subscription ID is required.");
//     }

//     if (!["approved", "rejected"].includes(status)) {
//       throw new Error("Invalid status. Only approved or rejected is allowed.");
//     }

//     if (!adminId) {
//       throw new Error("Admin ID is required.");
//     }

//     const subscriptionRef = doc(db, "subscriptions", subscriptionId);

//     const updateData = {
//       status,
//       updatedAt: serverTimestamp(),
//     };

//     // ==========================================================
//     // APPROVED
//     // ==========================================================
//     if (status === "approved") {
//       updateData.approvedBy = adminId;
//       updateData.approvedAt = serverTimestamp();

//       // Remove old rejection information if request is approved again
//       updateData.rejectionReason = "";
//       updateData.rejectedBy = null;
//       updateData.rejectedAt = null;
//     }

//     // ==========================================================
//     // REJECTED
//     // ==========================================================
//     if (status === "rejected") {
//       if (!rejectionReason.trim()) {
//         throw new Error("Rejection reason is required.");
//       }

//       updateData.rejectionReason = rejectionReason.trim();

//       updateData.rejectedBy = adminId;
//       updateData.rejectedAt = serverTimestamp();

//       // Rejected subscription should not have active dates
//       updateData.startDate = null;
//       updateData.endDate = null;
//     }

//     await updateDoc(subscriptionRef, updateData);

//     return true;
//   },
// };




import { db, auth } from "./firebase";

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

// ============================================================
// PAYMENT SERVER
// ============================================================

const PAYMENT_API =
  import.meta.env.VITE_PAYMENT_API_URL ||
  "http://localhost:3000";

// ============================================================
// TEST PAYMENT CONFIG
// ============================================================
//
// IMPORTANT:
//
// Real subscription price:
//     Example: $5 USD
//
// Testing Bakong transaction:
//     100 KHR
//
// The backend MUST also enforce 100 KHR.
// Do not trust only the frontend value.
//

const TEST_PAYMENT_AMOUNT = 100;
const TEST_PAYMENT_CURRENCY = "KHR";

// ============================================================
// SUBSCRIPTION SERVICE
// ============================================================

export const subscriptionService = {
  // ==========================================================
  // GET ALL ACTIVE SUBSCRIPTION PLANS
  // ==========================================================

  async getPlans() {
    const q = query(
      collection(db, "subscription_plans"),
      where("status", "==", "active"),
    );

    const snap = await getDocs(q);

    const plans = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    plans.sort(
      (a, b) =>
        (a.displayOrder || 0) -
        (b.displayOrder || 0),
    );

    return plans;
  },

  // ==========================================================
  // GET LATEST OWNER SUBSCRIPTION
  // ==========================================================

  async getOwnerSubscription(ownerId) {
    if (!ownerId) {
      throw new Error("Owner ID is required");
    }

    const q = query(
      collection(db, "subscriptions"),
      where("ownerId", "==", ownerId),
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      return null;
    }

    const subscriptions = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    subscriptions.sort(
      (a, b) =>
        (b.createdAt?.seconds || 0) -
        (a.createdAt?.seconds || 0),
    );

    return subscriptions[0];
  },

  // ==========================================================
  // CREATE BAKONG SUBSCRIPTION PAYMENT
  // ==========================================================
  //
  // amount = REAL subscription price
  //
  // Example:
  //
  // Plan price = $5 USD
  //
  // Backend test mode:
  //
  // Bakong QR = 100 KHR
  //
  // The backend is responsible for creating the actual
  // KHQR with 100 KHR in test mode.
  //

  async createBakongPayment({
  planId,
  planName,
  amount,
}) {
  console.log("========================================");
  console.log("CREATE BAKONG PAYMENT");
  console.log("========================================");

  const user = auth.currentUser;

  console.log("Firebase user:", user?.uid || "NO USER");

  if (!user) {
    throw new Error("Not authenticated");
  }

  console.log("Payment API:", PAYMENT_API);
  console.log("Endpoint:", `${PAYMENT_API}/api/payment/create`);
  console.log("Plan ID:", planId);
  console.log("Plan Name:", planName);
  console.log("Real Amount:", amount);
  console.log("Test Amount:", TEST_PAYMENT_AMOUNT);
  console.log("Test Currency:", TEST_PAYMENT_CURRENCY);

  if (!planId) {
    throw new Error("Plan ID is required");
  }

  if (!planName) {
    throw new Error("Plan name is required");
  }

  const realSubscriptionAmount = Number(amount);

  if (
    !Number.isFinite(realSubscriptionAmount) ||
    realSubscriptionAmount <= 0
  ) {
    throw new Error("Invalid subscription amount");
  }

  const requestBody = {
    ownerId: user.uid,
    planId,
    planName,
    amount: realSubscriptionAmount,
  };

  console.log("Request body:", requestBody);

  const endpoint =
    `${PAYMENT_API}/api/payment/create`;

  console.log("Sending POST request...");

  let response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (networkError) {
    console.error("========================================");
    console.error("NETWORK ERROR");
    console.error("========================================");
    console.error(networkError);
    console.error("Endpoint:", endpoint);
    console.error("========================================");

    throw new Error(
      `Cannot connect to payment server at ${endpoint}. ` +
      `Make sure the Express backend is running on port 3000.`,
    );
  }

  console.log("HTTP status:", response.status);
  console.log(
    "HTTP status text:",
    response.statusText,
  );

  const rawResponse = await response.text();

  console.log("Raw server response:", rawResponse);

  let data;

  try {
    data = JSON.parse(rawResponse);
  } catch {
    console.error(
      "Server returned non-JSON response:",
      rawResponse,
    );

    throw new Error(
      "Payment server returned an invalid response.",
    );
  }

  console.log("Parsed server response:", data);

  if (!response.ok || !data.success) {
    throw new Error(
      data?.message ||
        "Failed to create Bakong payment",
    );
  }

  if (!data.payment) {
    throw new Error(
      "Payment server returned empty payment data",
    );
  }

  console.log("Payment created successfully:", data.payment);

  return data.payment;
},

  // ==========================================================
  // CHECK BAKONG PAYMENT
  // ==========================================================
  //
  // TEST MODE:
  //
  // Expected:
  //
  // amount   = 100
  // currency = KHR
  //
  // The backend MUST enforce these values.
  // Frontend values are only sent as additional information.
  //

  async checkBakongPayment({
    md5,
    ownerId,
    planId,
  }) {
    if (!md5) {
      throw new Error(
        "Bakong MD5 is required",
      );
    }

    if (!ownerId) {
      throw new Error(
        "Owner ID is required",
      );
    }

    if (!planId) {
      throw new Error(
        "Plan ID is required",
      );
    }

    const response = await fetch(
      `${PAYMENT_API}/api/payment/check`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          md5,

          // ==================================================
          // TEST PAYMENT
          // ==================================================

          expectedAmount:
            TEST_PAYMENT_AMOUNT,

          expectedCurrency:
            TEST_PAYMENT_CURRENCY,

          ownerId,
          planId,
        }),
      },
    );

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        "Invalid response from payment server",
      );
    }

    if (!response.ok || !data.success) {
      throw new Error(
        data?.message ||
          "Failed to check Bakong payment",
      );
    }

    return data;
  },

  // ==========================================================
  // CREATE SUBSCRIPTION AFTER PAYMENT VERIFIED
  // ==========================================================
  //
  // IMPORTANT:
  //
  // amount = REAL SUBSCRIPTION PRICE
  //
  // Example:
  //
  // Plan = $5 USD
  //
  // Firestore:
  //
  // amount = 5
  // currency = USD
  //
  // Bakong transaction:
  //
  // testPaymentAmount = 100
  // testPaymentCurrency = KHR
  //

  async createPaidSubscription({
    planId,
    planName,
    amount,
    paymentReference,
    bakongMd5,
    transactionHash,
    receiver,
    sender,
  }) {
    const user = auth.currentUser;

    if (!user) {
      throw new Error("Not authenticated");
    }

    if (!planId) {
      throw new Error(
        "Plan ID is required",
      );
    }

    if (!planName) {
      throw new Error(
        "Plan name is required",
      );
    }

    if (!transactionHash) {
      throw new Error(
        "Bakong transaction hash is required",
      );
    }

    const realSubscriptionAmount =
      Number(amount);

    if (
      !Number.isFinite(
        realSubscriptionAmount,
      ) ||
      realSubscriptionAmount <= 0
    ) {
      throw new Error(
        "Invalid subscription amount",
      );
    }

    // ========================================================
    // CHECK DUPLICATE BAKONG TRANSACTION
    // ========================================================
    //
    // This prevents the same successful Bakong transaction
    // from creating multiple subscription documents.
    //

    const duplicateQuery = query(
      collection(db, "subscriptions"),
      where(
        "bakongTransactionHash",
        "==",
        transactionHash,
      ),
    );

    const duplicateSnap =
      await getDocs(duplicateQuery);

    if (!duplicateSnap.empty) {
      const existingDoc =
        duplicateSnap.docs[0];

      return existingDoc.id;
    }

    // ========================================================
    // CREATE FIRESTORE SUBSCRIPTION
    // ========================================================

    const subscriptionRef = await addDoc(
      collection(db, "subscriptions"),
      {
        // ====================================================
        // OWNER
        // ====================================================

        ownerId: user.uid,

        // ====================================================
        // PLAN
        // ====================================================

        planId,
        planName,

        // ====================================================
        // REAL SUBSCRIPTION PRICE
        // ====================================================
        //
        // Example:
        //
        // $5 USD
        //

        amount: realSubscriptionAmount,
        currency: "USD",

        // ====================================================
        // PAYMENT
        // ====================================================

        paymentMethod: "Bakong",
        paymentStatus: "paid",

        // ====================================================
        // BAKONG PAYMENT
        // ====================================================

        paymentReference:
          paymentReference ||
          transactionHash,

        bakongMd5:
          bakongMd5 || "",

        bakongTransactionHash:
          transactionHash,

        bakongReceiver:
          receiver || "",

        bakongSender:
          sender || "",

        // ====================================================
        // TEST PAYMENT INFORMATION
        // ====================================================
        //
        // The actual Bakong test transaction:
        //
        // 100 KHR
        //

        testPaymentAmount:
          TEST_PAYMENT_AMOUNT,

        testPaymentCurrency:
          TEST_PAYMENT_CURRENCY,

        // ====================================================
        // ADMIN APPROVAL
        // ====================================================

        status: "pending",

        // ====================================================
        // SUBSCRIPTION PERIOD
        // ====================================================

        startDate: null,
        endDate: null,

        // ====================================================
        // TIMESTAMPS
        // ====================================================

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp(),
      },
    );

    return subscriptionRef.id;
  },
};




// import { db, auth } from "./firebase";

// import {
//   collection,
//   query,
//   where,
//   getDocs,
//   addDoc,
//   serverTimestamp,
// } from "firebase/firestore";

// // ============================================================
// // PAYMENT SERVER
// // ============================================================

// const PAYMENT_API =
//   import.meta.env.VITE_PAYMENT_API_URL || "http://localhost:3000";

// // ============================================================
// // TEST PAYMENT
// // ============================================================
// //
// // REAL PLAN:
// //
// // $5 USD
// //
// // TEST BAKONG:
// //
// // 100 KHR
// //
// // ============================================================

// const TEST_PAYMENT_AMOUNT = 100;

// const TEST_PAYMENT_CURRENCY = "KHR";

// // ============================================================
// // SUBSCRIPTION SERVICE
// // ============================================================

// export const subscriptionService = {
//   // ==========================================================
//   // GET ACTIVE SUBSCRIPTION PLANS
//   // ==========================================================

//   async getPlans() {
//     const q = query(
//       collection(db, "subscription_plans"),

//       where("status", "==", "active"),
//     );

//     const snap = await getDocs(q);

//     const plans = snap.docs.map((doc) => ({
//       id: doc.id,

//       ...doc.data(),
//     }));

//     plans.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

//     return plans;
//   },

//   // ==========================================================
//   // GET OWNER SUBSCRIPTION
//   // ==========================================================

//   async getOwnerSubscription(ownerId) {
//     if (!ownerId) {
//       throw new Error("Owner ID is required");
//     }

//     const q = query(
//       collection(db, "subscriptions"),

//       where("ownerId", "==", ownerId),
//     );

//     const snap = await getDocs(q);

//     if (snap.empty) {
//       return null;
//     }

//     const subscriptions = snap.docs.map((doc) => ({
//       id: doc.id,

//       ...doc.data(),
//     }));

//     subscriptions.sort(
//       (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
//     );

//     return subscriptions[0];
//   },

//   // ==========================================================
//   // CREATE BAKONG PAYMENT
//   // ==========================================================
//   //
//   // amount = REAL PLAN PRICE
//   //
//   // Example:
//   //
//   // $5 USD
//   //
//   // Backend converts test payment to:
//   //
//   // 100 KHR
//   //
//   // ==========================================================

//   async createBakongPayment({ planId, planName, amount }) {
//     const user = auth.currentUser;

//     if (!user) {
//       throw new Error("Not authenticated");
//     }

//     if (!planId) {
//       throw new Error("Plan ID is required");
//     }

//     if (!planName) {
//       throw new Error("Plan name is required");
//     }

//     const realSubscriptionAmount = Number(amount);

//     if (
//       !Number.isFinite(realSubscriptionAmount) ||
//       realSubscriptionAmount <= 0
//     ) {
//       throw new Error("Invalid subscription amount");
//     }

//     // ========================================================
//     // CALL PAYMENT SERVER
//     // ========================================================

//     const response = await fetch(`${PAYMENT_API}/api/payment/create`, {
//       method: "POST",

//       headers: {
//         "Content-Type": "application/json",
//       },

//       body: JSON.stringify({
//         ownerId: user.uid,

//         planId,

//         planName,

//         // REAL PLAN PRICE
//         amount: realSubscriptionAmount,
//       }),
//     });

//     // ========================================================
//     // RESPONSE
//     // ========================================================

//     let data;

//     try {
//       data = await response.json();
//     } catch {
//       throw new Error("Invalid response from payment server");
//     }

//     if (!response.ok || !data.success) {
//       throw new Error(data?.message || "Failed to create Bakong payment");
//     }

//     if (!data.payment) {
//       throw new Error("Payment server returned empty payment data");
//     }

//     // ========================================================
//     // SAFETY CHECK
//     // ========================================================

//     if (Number(data.payment.paymentAmount) !== TEST_PAYMENT_AMOUNT) {
//       throw new Error(
//         `Unexpected Bakong payment amount. Expected ${TEST_PAYMENT_AMOUNT} ${TEST_PAYMENT_CURRENCY}.`,
//       );
//     }

//     if (
//       String(data.payment.paymentCurrency || "").toUpperCase() !==
//       TEST_PAYMENT_CURRENCY
//     ) {
//       throw new Error(
//         `Unexpected Bakong payment currency. Expected ${TEST_PAYMENT_CURRENCY}.`,
//       );
//     }

//     return data.payment;
//   },

//   // ==========================================================
//   // CHECK BAKONG PAYMENT
//   // ==========================================================

//   async checkBakongPayment({ md5, ownerId, planId }) {
//     if (!md5) {
//       throw new Error("Bakong MD5 is required");
//     }

//     if (!ownerId) {
//       throw new Error("Owner ID is required");
//     }

//     if (!planId) {
//       throw new Error("Plan ID is required");
//     }

//     const response = await fetch(`${PAYMENT_API}/api/payment/check`, {
//       method: "POST",

//       headers: {
//         "Content-Type": "application/json",
//       },

//       body: JSON.stringify({
//         md5,

//         // These are informational.
//         // Backend enforces its own values.
//         expectedAmount: TEST_PAYMENT_AMOUNT,

//         expectedCurrency: TEST_PAYMENT_CURRENCY,

//         ownerId,

//         planId,
//       }),
//     });

//     let data;

//     try {
//       data = await response.json();
//     } catch {
//       throw new Error("Invalid response from payment server");
//     }

//     if (!response.ok || !data.success) {
//       throw new Error(data?.message || "Failed to check Bakong payment");
//     }

//     return data;
//   },

//   // ==========================================================
//   // CREATE SUBSCRIPTION AFTER PAYMENT VERIFIED
//   // ==========================================================
//   //
//   // IMPORTANT:
//   //
//   // amount = REAL SUBSCRIPTION PRICE
//   //
//   // Example:
//   //
//   // amount = 5
//   // currency = USD
//   //
//   // Bakong:
//   //
//   // 100 KHR
//   //
//   // ==========================================================

//   async createPaidSubscription({
//     planId,
//     planName,
//     amount,
//     paymentReference,
//     bakongMd5,
//     transactionHash,
//     receiver,
//     sender,
//   }) {
//     const user = auth.currentUser;

//     if (!user) {
//       throw new Error("Not authenticated");
//     }

//     if (!planId) {
//       throw new Error("Plan ID is required");
//     }

//     if (!planName) {
//       throw new Error("Plan name is required");
//     }

//     if (!transactionHash) {
//       throw new Error("Bakong transaction hash is required");
//     }

//     const realSubscriptionAmount = Number(amount);

//     if (
//       !Number.isFinite(realSubscriptionAmount) ||
//       realSubscriptionAmount <= 0
//     ) {
//       throw new Error("Invalid subscription amount");
//     }

//     // ========================================================
//     // DUPLICATE TRANSACTION CHECK
//     // ========================================================

//     const duplicateQuery = query(
//       collection(db, "subscriptions"),

//       where("bakongTransactionHash", "==", transactionHash),
//     );

//     const duplicateSnap = await getDocs(duplicateQuery);

//     if (!duplicateSnap.empty) {
//       const existingDoc = duplicateSnap.docs[0];

//       console.warn("Bakong transaction already used:", transactionHash);

//       return existingDoc.id;
//     }

//     // ========================================================
//     // CREATE SUBSCRIPTION
//     // ========================================================

//     const subscriptionRef = await addDoc(collection(db, "subscriptions"), {
//       // --------------------------------------------------
//       // OWNER
//       // --------------------------------------------------

//       ownerId: user.uid,

//       // --------------------------------------------------
//       // PLAN
//       // --------------------------------------------------

//       planId,

//       planName,

//       // --------------------------------------------------
//       // REAL SUBSCRIPTION PRICE
//       // --------------------------------------------------

//       amount: realSubscriptionAmount,

//       currency: "USD",

//       // --------------------------------------------------
//       // PAYMENT
//       // --------------------------------------------------

//       paymentMethod: "Bakong",

//       paymentStatus: "paid",

//       // --------------------------------------------------
//       // PAYMENT REFERENCE
//       // --------------------------------------------------

//       paymentReference: paymentReference || transactionHash,

//       // --------------------------------------------------
//       // BAKONG
//       // --------------------------------------------------

//       bakongMd5: bakongMd5 || "",

//       bakongTransactionHash: transactionHash,

//       bakongReceiver: receiver || "",

//       bakongSender: sender || "",

//       // --------------------------------------------------
//       // TEST PAYMENT
//       // --------------------------------------------------

//       testPaymentAmount: TEST_PAYMENT_AMOUNT,

//       testPaymentCurrency: TEST_PAYMENT_CURRENCY,

//       // --------------------------------------------------
//       // ADMIN APPROVAL
//       // --------------------------------------------------

//       status: "pending",

//       // --------------------------------------------------
//       // SUBSCRIPTION PERIOD
//       // --------------------------------------------------

//       startDate: null,

//       endDate: null,

//       // --------------------------------------------------
//       // TIMESTAMPS
//       // --------------------------------------------------

//       createdAt: serverTimestamp(),

//       updatedAt: serverTimestamp(),
//     });

//     console.log("Subscription created:", subscriptionRef.id);

//     return subscriptionRef.id;
//   },
// };
