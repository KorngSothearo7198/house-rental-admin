import { db, auth } from "./firebase";

import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

import { signOut } from "firebase/auth";

export const ownerProfileService = {
  /*
   * Get Owner Profile
   *
   * Also counts properties from:
   * properties.ownerId == uid
   */
  async getOwnerProfile(uid) {
    try {
      /*
       * Get user profile
       */
      const userRef = doc(db, "users", uid);

      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return null;
      }

      const userData = userDoc.data();

      /*
       * Get owner's properties
       */
      const propertiesQuery = query(
        collection(db, "properties"),
        where("ownerId", "==", uid)
      );

      const propertiesSnapshot =
        await getDocs(propertiesQuery);

      /*
       * Real property count
       */
      const propertyCount =
        propertiesSnapshot.size;

      return {
        id: userDoc.id,

        ...userData,

        /*
         * Property count comes from
         * properties collection
         */
        propertyCount,
      };
    } catch (error) {
      console.error(
        "Error fetching owner profile:",
        error
      );

      throw error;
    }
  },

  /*
   * Update Owner Profile
   */
  async updateOwnerProfile(uid, profileData) {
    try {
      const userRef = doc(db, "users", uid);

      const updateData = {
        ...profileData,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(userRef, updateData);

      /*
       * Get latest property count
       */
      const propertiesQuery = query(
        collection(db, "properties"),
        where("ownerId", "==", uid)
      );

      const propertiesSnapshot =
        await getDocs(propertiesQuery);

      return {
        id: uid,

        ...profileData,

        propertyCount:
          propertiesSnapshot.size,
      };
    } catch (error) {
      console.error(
        "Error updating owner profile:",
        error
      );

      throw error;
    }
  },

  /*
   * Get Owner Property Count
   *
   * Can be used separately whenever
   * the profile page needs to refresh
   * the property count.
   */
  async getOwnerPropertyCount(uid) {
    try {
      const propertiesQuery = query(
        collection(db, "properties"),
        where("ownerId", "==", uid)
      );

      const propertiesSnapshot =
        await getDocs(propertiesQuery);

      return propertiesSnapshot.size;
    } catch (error) {
      console.error(
        "Error fetching owner property count:",
        error
      );

      throw error;
    }
  },

  /*
   * Logout Owner
   */
  async logoutOwner() {
    try {
      await signOut(auth);

      localStorage.removeItem("user_session");
    } catch (error) {
      console.error(
        "Error logging out:",
        error
      );

      throw error;
    }
  },
};