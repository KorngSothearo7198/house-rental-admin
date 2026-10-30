import { db } from "./firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";

export const ownerPropertiesServices = {
  async getOwnerProperties(ownerId) {
    const q = query(
      collection(db, "properties"),
      where("ownerId", "==", ownerId)
    );
    const snap = await getDocs(q);

    return snap.docs.map((docSnap) => {
      const data = docSnap.data();

      let formattedDate = "N/A";
      if (data.createdAt?.toDate) {
        formattedDate = data.createdAt.toDate().toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }

      return {
        id: docSnap.id,
        title: data.title || "Untitled Property",
        category: data.category || "General",
        location: data.location || "N/A",
        price: data.price || 0,
        bedrooms: data.bedrooms || 0,
        bathrooms: data.bathrooms || 0,
        imageUrl:
          data.imageUrl ||
          "https://via.placeholder.com/400x260?text=No+Image",
        status: data.status || "available",
        amenities: data.amenities || [],
        description: data.description || "",
        createdAt: formattedDate,
        rawCreatedAt: data.createdAt,
      };
    });
  },

  async updatePropertyStatus(id, newStatus) {
    await updateDoc(doc(db, "properties", id), {
      status: newStatus,
      updatedAt: new Date(),
    });
  },

  // Full update (used by View/Edit dialog)
  async updateProperty(id, data) {
    await updateDoc(doc(db, "properties", id), {
      ...data,
      updatedAt: new Date(),
    });
  },

  async deleteProperty(id) {
    await deleteDoc(doc(db, "properties", id));
  },


  async getOwnerPropertyCount(ownerId) {
  const q = query(
    collection(db, "properties"),
    where("ownerId", "==", ownerId)
  );
  const snap = await getDocs(q);
  return snap.size;
},


};