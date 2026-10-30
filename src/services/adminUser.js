import { db } from "./firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

// 1. Fetch All Users (Exclude Admin)
export const fetchUsersData = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    return querySnapshot.docs
      .map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.fullName || data.name || "No Name",
          email: data.email || "N/A",
          phone: data.phone || "N/A",
          role: data.role
            ? data.role.charAt(0).toUpperCase() + data.role.slice(1)
            : "Renter",
          status: data.accountStatus === "blocked" ? "Blocked" : "Active",
          avatar:
            data.profileImage ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${docSnap.id}`,
          address: data.address || "N/A",
          occupation: data.occupation || "N/A",
          bio: data.bio || "",
          regDate: data.createdAt?.toDate
            ? data.createdAt.toDate().toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : "N/A",
          rawStatus: data.accountStatus || "active",
        };
      })
      .filter((user) => user.role.toLowerCase() !== "admin");
  } catch (error) {
    console.error("Error fetching users from Firestore:", error);
    throw error;
  }
};

// 2. Toggle Block / Unblock User
export const updateUserStatus = async (userId, currentStatus) => {
  const newStatus = currentStatus === "Active" ? "blocked" : "active";
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      accountStatus: newStatus,
      updatedAt: new Date(),
    });
    return newStatus;
  } catch (error) {
    console.error("Error updating user status:", error);
    throw error;
  }
};

// 3. Delete User
export const removeUser = async (userId) => {
  try {
    await deleteDoc(doc(db, "users", userId));
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

// 4. Update User Profile Info
export const updateUserData = async (userId, formData) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      fullName: formData.name,
      role: formData.role.toLowerCase(),
      phone: formData.phone,
      address: formData.address,
      occupation: formData.occupation,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};