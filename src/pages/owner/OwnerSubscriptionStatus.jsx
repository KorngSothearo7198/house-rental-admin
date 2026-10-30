// import React, { useState, useEffect, useRef } from "react";
// import { auth } from "../../services/firebase";
// import { subscriptionService } from "../../services/subscriptionService";
// import {
//   Check,
//   Crown,
//   Zap,
//   Building2,
//   Loader2,
//   X,
//   CreditCard,
//   Clock,
//   CheckCircle2,
//   AlertCircle,
// } from "lucide-react";

// const BANKS = [
//   { id: "acleda", name: "ACLEDA Bank", color: "#0066B3", account: "0001-2345-6789" },
//   { id: "aba", name: "ABA Bank", color: "#0055A5", account: "0002-9876-5432" },
//   { id: "wing", name: "Wing Bank", color: "#E31C23", account: "0003-1122-3344" },
// ];

// export default function OwnerSubscription() {
//   const [plans, setPlans] = useState([]);
//   const [subscription, setSubscription] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [selectedPlanId, setSelectedPlanId] = useState(null);
//   const [showCheckout, setShowCheckout] = useState(false);
//   const [selectedBankIndex, setSelectedBankIndex] = useState(0);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [countdown, setCountdown] = useState(5);
//   const [showSuccess, setShowSuccess] = useState(false);
//   const timerRef = useRef(null);

//   useEffect(() => {
//     loadData();
//     return () => {
//       if (timerRef.current) clearInterval(timerRef.current);
//     };
//   }, []);

//   const loadData = async () => {
//     setLoading(true);
//     try {
//       const user = auth.currentUser;
//       const [plansData, subData] = await Promise.all([
//         subscriptionService.getPlans(),
//         user ? subscriptionService.getOwnerSubscription(user.uid) : null,
//       ]);

//       setPlans(plansData);
//       setSubscription(subData);

//       // Auto-select recommended or first plan
//       const recommended = plansData.find((p) => p.recommended || p.popular);
//       if (recommended) setSelectedPlanId(recommended.id);
//       else if (plansData.length > 0) setSelectedPlanId(plansData[0].id);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const selectedPlan = plans.find((p) => p.id === selectedPlanId);
//   const isPending = subscription?.status === "pending";
//   const isActive =
//     subscription?.status === "active" || subscription?.status === "approved";

//   const formatDate = (ts) => {
//     if (!ts) return "—";
//     if (ts.toDate) return ts.toDate().toLocaleDateString("en-US", {
//       year: "numeric",
//       month: "short",
//       day: "numeric",
//     });
//     if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleDateString("en-US", {
//       year: "numeric",
//       month: "short",
//       day: "numeric",
//     });
//     return "—";
//   };

//   const startAutoPayment = () => {
//     if (isProcessing || !selectedPlan) return;
//     setIsProcessing(true);
//     setCountdown(5);

//     timerRef.current = setInterval(() => {
//       setCountdown((prev) => {
//         if (prev <= 1) {
//           clearInterval(timerRef.current);
//           submitPayment();
//           return 0;
//         }
//         return prev - 1;
//       });
//     }, 1000);
//   };

//   const submitPayment = async () => {
//     if (!selectedPlan) return;
//     const bank = BANKS[selectedBankIndex];

//     try {
//       await subscriptionService.createSubscriptionRequest({
//         planId: selectedPlan.id || selectedPlan.planId || selectedPlan.id,
//         planName: selectedPlan.name,
//         amount: selectedPlan.price,
//         paymentMethod: bank.name,
//         paymentReference: `AUTO-${Date.now()}`,
//       });

//       setShowCheckout(false);
//       setIsProcessing(false);
//       setShowSuccess(true);
//       await loadData();
//     } catch (err) {
//       alert("Failed to submit: " + err.message);
//       setIsProcessing(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
//         <Loader2 className="animate-spin text-primary" size={36} />
//       </div>
//     );
//   }

//   return (
//     <div className="container-fluid py-4 px-3 px-lg-4" style={{ background: "#f8fafc", minHeight: "100vh" }}>
//       <div className="mx-auto" style={{ maxWidth: 960 }}>
//         {/* Header */}
//         <div className="text-center mb-5">
//           <h2 className="fw-bold text-dark mb-2">Subscription Plans</h2>
//           <p className="text-muted mb-0">
//             Choose the right plan to manage your properties and grow your rental business
//           </p>
//         </div>

//         {/* Current Subscription Status */}
//         {isActive && subscription && (
//           <div
//             className="card border-0 rounded-4 mb-4 text-white overflow-hidden"
//             style={{
//               background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
//               boxShadow: "0 10px 30px rgba(16,185,129,0.25)",
//             }}
//           >
//             <div className="card-body p-4">
//               <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
//                 <div>
//                   <div className="d-flex align-items-center gap-2 mb-2">
//                     <span className="badge bg-white bg-opacity-25 rounded-pill px-3 py-2">
//                       <CheckCircle2 size={14} className="me-1" /> ACTIVE
//                     </span>
//                   </div>
//                   <h4 className="fw-bold mb-1">{subscription.planName}</h4>
//                   <p className="mb-0 opacity-75 small">
//                     Valid until {formatDate(subscription.endDate)}
//                   </p>
//                 </div>
//                 <div className="text-end">
//                   <div className="fs-3 fw-bold">${subscription.amount}</div>
//                   <div className="small opacity-75">
//                     {subscription.paymentMethod || "Paid"}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}

//         {isPending && subscription && (
//           <div className="card border-0 rounded-4 mb-4" style={{ background: "#fffbeb", border: "1px solid #fcd34d" }}>
//             <div className="card-body p-3 d-flex align-items-center gap-3">
//               <div
//                 className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
//                 style={{ width: 48, height: 48, background: "rgba(245,158,11,0.15)" }}
//               >
//                 <Clock size={22} className="text-warning" />
//               </div>
//               <div>
//                 <h6 className="fw-bold mb-1" style={{ color: "#92400e" }}>
//                   Approval Pending
//                 </h6>
//                 <p className="mb-0 small" style={{ color: "#b45309" }}>
//                   Your request for <strong>{subscription.planName}</strong> is under review by admin.
//                 </p>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Plans Grid */}
//         {plans.length === 0 ? (
//           <div className="card border-0 shadow-sm rounded-4 text-center py-5">
//             <div className="card-body text-muted">
//               <Building2 size={40} className="mb-2 opacity-50" />
//               <p className="mb-0">No subscription plans available at the moment.</p>
//             </div>
//           </div>
//         ) : (
//           <div className="row g-4 mb-4">
//             {plans.map((plan) => {
//               const isSelected = selectedPlanId === plan.id;
//               const isPopular = plan.popular || plan.recommended;

//               return (
//                 <div key={plan.id} className="col-md-6 col-lg-4">
//                   <div
//                     className="card h-100 border-0 rounded-4 position-relative"
//                     style={{
//                       border: isSelected ? "2px solid #4f46e5" : "1px solid #e2e8f0",
//                       boxShadow: isSelected
//                         ? "0 12px 32px rgba(79,70,229,0.18)"
//                         : "0 4px 12px rgba(0,0,0,0.04)",
//                       cursor: "pointer",
//                       transition: "all 0.2s ease",
//                     }}
//                     onClick={() => setSelectedPlanId(plan.id)}
//                   >
//                     {isPopular && (
//                       <div
//                         className="position-absolute top-0 start-50 translate-middle-x"
//                         style={{ marginTop: -12 }}
//                       >
//                         <span
//                           className="badge rounded-pill px-3 py-2"
//                           style={{ background: "#4f46e5", fontSize: 11 }}
//                         >
//                           <Crown size={12} className="me-1" /> RECOMMENDED
//                         </span>
//                       </div>
//                     )}

//                     <div className="card-body p-4 d-flex flex-column">
//                       <div className="d-flex justify-content-between align-items-start mb-3">
//                         <div>
//                           <h5 className="fw-bold mb-1 text-dark">{plan.name}</h5>
//                           <div className="text-muted small">
//                             {plan.propertyLimit
//                               ? `Up to ${plan.propertyLimit} properties`
//                               : "Property listing"}
//                           </div>
//                         </div>
//                         <div
//                           className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
//                           style={{
//                             width: 24,
//                             height: 24,
//                             border: `2px solid ${isSelected ? "#4f46e5" : "#cbd5e1"}`,
//                             background: isSelected ? "#4f46e5" : "transparent",
//                           }}
//                         >
//                           {isSelected && <Check size={14} color="#fff" />}
//                         </div>
//                       </div>

//                       <div className="mb-3">
//                         <span className="fw-bold text-dark" style={{ fontSize: 32 }}>
//                           ${plan.price}
//                         </span>
//                         <span className="text-muted small">
//                           /{plan.billing || "month"}
//                         </span>
//                       </div>

//                       {plan.description && (
//                         <p className="text-muted small mb-3">{plan.description}</p>
//                       )}

//                       <ul className="list-unstyled mb-0 flex-grow-1">
//                         {(plan.features || []).map((f, i) => (
//                           <li key={i} className="d-flex align-items-start gap-2 mb-2">
//                             <Check size={16} className="text-success mt-1 flex-shrink-0" />
//                             <span className="small text-secondary">{f}</span>
//                           </li>
//                         ))}
//                       </ul>
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         )}

//         {/* Subscribe Button */}
//         {plans.length > 0 && (
//           <div className="text-center">
//             <button
//               className="btn btn-primary btn-lg px-5 py-3 fw-semibold rounded-3"
//               style={{ minWidth: 260 }}
//               disabled={isPending || !selectedPlan}
//               onClick={() => setShowCheckout(true)}
//             >
//               {isPending ? (
//                 <>
//                   <Clock size={18} className="me-2" /> Approval Pending
//                 </>
//               ) : (
//                 <>
//                   <Zap size={18} className="me-2" />
//                   Subscribe to {selectedPlan?.name || "Plan"}
//                 </>
//               )}
//             </button>
//           </div>
//         )}
//       </div>

//       {/* ================= CHECKOUT MODAL ================= */}
//       {showCheckout && selectedPlan && (
//         <div
//           className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
//           style={{ background: "rgba(15,23,42,0.55)", zIndex: 1050, backdropFilter: "blur(4px)" }}
//           onClick={() => !isProcessing && setShowCheckout(false)}
//         >
//           <div
//             className="bg-white rounded-4 shadow-lg overflow-hidden"
//             style={{ width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto" }}
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="p-4">
//               <div className="d-flex justify-content-between align-items-center mb-3">
//                 <h5 className="fw-bold mb-0">Confirm Payment</h5>
//                 {!isProcessing && (
//                   <button className="btn btn-sm btn-light border rounded-circle p-1" onClick={() => setShowCheckout(false)}>
//                     <X size={16} />
//                   </button>
//                 )}
//               </div>

//               <p className="text-muted small mb-4">
//                 Complete payment to activate <strong>{selectedPlan.name}</strong>
//               </p>

//               {/* Plan Summary */}
//               <div className="rounded-3 p-3 mb-4 d-flex justify-content-between align-items-center" style={{ background: "#f8fafc" }}>
//                 <div>
//                   <div className="fw-semibold">{selectedPlan.name}</div>
//                   <div className="text-muted small">
//                     {selectedPlan.billing || "Monthly"} subscription
//                   </div>
//                 </div>
//                 <div className="fw-bold text-primary fs-5">
//                   ${Number(selectedPlan.price).toFixed(2)}
//                 </div>
//               </div>

//               {/* Banks */}
//               <h6 className="fw-semibold mb-3">Select Bank</h6>
//               <div className="row g-2 mb-4">
//                 {BANKS.map((bank, index) => {
//                   const active = selectedBankIndex === index;
//                   return (
//                     <div className="col-4" key={bank.id}>
//                       <div
//                         className="text-center p-3 rounded-3"
//                         style={{
//                           background: active ? `${bank.color}12` : "#f8fafc",
//                           border: `2px solid ${active ? bank.color : "#e2e8f0"}`,
//                           cursor: isProcessing ? "not-allowed" : "pointer",
//                         }}
//                         onClick={() => !isProcessing && setSelectedBankIndex(index)}
//                       >
//                         <div
//                           className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2 text-white fw-bold"
//                           style={{ width: 36, height: 36, background: bank.color }}
//                         >
//                           {bank.name.charAt(0)}
//                         </div>
//                         <div className="small fw-semibold" style={{ color: active ? bank.color : "#64748b", fontSize: 12 }}>
//                           {bank.name.split(" ")[0]}
//                         </div>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>

//               {/* QR Placeholder */}
//               <div className="rounded-4 p-4 text-center mb-4" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
//                 <div className="fw-semibold mb-1">Scan QR Code to Pay</div>
//                 <div className="small fw-semibold mb-3" style={{ color: BANKS[selectedBankIndex].color }}>
//                   {BANKS[selectedBankIndex].name}
//                 </div>
//                 <div
//                   className="mx-auto d-flex flex-column align-items-center justify-content-center rounded-3 bg-white shadow-sm"
//                   style={{ width: 160, height: 160, border: "1px solid #e2e8f0" }}
//                 >
//                   <CreditCard size={48} style={{ color: BANKS[selectedBankIndex].color }} />
//                   <span className="text-muted small mt-2">QR Code</span>
//                 </div>
//                 <div className="mt-3 small fw-semibold">
//                   Account: {BANKS[selectedBankIndex].account}
//                 </div>
//                 <div className="fw-bold mt-1 text-primary">
//                   Amount: ${Number(selectedPlan.price).toFixed(2)}
//                 </div>
//               </div>

//               <button
//                 className="btn btn-primary w-100 py-3 fw-semibold rounded-3"
//                 disabled={isProcessing}
//                 onClick={startAutoPayment}
//               >
//                 {isProcessing ? (
//                   <>
//                     <Loader2 size={18} className="animate-spin me-2" />
//                     Processing... {countdown}s
//                   </>
//                 ) : (
//                   "I Have Paid • Auto Confirm"
//                 )}
//               </button>

//               {!isProcessing && (
//                 <p className="text-center text-muted small mt-2 mb-0">
//                   Payment will be auto-confirmed after you tap the button
//                 </p>
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ================= SUCCESS DIALOG ================= */}
//       {showSuccess && (
//         <div
//           className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
//           style={{ background: "rgba(15,23,42,0.55)", zIndex: 1060, backdropFilter: "blur(4px)" }}
//         >
//           <div className="bg-white rounded-4 shadow-lg p-4 text-center" style={{ maxWidth: 380, width: "100%" }}>
//             <div
//               className="mx-auto mb-3 rounded-circle d-flex align-items-center justify-content-center"
//               style={{ width: 80, height: 80, background: "#dcfce7" }}
//             >
//               <CheckCircle2 size={40} className="text-success" />
//             </div>
//             <h5 className="fw-bold mb-2">Request Submitted!</h5>
//             <p className="text-muted small mb-4">
//               Your subscription request has been sent and is pending admin approval.
//             </p>
//             <button
//               className="btn btn-primary w-100 py-2 fw-semibold rounded-3"
//               onClick={() => setShowSuccess(false)}
//             >
//               Done
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }