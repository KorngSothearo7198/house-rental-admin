import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export const createProperty = async (propertyData) => {
  try {
    const docRef = await addDoc(collection(db, "properties"), {
      ...propertyData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding property to Firestore:", error);
    throw error;
  }
};