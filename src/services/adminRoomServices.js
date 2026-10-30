import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

/**
 * Listen to auth state and fetch current user profile details
 */
export const subscribeToAuthUser = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          callback(userDoc.data());
          return;
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
      }
    }
    callback(null);
  });
};

/**
 * Fetch all properties and resolve their owner names from the 'users' collection
 */
export const fetchPropertiesData = async () => {
  const querySnapshot = await getDocs(collection(db, "properties"));

  const propertiesData = await Promise.all(
    querySnapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      let ownerName = "Unknown Owner";

      if (data.ownerId) {
        try {
          const userDoc = await getDoc(doc(db, "users", data.ownerId));
          if (userDoc.exists()) {
            ownerName =
              userDoc.data().fullName || userDoc.data().email || "Owner";
          }
        } catch (err) {
          console.error("Error fetching owner info:", err);
        }
      }

      return {
        id: docSnap.id,
        title: data.title || "Untitled Property",
        ownerName,
        ownerId: data.ownerId || "",
        category: data.category || "General",
        price: data.price || 0,
        location: data.location || "N/A",
        description: data.description || "",
        imageUrl:
          data.imageUrl ||
          "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500",
        status: data.status || "published",
        amenities: data.amenities || [],
        bedrooms: data.bedrooms || 0,
        bathrooms: data.bathrooms || 0,
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toLocaleDateString()
          : "N/A",
      };
    })
  );

  return propertiesData;
};

/**
 * Update property details
 */
export const updatePropertyData = async (roomId, updateData) => {
  const roomRef = doc(db, "properties", roomId);
  const payload = {
    title: updateData.title,
    price: Number(updateData.price),
    status: updateData.status,
    location: updateData.location,
    description: updateData.description,
    updatedAt: new Date(),
  };

  await updateDoc(roomRef, payload);
  return payload;
};

/**
 * Delete a property permanently
 */
export const removeProperty = async (roomId) => {
  await deleteDoc(doc(db, "properties", roomId));
};