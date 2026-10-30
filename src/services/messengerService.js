import { db } from "./firebase";

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";

// ============================================================
// CLOUDINARY CONFIG
// ============================================================

const CLOUDINARY_CLOUD_NAME = "dxqkcp1hu";
const CLOUDINARY_UPLOAD_PRESET = "rentease_images";

// ============================================================
// UPLOAD FILE TO CLOUDINARY
// ============================================================

export const uploadFile = async (
  file,
  resourceType = "image"
) => {
  if (!file) {
    throw new Error("No file selected.");
  }

  const formData = new FormData();

  formData.append("file", file);

  formData.append(
    "upload_preset",
    CLOUDINARY_UPLOAD_PRESET
  );

  const uploadUrl =
    `https://api.cloudinary.com/v1_1/` +
    `${CLOUDINARY_CLOUD_NAME}/` +
    `${resourceType}/upload`;

  const response = await fetch(
    uploadUrl,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    console.error(
      "Cloudinary upload error:",
      errorText
    );

    throw new Error(
      "Cloudinary upload failed."
    );
  }

  const data =
    await response.json();

  if (!data.secure_url) {
    throw new Error(
      "Cloudinary did not return a secure URL."
    );
  }

  return data.secure_url;
};

// ============================================================
// SUBSCRIBE OWNER CONVERSATIONS
// ============================================================
//
// This function returns ALL conversations belonging to
// the owner.
//
// OwnerMessenger.jsx is responsible for grouping them:
//
// John
//   ├── Apartment A
//   ├── Apartment B
//   └── Studio C
//
// into:
//
// John
//   3 properties
//
// ============================================================

export const subscribeOwnerConversations = (
  userId,
  callback,
  onError
) => {
  if (!userId) {
    console.error(
      "Owner ID is required."
    );

    return () => {};
  }

  const q = query(
    collection(
      db,
      "conversations"
    ),
    where(
      "ownerId",
      "==",
      userId
    ),
    orderBy(
      "updatedAt",
      "desc"
    )
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list =
        snapshot.docs.map(
          (conversationDoc) => ({
            id:
              conversationDoc.id,

            ...conversationDoc.data(),
          })
        );

      callback(list);
    },
    (error) => {
      console.error(
        "Conversation listener error:",
        error
      );

      if (onError) {
        onError(error);
      }
    }
  );
};

// ============================================================
// GET USER PROFILE
// ============================================================

export const getUserProfile = async (
  userId
) => {
  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  const userRef = doc(
    db,
    "users",
    userId
  );

  const userSnapshot =
    await getDoc(userRef);

  if (!userSnapshot.exists()) {
    throw new Error(
      "User profile not found."
    );
  }

  return {
    id: userSnapshot.id,
    ...userSnapshot.data(),
  };
};

// ============================================================
// SUBSCRIBE MESSAGES
// ============================================================

export const subscribeMessages = (
  conversationId,
  callback,
  onError
) => {
  if (!conversationId) {
    console.error(
      "Conversation ID is required."
    );

    return () => {};
  }

  const messagesRef =
    collection(
      db,
      "conversations",
      conversationId,
      "messages"
    );

  const q = query(
    messagesRef,
    orderBy(
      "createdAt",
      "asc"
    )
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list =
        snapshot.docs.map(
          (messageDoc) => ({
            id:
              messageDoc.id,

            ...messageDoc.data(),
          })
        );

      callback(list);
    },
    (error) => {
      console.error(
        "Message listener error:",
        error
      );

      if (onError) {
        onError(error);
      }
    }
  );
};

// ============================================================
// SEND MESSAGE
// ============================================================

export const sendMessage = async ({
  conversationId,
  senderId,
  text = "",
  imageUrl = null,
  audioUrl = null,
  messageType = "text",
}) => {
  if (!conversationId) {
    throw new Error(
      "Conversation ID is required."
    );
  }

  if (!senderId) {
    throw new Error(
      "Sender ID is required."
    );
  }

  const messagesRef =
    collection(
      db,
      "conversations",
      conversationId,
      "messages"
    );

  const messageRef =
    await addDoc(
      messagesRef,
      {
        senderId,

        message: text || "",

        imageUrl:
          imageUrl || null,

        audioUrl:
          audioUrl || null,

        messageType,

        isRead: false,

        isEdited: false,

        createdAt:
          serverTimestamp(),
      }
    );

  // ==========================================================
  // UPDATE PARENT CONVERSATION
  // ==========================================================

  let lastMessage = "";

  if (messageType === "image") {
    lastMessage = "[Image]";
  } else if (
    messageType === "audio"
  ) {
    lastMessage = "[Voice Note]";
  } else {
    lastMessage =
      text || "";
  }

  const conversationRef =
    doc(
      db,
      "conversations",
      conversationId
    );

  await updateDoc(
    conversationRef,
    {
      lastMessage,

      updatedAt:
        serverTimestamp(),
    }
  );

  return messageRef.id;
};

// ============================================================
// EDIT MESSAGE
// ============================================================

export const editMessage = async (
  conversationId,
  messageId,
  newText
) => {
  if (!conversationId) {
    throw new Error(
      "Conversation ID is required."
    );
  }

  if (!messageId) {
    throw new Error(
      "Message ID is required."
    );
  }

  if (!newText?.trim()) {
    throw new Error(
      "Message cannot be empty."
    );
  }

  const messageRef =
    doc(
      db,
      "conversations",
      conversationId,
      "messages",
      messageId
    );

  await updateDoc(
    messageRef,
    {
      message:
        newText.trim(),

      isEdited: true,

      updatedAt:
        serverTimestamp(),
    }
  );

  // ==========================================================
  // UPDATE LAST MESSAGE ONLY IF THIS IS THE LATEST MESSAGE
  // ==========================================================

  const messagesRef =
    collection(
      db,
      "conversations",
      conversationId,
      "messages"
    );

  const latestQuery =
    query(
      messagesRef,
      orderBy(
        "createdAt",
        "desc"
      )
    );

  const latestSnapshot =
    await getDocs(
      latestQuery
    );

  if (
    !latestSnapshot.empty
  ) {
    const latestMessage =
      latestSnapshot.docs[0];

    if (
      latestMessage.id ===
      messageId
    ) {
      await updateDoc(
        doc(
          db,
          "conversations",
          conversationId
        ),
        {
          lastMessage:
            newText.trim(),

          updatedAt:
            serverTimestamp(),
        }
      );
    }
  }
};

// ============================================================
// DELETE MESSAGE
// ============================================================

export const deleteMessage = async (
  conversationId,
  messageId
) => {
  if (
    !conversationId ||
    !messageId
  ) {
    throw new Error(
      "Conversation ID and message ID are required."
    );
  }

  const messageRef =
    doc(
      db,
      "conversations",
      conversationId,
      "messages",
      messageId
    );

  await deleteDoc(
    messageRef
  );

  // ==========================================================
  // FIND LATEST REMAINING MESSAGE
  // ==========================================================

  const messagesRef =
    collection(
      db,
      "conversations",
      conversationId,
      "messages"
    );

  const latestQuery =
    query(
      messagesRef,
      orderBy(
        "createdAt",
        "desc"
      )
    );

  const latestSnapshot =
    await getDocs(
      latestQuery
    );

  let lastMessage =
    "No messages yet";

  if (
    !latestSnapshot.empty
  ) {
    const latestData =
      latestSnapshot.docs[0].data();

    if (
      latestData.messageType ===
      "image"
    ) {
      lastMessage =
        "[Image]";
    } else if (
      latestData.messageType ===
      "audio"
    ) {
      lastMessage =
        "[Voice Note]";
    } else {
      lastMessage =
        latestData.message ||
        "No messages yet";
    }
  }

  // ==========================================================
  // UPDATE CONVERSATION
  // ==========================================================

  await updateDoc(
    doc(
      db,
      "conversations",
      conversationId
    ),
    {
      lastMessage,

      updatedAt:
        serverTimestamp(),
    }
  );
};