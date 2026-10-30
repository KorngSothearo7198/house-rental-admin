// import React, { useEffect, useRef, useState } from "react";
// import {
//   AlertCircle,
//   Building2,
//   Check,
//   CheckCircle2,
//   Clock,
//   CreditCard,
//   Loader2,
//   QrCode,
//   RefreshCw,
//   ShieldCheck,
//   Sparkles,
//   Zap,
// } from "lucide-react";
// import { QRCodeSVG } from "qrcode.react";
// import { subscriptionService } from "../../services/subscriptionService";
// import { auth } from "../../services/firebase";

// // ============================================================
// // CONSTANTS (kept for testing logic – not shown on UI)
// // ============================================================
// const PAYMENT_CURRENCY = "USD";
// const PAYMENT_METHOD = "Bakong";
// const TEST_PAYMENT_AMOUNT = 100;
// const TEST_PAYMENT_CURRENCY = "KHR";

// // ============================================================
// // COMPONENT
// // ============================================================
// export default function OwnerSubscription() {
//   // ==========================================================
//   // DATA
//   // ==========================================================
//   const [plans, setPlans] = useState([]);
//   const [subscription, setSubscription] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   // ==========================================================
//   // PLAN
//   // ==========================================================
//   const [selectedPlanId, setSelectedPlanId] = useState(null);

//   // ==========================================================
//   // CHECKOUT
//   // ==========================================================
//   const [showCheckout, setShowCheckout] = useState(false);
//   const [payment, setPayment] = useState(null);
//   const [isCreatingPayment, setIsCreatingPayment] = useState(false);
//   const [isCheckingPayment, setIsCheckingPayment] = useState(false);
//   const [paymentMessage, setPaymentMessage] = useState("");
//   const [paymentError, setPaymentError] = useState("");
//   const [paymentSuccess, setPaymentSuccess] = useState(false);
//   const [showSuccess, setShowSuccess] = useState(false);

//   // ==========================================================
//   // COUNTDOWN
//   // ==========================================================
//   const [countdown, setCountdown] = useState(0);
//   const timerRef = useRef(null);

//   // ==========================================================
//   // AUTH + LOAD
//   // ==========================================================
//   useEffect(() => {
//     const unsubscribe = auth.onAuthStateChanged((user) => {
//       console.log("Firebase auth user:", user?.uid || "NO USER");

//       if (user) {
//         loadData();
//       } else {
//         setLoading(false);
//         setError("You are not authenticated. Please log in again.");
//       }
//     });

//     return () => {
//       unsubscribe();
//       clearAllTimers();
//     };
//   }, []);

//   // ==========================================================
//   // LOAD DATA
//   // ==========================================================
//   const loadData = async () => {
//     setLoading(true);
//     setError("");

//     try {
//       const user = auth.currentUser;

//       if (!user?.uid) {
//         throw new Error(
//           "User authentication is not ready. Please log in again.",
//         );
//       }

//       const [plansResult, subscriptionResult] = await Promise.all([
//         subscriptionService.getPlans(),
//         subscriptionService.getOwnerSubscription(user.uid),
//       ]);

//       const loadedPlans = Array.isArray(plansResult) ? plansResult : [];
//       setPlans(loadedPlans);
//       setSubscription(subscriptionResult || null);

//       if (loadedPlans.length > 0) {
//         const recommendedPlan =
//           loadedPlans.find(
//             (plan) => plan.recommended === true || plan.popular === true,
//           ) || loadedPlans[0];

//         setSelectedPlanId(recommendedPlan.id);
//       }
//     } catch (err) {
//       console.error("Failed to load subscription data:", err);
//       setError(err?.message || "Failed to load subscription plans.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ==========================================================
//   // TIMERS
//   // ==========================================================
//   const clearAllTimers = () => {
//     if (timerRef.current) {
//       clearInterval(timerRef.current);
//       timerRef.current = null;
//     }
//   };

//   // ==========================================================
//   // SELECTED PLAN
//   // ==========================================================
//   const selectedPlan =
//     plans.find((plan) => String(plan.id) === String(selectedPlanId)) || null;

//   // ==========================================================
//   // PRICE
//   // ==========================================================
//   const getPlanPrice = (plan) => {
//     const price = Number(plan?.price);
//     return Number.isFinite(price) ? price : 0;
//   };

//   // ==========================================================
//   // FEATURES
//   // ==========================================================
//   const getPlanFeatures = (plan) => {
//     if (Array.isArray(plan?.features)) {
//       return plan.features;
//     }

//     if (typeof plan?.features === "string") {
//       return plan.features
//         .split(",")
//         .map((item) => item.trim())
//         .filter(Boolean);
//     }

//     return [];
//   };

//   // ==========================================================
//   // BILLING
//   // ==========================================================
//   const getBillingText = (plan) => {
//     const billing = String(plan?.billing || "month").toLowerCase();

//     if (billing === "monthly" || billing === "month") {
//       return "month";
//     }

//     if (billing === "yearly" || billing === "year") {
//       return "year";
//     }

//     return billing;
//   };

//   // ==========================================================
//   // STATUS
//   // ==========================================================
//   const subscriptionStatus = String(subscription?.status || "").toLowerCase();
//   const isPending = subscriptionStatus === "pending";
//   const isActive =
//     subscriptionStatus === "active" || subscriptionStatus === "approved";

//   // ==========================================================
//   // COUNTDOWN
//   // ==========================================================
//   const formatCountdown = (seconds) => {
//     const safeSeconds = Math.max(0, Number(seconds) || 0);
//     const minutes = Math.floor(safeSeconds / 60);
//     const secs = safeSeconds % 60;

//     return (
//       `${String(minutes).padStart(2, "0")}:` +
//       `${String(secs).padStart(2, "0")}`
//     );
//   };

//   // ==========================================================
//   // START COUNTDOWN
//   // ==========================================================
//   const startCountdown = (expiresAt) => {
//     clearAllTimers();

//     const expiration = Number(expiresAt);

//     if (!Number.isFinite(expiration)) {
//       setCountdown(0);
//       return;
//     }

//     const updateCountdown = () => {
//       const remaining = Math.max(
//         0,
//         Math.floor((expiration - Date.now()) / 1000),
//       );

//       setCountdown(remaining);

//       if (remaining <= 0) {
//         clearAllTimers();
//         setPaymentMessage("QR code has expired. Please generate a new one.");
//       }
//     };

//     updateCountdown();
//     timerRef.current = setInterval(updateCountdown, 1000);
//   };

//   // ==========================================================
//   // OPEN CHECKOUT
//   // ==========================================================
//   const openCheckout = async () => {
//     if (!selectedPlan) {
//       setPaymentError("Please select a subscription plan.");
//       return;
//     }

//     const user = auth.currentUser;

//     if (!user) {
//       setPaymentError("You are not authenticated. Please log in again.");
//       return;
//     }

//     clearAllTimers();
//     setShowCheckout(true);
//     setPayment(null);
//     setPaymentMessage("");
//     setPaymentError("");
//     setPaymentSuccess(false);
//     setShowSuccess(false);
//     setIsCreatingPayment(true);
//     setCountdown(0);

//     try {
//       const createdPayment = await subscriptionService.createBakongPayment({
//         planId: selectedPlan.id,
//         planName: selectedPlan.name,
//         // REAL PLAN PRICE
//         amount: getPlanPrice(selectedPlan),
//       });

//       if (!createdPayment) {
//         throw new Error("Payment server returned empty payment data.");
//       }

//       if (!createdPayment.qr) {
//         throw new Error("Bakong QR code was not returned by the server.");
//       }

//       if (!createdPayment.md5) {
//         throw new Error("Bakong payment MD5 was not returned by the server.");
//       }

//       if (!createdPayment.expiresAt) {
//         throw new Error(
//           "Bakong payment expiration time was not returned by the server.",
//         );
//       }

//       // ====================================================
//       // VERIFY PAYMENT DATA (testing logic kept)
//       // ====================================================
//       const paymentAmount = Number(createdPayment.paymentAmount);
//       const paymentCurrency = String(
//         createdPayment.paymentCurrency || "",
//       ).toUpperCase();

//       if (paymentAmount !== TEST_PAYMENT_AMOUNT) {
//         throw new Error(
//           `Server returned incorrect test payment amount. Expected ${TEST_PAYMENT_AMOUNT} ${TEST_PAYMENT_CURRENCY}, received ${paymentAmount} ${paymentCurrency}.`,
//         );
//       }

//       if (paymentCurrency !== TEST_PAYMENT_CURRENCY) {
//         throw new Error(
//           `Server returned incorrect test payment currency. Expected ${TEST_PAYMENT_CURRENCY}, received ${paymentCurrency}.`,
//         );
//       }

//       console.log("Created Bakong payment:", createdPayment);

//       setPayment(createdPayment);
//       startCountdown(createdPayment.expiresAt);

//       // Professional message – no "test" wording
//       setPaymentMessage(
//         `Scan the QR code and complete the payment. After payment is completed, click Check Payment.`,
//       );
//     } catch (err) {
//       console.error("Create payment error:", err);
//       setPaymentError(err?.message || "Unable to create Bakong payment.");
//     } finally {
//       setIsCreatingPayment(false);
//     }
//   };

//   // ==========================================================
//   // CHECK PAYMENT
//   // ==========================================================

//   const checkPayment = async () => {
//     if (!payment || !selectedPlan) {
//       return;
//     }

//     if (!payment.md5) {
//       setPaymentError("Payment MD5 is missing.");
//       return;
//     }

//     if (countdown <= 0) {
//       setPaymentError("QR code has expired. Please generate a new QR code.");
//       return;
//     }

//     const user = auth.currentUser;

//     if (!user) {
//       setPaymentError("You are not authenticated. Please log in again.");
//       return;
//     }

//     if (isCheckingPayment) {
//       return;
//     }

//     setIsCheckingPayment(true);
//     setPaymentError("");
//     setPaymentSuccess(false);

//     // Clear old message while checking
//     setPaymentMessage("Checking Bakong payment...");

//     try {
//       const result = await subscriptionService.checkBakongPayment({
//         md5: payment.md5,
//         ownerId: user.uid,
//         planId: selectedPlan.id,
//       });

//       console.log("========================================");
//       console.log("BAKONG PAYMENT CHECK RESULT");
//       console.log("========================================");
//       console.log(result);
//       console.log("========================================");

//       // ======================================================
//       // PAYMENT NOT RECEIVED
//       // ======================================================
//       //
//       // IMPORTANT:
//       // success === true does NOT mean payment was successful.
//       //
//       // We ONLY accept:
//       //
//       // paid === true
//       //
//       // as an actual payment.
//       // ======================================================

//       if (!result || result.paid !== true) {
//         setPaymentSuccess(false);

//         setPaymentMessage(
//           result?.message ||
//             "Payment has not been received yet. Please complete the payment first.",
//         );

//         console.log("Payment NOT received yet.");

//         return;
//       }

//       // ======================================================
//       // PAYMENT VERIFIED
//       // ======================================================

//       const transaction = result.payment || {};

//       const transactionHash =
//         transaction.transactionHash || transaction.hash || "";

//       const receiver = transaction.receiver || transaction.toAccountId || "";

//       const sender = transaction.sender || transaction.fromAccountId || "";

//       const transactionAmount = Number(transaction.amount);

//       const transactionCurrency = String(
//         transaction.currency || "",
//       ).toUpperCase();

//       // ======================================================
//       // VERIFY TRANSACTION HASH
//       // ======================================================

//       if (!transactionHash) {
//         throw new Error(
//           "Bakong payment was detected, but transaction hash is missing.",
//         );
//       }

//       // ======================================================
//       // VERIFY AMOUNT
//       // ======================================================

//       if (transactionAmount !== TEST_PAYMENT_AMOUNT) {
//         throw new Error(
//           `Invalid Bakong payment amount. Expected ${TEST_PAYMENT_AMOUNT} ${TEST_PAYMENT_CURRENCY}, received ${transactionAmount} ${transactionCurrency}.`,
//         );
//       }

//       // ======================================================
//       // VERIFY CURRENCY
//       // ======================================================

//       if (transactionCurrency !== TEST_PAYMENT_CURRENCY) {
//         throw new Error(
//           `Invalid Bakong payment currency. Expected ${TEST_PAYMENT_CURRENCY}, received ${transactionCurrency}.`,
//         );
//       }

//       console.log("========================================");
//       console.log("BAKONG PAYMENT VERIFIED");
//       console.log("========================================");
//       console.log({
//         transactionHash,
//         receiver,
//         sender,
//         transactionAmount,
//         transactionCurrency,
//       });
//       console.log("========================================");

//       // ======================================================
//       // CREATE SUBSCRIPTION ONLY AFTER VERIFIED PAYMENT
//       // ======================================================

//       const subscriptionId = await subscriptionService.createPaidSubscription({
//         planId: selectedPlan.id,
//         planName: selectedPlan.name,

//         // Real subscription price
//         amount: getPlanPrice(selectedPlan),

//         paymentReference: payment.paymentReference || transactionHash,

//         bakongMd5: payment.md5,

//         transactionHash,

//         receiver,

//         sender,
//       });

//       console.log("Subscription created:", subscriptionId);

//       // ======================================================
//       // PAYMENT SUCCESS
//       // ======================================================

//       clearAllTimers();

//       setPaymentSuccess(true);

//       setPaymentMessage("Payment verified successfully.");

//       setShowCheckout(false);

//       setShowSuccess(true);

//       await loadData();
//     } catch (err) {
//       console.error("Check payment error:", err);

//       setPaymentSuccess(false);

//       setPaymentError(err?.message || "Unable to verify payment.");
//     } finally {
//       setIsCheckingPayment(false);
//     }
//   };

//   // ==========================================================
//   // CLOSE CHECKOUT
//   // ==========================================================
//   const closeCheckout = () => {
//     if (isCreatingPayment || isCheckingPayment) {
//       return;
//     }

//     clearAllTimers();
//     setShowCheckout(false);
//     setPayment(null);
//     setPaymentMessage("");
//     setPaymentError("");
//     setPaymentSuccess(false);
//     setCountdown(0);
//   };

//   // ==========================================================
//   // REGENERATE
//   // ==========================================================
//   const regeneratePayment = async () => {
//     clearAllTimers();
//     setPayment(null);
//     setPaymentError("");
//     setPaymentMessage("");
//     setPaymentSuccess(false);
//     setCountdown(0);
//     await openCheckout();
//   };

//   // ==========================================================
//   // LOADING
//   // ==========================================================
//   if (loading) {
//     return (
//       <div className="container-fluid py-5">
//         <div className="d-flex justify-content-center align-items-center py-5">
//           <div className="text-center">
//             <Loader2
//               size={42}
//               className="text-primary mb-3"
//               style={{ animation: "spin 1s linear infinite" }}
//             />
//             <div className="fw-semibold">Loading subscription plans...</div>
//             <div className="small text-muted mt-1">Please wait.</div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // ==========================================================
//   // ERROR
//   // ==========================================================
//   if (error) {
//     return (
//       <div className="container-fluid py-4">
//         <div
//           className="alert alert-danger d-flex align-items-start gap-3"
//           role="alert"
//         >
//           <AlertCircle size={22} className="flex-shrink-0 mt-1" />
//           <div className="flex-grow-1">
//             <div className="fw-bold">Unable to load subscription plans</div>
//             <div className="small mt-1">{error}</div>
//             <button
//               type="button"
//               className="btn btn-outline-danger btn-sm mt-3"
//               onClick={loadData}
//             >
//               <RefreshCw size={15} className="me-1" />
//               Try Again
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // ==========================================================
//   // MAIN
//   // ==========================================================
//   return (
//     <>
//       <style>
//         {`
//           @keyframes spin {
//             from { transform: rotate(0deg); }
//             to { transform: rotate(360deg); }
//           }

//           .subscription-plan-card {
//             transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
//           }

//           .subscription-plan-card:hover {
//             transform: translateY(-3px);
//           }

//           .subscription-plan-card.selected {
//             border-color: #0d6efd !important;
//             box-shadow:
//               0 0 0 3px rgba(13, 110, 253, 0.10),
//               0 12px 30px rgba(15, 23, 42, 0.08);
//           }

//           .subscription-feature {
//             display: flex;
//             align-items: flex-start;
//             gap: 9px;
//           }

//           .subscription-feature-icon {
//             width: 20px;
//             height: 20px;
//             flex-shrink: 0;
//             border-radius: 50%;
//             display: flex;
//             align-items: center;
//             justify-content: center;
//             background: #eaf7ee;
//             color: #198754;
//           }

//           .bakong-qr-wrapper {
//             width: 270px;
//             max-width: 100%;
//             aspect-ratio: 1;
//             background: white;
//             border-radius: 18px;
//             padding: 15px;
//             border: 1px solid #dee2e6;
//             box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
//           }

//           .payment-info-row {
//             display: flex;
//             justify-content: space-between;
//             align-items: flex-start;
//             gap: 20px;
//             padding: 11px 0;
//             border-bottom: 1px solid #f0f0f0;
//           }

//           .payment-info-row:last-child {
//             border-bottom: 0;
//           }

//           .payment-info-label {
//             color: #6c757d;
//             font-size: 13px;
//           }

//           .payment-info-value {
//             color: #212529;
//             font-size: 14px;
//             font-weight: 600;
//             text-align: right;
//             word-break: break-word;
//           }
//         `}
//       </style>

//       <div className="container-fluid py-4 px-3 px-lg-4">
//         {/* HEADER */}
//         <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
//           <div>
//             <div className="d-flex align-items-center gap-2 mb-2">
//               <div
//                 className="d-flex align-items-center justify-content-center rounded-3 bg-primary text-white"
//                 style={{ width: 42, height: 42 }}
//               >
//                 <Sparkles size={21} />
//               </div>
//               <div>
//                 <h2 className="fw-bold mb-0">Subscription</h2>
//                 <div className="text-muted small">
//                   Choose the plan that fits your property business.
//                 </div>
//               </div>
//             </div>
//           </div>

//           {isActive && (
//             <div className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 rounded-pill">
//               <CheckCircle2 size={15} className="me-1" />
//               Active Subscription
//             </div>
//           )}

//           {!isActive && isPending && (
//             <div className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-3 py-2 rounded-pill">
//               <Clock size={15} className="me-1" />
//               Pending Approval
//             </div>
//           )}
//         </div>

//         {/* CURRENT SUBSCRIPTION */}
//         {subscription && (
//           <div className="card border-0 shadow-sm rounded-4 mb-4">
//             <div className="card-body p-4">
//               <div className="row align-items-center g-4">
//                 <div className="col-lg-8">
//                   <div className="d-flex align-items-start gap-3">
//                     <div
//                       className={`rounded-3 d-flex align-items-center justify-content-center ${
//                         isActive
//                           ? "bg-success-subtle text-success"
//                           : "bg-warning-subtle text-warning-emphasis"
//                       }`}
//                       style={{ width: 48, height: 48 }}
//                     >
//                       {isActive ? (
//                         <CheckCircle2 size={24} />
//                       ) : (
//                         <Clock size={24} />
//                       )}
//                     </div>
//                     <div>
//                       <div className="small text-muted mb-1">
//                         Current subscription
//                       </div>
//                       <h5 className="fw-bold mb-1">
//                         {subscription.planName ||
//                           subscription.name ||
//                           "Subscription"}
//                       </h5>
//                       <div className="small text-muted">
//                         Status:{" "}
//                         <strong>{subscription.status || "Unknown"}</strong>
//                       </div>
//                     </div>
//                   </div>
//                 </div>

//                 <div className="col-lg-4 text-lg-end">
//                   {subscription.amount !== undefined && (
//                     <div>
//                       <div className="small text-muted">Subscription Price</div>
//                       <div className="fs-4 fw-bold">
//                         ${Number(subscription.amount || 0).toFixed(2)} USD
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               </div>

//               {isPending && (
//                 <div className="alert alert-warning mt-4 mb-0 d-flex align-items-start gap-2">
//                   <Clock size={18} className="mt-1 flex-shrink-0" />
//                   <div className="small">
//                     Your Bakong payment has been received and your subscription
//                     is waiting for administrator approval.
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         )}

//         {/* PLAN TITLE */}
//         <div className="mb-4">
//           <h4 className="fw-bold mb-1">Choose Your Plan</h4>
//           <p className="text-muted mb-0">
//             Select a subscription plan and pay securely using Bakong.
//           </p>
//         </div>

//         {/* EMPTY */}
//         {plans.length === 0 ? (
//           <div className="card border-0 shadow-sm rounded-4">
//             <div className="card-body text-center py-5">
//               <Building2 size={42} className="text-muted mb-3" />
//               <h5 className="fw-bold">No subscription plans</h5>
//               <p className="text-muted mb-0">
//                 There are currently no subscription plans available.
//               </p>
//             </div>
//           </div>
//         ) : (
//           <div className="row g-4">
//             {plans.map((plan) => {
//               const price = getPlanPrice(plan);
//               const features = getPlanFeatures(plan);
//               const selected = String(selectedPlanId) === String(plan.id);
//               const popular =
//                 plan.popular === true || plan.recommended === true;

//               return (
//                 <div className="col-12 col-md-6 col-xl-4" key={plan.id}>
//                   <div
//                     className={`card h-100 subscription-plan-card rounded-4 ${
//                       selected ? "selected" : ""
//                     }`}
//                     style={{ border: "1px solid #e5e7eb" }}
//                   >
//                     <div className="card-body p-4 d-flex flex-column">
//                       {popular && (
//                         <div className="mb-3">
//                           <span className="badge bg-primary-subtle text-primary px-3 py-2 rounded-pill">
//                             <Zap size={14} className="me-1" />
//                             Recommended
//                           </span>
//                         </div>
//                       )}

//                       <h4 className="fw-bold mb-2">
//                         {plan.name || "Subscription Plan"}
//                       </h4>

//                       <div className="d-flex align-items-baseline gap-1 mb-1">
//                         <span className="display-6 fw-bold">
//                           ${price.toFixed(2)}
//                         </span>
//                         <span className="text-muted">
//                           / {getBillingText(plan)}
//                         </span>
//                       </div>

//                       {plan.propertyLimit !== undefined && (
//                         <div className="small text-muted mb-4">
//                           <Building2 size={15} className="me-1" />
//                           Up to{" "}
//                           <strong>
//                             {Number(plan.propertyLimit) >= 999999
//                               ? "Unlimited"
//                               : plan.propertyLimit}
//                           </strong>{" "}
//                           properties
//                         </div>
//                       )}

//                       <div className="mb-4 flex-grow-1">
//                         {features.length > 0 ? (
//                           <div className="d-flex flex-column gap-3">
//                             {features.map((feature, index) => (
//                               <div
//                                 className="subscription-feature"
//                                 key={`${plan.id}-feature-${index}`}
//                               >
//                                 <div className="subscription-feature-icon">
//                                   <Check size={13} />
//                                 </div>
//                                 <span className="small text-secondary">
//                                   {feature}
//                                 </span>
//                               </div>
//                             ))}
//                           </div>
//                         ) : (
//                           <div className="small text-muted">
//                             Standard subscription features included.
//                           </div>
//                         )}
//                       </div>

//                       <button
//                         type="button"
//                         className={`btn w-100 py-2 fw-semibold ${
//                           selected ? "btn-primary" : "btn-outline-primary"
//                         }`}
//                         onClick={() => setSelectedPlanId(plan.id)}
//                         disabled={isPending || isActive}
//                       >
//                         {selected ? (
//                           <>
//                             <Check size={17} className="me-1" />
//                             Selected
//                           </>
//                         ) : (
//                           "Select Plan"
//                         )}
//                       </button>

//                       {selected && (
//                         <button
//                           type="button"
//                           className="btn btn-dark w-100 py-2 fw-semibold mt-2"
//                           onClick={openCheckout}
//                           disabled={isPending || isActive || isCreatingPayment}
//                         >
//                           <CreditCard size={17} className="me-1" />
//                           Pay with Bakong
//                         </button>
//                       )}

//                       {isActive && (
//                         <div className="small text-success text-center mt-3">
//                           You already have an active subscription.
//                         </div>
//                       )}

//                       {isPending && (
//                         <div className="small text-warning-emphasis text-center mt-3">
//                           Subscription approval is pending.
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>

//       {/* =======================================================
//           CHECKOUT MODAL
//       ======================================================== */}
//       {showCheckout && (
//         <div
//           className="modal d-block"
//           tabIndex="-1"
//           style={{ background: "rgba(15, 23, 42, 0.65)" }}
//         >
//           <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
//             <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
//               {/* HEADER */}
//               <div className="modal-header border-0 px-4 pt-4">
//                 <div>
//                   <div className="d-flex align-items-center gap-2 mb-1">
//                     <div
//                       className="bg-primary-subtle text-primary rounded-3 d-flex align-items-center justify-content-center"
//                       style={{ width: 38, height: 38 }}
//                     >
//                       <QrCode size={20} />
//                     </div>
//                     <h5 className="modal-title fw-bold">Bakong Payment</h5>
//                   </div>
//                   <div className="small text-muted">
//                     Complete your subscription payment securely.
//                   </div>
//                 </div>
//                 <button
//                   type="button"
//                   className="btn-close"
//                   onClick={closeCheckout}
//                   disabled={isCreatingPayment || isCheckingPayment}
//                 />
//               </div>

//               {/* BODY */}
//               <div className="modal-body px-4 pb-4">
//                 {/* CREATING */}
//                 {isCreatingPayment && (
//                   <div className="text-center py-5">
//                     <Loader2
//                       size={42}
//                       className="text-primary mb-3"
//                       style={{ animation: "spin 1s linear infinite" }}
//                     />
//                     <h5 className="fw-bold">Creating Bakong QR...</h5>
//                     <p className="text-muted small mb-0">Please wait.</p>
//                   </div>
//                 )}

//                 {/* ERROR */}
//                 {paymentError && (
//                   <div className="alert alert-danger d-flex align-items-start gap-2">
//                     <AlertCircle size={19} className="mt-1 flex-shrink-0" />
//                     <div className="small">{paymentError}</div>
//                   </div>
//                 )}

//                 {/* PAYMENT */}
//                 {!isCreatingPayment && payment && (
//                   <div>
//                     <div className="row g-4">
//                       {/* QR */}
//                       <div className="col-12 col-md-6">
//                         <div className="text-center">
//                           <div className="small fw-semibold text-muted mb-2">
//                             Scan with Bakong
//                           </div>
//                           <div className="bakong-qr-wrapper mx-auto d-flex align-items-center justify-content-center">
//                             <QRCodeSVG
//                               value={payment.qr}
//                               size={240}
//                               style={{ width: "100%", height: "100%" }}
//                             />
//                           </div>
//                           <div className="mt-3">
//                             <div
//                               className={`fw-bold ${
//                                 countdown > 0 ? "text-danger" : "text-secondary"
//                               }`}
//                             >
//                               {countdown > 0
//                                 ? `Expires in ${formatCountdown(countdown)}`
//                                 : "QR code expired"}
//                             </div>
//                           </div>
//                         </div>
//                       </div>

//                       {/* DETAILS */}
//                       <div className="col-12 col-md-6">
//                         <div className="card border rounded-4 h-100">
//                           <div className="card-body p-4">
//                             <div className="d-flex align-items-center gap-2 mb-3">
//                               <ShieldCheck size={19} className="text-success" />
//                               <div className="fw-bold">Payment Details</div>
//                             </div>

//                             <div className="payment-info-row">
//                               <div className="payment-info-label">Plan</div>
//                               <div className="payment-info-value">
//                                 {selectedPlan?.name || payment.planName || "-"}
//                               </div>
//                             </div>

//                             <div className="payment-info-row">
//                               <div className="payment-info-label">
//                                 Subscription Price
//                               </div>
//                               <div className="payment-info-value text-primary">
//                                 $
//                                 {Number(
//                                   payment.subscriptionAmount ??
//                                     getPlanPrice(selectedPlan),
//                                 ).toFixed(2)}{" "}
//                                 {payment.subscriptionCurrency ||
//                                   PAYMENT_CURRENCY}
//                               </div>
//                             </div>

//                             <div className="payment-info-row">
//                               <div className="payment-info-label">
//                                 Payment Method
//                               </div>
//                               <div className="payment-info-value">
//                                 {payment.paymentMethod || PAYMENT_METHOD}
//                               </div>
//                             </div>

//                             <div className="payment-info-row">
//                               <div className="payment-info-label">Merchant</div>
//                               <div className="payment-info-value">
//                                 {payment.merchantName || "RentEase"}
//                               </div>
//                             </div>

//                             <div className="payment-info-row">
//                               <div className="payment-info-label">
//                                 Bakong Account
//                               </div>
//                               <div className="payment-info-value">
//                                 {payment.bakongAccount ||
//                                   "Configured on server"}
//                               </div>
//                             </div>

//                             <div className="payment-info-row">
//                               <div className="payment-info-label">
//                                 Reference
//                               </div>
//                               <div className="payment-info-value">
//                                 {payment.paymentReference || "-"}
//                               </div>
//                             </div>
//                           </div>
//                         </div>
//                       </div>
//                     </div>

//                     {/* PROFESSIONAL PAYMENT SUMMARY (no "test" wording) */}
//                     <div className="card border-0 bg-light rounded-4 mt-4">
//                       <div className="card-body p-4">
//                         <div className="d-flex align-items-start gap-3">
//                           <div className="bg-primary text-white rounded-3 p-2">
//                             <CreditCard size={20} />
//                           </div>
//                           <div>
//                             <div className="fw-bold">Payment Summary</div>
//                             <div className="small text-secondary mt-1">
//                               Please pay the exact amount shown below.
//                             </div>

//                             <div className="small text-muted mt-1">
//                               Subscription price:{" "}
//                               <strong>
//                                 ${getPlanPrice(selectedPlan).toFixed(2)} USD
//                               </strong>
//                             </div>
//                           </div>
//                         </div>
//                       </div>
//                     </div>

//                     {/* INSTRUCTIONS */}
//                     <div className="alert alert-info mt-4 mb-3">
//                       <div className="d-flex align-items-start gap-2">
//                         <QrCode size={19} className="mt-1 flex-shrink-0" />
//                         <div>
//                           <div className="fw-bold mb-1">How to pay</div>
//                           <ol className="small mb-0 ps-3">
//                             <li>Open your Bakong-supported banking app.</li>
//                             <li>Scan the QR code.</li>
//                             <li>
//                               Confirm the amount and complete the payment.
//                             </li>
//                             <li>
//                               Return here and click{" "}
//                               <strong>Check Payment</strong>.
//                             </li>
//                           </ol>
//                         </div>
//                       </div>
//                     </div>

//                     {/* MESSAGE */}
//                     {paymentMessage && (
//                       <div
//                         className={`alert ${
//                           paymentSuccess ? "alert-success" : "alert-secondary"
//                         } d-flex align-items-start gap-2`}
//                       >
//                         {paymentSuccess ? (
//                           <CheckCircle2
//                             size={19}
//                             className="mt-1 flex-shrink-0"
//                           />
//                         ) : (
//                           <Clock size={19} className="mt-1 flex-shrink-0" />
//                         )}
//                         <div className="small">{paymentMessage}</div>
//                       </div>
//                     )}

//                     {/* ACTIONS */}
//                     <div className="d-flex flex-column flex-sm-row gap-2 mt-4">
//                       <button
//                         type="button"
//                         className="btn btn-outline-secondary flex-fill"
//                         onClick={closeCheckout}
//                         disabled={isCheckingPayment}
//                       >
//                         Cancel
//                       </button>

//                       {countdown <= 0 ? (
//                         <button
//                           type="button"
//                           className="btn btn-outline-primary flex-fill"
//                           onClick={regeneratePayment}
//                           disabled={isCreatingPayment || isCheckingPayment}
//                         >
//                           <RefreshCw size={17} className="me-1" />
//                           Generate New QR
//                         </button>
//                       ) : (
//                         <button
//                           type="button"
//                           className="btn btn-primary flex-fill"
//                           onClick={checkPayment}
//                           disabled={isCheckingPayment || paymentSuccess}
//                         >
//                           {isCheckingPayment ? (
//                             <>
//                               <Loader2
//                                 size={17}
//                                 className="me-1"
//                                 style={{
//                                   animation: "spin 1s linear infinite",
//                                 }}
//                               />
//                               Checking...
//                             </>
//                           ) : (
//                             <>
//                               <Check size={17} className="me-1" />
//                               Check Payment
//                             </>
//                           )}
//                         </button>
//                       )}
//                     </div>
//                   </div>
//                 )}

//                 {/* NO PAYMENT */}
//                 {!isCreatingPayment && !payment && !paymentError && (
//                   <div className="text-center py-5">
//                     <AlertCircle size={42} className="text-muted mb-3" />
//                     <h5 className="fw-bold">Payment QR unavailable</h5>
//                     <p className="text-muted small">
//                       We could not create the Bakong payment QR.
//                     </p>
//                     <button
//                       type="button"
//                       className="btn btn-primary"
//                       onClick={openCheckout}
//                     >
//                       <RefreshCw size={17} className="me-1" />
//                       Try Again
//                     </button>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* =======================================================
//           SUCCESS MODAL
//       ======================================================== */}
//       {showSuccess && (
//         <div
//           className="modal d-block"
//           tabIndex="-1"
//           style={{ background: "rgba(15, 23, 42, 0.65)" }}
//         >
//           <div className="modal-dialog modal-dialog-centered">
//             <div className="modal-content border-0 rounded-4 shadow-lg">
//               <div className="modal-body text-center p-5">
//                 <div
//                   className="mx-auto mb-4 rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center"
//                   style={{ width: 76, height: 76 }}
//                 >
//                   <CheckCircle2 size={42} />
//                 </div>

//                 <h3 className="fw-bold mb-2">Payment Successful</h3>
//                 <p className="text-muted mb-4">
//                   Your Bakong payment has been successfully verified.
//                 </p>

//                 <div className="card border-0 bg-light rounded-4 mb-4">
//                   <div className="card-body p-3">
//                     <div className="small text-muted">Subscription price</div>
//                     <div className="fw-bold mb-2">
//                       ${getPlanPrice(selectedPlan).toFixed(2)} USD
//                     </div>

//                     <div className="small text-muted mt-3">
//                       Your subscription is now waiting for administrator
//                       approval.
//                     </div>
//                   </div>
//                 </div>

//                 <div className="d-flex align-items-center justify-content-center gap-2 small text-success mb-4">
//                   <ShieldCheck size={16} />
//                   Bakong transaction verified
//                 </div>

//                 <button
//                   type="button"
//                   className="btn btn-primary px-4"
//                   onClick={() => setShowSuccess(false)}
//                 >
//                   Done
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }

import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Crown,
  Gem,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { subscriptionService } from "../../services/subscriptionService";
import { auth } from "../../services/firebase";

// ============================================================
// CONSTANTS
// PAYMENT LOGIC - DO NOT CHANGE
// ============================================================
const PAYMENT_CURRENCY = "USD";
const PAYMENT_METHOD = "Bakong";
const TEST_PAYMENT_AMOUNT = 100;
const TEST_PAYMENT_CURRENCY = "KHR";

// ============================================================
// COMPONENT
// ============================================================
export default function OwnerSubscription() {
  // ==========================================================
  // DATA
  // ==========================================================
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================================
  // PLAN
  // ==========================================================
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  // ==========================================================
  // CHECKOUT
  // ==========================================================
  const [showCheckout, setShowCheckout] = useState(false);
  const [payment, setPayment] = useState(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // ==========================================================
  // COUNTDOWN
  // ==========================================================
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);

  // ==========================================================
  // AUTH + LOAD
  // ==========================================================
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log("Firebase auth user:", user?.uid || "NO USER");

      if (user) {
        loadData();
      } else {
        setLoading(false);
        setError("You are not authenticated. Please log in again.");
      }
    });

    return () => {
      unsubscribe();
      clearAllTimers();
    };
  }, []);

  // ==========================================================
  // LOAD DATA
  // ==========================================================
  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const user = auth.currentUser;

      if (!user?.uid) {
        throw new Error(
          "User authentication is not ready. Please log in again.",
        );
      }

      const [plansResult, subscriptionResult] = await Promise.all([
        subscriptionService.getPlans(),
        subscriptionService.getOwnerSubscription(user.uid),
      ]);

      const loadedPlans = Array.isArray(plansResult) ? plansResult : [];

      setPlans(loadedPlans);
      setSubscription(subscriptionResult || null);

      if (loadedPlans.length > 0) {
        const recommendedPlan =
          loadedPlans.find(
            (plan) => plan.recommended === true || plan.popular === true,
          ) || loadedPlans[0];

        setSelectedPlanId(recommendedPlan.id);
      }
    } catch (err) {
      console.error("Failed to load subscription data:", err);
      setError(err?.message || "Failed to load subscription plans.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // TIMERS
  // ==========================================================
  const clearAllTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // ==========================================================
  // SELECTED PLAN
  // ==========================================================
  const selectedPlan =
    plans.find((plan) => String(plan.id) === String(selectedPlanId)) || null;

  // ==========================================================
  // PRICE
  // ==========================================================
  const getPlanPrice = (plan) => {
    const price = Number(plan?.price);
    return Number.isFinite(price) ? price : 0;
  };

  // ==========================================================
  // FEATURES
  // ==========================================================
  const getPlanFeatures = (plan) => {
    if (Array.isArray(plan?.features)) {
      return plan.features;
    }

    if (typeof plan?.features === "string") {
      return plan.features
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  };

  // ==========================================================
  // BILLING
  // ==========================================================
  const getBillingText = (plan) => {
    const billing = String(plan?.billing || "month").toLowerCase();

    if (billing === "monthly" || billing === "month") {
      return "month";
    }

    if (billing === "yearly" || billing === "year") {
      return "year";
    }

    return billing;
  };

  // ==========================================================
  // STATUS
  // ==========================================================
  const subscriptionStatus = String(subscription?.status || "").toLowerCase();

  const isPending = subscriptionStatus === "pending";

  const isActive =
    subscriptionStatus === "active" || subscriptionStatus === "approved";

  // ==========================================================
  // COUNTDOWN
  // ==========================================================
  const formatCountdown = (seconds) => {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;

    return (
      `${String(minutes).padStart(2, "0")}:` +
      `${String(secs).padStart(2, "0")}`
    );
  };

  // ==========================================================
  // START COUNTDOWN
  // ==========================================================
  const startCountdown = (expiresAt) => {
    clearAllTimers();

    const expiration = Number(expiresAt);

    if (!Number.isFinite(expiration)) {
      setCountdown(0);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.floor((expiration - Date.now()) / 1000),
      );

      setCountdown(remaining);

      if (remaining <= 0) {
        clearAllTimers();

        setPaymentMessage("QR code has expired. Please generate a new one.");
      }
    };

    updateCountdown();

    timerRef.current = setInterval(updateCountdown, 1000);
  };

  // ==========================================================
  // OPEN CHECKOUT
  // ==========================================================
  const openCheckout = async () => {
    if (!selectedPlan) {
      setPaymentError("Please select a subscription plan.");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      setPaymentError("You are not authenticated. Please log in again.");
      return;
    }

    clearAllTimers();

    setShowCheckout(true);
    setPayment(null);
    setPaymentMessage("");
    setPaymentError("");
    setPaymentSuccess(false);
    setShowSuccess(false);
    setIsCreatingPayment(true);
    setCountdown(0);

    try {
      const createdPayment = await subscriptionService.createBakongPayment({
        planId: selectedPlan.id,
        planName: selectedPlan.name,

        // REAL PLAN PRICE
        amount: getPlanPrice(selectedPlan),
      });

      if (!createdPayment) {
        throw new Error("Payment server returned empty payment data.");
      }

      if (!createdPayment.qr) {
        throw new Error("Bakong QR code was not returned by the server.");
      }

      if (!createdPayment.md5) {
        throw new Error("Bakong payment MD5 was not returned by the server.");
      }

      if (!createdPayment.expiresAt) {
        throw new Error(
          "Bakong payment expiration time was not returned by the server.",
        );
      }

      // ====================================================
      // VERIFY PAYMENT DATA
      // ====================================================
      const paymentAmount = Number(createdPayment.paymentAmount);

      const paymentCurrency = String(
        createdPayment.paymentCurrency || "",
      ).toUpperCase();

      if (paymentAmount !== TEST_PAYMENT_AMOUNT) {
        throw new Error(
          `Server returned incorrect test payment amount. Expected ${TEST_PAYMENT_AMOUNT} ${TEST_PAYMENT_CURRENCY}, received ${paymentAmount} ${paymentCurrency}.`,
        );
      }

      if (paymentCurrency !== TEST_PAYMENT_CURRENCY) {
        throw new Error(
          `Server returned incorrect test payment currency. Expected ${TEST_PAYMENT_CURRENCY}, received ${paymentCurrency}.`,
        );
      }

      console.log("Created Bakong payment:", createdPayment);

      setPayment(createdPayment);

      startCountdown(createdPayment.expiresAt);

      setPaymentMessage(
        `Scan the QR code and complete the payment. After payment is completed, click Check Payment.`,
      );
    } catch (err) {
      console.error("Create payment error:", err);

      setPaymentError(err?.message || "Unable to create Bakong payment.");
    } finally {
      setIsCreatingPayment(false);
    }
  };

  // ==========================================================
  // CHECK PAYMENT
  // ==========================================================
  const checkPayment = async () => {
    if (!payment || !selectedPlan) {
      return;
    }

    if (!payment.md5) {
      setPaymentError("Payment MD5 is missing.");
      return;
    }

    if (countdown <= 0) {
      setPaymentError("QR code has expired. Please generate a new QR code.");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      setPaymentError("You are not authenticated. Please log in again.");
      return;
    }

    if (isCheckingPayment) {
      return;
    }

    setIsCheckingPayment(true);
    setPaymentError("");
    setPaymentSuccess(false);

    setPaymentMessage("Checking Bakong payment...");

    try {
      const result = await subscriptionService.checkBakongPayment({
        md5: payment.md5,
        ownerId: user.uid,
        planId: selectedPlan.id,
      });

      console.log("========================================");
      console.log("BAKONG PAYMENT CHECK RESULT");
      console.log("========================================");
      console.log(result);
      console.log("========================================");

      // ======================================================
      // PAYMENT NOT RECEIVED
      // ======================================================

      if (!result || result.paid !== true) {
        setPaymentSuccess(false);

        setPaymentMessage(
          result?.message ||
            "Payment has not been received yet. Please complete the payment first.",
        );

        console.log("Payment NOT received yet.");

        return;
      }

      // ======================================================
      // PAYMENT VERIFIED
      // ======================================================

      const transaction = result.payment || {};

      const transactionHash =
        transaction.transactionHash || transaction.hash || "";

      const receiver = transaction.receiver || transaction.toAccountId || "";

      const sender = transaction.sender || transaction.fromAccountId || "";

      const transactionAmount = Number(transaction.amount);

      const transactionCurrency = String(
        transaction.currency || "",
      ).toUpperCase();

      // ======================================================
      // VERIFY TRANSACTION HASH
      // ======================================================

      if (!transactionHash) {
        throw new Error(
          "Bakong payment was detected, but transaction hash is missing.",
        );
      }

      // ======================================================
      // VERIFY AMOUNT
      // ======================================================

      if (transactionAmount !== TEST_PAYMENT_AMOUNT) {
        throw new Error(
          `Invalid Bakong payment amount. Expected ${TEST_PAYMENT_AMOUNT} ${TEST_PAYMENT_CURRENCY}, received ${transactionAmount} ${transactionCurrency}.`,
        );
      }

      // ======================================================
      // VERIFY CURRENCY
      // ======================================================

      if (transactionCurrency !== TEST_PAYMENT_CURRENCY) {
        throw new Error(
          `Invalid Bakong payment currency. Expected ${TEST_PAYMENT_CURRENCY}, received ${transactionCurrency}.`,
        );
      }

      console.log("========================================");
      console.log("BAKONG PAYMENT VERIFIED");
      console.log("========================================");

      console.log({
        transactionHash,
        receiver,
        sender,
        transactionAmount,
        transactionCurrency,
      });

      console.log("========================================");

      // ======================================================
      // CREATE SUBSCRIPTION ONLY AFTER VERIFIED PAYMENT
      // ======================================================

      const subscriptionId = await subscriptionService.createPaidSubscription({
        planId: selectedPlan.id,
        planName: selectedPlan.name,

        // Real subscription price
        amount: getPlanPrice(selectedPlan),

        paymentReference: payment.paymentReference || transactionHash,

        bakongMd5: payment.md5,

        transactionHash,

        receiver,

        sender,
      });

      console.log("Subscription created:", subscriptionId);

      // ======================================================
      // PAYMENT SUCCESS
      // ======================================================

      clearAllTimers();

      setPaymentSuccess(true);

      setPaymentMessage("Payment verified successfully.");

      setShowCheckout(false);

      setShowSuccess(true);

      await loadData();
    } catch (err) {
      console.error("Check payment error:", err);

      setPaymentSuccess(false);

      setPaymentError(err?.message || "Unable to verify payment.");
    } finally {
      setIsCheckingPayment(false);
    }
  };

  // ==========================================================
  // CLOSE CHECKOUT
  // ==========================================================
  const closeCheckout = () => {
    if (isCreatingPayment || isCheckingPayment) {
      return;
    }

    clearAllTimers();

    setShowCheckout(false);
    setPayment(null);
    setPaymentMessage("");
    setPaymentError("");
    setPaymentSuccess(false);
    setCountdown(0);
  };

  // ==========================================================
  // REGENERATE
  // ==========================================================
  const regeneratePayment = async () => {
    clearAllTimers();

    setPayment(null);
    setPaymentError("");
    setPaymentMessage("");
    setPaymentSuccess(false);
    setCountdown(0);

    await openCheckout();
  };

  // ==========================================================
  // LOADING
  // ==========================================================
  if (loading) {
    return (
      <div className="container-fluid py-5">
        <div className="d-flex justify-content-center align-items-center py-5">
          <div className="text-center">
            <Loader2
              size={42}
              className="text-primary mb-3"
              style={{
                animation: "spin 1s linear infinite",
              }}
            />

            <div className="fw-semibold">Loading subscription plans...</div>

            <div className="small text-muted mt-1">Please wait.</div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================
  if (error) {
    return (
      <div className="container-fluid py-4">
        <div
          className="alert alert-danger d-flex align-items-start gap-3"
          role="alert"
        >
          <AlertCircle size={22} className="flex-shrink-0 mt-1" />

          <div className="flex-grow-1">
            <div className="fw-bold">Unable to load subscription plans</div>

            <div className="small mt-1">{error}</div>

            <button
              type="button"
              className="btn btn-outline-danger btn-sm mt-3"
              onClick={loadData}
            >
              <RefreshCw size={15} className="me-1" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // MAIN UI
  // ==========================================================
  return (
    <>
      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }

          .subscription-page {
            background:
              radial-gradient(
                circle at 10% 0%,
                rgba(13, 110, 253, 0.06),
                transparent 30%
              ),
              #f8fafc;
            min-height: 100%;
          }

          .subscription-hero {
            position: relative;
            overflow: hidden;
            border-radius: 28px;
            background:
              linear-gradient(
                135deg,
                #111827 0%,
                #1e293b 45%,
                #312e81 100%
              );
            color: white;
            box-shadow:
              0 20px 50px rgba(15, 23, 42, 0.14);
          }

          .subscription-hero::before {
            content: "";
            position: absolute;
            width: 280px;
            height: 280px;
            border-radius: 50%;
            right: -90px;
            top: -120px;
            background: rgba(255, 255, 255, 0.08);
          }

          .subscription-hero::after {
            content: "";
            position: absolute;
            width: 180px;
            height: 180px;
            border-radius: 50%;
            right: 160px;
            bottom: -130px;
            background: rgba(129, 140, 248, 0.15);
          }

          .subscription-hero-content {
            position: relative;
            z-index: 2;
          }

          .hero-icon {
            width: 52px;
            height: 52px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.12);
            border: 1px solid rgba(255, 255, 255, 0.16);
            backdrop-filter: blur(10px);
          }

          .hero-trust-item {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            padding: 8px 12px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.10);
            font-size: 12px;
            color: rgba(255, 255, 255, 0.85);
          }

          .current-subscription-card {
            border: 1px solid #e2e8f0;
            border-radius: 22px;
            background: white;
            box-shadow:
              0 10px 30px rgba(15, 23, 42, 0.05);
          }

          .current-plan-icon {
            width: 52px;
            height: 52px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .section-label {
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #64748b;
          }

          .pricing-card {
            position: relative;
            height: 100%;
            border: 1px solid #e2e8f0;
            border-radius: 24px;
            background: #ffffff;
            overflow: hidden;
            transition:
              transform 0.22s ease,
              box-shadow 0.22s ease,
              border-color 0.22s ease;
          }

          .pricing-card:hover {
            transform: translateY(-5px);
            box-shadow:
              0 20px 45px rgba(15, 23, 42, 0.10);
          }

          .pricing-card.selected {
            border-color: #4f46e5 !important;
            box-shadow:
              0 0 0 3px rgba(79, 70, 229, 0.10),
              0 20px 45px rgba(15, 23, 42, 0.10);
          }

          .pricing-card.recommended {
            border-color: #6366f1;
          }

          .pricing-top-line {
            height: 4px;
            width: 100%;
            background: #e2e8f0;
          }

          .pricing-card.recommended .pricing-top-line {
            background:
              linear-gradient(
                90deg,
                #4f46e5,
                #7c3aed,
                #8b5cf6
              );
          }

          .recommended-badge {
            position: absolute;
            top: 20px;
            right: 20px;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 6px 10px;
            border-radius: 999px;
            background: #eef2ff;
            color: #4f46e5;
            border: 1px solid #c7d2fe;
            font-size: 11px;
            font-weight: 700;
          }

          .plan-icon {
            width: 46px;
            height: 46px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f1f5f9;
            color: #475569;
          }

          .pricing-card.recommended .plan-icon {
            background: #eef2ff;
            color: #4f46e5;
          }

          .price-value {
            font-size: 42px;
            line-height: 1;
            letter-spacing: -0.04em;
            font-weight: 800;
            color: #0f172a;
          }

          .price-period {
            color: #64748b;
            font-size: 14px;
          }

          .property-limit {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 11px 13px;
            border-radius: 12px;
            background: #f8fafc;
            color: #475569;
            font-size: 13px;
          }

          .feature-list {
            display: flex;
            flex-direction: column;
            gap: 13px;
          }

          .feature-item {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            color: #475569;
            font-size: 13px;
            line-height: 1.45;
          }

          .feature-check {
            width: 21px;
            height: 21px;
            flex: 0 0 21px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: #ecfdf3;
            color: #16a34a;
          }

          .selected-plan-label {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-size: 11px;
            font-weight: 700;
            color: #4f46e5;
            background: #eef2ff;
            border-radius: 999px;
            padding: 5px 9px;
          }

          .payment-security {
            border: 1px solid #e2e8f0;
            background: #ffffff;
            border-radius: 18px;
          }

          .payment-security-item {
            display: flex;
            align-items: center;
            gap: 9px;
            color: #475569;
            font-size: 12px;
          }

          .bakong-qr-wrapper {
            width: 290px;
            max-width: 100%;
            aspect-ratio: 1;
            background: white;
            border-radius: 22px;
            padding: 18px;
            border: 1px solid #e2e8f0;
            box-shadow:
              0 18px 40px rgba(15, 23, 42, 0.10);
          }

          .payment-info-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
            padding: 13px 0;
            border-bottom: 1px solid #f1f5f9;
          }

          .payment-info-row:last-child {
            border-bottom: 0;
          }

          .payment-info-label {
            color: #64748b;
            font-size: 12px;
            font-weight: 500;
          }

          .payment-info-value {
            color: #0f172a;
            font-size: 13px;
            font-weight: 700;
            text-align: right;
            word-break: break-word;
          }

          .checkout-summary {
            border: 1px solid #e2e8f0;
            border-radius: 18px;
            background: #f8fafc;
          }

          .checkout-price {
            font-size: 30px;
            font-weight: 800;
            letter-spacing: -0.03em;
            color: #0f172a;
          }

          .success-icon {
            width: 82px;
            height: 82px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ecfdf3;
            color: #16a34a;
            margin: 0 auto;
          }

          @media (max-width: 767.98px) {
            .subscription-hero {
              border-radius: 22px;
            }

            .price-value {
              font-size: 36px;
            }

            .recommended-badge {
              position: static;
              margin-bottom: 15px;
            }
          }
        `}
      </style>

      <div className="subscription-page">
        <div className="container-fluid py-4 px-3 px-lg-4">
          {/* ==================================================
              HERO
          ================================================== */}
          <div className="subscription-hero mb-4">
            <div className="subscription-hero-content p-4 p-lg-5">
              <div className="row align-items-center g-4">
                <div className="col-lg-8">
                  <div className="d-flex align-items-start gap-3">
                    <div className="hero-icon flex-shrink-0">
                      <Sparkles size={25} />
                    </div>

                    <div>
                      <div
                        className="small fw-semibold mb-2"
                        style={{
                          color: "rgba(255,255,255,0.65)",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        RentEase for Property Owners
                      </div>

                      <h1 className="fw-bold mb-2">
                        Choose the right plan for your business
                      </h1>

                      <p
                        className="mb-4"
                        style={{
                          maxWidth: 650,
                          color: "rgba(255,255,255,0.72)",
                        }}
                      >
                        Manage properties, bookings, renters, and business
                        activity with a subscription designed around your
                        property portfolio.
                      </p>

                      <div className="d-flex flex-wrap gap-2">
                        <div className="hero-trust-item">
                          <ShieldCheck size={14} />
                          Secure payments
                        </div>

                        <div className="hero-trust-item">
                          <Building2 size={14} />
                          Property management
                        </div>

                        <div className="hero-trust-item">
                          <Users size={14} />
                          Business insights
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-lg-4 d-none d-lg-flex justify-content-end">
                  <div
                    className="text-end"
                    style={{
                      maxWidth: 250,
                      color: "rgba(255,255,255,0.70)",
                    }}
                  >
                    <Gem
                      size={42}
                      className="mb-3"
                      style={{
                        color: "#c4b5fd",
                      }}
                    />

                    <div className="fw-bold text-white mb-1">
                      Simple, transparent pricing
                    </div>

                    <div className="small">
                      Select a plan that matches the scale of your property
                      business.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ==================================================
              CURRENT SUBSCRIPTION
          ================================================== */}
          {subscription && (
            <div className="current-subscription-card mb-5">
              <div className="p-4 p-lg-4">
                <div className="row align-items-center g-4">
                  <div className="col-lg-7">
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className="current-plan-icon"
                        style={{
                          background: isActive ? "#ecfdf3" : "#fff7ed",
                          color: isActive ? "#16a34a" : "#ea580c",
                        }}
                      >
                        {isActive ? (
                          <CheckCircle2 size={25} />
                        ) : (
                          <Clock size={25} />
                        )}
                      </div>

                      <div>
                        <div className="section-label mb-1">
                          Your current subscription
                        </div>

                        <h5 className="fw-bold mb-1">
                          {subscription.planName ||
                            subscription.name ||
                            "Subscription"}
                        </h5>

                        <div className="small text-muted">
                          Status:{" "}
                          <span className="fw-semibold">
                            {subscription.status || "Unknown"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-5">
                    <div className="d-flex justify-content-lg-end align-items-center gap-3">
                      {subscription.amount !== undefined && (
                        <div className="text-lg-end">
                          <div className="small text-muted mb-1">
                            Subscription price
                          </div>

                          <div className="fs-4 fw-bold">
                            ${Number(subscription.amount || 0).toFixed(2)} USD
                          </div>
                        </div>
                      )}

                      {isActive && (
                        <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 rounded-pill">
                          <CheckCircle2 size={14} className="me-1" />
                          Active
                        </span>
                      )}

                      {isPending && (
                        <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-3 py-2 rounded-pill">
                          <Clock size={14} className="me-1" />
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isPending && (
                  <div className="alert alert-warning mt-4 mb-0 d-flex align-items-start gap-2">
                    <Clock size={18} className="mt-1 flex-shrink-0" />

                    <div className="small">
                      Your Bakong payment has been received and your
                      subscription is waiting for administrator approval.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================
              PRICING HEADER
          ================================================== */}
          <div className="text-center mb-5">
            <div className="section-label mb-2">Subscription plans</div>

            <h2 className="fw-bold mb-2">Choose Your Plan</h2>

            <p
              className="text-muted mx-auto mb-0"
              style={{
                maxWidth: 650,
              }}
            >
              Select the plan that fits your property portfolio. Upgrade your
              management capabilities as your business grows.
            </p>
          </div>

          {/* ==================================================
              EMPTY
          ================================================== */}
          {plans.length === 0 ? (
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body text-center py-5">
                <Building2 size={46} className="text-muted mb-3" />

                <h5 className="fw-bold">No subscription plans</h5>

                <p className="text-muted mb-0">
                  There are currently no subscription plans available.
                </p>
              </div>
            </div>
          ) : (
            <div className="row g-4 align-items-stretch">
              {plans.map((plan) => {
                const price = getPlanPrice(plan);
                const features = getPlanFeatures(plan);

                const selected = String(selectedPlanId) === String(plan.id);

                const popular =
                  plan.popular === true || plan.recommended === true;

                const propertyLimit = Number(plan.propertyLimit);

                return (
                  <div className="col-12 col-md-6 col-xl-4" key={plan.id}>
                    <div
                      className={`pricing-card ${selected ? "selected" : ""} ${
                        popular ? "recommended" : ""
                      }`}
                    >
                      <div className="pricing-top-line" />

                      <div className="p-4 p-lg-4 d-flex flex-column h-100">
                        {/* RECOMMENDED */}
                        {popular && (
                          <div className="recommended-badge">
                            <Star size={12} fill="currentColor" />
                            Most popular
                          </div>
                        )}

                        {/* PLAN ICON */}
                        <div className="mb-3">
                          <div className="plan-icon">
                            {popular ? <Crown size={22} /> : <Zap size={22} />}
                          </div>
                        </div>

                        {/* PLAN NAME */}
                        <div className="d-flex align-items-center justify-content-between gap-2">
                          <h4 className="fw-bold mb-1">
                            {plan.name || "Subscription Plan"}
                          </h4>

                          {selected && (
                            <span className="selected-plan-label">
                              <Check size={11} />
                              Selected
                            </span>
                          )}
                        </div>

                        <p
                          className="text-muted small mb-4"
                          style={{
                            minHeight: 38,
                          }}
                        >
                          {plan.description ||
                            (popular
                              ? "A balanced plan for growing property businesses."
                              : "Essential tools to manage your rental properties.")}
                        </p>

                        {/* PRICE */}
                        <div className="mb-4">
                          <div className="d-flex align-items-end gap-2">
                            <span className="price-value">
                              ${price.toFixed(2)}
                            </span>

                            <span className="price-period mb-1">
                              / {getBillingText(plan)}
                            </span>
                          </div>

                          {getBillingText(plan) === "year" && (
                            <div className="small text-success fw-semibold mt-2">
                              Annual billing
                            </div>
                          )}
                        </div>

                        {/* PROPERTY LIMIT */}
                        {plan.propertyLimit !== undefined && (
                          <div className="property-limit mb-4">
                            <Building2 size={17} />

                            <span>
                              Manage up to{" "}
                              <strong>
                                {propertyLimit >= 999999
                                  ? "Unlimited"
                                  : propertyLimit}
                              </strong>{" "}
                              properties
                            </span>
                          </div>
                        )}

                        {/* DIVIDER */}
                        <div
                          className="border-top mb-4"
                          style={{
                            borderColor: "#e2e8f0",
                          }}
                        />

                        {/* FEATURES */}
                        <div className="flex-grow-1">
                          <div className="small fw-bold text-dark mb-3">
                            What's included
                          </div>

                          {features.length > 0 ? (
                            <div className="feature-list">
                              {features.map((feature, index) => (
                                <div
                                  className="feature-item"
                                  key={`${plan.id}-feature-${index}`}
                                >
                                  <div className="feature-check">
                                    <Check size={12} strokeWidth={3} />
                                  </div>

                                  <span>{feature}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="small text-muted">
                              Standard subscription features included.
                            </div>
                          )}
                        </div>

                        {/* ACTION */}
                        <div className="mt-4 pt-2">
                          <button
                            type="button"
                            className={`btn w-100 py-2 fw-semibold rounded-3 ${
                              selected ? "btn-primary" : "btn-outline-primary"
                            }`}
                            onClick={() => setSelectedPlanId(plan.id)}
                            disabled={isPending || isActive}
                          >
                            {selected ? (
                              <>
                                <Check size={17} className="me-1" />
                                Selected Plan
                              </>
                            ) : (
                              "Select Plan"
                            )}
                          </button>

                          {selected && (
                            <button
                              type="button"
                              className="btn btn-dark w-100 py-2 fw-semibold rounded-3 mt-2"
                              onClick={openCheckout}
                              disabled={
                                isPending || isActive || isCreatingPayment
                              }
                            >
                              <CreditCard size={17} className="me-1" />
                              Continue with Bakong
                            </button>
                          )}
                        </div>

                        {/* STATUS */}
                        {isActive && (
                          <div className="small text-success text-center mt-3">
                            You already have an active subscription.
                          </div>
                        )}

                        {isPending && (
                          <div className="small text-warning-emphasis text-center mt-3">
                            Subscription approval is pending.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ==================================================
              TRUST / PAYMENT INFO
          ================================================== */}
          {plans.length > 0 && (
            <div className="payment-security mt-5">
              <div className="p-4">
                <div className="row align-items-center g-4">
                  <div className="col-lg-5">
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className="rounded-3 bg-primary-subtle text-primary d-flex align-items-center justify-content-center"
                        style={{
                          width: 44,
                          height: 44,
                        }}
                      >
                        <ShieldCheck size={21} />
                      </div>

                      <div>
                        <div className="fw-bold">
                          Secure subscription payment
                        </div>

                        <div className="small text-muted">
                          Payments are verified through Bakong before
                          activation.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-7">
                    <div className="d-flex flex-wrap justify-content-lg-end gap-3">
                      <div className="payment-security-item">
                        <CheckCircle2 size={16} className="text-success" />
                        Bakong payment
                      </div>

                      <div className="payment-security-item">
                        <CheckCircle2 size={16} className="text-success" />
                        Payment verification
                      </div>

                      <div className="payment-security-item">
                        <CheckCircle2 size={16} className="text-success" />
                        Administrator approval
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          CHECKOUT MODAL
      ====================================================== */}
      {showCheckout && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{
            background: "rgba(15, 23, 42, 0.72)",
          }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
            <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
              {/* HEADER */}
              <div className="modal-header border-0 px-4 px-lg-5 pt-4">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div
                      className="bg-primary-subtle text-primary rounded-3 d-flex align-items-center justify-content-center"
                      style={{
                        width: 42,
                        height: 42,
                      }}
                    >
                      <QrCode size={21} />
                    </div>

                    <div>
                      <h5 className="modal-title fw-bold mb-0">
                        Complete your subscription
                      </h5>

                      <div className="small text-muted">
                        Secure payment with Bakong
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-close"
                  onClick={closeCheckout}
                  disabled={isCreatingPayment || isCheckingPayment}
                />
              </div>

              {/* BODY */}
              <div className="modal-body px-4 px-lg-5 pb-5">
                {/* CREATING */}
                {isCreatingPayment && (
                  <div className="text-center py-5">
                    <div
                      className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center mx-auto mb-4"
                      style={{
                        width: 70,
                        height: 70,
                      }}
                    >
                      <Loader2
                        size={34}
                        style={{
                          animation: "spin 1s linear infinite",
                        }}
                      />
                    </div>

                    <h5 className="fw-bold">Preparing your payment</h5>

                    <p className="text-muted small mb-0">
                      Creating a secure Bakong QR code.
                    </p>
                  </div>
                )}

                {/* ERROR */}
                {paymentError && (
                  <div className="alert alert-danger d-flex align-items-start gap-2 rounded-3">
                    <AlertCircle size={19} className="mt-1 flex-shrink-0" />

                    <div className="small">{paymentError}</div>
                  </div>
                )}

                {/* PAYMENT */}
                {!isCreatingPayment && payment && (
                  <div>
                    {/* TOP SUMMARY */}
                    <div className="checkout-summary p-3 p-lg-4 mb-4">
                      <div className="row align-items-center g-3">
                        <div className="col-md-7">
                          <div className="small text-muted mb-1">
                            Selected subscription
                          </div>

                          <div className="fw-bold fs-5">
                            {selectedPlan?.name || payment.planName || "-"}
                          </div>

                          <div className="small text-muted mt-1">
                            Your subscription will be created after successful
                            payment verification.
                          </div>
                        </div>

                        <div className="col-md-5 text-md-end">
                          <div className="small text-muted">
                            Subscription price
                          </div>

                          <div className="checkout-price">
                            $
                            {Number(
                              payment.subscriptionAmount ??
                                getPlanPrice(selectedPlan),
                            ).toFixed(2)}
                          </div>

                          <div className="small text-muted">
                            {payment.subscriptionCurrency || PAYMENT_CURRENCY}
                            {" / "}
                            {getBillingText(selectedPlan)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="row g-4">
                      {/* QR */}
                      <div className="col-12 col-md-6">
                        <div className="text-center">
                          <div className="section-label mb-2">Payment QR</div>

                          <div className="small text-muted mb-3">
                            Scan with a Bakong-supported banking app
                          </div>

                          <div className="bakong-qr-wrapper mx-auto d-flex align-items-center justify-content-center">
                            <QRCodeSVG
                              value={payment.qr}
                              size={250}
                              style={{
                                width: "100%",
                                height: "100%",
                              }}
                            />
                          </div>

                          <div className="mt-3">
                            <div
                              className={`fw-bold ${
                                countdown > 0 ? "text-danger" : "text-secondary"
                              }`}
                            >
                              {countdown > 0
                                ? `Expires in ${formatCountdown(countdown)}`
                                : "QR code expired"}
                            </div>

                            <div className="small text-muted mt-1">
                              Please complete the payment before the QR expires.
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* DETAILS */}
                      <div className="col-12 col-md-6">
                        <div className="card border rounded-4 h-100">
                          <div className="card-body p-4">
                            <div className="d-flex align-items-center gap-2 mb-3">
                              <ShieldCheck size={19} className="text-success" />

                              <div className="fw-bold">Payment details</div>
                            </div>

                            <div className="payment-info-row">
                              <div className="payment-info-label">Plan</div>

                              <div className="payment-info-value">
                                {selectedPlan?.name || payment.planName || "-"}
                              </div>
                            </div>

                            <div className="payment-info-row">
                              <div className="payment-info-label">
                                Subscription price
                              </div>

                              <div className="payment-info-value text-primary">
                                $
                                {Number(
                                  payment.subscriptionAmount ??
                                    getPlanPrice(selectedPlan),
                                ).toFixed(2)}{" "}
                                {payment.subscriptionCurrency ||
                                  PAYMENT_CURRENCY}
                              </div>
                            </div>

                            <div className="payment-info-row">
                              <div className="payment-info-label">
                                Payment method
                              </div>

                              <div className="payment-info-value">
                                {payment.paymentMethod || PAYMENT_METHOD}
                              </div>
                            </div>

                            <div className="payment-info-row">
                              <div className="payment-info-label">Merchant</div>

                              <div className="payment-info-value">
                                {payment.merchantName || "RentEase"}
                              </div>
                            </div>

                            <div className="payment-info-row">
                              <div className="payment-info-label">
                                Bakong account
                              </div>

                              <div className="payment-info-value">
                                {payment.bakongAccount ||
                                  "Configured on server"}
                              </div>
                            </div>

                            <div className="payment-info-row">
                              <div className="payment-info-label">
                                Reference
                              </div>

                              <div className="payment-info-value">
                                {payment.paymentReference || "-"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PAYMENT INFORMATION */}
                    <div className="card border-0 bg-light rounded-4 mt-4">
                      <div className="card-body p-4">
                        <div className="d-flex align-items-start gap-3">
                          <div
                            className="bg-primary text-white rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                            style={{
                              width: 42,
                              height: 42,
                            }}
                          >
                            <CreditCard size={20} />
                          </div>

                          <div>
                            <div className="fw-bold">Payment amount</div>

                            <div className="small text-muted mt-1">
                              Your subscription price is
                            </div>

                            <div className="fs-4 fw-bold mt-1">
                              ${getPlanPrice(selectedPlan).toFixed(2)} USD
                            </div>

                            <div className="small text-muted mt-1">
                              Complete the payment using the displayed Bakong
                              QR.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* INSTRUCTIONS */}
                    <div className="alert alert-info mt-4 mb-3 rounded-4">
                      <div className="d-flex align-items-start gap-3">
                        <QrCode size={20} className="mt-1 flex-shrink-0" />

                        <div>
                          <div className="fw-bold mb-2">
                            How to complete your payment
                          </div>

                          <ol className="small mb-0 ps-3">
                            <li className="mb-1">
                              Open your Bakong-supported banking app.
                            </li>

                            <li className="mb-1">Scan the QR code above.</li>

                            <li className="mb-1">
                              Confirm the payment details and complete the
                              payment.
                            </li>

                            <li>
                              Return here and click{" "}
                              <strong>Check Payment</strong> to verify the
                              transaction.
                            </li>
                          </ol>
                        </div>
                      </div>
                    </div>

                    {/* MESSAGE */}
                    {paymentMessage && (
                      <div
                        className={`alert ${
                          paymentSuccess ? "alert-success" : "alert-secondary"
                        } d-flex align-items-start gap-2 rounded-4`}
                      >
                        {paymentSuccess ? (
                          <CheckCircle2
                            size={19}
                            className="mt-1 flex-shrink-0"
                          />
                        ) : (
                          <Clock size={19} className="mt-1 flex-shrink-0" />
                        )}

                        <div className="small">{paymentMessage}</div>
                      </div>
                    )}

                    {/* ACTIONS */}
                    <div className="d-flex flex-column flex-sm-row gap-2 mt-4">
                      <button
                        type="button"
                        className="btn btn-outline-secondary flex-fill py-2"
                        onClick={closeCheckout}
                        disabled={isCheckingPayment}
                      >
                        Cancel
                      </button>

                      {countdown <= 0 ? (
                        <button
                          type="button"
                          className="btn btn-outline-primary flex-fill py-2"
                          onClick={regeneratePayment}
                          disabled={isCreatingPayment || isCheckingPayment}
                        >
                          <RefreshCw size={17} className="me-1" />
                          Generate New QR
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary flex-fill py-2 fw-semibold"
                          onClick={checkPayment}
                          disabled={isCheckingPayment || paymentSuccess}
                        >
                          {isCheckingPayment ? (
                            <>
                              <Loader2
                                size={17}
                                className="me-1"
                                style={{
                                  animation: "spin 1s linear infinite",
                                }}
                              />
                              Checking Payment...
                            </>
                          ) : (
                            <>
                              <Check size={17} className="me-1" />
                              Check Payment
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="text-center small text-muted mt-3">
                      Payment verification is performed after you complete the
                      Bakong transaction.
                    </div>
                  </div>
                )}

                {/* NO PAYMENT */}
                {!isCreatingPayment && !payment && !paymentError && (
                  <div className="text-center py-5">
                    <div
                      className="rounded-circle bg-light d-flex align-items-center justify-content-center mx-auto mb-4"
                      style={{
                        width: 70,
                        height: 70,
                      }}
                    >
                      <AlertCircle size={35} className="text-muted" />
                    </div>

                    <h5 className="fw-bold">Payment QR unavailable</h5>

                    <p className="text-muted small">
                      We could not create the Bakong payment QR.
                    </p>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={openCheckout}
                    >
                      <RefreshCw size={17} className="me-1" />
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          SUCCESS MODAL
      ====================================================== */}
      {showSuccess && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{
            background: "rgba(15, 23, 42, 0.72)",
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-body text-center p-5">
                <div className="success-icon mb-4">
                  <CheckCircle2 size={44} />
                </div>

                <div className="section-label mb-2">Payment verified</div>

                <h3 className="fw-bold mb-2">Payment Successful</h3>

                <p className="text-muted mb-4">
                  Your Bakong payment has been successfully verified.
                </p>

                <div className="card border-0 bg-light rounded-4 mb-4">
                  <div className="card-body p-4">
                    <div className="small text-muted">Subscription</div>

                    <div className="fw-bold fs-5 mb-3">
                      {selectedPlan?.name ||
                        subscription?.planName ||
                        "Subscription"}
                    </div>

                    <div className="small text-muted">Subscription price</div>

                    <div className="fs-4 fw-bold mb-3">
                      ${getPlanPrice(selectedPlan).toFixed(2)} USD
                    </div>

                    <div className="border-top pt-3 small text-muted">
                      Your subscription is now waiting for administrator
                      approval.
                    </div>
                  </div>
                </div>

                <div className="d-flex align-items-center justify-content-center gap-2 small text-success mb-4">
                  <ShieldCheck size={16} />
                  Bakong transaction verified
                </div>

                <button
                  type="button"
                  className="btn btn-primary px-5 py-2 fw-semibold"
                  onClick={() => setShowSuccess(false)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
