
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";

const ADMIN_ID = "ZyyrZKb86nfWfOBaRTHLvS7Ak0M2";

const ticketsCollection = collection(db, "supportTickets");
const notificationsCollection = collection(db, "notifications");

const getUserInfo = async (user) => {
  const snapshot = await getDoc(doc(db, "users", user.uid));
  const data = snapshot.exists() ? snapshot.data() : {};

  return {
    name:
      data.fullName ||
      data.name ||
      user.displayName ||
      (data.role === "admin" ? "Admin" : "Owner"),
    email: data.email || user.email || "",
    role: String(data.role || "").toLowerCase(),
  };
};

const createNotification = async ({
  userId,
  role,
  title,
  body,
  ticketId,
  subject,
  type,
}) => {
  if (!userId) return;

  await addDoc(notificationsCollection, {
    userId,
    role,
    title,
    body,
    subject,
    type,
    relatedId: ticketId,
    relatedType: "supportTicket",
    isRead: false,
    createdAt: serverTimestamp(),
  });
};

const formatError = (error) => {
  console.error("Support ticket service error:", error);
  throw error;
};

export const supportTicketService = {
  // ---------------------------------------------------------
  // CREATE A NEW TICKET
  // ---------------------------------------------------------
  async createTicket({ subject, message, category = "general" }) {
    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("Please log in before creating a ticket.");
      }

      if (!subject?.trim() || !message?.trim()) {
        throw new Error("Subject and message are required.");
      }

      const userInfo = await getUserInfo(user);
      const ticketRef = doc(ticketsCollection);

      const ticketData = {
        ticketId: ticketRef.id,
        adminId: ADMIN_ID,
        userId: user.uid,
        userName: userInfo.name,
        userEmail: userInfo.email,
        userRole: "owner",
        category,
        subject: subject.trim(),
        message: message.trim(),
        status: "open",
        lastMessage: message.trim(),
        lastMessageBy: "owner",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
      };

      await setDoc(ticketRef, ticketData);

      // Save the first message in the conversation.
      await addDoc(
        collection(db, "supportTickets", ticketRef.id, "messages"),
        {
          ticketId: ticketRef.id,
          senderId: user.uid,
          senderName: userInfo.name,
          senderRole: "owner",
          message: message.trim(),
          createdAt: serverTimestamp(),
        },
      );

      await createNotification({
        userId: ADMIN_ID,
        role: "admin",
        title: "New Support Ticket",
        body: `${userInfo.name} submitted a support ticket.`,
        subject: subject.trim(),
        ticketId: ticketRef.id,
        type: "support_ticket",
      });

      return {
        success: true,
        ticketId: ticketRef.id,
      };
    } catch (error) {
      return formatError(error);
    }
  },

  // ---------------------------------------------------------
  // GET TICKETS CREATED BY THE CURRENT OWNER
  // ---------------------------------------------------------
  async getMyTickets(userId) {
    try {
      const q = query(
        ticketsCollection,
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map((ticketDoc) => ({
        id: ticketDoc.id,
        ...ticketDoc.data(),
      }));
    } catch (error) {
      return formatError(error);
    }
  },

  // ---------------------------------------------------------
  // GET ALL TICKETS ASSIGNED TO THIS ADMIN
  // ---------------------------------------------------------
  async getAllTickets(adminId = ADMIN_ID) {
    try {
      const q = query(
        ticketsCollection,
        where("adminId", "==", adminId),
        orderBy("createdAt", "desc"),
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map((ticketDoc) => ({
        id: ticketDoc.id,
        ...ticketDoc.data(),
      }));
    } catch (error) {
      return formatError(error);
    }
  },

  // ---------------------------------------------------------
  // GET ONE TICKET
  // ---------------------------------------------------------
  async getTicketById(ticketId) {
    try {
      const snapshot = await getDoc(
        doc(db, "supportTickets", ticketId),
      );

      if (!snapshot.exists()) {
        throw new Error("This support ticket could not be found.");
      }

      return {
        id: snapshot.id,
        ...snapshot.data(),
      };
    } catch (error) {
      return formatError(error);
    }
  },

  // ---------------------------------------------------------
  // GET THE TICKET CONVERSATION
  // ---------------------------------------------------------
  async getTicketMessages(ticketId) {
    try {
      const messagesRef = collection(
        db,
        "supportTickets",
        ticketId,
        "messages",
      );

      const q = query(messagesRef, orderBy("createdAt", "asc"));
      const snapshot = await getDocs(q);

      return snapshot.docs.map((messageDoc) => ({
        id: messageDoc.id,
        ...messageDoc.data(),
      }));
    } catch (error) {
      return formatError(error);
    }
  },

  // ---------------------------------------------------------
  // OWNER OR ADMIN SENDS A REPLY
  // ---------------------------------------------------------
  async sendReply(ticketId, message) {
    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("Please log in before replying.");
      }

      if (!message?.trim()) {
        throw new Error("Reply message cannot be empty.");
      }

      const ticketRef = doc(db, "supportTickets", ticketId);
      const ticketSnapshot = await getDoc(ticketRef);

      if (!ticketSnapshot.exists()) {
        throw new Error("This support ticket could not be found.");
      }

      const ticket = ticketSnapshot.data();
      const userInfo = await getUserInfo(user);

      const isOwner = ticket.userId === user.uid;
      const isAssignedAdmin = ticket.adminId === user.uid;

      if (!isOwner && !isAssignedAdmin) {
        throw new Error("You do not have permission to reply to this ticket.");
      }

      if (ticket.status === "closed" || ticket.status === "resolved") {
        throw new Error(
          "This ticket is closed or resolved. Reopen it before replying.",
        );
      }

      const senderRole = isAssignedAdmin ? "admin" : "owner";
      const replyText = message.trim();

      await addDoc(
        collection(db, "supportTickets", ticketId, "messages"),
        {
          ticketId,
          senderId: user.uid,
          senderName: userInfo.name,
          senderRole,
          message: replyText,
          createdAt: serverTimestamp(),
        },
      );

      await updateDoc(ticketRef, {
        lastMessage: replyText,
        lastMessageBy: senderRole,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: isAssignedAdmin ? "waiting_for_owner" : "in_progress",
      });

      if (isAssignedAdmin) {
        await createNotification({
          userId: ticket.userId,
          role: "owner",
          title: "Admin Replied to Your Ticket",
          body: `The admin replied to "${ticket.subject}".`,
          subject: ticket.subject,
          ticketId,
          type: "support_ticket_reply",
        });
      } else {
        await createNotification({
          userId: ticket.adminId || ADMIN_ID,
          role: "admin",
          title: "Owner Replied to a Ticket",
          body: `${ticket.userName || "An owner"} replied to "${ticket.subject}".`,
          subject: ticket.subject,
          ticketId,
          type: "support_ticket_reply",
        });
      }

      return { success: true };
    } catch (error) {
      return formatError(error);
    }
  },

  // ---------------------------------------------------------
  // ADMIN UPDATES TICKET STATUS
  // ---------------------------------------------------------
  async updateTicketStatus(ticketId, status) {
    try {
      const user = auth.currentUser;

      if (!user || user.uid !== ADMIN_ID) {
        throw new Error("Only the assigned admin can change ticket status.");
      }

      const allowedStatuses = [
        "open",
        "in_progress",
        "waiting_for_owner",
        "resolved",
        "closed",
      ];

      if (!allowedStatuses.includes(status)) {
        throw new Error("Invalid ticket status.");
      }

      const ticketRef = doc(db, "supportTickets", ticketId);
      const snapshot = await getDoc(ticketRef);

      if (!snapshot.exists()) {
        throw new Error("This support ticket could not be found.");
      }

      const ticket = snapshot.data();

      await updateDoc(ticketRef, {
        status,
        updatedAt: serverTimestamp(),
      });

      if (status === "resolved" || status === "closed") {
        await createNotification({
          userId: ticket.userId,
          role: "owner",
          title: status === "resolved" ? "Ticket Resolved" : "Ticket Closed",
          body: `Your support ticket "${ticket.subject}" is now ${status}.`,
          subject: ticket.subject,
          ticketId,
          type: "support_ticket_status",
        });
      }

      return { success: true };
    } catch (error) {
      return formatError(error);
    }
  },
};

export default supportTicketService;
