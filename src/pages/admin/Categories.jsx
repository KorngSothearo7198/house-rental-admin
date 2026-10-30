import React, { useState, useEffect } from "react";
// import { db } from "../services/firebase";
import { auth, db } from "../../services/firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from "firebase/firestore";

import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Tag, 
  FolderPlus, 
  Loader2 
} from "lucide-react";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // Form Input States
  const [categoryName, setCategoryName] = useState("");
  const [categoryDesc, setCategoryDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 1. 🔄 FETCH CATEGORIES FROM FIRESTORE
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "categories"));
      const catList = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        name: docSnap.data().name || "",
        description: docSnap.data().description || "No description provided"
      }));
      setCategories(catList);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // 🔍 Search Filter Logic
  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ➕ 2. ADD NEW CATEGORY TO FIRESTORE
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    setSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, "categories"), {
        name: categoryName.trim(),
        description: categoryDesc.trim() || "No description provided",
        createdAt: serverTimestamp()
      });

      const newCategory = {
        id: docRef.id,
        name: categoryName.trim(),
        description: categoryDesc.trim() || "No description provided"
      };

      setCategories([...categories, newCategory]);
      resetForm();
    } catch (error) {
      console.error("Error adding category:", error);
      alert("Failed to add category. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ✏️ 3. EDIT CATEGORY IN FIRESTORE
  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    if (!categoryName.trim() || !editingCategory) return;

    setSubmitting(true);
    try {
      const catRef = doc(db, "categories", editingCategory.id);
      await updateDoc(catRef, {
        name: categoryName.trim(),
        description: categoryDesc.trim(),
        updatedAt: serverTimestamp()
      });

      setCategories(categories.map(cat => 
        cat.id === editingCategory.id 
          ? { ...cat, name: categoryName.trim(), description: categoryDesc.trim() }
          : cat
      ));
      resetForm();
    } catch (error) {
      console.error("Error updating category:", error);
      alert("Failed to update category.");
    } finally {
      setSubmitting(false);
    }
  };

  // 🗑️ 4. DELETE CATEGORY FROM FIRESTORE
  const handleDeleteCategory = async (id) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      try {
        await deleteDoc(doc(db, "categories", id));
        setCategories(categories.filter(cat => cat.id !== id));
      } catch (error) {
        console.error("Error deleting category:", error);
        alert("Failed to delete category.");
      }
    }
  };

  // Open Edit Modal
  const openEditModal = (category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDesc(category.description);
  };

  // Reset Form Inputs
  const resetForm = () => {
    setCategoryName("");
    setCategoryDesc("");
    setIsAddOpen(false);
    setEditingCategory(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header & Add Button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#0f172a", margin: 0 }}>
            Room Categories
          </h1>
          <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "14px" }}>
            Manage room types to maintain consistent property classifications.
          </p>
        </div>

        <button 
          onClick={() => setIsAddOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "#0284c7",
            color: "#ffffff",
            border: "none",
            padding: "10px 16px",
            borderRadius: "6px",
            fontWeight: "600",
            cursor: "pointer",
            fontSize: "14px"
          }}
        >
          <Plus size={18} /> Add Category
        </button>
      </div>

      {/* Search Bar */}
      <div style={{
        backgroundColor: "#ffffff",
        padding: "16px",
        borderRadius: "8px",
        border: "1px solid #e2e8f0"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "8px 12px", width: "300px" }}>
          <Search size={18} color="#64748b" />
          <input 
            type="text" 
            placeholder="Search category name..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: "14px" }}
          />
        </div>
      </div>

      {/* Categories Table */}
      <div style={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "40px", gap: "8px", color: "#64748b" }}>
            <Loader2 className="animate-spin" size={20} /> Loading categories from Firebase...
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Category Name</th>
                <th style={thStyle}>Description</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.length > 0 ? (
                filteredCategories.map((cat, index) => (
                  <tr key={cat.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ ...tdStyle, color: "#64748b", fontWeight: "500" }}>
                      #{index + 1}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", color: "#1e293b" }}>
                        <Tag size={16} color="#0284c7" />
                        {cat.name}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, color: "#64748b" }}>{cat.description}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                        <button onClick={() => openEditModal(cat)} title="Edit Category" style={actionBtnStyle}>
                          <Edit3 size={16} color="#d97706" />
                        </button>
                        <button onClick={() => handleDeleteCategory(cat.id)} title="Delete Category" style={actionBtnStyle}>
                          <Trash2 size={16} color="#ef4444" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ padding: "24px", textAlign: "center", color: "#94a3b8" }}>
                    No categories found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ➕ / ✏️ ADD & EDIT CATEGORY MODAL */}
      {(isAddOpen || editingCategory) && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, width: "400px" }}>
            <div style={modalHeaderStyle}>
              <h3 style={{ margin: 0, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                <FolderPlus size={18} color="#0284c7" />
                {editingCategory ? "Edit Category" : "Add New Category"}
              </h3>
              <button onClick={resetForm} style={closeBtnStyle}><X size={20} /></button>
            </div>

            <form onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory} style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={labelStyle}>Category Name *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Studio Room" 
                  value={categoryName} 
                  onChange={(e) => setCategoryName(e.target.value)} 
                  required 
                  style={inputStyle} 
                />
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea 
                  rows="3" 
                  placeholder="Brief summary of room category..." 
                  value={categoryDesc} 
                  onChange={(e) => setCategoryDesc(e.target.value)} 
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>

              <div style={modalFooterStyle}>
                <button type="button" onClick={resetForm} style={secondaryBtnStyle} disabled={submitting}>Cancel</button>
                <button type="submit" style={primaryBtnStyle} disabled={submitting}>
                  {submitting ? "Saving..." : editingCategory ? "Save Changes" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER STYLES
// ─────────────────────────────────────────────────────────────────────────────
const thStyle = { padding: "12px 16px", fontSize: "13px", fontWeight: "600", color: "#475569" };
const tdStyle = { padding: "12px 16px", fontSize: "14px" };
const actionBtnStyle = { border: "none", background: "none", padding: "6px", cursor: "pointer", borderRadius: "4px" };

const labelStyle = { display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" };
const inputStyle = { width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px", boxSizing: "border-box" };

const modalOverlayStyle = { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modalContentStyle = { backgroundColor: "#ffffff", borderRadius: "12px", padding: "20px", maxWidth: "90%", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" };
const modalHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" };
const modalFooterStyle = { display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #e2e8f0" };

const closeBtnStyle = { border: "none", background: "none", cursor: "pointer", color: "#64748b" };
const secondaryBtnStyle = { padding: "8px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontWeight: "500" };
const primaryBtnStyle = { padding: "8px 16px", borderRadius: "6px", border: "none", background: "#0284c7", color: "#fff", cursor: "pointer", fontWeight: "600" };