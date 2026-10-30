import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ownerProfileService } from "../../services/ownerProfileService";

import {
  User,
  Edit,
  Home,
  Calendar,
  CreditCard,
  Bell,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  BadgeCheck,
  Star,
  Mail,
  Phone,
  MapPin,
  Loader2,
  Building2,
  Shield,
  Headphones,
  X,
} from "lucide-react";

const OwnerProfile = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      try {
        setLoading(true);

        const profile = await ownerProfileService.getOwnerProfile(
          currentUser.uid
        );

        if (profile) {
          setUser(profile);
        } else {
          setUser({
            uid: currentUser.uid,
            fullName: currentUser.displayName || "Owner",
            email: currentUser.email || "",
            phone: currentUser.phoneNumber || "",
            profileImage: currentUser.photoURL || "",
            propertyCount: 0,
            rating: 4.9,
            role: "owner",
            accountStatus: "active",
          });
        }
      } catch (error) {
        console.error("Error loading owner profile:", error);

        setUser({
          uid: currentUser.uid,
          fullName: currentUser.displayName || "Owner",
          email: currentUser.email || "",
          phone: currentUser.phoneNumber || "",
          profileImage: currentUser.photoURL || "",
          propertyCount: 0,
          rating: 4.9,
          role: "owner",
          accountStatus: "active",
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);

      await ownerProfileService.logoutOwner();

      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            size={32}
            className="animate-spin text-indigo-600"
          />
          <p className="text-sm font-medium text-slate-500">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // IMPORTANT:
  // propertyCount now comes from the "properties" collection
  // where ownerId == current user's uid.
  const propertyCount = Number(user.propertyCount || 0);

  const rating = Number(user.rating || 4.9);

  const fullName = user.fullName || "Owner";
  const email = user.email || "No email";
  const phone = user.phone || "No phone";
  const address = user.address || "No address";
  const profileImage = user.profileImage || "";

  const accountStatus =
    user.accountStatus || "active";

  const role = user.role || "owner";

  const isActive =
    accountStatus.toLowerCase() === "active";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* =========================================================
          HEADER
      ========================================================== */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                My Profile
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage your account and owner information
              </p>
            </div>

            <button
              onClick={() => navigate("/owner/edit-profile")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Edit size={17} />
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================
          MAIN CONTENT
      ========================================================== */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* =======================================================
            PROFILE CARD
        ======================================================== */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-32 bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-500" />

          <div className="px-5 pb-6 sm:px-8">
            <div className="-mt-16 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              {/* Avatar + Basic Information */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                {/* Avatar */}
                <div className="relative">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt={fullName}
                      className="h-32 w-32 rounded-2xl border-4 border-white object-cover shadow-md"
                    />
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-2xl border-4 border-white bg-indigo-100 text-4xl font-bold text-indigo-600 shadow-md">
                      {fullName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white">
                    <BadgeCheck size={15} />
                  </div>
                </div>

                {/* User Information */}
                <div className="pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold text-slate-900">
                      {fullName}
                    </h2>

                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      <BadgeCheck size={13} />
                      Verified Owner
                    </span>
                  </div>

                  <div className="mt-2 flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:flex-wrap sm:gap-4">
                    <span className="inline-flex items-center gap-1.5">
                      <Mail size={15} />
                      {email}
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                      <Phone size={15} />
                      {phone}
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={15} />
                      {address}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  <Home size={13} />
                  {propertyCount} Properties
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                  <Star
                    size={13}
                    fill="currentColor"
                  />
                  {rating.toFixed(1)} Rating
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  <Shield size={13} />
                  {isActive ? "Active" : accountStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* =======================================================
            GRID
        ======================================================== */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* =====================================================
              LEFT MENU
          ====================================================== */}
          <div className="space-y-6 lg:col-span-2">
            {/* Account */}
            <ProfileSection title="Account">
              <ProfileMenuItem
                icon={User}
                title="Edit Profile"
                description="Update your personal information"
                onClick={() => navigate("/owner/edit-profile")}
              />

              <ProfileMenuItem
                icon={Home}
                title="My Properties"
                description={`Manage your ${propertyCount} properties`}
                onClick={() => navigate("/owner/properties")}
              />

              <ProfileMenuItem
                icon={Calendar}
                title="Booking Requests"
                description="View and manage renter requests"
                onClick={() => navigate("/owner/bookings")}
              />
            </ProfileSection>

            {/* Business */}
            <ProfileSection title="Business">
              <ProfileMenuItem
                icon={CreditCard}
                title="Earnings & Payments"
                description="View your earnings and payment history"
                onClick={() => navigate("/owner/payments")}
              />

              <ProfileMenuItem
                icon={Bell}
                title="Notifications"
                description="Manage your notifications"
                onClick={() => navigate("/owner/notifications")}
              />

              <ProfileMenuItem
                icon={User}
                title="Renters"
                description="View your renters and booking activity"
                onClick={() => navigate("/owner/renters")}
              />
            </ProfileSection>

            {/* System */}
            <ProfileSection title="System">
              <ProfileMenuItem
                icon={Settings}
                title="Settings"
                description="Manage application settings"
                onClick={() => navigate("/owner/settings")}
              />

              <ProfileMenuItem
                icon={HelpCircle}
                title="Help & Support"
                description="Get help with your account"
                onClick={() => navigate("/owner/help-support")}
              />

              <button
                onClick={() => setShowLogoutModal(true)}
                className="group flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-red-50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 transition group-hover:bg-red-100">
                    <LogOut size={19} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-red-600">
                      Logout
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Sign out of your owner account
                    </p>
                  </div>
                </div>

                <ChevronRight
                  size={18}
                  className="text-slate-400 transition group-hover:translate-x-0.5"
                />
              </button>
            </ProfileSection>
          </div>

          {/* =====================================================
              RIGHT SIDEBAR
          ====================================================== */}
          <div className="space-y-6">
            {/* Account Summary */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-base font-bold text-slate-900">
                  Account Summary
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Overview of your account
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                <StatRow
                  label="Role"
                  value={
                    role.charAt(0).toUpperCase() +
                    role.slice(1)
                  }
                />

                {/* REAL PROPERTY COUNT */}
                <StatRow
                  label="Properties"
                  value={propertyCount}
                />

                <StatRow
                  label="Rating"
                  value={
                    <span className="inline-flex items-center gap-1">
                      <Star
                        size={14}
                        className="text-amber-500"
                        fill="currentColor"
                      />
                      {rating.toFixed(1)}
                    </span>
                  }
                />

                <StatRow
                  label="Status"
                  value={
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {isActive
                        ? "Active"
                        : accountStatus}
                    </span>
                  }
                />
              </div>
            </div>

            {/* Properties Summary */}
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <Building2 size={21} />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Your Properties
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    You currently have{" "}
                    <span className="font-bold text-indigo-600">
                      {propertyCount}
                    </span>{" "}
                    {propertyCount === 1
                      ? "property"
                      : "properties"}{" "}
                    registered under your owner account.
                  </p>

                  <button
                    onClick={() =>
                      navigate("/owner/properties")
                    }
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    Manage Properties
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Support */}
            <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Headphones size={21} />
                </div>

                <div>
                  <h3 className="text-sm font-bold">
                    Need Help?
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    Our support team is available to help
                    you with your owner account.
                  </p>

                  <button
                    onClick={() =>
                      navigate("/owner/help-support")
                    }
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-900 transition hover:bg-slate-100"
                  >
                    Contact Support
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* =========================================================
          LOGOUT MODAL
      ========================================================== */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-lg font-bold text-slate-900">
                Logout
              </h3>

              <button
                onClick={() => setShowLogoutModal(false)}
                disabled={loggingOut}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={19} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-5 py-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                <LogOut size={24} />
              </div>

              <h4 className="mt-4 text-center text-lg font-bold text-slate-900">
                Are you sure you want to logout?
              </h4>

              <p className="mt-2 text-center text-sm leading-6 text-slate-500">
                You will need to login again to access
                your owner account.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button
                onClick={() => setShowLogoutModal(false)}
                disabled={loggingOut}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loggingOut ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                    Logging out...
                  </>
                ) : (
                  <>
                    <LogOut size={17} />
                    Logout
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* =============================================================
   PROFILE SECTION
============================================================= */

const ProfileSection = ({ title, children }) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          {title}
        </h3>
      </div>

      <div className="divide-y divide-slate-100">
        {children}
      </div>
    </div>
  );
};

/* =============================================================
   PROFILE MENU ITEM
============================================================= */

const ProfileMenuItem = ({
  icon: Icon,
  title,
  description,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-indigo-50 group-hover:text-indigo-600">
          <Icon size={19} />
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-800">
            {title}
          </p>

          <p className="mt-0.5 text-xs text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <ChevronRight
        size={18}
        className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600"
      />
    </button>
  );
};

/* =============================================================
   STAT ROW
============================================================= */

const StatRow = ({ label, value }) => {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="text-sm font-semibold text-slate-900">
        {value}
      </span>
    </div>
  );
};

export default OwnerProfile;