import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
// import { registerOwner } from "../services/ownerAuthService";
import { auth, db } from "../../../services/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

import {
  Building2,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function OwnerRegister() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Form Validations
    if (!formData.fullName.trim()) return setError("Full name is required.");
    if (!formData.email.trim()) return setError("Email address is required.");
    if (!formData.phone.trim()) return setError("Phone number is required.");
    if (formData.password.length < 6)
      return setError("Password must be at least 6 characters.");
    if (formData.password !== formData.confirmPassword)
      return setError("Passwords do not match.");
    if (!formData.agreeTerms)
      return setError("You must agree to the terms & conditions.");

    setLoading(true);

    try {
      await registerOwner({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
      });

      // Redirect to owner dashboard or properties setup on success
      navigate("/owner/properties");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else {
        setError(err.message || "Failed to create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Header Branding */}
        <div className="flex justify-center items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Building2 size={24} />
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            RentEase
          </span>
        </div>
        <h2 className="text-center text-xl font-bold text-slate-800">
          Become a Property Owner
        </h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          List your properties, manage bookings, and grow your revenue.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/80 rounded-2xl sm:px-8">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-700 text-xs font-semibold">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User size={18} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="owner@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <Phone size={18} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Terms & Conditions Checkbox */}
            <div className="flex items-start pt-1">
              <input
                id="agreeTerms"
                name="agreeTerms"
                type="checkbox"
                checked={formData.agreeTerms}
                onChange={handleChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded mt-0.5 cursor-pointer"
              />
              <label
                htmlFor="agreeTerms"
                className="ml-2.5 text-xs text-slate-600 leading-relaxed cursor-pointer"
              >
                I agree to the{" "}
                <span className="font-semibold text-indigo-600 hover:underline">
                  Terms of Service
                </span>{" "}
                and{" "}
                <span className="font-semibold text-indigo-600 hover:underline">
                  Privacy Policy
                </span>
                .
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Register as Owner"
              )}
            </button>
          </form>

          {/* Login Redirect */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500 font-medium">
              Already have an owner account?{" "}
              <Link
                to="/login"
                className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}