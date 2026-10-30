
import React, { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate, useParams } from "react-router-dom";
import { auth, db } from "../../services/firebase";
import { doc, getDoc } from "firebase/firestore";
import { supportTicketService } from "../../services/supportTicketService";
import {
  ArrowLeft,
  Search,
  MessageSquare,
  Clock3,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  Send,
  Loader2,
  RefreshCw,
  UserRound,
  Mail,
  ShieldCheck,
} from "lucide-react";

const statuses = [
  "all",
  "open",
  "in_progress",
  "waiting_for_owner",
  "resolved",
  "closed",
];

const statusLabels = {
  open: "Open",
  in_progress: "In Progress",
  waiting_for_owner: "Waiting for Owner",
  resolved: "Resolved",
  closed: "Closed",
};

const statusStyles = {
  open: "border-amber-200 bg-amber-50 text-amber-700",
  in_progress: "border-blue-200 bg-blue-50 text-blue-700",
  waiting_for_owner: "border-violet-200 bg-violet-50 text-violet-700",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  closed: "border-slate-200 bg-slate-100 text-slate-600",
};

export default function AdminSupportTickets() {
  const navigate = useNavigate();
  const { ticketId } = useParams();

  const [admin, setAdmin] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [loadingConversation, setLoadingConversation] = useState(false);

  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadTickets = useCallback(async (adminId) => {
    const list = await supportTicketService.getAllTickets(adminId);
    setTickets(list);
    return list;
  }, []);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      try {
        const userSnapshot = await getDoc(
          doc(db, "users", currentUser.uid),
        );

        if (!userSnapshot.exists()) {
          navigate("/login");
          return;
        }

        const userData = userSnapshot.data();

        if (String(userData.role || "").toLowerCase() !== "admin") {
          navigate("/login");
          return;
        }

        if (!active) return;
        setAdmin({
          id: currentUser.uid,
          name:
            userData.fullName ||
            userData.name ||
            currentUser.displayName ||
            "Admin",
        });

        setLoading(true);
        await loadTickets(currentUser.uid);
      } catch (error) {
        console.error("Failed to load admin tickets:", error);

        if (active) {
          setErrorMessage(
            error.message || "Unable to load support tickets.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [navigate, loadTickets]);

  const openTicket = useCallback(
    async (id) => {
      setSelectedTicket(null);
      setTicketMessages([]);
      setReply("");
      setErrorMessage("");
      setSuccessMessage("");
      setLoadingConversation(true);

      try {
        const [ticket, messages] = await Promise.all([
          supportTicketService.getTicketById(id),
          supportTicketService.getTicketMessages(id),
        ]);

        if (!admin || ticket.adminId !== admin.id) {
          throw new Error("You do not have access to this ticket.");
        }

        setSelectedTicket(ticket);
        setTicketMessages(messages);
      } catch (error) {
        console.error("Failed to open support ticket:", error);
        setErrorMessage(error.message || "Could not open this ticket.");
        navigate("/admin/support-tickets", { replace: true });
      } finally {
        setLoadingConversation(false);
      }
    },
    [admin, navigate],
  );

  useEffect(() => {
    if (!admin) return;

    if (ticketId) {
      openTicket(ticketId);
    } else {
      setSelectedTicket(null);
      setTicketMessages([]);
    }
  }, [admin, ticketId, openTicket]);

  const handleRefresh = async () => {
    if (!admin) return;

    setRefreshing(true);
    setErrorMessage("");

    try {
      await loadTickets(admin.id);

      if (selectedTicket) {
        const [ticket, messages] = await Promise.all([
          supportTicketService.getTicketById(selectedTicket.id),
          supportTicketService.getTicketMessages(selectedTicket.id),
        ]);

        setSelectedTicket(ticket);
        setTicketMessages(messages);
      }
    } catch (error) {
      console.error("Refresh failed:", error);
      setErrorMessage("Could not refresh support tickets.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleReply = async (event) => {
    event.preventDefault();

    if (!selectedTicket || !reply.trim()) return;

    setSendingReply(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await supportTicketService.sendReply(
        selectedTicket.id,
        reply,
      );

      const [ticket, messages] = await Promise.all([
        supportTicketService.getTicketById(selectedTicket.id),
        supportTicketService.getTicketMessages(selectedTicket.id),
        loadTickets(admin.id),
      ]);

      setSelectedTicket(ticket);
      setTicketMessages(messages);
      setReply("");
      setSuccessMessage("Reply sent to the owner.");
    } catch (error) {
      console.error("Reply failed:", error);
      setErrorMessage(error.message || "Could not send the reply.");
    } finally {
      setSendingReply(false);
    }
  };

  const handleStatusChange = async (status) => {
    if (!selectedTicket || !admin) return;

    setUpdatingStatus(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await supportTicketService.updateTicketStatus(
        selectedTicket.id,
        status,
      );

      const [ticket] = await Promise.all([
        supportTicketService.getTicketById(selectedTicket.id),
        loadTickets(admin.id),
      ]);

      setSelectedTicket(ticket);
      setSuccessMessage(`Ticket status changed to ${statusLabels[status]}.`);
    } catch (error) {
      console.error("Status update failed:", error);
      setErrorMessage(error.message || "Could not update ticket status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const term = search.trim().toLowerCase();

    const matchesSearch =
      !term ||
      [
        ticket.subject,
        ticket.message,
        ticket.userName,
        ticket.userEmail,
        ticket.id,
        ticket.category,
      ].some((value) => String(value || "").toLowerCase().includes(term));

    const matchesStatus =
      statusFilter === "all" ||
      (ticket.status || "open") === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const closeTicketDialog = () => {
    navigate("/admin/support-tickets");
  };

  const activeCount = tickets.filter(
    (ticket) =>
      !["resolved", "closed"].includes(ticket.status || "open"),
  ).length;

  const waitingCount = tickets.filter(
    (ticket) => ticket.status === "waiting_for_owner",
  ).length;

  const resolvedCount = tickets.filter(
    (ticket) => ticket.status === "resolved",
  ).length;

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="animate-spin text-indigo-600" size={20} />
        Loading support tickets...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate("/admin")}
              className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>

            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <MessageSquare size={20} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Admin Support Center
              </span>
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Support Tickets
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Review owner requests, reply to conversations, and manage ticket
              status.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh Tickets
          </button>
        </div>

        {errorMessage && !selectedTicket && (
          <Alert type="error" message={errorMessage} />
        )}

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard
            label="All Tickets"
            value={tickets.length}
            icon={<MessageSquare size={19} />}
            color="indigo"
          />
          <SummaryCard
            label="Active"
            value={activeCount}
            icon={<Clock3 size={19} />}
            color="amber"
          />
          <SummaryCard
            label="Waiting for Owner"
            value={waitingCount}
            icon={<UserRound size={19} />}
            color="violet"
          />
          <SummaryCard
            label="Resolved"
            value={resolvedCount}
            icon={<CheckCircle2 size={19} />}
            color="emerald"
          />
        </div>

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search subject, owner, email, category, or ticket ID..."
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500"
              aria-label="Filter by ticket status"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status === "all"
                    ? "All statuses"
                    : statusLabels[status]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {filteredTickets.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <MessageSquare
                size={30}
                className="mx-auto mb-3 text-slate-300"
              />
              <h3 className="text-sm font-bold text-slate-800">
                No tickets found
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Try another search term or status filter.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTickets.map((ticket) => (
                <article
                  key={ticket.id}
                  className="flex flex-col gap-4 p-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 sm:flex">
                      <MessageSquare size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-sm font-extrabold text-slate-900">
                          {ticket.subject}
                        </h3>
                        <StatusBadge status={ticket.status} />
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        {ticket.userName || "Owner"}{" "}
                        {ticket.userEmail ? `· ${ticket.userEmail}` : ""}
                      </p>

                      <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-xs leading-5 text-slate-500">
                        {ticket.lastMessage || ticket.message}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
                        <span>
                          ID: {ticket.id}
                        </span>
                        <span className="capitalize">
                          Category: {ticket.category || "general"}
                        </span>
                        <span>
                          {formatTicketDate(
                            ticket.lastMessageAt || ticket.createdAt,
                          )}
                        </span>
                        {ticket.lastMessageBy === "owner" && (
                          <span className="font-bold text-indigo-600">
                            Owner replied
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/admin/support-tickets/${ticket.id}`)}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
                  >
                    <Eye size={15} />
                    View & Reply
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>

        <p className="mt-3 text-right text-xs text-slate-400">
          Showing {filteredTickets.length} of {tickets.length} tickets
        </p>
      </div>

      {loadingConversation && ticketId && !selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 text-sm text-slate-600 shadow-xl">
            <Loader2 size={20} className="animate-spin text-indigo-600" />
            Loading ticket conversation...
          </div>
        </div>
      )}

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
            aria-labelledby="admin-ticket-title"
            className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  Ticket Details
                </p>
                <h2
                  id="admin-ticket-title"
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

            <div className="grid gap-3 border-b border-slate-100 bg-white px-5 py-4 sm:grid-cols-2 sm:px-6">
              <OwnerDetail
                icon={<UserRound size={16} />}
                label="Owner"
                value={selectedTicket.userName || "Owner"}
              />
              <OwnerDetail
                icon={<Mail size={16} />}
                label="Email"
                value={selectedTicket.userEmail || "Not provided"}
              />
              <OwnerDetail
                icon={<Clock3 size={16} />}
                label="Submitted"
                value={formatTicketDate(selectedTicket.createdAt)}
              />
              <OwnerDetail
                icon={<MessageSquare size={16} />}
                label="Category"
                value={selectedTicket.category || "general"}
              />
              <div className="sm:col-span-2">
                <StatusBadge status={selectedTicket.status} />
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-5 sm:px-6">
              {ticketMessages.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No conversation messages are available.
                </p>
              ) : (
                ticketMessages.map((item) => (
                  <ConversationMessage
                    key={item.id}
                    item={item}
                    isAdmin={item.senderRole === "admin"}
                  />
                ))
              )}
            </div>

            <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
              {errorMessage && (
                <Alert type="error" message={errorMessage} />
              )}

              {successMessage && (
                <Alert type="success" message={successMessage} />
              )}

              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={updatingStatus || selectedTicket.status === "in_progress"}
                  onClick={() => handleStatusChange("in_progress")}
                  className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 disabled:opacity-40"
                >
                  Mark In Progress
                </button>

                <button
                  type="button"
                  disabled={updatingStatus || selectedTicket.status === "resolved"}
                  onClick={() => handleStatusChange("resolved")}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 disabled:opacity-40"
                >
                  Resolve Ticket
                </button>

                <button
                  type="button"
                  disabled={updatingStatus || selectedTicket.status === "closed"}
                  onClick={() => handleStatusChange("closed")}
                  className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-40"
                >
                  Close Ticket
                </button>

                {["resolved", "closed"].includes(selectedTicket.status) && (
                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={() => handleStatusChange("open")}
                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 disabled:opacity-40"
                  >
                    Reopen Ticket
                  </button>
                )}
              </div>

              {["resolved", "closed"].includes(selectedTicket.status) ? (
                <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-600">
                  This ticket is {selectedTicket.status}. Reopen it if another
                  reply is needed.
                </p>
              ) : (
                <form onSubmit={handleReply}>
                  <label
                    htmlFor="admin-ticket-reply"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Reply to Owner
                  </label>

                  <div className="flex items-end gap-2">
                    <textarea
                      id="admin-ticket-reply"
                      rows={3}
                      maxLength={5000}
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      placeholder="Write a clear response or ask the owner for more information..."
                      className="min-w-0 flex-1 resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    />

                    <button
                      type="submit"
                      disabled={sendingReply || !reply.trim()}
                      className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {sendingReply ? (
                        <Loader2 size={17} className="animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                      <span className="hidden sm:inline">Send Reply</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, color }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        <div className={`rounded-lg p-2 ${colors[color]}`}>{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status = "open" }) {
  const label = statusLabels[status] || "Open";
  const style = statusStyles[status] || statusStyles.open;

  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${style}`}
    >
      {status === "resolved" ? (
        <CheckCircle2 size={12} />
      ) : status === "closed" ? (
        <XCircle size={12} />
      ) : (
        <Clock3 size={12} />
      )}
      {label}
    </span>
  );
}

function OwnerDetail({ icon, label, value }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mt-0.5 shrink-0 text-indigo-600">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="mt-1 break-words text-xs font-semibold text-slate-700">
          {value}
        </p>
      </div>
    </div>
  );
}

function ConversationMessage({ item, isAdmin }) {
  return (
    <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] rounded-2xl border p-4 shadow-sm sm:max-w-[78%] ${
          isAdmin
            ? "border-indigo-200 bg-indigo-50"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {isAdmin ? (
            <ShieldCheck size={14} className="text-indigo-600" />
          ) : (
            <UserRound size={14} className="text-emerald-600" />
          )}

          <span className="text-xs font-extrabold text-slate-800">
            {isAdmin ? "You (Admin)" : item.senderName || "Owner"}
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

function Alert({ type, message }) {
  const isSuccess = type === "success";

  return (
    <div
      role="status"
      className={`mb-3 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
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
