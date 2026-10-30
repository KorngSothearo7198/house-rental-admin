import { db } from "./firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  setDoc,
} from "firebase/firestore";

// ==========================================
// 1. SUBSCRIPTION PLANS MANAGEMENT
// ==========================================

export const fetchPlans = async () => {
  const q = query(
    collection(db, "subscription_plans"),
    orderBy("createdAt", "asc")
  );

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((docSnap) => ({
    docId: docSnap.id,
    ...docSnap.data(),
  }));
};

export const createPlan = async (planData) => {
  const planRef = doc(collection(db, "subscription_plans"));

  const payload = {
    id: planData.id || `plan_${Date.now()}`,

    name: planData.name,
    description: planData.description || "",

    level: Number(planData.level),

    // -1 = unlimited properties
    propertyLimit: Number(planData.propertyLimit),

    price: Number(planData.price),
    currency: planData.currency || "USD",
    billing: planData.billing || "month",

    features: Array.isArray(planData.features)
      ? planData.features
      : planData.features
          .split(",")
          .map((feature) => feature.trim())
          .filter(Boolean),

    popular: Boolean(planData.popular),
    recommended: Boolean(planData.recommended),

    status: planData.status || "active",
    displayOrder: Number(planData.displayOrder || 0),

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(planRef, payload);

  return {
    docId: planRef.id,
    ...payload,
  };
};

export const updatePlan = async (docId, planData) => {
  const planRef = doc(db, "subscription_plans", docId);

  const payload = {
    name: planData.name,
    description: planData.description || "",

    level: Number(planData.level),

    // -1 = unlimited
    propertyLimit: Number(planData.propertyLimit),

    price: Number(planData.price),
    currency: planData.currency || "USD",
    billing: planData.billing || "month",

    features: Array.isArray(planData.features)
      ? planData.features
      : planData.features
          .split(",")
          .map((feature) => feature.trim())
          .filter(Boolean),

    popular: Boolean(planData.popular),
    recommended: Boolean(planData.recommended),

    status: planData.status || "active",
    displayOrder: Number(planData.displayOrder || 0),

    updatedAt: serverTimestamp(),
  };

  await updateDoc(planRef, payload);
};

export const deletePlan = async (docId) => {
  const planRef = doc(db, "subscription_plans", docId);

  await deleteDoc(planRef);
};


// ==========================================
// 2. SUBSCRIPTION MANAGEMENT
// ==========================================

export const fetchSubscriptions = async () => {
  const q = query(
    collection(db, "subscriptions"),
    orderBy("createdAt", "desc")
  );

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((docSnap) => {
    const data = docSnap.data();

    return {
      id: docSnap.id,
      ...data,

      startDate: data.startDate?.toDate
        ? data.startDate.toDate().toLocaleDateString()
        : "N/A",

      endDate: data.endDate?.toDate
        ? data.endDate.toDate().toLocaleDateString()
        : "N/A",

      approvedAt: data.approvedAt?.toDate
        ? data.approvedAt.toDate().toLocaleDateString()
        : "N/A",

      createdAt: data.createdAt?.toDate
        ? data.createdAt.toDate().toLocaleDateString()
        : "N/A",
    };
  });
};


// ==========================================
// 3. APPROVE SUBSCRIPTION
// ==========================================

export const approveSubscription = async (
  subscriptionId,
  adminId
) => {
  const subRef = doc(
    db,
    "subscriptions",
    subscriptionId
  );

  const now = new Date();

  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + 1);

  await updateDoc(subRef, {
    status: "active",

    startDate: now,
    endDate: endDate,

    approvedBy: adminId,
    approvedAt: serverTimestamp(),

    updatedAt: serverTimestamp(),
  });
};


// ==========================================
// 4. REJECT SUBSCRIPTION
// ==========================================

export const rejectSubscription = async (
  subscriptionId,
  adminId
) => {
  const subRef = doc(
    db,
    "subscriptions",
    subscriptionId
  );

  await updateDoc(subRef, {
    status: "rejected",

    approvedBy: adminId,
    approvedAt: serverTimestamp(),

    updatedAt: serverTimestamp(),
  });
};