import { auth, db } from "./firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export const registerOwner = async ({ fullName, email, phone, password }) => {
  try {
    // 1. Create account with Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // 2. Update display name in Firebase Auth
    await updateProfile(user, {
      displayName: fullName,
    });

    // 3. Save owner record to Firestore
    const ownerData = {
      uid: user.uid,
      fullName,
      email,
      phone,
      role: "owner", // Identifies user as a Property Owner
      profileImage: "",
      rating: 5.0,
      propertyCount: 0,
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, "users", user.uid), ownerData);

    return { user, ownerData };
  } catch (error) {
    console.error("Error registering owner:", error);
    throw error;
  }
};