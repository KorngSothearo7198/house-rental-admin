import React, { useState, useEffect } from "react";
// Import Services
import {
  subscribeToAuthUser,
  fetchPropertiesData,
  updatePropertyData,
  removeProperty,
} from "../../services/adminRoomServices";

import {
  Search,
  Filter,
  Eye,
  Edit3,
  Trash2,
  X,
  MapPin,
  User,
  Tag,
  Clock,
  Loader2,
  Wifi,
  Bed,
  Bath,
  Printer,
  Save,
} from "lucide-react";

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  // 👤 Current User / Role State
  const [currentUser, setCurrentUser] = useState(null);

  // Modals state
  const [viewingRoom, setViewingRoom] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);

  // 1. 🔑 CHECK CURRENT LOGGED IN USER ROLE
  useEffect(() => {
    const unsubscribe = subscribeToAuthUser((userData) => {
      setCurrentUser(userData);
    });
    return () => unsubscribe();
  }, []);

  // 🔒 ReadOnly check (View-Only Mode)
  const isReadOnlyUser =
    currentUser?.fullName?.toLowerCase().includes("amon") ||
    currentUser?.role === "viewer";

  // 2. 🔄 FETCH PROPERTIES FROM SERVICE
  const loadProperties = async () => {
    setLoading(true);
    try {
      const data = await fetchPropertiesData();
      setRooms(data);
    } catch (error) {
      console.error("Error fetching properties:", error);
      alert("Failed to load property listings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  // 🔍 Search and Filter Logic
  const filteredRooms = rooms.filter((room) => {
    const matchesSearch =
      room.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.ownerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" || room.category === selectedCategory;
    const matchesStatus =
      selectedStatus === "All" || room.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // 🖨️ PRINT LIST
  const handlePrint = () => {
    window.print();
  };

  // 🗑️ DELETE PROPERTY
  const handleDeleteRoom = async (roomId) => {
    if (isReadOnlyUser) {
      alert("Permission Denied: Amon only has view and print permissions.");
      return;
    }

    if (
      window.confirm("Are you sure you want to remove this property listing permanently?")
    ) {
      try {
        await removeProperty(roomId);
        setRooms(rooms.filter((r) => r.id !== roomId));
        if (viewingRoom?.id === roomId) setViewingRoom(null);
      } catch (error) {
        console.error("Error deleting property:", error);
        alert("Failed to delete property.");
      }
    }
  };

  // ✏️ UPDATE PROPERTY
  const handleUpdateRoom = async (e) => {
    e.preventDefault();
    if (isReadOnlyUser) {
      alert("Permission Denied: Amon cannot edit property information.");
      return;
    }

    try {
      const updatedPayload = await updatePropertyData(editingRoom.id, editingRoom);
      const updatedRoom = { ...editingRoom, ...updatedPayload };

      setRooms(rooms.map((r) => (r.id === editingRoom.id ? updatedRoom : r)));
      if (viewingRoom?.id === editingRoom.id) setViewingRoom(updatedRoom);
      setEditingRoom(null);
      alert("Property details updated successfully!");
    } catch (error) {
      console.error("Error updating property:", error);
      alert("Failed to update property.");
    }
  };

  const categoriesList = ["All", ...new Set(rooms.map((r) => r.category))];

  return (
    <div className="flex flex-col gap-5 font-sans">
      {/* Header with Print Button */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 m-0">
            Rental Property Management
          </h1>
          <p className="text-slate-500 mt-1 mb-0 text-sm">
            {isReadOnlyUser
              ? "Logged in as View-Only Mode (Amon)"
              : "Manage and monitor published listings."}
          </p>
        </div>

        {/* 🖨️ Print List Button */}
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold cursor-pointer text-sm hover:bg-slate-50 transition-colors shadow-sm"
        >
          <Printer size={16} /> Print List
        </button>
      </div>

      {/* Search & Filter Section */}
      <div className="flex flex-wrap justify-between items-center gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 min-w-[260px] flex-1 max-w-md">
          <Search size={18} className="text-slate-500" />
          <input
            type="text"
            placeholder="Search property, owner, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-none outline-none bg-transparent w-full text-sm placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm cursor-pointer bg-white text-slate-700"
            >
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "All" ? "All Categories" : cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm cursor-pointer bg-white text-slate-700"
            >
              <option value="All">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="unpublished">Unpublished</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center items-center p-10 gap-2 text-slate-500">
            <Loader2 className="animate-spin" size={20} /> Loading properties...
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">
                  Property
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">
                  Owner
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">
                  Category
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">
                  Price
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
              {filteredRooms.length > 0 ? (
                filteredRooms.map((room) => (
                  <tr key={room.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <img
                          src={room.imageUrl}
                          alt={room.title}
                          className="w-13 h-13 rounded-lg object-cover bg-slate-200"
                        />
                        <div>
                          <div className="font-semibold text-slate-800 text-sm">
                            {room.title}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin size={12} /> {room.location}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {room.ownerName}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 rounded-md text-xs bg-slate-100 text-slate-600 font-medium">
                        {room.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-sky-600">
                      ${room.price}/mo
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <StatusBadge status={room.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setViewingRoom(room)}
                          title="View Details"
                          className="p-1.5 rounded-md text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                        >
                          <Eye size={16} />
                        </button>

                        {!isReadOnlyUser && (
                          <>
                            <button
                              onClick={() => setEditingRoom({ ...room })}
                              title="Edit Information"
                              className="p-1.5 rounded-md text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteRoom(room.id)}
                              title="Remove Listing"
                              className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 size={16} />
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
                    colSpan="6"
                    className="p-6 text-center text-slate-400 text-sm"
                  >
                    No properties found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 👁️ VIEW DETAILS MODAL */}
      {viewingRoom && (
        <div className="fixed inset-0 w-screen h-screen bg-slate-900/60 flex justify-center items-center z-[1000]">
          <div className="bg-white rounded-xl p-5 w-[520px] max-w-[95%] shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="m-0 text-slate-900 text-lg font-bold">
                Property Details
              </h3>
              <button
                onClick={() => setViewingRoom(null)}
                className="border-none bg-transparent cursor-pointer p-1 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <img
                src={viewingRoom.imageUrl}
                alt={viewingRoom.title}
                className="w-full h-48 object-cover rounded-lg"
              />

              <div>
                <h2 className="text-lg font-bold m-0 text-slate-900">
                  {viewingRoom.title}
                </h2>
                <span className="text-lg font-bold text-sky-600">
                  ${viewingRoom.price} / month
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <DetailRow
                  icon={<User size={14} />}
                  label="Owner"
                  value={viewingRoom.ownerName}
                />
                <DetailRow
                  icon={<Tag size={14} />}
                  label="Category"
                  value={viewingRoom.category}
                />
                <DetailRow
                  icon={<MapPin size={14} />}
                  label="Location"
                  value={viewingRoom.location}
                />
                <DetailRow
                  icon={<Clock size={14} />}
                  label="Created Date"
                  value={viewingRoom.createdAt}
                />
                <DetailRow
                  icon={<Bed size={14} />}
                  label="Bedrooms"
                  value={viewingRoom.bedrooms}
                />
                <DetailRow
                  icon={<Bath size={14} />}
                  label="Bathrooms"
                  value={viewingRoom.bathrooms}
                />
              </div>

              {viewingRoom.amenities.length > 0 && (
                <div>
                  <span className="text-xs font-bold text-slate-500">
                    Amenities:
                  </span>
                  <div className="flex gap-1.5 flex-wrap mt-1">
                    {viewingRoom.amenities.map((item, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-sky-50 text-sky-700 rounded text-xs flex items-center gap-1 font-medium"
                      >
                        <Wifi size={12} /> {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="text-xs font-bold text-slate-500">
                  Description:
                </span>
                <p className="mt-1 mb-0 text-sm text-slate-700 leading-relaxed">
                  {viewingRoom.description || "No description provided."}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-200">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md border border-slate-300 bg-white cursor-pointer font-medium text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Printer size={16} /> Print Info
              </button>
              <button
                onClick={() => setViewingRoom(null)}
                className="px-4 py-2 rounded-md border border-slate-300 bg-white cursor-pointer font-medium text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✏️ EDIT PROPERTY MODAL */}
      {editingRoom && (
        <div className="fixed inset-0 w-screen h-screen bg-slate-900/60 flex justify-center items-center z-[1000]">
          <div className="bg-white rounded-xl p-5 w-[520px] max-w-[95%] shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="m-0 text-slate-900 text-lg font-bold">
                Edit Property Info
              </h3>
              <button
                onClick={() => setEditingRoom(null)}
                className="border-none bg-transparent cursor-pointer p-1 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateRoom} className="mt-4 flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Title:
                </label>
                <input
                  type="text"
                  value={editingRoom.title || ""}
                  onChange={(e) =>
                    setEditingRoom({ ...editingRoom, title: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 rounded-md border border-slate-300 outline-none text-xs focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                    Price ($/mo):
                  </label>
                  <input
                    type="number"
                    value={editingRoom.price || 0}
                    onChange={(e) =>
                      setEditingRoom({ ...editingRoom, price: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 rounded-md border border-slate-300 outline-none text-xs focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                    Status:
                  </label>
                  <select
                    value={editingRoom.status || "published"}
                    onChange={(e) =>
                      setEditingRoom({ ...editingRoom, status: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-md border border-slate-300 outline-none text-xs bg-white focus:border-sky-500"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="unpublished">Unpublished</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Location:
                </label>
                <input
                  type="text"
                  value={editingRoom.location || ""}
                  onChange={(e) =>
                    setEditingRoom({ ...editingRoom, location: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 rounded-md border border-slate-300 outline-none text-xs focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Description:
                </label>
                <textarea
                  rows="3"
                  value={editingRoom.description || ""}
                  onChange={(e) =>
                    setEditingRoom({
                      ...editingRoom,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-md border border-slate-300 outline-none text-xs focus:border-sky-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-4 py-2 rounded-md border border-slate-300 bg-white cursor-pointer font-medium text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md border-none bg-sky-600 text-white cursor-pointer font-semibold text-xs hover:bg-sky-700 transition-colors"
                >
                  <Save size={16} /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function StatusBadge({ status }) {
  let badgeStyles = "bg-emerald-50 text-emerald-600";
  if (status === "draft") {
    badgeStyles = "bg-amber-50 text-amber-600";
  } else if (status === "unpublished") {
    badgeStyles = "bg-red-50 text-red-600";
  }

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-semibold capitalize ${badgeStyles}`}
    >
      {status}
    </span>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
        {icon} {label}
      </span>
      <span className="text-xs font-semibold text-slate-800">{value}</span>
    </div>
  );
}