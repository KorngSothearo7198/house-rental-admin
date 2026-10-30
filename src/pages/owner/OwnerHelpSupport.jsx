import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { supportTicketService } from "../../services/supportTicketService";
import {
  ArrowLeft,
  Send,
  Loader2,
  MessageSquare,
  LifeBuoy,
  Clock3,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  UserRound,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

const statusConfig = {
  open: {
    label: "Open",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  in_progress: {
    label: "In Progress",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  waiting_for_owner: {
    label: "Your Reply Needed",
    className: "border-violet-200 bg-violet-50 text-violet-700",
  },
  resolved: {
    label: "Resolved",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  closed: {
    label: "Closed",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },
};

export default function OwnerHelpSupport() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");

  const [sending, setSending] = useState(false);
  const [replySending, setReplySending] = useState(false);
  const [reply, setReply] = useState("");

  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [success, setSuccess] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadTickets = useCallback(async (userId) => {
    if (!userId) return;

    const list = await supportTicketService.getMyTickets(userId);
    setTickets(list);
  }, []);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      if (!active) return;
      setUser(currentUser);
      setLoadingTickets(true);
      setErrorMessage("");

      try {
        const list = await supportTicketService.getMyTickets(currentUser.uid);

        if (active) setTickets(list);
      } catch (error) {
        console.error("Failed to load tickets:", error);
        if (active) {
          setErrorMessage(
            "Unable to load your tickets. Please refresh and try again.",
          );
        }
      } finally {
        if (active) setLoadingTickets(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [navigate]);

  const handleRefresh = async () => {
    if (!user) return;

    setRefreshing(true);
    setErrorMessage("");

    try {
      await loadTickets(user.uid);
    } catch (error) {
      console.error("Failed to refresh tickets:", error);
      setErrorMessage("Could not refresh tickets.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!subject.trim() || !message.trim()) return;

    setSending(true);
    setSuccess("");
    setErrorMessage("");

    try {
      await supportTicketService.createTicket({
        subject,
        message,
        category,
      });

      setSubject("");
      setMessage("");
      setCategory("general");
      setSuccess("Your support ticket has been submitted successfully.");

      await loadTickets(user.uid);
    } catch (error) {
      console.error("Failed to send support ticket:", error);
      setErrorMessage(
        error.message || "Failed to send the ticket. Please try again.",
      );
    } finally {
      setSending(false);
    }
  };

  const openTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setReply("");
    setTicketMessages([]);
    setLoadingMessages(true);
    setErrorMessage("");

    try {
      const [latestTicket, messages] = await Promise.all([
        supportTicketService.getTicketById(ticket.id),
        supportTicketService.getTicketMessages(ticket.id),
      ]);

      setSelectedTicket(latestTicket);
      setTicketMessages(messages);

      if (user) await loadTickets(user.uid);
    } catch (error) {
      console.error("Failed to open ticket:", error);
      setErrorMessage("Unable to load the ticket conversation.");
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleReply = async (event) => {
    event.preventDefault();

    if (!selectedTicket || !reply.trim()) return;

    setReplySending(true);
    setErrorMessage("");

    try {
      await supportTicketService.sendReply(selectedTicket.id, reply);

      setReply("");

      const [latestTicket, messages] = await Promise.all([
        supportTicketService.getTicketById(selectedTicket.id),
        supportTicketService.getTicketMessages(selectedTicket.id),
      ]);

      setSelectedTicket(latestTicket);
      setTicketMessages(messages);

      if (user) await loadTickets(user.uid);
    } catch (error) {
      console.error("Failed to send reply:", error);
      setErrorMessage(
        error.message || "Could not send your reply. Please try again.",
      );
    } finally {
      setReplySending(false);
    }
  };

  const closeTicketDialog = () => {
    setSelectedTicket(null);
    setTicketMessages([]);
    setReply("");
    setErrorMessage("");
  };

  const openCount = tickets.filter(
    (ticket) => !["resolved", "closed"].includes(ticket.status || "open"),
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-7">
          <button
            type="button"
            onClick={() => navigate("/owner/profile")}
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-indigo-600"
          >
            <ArrowLeft size={16} />
            Back to Profile
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <LifeBuoy size={20} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Owner Support Center
                </span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Help & Support
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Submit a problem, contact the admin team, and follow every reply
                in one conversation.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total Tickets" value={tickets.length} />
              <StatCard label="Active Tickets" value={openCount} />
            </div>
          </div>
        </div>

        {errorMessage && !selectedTicket && (
          <Alert type="error" message={errorMessage} />
        )}

        {success && <Alert type="success" message={success} />}

        {/* CREATE TICKET */}
        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <MessageSquare size={20} />
            </div>

            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Create a Support Ticket
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Explain your problem clearly so the admin can help you.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="ticket-category"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Category
              </label>

              <select
                id="ticket-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              >
                <option value="general">General Question</option>
                <option value="property">Property Listing</option>
                <option value="booking">Booking Problem</option>
                <option value="payment">Payment Problem</option>
                <option value="account">Account Problem</option>
                <option value="technical">Technical Issue</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="ticket-subject"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Subject
              </label>

              <input
                id="ticket-subject"
                type="text"
                maxLength={120}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="e.g. Unable to update a property"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="ticket-message"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Describe Your Problem
              </label>

              <textarea
                id="ticket-message"
                rows={5}
                maxLength={5000}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Describe what happened, what you expected, and any relevant details..."
                className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                required
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {message.length}/5000 characters
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={sending || !subject.trim() || !message.trim()}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {sending ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                Submitting Ticket...
              </>
            ) : (
              <>
                <Send size={16} />
                Submit Ticket
              </>
            )}
          </button>
        </form>

        {/* MY TICKETS */}
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
                <MessageSquare size={18} />
                My Tickets
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Open a ticket to view the conversation or reply to the admin.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                size={14}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

          {loadingTickets ? (
            <LoadingState text="Loading your tickets..." />
          ) : tickets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <MessageSquare size={22} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                No support tickets yet
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-500">
                Create a ticket above when you need help with a property,
                booking, payment, or account.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onView={() => openTicket(ticket)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* TICKET CONVERSATION DIALOG */}
      {selectedTicket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeTicketDialog();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ticket-dialog-title"
            className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  Support Ticket
                </p>
                <h2
                  id="ticket-dialog-title"
                  className="break-words text-lg font-extrabold text-slate-900"
                >
                  {selectedTicket.subject}
                </h2>
                <p className="mt-1 break-all text-xs text-slate-400">
                  Ticket ID: {selectedTicket.id}
                </p>
              </div>

              <button
                type="button"
                onClick={closeTicketDialog}
                aria-label="Close ticket dialog"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3 sm:px-6">
              <StatusBadge status={selectedTicket.status} />
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold capitalize text-slate-600">
                {(selectedTicket.category || "general").replaceAll("_", " ")}
              </span>
              <span className="ml-auto text-xs text-slate-400">
                Created {formatTicketDate(selectedTicket.createdAt)}
              </span>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-5 sm:px-6">
              {loadingMessages ? (
                <LoadingState text="Loading conversation..." />
              ) : ticketMessages.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No messages found for this ticket.
                </p>
              ) : (
                ticketMessages.map((item) => (
                  <ConversationMessage
                    key={item.id}
                    item={item}
                    isOwner={item.senderRole === "owner"}
                  />
                ))
              )}
            </div>

            {errorMessage && (
              <div className="px-5 pt-3 sm:px-6">
                <Alert type="error" message={errorMessage} />
              </div>
            )}

            <form
              onSubmit={handleReply}
              className="border-t border-slate-200 bg-white p-4 sm:p-5"
            >
              {["resolved", "closed"].includes(selectedTicket.status) ? (
                <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-3 text-sm text-slate-600">
                  <CheckCircle2 size={17} />
                  This ticket is {selectedTicket.status}. You cannot reply
                  unless the admin reopens it.
                </div>
              ) : (
                <>
                  <label
                    htmlFor="ticket-reply"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Your Reply
                  </label>

                  <div className="flex items-end gap-2">
                    <textarea
                      id="ticket-reply"
                      rows={3}
                      maxLength={5000}
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      placeholder="Write a reply to the admin..."
                      className="min-w-0 flex-1 resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    />

                    <button
                      type="submit"
                      disabled={
                        replySending || !reply.trim() || loadingMessages
                      }
                      className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {replySending ? (
                        <Loader2 size={17} className="animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                      <span className="hidden sm:inline">Reply</span>
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Replies are saved in this ticket's conversation history.
                  </p>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TicketCard({ ticket, onView }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md sm:p-5">
      <div className="flex items-start gap-3">
        <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 sm:flex">
          <MessageSquare size={19} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <h3 className="break-words text-sm font-extrabold text-slate-900">
              {ticket.subject}
            </h3>
            <StatusBadge status={ticket.status} />
          </div>

          <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-xs leading-5 text-slate-500">
            {ticket.lastMessage || ticket.message}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Clock3 size={12} />
              {formatTicketDate(ticket.lastMessageAt || ticket.createdAt)}
            </span>
            <span className="capitalize">
              {String(ticket.category || "general").replaceAll("_", " ")}
            </span>
            {ticket.lastMessageBy === "admin" && (
              <span className="font-bold text-violet-600">Admin replied</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={onView}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
        >
          <Eye size={14} />
          View Conversation
        </button>
      </div>
    </article>
  );
}

function ConversationMessage({ item, isOwner }) {
  return (
    <div className={`flex ${isOwner ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-2xl border p-4 shadow-sm sm:max-w-[78%] ${
          isOwner
            ? "border-indigo-200 bg-indigo-50"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {isOwner ? (
            <UserRound size={14} className="text-indigo-600" />
          ) : (
            <ShieldCheck size={14} className="text-emerald-600" />
          )}

          <span className="text-xs font-extrabold text-slate-800">
            {isOwner ? "You" : item.senderName || "Admin Support"}
          </span>

          <span className="text-[10px] text-slate-400">
            {formatTicketDate(item.createdAt)}
          </span>
        </div>

        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
          {item.message}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status = "open" }) {
  const config = statusConfig[status] || statusConfig.open;

  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${config.className}`}
    >
      {status === "resolved" ? (
        <CheckCircle2 size={12} />
      ) : status === "closed" ? (
        <XCircle size={12} />
      ) : (
        <Clock3 size={12} />
      )}
      {config.label}
    </span>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="min-w-28 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

function LoadingState({ text }) {
  return (
    <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-slate-500">
      <Loader2 size={19} className="animate-spin text-indigo-600" />
      {text}
    </div>
  );
}

function Alert({ type, message }) {
  const isSuccess = type === "success";

  return (
    <div
      role="status"
      className={`mb-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
      ) : (
        <XCircle size={17} className="mt-0.5 shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
}

function formatTicketDate(timestamp) {
  if (!timestamp) return "Recently submitted";

  try {
    let date;

    if (typeof timestamp.toDate === "function") {
      date = timestamp.toDate();
    } else if (typeof timestamp.seconds === "number") {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }

    if (Number.isNaN(date.getTime())) return "Recently submitted";

    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Recently submitted";
  }
}
