import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth, db } from "../../services/firebase";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { uploadToCloudinary } from "../../services/cloudinaryService";
import { createProperty } from "../../services/propertyService";

import {
  UploadCloud,
  Home,
  MapPin,
  Wifi,
  Car,
  Wind,
  Waves,
  UtensilsCrossed,
  WashingMachine,
  Dumbbell,
  ShieldCheck,
  Building2,
  ArrowLeft,
  Loader2,
  DollarSign,
  BedDouble,
  Save,
  Send,
  X,
  Check,
  Image as ImageIcon,
  RefreshCw,
  Sparkles,
} from "lucide-react";

/*
|--------------------------------------------------------------------------
| Amenities
|--------------------------------------------------------------------------
| Keep these names exactly the same as the values saved in Firestore.
*/
const AMENITIES_LIST = [
  {
    name: "WiFi",
    icon: Wifi,
  },
  {
    name: "Parking",
    icon: Car,
  },
  {
    name: "AC",
    icon: Wind,
  },
  {
    name: "Pool",
    icon: Waves,
  },
  {
    name: "Kitchen",
    icon: UtensilsCrossed,
  },
  {
    name: "Laundry",
    icon: WashingMachine,
  },
  {
    name: "Gym",
    icon: Dumbbell,
  },
  {
    name: "Security",
    icon: ShieldCheck,
  },
  {
    name: "Balcony",
    icon: Building2,
  },
];

export default function AddEditProperty() {
  const navigate = useNavigate();
  const { id } = useParams();

  const isEditMode = Boolean(id);

  // -------------------------------------------------------------------------
  // Form State
  // -------------------------------------------------------------------------

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const [bedrooms, setBedrooms] = useState(1);
  const [bathrooms, setBathrooms] = useState(1.0);

  const [status, setStatus] = useState("published");

  const [selectedAmenities, setSelectedAmenities] = useState([]);

  // -------------------------------------------------------------------------
  // Image State
  // -------------------------------------------------------------------------

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState("");

  // -------------------------------------------------------------------------
  // UI State
  // -------------------------------------------------------------------------

  const [categories, setCategories] = useState([]);
  const [isLoadingDoc, setIsLoadingDoc] = useState(isEditMode);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  // -------------------------------------------------------------------------
  // Fetch Categories
  // -------------------------------------------------------------------------

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "categories"),
      (snapshot) => {
        const cats = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setCategories(cats);
      },
      (err) => {
        console.error("Category listener error:", err);
        setError("Failed to load property categories.");
      },
    );

    return () => unsub();
  }, []);

  // -------------------------------------------------------------------------
  // Fetch Property if Edit Mode
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!isEditMode) return;

    const fetchProperty = async () => {
      try {
        const docRef = doc(db, "properties", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          setTitle(data.title || "");
          setCategory(data.category || "");
          setPrice(data.price ? data.price.toString() : "");
          setLocation(data.location || "");
          setDescription(data.description || "");

          setBedrooms(data.bedrooms || 1);
          setBathrooms(data.bathrooms || 1.0);

          setStatus(data.status || "published");

          /*
           * Keep existing Firestore amenities.
           *
           * Only allow amenities that are currently supported
           * by AMENITIES_LIST.
           */
          const savedAmenities = Array.isArray(data.amenities)
            ? data.amenities.filter((amenity) =>
                AMENITIES_LIST.some((item) => item.name === amenity),
              )
            : [];

          setSelectedAmenities(savedAmenities);

          setExistingImageUrl(data.imageUrl || "");
          setImagePreview(data.imageUrl || null);
        } else {
          setError("Property not found.");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load property details.");
      } finally {
        setIsLoadingDoc(false);
      }
    };

    fetchProperty();
  }, [id, isEditMode]);

  // -------------------------------------------------------------------------
  // Image Change
  // -------------------------------------------------------------------------

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPG, PNG, WEBP...).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB.");
      return;
    }

    setError("");

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // -------------------------------------------------------------------------
  // Remove Image
  // -------------------------------------------------------------------------

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl("");
  };

  // -------------------------------------------------------------------------
  // Toggle Amenity
  // -------------------------------------------------------------------------

  const toggleAmenity = (name) => {
    setSelectedAmenities((prev) =>
      prev.includes(name)
        ? prev.filter((amenity) => amenity !== name)
        : [...prev, name],
    );
  };

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------

  const handleSubmit = async (e, forceStatus = null) => {
    e?.preventDefault();

    setError("");

    if (!imageFile && !existingImageUrl) {
      setError("Please select a property image.");
      return;
    }

    if (!title.trim() || !category || !price || !location.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    const currentUser = auth.currentUser;

    if (!currentUser) {
      setError("You must be logged in as an owner.");
      return;
    }

    try {
      setIsUploading(true);

      let finalImageUrl = existingImageUrl;

      // ---------------------------------------------------------------------
      // Only upload if user selected a new file
      // ---------------------------------------------------------------------

      if (imageFile) {
        const uploadedUrl = await uploadToCloudinary(imageFile, "image");

        if (!uploadedUrl) {
          throw new Error("Image upload failed. Please try again.");
        }

        finalImageUrl = uploadedUrl;
      }

      // ---------------------------------------------------------------------
      // Property Data
      // ---------------------------------------------------------------------

      const propertyData = {
        ownerId: currentUser.uid,

        title: title.trim(),

        category,

        price: parseFloat(price) || 0,

        location: location.trim(),

        description: description.trim(),

        bedrooms: Number(bedrooms),

        bathrooms: Number(bathrooms),

        imageUrl: finalImageUrl,

        /*
         * Only the selected 9 amenities are stored.
         */
        amenities: selectedAmenities,

        status: (forceStatus || status).toLowerCase(),
      };

      // ---------------------------------------------------------------------
      // Update Existing Property
      // ---------------------------------------------------------------------

      if (isEditMode) {
        await updateDoc(doc(db, "properties", id), {
          ...propertyData,
          updatedAt: serverTimestamp(),
        });
      }

      // ---------------------------------------------------------------------
      // Create New Property
      // ---------------------------------------------------------------------
      else {
        await createProperty(propertyData);
      }

      navigate("/owner/properties");
    } catch (err) {
      console.error(err);

      setError(err.message || "Failed to save property.");
    } finally {
      setIsUploading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Loading
  // -------------------------------------------------------------------------

  if (isLoadingDoc) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "60vh" }}
      >
        <Loader2 className="animate-spin text-primary" size={36} />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // UI
  // -------------------------------------------------------------------------

  return (
    <div
      style={{
        background: "#f4f6fb",
        minHeight: "100vh",
      }}
    >
      <div className="container-fluid py-4 px-3 px-lg-4">
        {/* =================================================================
            HEADER
        ================================================================== */}

        <div className="d-flex align-items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="btn btn-white border rounded-circle p-2 d-flex align-items-center justify-content-center bg-white shadow-sm"
            style={{
              width: 40,
              height: 40,
            }}
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <nav className="small text-muted mb-1">
              Properties
              <span className="mx-1">/</span>
              <span className="text-dark fw-medium">
                {isEditMode ? "Edit Property" : "Add Property"}
              </span>
            </nav>

            <h4 className="fw-bold mb-0 text-dark">
              {isEditMode ? "Edit Property Listing" : "Add New Property"}
            </h4>
          </div>
        </div>

        {/* =================================================================
            ERROR
        ================================================================== */}

        {error && (
          <div className="alert alert-danger rounded-3 mb-4 py-2 small d-flex align-items-center justify-content-between">
            <span>{error}</span>

            <button
              className="btn-close btn-close-sm"
              onClick={() => setError("")}
            />
          </div>
        )}

        <div className="row g-4">
          {/* ===============================================================
              LEFT COLUMN
          ================================================================ */}

          <div className="col-lg-8">
            {/* =============================================================
                BASIC INFORMATION
            ============================================================== */}

            <div className="card border-0 shadow-sm rounded-4 mb-3">
              <div className="card-body p-4">
                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                  <Home size={18} className="text-primary" />
                  Basic Information
                </h6>

                {/* Property Title */}

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-secondary">
                    Property Title <span className="text-danger">*</span>
                  </label>

                  <input
                    type="text"
                    className="form-control form-control-lg"
                    placeholder="e.g. Modern Apartment in Sensok"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Category */}

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-secondary">
                    Category <span className="text-danger">*</span>
                  </label>

                  <select
                    className="form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    <option value="">Select Category</option>

                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}

                <div>
                  <label className="form-label small fw-semibold text-secondary">
                    Description
                  </label>

                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Write a clear overview of your property..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* =============================================================
                PRICING & LOCATION
            ============================================================== */}

            <div className="card border-0 shadow-sm rounded-4 mb-3">
              <div className="card-body p-4">
                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                  <DollarSign size={18} className="text-success" />
                  Pricing & Location
                </h6>

                <div className="row g-3">
                  {/* Price */}

                  <div className="col-md-5">
                    <label className="form-label small fw-semibold text-secondary">
                      Monthly Price (USD) <span className="text-danger">*</span>
                    </label>

                    <div className="input-group">
                      <span className="input-group-text bg-light">$</span>

                      <input
                        type="number"
                        className="form-control"
                        placeholder="250"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Location */}

                  <div className="col-md-7">
                    <label className="form-label small fw-semibold text-secondary">
                      Location <span className="text-danger">*</span>
                    </label>

                    <div className="input-group">
                      <span className="input-group-text bg-light">
                        <MapPin size={16} />
                      </span>

                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Sensok, Phnom Penh"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* =============================================================
                PROPERTY DETAILS
            ============================================================== */}

            <div className="card border-0 shadow-sm rounded-4 mb-3">
              <div className="card-body p-4">
                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                  <BedDouble size={18} style={{ color: "#7c3aed" }} />
                  Property Details
                </h6>

                <div className="row g-3">
                  {/* Bedrooms */}

                  <div className="col-6">
                    <label className="form-label small fw-semibold text-secondary">
                      Bedrooms
                    </label>

                    <div className="d-flex align-items-center gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm rounded-circle"
                        style={{
                          width: 34,
                          height: 34,
                        }}
                        onClick={() => setBedrooms(Math.max(1, bedrooms - 1))}
                      >
                        −
                      </button>

                      <span
                        className="fw-bold fs-5"
                        style={{
                          minWidth: 28,
                          textAlign: "center",
                        }}
                      >
                        {bedrooms}
                      </span>

                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm rounded-circle"
                        style={{
                          width: 34,
                          height: 34,
                        }}
                        onClick={() => setBedrooms(bedrooms + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Bathrooms */}

                  <div className="col-6">
                    <label className="form-label small fw-semibold text-secondary">
                      Bathrooms
                    </label>

                    <div className="d-flex align-items-center gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm rounded-circle"
                        style={{
                          width: 34,
                          height: 34,
                        }}
                        onClick={() =>
                          setBathrooms(Math.max(1, bathrooms - 0.5))
                        }
                      >
                        −
                      </button>

                      <span
                        className="fw-bold fs-5"
                        style={{
                          minWidth: 28,
                          textAlign: "center",
                        }}
                      >
                        {bathrooms}
                      </span>

                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm rounded-circle"
                        style={{
                          width: 34,
                          height: 34,
                        }}
                        onClick={() => setBathrooms(bathrooms + 0.5)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* =============================================================
                AMENITIES
            ============================================================== */}

            <div className="card border-0 shadow-sm rounded-4 mb-3">
              <div className="card-body p-4">
                {/* Amenities Header */}

                <div className="d-flex align-items-start justify-content-between mb-4">
                  <div>
                    <h6 className="fw-bold mb-1 d-flex align-items-center gap-2">
                      <Sparkles size={18} style={{ color: "#7c3aed" }} />
                      Amenities
                    </h6>

                    <p className="small text-muted mb-0">
                      Select the facilities available at this property.
                    </p>
                  </div>

                  {/* Selected Count */}

                  <span
                    className="badge rounded-pill px-3 py-2"
                    style={{
                      background:
                        selectedAmenities.length > 0 ? "#ede9fe" : "#f1f5f9",
                      color:
                        selectedAmenities.length > 0 ? "#6d28d9" : "#64748b",
                      fontWeight: 600,
                    }}
                  >
                    {selectedAmenities.length} selected
                  </span>
                </div>

                {/* Amenities Grid */}

                <div className="row g-2">
                  {AMENITIES_LIST.map(({ name, icon: Icon }) => {
                    const active = selectedAmenities.includes(name);

                    return (
                      <div key={name} className="col-6 col-md-4">
                        <button
                          type="button"
                          onClick={() => toggleAmenity(name)}
                          className="w-100 text-start border-0"
                          style={{
                            position: "relative",
                            minHeight: 76,
                            padding: "14px 14px",
                            borderRadius: 14,
                            background: active ? "#f3efff" : "#f8fafc",
                            border: active
                              ? "1px solid #7c3aed"
                              : "1px solid #e2e8f0",
                            color: active ? "#6d28d9" : "#475569",
                            transition: "all 0.2s ease",
                            cursor: "pointer",
                          }}
                        >
                          <div className="d-flex align-items-center gap-3">
                            {/* Icon */}

                            <div
                              className="d-flex align-items-center justify-content-center flex-shrink-0"
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 11,
                                background: active ? "#7c3aed" : "#ffffff",
                                color: active ? "#ffffff" : "#64748b",
                                border: active ? "none" : "1px solid #e2e8f0",
                              }}
                            >
                              <Icon size={19} />
                            </div>

                            {/* Name */}

                            <div className="flex-grow-1">
                              <div
                                className="fw-semibold"
                                style={{
                                  fontSize: 14,
                                  color: active ? "#5b21b6" : "#334155",
                                }}
                              >
                                {name}
                              </div>

                              <div
                                className="small"
                                style={{
                                  fontSize: 11,
                                  color: "#94a3b8",
                                }}
                              >
                                {active ? "Selected" : "Available"}
                              </div>
                            </div>

                            {/* Check */}

                            {active && (
                              <div
                                className="d-flex align-items-center justify-content-center"
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: "50%",
                                  background: "#7c3aed",
                                  color: "#ffffff",
                                }}
                              >
                                <Check size={13} />
                              </div>
                            )}
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Amenities */}

                {selectedAmenities.length > 0 && (
                  <div
                    className="mt-4 pt-3"
                    style={{
                      borderTop: "1px solid #eef2f7",
                    }}
                  >
                    <div className="small fw-semibold text-secondary mb-2">
                      Selected amenities
                    </div>

                    <div className="d-flex flex-wrap gap-2">
                      {selectedAmenities.map((amenity) => (
                        <span
                          key={amenity}
                          className="d-inline-flex align-items-center gap-1 px-2 py-1 rounded-pill"
                          style={{
                            background: "#f3efff",
                            color: "#6d28d9",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          <Check size={12} />
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ===============================================================
              RIGHT COLUMN
          ================================================================ */}

          <div className="col-lg-4">
            {/* =============================================================
                PROPERTY PHOTOS
            ============================================================== */}

            <div className="card border-0 shadow-sm rounded-4 mb-3">
              <div className="card-body p-4">
                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                  <ImageIcon size={18} className="text-danger" />
                  Property Photos
                </h6>

                {/* Preview */}

                {imagePreview ? (
                  <div className="position-relative mb-3 rounded-3 overflow-hidden border">
                    <img
                      src={imagePreview}
                      alt="Property Preview"
                      className="w-100"
                      style={{
                        height: 200,
                        objectFit: "cover",
                      }}
                    />

                    {/* Overlay Actions */}

                    <div className="position-absolute top-0 end-0 m-2 d-flex gap-1">
                      <label
                        className="btn btn-sm btn-light rounded-pill d-flex align-items-center gap-1 shadow-sm"
                        style={{
                          cursor: "pointer",
                        }}
                        title="Change image"
                      >
                        <RefreshCw size={14} />
                        Change
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          style={{
                            display: "none",
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        className="btn btn-sm btn-dark rounded-pill d-flex align-items-center gap-1 shadow-sm"
                        onClick={removeImage}
                        title="Remove image"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Image Source */}

                    <div className="position-absolute bottom-0 start-0 m-2">
                      <span className="badge bg-dark bg-opacity-75 rounded-pill px-2 py-1 small">
                        {imageFile ? "New image selected" : "Current image"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <label
                    className="d-flex flex-column align-items-center justify-content-center py-5 mb-3 rounded-3"
                    style={{
                      background: "#f8fafc",
                      border: "2px dashed #cbd5e1",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#3b82f6";

                      e.currentTarget.style.background = "#eff6ff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#cbd5e1";

                      e.currentTarget.style.background = "#f8fafc";
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{
                        display: "none",
                      }}
                    />

                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center mb-3"
                      style={{
                        width: 56,
                        height: 56,
                        background: "#e0e7ff",
                      }}
                    >
                      <UploadCloud size={26} className="text-primary" />
                    </div>

                    <p className="fw-semibold text-dark mb-1">
                      Click to upload photo
                    </p>

                    <p className="small text-muted mb-0">
                      JPG, PNG or WEBP (max 5MB)
                    </p>
                  </label>
                )}

                <p className="small text-muted mb-0">
                  {isEditMode
                    ? "You can keep the current image or upload a new one."
                    : "A high-quality photo helps attract more tenants."}
                </p>
              </div>
            </div>

            {/* =============================================================
                LISTING SETTINGS
            ============================================================== */}

            <div className="card border-0 shadow-sm rounded-4 mb-3">
              <div className="card-body p-4">
                <h6 className="fw-bold mb-3">Listing Settings</h6>

                <label className="form-label small fw-semibold text-secondary">
                  Status
                </label>

                <select
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="published">Published</option>

                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>

            {/* =============================================================
                SUMMARY
            ============================================================== */}

            <div
              className="card border-0 shadow-sm rounded-4 sticky-top"
              style={{
                top: 24,
              }}
            >
              <div className="card-body p-4">
                <h6 className="fw-bold mb-3">Summary</h6>

                <div className="small text-muted mb-3">
                  {/* Title */}

                  <div className="d-flex justify-content-between mb-2">
                    <span>Title</span>

                    <span
                      className="text-dark fw-medium text-truncate"
                      style={{
                        maxWidth: 140,
                      }}
                    >
                      {title || "—"}
                    </span>
                  </div>

                  {/* Category */}

                  <div className="d-flex justify-content-between mb-2">
                    <span>Category</span>

                    <span className="text-dark">{category || "—"}</span>
                  </div>

                  {/* Price */}

                  <div className="d-flex justify-content-between mb-2">
                    <span>Price</span>

                    <span className="text-dark fw-medium">
                      {price ? `$${Number(price).toLocaleString()}/mo` : "—"}
                    </span>
                  </div>

                  {/* Beds / Baths */}

                  <div className="d-flex justify-content-between mb-2">
                    <span>Beds / Baths</span>

                    <span className="text-dark">
                      {bedrooms} / {bathrooms}
                    </span>
                  </div>

                  {/* Amenities */}

                  <div className="d-flex justify-content-between">
                    <span>Amenities</span>

                    <span className="text-dark fw-semibold">
                      {selectedAmenities.length} / {AMENITIES_LIST.length}
                    </span>
                  </div>
                </div>

                {/* =========================================================
                    ACTIONS
                ========================================================== */}

                <div className="d-grid gap-2">
                  {/* Publish */}

                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={(e) => handleSubmit(e, "published")}
                    className="btn btn-primary py-2 fw-semibold d-flex align-items-center justify-content-center gap-2"
                  >
                    {isUploading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}

                    {isEditMode ? "Update & Publish" : "Publish Property"}
                  </button>

                  {/* Draft */}

                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={(e) => handleSubmit(e, "draft")}
                    className="btn btn-outline-secondary py-2 fw-semibold d-flex align-items-center justify-content-center gap-2"
                  >
                    <Save size={16} />
                    Save as Draft
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
