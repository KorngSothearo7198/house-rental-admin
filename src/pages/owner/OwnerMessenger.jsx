import React, { useEffect, useMemo, useRef, useState } from "react";
import { auth } from "../../services/firebase";
import { onAuthStateChanged } from "firebase/auth";

import {
  subscribeOwnerConversations,
  subscribeMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  uploadFile,
  getUserProfile,
} from "../../services/messengerService";

import {
  Send,
  Image as ImageIcon,
  Building2,
  MapPin,
  ExternalLink,
  Search,
  Loader2,
  X,
  Mic,
  Square,
  MoreVertical,
  Edit2,
  Trash2,
  Users,
  ChevronRight,
  MessageCircle,
} from "lucide-react";

export default function OwnerMessenger() {
  // ============================================================
  // AUTH
  // ============================================================

  const [currentUserId, setCurrentUserId] = useState(null);

  // ============================================================
  // CONVERSATIONS
  // ============================================================

  const [conversations, setConversations] = useState([]);

  // Currently opened individual conversation
  const [activeConv, setActiveConv] = useState(null);

  // Currently selected renter group
  const [selectedRenterGroup, setSelectedRenterGroup] = useState(null);

  // ============================================================
  // MESSAGES
  // ============================================================

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  // ============================================================
  // SEARCH / LOADING
  // ============================================================

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // ============================================================
  // MEDIA
  // ============================================================

  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // ============================================================
  // VOICE RECORDING
  // ============================================================

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  const audioChunks = useRef([]);

  // ============================================================
  // MESSAGE MENU / EDIT
  // ============================================================

  const [activeMenuId, setActiveMenuId] = useState(null);

  const [editingMsg, setEditingMsg] = useState(null);
  const [editText, setEditText] = useState("");

  // ============================================================
  // PROFILE
  // ============================================================

  const [viewingProfile, setViewingProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // ============================================================
  // REFS
  // ============================================================

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // ============================================================
  // AUTH LISTENER
  // ============================================================

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid);
      } else {
        setCurrentUserId(null);
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  // ============================================================
  // CONVERSATION LISTENER
  // ============================================================

  useEffect(() => {
    if (!currentUserId) return;

    const unsubConv = subscribeOwnerConversations(
      currentUserId,
      (convList) => {
        setConversations(convList);
        setLoading(false);

        // --------------------------------------------------------
        // Keep current conversation when Firestore updates
        // --------------------------------------------------------

        if (activeConv) {
          const updatedConversation = convList.find(
            (conversation) => conversation.id === activeConv.id
          );

          if (updatedConversation) {
            setActiveConv(updatedConversation);
          } else {
            setActiveConv(null);
          }
        }
      },
      (error) => {
        console.error("Conversation listener error:", error);
        setLoading(false);
      }
    );

    return () => unsubConv();
  }, [currentUserId]);

  // ============================================================
  // GROUP CONVERSATIONS BY RENTER
  // ============================================================
  //
  // Example:
  //
  // John
  //   conversation 1 -> Apartment A
  //   conversation 2 -> Apartment B
  //   conversation 3 -> Studio C
  //
  // becomes:
  //
  // John
  //   properties: [A, B, C]
  //
  // ============================================================

  const groupedRenters = useMemo(() => {
    const groups = new Map();

    conversations.forEach((conversation) => {
      const renterId = conversation.renterId || "";

      const renterName =
        conversation.renterName?.trim() || "Unknown Renter";

      // ----------------------------------------------------------
      // Prefer renterId.
      //
      // If renterId does not exist, use renter name as fallback.
      // ----------------------------------------------------------

      const groupKey =
        renterId ||
        renterName.toLowerCase().replace(/\s+/g, "_");

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          id: groupKey,
          renterId: renterId || null,
          renterName,
          conversations: [],
          latestConversation: conversation,
        });
      }

      const group = groups.get(groupKey);

      group.conversations.push(conversation);

      // ----------------------------------------------------------
      // Find latest conversation
      // ----------------------------------------------------------

      const currentLatestDate = getConversationDate(
        group.latestConversation
      );

      const newConversationDate = getConversationDate(conversation);

      if (newConversationDate > currentLatestDate) {
        group.latestConversation = conversation;
      }
    });

    return Array.from(groups.values()).sort((a, b) => {
      const dateA = getConversationDate(a.latestConversation);
      const dateB = getConversationDate(b.latestConversation);

      return dateB - dateA;
    });
  }, [conversations]);

  // ============================================================
  // FILTER RENTER GROUPS
  // ============================================================

  const filteredRenterGroups = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return groupedRenters;
    }

    return groupedRenters.filter((group) => {
      const matchRenter = group.renterName
        .toLowerCase()
        .includes(search);

      const matchProperty = group.conversations.some((conversation) =>
        (conversation.propertyInfo?.title || "")
          .toLowerCase()
          .includes(search)
      );

      return matchRenter || matchProperty;
    });
  }, [groupedRenters, searchTerm]);

  // ============================================================
  // MESSAGES LISTENER
  // ============================================================

  useEffect(() => {
    if (!activeConv?.id) {
      setMessages([]);
      return;
    }

    const unsubMsg = subscribeMessages(
      activeConv.id,
      (msgList) => {
        setMessages(msgList);
      },
      (error) => {
        console.error("Message listener error:", error);
      }
    );

    return () => unsubMsg();
  }, [activeConv?.id]);

  // ============================================================
  // AUTO SCROLL
  // ============================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // ============================================================
  // SELECT RENTER
  // ============================================================
  //
  // If renter has only one property:
  //     open conversation immediately.
  //
  // If renter has multiple properties:
  //     show property selector.
  //
  // ============================================================

  const handleSelectRenter = (group) => {
    setSelectedRenterGroup(group);

    if (group.conversations.length === 1) {
      setActiveConv(group.conversations[0]);
      return;
    }

    // Multiple properties.
    // We keep activeConv unchanged until owner selects a property.
  };

  // ============================================================
  // SELECT PROPERTY / CONVERSATION
  // ============================================================

  const handleSelectPropertyConversation = (conversation) => {
    setActiveConv(conversation);
    setSelectedRenterGroup(null);
  };

  // ============================================================
  // VIEW USER PROFILE
  // ============================================================

  const handleViewProfile = async (userId) => {
    if (!userId) {
      alert("User profile ID not found.");
      return;
    }

    try {
      setLoadingProfile(true);

      const profile = await getUserProfile(userId);

      setViewingProfile(profile);
    } catch (error) {
      console.error("Failed to load user profile:", error);

      alert("Failed to load user profile.");
    } finally {
      setLoadingProfile(false);
    }
  };

  // ============================================================
  // SEND TEXT MESSAGE
  // ============================================================

  const handleSend = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !activeConv || !currentUserId) {
      return;
    }

    const textToSend = newMessage;

    setNewMessage("");

    try {
      await sendMessage({
        conversationId: activeConv.id,
        senderId: currentUserId,
        text: textToSend,
        messageType: "text",
      });
    } catch (error) {
      console.error("Failed to send text message:", error);

      setNewMessage(textToSend);
    }
  };

  // ============================================================
  // IMAGE SELECT
  // ============================================================

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];

    if (!file || !activeConv || !currentUserId) {
      return;
    }

    try {
      setIsUploading(true);

      const url = await uploadFile(file, "image");

      await sendMessage({
        conversationId: activeConv.id,
        senderId: currentUserId,
        imageUrl: url,
        messageType: "image",
      });
    } catch (error) {
      console.error("Failed to upload image:", error);

      alert("Failed to upload image.");
    } finally {
      setIsUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // ============================================================
  // START VOICE RECORDING
  // ============================================================

  const startRecording = async () => {
    try {
      if (!window.isSecureContext) {
        alert(
          "Microphone requires HTTPS or localhost.\n\nPlease open the app using http://localhost:5173"
        );

        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        alert("Your browser does not support microphone recording.");
        return;
      }

      if (!activeConv) {
        alert("Please select a conversation first.");
        return;
      }

      if (!currentUserId) {
        alert("User is not logged in.");
        return;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      let mimeType = "";

      if (
        MediaRecorder.isTypeSupported(
          "audio/webm;codecs=opus"
        )
      ) {
        mimeType = "audio/webm;codecs=opus";
      } else if (
        MediaRecorder.isTypeSupported("audio/webm")
      ) {
        mimeType = "audio/webm";
      } else if (
        MediaRecorder.isTypeSupported("audio/mp4")
      ) {
        mimeType = "audio/mp4";
      } else if (
        MediaRecorder.isTypeSupported("audio/ogg")
      ) {
        mimeType = "audio/ogg";
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      audioChunks.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        stream.getTracks().forEach((track) => track.stop());

        setIsRecording(false);
        setMediaRecorder(null);
      };

      recorder.onstop = async () => {
        try {
          stream
            .getTracks()
            .forEach((track) => track.stop());

          if (audioChunks.current.length === 0) {
            return;
          }

          const actualMimeType =
            recorder.mimeType ||
            mimeType ||
            "audio/webm";

          const extension = actualMimeType.includes("mp4")
            ? "mp4"
            : actualMimeType.includes("ogg")
            ? "ogg"
            : "webm";

          const audioBlob = new Blob(
            audioChunks.current,
            {
              type: actualMimeType,
            }
          );

          const audioFile = new File(
            [audioBlob],
            `voice_note_${Date.now()}.${extension}`,
            {
              type: actualMimeType,
            }
          );

          setIsUploading(true);

          try {
            const url = await uploadFile(
              audioFile,
              "video"
            );

            await sendMessage({
              conversationId: activeConv.id,
              senderId: currentUserId,
              audioUrl: url,
              messageType: "audio",
            });
          } catch (error) {
            console.error(
              "Voice upload/send failed:",
              error
            );

            alert("Failed to upload voice message.");
          } finally {
            setIsUploading(false);
            audioChunks.current = [];
          }
        } catch (error) {
          console.error(
            "Failed to process recording:",
            error
          );

          setIsUploading(false);
        }
      };

      recorder.start();

      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error("Microphone error:", error);

      if (error.name === "NotAllowedError") {
        alert(
          "Microphone permission was denied.\n\nPlease allow microphone access in your browser settings."
        );
      } else if (error.name === "NotFoundError") {
        alert("No microphone was found on this device.");
      } else {
        alert(
          `Microphone error: ${error.name}\n${error.message}`
        );
      }
    }
  };

  // ============================================================
  // STOP RECORDING
  // ============================================================

  const stopRecording = () => {
    if (!mediaRecorder) {
      return;
    }

    if (mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }

    mediaRecorder.stream
      ?.getTracks()
      .forEach((track) => track.stop());

    setIsRecording(false);
    setMediaRecorder(null);
  };

  // ============================================================
  // SAVE EDIT
  // ============================================================

  const handleSaveEdit = async () => {
    if (!editingMsg || !editText.trim() || !activeConv) {
      return;
    }

    try {
      await editMessage(
        activeConv.id,
        editingMsg.id,
        editText.trim()
      );

      setEditingMsg(null);
      setEditText("");
    } catch (error) {
      console.error(
        "Failed to edit message:",
        error
      );
    }
  };

  // ============================================================
  // DELETE MESSAGE
  // ============================================================

  const handleDelete = async (messageId) => {
    if (!activeConv) {
      return;
    }

    if (
      !window.confirm(
        "Delete this message permanently?"
      )
    ) {
      return;
    }

    try {
      await deleteMessage(
        activeConv.id,
        messageId
      );

      setActiveMenuId(null);
    } catch (error) {
      console.error(
        "Failed to delete message:",
        error
      );
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "70vh",
        }}
      >
        <Loader2
          className="animate-spin"
          size={36}
          color="#4f46e5"
        />
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      {/* ======================================================
          GLOBAL STYLES
      ====================================================== */}

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }

          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }

          50% {
            opacity: 0.6;
          }
        }

        .msg-enter {
          animation: fadeInUp 0.28s ease-out forwards;
        }

        .modal-enter {
          animation: scaleIn 0.25s ease-out forwards;
        }

        .conv-item {
          transition: all 0.18s ease;
        }

        .conv-item:hover {
          background-color: #f1f5f9 !important;
        }

        .btn-icon {
          transition: all 0.15s ease;
        }

        .btn-icon:hover {
          transform: scale(1.08);
          background-color: #e0e7ff !important;
        }

        .send-btn {
          transition: all 0.15s ease;
        }

        .send-btn:hover:not(:disabled) {
          transform: scale(1.06);
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);
        }

        .profile-avatar {
          transition: all 0.2s ease;
        }

        .profile-avatar:hover {
          transform: scale(1.05);
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.25);
        }

        .property-option {
          transition: all 0.15s ease;
        }

        .property-option:hover {
          background-color: #eef2ff !important;
          border-color: #c7d2fe !important;
          transform: translateY(-1px);
        }
      `}</style>

      {/* ======================================================
          PAGE
      ====================================================== */}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 80px)",
          gap: "20px",
          overflow: "hidden",
          padding: "0 4px",
        }}
      >
        {/* ====================================================
            PAGE TITLE
        ==================================================== */}

        <div>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: "700",
              margin: 0,
              color: "#0f172a",
              letterSpacing: "-0.3px",
            }}
          >
            Messages
          </h1>

          <p
            style={{
              margin: "4px 0 0",
              fontSize: "14px",
              color: "#64748b",
            }}
          >
            Manage conversations with renters
          </p>
        </div>

        {/* ====================================================
            MAIN CARD
        ==================================================== */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "340px 1fr",
            flex: 1,
            minHeight: 0,
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            boxShadow:
              "0 4px 24px rgba(15, 23, 42, 0.06)",
          }}
        >
          {/* ==================================================
              LEFT SIDEBAR
          ================================================== */}

          <div
            style={{
              borderRight: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#f8fafc",
              minHeight: 0,
            }}
          >
            {/* SEARCH */}

            <div
              style={{
                padding: "20px 18px 16px",
                borderBottom:
                  "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  marginBottom: "14px",
                }}
              >
                <h3
                  style={{
                    fontSize: "15px",
                    fontWeight: "600",
                    margin: 0,
                    color: "#0f172a",
                  }}
                >
                  Conversations
                </h3>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "#6366f1",
                    background: "#eef2ff",
                    padding:
                      "4px 8px",
                    borderRadius: "20px",
                  }}
                >
                  <Users size={12} />

                  {groupedRenters.length}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  backgroundColor:
                    "#ffffff",
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding:
                    "9px 12px",
                }}
              >
                <Search
                  size={16}
                  color="#94a3b8"
                />

                <input
                  type="text"
                  placeholder="Search renter or property..."
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(
                      e.target.value
                    )
                  }
                  style={{
                    border: "none",
                    outline: "none",
                    width: "100%",
                    fontSize: "13.5px",
                    background:
                      "transparent",
                    color: "#0f172a",
                  }}
                />
              </div>
            </div>

            {/* =================================================
                RENTER GROUP LIST
            ================================================= */}

            <div
              style={{
                overflowY: "auto",
                flex: 1,
                minHeight: 0,
                padding: "8px 0",
              }}
            >
              {filteredRenterGroups.length ===
              0 ? (
                <div
                  style={{
                    padding:
                      "40px 24px",
                    textAlign:
                      "center",
                    color: "#94a3b8",
                    fontSize:
                      "13.5px",
                  }}
                >
                  <MessageCircle
                    size={28}
                    style={{
                      marginBottom:
                        "10px",
                      opacity: 0.5,
                    }}
                  />

                  <div>
                    No conversations
                    found
                  </div>
                </div>
              ) : (
                filteredRenterGroups.map(
                  (group) => {
                    const latest =
                      group.latestConversation;

                    const isActive =
                      group.conversations.some(
                        (conversation) =>
                          conversation.id ===
                          activeConv?.id
                      );

                    const propertyCount =
                      group.conversations
                        .length;

                    return (
                      <div
                        key={group.id}
                        className="conv-item"
                        onClick={() =>
                          handleSelectRenter(
                            group
                          )
                        }
                        style={{
                          margin:
                            "0 10px 4px",
                          padding:
                            "14px",
                          borderRadius:
                            "12px",
                          cursor:
                            "pointer",
                          backgroundColor:
                            isActive
                              ? "#eef2ff"
                              : "transparent",
                          border:
                            isActive
                              ? "1px solid #c7d2fe"
                              : "1px solid transparent",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: "12px",
                          }}
                        >
                          {/* AVATAR */}

                          <div
                            style={{
                              width:
                                "42px",
                              height:
                                "42px",
                              borderRadius:
                                "50%",
                              background:
                                isActive
                                  ? "linear-gradient(135deg, #4f46e5, #6366f1)"
                                  : "linear-gradient(135deg, #e0e7ff, #c7d2fe)",
                              color:
                                isActive
                                  ? "#fff"
                                  : "#4338ca",
                              display:
                                "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              fontSize:
                                "15px",
                              fontWeight:
                                "700",
                              flexShrink: 0,
                            }}
                          >
                            {(
                              group.renterName ||
                              "R"
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          {/* RENTER INFO */}

                          <div
                            style={{
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            <div
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                justifyContent:
                                  "space-between",
                                gap: "8px",
                              }}
                            >
                              <div
                                style={{
                                  fontWeight:
                                    "600",
                                  fontSize:
                                    "14px",
                                  color:
                                    "#0f172a",
                                  whiteSpace:
                                    "nowrap",
                                  overflow:
                                    "hidden",
                                  textOverflow:
                                    "ellipsis",
                                }}
                              >
                                {
                                  group.renterName
                                }
                              </div>

                              <ChevronRight
                                size={15}
                                color="#94a3b8"
                                style={{
                                  flexShrink: 0,
                                }}
                              />
                            </div>

                            {/* PROPERTY COUNT */}

                            <div
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                gap: "5px",
                                marginTop:
                                  "3px",
                                fontSize:
                                  "11.5px",
                                color:
                                  "#6366f1",
                                fontWeight:
                                  "600",
                              }}
                            >
                              <Building2
                                size={11}
                              />

                              {propertyCount ===
                              1
                                ? "1 property"
                                : `${propertyCount} properties`}
                            </div>

                            {/* LATEST MESSAGE */}

                            <div
                              style={{
                                fontSize:
                                  "12.5px",
                                color:
                                  "#94a3b8",
                                whiteSpace:
                                  "nowrap",
                                overflow:
                                  "hidden",
                                textOverflow:
                                  "ellipsis",
                                marginTop:
                                  "3px",
                              }}
                            >
                              {latest?.lastMessage ||
                                "No messages yet"}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )
              )}
            </div>
          </div>

          {/* ==================================================
              RIGHT CHAT
          ================================================== */}

          {activeConv ? (
            <div
              style={{
                display: "flex",
                flexDirection:
                  "column",
                height: "100%",
                minHeight: 0,
                backgroundColor:
                  "#ffffff",
                overflow:
                  "hidden",
              }}
            >
              {/* =================================================
                  CHAT HEADER
              ================================================= */}

              <div
                style={{
                  padding:
                    "16px 24px",
                  borderBottom:
                    "1px solid #e2e8f0",
                  backgroundColor:
                    "#ffffff",
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: "14px",
                  }}
                >
                  {/* PROFILE AVATAR */}

                  <button
                    type="button"
                    className="profile-avatar"
                    onClick={() =>
                      handleViewProfile(
                        activeConv.renterId
                      )
                    }
                    disabled={
                      loadingProfile
                    }
                    style={{
                      width: "46px",
                      height: "46px",
                      borderRadius:
                        "50%",
                      border: "none",
                      background:
                        "linear-gradient(135deg, #4f46e5, #6366f1)",
                      color:
                        "#ffffff",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      cursor:
                        "pointer",
                      fontSize:
                        "17px",
                      fontWeight:
                        "700",
                      flexShrink: 0,
                    }}
                    title="View user profile"
                  >
                    {(
                      activeConv.renterName ||
                      "R"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </button>

                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        handleViewProfile(
                          activeConv.renterId
                        )
                      }
                      style={{
                        border: "none",
                        background:
                          "none",
                        padding: 0,
                        cursor:
                          "pointer",
                        fontSize:
                          "16px",
                        fontWeight:
                          "650",
                        color:
                          "#0f172a",
                      }}
                    >
                      {activeConv.renterName ||
                        "Renter"}
                    </button>

                    {/* PROPERTY */}

                    {activeConv.propertyInfo && (
                      <div
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap: "10px",
                          marginTop:
                            "3px",
                          fontSize:
                            "13px",
                          color:
                            "#64748b",
                        }}
                      >
                        <span
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: "5px",
                            color:
                              "#4f46e5",
                            fontWeight:
                              "600",
                          }}
                        >
                          <Building2
                            size={13}
                          />

                          {
                            activeConv
                              .propertyInfo
                              .title
                          }
                        </span>

                        {activeConv
                          .propertyInfo
                          .location && (
                          <span
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: "3px",
                            }}
                          >
                            <MapPin
                              size={
                                12
                              }
                            />

                            {
                              activeConv
                                .propertyInfo
                                .location
                            }
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* VIEW PROPERTY */}

                {activeConv.propertyInfo
                  ?.id && (
                  <a
                    href={`/properties/${activeConv.propertyInfo.id}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display:
                        "inline-flex",
                      alignItems:
                        "center",
                      gap: "6px",
                      backgroundColor:
                        "#f8fafc",
                      color:
                        "#4f46e5",
                      border:
                        "1px solid #e2e8f0",
                      padding:
                        "8px 14px",
                      borderRadius:
                        "10px",
                      fontSize:
                        "13px",
                      fontWeight:
                        "600",
                      textDecoration:
                        "none",
                    }}
                  >
                    <ExternalLink
                      size={14}
                    />

                    View Property
                  </a>
                )}
              </div>

              {/* =================================================
                  MESSAGES
              ================================================= */}

              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  padding:
                    "24px 20px",
                  overflowY:
                    "auto",
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  gap: "14px",
                  background:
                    "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
                }}
              >
                {messages.map(
                  (message, index) => {
                    const isMe =
                      message.senderId ===
                      currentUserId;

                    const isImage =
                      message.messageType ===
                        "image" ||
                      message.imageUrl;

                    const isAudio =
                      message.messageType ===
                        "audio" ||
                      message.audioUrl;

                    return (
                      <div
                        key={
                          message.id
                        }
                        className="msg-enter"
                        style={{
                          alignSelf:
                            isMe
                              ? "flex-end"
                              : "flex-start",
                          maxWidth:
                            "68%",
                          position:
                            "relative",
                          animationDelay: `${Math.min(
                            index *
                              0.03,
                            0.3
                          )}s`,
                        }}
                      >
                        <div
                          style={{
                            padding:
                              isImage
                                ? "5px"
                                : "11px 16px",
                            borderRadius:
                              isMe
                                ? "18px 18px 4px 18px"
                                : "18px 18px 18px 4px",
                            backgroundColor:
                              isMe
                                ? "#4f46e5"
                                : "#ffffff",
                            color:
                              isMe
                                ? "#ffffff"
                                : "#0f172a",
                            boxShadow:
                              isMe
                                ? "0 2px 8px rgba(79, 70, 229, 0.25)"
                                : "0 1px 4px rgba(15, 23, 42, 0.06)",
                            border:
                              isMe
                                ? "none"
                                : "1px solid #e2e8f0",
                            position:
                              "relative",
                          }}
                        >
                          {/* MESSAGE MENU */}

                          {isMe && (
                            <button
                              onClick={() =>
                                setActiveMenuId(
                                  activeMenuId ===
                                    message.id
                                    ? null
                                    : message.id
                                )
                              }
                              style={{
                                position:
                                  "absolute",
                                top: "6px",
                                right: "6px",
                                background:
                                  "rgba(255,255,255,0.15)",
                                border:
                                  "none",
                                borderRadius:
                                  "6px",
                                color:
                                  "#ffffff",
                                cursor:
                                  "pointer",
                                padding:
                                  "2px",
                                opacity:
                                  0.7,
                              }}
                            >
                              <MoreVertical
                                size={
                                  13
                                }
                              />
                            </button>
                          )}

                          {/* MENU */}

                          {activeMenuId ===
                            message.id && (
                            <div
                              className="modal-enter"
                              style={{
                                position:
                                  "absolute",
                                right: 0,
                                top: "28px",
                                backgroundColor:
                                  "#ffffff",
                                borderRadius:
                                  "10px",
                                boxShadow:
                                  "0 8px 24px rgba(15,23,42,0.12)",
                                border:
                                  "1px solid #e2e8f0",
                                zIndex:
                                  20,
                                width:
                                  "120px",
                                overflow:
                                  "hidden",
                              }}
                            >
                              {!isImage &&
                                !isAudio && (
                                  <button
                                    onClick={() => {
                                      setEditingMsg(
                                        message
                                      );
                                      setEditText(
                                        message.message ||
                                          ""
                                      );
                                      setActiveMenuId(
                                        null
                                      );
                                    }}
                                    style={{
                                      width:
                                        "100%",
                                      display:
                                        "flex",
                                      alignItems:
                                        "center",
                                      gap:
                                        "8px",
                                      padding:
                                        "10px 14px",
                                      border:
                                        "none",
                                      background:
                                        "none",
                                      fontSize:
                                        "13px",
                                      cursor:
                                        "pointer",
                                      color:
                                        "#0f172a",
                                    }}
                                  >
                                    <Edit2
                                      size={
                                        13
                                      }
                                    />

                                    Edit
                                  </button>
                                )}

                              <button
                                onClick={() =>
                                  handleDelete(
                                    message.id
                                  )
                                }
                                style={{
                                  width:
                                    "100%",
                                  display:
                                    "flex",
                                  alignItems:
                                    "center",
                                  gap:
                                    "8px",
                                  padding:
                                    "10px 14px",
                                  border:
                                    "none",
                                  background:
                                    "none",
                                  fontSize:
                                    "13px",
                                  cursor:
                                    "pointer",
                                  color:
                                    "#ef4444",
                                }}
                              >
                                <Trash2
                                  size={
                                    13
                                  }
                                />

                                Delete
                              </button>
                            </div>
                          )}

                          {/* IMAGE */}

                          {isImage && (
                            <img
                              src={
                                message.imageUrl ||
                                message.message
                              }
                              alt="Attachment"
                              onClick={() =>
                                setPreviewImage(
                                  message.imageUrl ||
                                    message.message
                                )
                              }
                              style={{
                                maxWidth:
                                  "240px",
                                maxHeight:
                                  "220px",
                                borderRadius:
                                  "12px",
                                cursor:
                                  "pointer",
                                display:
                                  "block",
                              }}
                            />
                          )}

                          {/* AUDIO */}

                          {isAudio && (
                            <audio
                              controls
                              preload="metadata"
                              style={{
                                width:
                                  "240px",
                                maxWidth:
                                  "100%",
                              }}
                            >
                              <source
                                src={
                                  message.audioUrl
                                }
                              />
                            </audio>
                          )}

                          {/* TEXT */}

                          {!isImage &&
                            !isAudio &&
                            message.message && (
                              <p
                                style={{
                                  margin: 0,
                                  fontSize:
                                    "14.5px",
                                  lineHeight:
                                    "1.45",
                                  whiteSpace:
                                    "pre-wrap",
                                  paddingRight:
                                    isMe
                                      ? "18px"
                                      : 0,
                                }}
                              >
                                {
                                  message.message
                                }
                              </p>
                            )}

                          {message.isEdited && (
                            <div
                              style={{
                                textAlign:
                                  "right",
                                marginTop:
                                  "4px",
                                fontSize:
                                  "10px",
                                opacity:
                                  0.7,
                                fontStyle:
                                  "italic",
                              }}
                            >
                              edited
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                )}

                <div
                  ref={messagesEndRef}
                />
              </div>

              {/* =================================================
                  UPLOAD STATUS
              ================================================= */}

              {isUploading && (
                <div
                  style={{
                    padding:
                      "8px 20px",
                    backgroundColor:
                      "#eef2ff",
                    fontSize:
                      "13px",
                    color:
                      "#4f46e5",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: "8px",
                    flexShrink: 0,
                    borderTop:
                      "1px solid #e0e7ff",
                  }}
                >
                  <Loader2
                    className="animate-spin"
                    size={15}
                  />

                  Uploading media...
                </div>
              )}

              {/* =================================================
                  MESSAGE INPUT
              ================================================= */}

              <form
                onSubmit={handleSend}
                style={{
                  padding:
                    "14px 18px",
                  borderTop:
                    "1px solid #e2e8f0",
                  backgroundColor:
                    "#ffffff",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: "10px",
                  flexShrink: 0,
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={
                    handleImageSelect
                  }
                  style={{
                    display:
                      "none",
                  }}
                />

                {/* IMAGE */}

                <button
                  type="button"
                  className="btn-icon"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={
                    isUploading
                  }
                  style={{
                    background:
                      "#f1f5f9",
                    border:
                      "none",
                    color:
                      "#4f46e5",
                    cursor:
                      "pointer",
                    padding: "9px",
                    borderRadius:
                      "10px",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                  }}
                >
                  <ImageIcon
                    size={19}
                  />
                </button>

                {/* VOICE */}

                <button
                  type="button"
                  className="btn-icon"
                  onClick={
                    isRecording
                      ? stopRecording
                      : startRecording
                  }
                  disabled={
                    isUploading
                  }
                  style={{
                    background:
                      isRecording
                        ? "#fef2f2"
                        : "#f1f5f9",
                    border:
                      "none",
                    color:
                      isRecording
                        ? "#ef4444"
                        : "#4f46e5",
                    cursor:
                      "pointer",
                    padding: "9px",
                    borderRadius:
                      "10px",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    animation:
                      isRecording
                        ? "pulse 1.2s infinite"
                        : "none",
                  }}
                >
                  {isRecording ? (
                    <Square
                      size={19}
                    />
                  ) : (
                    <Mic size={19} />
                  )}
                </button>

                {/* TEXT INPUT */}

                <input
                  type="text"
                  placeholder={
                    isRecording
                      ? "Recording audio..."
                      : "Type a message..."
                  }
                  value={
                    newMessage
                  }
                  disabled={
                    isRecording
                  }
                  onChange={(e) =>
                    setNewMessage(
                      e.target.value
                    )
                  }
                  style={{
                    flex: 1,
                    border:
                      "1.5px solid #e2e8f0",
                    borderRadius:
                      "24px",
                    padding:
                      "11px 18px",
                    fontSize:
                      "14.5px",
                    outline:
                      "none",
                    backgroundColor:
                      "#f8fafc",
                    color:
                      "#0f172a",
                  }}
                />

                {/* SEND */}

                <button
                  type="submit"
                  className="send-btn"
                  disabled={
                    !newMessage.trim() ||
                    isUploading
                  }
                  style={{
                    background:
                      !newMessage.trim()
                        ? "#c7d2fe"
                        : "linear-gradient(135deg, #4f46e5, #6366f1)",
                    color:
                      "#ffffff",
                    border:
                      "none",
                    borderRadius:
                      "50%",
                    width:
                      "42px",
                    height:
                      "42px",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    cursor:
                      !newMessage.trim()
                        ? "not-allowed"
                        : "pointer",
                    flexShrink: 0,
                  }}
                >
                  <Send
                    size={17}
                  />
                </button>
              </form>
            </div>
          ) : (
            /* ==================================================
               EMPTY CHAT
            ================================================== */

            <div
              style={{
                display:
                  "flex",
                flexDirection:
                  "column",
                justifyContent:
                  "center",
                alignItems:
                  "center",
                color:
                  "#94a3b8",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width:
                    "72px",
                  height:
                    "72px",
                  borderRadius:
                    "50%",
                  background:
                    "#f1f5f9",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                }}
              >
                <Send
                  size={28}
                  color="#cbd5e1"
                />
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize:
                    "15px",
                  fontWeight:
                    "500",
                }}
              >
                Select a renter to
                start messaging
              </p>
            </div>
          )}
        </div>

        {/* ======================================================
            PROPERTY SELECTOR MODAL
        ====================================================== */}

        {selectedRenterGroup &&
          selectedRenterGroup
            .conversations.length > 1 && (
            <div
              onClick={() =>
                setSelectedRenterGroup(
                  null
                )
              }
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor:
                  "rgba(15, 23, 42, 0.45)",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                zIndex: 3000,
                padding: "20px",
                animation:
                  "fadeIn 0.2s ease",
              }}
            >
              <div
                onClick={(e) =>
                  e.stopPropagation()
                }
                className="modal-enter"
                style={{
                  width:
                    "100%",
                  maxWidth:
                    "500px",
                  backgroundColor:
                    "#ffffff",
                  borderRadius:
                    "18px",
                  boxShadow:
                    "0 25px 70px rgba(15,23,42,0.22)",
                  overflow:
                    "hidden",
                }}
              >
                {/* MODAL HEADER */}

                <div
                  style={{
                    padding:
                      "20px 22px",
                    borderBottom:
                      "1px solid #e2e8f0",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "space-between",
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize:
                          "18px",
                        fontWeight:
                          "700",
                        color:
                          "#0f172a",
                      }}
                    >
                      Select Property
                    </h3>

                    <p
                      style={{
                        margin:
                          "4px 0 0",
                        fontSize:
                          "13px",
                        color:
                          "#64748b",
                      }}
                    >
                      Choose a conversation
                      for{" "}
                      <strong
                        style={{
                          color:
                            "#334155",
                        }}
                      >
                        {
                          selectedRenterGroup.renterName
                        }
                      </strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedRenterGroup(
                        null
                      )
                    }
                    style={{
                      width:
                        "36px",
                      height:
                        "36px",
                      borderRadius:
                        "50%",
                      border:
                        "none",
                      background:
                        "#f1f5f9",
                      color:
                        "#475569",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      cursor:
                        "pointer",
                    }}
                  >
                    <X
                      size={17}
                    />
                  </button>
                </div>

                {/* PROPERTY LIST */}

                <div
                  style={{
                    padding:
                      "16px",
                    display:
                      "grid",
                    gap:
                      "10px",
                    maxHeight:
                      "55vh",
                    overflowY:
                      "auto",
                  }}
                >
                  {selectedRenterGroup.conversations.map(
                    (conversation) => (
                      <button
                        key={
                          conversation.id
                        }
                        type="button"
                        className="property-option"
                        onClick={() =>
                          handleSelectPropertyConversation(
                            conversation
                          )
                        }
                        style={{
                          width:
                            "100%",
                          textAlign:
                            "left",
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap:
                            "13px",
                          padding:
                            "14px",
                          background:
                            "#ffffff",
                          border:
                            "1px solid #e2e8f0",
                          borderRadius:
                            "13px",
                          cursor:
                            "pointer",
                        }}
                      >
                        <div
                          style={{
                            width:
                              "42px",
                            height:
                              "42px",
                            borderRadius:
                              "11px",
                            background:
                              "#eef2ff",
                            color:
                              "#4f46e5",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            flexShrink: 0,
                          }}
                        >
                          <Building2
                            size={
                              19
                            }
                          />
                        </div>

                        <div
                          style={{
                            flex:
                              1,
                            minWidth:
                              0,
                          }}
                        >
                          <div
                            style={{
                              fontSize:
                                "14px",
                              fontWeight:
                                "650",
                              color:
                                "#0f172a",
                              whiteSpace:
                                "nowrap",
                              overflow:
                                "hidden",
                              textOverflow:
                                "ellipsis",
                            }}
                          >
                            {conversation
                              .propertyInfo
                              ?.title ||
                              "Property Enquiry"}
                          </div>

                          <div
                            style={{
                              marginTop:
                                "3px",
                              fontSize:
                                "12px",
                              color:
                                "#64748b",
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap:
                                "4px",
                            }}
                          >
                            {conversation
                              .propertyInfo
                              ?.location && (
                              <>
                                <MapPin
                                  size={
                                    11
                                  }
                                />

                                {
                                  conversation
                                    .propertyInfo
                                    .location
                                }
                              </>
                            )}
                          </div>

                          <div
                            style={{
                              marginTop:
                                "4px",
                              fontSize:
                                "11.5px",
                              color:
                                "#94a3b8",
                              whiteSpace:
                                "nowrap",
                              overflow:
                                "hidden",
                              textOverflow:
                                "ellipsis",
                            }}
                          >
                            {conversation.lastMessage ||
                              "No messages yet"}
                          </div>
                        </div>

                        <ChevronRight
                          size={17}
                          color="#94a3b8"
                        />
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

        {/* ======================================================
            IMAGE PREVIEW
        ====================================================== */}

        {previewImage && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor:
                "rgba(15, 23, 42, 0.88)",
              display:
                "flex",
              justifyContent:
                "center",
              alignItems:
                "center",
              zIndex: 4000,
            }}
            onClick={() =>
              setPreviewImage(null)
            }
          >
            <button
              type="button"
              onClick={() =>
                setPreviewImage(null)
              }
              style={{
                position:
                  "absolute",
                top: "24px",
                right: "24px",
                background:
                  "rgba(255,255,255,0.12)",
                border:
                  "none",
                borderRadius:
                  "50%",
                width:
                  "44px",
                height:
                  "44px",
                color:
                  "#ffffff",
                cursor:
                  "pointer",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
              }}
            >
              <X size={24} />
            </button>

            <img
              src={previewImage}
              alt="Preview"
              className="modal-enter"
              style={{
                maxWidth:
                  "90%",
                maxHeight:
                  "88%",
                borderRadius:
                  "12px",
                boxShadow:
                  "0 20px 60px rgba(0,0,0,0.4)",
              }}
            />
          </div>
        )}

        {/* ======================================================
            EDIT MESSAGE MODAL
        ====================================================== */}

        {editingMsg && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor:
                "rgba(15, 23, 42, 0.5)",
              display:
                "flex",
              justifyContent:
                "center",
              alignItems:
                "center",
              zIndex: 4000,
            }}
          >
            <div
              className="modal-enter"
              style={{
                backgroundColor:
                  "#ffffff",
                borderRadius:
                  "16px",
                padding:
                  "24px",
                width:
                  "400px",
                maxWidth:
                  "calc(100vw - 40px)",
                boxShadow:
                  "0 20px 50px rgba(15,23,42,0.15)",
              }}
            >
              <h3
                style={{
                  margin:
                    "0 0 16px",
                  fontSize:
                    "17px",
                  fontWeight:
                    "650",
                  color:
                    "#0f172a",
                }}
              >
                Edit Message
              </h3>

              <textarea
                value={editText}
                onChange={(e) =>
                  setEditText(
                    e.target.value
                  )
                }
                rows={4}
                style={{
                  width:
                    "100%",
                  boxSizing:
                    "border-box",
                  border:
                    "1.5px solid #e2e8f0",
                  borderRadius:
                    "12px",
                  padding:
                    "12px 14px",
                  fontSize:
                    "14.5px",
                  outline:
                    "none",
                  resize:
                    "none",
                  fontFamily:
                    "inherit",
                  color:
                    "#0f172a",
                }}
              />

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "flex-end",
                  gap:
                    "10px",
                  marginTop:
                    "16px",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setEditingMsg(
                      null
                    )
                  }
                  style={{
                    padding:
                      "9px 18px",
                    border:
                      "1px solid #e2e8f0",
                    background:
                      "#f8fafc",
                    borderRadius:
                      "10px",
                    cursor:
                      "pointer",
                    fontSize:
                      "13.5px",
                    color:
                      "#475569",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleSaveEdit
                  }
                  style={{
                    padding:
                      "9px 18px",
                    border:
                      "none",
                    background:
                      "linear-gradient(135deg, #4f46e5, #6366f1)",
                    color:
                      "#fff",
                    borderRadius:
                      "10px",
                    cursor:
                      "pointer",
                    fontSize:
                      "13.5px",
                    fontWeight:
                      "600",
                  }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================
            USER PROFILE MODAL
        ====================================================== */}

        {viewingProfile && (
          <div
            onClick={() =>
              setViewingProfile(null)
            }
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor:
                "rgba(15, 23, 42, 0.55)",
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              zIndex: 4000,
              padding: "20px",
            }}
          >
            <div
              className="modal-enter"
              onClick={(e) =>
                e.stopPropagation()
              }
              style={{
                width:
                  "100%",
                maxWidth:
                  "460px",
                maxHeight:
                  "90vh",
                overflowY:
                  "auto",
                backgroundColor:
                  "#ffffff",
                borderRadius:
                  "20px",
                boxShadow:
                  "0 25px 60px rgba(15,23,42,0.2)",
              }}
            >
              {/* HEADER */}

              <div
                style={{
                  padding:
                    "20px 24px",
                  borderBottom:
                    "1px solid #e2e8f0",
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize:
                      "17px",
                    fontWeight:
                      "650",
                    color:
                      "#0f172a",
                  }}
                >
                  User Profile
                </h3>

                <button
                  type="button"
                  onClick={() =>
                    setViewingProfile(
                      null
                    )
                  }
                  style={{
                    width:
                      "36px",
                    height:
                      "36px",
                    borderRadius:
                      "50%",
                    border:
                      "none",
                    backgroundColor:
                      "#f1f5f9",
                    color:
                      "#475569",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    cursor:
                      "pointer",
                  }}
                >
                  <X size={17} />
                </button>
              </div>

              {/* AVATAR */}

              <div
                style={{
                  padding:
                    "28px 24px 20px",
                  textAlign:
                    "center",
                  background:
                    "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
                }}
              >
                {viewingProfile.profileImage ? (
                  <img
                    src={
                      viewingProfile.profileImage
                    }
                    alt={
                      viewingProfile.fullName ||
                      "User"
                    }
                    style={{
                      width:
                        "96px",
                      height:
                        "96px",
                      borderRadius:
                        "50%",
                      objectFit:
                        "cover",
                      border:
                        "4px solid #ffffff",
                      boxShadow:
                        "0 6px 20px rgba(15,23,42,0.12)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width:
                        "96px",
                      height:
                        "96px",
                      borderRadius:
                        "50%",
                      background:
                        "linear-gradient(135deg, #4f46e5, #6366f1)",
                      color:
                        "#ffffff",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      margin:
                        "0 auto",
                      fontSize:
                        "34px",
                      fontWeight:
                        "700",
                    }}
                  >
                    {(
                      viewingProfile.fullName ||
                      "U"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <h2
                  style={{
                    margin:
                      "14px 0 4px",
                    fontSize:
                      "21px",
                    color:
                      "#0f172a",
                    fontWeight:
                      "700",
                  }}
                >
                  {viewingProfile.fullName ||
                    "Unknown User"}
                </h2>

                <div
                  style={{
                    display:
                      "inline-block",
                    fontSize:
                      "12.5px",
                    color:
                      "#4f46e5",
                    background:
                      "#eef2ff",
                    padding:
                      "3px 12px",
                    borderRadius:
                      "20px",
                    fontWeight:
                      "600",
                    textTransform:
                      "capitalize",
                  }}
                >
                  {viewingProfile.role ||
                    "Renter"}
                </div>
              </div>

              {/* INFO */}

              <div
                style={{
                  padding:
                    "8px 24px 28px",
                  display:
                    "grid",
                  gap:
                    "16px",
                }}
              >
                {[
                  {
                    label: "Email",
                    value:
                      viewingProfile.email,
                  },
                  {
                    label: "Phone",
                    value:
                      viewingProfile.phone,
                  },
                  {
                    label: "Gender",
                    value:
                      viewingProfile.gender,
                  },
                  {
                    label: "Age",
                    value:
                      viewingProfile.age,
                  },
                  {
                    label: "Occupation",
                    value:
                      viewingProfile.occupation,
                  },
                  {
                    label: "Address",
                    value:
                      viewingProfile.address,
                  },
                ].map((item) => (
                  <div
                    key={
                      item.label
                    }
                  >
                    <div
                      style={{
                        fontSize:
                          "11px",
                        fontWeight:
                          "650",
                        color:
                          "#94a3b8",
                        textTransform:
                          "uppercase",
                        letterSpacing:
                          "0.5px",
                        marginBottom:
                          "4px",
                      }}
                    >
                      {item.label}
                    </div>

                    <div
                      style={{
                        fontSize:
                          "14.5px",
                        color:
                          "#0f172a",
                        fontWeight:
                          "500",
                      }}
                    >
                      {item.value ||
                        "—"}
                    </div>
                  </div>
                ))}

                <div>
                  <div
                    style={{
                      fontSize:
                        "11px",
                      fontWeight:
                        "650",
                      color:
                        "#94a3b8",
                      textTransform:
                        "uppercase",
                      letterSpacing:
                        "0.5px",
                      marginBottom:
                        "6px",
                    }}
                  >
                    Bio
                  </div>

                  <div
                    style={{
                      fontSize:
                        "14px",
                      color:
                        "#475569",
                      lineHeight:
                        "1.55",
                      backgroundColor:
                        "#f8fafc",
                      padding:
                        "14px 16px",
                      borderRadius:
                        "12px",
                      border:
                        "1px solid #e2e8f0",
                    }}
                  >
                    {viewingProfile.bio ||
                      "No bio available."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ============================================================
// HELPER
// ============================================================

function getConversationDate(conversation) {
  if (!conversation) {
    return 0;
  }

  const timestamp =
    conversation.updatedAt ||
    conversation.createdAt;

  if (!timestamp) {
    return 0;
  }

  if (
    typeof timestamp.toMillis ===
    "function"
  ) {
    return timestamp.toMillis();
  }

  if (
    timestamp instanceof Date
  ) {
    return timestamp.getTime();
  }

  if (
    typeof timestamp === "number"
  ) {
    return timestamp;
  }

  const parsed =
    new Date(timestamp).getTime();

  return Number.isNaN(parsed)
    ? 0
    : parsed;
}