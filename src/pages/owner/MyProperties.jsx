import React, { useState, useEffect, useMemo } from "react";
import { auth } from "../../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  Plus,
  Search,
  Building2,
  MapPin,
  BedDouble,
  Bath,
  Calendar,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  X,
  Check,
  Save,
  Image as ImageIcon,
  AlertTriangle,
  LayoutGrid,
  List,
  ArrowUpRight,
  Home,
  CircleDollarSign,
  Clock,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  FileText,
  Upload,
  ShieldCheck,
} from "lucide-react";

import { ownerPropertiesServices } from "../../services/ownerPropertiesServices";
import { subscriptionService } from "../../services/subscriptionService";
import { uploadToCloudinary } from "../../services/cloudinaryService";

const AMENITIES_LIST = [
  "WiFi",
  "Parking",
  "AC",
  "Kitchen",
  "Pool",
  "Gym",
  "Balcony",
  "TV",
  "Security",
  "Elevator",
  "Washer",
  "Pet Friendly",
];

const FILTERS = [
  { key: "all", label: "All properties" },
  { key: "available", label: "Available" },
  { key: "rented", label: "Rented" },
  { key: "unavailable", label: "Unavailable" },
  { key: "draft", label: "Draft" },
];

const IMAGE_FALLBACK =
  "https://placehold.co/800x500/F1F5F9/64748B?text=Property+Image";

const normalizeStatus = (status) =>
  String(status || "available")
    .trim()
    .toLowerCase();

const isAvailable = (status) =>
  ["available", "published"].includes(normalizeStatus(status));

const isUnavailable = (status) =>
  ["unavailable", "not available"].includes(normalizeStatus(status));

const formatPrice = (price) =>
  Number(price || 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });

const formatDate = (value) => {
  if (!value) return "—";

  try {
    const date =
      typeof value?.toDate === "function"
        ? value.toDate()
        : value instanceof Date
          ? value
          : typeof value === "number"
            ? new Date(value)
            : typeof value === "string" &&
                !Number.isNaN(Number(value)) &&
                value.trim() !== ""
              ? new Date(Number(value))
              : new Date(value);

    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
};

export default function MyProperties() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");

  const [selectedProperty, setSelectedProperty] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [propertyLimit, setPropertyLimit] = useState(0);
  const [checkingLimit, setCheckingLimit] = useState(true);

  // Load properties and subscription information.
  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;

      if (!user) {
        setProperties([]);
        setPropertyLimit(0);
        setLoading(false);
        setCheckingLimit(false);
        return;
      }

      setLoading(true);
      setCheckingLimit(true);

      try {
        const list = await ownerPropertiesServices.getOwnerProperties(user.uid);

        if (!active) return;

        setProperties(Array.isArray(list) ? list : []);

        try {
          const subscription = await subscriptionService.getOwnerSubscription(
            user.uid,
          );

          if (!active) return;

          if (
            subscription &&
            ["active", "approved"].includes(
              normalizeStatus(subscription.status),
            )
          ) {
            const plans = await subscriptionService.getPlans();

            if (!active) return;

            const plan = (Array.isArray(plans) ? plans : []).find(
              (p) =>
                p.id === subscription.planId ||
                p.name === subscription.planName ||
                (subscription.planId &&
                  String(p.id || "").includes(subscription.planId)),
            );

            let limit = plan?.propertyLimit ?? subscription.propertyLimit ?? 0;

            if (
              Number(limit) >= 999 ||
              String(plan?.name || "")
                .toLowerCase()
                .includes("unlimited")
            ) {
              limit = 999999;
            }

            setPropertyLimit(Math.max(0, Number(limit) || 0));
          } else {
            setPropertyLimit(0);
          }
        } catch (error) {
          console.error("Subscription check failed:", error);
          if (active) setPropertyLimit(0);
        }
      } catch (error) {
        console.error("Failed to load properties:", error);
        if (active) setProperties([]);
      } finally {
        if (active) {
          setLoading(false);
          setCheckingLimit(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Keep the selected property synchronized with updates.
  useEffect(() => {
    if (!selectedProperty) return;

    const updated = properties.find(
      (property) => property.id === selectedProperty.id,
    );

    if (updated) setSelectedProperty(updated);
  }, [properties, selectedProperty?.id]);

  const stats = useMemo(() => {
    const total = properties.length;
    const available = properties.filter((p) => isAvailable(p.status)).length;
    const rented = properties.filter(
      (p) => normalizeStatus(p.status) === "rented",
    ).length;
    const unavailable = properties.filter((p) =>
      isUnavailable(p.status),
    ).length;
    const drafts = properties.filter(
      (p) => normalizeStatus(p.status) === "draft",
    ).length;

    return { total, available, rented, unavailable, drafts };
  }, [properties]);

  const canAddProperty = properties.length < propertyLimit;

  const filteredProperties = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return properties.filter((item) => {
      const matchesSearch =
        !term ||
        [item.title, item.location, item.category].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(term),
        );

      const status = normalizeStatus(item.status);

      let matchesStatus = true;

      switch (statusFilter) {
        case "available":
          matchesStatus = isAvailable(status);
          break;
        case "rented":
          matchesStatus = status === "rented";
          break;
        case "unavailable":
          matchesStatus = isUnavailable(status);
          break;
        case "draft":
          matchesStatus = status === "draft";
          break;
        default:
          matchesStatus = true;
      }

      return matchesSearch && matchesStatus;
    });
  }, [properties, searchTerm, statusFilter]);

  const handleAddProperty = () => {
    if (checkingLimit) return;

    if (!canAddProperty) {
      navigate("/owner/subscription");
      return;
    }

    navigate("/owner/properties/add");
  };

  const openViewDialog = (property, editing = false) => {
    setSelectedProperty({ ...property });
    setEditForm({
      ...property,
      amenities: Array.isArray(property.amenities)
        ? [...property.amenities]
        : [],
    });
    setIsEditing(editing);
  };

  const closeDialog = () => {
    if (saving || uploadingImage) return;

    setSelectedProperty(null);
    setEditForm(null);
    setIsEditing(false);
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;

    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleAmenity = (amenity) => {
    setEditForm((prev) => {
      const current = prev?.amenities || [];

      return {
        ...prev,
        amenities: current.includes(amenity)
          ? current.filter((item) => item !== amenity)
          : [...current, amenity],
      };
    });
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];

    // Allow selecting the same file again later.
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      window.alert("Please select a valid image file.");
      return;
    }

    if (file.size > 30 * 1024 * 1024) {
      window.alert("Image must be smaller than 30 MB.");
      return;
    }

    setUploadingImage(true);

    try {
      const url = await uploadToCloudinary(file, "image");

      if (url) {
        setEditForm((prev) => ({
          ...prev,
          imageUrl: url,
        }));
      } else {
        window.alert("Image upload failed. Please try again.");
      }
    } catch (error) {
      console.error("Image upload failed:", error);
      window.alert("Unable to upload the image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveEdit = async (event) => {
    event?.preventDefault();

    if (!editForm?.id || saving || uploadingImage) return;

    const price = Number(editForm.price);
    const bedrooms = Number(editForm.bedrooms);
    const bathrooms = Number(editForm.bathrooms);

    if (!String(editForm.title || "").trim()) {
      window.alert("Property title is required.");
      return;
    }

    if (!String(editForm.location || "").trim()) {
      window.alert("Property location is required.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      window.alert("Enter a valid property price.");
      return;
    }

    if (
      !Number.isInteger(bedrooms) ||
      bedrooms < 0 ||
      !Number.isInteger(bathrooms) ||
      bathrooms < 0
    ) {
      window.alert("Bedrooms and bathrooms must be valid whole numbers.");
      return;
    }

    const payload = {
      title: String(editForm.title).trim(),
      price,
      location: String(editForm.location).trim(),
      bedrooms,
      bathrooms,
      description: editForm.description || "",
      status: editForm.status || "published",
      amenities: editForm.amenities || [],
      imageUrl: editForm.imageUrl || "",
    };

    setSaving(true);

    try {
      await ownerPropertiesServices.updateProperty(editForm.id, payload);

      setProperties((prev) =>
        prev.map((property) =>
          property.id === editForm.id ? { ...property, ...payload } : property,
        ),
      );

      setSelectedProperty((prev) =>
        prev?.id === editForm.id ? { ...prev, ...payload } : prev,
      );

      setEditForm((prev) => ({ ...prev, ...payload }));
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update property:", error);
      window.alert("Failed to update property. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    if (updatingStatusId === id) return;

    const previousProperty = properties.find((p) => p.id === id);
    if (!previousProperty) return;

    setUpdatingStatusId(id);

    // Optimistically update the visible status.
    setProperties((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: newStatus } : item,
      ),
    );

    try {
      await ownerPropertiesServices.updatePropertyStatus(id, newStatus);
    } catch (error) {
      console.error("Failed to update status:", error);

      setProperties((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: previousProperty.status } : item,
        ),
      );

      window.alert("Failed to update property status.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleDelete = async (id) => {
    if (deletingId === id) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this property? This action cannot be undone.",
    );

    if (!confirmed) return;

    setDeletingId(id);

    try {
      await ownerPropertiesServices.deleteProperty(id);

      setProperties((prev) => prev.filter((item) => item.id !== id));

      if (selectedProperty?.id === id) {
        setSelectedProperty(null);
        setEditForm(null);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Failed to delete property:", error);
      window.alert("Failed to delete property. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  if (loading) {
    return (
      <div className="mp-loading">
        <div className="mp-loading-card">
          <div className="mp-loader">
            <Loader2 size={30} />
          </div>
          <h6>Loading your properties</h6>
          <p>Please wait while we prepare your dashboard.</p>
        </div>
        <MyPropertiesStyles />
      </div>
    );
  }

  return (
    <div className="mp-page">
      <MyPropertiesStyles />

      {/* Page header */}
      <header className="mp-header">
        <div className="mp-heading">
          <div className="mp-eyebrow">
            <Building2 size={15} />
            PROPERTY MANAGEMENT
          </div>

          <h1>My Properties</h1>

          <p>Manage your listings, update pricing, and control availability.</p>
        </div>

        <button
          type="button"
          className={`mp-primary-btn ${
            !canAddProperty && !checkingLimit ? "mp-upgrade-btn" : ""
          }`}
          onClick={handleAddProperty}
          disabled={checkingLimit}
        >
          {checkingLimit ? (
            <Loader2 className="mp-spin" size={18} />
          ) : canAddProperty ? (
            <Plus size={19} />
          ) : (
            <ArrowUpRight size={19} />
          )}

          {checkingLimit
            ? "Checking plan..."
            : canAddProperty
              ? "Add Property"
              : "Upgrade Plan"}
        </button>
      </header>

      {/* Subscription usage */}
      <section className="mp-plan-strip">
        <div className="mp-plan-icon">
          <ShieldCheck size={20} />
        </div>

        <div className="mp-plan-content">
          <strong>Property listings</strong>
          <span>
            {checkingLimit
              ? "Checking your subscription..."
              : propertyLimit >= 999999
                ? `${properties.length} properties added · Unlimited plan`
                : `${properties.length} of ${propertyLimit} property slots used`}
          </span>
        </div>

        {!checkingLimit && propertyLimit < 999999 && (
          <>
            <div
              className="mp-plan-progress"
              role="progressbar"
              aria-label="Property listing usage"
              aria-valuenow={Math.min(properties.length, propertyLimit)}
              aria-valuemin={0}
              aria-valuemax={Math.max(propertyLimit, 1)}
            >
              <span
                style={{
                  width: `${
                    propertyLimit > 0
                      ? Math.min((properties.length / propertyLimit) * 100, 100)
                      : 100
                  }%`,
                }}
              />
            </div>

            <button
              type="button"
              className="mp-text-btn"
              onClick={() => navigate("/owner/subscription")}
            >
              View plans <ArrowUpRight size={15} />
            </button>
          </>
        )}
      </section>

      {/* Statistics */}
      <section className="mp-stats-grid">
        <QuickStat
          label="Total properties"
          value={stats.total}
          color="blue"
          icon={<Building2 size={21} />}
          note="All your listings"
        />

        <QuickStat
          label="Available"
          value={stats.available}
          color="green"
          icon={<Home size={21} />}
          note="Ready for tenants"
        />

        <QuickStat
          label="Rented"
          value={stats.rented}
          color="purple"
          icon={<CircleDollarSign size={21} />}
          note="Currently occupied"
        />

        <QuickStat
          label="Unavailable"
          value={stats.unavailable}
          color="orange"
          icon={<Clock size={21} />}
          note={
            stats.drafts
              ? `${stats.drafts} draft${stats.drafts === 1 ? "" : "s"}`
              : "Not available for rent"
          }
        />
      </section>

      {/* Toolbar */}
      <section className="mp-toolbar">
        <div className="mp-toolbar-top">
          <div>
            <h2>Your listings</h2>
            <p>
              {filteredProperties.length}{" "}
              {filteredProperties.length === 1 ? "property" : "properties"}
              {searchTerm || statusFilter !== "all" ? " found" : " in total"}
            </p>
          </div>

          <div className="mp-view-toggle" aria-label="Choose display mode">
            <button
              type="button"
              className={viewMode === "grid" ? "active" : ""}
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
              title="Grid view"
            >
              <LayoutGrid size={17} />
              <span>Grid</span>
            </button>

            <button
              type="button"
              className={viewMode === "list" ? "active" : ""}
              onClick={() => setViewMode("list")}
              aria-label="List view"
              title="List view"
            >
              <List size={18} />
              <span>List</span>
            </button>
          </div>
        </div>

        <div className="mp-filter-row">
          <div className="mp-search">
            <Search size={19} />
            <input
              type="search"
              placeholder="Search properties, locations..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label="Search properties"
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="mp-filter-label">
            <SlidersHorizontal size={16} />
            <span>Filter:</span>
          </div>

          <div className="mp-filter-tabs">
            {FILTERS.map((filter) => (
              <button
                type="button"
                key={filter.key}
                className={statusFilter === filter.key ? "active" : ""}
                onClick={() => setStatusFilter(filter.key)}
              >
                {filter.label}

                {filter.key === "all" && (
                  <span className="mp-filter-count">{stats.total}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Property results */}
      {filteredProperties.length === 0 ? (
        <div className="mp-empty">
          <div className="mp-empty-icon">
            {properties.length === 0 ? (
              <Building2 size={34} />
            ) : (
              <Search size={32} />
            )}
          </div>

          <h3>
            {properties.length === 0
              ? "Start listing your properties"
              : "No properties found"}
          </h3>

          <p>
            {properties.length === 0
              ? "Add your first property to start managing your rental listings."
              : "Try another search term or change your filters."}
          </p>

          {properties.length === 0 ? (
            <button
              type="button"
              className="mp-primary-btn"
              onClick={handleAddProperty}
              disabled={checkingLimit}
            >
              <Plus size={18} /> Add your first property
            </button>
          ) : (
            <button
              type="button"
              className="mp-secondary-btn"
              onClick={resetFilters}
            >
              <RefreshCw size={16} /> Clear filters
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <section className="mp-property-grid">
          {filteredProperties.map((item) => (
            <PropertyCard
              key={item.id}
              item={item}
              onView={() => openViewDialog(item)}
              onEdit={() => openViewDialog(item, true)}
              onDelete={() => handleDelete(item.id)}
              onStatusChange={(status) => handleStatusChange(item.id, status)}
              deleting={deletingId === item.id}
              updating={updatingStatusId === item.id}
            />
          ))}
        </section>
      ) : (
        <PropertyTable
          properties={filteredProperties}
          onView={(item) => openViewDialog(item)}
          onEdit={(item) => openViewDialog(item, true)}
          onDelete={(item) => handleDelete(item.id)}
          deletingId={deletingId}
        />
      )}

      {/* View / edit dialog */}
      {selectedProperty && editForm && (
        <div
          className="mp-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <section
            className="mp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mp-modal-title"
          >
            <header className="mp-modal-header">
              <div className="mp-modal-heading">
                <div className="mp-modal-heading-icon">
                  {isEditing ? <Pencil size={19} /> : <Building2 size={20} />}
                </div>

                <div>
                  <h2 id="mp-modal-title">
                    {isEditing ? "Edit property" : "Property details"}
                  </h2>
                  <p>
                    {isEditing
                      ? "Update your listing information."
                      : selectedProperty.category || "Rental property"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="mp-icon-btn"
                onClick={closeDialog}
                disabled={saving || uploadingImage}
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </header>

            <div className="mp-modal-body">
              <div className="mp-detail-image">
                <img
                  src={
                    isEditing
                      ? editForm.imageUrl || IMAGE_FALLBACK
                      : selectedProperty.imageUrl || IMAGE_FALLBACK
                  }
                  alt={selectedProperty.title || "Property"}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = IMAGE_FALLBACK;
                  }}
                />

                <div className="mp-detail-image-shade" />

                <div className="mp-detail-image-status">
                  <StatusBadge
                    status={
                      isEditing ? editForm.status : selectedProperty.status
                    }
                  />
                </div>

                {isEditing && (
                  <label className="mp-image-upload-btn">
                    {uploadingImage ? (
                      <Loader2 size={16} className="mp-spin" />
                    ) : (
                      <ImageIcon size={16} />
                    )}

                    {uploadingImage ? "Uploading..." : "Change cover image"}

                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      disabled={uploadingImage || saving}
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>

              {isEditing ? (
                <form className="mp-edit-form" onSubmit={handleSaveEdit}>
                  <FormSection
                    title="Basic information"
                    description="The main details shown to potential tenants."
                    icon={<FileText size={18} />}
                  >
                    <div className="mp-form-field">
                      <label htmlFor="mp-title">Property title *</label>
                      <input
                        id="mp-title"
                        name="title"
                        className="form-control"
                        placeholder="e.g. Modern apartment near city center"
                        value={editForm.title || ""}
                        onChange={handleEditChange}
                        required
                      />
                    </div>

                    <div className="mp-form-field">
                      <label htmlFor="mp-location">Location *</label>
                      <div className="mp-input-icon">
                        <MapPin size={17} />
                        <input
                          id="mp-location"
                          name="location"
                          className="form-control"
                          placeholder="Property address or area"
                          value={editForm.location || ""}
                          onChange={handleEditChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="mp-form-field">
                      <label htmlFor="mp-description">Description</label>
                      <textarea
                        id="mp-description"
                        name="description"
                        className="form-control"
                        rows={4}
                        placeholder="Describe the property and what makes it suitable for tenants..."
                        value={editForm.description || ""}
                        onChange={handleEditChange}
                      />
                    </div>
                  </FormSection>

                  <FormSection
                    title="Pricing and availability"
                    description="Set the monthly price and listing status."
                    icon={<CircleDollarSign size={18} />}
                  >
                    <div className="mp-form-grid">
                      <div className="mp-form-field">
                        <label htmlFor="mp-price">Monthly price ($) *</label>
                        <div className="mp-input-icon">
                          <span className="mp-currency-symbol">$</span>
                          <input
                            id="mp-price"
                            name="price"
                            type="number"
                            min="0"
                            step="0.01"
                            className="form-control"
                            value={editForm.price ?? ""}
                            onChange={handleEditChange}
                            required
                          />
                        </div>
                      </div>

                      <div className="mp-form-field">
                        <label htmlFor="mp-status">Status</label>
                        <div className="mp-select-wrap">
                          <select
                            id="mp-status"
                            name="status"
                            className="form-select"
                            value={editForm.status || "published"}
                            onChange={handleEditChange}
                          >
                            <option value="published">Published</option>
                            <option value="available">Available</option>
                            <option value="rented">Rented</option>
                            <option value="draft">Draft</option>
                            <option value="unavailable">Unavailable</option>
                          </select>
                          <ChevronDown size={16} />
                        </div>
                      </div>
                    </div>

                    <div className="mp-form-grid">
                      <div className="mp-form-field">
                        <label htmlFor="mp-bedrooms">Bedrooms</label>
                        <div className="mp-input-icon">
                          <BedDouble size={17} />
                          <input
                            id="mp-bedrooms"
                            name="bedrooms"
                            type="number"
                            min="0"
                            step="1"
                            className="form-control"
                            value={editForm.bedrooms ?? 0}
                            onChange={handleEditChange}
                          />
                        </div>
                      </div>

                      <div className="mp-form-field">
                        <label htmlFor="mp-bathrooms">Bathrooms</label>
                        <div className="mp-input-icon">
                          <Bath size={17} />
                          <input
                            id="mp-bathrooms"
                            name="bathrooms"
                            type="number"
                            min="0"
                            step="1"
                            className="form-control"
                            value={editForm.bathrooms ?? 0}
                            onChange={handleEditChange}
                          />
                        </div>
                      </div>
                    </div>
                  </FormSection>

                  <FormSection
                    title="Property image"
                    description="Upload a new cover image or enter an image URL."
                    icon={<ImageIcon size={18} />}
                  >
                    <div className="mp-upload-panel">
                      <div className="mp-upload-preview">
                        <img
                          src={editForm.imageUrl || IMAGE_FALLBACK}
                          alt="Selected property preview"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = IMAGE_FALLBACK;
                          }}
                        />

                        {uploadingImage && (
                          <div className="mp-upload-overlay">
                            <Loader2 size={27} className="mp-spin" />
                            <span>Uploading image...</span>
                          </div>
                        )}
                      </div>

                      <div className="mp-upload-controls">
                        <label className="mp-secondary-btn">
                          <Upload size={16} />
                          Choose image
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            disabled={uploadingImage || saving}
                            onChange={handleImageChange}
                          />
                        </label>

                        <div className="mp-form-field">
                          <label htmlFor="mp-image-url">Image URL</label>
                          <input
                            id="mp-image-url"
                            name="imageUrl"
                            type="url"
                            className="form-control"
                            placeholder="https://example.com/image.jpg"
                            value={editForm.imageUrl || ""}
                            onChange={handleEditChange}
                            disabled={uploadingImage}
                          />
                        </div>
                      </div>

                      <p className="mp-helper-text">
                        Image files only. Maximum upload size: 30 MB. Cloudinary
                        must be configured in your project.
                      </p>
                    </div>
                  </FormSection>

                  <FormSection
                    title="Amenities"
                    description="Select the facilities available at this property."
                    icon={<Check size={18} />}
                  >
                    <div className="mp-amenities">
                      {AMENITIES_LIST.map((amenity) => {
                        const active = (editForm.amenities || []).includes(
                          amenity,
                        );

                        return (
                          <button
                            type="button"
                            key={amenity}
                            className={`mp-amenity ${active ? "active" : ""}`}
                            onClick={() => toggleAmenity(amenity)}
                          >
                            {active ? <Check size={15} /> : <Plus size={15} />}
                            {amenity}
                          </button>
                        );
                      })}
                    </div>
                  </FormSection>

                  <div className="mp-form-footer">
                    <button
                      type="button"
                      className="mp-secondary-btn"
                      disabled={saving || uploadingImage}
                      onClick={() => {
                        setEditForm({
                          ...selectedProperty,
                          amenities: Array.isArray(selectedProperty.amenities)
                            ? [...selectedProperty.amenities]
                            : [],
                        });
                        setIsEditing(false);
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="mp-primary-btn"
                      disabled={saving || uploadingImage}
                    >
                      {saving ? (
                        <Loader2 size={17} className="mp-spin" />
                      ) : (
                        <Save size={17} />
                      )}

                      {saving ? "Saving changes..." : "Save changes"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mp-property-details">
                  <div className="mp-detail-title-row">
                    <div>
                      <span className="mp-category-label">
                        {selectedProperty.category || "Rental property"}
                      </span>
                      <h3>{selectedProperty.title || "Untitled property"}</h3>
                      <p className="mp-detail-location">
                        <MapPin size={16} />
                        {selectedProperty.location || "Location not specified"}
                      </p>
                    </div>

                    <div className="mp-detail-price">
                      <span>Monthly rent</span>
                      <strong>${formatPrice(selectedProperty.price)}</strong>
                      <small>per month</small>
                    </div>
                  </div>

                  <div className="mp-detail-metrics">
                    <DetailMetric
                      icon={<BedDouble size={19} />}
                      label="Bedrooms"
                      value={selectedProperty.bedrooms ?? 0}
                    />
                    <DetailMetric
                      icon={<Bath size={19} />}
                      label="Bathrooms"
                      value={selectedProperty.bathrooms ?? 0}
                    />
                    <DetailMetric
                      icon={<Calendar size={19} />}
                      label="Listed on"
                      value={formatDate(selectedProperty.createdAt)}
                    />
                  </div>

                  <div className="mp-detail-section">
                    <h4>About this property</h4>
                    <p className="mp-description">
                      {selectedProperty.description ||
                        "No description has been added for this property yet."}
                    </p>
                  </div>

                  <div className="mp-detail-section">
                    <h4>Amenities and facilities</h4>

                    {Array.isArray(selectedProperty.amenities) &&
                    selectedProperty.amenities.length > 0 ? (
                      <div className="mp-amenities mp-view-amenities">
                        {selectedProperty.amenities.map((amenity) => (
                          <span className="mp-amenity active" key={amenity}>
                            <Check size={15} />
                            {amenity}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mp-helper-text">
                        No amenities have been added yet.
                      </p>
                    )}
                  </div>

                  <div className="mp-detail-footer">
                    <button
                      type="button"
                      className="mp-danger-btn"
                      onClick={() => handleDelete(selectedProperty.id)}
                      disabled={deletingId === selectedProperty.id}
                    >
                      {deletingId === selectedProperty.id ? (
                        <Loader2 size={16} className="mp-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      Delete
                    </button>

                    <button
                      type="button"
                      className="mp-primary-btn"
                      onClick={() => setIsEditing(true)}
                    >
                      <Pencil size={16} />
                      Edit property
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   PROPERTY CARD
========================================================= */

function PropertyCard({
  item,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  deleting,
  updating,
}) {
  return (
    <article className="mp-property-card">
      <div className="mp-card-image">
        <img
          src={item.imageUrl || IMAGE_FALLBACK}
          alt={item.title || "Rental property"}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = IMAGE_FALLBACK;
          }}
        />

        <div className="mp-card-image-top">
          <StatusBadge status={item.status} />
          <span className="mp-card-category">
            {item.category || "Property"}
          </span>
        </div>

        <button
          type="button"
          className="mp-card-image-view"
          onClick={onView}
          aria-label={`View ${item.title || "property"}`}
          title="View property"
        >
          <Eye size={17} />
        </button>
      </div>

      <div className="mp-card-content">
        <div className="mp-card-heading">
          <h3 title={item.title}>{item.title || "Untitled property"}</h3>

          <div className="mp-card-price">
            <strong>${formatPrice(item.price)}</strong>
            <span>/ month</span>
          </div>
        </div>

        <p className="mp-card-location" title={item.location}>
          <MapPin size={15} />
          <span>{item.location || "Location not specified"}</span>
        </p>

        <div className="mp-card-features">
          <span>
            <BedDouble size={17} />
            {item.bedrooms ?? 0} beds
          </span>

          <span>
            <Bath size={17} />
            {item.bathrooms ?? 0} baths
          </span>
        </div>

        <div className="mp-card-status-row">
          <label htmlFor={`status-${item.id}`}>Listing status</label>

          <div className="mp-status-select">
            {updating && <Loader2 size={14} className="mp-spin" />}

            <select
              id={`status-${item.id}`}
              value={normalizeStatus(item.status)}
              onChange={(event) => onStatusChange(event.target.value)}
              disabled={updating || deleting}
              aria-label={`Change status for ${item.title || "property"}`}
            >
              <option value="published">Published</option>
              <option value="available">Available</option>
              <option value="rented">Rented</option>
              <option value="draft">Draft</option>
              <option value="unavailable">Unavailable</option>
            </select>

            <ChevronDown size={14} />
          </div>
        </div>

        <div className="mp-card-actions">
          <button
            type="button"
            className="mp-card-action mp-card-action-primary"
            onClick={onView}
          >
            <Eye size={16} /> View details
          </button>

          <button
            type="button"
            className="mp-card-icon-action"
            onClick={onEdit}
            title="Edit property"
            aria-label="Edit property"
          >
            <Pencil size={16} />
          </button>

          <button
            type="button"
            className="mp-card-icon-action mp-delete-icon"
            onClick={onDelete}
            disabled={deleting}
            title="Delete property"
            aria-label="Delete property"
          >
            {deleting ? (
              <Loader2 size={16} className="mp-spin" />
            ) : (
              <Trash2 size={16} />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   LIST VIEW
========================================================= */

function PropertyTable({ properties, onView, onEdit, onDelete, deletingId }) {
  return (
    <section className="mp-table-card">
      <div className="mp-table-scroll">
        <table className="mp-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>Location</th>
              <th>Details</th>
              <th>Monthly rent</th>
              <th>Status</th>
              <th>Created</th>
              <th className="mp-table-actions-heading">Actions</th>
            </tr>
          </thead>

          <tbody>
            {properties.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="mp-table-property">
                    <img
                      src={item.imageUrl || IMAGE_FALLBACK}
                      alt=""
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = IMAGE_FALLBACK;
                      }}
                    />

                    <div>
                      <strong>{item.title || "Untitled property"}</strong>
                      <span>{item.category || "Property"}</span>
                    </div>
                  </div>
                </td>

                <td>
                  <div className="mp-table-location">
                    <MapPin size={15} />
                    <span>{item.location || "—"}</span>
                  </div>
                </td>

                <td>
                  <div className="mp-table-features">
                    <span>{item.bedrooms ?? 0} bed</span>
                    <span>{item.bathrooms ?? 0} bath</span>
                  </div>
                </td>

                <td>
                  <div className="mp-table-price">
                    ${formatPrice(item.price)}
                    <span>/mo</span>
                  </div>
                </td>

                <td>
                  <StatusBadge status={item.status} />
                </td>

                <td>
                  <span className="mp-table-date">
                    {formatDate(item.createdAt)}
                  </span>
                </td>

                <td>
                  <div className="mp-table-actions">
                    <button
                      type="button"
                      onClick={() => onView(item)}
                      title="View"
                      aria-label="View property"
                    >
                      <Eye size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      title="Edit"
                      aria-label="Edit property"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(item)}
                      disabled={deletingId === item.id}
                      title="Delete"
                      aria-label="Delete property"
                      className="mp-table-delete"
                    >
                      {deletingId === item.id ? (
                        <Loader2 size={16} className="mp-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* =========================================================
   REUSABLE COMPONENTS
========================================================= */

function QuickStat({ label, value, color, icon, note }) {
  return (
    <article className="mp-stat-card">
      <div className={`mp-stat-icon ${color}`}>{icon}</div>

      <div className="mp-stat-info">
        <span className="mp-stat-label">{label}</span>
        <strong>{value}</strong>
        <span className="mp-stat-note">{note}</span>
      </div>

      <div className={`mp-stat-decoration ${color}`} />
    </article>
  );
}

function StatusBadge({ status }) {
  const normalized = normalizeStatus(status);

  const statusMap = {
    available: {
      label: "Available",
      className: "available",
    },
    published: {
      label: "Published",
      className: "published",
    },
    rented: {
      label: "Rented",
      className: "rented",
    },
    unavailable: {
      label: "Unavailable",
      className: "unavailable",
    },
    "not available": {
      label: "Unavailable",
      className: "unavailable",
    },
    draft: {
      label: "Draft",
      className: "draft",
    },
  };

  const result = statusMap[normalized] || {
    label: status || "Unknown",
    className: "unknown",
  };

  return (
    <span className={`mp-status-badge ${result.className}`}>
      <span className="mp-status-dot" />
      {result.label}
    </span>
  );
}

function FormSection({ title, description, icon, children }) {
  return (
    <section className="mp-form-section">
      <div className="mp-form-section-heading">
        <div className="mp-form-section-icon">{icon}</div>

        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      <div className="mp-form-section-content">{children}</div>
    </section>
  );
}

function DetailMetric({ icon, label, value }) {
  return (
    <div className="mp-detail-metric">
      <div className="mp-detail-metric-icon">{icon}</div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

/* =========================================================
   PAGE STYLES
========================================================= */

function MyPropertiesStyles() {
  return (
    <style>{`
      .mp-page {
        --mp-primary: #4f46e5;
        --mp-primary-dark: #4338ca;
        --mp-primary-soft: #eef2ff;
        --mp-text: #172033;
        --mp-muted: #64748b;
        --mp-border: #e7ebf2;
        --mp-surface: #ffffff;
        --mp-background: #f6f8fc;
        --mp-green: #059669;
        --mp-radius: 17px;
        min-height: 100vh;
        padding: 30px clamp(16px, 2.8vw, 40px) 44px;
        color: var(--mp-text);
        background: var(--mp-background);
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        box-sizing: border-box;
      }

      .mp-page *, .mp-modal-backdrop *, .mp-loading * {
        box-sizing: border-box;
      }

      .mp-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 20px;
        margin-bottom: 25px;
      }

      .mp-heading { min-width: 0; }

      .mp-eyebrow {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--mp-primary);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 1.4px;
        margin-bottom: 10px;
      }

      .mp-heading h1 {
        margin: 0;
        font-size: clamp(25px, 2.3vw, 32px);
        font-weight: 800;
        letter-spacing: -1.1px;
        color: #172033;
        line-height: 1.25;
      }

      .mp-heading p {
        margin: 8px 0 0;
        font-size: 13px;
        line-height: 1.7;
        color: #778398;
      }

      .mp-primary-btn, .mp-secondary-btn, .mp-danger-btn {
        min-height: 42px;
        padding: 10px 16px;
        border-radius: 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        font-size: 12px;
        font-weight: 700;
        text-decoration: none;
        white-space: nowrap;
        cursor: pointer;
        transition: background .18s ease, border-color .18s ease, transform .18s ease;
      }

      .mp-primary-btn {
        border: 1px solid var(--mp-primary);
        color: white;
        background: var(--mp-primary);
        box-shadow: 0 5px 13px rgba(79,70,229,.15);
      }

      .mp-primary-btn:hover:not(:disabled) {
        background: var(--mp-primary-dark);
        border-color: var(--mp-primary-dark);
        color: white;
        transform: translateY(-1px);
      }

      .mp-primary-btn:disabled, .mp-secondary-btn:disabled,
      .mp-danger-btn:disabled {
        opacity: .6;
        cursor: not-allowed;
      }

      .mp-upgrade-btn {
        color: #92400e;
        background: #fef3c7;
        border-color: #fcd34d;
        box-shadow: none;
      }

      .mp-upgrade-btn:hover:not(:disabled) {
        background: #fde68a;
        border-color: #fbbf24;
        color: #78350f;
      }

      .mp-secondary-btn {
        border: 1px solid #dce2ec;
        color: #475569;
        background: #fff;
      }

      .mp-secondary-btn:hover:not(:disabled) {
        color: var(--mp-primary);
        background: #f8faff;
        border-color: #c7d2fe;
      }

      .mp-danger-btn {
        color: #dc2626;
        background: #fff;
        border: 1px solid #fecaca;
      }

      .mp-danger-btn:hover:not(:disabled) {
        background: #fff1f2;
      }

      .mp-plan-strip {
        display: flex;
        align-items: center;
        gap: 13px;
        flex-wrap: wrap;
        background: #fff;
        border: 1px solid var(--mp-border);
        border-radius: 14px;
        padding: 15px 18px;
        margin-bottom: 24px;
      }

      .mp-plan-icon {
        width: 41px;
        height: 41px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        background: #eef2ff;
        color: var(--mp-primary);
        flex-shrink: 0;
      }

      .mp-plan-content {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 150px;
      }

      .mp-plan-content strong {
        font-size: 12px;
        font-weight: 800;
        color: #29344a;
      }

      .mp-plan-content span {
        font-size: 11px;
        color: #8290a4;
      }

      .mp-plan-progress {
        flex: 1;
        min-width: 60px;
        height: 6px;
        overflow: hidden;
        border-radius: 99px;
        background: #edf0f6;
      }

      .mp-plan-progress span {
        display: block;
        height: 100%;
        background: var(--mp-primary);
        border-radius: inherit;
        transition: width .3s ease;
      }

      .mp-text-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 7px 2px;
        border: none;
        background: transparent;
        color: var(--mp-primary);
        font-size: 11px;
        font-weight: 750;
        cursor: pointer;
      }

      .mp-stats-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
        margin-bottom: 27px;
      }

      .mp-stat-card {
        position: relative;
        display: flex;
        align-items: flex-start;
        gap: 13px;
        min-width: 0;
        min-height: 132px;
        padding: 19px 17px;
        overflow: hidden;
        border: 1px solid var(--mp-border);
        border-radius: var(--mp-radius);
        background: #fff;
        transition: transform .2s ease, box-shadow .2s ease;
      }

      .mp-stat-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 25px rgba(25,38,70,.045);
      }

      .mp-stat-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border-radius: 13px;
        flex-shrink: 0;
      }

      .mp-stat-icon.blue { color: #2563eb; background: #eff6ff; }
      .mp-stat-icon.green { color: #059669; background: #ecfdf5; }
      .mp-stat-icon.purple { color: #7c3aed; background: #f5f3ff; }
      .mp-stat-icon.orange { color: #d97706; background: #fffbeb; }

      .mp-stat-info {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
        min-width: 0;
      }

      .mp-stat-label {
        color: #778398;
        font-size: 11px;
        font-weight: 600;
        line-height: 1.5;
      }

      .mp-stat-info > strong {
        color: #172033;
        font-size: 29px;
        line-height: 1.15;
        font-weight: 800;
        letter-spacing: -.8px;
      }

      .mp-stat-note {
        color: #98a3b4;
        font-size: 10px;
        line-height: 1.5;
      }

      .mp-stat-decoration {
        position: absolute;
        width: 64px;
        height: 64px;
        right: -30px;
        bottom: -32px;
        border-radius: 50%;
        opacity: .08;
      }

      .mp-stat-decoration.blue { background: #2563eb; }
      .mp-stat-decoration.green { background: #059669; }
      .mp-stat-decoration.purple { background: #7c3aed; }
      .mp-stat-decoration.orange { background: #d97706; }

      .mp-toolbar {
        background: #fff;
        border: 1px solid var(--mp-border);
        border-radius: var(--mp-radius);
        padding: 21px 22px 18px;
        margin-bottom: 22px;
      }

      .mp-toolbar-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 19px;
      }

      .mp-toolbar-top h2 {
        margin: 0;
        color: #1e293b;
        font-size: 17px;
        font-weight: 800;
        letter-spacing: -.3px;
      }

      .mp-toolbar-top p {
        margin: 5px 0 0;
        color: #8894a7;
        font-size: 11px;
      }

      .mp-view-toggle {
        display: flex;
        gap: 4px;
        padding: 4px;
        border: 1px solid #e8ebf2;
        border-radius: 10px;
        background: #f7f8fb;
      }

      .mp-view-toggle button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        min-height: 32px;
        padding: 7px 11px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: #8190a5;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
      }

      .mp-view-toggle button.active {
        color: var(--mp-primary);
        background: #fff;
        box-shadow: 0 1px 4px rgba(20,30,55,.09);
      }

      .mp-filter-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 11px;
      }

      .mp-search {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 200px;
        flex: 1 1 230px;
        min-height: 43px;
        padding: 0 12px;
        border: 1px solid #e3e8f0;
        border-radius: 10px;
        background: #fff;
        color: #9aa6b8;
        transition: border-color .2s ease, box-shadow .2s ease;
      }

      .mp-search:focus-within {
        border-color: #a5b4fc;
        box-shadow: 0 0 0 3px rgba(79,70,229,.08);
      }

      .mp-search input {
        width: 100%;
        min-width: 0;
        height: 41px;
        border: 0;
        outline: 0;
        color: #273449;
        background: transparent;
        font-size: 11px;
      }

      .mp-search input::placeholder { color: #a0aabb; }

      .mp-search > button {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 3px;
        border: 0;
        color: #8b96a8;
        background: transparent;
        cursor: pointer;
      }

      .mp-filter-label {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #8490a3;
        font-size: 11px;
        font-weight: 650;
        white-space: nowrap;
      }

      .mp-filter-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }

      .mp-filter-tabs button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 34px;
        padding: 7px 11px;
        border: 1px solid transparent;
        border-radius: 8px;
        background: transparent;
        color: #758198;
        font-size: 10px;
        font-weight: 700;
        white-space: nowrap;
        cursor: pointer;
        transition: all .16s ease;
      }

      .mp-filter-tabs button:hover {
        color: var(--mp-primary);
        background: #f5f6ff;
      }

      .mp-filter-tabs button.active {
        border-color: #e0e7ff;
        background: #eef2ff;
        color: var(--mp-primary);
      }

      .mp-filter-count {
        min-width: 19px;
        height: 19px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 5px;
        border-radius: 6px;
        background: rgba(79,70,229,.09);
        font-size: 9px;
      }

      .mp-property-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        align-items: stretch;
        gap: 22px;
      }

      .mp-property-card {
        display: flex;
        flex-direction: column;
        min-width: 0;
        overflow: hidden;
        border: 1px solid #e7ebf2;
        border-radius: 17px;
        background: #fff;
        box-shadow: 0 3px 10px rgba(25,38,70,.018);
        transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
      }

      .mp-property-card:hover {
        transform: translateY(-3px);
        border-color: #dbe2f0;
        box-shadow: 0 13px 32px rgba(25,38,70,.065);
      }

      .mp-card-image {
        position: relative;
        height: 210px;
        flex-shrink: 0;
        overflow: hidden;
        background: #edf1f7;
      }

      .mp-card-image > img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform .35s ease;
      }

      .mp-property-card:hover .mp-card-image > img {
        transform: scale(1.035);
      }

      .mp-card-image-top {
        position: absolute;
        top: 13px;
        left: 13px;
        right: 13px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
      }

      .mp-status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        width: fit-content;
        max-width: 100%;
        padding: 7px 10px;
        border-radius: 7px;
        font-size: 10px;
        font-weight: 750;
        line-height: 1.2;
        white-space: nowrap;
      }

      .mp-status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
        flex-shrink: 0;
      }

      .mp-status-badge.available,
      .mp-status-badge.published {
        color: #047857;
        background: #ecfdf5;
      }

      .mp-status-badge.rented {
        color: #1d4ed8;
        background: #eff6ff;
      }

      .mp-status-badge.unavailable {
        color: #b91c1c;
        background: #fef2f2;
      }

      .mp-status-badge.draft {
        color: #92400e;
        background: #fffbeb;
      }

      .mp-status-badge.unknown {
        color: #475569;
        background: #f1f5f9;
      }

      .mp-card-category {
        display: inline-flex;
        max-width: 52%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        padding: 7px 10px;
        border: 1px solid rgba(255,255,255,.25);
        border-radius: 7px;
        background: rgba(15,23,42,.65);
        color: white;
        backdrop-filter: blur(8px);
        font-size: 10px;
        font-weight: 650;
      }

      .mp-card-image-view {
        position: absolute;
        right: 13px;
        bottom: 13px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border: 1px solid rgba(255,255,255,.65);
        border-radius: 10px;
        background: rgba(255,255,255,.94);
        color: var(--mp-primary);
        cursor: pointer;
        opacity: 0;
        transform: translateY(4px);
        transition: opacity .2s ease, transform .2s ease;
      }

      .mp-property-card:hover .mp-card-image-view,
      .mp-card-image-view:focus-visible {
        opacity: 1;
        transform: translateY(0);
      }

      .mp-card-content {
        display: flex;
        flex: 1;
        flex-direction: column;
        min-width: 0;
        padding: 18px 17px 0;
      }

      .mp-card-heading {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 9px;
      }

      .mp-card-heading h3 {
        margin: 1px 0 0;
        min-width: 0;
        color: #202b40;
        font-size: 15px;
        line-height: 1.5;
        font-weight: 800;
        letter-spacing: -.2px;
        overflow-wrap: anywhere;
      }

      .mp-card-price {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        flex-shrink: 0;
        gap: 2px;
      }

      .mp-card-price strong {
        color: #059669;
        font-size: 17px;
        line-height: 1.3;
        font-weight: 800;
        white-space: nowrap;
      }

      .mp-card-price span {
        color: #96a0b0;
        font-size: 9px;
        white-space: nowrap;
      }

      .mp-card-location {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 10px 0 15px;
        color: #8a96a8;
        font-size: 11px;
        min-width: 0;
      }

      .mp-card-location svg {
        flex-shrink: 0;
        color: #9ba6b7;
      }

      .mp-card-location span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .mp-card-features {
        display: flex;
        flex-wrap: wrap;
        gap: 9px;
        padding: 12px 0;
        border-top: 1px solid #eff2f6;
        border-bottom: 1px solid #eff2f6;
      }

      .mp-card-features > span {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 7px 9px;
        border-radius: 7px;
        background: #f7f8fc;
        color: #58667d;
        font-size: 10px;
        font-weight: 650;
      }

      .mp-card-features svg { color: var(--mp-primary); }

      .mp-card-status-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-top: 15px;
        margin-bottom: 15px;
      }

      .mp-card-status-row > label {
        color: #8b96a7;
        font-size: 10px;
        font-weight: 650;
      }

      .mp-status-select {
        display: flex;
        align-items: center;
        gap: 5px;
        min-width: 0;
        color: #64748b;
      }

      .mp-status-select select {
        max-width: 150px;
        padding: 6px 0;
        border: 0;
        outline: 0;
        appearance: none;
        background: transparent;
        color: #475569;
        font-size: 10px;
        font-weight: 750;
        cursor: pointer;
      }

      .mp-status-select select:disabled { cursor: wait; opacity: .65; }

      .mp-status-select svg { flex-shrink: 0; }

      .mp-card-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 13px 0;
        margin-top: auto;
        border-top: 1px solid #eff2f6;
      }

      .mp-card-action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        min-height: 36px;
        padding: 8px 11px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 750;
        cursor: pointer;
        transition: background .16s ease;
      }

      .mp-card-action-primary {
        flex: 1;
        border: 1px solid #e0e7ff;
        background: #f5f6ff;
        color: var(--mp-primary);
      }

      .mp-card-action-primary:hover { background: #e9edff; }

      .mp-card-icon-action {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        flex-shrink: 0;
        border: 1px solid #e6eaf1;
        border-radius: 8px;
        background: #fff;
        color: #64748b;
        cursor: pointer;
        transition: background .16s ease, color .16s ease;
      }

      .mp-card-icon-action:hover {
        background: #f5f6ff;
        color: var(--mp-primary);
      }

      .mp-card-icon-action.mp-delete-icon:hover {
        color: #dc2626;
        background: #fff1f2;
        border-color: #fecaca;
      }

      .mp-card-icon-action:disabled { opacity: .5; cursor: wait; }

      .mp-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 310px;
        padding: 40px 20px;
        text-align: center;
        border: 1px dashed #d8dfeb;
        border-radius: 17px;
        background: #fff;
      }

      .mp-empty-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 68px;
        height: 68px;
        margin-bottom: 18px;
        border-radius: 20px;
        color: var(--mp-primary);
        background: #eef2ff;
      }

      .mp-empty h3 {
        margin: 0 0 8px;
        color: #202b40;
        font-size: 17px;
        font-weight: 800;
      }

      .mp-empty p {
        max-width: 400px;
        margin: 0 0 19px;
        color: #8591a4;
        font-size: 12px;
        line-height: 1.8;
      }

      /* Table */

      .mp-table-card {
        overflow: hidden;
        border: 1px solid var(--mp-border);
        border-radius: 15px;
        background: #fff;
      }

      .mp-table-scroll { overflow-x: auto; }

      .mp-table {
        width: 100%;
        min-width: 970px;
        border-collapse: separate;
        border-spacing: 0;
        margin: 0;
      }

      .mp-table thead th {
        padding: 15px 13px;
        border-bottom: 1px solid #e9edf4;
        background: #f8faff;
        color: #8591a4;
        text-align: left;
        text-transform: uppercase;
        letter-spacing: .55px;
        font-size: 9px;
        font-weight: 800;
        white-space: nowrap;
      }

      .mp-table thead th:first-child,
      .mp-table tbody td:first-child { padding-left: 20px; }

      .mp-table tbody td {
        padding: 15px 13px;
        border-bottom: 1px solid #f0f2f7;
        color: #536176;
        font-size: 11px;
        vertical-align: middle;
      }

      .mp-table tbody tr:last-child td { border-bottom: 0; }
      .mp-table tbody tr:hover td { background: #fbfcff; }

      .mp-table-property {
        display: flex;
        align-items: center;
        gap: 11px;
        min-width: 210px;
      }

      .mp-table-property img {
        display: block;
        width: 57px;
        height: 47px;
        flex-shrink: 0;
        object-fit: cover;
        border: 1px solid #e6eaf1;
        border-radius: 8px;
        background: #f1f5f9;
      }

      .mp-table-property > div {
        display: flex;
        flex-direction: column;
        gap: 5px;
        min-width: 0;
      }

      .mp-table-property strong {
        max-width: 210px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #253149;
        font-size: 11px;
        font-weight: 750;
      }

      .mp-table-property span {
        color: #98a3b3;
        font-size: 10px;
      }

      .mp-table-location {
        display: flex;
        align-items: center;
        gap: 6px;
        max-width: 180px;
      }

      .mp-table-location svg { flex-shrink: 0; color: #98a3b3; }

      .mp-table-location span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .mp-table-features {
        display: flex;
        gap: 8px;
        white-space: nowrap;
      }

      .mp-table-price {
        color: #059669;
        font-size: 12px;
        font-weight: 800;
        white-space: nowrap;
      }

      .mp-table-price span {
        margin-left: 3px;
        color: #98a3b3;
        font-size: 10px;
        font-weight: 500;
      }

      .mp-table-date {
        color: #758198;
        white-space: nowrap;
      }

      .mp-table-actions-heading { text-align: center !important; }

      .mp-table-actions {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }

      .mp-table-actions button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: 1px solid #e6eaf1;
        border-radius: 8px;
        background: #fff;
        color: #64748b;
        cursor: pointer;
      }

      .mp-table-actions button:hover {
        color: var(--mp-primary);
        background: #f5f6ff;
      }

      .mp-table-actions button.mp-table-delete:hover {
        color: #dc2626;
        background: #fff1f2;
        border-color: #fecaca;
      }

      .mp-table-actions button:disabled { opacity: .5; cursor: wait; }

      /* Modal */

      .mp-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 22px;
        overflow-y: auto;
        background: rgba(15,23,42,.62);
        backdrop-filter: blur(5px);
        animation: mp-fade-in .18s ease;
      }

      .mp-modal {
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: 820px;
        max-height: calc(100dvh - 44px);
        min-height: 0;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.5);
        border-radius: 19px;
        background: #fff;
        box-shadow: 0 30px 100px rgba(15,23,42,.25);
        animation: mp-modal-in .22s ease;
      }

      .mp-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 17px 21px;
        border-bottom: 1px solid #edf0f5;
        flex-shrink: 0;
      }

      .mp-modal-heading {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }

      .mp-modal-heading-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 41px;
        height: 41px;
        flex-shrink: 0;
        border-radius: 12px;
        color: var(--mp-primary);
        background: #eef2ff;
      }

      .mp-modal-heading h2 {
        margin: 0;
        color: #202b40;
        font-size: 15px;
        font-weight: 800;
      }

      .mp-modal-heading p {
        margin: 4px 0 0;
        color: #8a96a8;
        font-size: 10px;
      }

      .mp-icon-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 35px;
        height: 35px;
        flex-shrink: 0;
        border: 1px solid #e7ebf2;
        border-radius: 9px;
        background: #fff;
        color: #718096;
        cursor: pointer;
      }

      .mp-icon-btn:hover { background: #f4f6fa; color: #1e293b; }
      .mp-icon-btn:disabled { opacity: .5; cursor: not-allowed; }

      .mp-modal-body {
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
      }

      .mp-detail-image {
        position: relative;
        height: 245px;
        overflow: hidden;
        background: #edf1f7;
      }

      .mp-detail-image > img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .mp-detail-image-shade {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(180deg, rgba(15,23,42,.12), transparent 35%, rgba(15,23,42,.1));
      }

      .mp-detail-image-status {
        position: absolute;
        top: 15px;
        right: 16px;
      }

      .mp-image-upload-btn {
        position: absolute;
        bottom: 15px;
        left: 16px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 13px;
        border: 1px solid rgba(255,255,255,.8);
        border-radius: 9px;
        background: rgba(255,255,255,.95);
        color: #374151;
        font-size: 11px;
        font-weight: 750;
        cursor: pointer;
      }

      .mp-image-upload-btn:hover { background: #fff; color: var(--mp-primary); }

      .mp-edit-form, .mp-property-details { padding: 24px; }

      .mp-form-section {
        padding-bottom: 24px;
        margin-bottom: 23px;
        border-bottom: 1px solid #edf0f5;
      }

      .mp-form-section:last-of-type {
        padding-bottom: 0;
        margin-bottom: 0;
        border-bottom: 0;
      }

      .mp-form-section-heading {
        display: flex;
        align-items: flex-start;
        gap: 11px;
        margin-bottom: 19px;
      }

      .mp-form-section-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 37px;
        height: 37px;
        flex-shrink: 0;
        border-radius: 10px;
        color: var(--mp-primary);
        background: #eef2ff;
      }

      .mp-form-section-heading h3 {
        margin: 1px 0 4px;
        color: #253149;
        font-size: 13px;
        font-weight: 800;
      }

      .mp-form-section-heading p {
        margin: 0;
        color: #8b96a8;
        font-size: 10px;
        line-height: 1.7;
      }

      .mp-form-section-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .mp-form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }

      .mp-form-field {
        display: flex;
        flex-direction: column;
        gap: 7px;
        min-width: 0;
      }

      .mp-form-field > label {
        color: #4b586e;
        font-size: 11px;
        font-weight: 750;
      }

      .mp-form-field .form-control,
      .mp-form-field .form-select {
        min-height: 43px;
        padding: 10px 12px;
        border-color: #e1e6ef;
        border-radius: 9px;
        background-color: #fff;
        color: #293449;
        font-family: inherit;
        font-size: 12px;
        box-shadow: none;
      }

      .mp-form-field textarea.form-control {
        min-height: 95px;
        resize: vertical;
        line-height: 1.7;
      }

      .mp-form-field .form-control:focus,
      .mp-form-field .form-select:focus {
        border-color: #a5b4fc;
        box-shadow: 0 0 0 3px rgba(79,70,229,.08);
      }

      .mp-form-field .form-control::placeholder {
        color: #a0aabb;
      }

      .mp-input-icon {
        position: relative;
        display: flex;
        align-items: center;
      }

      .mp-input-icon > svg,
      .mp-currency-symbol {
        position: absolute;
        left: 12px;
        z-index: 1;
        color: #8b96a8;
        pointer-events: none;
      }

      .mp-input-icon .form-control {
        padding-left: 37px;
      }

      .mp-currency-symbol {
        font-size: 13px;
        font-weight: 800;
      }

      .mp-select-wrap {
        position: relative;
      }

      .mp-select-wrap select {
        appearance: none;
        padding-right: 33px !important;
      }

      .mp-select-wrap > svg {
        position: absolute;
        top: 50%;
        right: 12px;
        transform: translateY(-50%);
        color: #8b96a8;
        pointer-events: none;
      }

      .mp-upload-panel {
        padding: 13px;
        border: 1px dashed #dce3ef;
        border-radius: 12px;
        background: #fbfcff;
      }

      .mp-upload-preview {
        position: relative;
        height: 190px;
        overflow: hidden;
        border-radius: 9px;
        background: #edf1f7;
      }

      .mp-upload-preview img {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
      }

      .mp-upload-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        color: #fff;
        background: rgba(15,23,42,.68);
        font-size: 12px;
        font-weight: 750;
      }

      .mp-upload-controls {
        display: flex;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 12px;
      }

      .mp-upload-controls > .mp-form-field {
        flex: 1;
        min-width: 180px;
      }

      .mp-helper-text {
        margin: 8px 0 0;
        color: #98a3b3;
        font-size: 10px;
        line-height: 1.7;
      }

      .mp-amenities {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .mp-amenity {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 34px;
        padding: 8px 11px;
        border: 1px solid #e3e8f0;
        border-radius: 8px;
        background: #fff;
        color: #69768a;
        font-size: 10px;
        font-weight: 650;
        line-height: 1.2;
      }

      button.mp-amenity { cursor: pointer; }

      .mp-amenity.active {
        color: var(--mp-primary);
        background: #eef2ff;
        border-color: #c7d2fe;
      }

      .mp-amenity.active svg { flex-shrink: 0; }

      .mp-form-footer {
        position: sticky;
        bottom: -24px;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 16px 0 0;
        margin-top: 23px;
        background: #fff;
      }

      /* Detail view */

      .mp-detail-title-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 20px;
        margin-bottom: 23px;
      }

      .mp-category-label {
        display: inline-flex;
        align-items: center;
        margin-bottom: 9px;
        padding: 5px 8px;
        border-radius: 6px;
        background: #eef2ff;
        color: var(--mp-primary);
        font-size: 9px;
        font-weight: 800;
        letter-spacing: .3px;
        text-transform: uppercase;
      }

      .mp-detail-title-row h3 {
        margin: 0;
        color: #202b40;
        font-size: clamp(20px, 3vw, 25px);
        line-height: 1.4;
        font-weight: 800;
        letter-spacing: -.7px;
        overflow-wrap: anywhere;
      }

      .mp-detail-location {
        display: flex;
        align-items: flex-start;
        gap: 7px;
        margin: 8px 0 0;
        color: #8290a4;
        font-size: 11px;
        line-height: 1.7;
      }

      .mp-detail-location svg {
        flex-shrink: 0;
        margin-top: 1px;
      }

      .mp-detail-price {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 13px 16px;
        border: 1px solid #d1fae5;
        border-radius: 12px;
        background: #f0fdf7;
        flex-shrink: 0;
      }

      .mp-detail-price > span {
        color: #6b9083;
        font-size: 10px;
        font-weight: 650;
      }

      .mp-detail-price strong {
        color: #047857;
        font-size: 24px;
        line-height: 1.2;
        font-weight: 850;
        letter-spacing: -.5px;
      }

      .mp-detail-price small {
        color: #7ba093;
        font-size: 10px;
      }

      .mp-detail-metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 25px;
      }

      .mp-detail-metric {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        padding: 14px 12px;
        border: 1px solid #e8edf4;
        border-radius: 11px;
        background: #fafbfe;
      }

      .mp-detail-metric-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 37px;
        height: 37px;
        flex-shrink: 0;
        border-radius: 10px;
        background: #eef2ff;
        color: var(--mp-primary);
      }

      .mp-detail-metric > div:last-child {
        display: flex;
        flex-direction: column;
        gap: 5px;
        min-width: 0;
      }

      .mp-detail-metric span {
        color: #8b96a8;
        font-size: 10px;
      }

      .mp-detail-metric strong {
        color: #344157;
        font-size: 12px;
        font-weight: 800;
        overflow-wrap: anywhere;
      }

      .mp-detail-section {
        margin-top: 22px;
      }

      .mp-detail-section h4 {
        margin: 0 0 12px;
        color: #253149;
        font-size: 13px;
        font-weight: 800;
      }

      .mp-description {
        margin: 0;
        color: #6c7a90;
        font-size: 12px;
        line-height: 1.9;
        overflow-wrap: anywhere;
        white-space: pre-wrap;
      }

      .mp-view-amenities { gap: 8px; }

      .mp-view-amenities .mp-amenity {
        cursor: default;
      }

      .mp-detail-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px;
        padding-top: 20px;
        margin-top: 25px;
        border-top: 1px solid #edf0f5;
      }

      /* Loading */

      .mp-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 65vh;
        padding: 24px;
        background: #f6f8fc;
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .mp-loading-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 35px;
        text-align: center;
        border: 1px solid #e7ebf2;
        border-radius: 16px;
        background: #fff;
      }

      .mp-loader {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 56px;
        height: 56px;
        margin-bottom: 16px;
        border-radius: 15px;
        background: #eef2ff;
        color: var(--mp-primary);
      }

      .mp-loading-card h6 {
        margin: 0 0 7px;
        color: #253149;
        font-size: 13px;
        font-weight: 800;
      }

      .mp-loading-card p {
        margin: 0;
        color: #8995a8;
        font-size: 11px;
      }

      .mp-spin { animation: mp-spin 1s linear infinite; }

      @keyframes mp-spin {
        to { transform: rotate(360deg); }
      }

      @keyframes mp-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes mp-modal-in {
        from { opacity: 0; transform: translateY(9px) scale(.99); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      /* Responsive layouts */

      @media (max-width: 1200px) {
        .mp-property-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .mp-stats-grid { gap: 12px; }
        .mp-stat-card { padding: 16px 13px; gap: 10px; }
        .mp-stat-icon { width: 39px; height: 39px; }
        .mp-stat-info > strong { font-size: 26px; }
      }

      @media (max-width: 900px) {
        .mp-page { padding: 24px 18px 36px; }
        .mp-stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .mp-filter-label { display: none; }
        .mp-toolbar { padding: 18px; }
        .mp-filter-row { align-items: flex-start; }
        .mp-filter-tabs { width: 100%; }
        .mp-plan-progress { min-width: 100px; }
      }

      @media (max-width: 600px) {
        .mp-page { padding: 20px 12px 30px; }

        .mp-header { align-items: flex-start; gap: 15px; }
        .mp-heading h1 { font-size: 25px; }
        .mp-heading p { max-width: 290px; font-size: 12px; }
        .mp-header > .mp-primary-btn { width: 100%; }

        .mp-plan-strip { gap: 10px; padding: 13px; }
        .mp-plan-content { flex: 1; min-width: 0; }
        .mp-plan-progress { flex-basis: 100%; order: 3; }
        .mp-text-btn { margin-left: auto; }

        .mp-stats-grid { gap: 10px; }
        .mp-stat-card { min-height: 119px; padding: 14px 11px; gap: 9px; }
        .mp-stat-icon { width: 35px; height: 35px; border-radius: 10px; }
        .mp-stat-icon svg { width: 18px; height: 18px; }
        .mp-stat-label { font-size: 10px; }
        .mp-stat-info > strong { font-size: 24px; }
        .mp-stat-note { font-size: 9px; }

        .mp-toolbar { padding: 15px 12px; }
        .mp-toolbar-top { align-items: flex-start; margin-bottom: 14px; }
        .mp-toolbar-top h2 { font-size: 15px; }
        .mp-view-toggle button { padding: 7px; }
        .mp-view-toggle button span { display: none; }
        .mp-search { flex-basis: 100%; }
        .mp-filter-tabs { gap: 4px; }
        .mp-filter-tabs button { padding: 7px 9px; font-size: 10px; }

        .mp-property-grid { grid-template-columns: minmax(0, 1fr); gap: 16px; }
        .mp-card-image { height: 220px; }
        .mp-card-image-view { opacity: 1; transform: none; }

        .mp-modal-backdrop { padding: 0; align-items: flex-end; }
        .mp-modal {
          width: 100%;
          max-width: none;
          max-height: 94dvh;
          border-radius: 20px 20px 0 0;
        }

        .mp-modal-header { padding: 14px 15px; }
        .mp-detail-image { height: 195px; }
        .mp-edit-form, .mp-property-details { padding: 18px 15px; }
        .mp-form-grid { grid-template-columns: minmax(0, 1fr); gap: 14px; }
        .mp-form-section { padding-bottom: 20px; margin-bottom: 20px; }
        .mp-upload-preview { height: 165px; }
        .mp-form-footer { bottom: -18px; }
        .mp-form-footer > button { flex: 1; }

        .mp-detail-title-row { flex-direction: column; }
        .mp-detail-price { width: 100%; }
        .mp-detail-metrics { grid-template-columns: minmax(0, 1fr); gap: 8px; }
        .mp-detail-metric { padding: 11px; }
        .mp-detail-footer > button { flex: 1; }
      }

      @media (prefers-reduced-motion: reduce) {
        .mp-page *, .mp-modal-backdrop *, .mp-loading * {
          animation-duration: .01ms !important;
          transition-duration: .01ms !important;
        }
      }
    `}</style>
  );
}
