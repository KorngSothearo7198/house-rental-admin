import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";

import { db, auth } from "../../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  ArrowLeft,
  MapPin,
  Bed,
  Bath,
  Wifi,
  SquareSquare,
  Wind,
  Waves,
  UtensilsCrossed,
  Calendar,
  User,
  Tag,
  Loader2,
  CheckCircle2,
} from "lucide-react";

// Icon mapping helper for amenities
const AMENITY_ICONS = {
  WiFi: Wifi,
  Parking: SquareSquare,
  AC: Wind,
  Pool: Waves,
  Kitchen: UtensilsCrossed,
};

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState("");

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const docRef = doc(db, "properties", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };
          setProperty(data);
          // Default main preview to imageUrl or the first image in imageUrls array
          setSelectedImage(
            data.imageUrl || (data.imageUrls && data.imageUrls[0]) || ""
          );
        } else {
          setError("Property not found.");
        }
      } catch (err) {
        console.error("Error fetching property:", err);
        setError("Failed to load property details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

  if (loading) {
    return (
      <div style={centeredContainerStyle}>
        <Loader2 className="animate-spin" size={36} color="#6200ee" />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div style={centeredContainerStyle}>
        <p style={{ color: "#dc2626", fontWeight: "600" }}>{error || "Property not found."}</p>
        <button onClick={() => navigate(-1)} style={backButtonStyle}>
          Go Back
        </button>
      </div>
    );
  }

  // Gallery list combining main imageUrl and extra imageUrls array
  const galleryImages = Array.from(
    new Set([property.imageUrl, ...(property.imageUrls || [])].filter(Boolean))
  );

  return (
    <div style={pageContainerStyle}>
      {/* Top Header */}
      <div style={headerStyle}>
        <button type="button" onClick={() => navigate(-1)} style={iconButtonStyle}>
          <ArrowLeft size={22} color="#0f172a" />
        </button>
        <h1 style={headerTitleStyle}>Property Details</h1>
      </div>

      {/* Main Image Banner */}
      <div style={mainImageContainerStyle}>
        {selectedImage ? (
          <img src={selectedImage} alt={property.title} style={mainImageStyle} />
        ) : (
          <div style={noImageStyle}>No Image Available</div>
        )}
        <span style={statusBadgeStyle(property.status)}>
          {property.status || "available"}
        </span>
      </div>

      {/* Thumbnails Gallery */}
      {galleryImages.length > 1 && (
        <div style={galleryRowStyle}>
          {galleryImages.map((url, index) => (
            <img
              key={index}
              src={url}
              alt={`Thumbnail ${index + 1}`}
              onClick={() => setSelectedImage(url)}
              style={thumbnailStyle(selectedImage === url)}
            />
          ))}
        </div>
      )}

      {/* Content Container */}
      <div style={contentCardStyle}>
        {/* Title, Category & Price Header */}
        <div style={titlePriceRowStyle}>
          <div>
            <span style={categoryBadgeStyle}>{property.category}</span>
            <h2 style={propertyTitleStyle}>{property.title}</h2>
            <p style={locationStyle}>
              <MapPin size={16} color="#6200ee" />
              {property.location}
            </p>
          </div>
          <div style={priceContainerStyle}>
            <span style={priceAmountStyle}>${property.price}</span>
            <span style={pricePeriodStyle}>/month</span>
          </div>
        </div>

        <hr style={dividerStyle} />

        {/* Bedroom & Bathroom Specs */}
        <div style={specsRowStyle}>
          <div style={specItemStyle}>
            <Bed size={20} color="#6200ee" />
            <span><strong>{property.bedrooms}</strong> Bedrooms</span>
          </div>
          <div style={specItemStyle}>
            <Bath size={20} color="#6200ee" />
            <span><strong>{property.bathrooms}</strong> Bathrooms</span>
          </div>
        </div>

        <hr style={dividerStyle} />

        {/* Description Section */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Description</h3>
          <p style={descriptionTextStyle}>{property.description || "No description provided."}</p>
        </div>

        {/* Amenities Section */}
        {property.amenities && property.amenities.length > 0 && (
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Amenities</h3>
            <div style={amenitiesGridStyle}>
              {property.amenities.map((item, index) => {
                const IconComponent = AMENITY_ICONS[item] || CheckCircle2;
                return (
                  <div key={index} style={amenityChipStyle}>
                    <IconComponent size={16} color="#6200ee" />
                    <span>{item}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Facilities Section */}
        {property.facilities && property.facilities.length > 0 && (
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Facilities</h3>
            <div style={amenitiesGridStyle}>
              {property.facilities.map((facility, index) => (
                <div key={index} style={facilityChipStyle}>
                  <CheckCircle2 size={16} color="#16a34a" />
                  <span>{facility}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <hr style={dividerStyle} />

        {/* Additional Metadata / Information */}
        <div style={metadataGridStyle}>
          <div style={metaItemStyle}>
            <User size={16} color="#64748b" />
            <span><strong>Owner ID:</strong> {property.ownerId}</span>
          </div>
          <div style={metaItemStyle}>
            <Tag size={16} color="#64748b" />
            <span><strong>Property ID:</strong> {property.id}</span>
          </div>
          {property.createdAt && (
            <div style={metaItemStyle}>
              <Calendar size={16} color="#64748b" />
              <span>
                <strong>Created:</strong>{" "}
                {property.createdAt.toDate ? property.createdAt.toDate().toLocaleString() : "N/A"}
              </span>
            </div>
          )}
          {property.updatedAt && (
            <div style={metaItemStyle}>
              <Calendar size={16} color="#64748b" />
              <span>
                <strong>Last Updated:</strong>{" "}
                {property.updatedAt.toDate ? property.updatedAt.toDate().toLocaleString() : "N/A"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Inline Component Styles */
const pageContainerStyle = { padding: "20px", maxWidth: "800px", margin: "0 auto", backgroundColor: "#f8fafc", minHeight: "100vh", boxSizing: "border-box" };
const centeredContainerStyle = { display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "80vh", gap: "12px" };
const headerStyle = { display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" };
const iconButtonStyle = { border: "none", backgroundColor: "#ffffff", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.06)" };
const backButtonStyle = { border: "none", backgroundColor: "#6200ee", color: "#fff", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "600" };
const headerTitleStyle = { fontSize: "20px", fontWeight: "700", color: "#0f172a", margin: 0 };
const mainImageContainerStyle = { position: "relative", width: "100%", height: "280px", borderRadius: "16px", overflow: "hidden", backgroundColor: "#e2e8f0" };
const mainImageStyle = { width: "100%", height: "100%", objectFit: "cover" };
const noImageStyle = { display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748b", fontWeight: "600" };
const statusBadgeStyle = (status) => ({ position: "absolute", top: "16px", right: "16px", backgroundColor: status === "available" ? "#22c55e" : "#f59e0b", color: "#ffffff", padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", textTransform: "uppercase" });
const galleryRowStyle = { display: "flex", gap: "10px", marginTop: "12px", overflowX: "auto", paddingBottom: "4px" };
const thumbnailStyle = (isActive) => ({ width: "64px", height: "64px", borderRadius: "8px", objectFit: "cover", cursor: "pointer", border: isActive ? "2px solid #6200ee" : "2px solid transparent", opacity: isActive ? 1 : 0.6 });
const contentCardStyle = { backgroundColor: "#ffffff", borderRadius: "16px", padding: "24px", marginTop: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" };
const titlePriceRowStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" };
const categoryBadgeStyle = { display: "inline-block", backgroundColor: "#f3f2fe", color: "#6200ee", fontSize: "12px", fontWeight: "700", padding: "4px 10px", borderRadius: "6px", marginBottom: "8px" };
const propertyTitleStyle = { fontSize: "22px", fontWeight: "800", color: "#0f172a", margin: "0 0 6px 0" };
const locationStyle = { display: "flex", alignItems: "center", gap: "4px", color: "#64748b", fontSize: "14px", margin: 0 };
const priceContainerStyle = { textAlign: "right" };
const priceAmountStyle = { fontSize: "24px", fontWeight: "800", color: "#6200ee" };
const pricePeriodStyle = { fontSize: "14px", color: "#64748b" };
const dividerStyle = { border: "none", borderTop: "1px solid #f1f5f9", margin: "18px 0" };
const specsRowStyle = { display: "flex", gap: "24px" };
const specItemStyle = { display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#334155" };
const sectionStyle = { marginBottom: "16px" };
const sectionTitleStyle = { fontSize: "16px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" };
const descriptionTextStyle = { color: "#475569", fontSize: "14px", lineHeight: "1.6", margin: 0 };
const amenitiesGridStyle = { display: "flex", flexWrap: "wrap", gap: "10px" };
const amenityChipStyle = { display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", backgroundColor: "#f3f2fe", borderRadius: "10px", fontSize: "13px", fontWeight: "600", color: "#0f172a" };
const facilityChipStyle = { display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", backgroundColor: "#f0fdf4", borderRadius: "10px", fontSize: "13px", fontWeight: "600", color: "#166534" };
const metadataGridStyle = { display: "flex", flexDirection: "column", gap: "8px", backgroundColor: "#f8fafc", padding: "14px", borderRadius: "12px" };
const metaItemStyle = { display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#64748b", wordBreak: "break-all" };