import React, { useEffect, useState } from "react";
import { auth, db } from "../../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  UserRound,
  Mail,
  Phone,
  MapPin,
  Camera,
  Save,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

export default function AdminProfile() {
  const [adminId, setAdminId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [profileImage, setProfileImage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAdminId("");
        setLoading(false);
        return;
      }

      setAdminId(user.uid);
      setEmail(user.email || "");

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();

          setFullName(data.fullName || data.name || user.displayName || "");
          setPhone(data.phone || "");
          setAddress(data.address || "");
          setProfileImage(data.profileImage || "");
        } else {
          setFullName(user.displayName || "");
        }
      } catch (error) {
        console.error("Failed to load admin profile:", error);
        setMessage({
          type: "error",
          text: "Unable to load your profile. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();

    if (!adminId) {
      setMessage({
        type: "error",
        text: "Please sign in before updating your profile.",
      });
      return;
    }

    if (!fullName.trim()) {
      setMessage({
        type: "error",
        text: "Full name is required.",
      });
      return;
    }

    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const userRef = doc(db, "users", adminId);
      const userSnap = await getDoc(userRef);

      const profileData = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        profileImage: profileImage.trim(),
        updatedAt: serverTimestamp(),
      };

      if (userSnap.exists()) {
        await updateDoc(userRef, profileData);
      } else {
        await setDoc(userRef, {
          ...profileData,
          email,
          role: "admin",
          createdAt: serverTimestamp(),
        });
      }

      setMessage({
        type: "success",
        text: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error("Failed to update admin profile:", error);
      setMessage({
        type: "error",
        text: "Failed to save your profile. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const initials = fullName.trim().charAt(0).toUpperCase() || "A";

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoaderCircle className="animate-spin text-indigo-600" size={30} />
      </div>
    );
  }

  if (!adminId) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <UserRound className="mx-auto mb-3 text-slate-400" size={32} />
        <h2 className="font-semibold text-slate-900">Sign in required</h2>
        <p className="mt-1 text-sm text-slate-500">
          Sign in to view your administrator profile.
        </p>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Page heading */}
        <div className="mb-6">
          <p className="text-sm font-medium text-indigo-600">Administration</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            My Profile
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            View and update your administrator information.
          </p>
        </div>

        {/* Profile summary */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-28 bg-gradient-to-r from-indigo-600 to-violet-500" />

          <div className="px-5 pb-5 sm:px-8">
            <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-indigo-50 text-3xl font-bold text-indigo-600 shadow-sm">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Administrator"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  initials
                )}
              </div>

              <div className="min-w-0 flex-1 pb-1">
                <h2 className="truncate text-xl font-bold text-slate-900">
                  {fullName || "Administrator"}
                </h2>
                <p className="mt-1 break-all text-sm text-slate-500">{email}</p>
              </div>

              <span className="mb-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                <ShieldCheck size={15} />
                Administrator
              </span>
            </div>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div
            className={`mb-5 flex items-start gap-3 rounded-xl border p-4 ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={19} className="mt-0.5 shrink-0" />
            )}
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        {/* Profile form */}
        <form
          onSubmit={handleSave}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 px-5 py-5 sm:px-8">
            <h3 className="font-semibold text-slate-900">
              Personal Information
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Update the information associated with your account.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 px-5 py-6 sm:grid-cols-2 sm:px-8">
            {/* Full name */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <UserRound
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  value={email}
                  readOnly
                  className={`${inputClass} cursor-not-allowed bg-slate-50 pl-10 text-slate-500`}
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Managed by your sign-in account.
              </p>
            </div>

            {/* Phone */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Phone Number
              </label>
              <div className="relative">
                <Phone
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Address
              </label>
              <div className="relative">
                <MapPin
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your address"
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>

            {/* Profile image */}
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Profile Image URL
              </label>
              <div className="relative">
                <Camera
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="url"
                  value={profileImage}
                  onChange={(e) => setProfileImage(e.target.value)}
                  placeholder="https://example.com/profile.jpg"
                  className={`${inputClass} pl-10`}
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Paste a publicly accessible image URL. The profile preview
                updates after saving.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p className="text-xs text-slate-500">
              Your profile information is saved to your account.
            </p>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <Save size={17} />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
