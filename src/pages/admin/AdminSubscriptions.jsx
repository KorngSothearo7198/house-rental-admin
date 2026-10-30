import React, { useState, useEffect } from "react";

import {
  fetchSubscriptions,
  approveSubscription,
  rejectSubscription,
  fetchPlans,
  createPlan,
  updatePlan,
  deletePlan,
} from "../../services/adminSubscriptionService";

import {
  CheckCircle,
  XCircle,
  Search,
  Filter,
  X,
  Loader2,
  Eye,
  CreditCard,
  Calendar,
  User,
  ShieldCheck,
  DollarSign,
  Clock,
  Sparkles,
  Edit2,
  Trash2,
  Settings,
  Hash,
  Receipt,
} from "lucide-react";

export default function AdminSubscriptions() {
  // ==========================================
  // STATE
  // ==========================================

  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);

  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [viewingSub, setViewingSub] = useState(null);

  // Dynamic Plan Modal
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const [planFormData, setPlanFormData] = useState({
    id: "",
    name: "",
    description: "",

    level: 1,
    propertyLimit: 3,

    price: "",
    currency: "USD",
    billing: "month",

    features: "",

    popular: false,
    recommended: false,

    status: "active",
    displayOrder: 1,
  });

  // ==========================================
  // LOAD DATA
  // ==========================================

  const loadData = async () => {
    setLoading(true);

    try {
      const [fetchedSubs, fetchedPlans] = await Promise.all([
        fetchSubscriptions(),
        fetchPlans(),
      ]);

      setSubscriptions(fetchedSubs);
      setPlans(fetchedPlans);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ==========================================
  // PLAN LEVEL HELPERS
  // ==========================================

  const getPropertyLimitByLevel = (level) => {
    switch (Number(level)) {
      case 1:
        return 3;

      case 2:
        return 15;

      case 3:
        return -1;

      default:
        return 3;
    }
  };

  const getLevelName = (level) => {
    switch (Number(level)) {
      case 1:
        return "Starter";

      case 2:
        return "Pro";

      case 3:
        return "Enterprise";

      default:
        return "Plan";
    }
  };

  const formatPropertyLimit = (limit) => {
    if (Number(limit) === -1) {
      return "Unlimited";
    }

    return `${limit} Properties`;
  };

  // ==========================================
  // PLAN CRUD HANDLERS
  // ==========================================

  const handleOpenCreatePlan = () => {
    setEditingPlan(null);

    setPlanFormData({
      id: "plan_" + Date.now().toString().slice(-4),

      name: "",
      description: "",

      level: 1,
      propertyLimit: 3,

      price: "",
      currency: "USD",
      billing: "month",

      features: "",

      popular: false,
      recommended: false,

      status: "active",
      displayOrder: 1,
    });

    setIsPlanModalOpen(true);
  };

  const handleOpenEditPlan = (plan) => {
    setEditingPlan(plan);

    setPlanFormData({
      id: plan.id || "",

      name: plan.name || "",
      description: plan.description || "",

      level: Number(plan.level || 1),

      propertyLimit:
        plan.propertyLimit !== undefined
          ? Number(plan.propertyLimit)
          : getPropertyLimitByLevel(plan.level || 1),

      price: plan.price ?? "",
      currency: plan.currency || "USD",
      billing: plan.billing || "month",

      features: Array.isArray(plan.features)
        ? plan.features.join(", ")
        : plan.features || "",

      popular: Boolean(plan.popular),
      recommended: Boolean(plan.recommended),

      status: plan.status || "active",
      displayOrder: Number(plan.displayOrder || 1),
    });

    setIsPlanModalOpen(true);
  };

  const handleLevelChange = (level) => {
    const numericLevel = Number(level);

    setPlanFormData((prev) => ({
      ...prev,

      level: numericLevel,

      propertyLimit: getPropertyLimitByLevel(numericLevel),
    }));
  };

  const handleDeletePlan = async (docId, planName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the plan "${planName}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deletePlan(docId);

      alert("Plan deleted successfully.");

      await loadData();
    } catch (err) {
      console.error(err);

      alert("Failed to delete plan.");
    }
  };

  const handleSavePlanSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!planFormData.name.trim()) {
        alert("Please enter a plan name.");
        return;
      }

      if (planFormData.price === "" || Number(planFormData.price) < 0) {
        alert("Please enter a valid price.");
        return;
      }

      if (editingPlan) {
        await updatePlan(editingPlan.docId, planFormData);

        alert("Plan updated successfully!");
      } else {
        await createPlan(planFormData);

        alert("New plan created successfully!");
      }

      setIsPlanModalOpen(false);

      await loadData();
    } catch (err) {
      console.error(err);

      alert("Error saving plan.");
    }
  };

  // ==========================================
  // SUBSCRIPTION ACTIONS
  // ==========================================

  const handleApprove = async (id) => {
    const confirmed = window.confirm("Approve this subscription?");

    if (!confirmed) {
      return;
    }

    try {
      await approveSubscription(id, "admin_001");

      await loadData();

      alert("Subscription approved successfully.");
    } catch (err) {
      console.error(err);

      alert("Failed to approve subscription.");
    }
  };

  const handleReject = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to REJECT this subscription?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await rejectSubscription(id, "admin_001");

      await loadData();

      alert("Subscription rejected.");
    } catch (err) {
      console.error(err);

      alert("Failed to reject subscription.");
    }
  };

  // ==========================================
  // FILTER
  // ==========================================

  const filtered = subscriptions.filter((sub) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      sub.ownerId?.toLowerCase().includes(search) ||
      sub.paymentReference?.toLowerCase().includes(search) ||
      sub.planName?.toLowerCase().includes(search) ||
      sub.planId?.toLowerCase().includes(search) ||
      sub.subscriptionId?.toLowerCase().includes(search);

    const matchesStatus = statusFilter === "All" || sub.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // ==========================================
  // METRICS
  // ==========================================

  const totalRevenue = subscriptions
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  const pendingCount = subscriptions.filter(
    (s) => s.status === "pending",
  ).length;

  const activeCount = subscriptions.filter((s) => s.status === "active").length;

  const rejectedCount = subscriptions.filter(
    (s) => s.status === "rejected",
  ).length;

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="flex flex-col gap-5 font-sans p-6 bg-slate-50 min-h-screen">
      {/* ==========================================
          HEADER
      ========================================== */}

      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 m-0">
            Owner Subscriptions
          </h1>

          <p className="text-slate-500 mt-1 mb-0 text-sm">
            Manage subscription plans and review incoming owner subscription
            requests.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleOpenCreatePlan}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer text-sm transition-colors shadow-sm"
          >
            <Settings size={16} />
            Manage Plans
          </button>
        </div>
      </div>

      {/* ==========================================
          METRICS
      ========================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Requests */}

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider m-0">
              Total Requests
            </p>

            <h3 className="text-2xl font-bold text-slate-900 mt-1 mb-0">
              {subscriptions.length}
            </h3>
          </div>

          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <CreditCard size={22} />
          </div>
        </div>

        {/* Active */}

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider m-0">
              Active Subscriptions
            </p>

            <h3 className="text-2xl font-bold text-emerald-600 mt-1 mb-0">
              {activeCount}
            </h3>
          </div>

          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <ShieldCheck size={22} />
          </div>
        </div>

        {/* Pending */}

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider m-0">
              Pending Approval
            </p>

            <h3 className="text-2xl font-bold text-amber-600 mt-1 mb-0">
              {pendingCount}
            </h3>
          </div>

          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Clock size={22} />
          </div>
        </div>

        {/* Revenue */}

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider m-0">
              Total Revenue
            </p>

            <h3 className="text-2xl font-bold text-slate-900 mt-1 mb-0">
              ${totalRevenue.toFixed(2)}
            </h3>
          </div>

          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <DollarSign size={22} />
          </div>
        </div>
      </div>

      {/* ==========================================
          PRICING PLANS
      ========================================== */}

      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-slate-900 m-0">
            Active Pricing Plans ({plans.length})
          </h3>

          <button
            onClick={handleOpenCreatePlan}
            className="text-indigo-600 hover:text-indigo-700 text-xs font-semibold cursor-pointer border-none bg-transparent flex items-center gap-1"
          >
            <Settings size={14} />
            Manage Plans
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.docId || plan.id}
              className={`bg-white p-4 rounded-xl border ${
                plan.popular || plan.recommended
                  ? "border-indigo-500 ring-1 ring-indigo-500"
                  : "border-slate-200"
              } shadow-sm relative flex flex-col justify-between`}
            >
              <div>
                {/* Plan Header */}

                <div className="flex justify-between items-start mb-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-base m-0">
                        {plan.name}
                      </h4>

                      {plan.level && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                          L{plan.level}
                        </span>
                      )}
                    </div>

                    {plan.description && (
                      <p className="text-xs text-slate-500 mt-1 mb-0">
                        {plan.description}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenEditPlan(plan)}
                      className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer bg-transparent border-none rounded"
                      title="Edit Plan"
                    >
                      <Edit2 size={15} />
                    </button>

                    <button
                      onClick={() => handleDeletePlan(plan.docId, plan.name)}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer bg-transparent border-none rounded"
                      title="Delete Plan"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Recommended / Popular */}

                {(plan.popular || plan.recommended) && (
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {plan.recommended && (
                      <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <Sparkles size={10} />
                        RECOMMENDED
                      </span>
                    )}

                    {plan.popular && !plan.recommended && (
                      <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <Sparkles size={10} />
                        POPULAR
                      </span>
                    )}
                  </div>
                )}

                {/* Price */}

                <div className="flex items-baseline gap-1 my-3">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {plan.currency || "USD"}{" "}
                    {Number(plan.price || 0).toFixed(2)}
                  </span>

                  <span className="text-xs text-slate-500">
                    /{plan.billing || "month"}
                  </span>
                </div>

                {/* Property Limit */}

                <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 mb-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-500">
                      Property Limit
                    </span>

                    <span className="text-xs font-bold text-slate-800">
                      {formatPropertyLimit(plan.propertyLimit)}
                    </span>
                  </div>
                </div>

                {/* Features */}

                <ul className="space-y-1.5 mt-3 pl-0 list-none text-xs text-slate-600">
                  {(Array.isArray(plan.features) ? plan.features : []).map(
                    (feat, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <CheckCircle
                          size={13}
                          className="text-emerald-500 shrink-0"
                        />

                        <span>{feat}</span>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </div>
          ))}

          {plans.length === 0 && (
            <div className="md:col-span-3 bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <Settings size={30} className="mx-auto text-slate-300 mb-2" />

              <p className="text-sm text-slate-500">
                No subscription plans found.
              </p>

              <button
                onClick={handleOpenCreatePlan}
                className="mt-2 text-indigo-600 font-semibold text-sm"
              >
                Create your first plan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
          FILTER CONTROLS
      ========================================== */}

      <div className="flex flex-wrap justify-between items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-2">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 min-w-[260px] flex-1 max-w-md">
          <Search size={18} className="text-slate-400" />

          <input
            type="text"
            placeholder="Search Owner ID, Sub ID, TRX Ref, Plan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-none outline-none bg-transparent w-full text-sm placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-500" />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm cursor-pointer bg-white text-slate-700 font-medium"
          >
            <option value="All">All Statuses</option>

            <option value="pending">Pending</option>

            <option value="active">Active</option>

            <option value="rejected">Rejected</option>

            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* ==========================================
          SUBSCRIPTION TABLE
      ========================================== */}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center items-center p-10 gap-2 text-slate-500">
            <Loader2 className="animate-spin" size={20} />
            Loading records...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">
                    Owner ID
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">
                    Plan
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">
                    Amount
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">
                    Payment
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">
                    Validity
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">
                    Status
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filtered.length > 0 ? (
                  filtered.map((sub) => (
                    <tr
                      key={sub.id || sub.subscriptionId}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      {/* Owner */}

                      <td className="px-4 py-3 text-sm font-medium text-slate-800">
                        <div className="max-w-[150px] truncate">
                          {sub.ownerId || "N/A"}
                        </div>
                      </td>

                      {/* Plan */}

                      <td className="px-4 py-3 text-sm">
                        <div className="font-semibold text-slate-800">
                          {sub.planName || "N/A"}
                        </div>

                        <div className="text-xs text-slate-400">
                          {sub.planId || "N/A"}
                        </div>
                      </td>

                      {/* Amount */}

                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                        {sub.currency || "USD"}{" "}
                        {Number(sub.amount || 0).toFixed(2)}
                      </td>

                      {/* Payment */}

                      <td className="px-4 py-3 text-sm">
                        <span className="font-semibold text-indigo-700">
                          {sub.paymentMethod || "N/A"}
                        </span>

                        <div className="text-xs text-slate-500">
                          {sub.paymentReference || "N/A"}
                        </div>
                      </td>

                      {/* Dates */}

                      <td className="px-4 py-3 text-xs text-slate-600">
                        <div>Start: {sub.startDate || "N/A"}</div>

                        <div>End: {sub.endDate || "N/A"}</div>
                      </td>

                      {/* Status */}

                      <td className="px-4 py-3 text-sm">
                        <StatusBadge status={sub.status} />
                      </td>

                      {/* Actions */}

                      <td className="px-4 py-3 text-sm text-right">
                        <div className="flex justify-end gap-1.5 items-center">
                          <button
                            onClick={() => setViewingSub(sub)}
                            className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                            title="View Details"
                          >
                            <Eye size={15} />
                          </button>

                          {sub.status === "pending" && (
                            <>
                              <button
                                onClick={() =>
                                  handleApprove(sub.id || sub.subscriptionId)
                                }
                                className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs transition-colors cursor-pointer"
                              >
                                <CheckCircle size={14} />
                                Approve
                              </button>

                              <button
                                onClick={() =>
                                  handleReject(sub.id || sub.subscriptionId)
                                }
                                className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-xs transition-colors cursor-pointer"
                              >
                                <XCircle size={14} />
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="7"
                      className="p-8 text-center text-slate-400 text-sm"
                    >
                      No subscription records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ==========================================
          CREATE / EDIT PLAN MODAL
      ========================================== */}

      {isPlanModalOpen && (
        <div className="fixed inset-0 w-screen h-screen bg-slate-900/60 flex justify-center items-center z-[1100] p-4">
          <div className="bg-white rounded-xl p-6 w-[520px] max-w-[95%] shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}

            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <h3 className="m-0 text-slate-900 text-lg font-bold">
                  {editingPlan ? "Edit Plan" : "Create New Plan"}
                </h3>

                <p className="text-xs text-slate-400 mt-1 mb-0">
                  Configure pricing and property limits.
                </p>
              </div>

              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="border-none bg-transparent cursor-pointer text-slate-500 hover:text-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}

            <form
              onSubmit={handleSavePlanSubmit}
              className="mt-4 flex flex-col gap-3"
            >
              {/* Plan ID */}

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Plan Unique ID
                </label>

                <input
                  type="text"
                  value={planFormData.id}
                  onChange={(e) =>
                    setPlanFormData({
                      ...planFormData,
                      id: e.target.value,
                    })
                  }
                  disabled={Boolean(editingPlan)}
                  required
                  placeholder="e.g. plan_pro"
                  className="w-full px-3 py-2 rounded-md border border-slate-300 outline-none text-xs focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              {/* Name / Price */}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                    Plan Name
                  </label>

                  <input
                    type="text"
                    value={planFormData.name}
                    onChange={(e) =>
                      setPlanFormData({
                        ...planFormData,
                        name: e.target.value,
                      })
                    }
                    required
                    placeholder="e.g. Pro Owner"
                    className="w-full px-3 py-2 rounded-md border border-slate-300 outline-none text-xs focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                    Price
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={planFormData.price}
                    onChange={(e) =>
                      setPlanFormData({
                        ...planFormData,
                        price: e.target.value,
                      })
                    }
                    required
                    placeholder="29.00"
                    className="w-full px-3 py-2 rounded-md border border-slate-300 outline-none text-xs focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Level / Property Limit */}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                    Plan Level
                  </label>

                  <select
                    value={planFormData.level}
                    onChange={(e) => handleLevelChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-slate-300 outline-none text-xs bg-white"
                  >
                    <option value={1}>Level 1 - Starter</option>

                    <option value={2}>Level 2 - Pro</option>

                    <option value={3}>Level 3 - Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                    Property Limit
                  </label>

                  <input
                    type="text"
                    value={
                      Number(planFormData.propertyLimit) === -1
                        ? "Unlimited"
                        : planFormData.propertyLimit
                    }
                    readOnly
                    className="w-full px-3 py-2 rounded-md border border-slate-200 bg-slate-50 text-slate-600 outline-none text-xs"
                  />
                </div>
              </div>

              {/* Billing */}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                    Currency
                  </label>

                  <select
                    value={planFormData.currency}
                    onChange={(e) =>
                      setPlanFormData({
                        ...planFormData,
                        currency: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-md border border-slate-300 outline-none text-xs bg-white"
                  >
                    <option value="USD">USD ($)</option>

                    <option value="KHR">KHR (៛)</option>

                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                    Billing
                  </label>

                  <select
                    value={planFormData.billing}
                    onChange={(e) =>
                      setPlanFormData({
                        ...planFormData,
                        billing: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-md border border-slate-300 outline-none text-xs bg-white"
                  >
                    <option value="month">Monthly</option>

                    <option value="year">Yearly</option>
                  </select>
                </div>
              </div>

              {/* Description */}

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Description
                </label>

                <input
                  type="text"
                  value={planFormData.description}
                  onChange={(e) =>
                    setPlanFormData({
                      ...planFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Best choice for growing property owners"
                  className="w-full px-3 py-2 rounded-md border border-slate-300 outline-none text-xs focus:border-indigo-500"
                />
              </div>

              {/* Features */}

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Features
                </label>

                <textarea
                  value={planFormData.features}
                  onChange={(e) =>
                    setPlanFormData({
                      ...planFormData,
                      features: e.target.value,
                    })
                  }
                  placeholder="Add up to 15 properties, Property analytics, Priority support"
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-slate-300 outline-none text-xs focus:border-indigo-500 resize-none"
                />

                <p className="text-[10px] text-slate-400 mt-1">
                  Separate features using commas.
                </p>
              </div>

              {/* Display Order */}

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Display Order
                </label>

                <input
                  type="number"
                  min="1"
                  value={planFormData.displayOrder}
                  onChange={(e) =>
                    setPlanFormData({
                      ...planFormData,
                      displayOrder: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-md border border-slate-300 outline-none text-xs focus:border-indigo-500"
                />
              </div>

              {/* Checkboxes */}

              <div className="flex flex-col gap-2 mt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planFormData.popular}
                    onChange={(e) =>
                      setPlanFormData({
                        ...planFormData,
                        popular: e.target.checked,
                      })
                    }
                    className="cursor-pointer"
                  />
                  Mark as Popular Plan
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planFormData.recommended}
                    onChange={(e) =>
                      setPlanFormData({
                        ...planFormData,
                        recommended: e.target.checked,
                      })
                    }
                    className="cursor-pointer"
                  />
                  Mark as Recommended Plan
                </label>
              </div>

              {/* Buttons */}

              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-md border-none bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer"
                >
                  {editingPlan ? "Update Plan" : "Create Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          VIEW SUBSCRIPTION DETAILS
      ========================================== */}

      {viewingSub && (
        <div className="fixed inset-0 w-screen h-screen bg-slate-900/60 flex justify-center items-center z-[1000] p-4">
          <div className="bg-white rounded-2xl p-6 w-[520px] max-w-[95%] shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Header */}

            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="m-0 text-slate-900 text-lg font-bold">
                  Subscription Details
                </h3>

                <p className="text-xs text-slate-400 m-0 mt-0.5 break-all">
                  ID: {viewingSub.subscriptionId || viewingSub.id || "N/A"}
                </p>
              </div>

              <button
                onClick={() => setViewingSub(null)}
                className="border-none bg-transparent cursor-pointer text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4 text-xs">
              {/* Owner / Plan */}

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-slate-400" />

                  <div className="min-w-0">
                    <span className="text-slate-400 block text-[10px]">
                      Owner ID
                    </span>

                    <strong className="text-slate-800 break-all">
                      {viewingSub.ownerId || "N/A"}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-indigo-500" />

                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      Plan Name
                    </span>

                    <strong className="text-slate-800">
                      {viewingSub.planName || "N/A"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Plan ID */}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    Plan ID
                  </span>

                  <strong className="text-slate-700">
                    {viewingSub.planId || "N/A"}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">
                    Subscription ID
                  </span>

                  <strong className="text-slate-700 break-all">
                    {viewingSub.subscriptionId || viewingSub.id || "N/A"}
                  </strong>
                </div>
              </div>

              {/* Amount / Payment */}

              <div className="grid grid-cols-2 gap-3">
                {/* <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-slate-400" />

                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      Amount Paid
                    </span>

                    <strong className="text-slate-800">
                      {viewingSub.currency || "USD"}{" "}
                      {Number(viewingSub.amount || 0).toFixed(2)}
                    </strong>
                  </div>
                </div> */}

                <div className="flex items-center gap-2">
                  <Receipt size={16} className="text-slate-400" />

                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      Payment Method
                    </span>

                    <strong className="text-slate-800">
                      {viewingSub.paymentMethod || "N/A"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Payment Reference / Status */}

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Hash size={16} className="text-slate-400" />

                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      Payment Reference
                    </span>

                    <strong className="text-slate-800 break-all">
                      {viewingSub.paymentReference || "N/A"}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" />

                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      Status
                    </span>

                    <StatusBadge status={viewingSub.status} />
                  </div>
                </div>
              </div>

              {/* Dates */}

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-slate-400" />

                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      Start Date
                    </span>

                    <strong className="text-slate-800">
                      {viewingSub.startDate || "N/A"}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-slate-400" />

                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      End Date
                    </span>

                    <strong className="text-slate-800">
                      {viewingSub.endDate || "N/A"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Approval */}

              {(viewingSub.approvedBy || viewingSub.approvedAt) && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      Approved By
                    </span>

                    <strong className="text-slate-700 break-all">
                      {viewingSub.approvedBy || "N/A"}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      Approved At
                    </span>

                    <strong className="text-slate-700">
                      {viewingSub.approvedAt || "N/A"}
                    </strong>
                  </div>
                </div>
              )}

              {/* Created At */}

              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 block text-[10px]">
                  Created At
                </span>

                <strong className="text-slate-700">
                  {viewingSub.createdAt || "N/A"}
                </strong>
              </div>
            </div>

            {/* Modal Footer */}

            <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end gap-2">
              {viewingSub.status === "pending" && (
                <>
                  <button
                    onClick={async () => {
                      const id = viewingSub.id || viewingSub.subscriptionId;

                      await handleApprove(id);

                      setViewingSub(null);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold cursor-pointer border-none text-xs transition-colors"
                  >
                    <CheckCircle size={14} />
                    Approve
                  </button>

                  <button
                    onClick={async () => {
                      const id = viewingSub.id || viewingSub.subscriptionId;

                      await handleReject(id);

                      setViewingSub(null);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 font-semibold cursor-pointer border-none text-xs transition-colors"
                  >
                    <XCircle size={14} />
                    Reject
                  </button>
                </>
              )}

              <button
                onClick={() => setViewingSub(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold cursor-pointer border-none text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// STATUS BADGE
// ==========================================

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",

    active: "bg-emerald-50 text-emerald-700 border-emerald-200",

    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",

    rejected: "bg-rose-50 text-rose-700 border-rose-200",

    expired: "bg-slate-100 text-slate-600 border-slate-200",

    cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  };

  const label = status
    ? status.charAt(0).toUpperCase() + status.slice(1)
    : "Unknown";

  return (
    <span
      className={`inline-block px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${
        styles[status] || "bg-slate-50 text-slate-600 border-slate-200"
      }`}
    >
      {label}
    </span>
  );
}
