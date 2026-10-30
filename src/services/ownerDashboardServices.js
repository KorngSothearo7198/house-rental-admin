import { db } from "./firebase";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";

export const ownerDashboardServices = {
  async getUserRole(uid) {
    const userDocRef = doc(db, "users", uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) return userDocSnap.data().role || "";
    const q = query(collection(db, "users"), where("uid", "==", uid));
    const snap = await getDocs(q);
    return snap.empty ? "" : snap.docs[0].data().role || "";
  },

  async getOwnerProperties(ownerId) {
    const q = query(collection(db, "properties"), where("ownerId", "==", ownerId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getOwnerBookings(ownerId, houseIds = []) {
    let q = query(collection(db, "bookings"), where("ownerId", "==", ownerId));
    let snap = await getDocs(q);
    if (snap.empty && houseIds.length > 0) {
      q = query(collection(db, "bookings"), where("houseId", "in", houseIds.slice(0, 30)));
      snap = await getDocs(q);
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getOwnerPayments(ownerId, houseIds = []) {
    let q = query(collection(db, "payments"), where("ownerId", "==", ownerId));
    let snap = await getDocs(q);
    if (snap.empty && houseIds.length > 0) {
      q = query(collection(db, "payments"), where("houseId", "in", houseIds.slice(0, 30)));
      snap = await getDocs(q);
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
};