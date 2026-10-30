import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";


const firebaseConfig = {
  apiKey: "AIzaSyDiwCCnrKEE6Q4MXNnKHXDaCaIWiTX32TQ",
  authDomain: "rentease-211f2.firebaseapp.com",
  projectId: "rentease-211f2",
  storageBucket: "rentease-211f2.firebasestorage.app",
  messagingSenderId: "224673300178",
  appId: "1:224673300178:web:025039bb4db476f9c9b70b",
  measurementId: "G-X6BYYLC7MY"
};

// 1. Initialize Firebase App
const app = initializeApp(firebaseConfig);

// 2. Export Firebase Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

export default app;