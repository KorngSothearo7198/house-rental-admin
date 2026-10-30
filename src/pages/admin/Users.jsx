import React, { useState, useEffect } from "react";
// Import Services
import {
  fetchUsersData,
  updateUserStatus,
  removeUser,
  updateUserData,
} from "../../services/adminUser";

import {
  Search,
  Filter,
  Eye,
  Ban,
  CheckCircle,
  Trash2,
  X,
  Mail,
  Phone,
  Shield,
  Calendar,
  Briefcase,
  MapPin,
  Loader2,
  Printer,
  Send,
  Edit3,
  Save,
} from "lucide-react";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  // Modal & Edit States
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  // 1. Fetch Users
  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchUsersData();
      setUsers(data);
    } catch (error) {
      alert("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filter & Search
  const filteredUsers = users.filter((user) => {
    if (user.role.toLowerCase() === "admin") return false;

    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole =
      roleFilter === "All" ||
      user.role.toLowerCase() === roleFilter.toLowerCase();

    return matchesSearch && matchesRole;
  });

  // 2. Block / Unblock Handler
  const toggleBlockStatus = async (user) => {
    try {
      const newStatus = await updateUserStatus(user.id, user.status);
      const isNowActive = newStatus === "active";

      setUsers(
        users.map((u) =>
          u.id === user.id
            ? {
                ...u,
                status: isNowActive ? "Active" : "Blocked",
                rawStatus: newStatus,
              }
            : u
        )
      );

      if (selectedUser?.id === user.id) {
        setSelectedUser((prev) => ({
          ...prev,
          status: isNowActive ? "Active" : "Blocked",
          rawStatus: newStatus,
        }));
      }
    } catch (error) {
      alert("Failed to update user status.");
    }
  };

  // 3. Delete Handler
  const handleDeleteUser = async (userId) => {
    if (
      window.confirm("Are you sure you want to delete this user permanently?")
    ) {
      try {
        await removeUser(userId);
        setUsers(users.filter((u) => u.id !== userId));
        if (selectedUser?.id === userId) setSelectedUser(null);
      } catch (error) {
        alert("Failed to delete user.");
      }
    }
  };

  // 4. Save Edit Handler
  const handleSaveUser = async () => {
    try {
      await updateUserData(selectedUser.id, editFormData);
      const updated = { ...selectedUser, ...editFormData };
      setSelectedUser(updated);
      setUsers(users.map((u) => (u.id === selectedUser.id ? updated : u)));
      setIsEditing(false);
      alert("User profile updated successfully!");
    } catch (error) {
      alert("Failed to update profile.");
    }
  };

  // 5. Print
  const handlePrint = () => {
    window.print();
  };

  // 6. Share to Telegram
  const handleShareTelegram = (u) => {
    const text = `👤 *USER PROFILE CARD*
──────────────────────
📌 *User ID:* ${u.id}
👤 *Name:* ${u.name}
📧 *Email:* ${u.email}
📞 *Phone:* ${u.phone}
🛡️ *Role:* ${u.role}
📍 *Address:* ${u.address}
💼 *Occupation:* ${u.occupation}
📊 *Account Status:* ${u.status}
──────────────────────
House Rental Platform`;

    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(
      window.location.href
    )}&text=${encodeURIComponent(text)}`;
    window.open(telegramUrl, "_blank");
  };

  return (
    <div className="flex flex-col gap-5 font-sans">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 m-0">
          User Management
        </h1>
        <p className="text-slate-500 mt-1 mb-0 text-sm">
          Manage all registered users, renters, and property owners from
          Firebase.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap justify-between items-center gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 min-w-[280px]">
          <Search size={18} className="text-slate-500" />
          <input
            type="text"
            placeholder="Search name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-none outline-none bg-transparent w-full text-sm placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-500" />
          <span className="text-sm font-medium text-slate-600">Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm cursor-pointer bg-white"
          >
            <option value="All">All Roles</option>
            <option value="Renter">Renter</option>
            <option value="Owner">Owner</option>
          </select>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-10 gap-2 text-slate-500">
            <Loader2 className="animate-spin" size={20} /> Loading users...
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">
                  User
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">
                  Email & Phone
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">
                  Role
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
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-[38px] h-[38px] rounded-full object-cover bg-slate-200"
                        />
                        <div>
                          <div className="font-semibold text-slate-800">
                            {user.name}
                          </div>
                          <div className="text-xs text-slate-400">
                            {user.address}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="text-slate-600 text-xs">{user.email}</div>
                      <div className="text-slate-400 text-xs">{user.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          user.role === "Owner"
                            ? "bg-purple-50 text-purple-600"
                            : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          user.status === "Active"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setIsEditing(false);
                          }}
                          title="View Profile"
                          className="p-1.5 rounded text-sky-600 hover:bg-sky-50 transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => toggleBlockStatus(user)}
                          title={user.status === "Active" ? "Block" : "Unblock"}
                          className={`p-1.5 rounded transition-colors ${
                            user.status === "Active"
                              ? "text-amber-600 hover:bg-amber-50"
                              : "text-emerald-600 hover:bg-emerald-50"
                          }`}
                        >
                          {user.status === "Active" ? (
                            <Ban size={16} />
                          ) : (
                            <CheckCircle size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          title="Delete"
                          className="p-1.5 rounded text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    className="p-6 text-center text-slate-400 text-sm"
                  >
                    No users found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Profile */}
      {selectedUser && (
        <div className="fixed inset-0 w-screen h-screen bg-slate-900/60 flex justify-center items-center z-[1000]">
          <div className="bg-white rounded-xl p-5 w-[520px] max-w-[95%] shadow-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="m-0 text-slate-900 text-lg font-bold">
                {isEditing ? "Edit User Profile" : "User Profile Details"}
              </h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="border-none bg-transparent cursor-pointer p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex flex-col gap-4 mt-4">
              <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.name}
                  className="w-16 h-16 rounded-full object-cover bg-slate-200"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h2 className="m-0 text-lg text-slate-900 font-semibold">
                      {selectedUser.name}
                    </h2>
                    {!isEditing && (
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setEditFormData(selectedUser);
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded border border-slate-300 bg-white cursor-pointer text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    UID: {selectedUser.id}
                  </span>
                  {selectedUser.bio && (
                    <p className="text-xs text-slate-600 mt-1 mb-0 italic">
                      "{selectedUser.bio}"
                    </p>
                  )}
                </div>
              </div>

              {!isEditing ? (
                <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-slate-200">
                  <DetailItem
                    icon={<Mail size={16} />}
                    label="Email"
                    value={selectedUser.email}
                    link={`mailto:${selectedUser.email}`}
                  />
                  <DetailItem
                    icon={<Phone size={16} />}
                    label="Phone"
                    value={selectedUser.phone}
                    link={`tel:${selectedUser.phone}`}
                  />
                  <DetailItem
                    icon={<Shield size={16} />}
                    label="Role"
                    value={selectedUser.role}
                  />
                  <DetailItem
                    icon={<Calendar size={16} />}
                    label="Status"
                    value={selectedUser.status}
                    colorClass={
                      selectedUser.status === "Active"
                        ? "text-emerald-600"
                        : "text-red-600"
                    }
                  />
                  <DetailItem
                    icon={<Briefcase size={16} />}
                    label="Occupation"
                    value={selectedUser.occupation}
                  />
                  <DetailItem
                    icon={<MapPin size={16} />}
                    label="Address"
                    value={selectedUser.address}
                  />
                  <DetailItem
                    icon={<Calendar size={16} />}
                    label="Registered Date"
                    value={selectedUser.regDate}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">
                      Full Name:
                    </label>
                    <input
                      type="text"
                      value={editFormData.name || ""}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          name: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-2 rounded-md border border-slate-300 outline-none text-xs focus:border-sky-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">
                        Role:
                      </label>
                      <select
                        value={editFormData.role || "Renter"}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            role: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-2 rounded-md border border-slate-300 outline-none text-xs bg-white focus:border-sky-500"
                      >
                        <option value="Renter">Renter</option>
                        <option value="Owner">Owner</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">
                        Phone Number:
                      </label>
                      <input
                        type="text"
                        value={editFormData.phone || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            phone: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-2 rounded-md border border-slate-300 outline-none text-xs focus:border-sky-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">
                      Occupation:
                    </label>
                    <input
                      type="text"
                      value={editFormData.occupation || ""}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          occupation: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-2 rounded-md border border-slate-300 outline-none text-xs focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">
                      Address:
                    </label>
                    <input
                      type="text"
                      value={editFormData.address || ""}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          address: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-2 rounded-md border border-slate-300 outline-none text-xs focus:border-sky-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-200">
              {!isEditing ? (
                <>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePrint}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-800 cursor-pointer font-semibold text-xs hover:bg-slate-50 transition-colors"
                    >
                      <Printer size={16} /> Print Profile
                    </button>
                    <button
                      onClick={() => handleShareTelegram(selectedUser)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-md border-none bg-[#229ED9] text-white cursor-pointer font-semibold text-xs hover:bg-[#1e8dbf] transition-colors"
                    >
                      <Send size={16} /> Share
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleBlockStatus(selectedUser)}
                      className={`px-3 py-2 rounded-md border-none font-semibold cursor-pointer text-xs transition-colors ${
                        selectedUser.status === "Active"
                          ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                          : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      }`}
                    >
                      {selectedUser.status === "Active" ? "Block" : "Unblock"}
                    </button>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="px-3.5 py-2 rounded-md border border-slate-300 bg-white cursor-pointer font-medium text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex justify-end gap-2 w-full">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3.5 py-2 rounded-md border border-slate-300 bg-white cursor-pointer font-medium text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveUser}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-md border-none bg-sky-600 text-white cursor-pointer font-semibold text-xs hover:bg-sky-700 transition-colors"
                  >
                    <Save size={16} /> Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Component
function DetailItem({ icon, label, value, colorClass, link }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
        {icon} {label}
      </span>
      {link ? (
        <a
          href={link}
          className="text-xs font-semibold text-sky-600 no-underline hover:underline"
        >
          {value}
        </a>
      ) : (
        <span
          className={`text-xs font-semibold ${colorClass || "text-slate-800"}`}
        >
          {value}
        </span>
      )}
    </div>
  );
}