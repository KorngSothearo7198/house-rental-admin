import { Routes, Route, Navigate } from "react-router-dom";

import AdminLayout from "../layouts/AdminLayout";
import OwnerLayout from "../layouts/OwnerLayout";

import AdminRoute from "./AdminRoute";
import OwnerRoute from "./OwnerRoute";

// Admin Auth
import Login from "../pages/admin/auth/Login";
import Register from "../pages/admin/auth/Register";

// Owner Auth
import OwnerLogin from "../pages/owner/auth/OwnerLogin";
import OwnerRegister from "../pages/owner/auth/OwnerRegister";

// Admin Pages
import Dashboard from "../pages/admin/Dashboard";
import Users from "../pages/admin/Users";
import Owners from "../pages/admin/Owners";
import Rooms from "../pages/admin/Rooms";
import Categories from "../pages/admin/Categories";
import Bookings from "../pages/admin/Bookings";
import Reports from "../pages/admin/Reports";
import Settings from "../pages/admin/Settings";
import AdminSubscriptions from "../pages/admin/AdminSubscriptions";
import AdminSupportTickets from "../pages/admin/AdminSupportTickets";

// Owner Pages
import OwnerDashboard from "../pages/owner/OwnerDashboard";
import MyProperties from "../pages/owner/MyProperties";
import PropertyDetail from "../pages/owner/PropertyDetail";
import AddEditProperty from "../pages/owner/AddEditProperty";
import OwnerBookings from "../pages/owner/OwnerBookings";
import OwnerRenters from "../pages/owner/OwnerRenters";
import OwnerPayments from "../pages/owner/OwnerPayments";
import OwnerMessenger from "../pages/owner/OwnerMessenger";
import OwnerNotifications from "../pages/owner/OwnerNotifications";
import OwnerReports from "../pages/owner/OwnerReports";
import OwnerProfile from "../pages/owner/OwnerProfile";
import OwnerSubscription from "../pages/owner/OwnerSubscription";
import OwnerHelpSupport from "../pages/owner/OwnerHelpSupport";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Root */}
      <Route path="/" element={<Navigate to="/admin/login" replace />} />

      {/* Admin Authentication */}
      <Route path="/admin/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Owner Authentication */}
      <Route path="/owner/login" element={<OwnerLogin />} />
      <Route path="/owner/register" element={<OwnerRegister />} />

      {/* Admin Protected Routes */}
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />

          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="owners" element={<Owners />} />
          <Route path="rooms" element={<Rooms />} />
          <Route path="categories" element={<Categories />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />

          <Route
            path="/admin/support-tickets"
            element={<AdminSupportTickets />}
          />

          <Route
            path="/admin/support-tickets/:ticketId"
            element={<AdminSupportTickets />}
          />

          <Route path="subscriptions" element={<AdminSubscriptions />} />
        </Route>
      </Route>

      {/* Owner Protected Routes */}
      <Route element={<OwnerRoute />}>
        <Route path="/owner" element={<OwnerLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />

          <Route path="dashboard" element={<OwnerDashboard />} />

          {/* Properties */}
          <Route path="properties" element={<MyProperties />} />
          <Route path="properties/add" element={<AddEditProperty />} />
          <Route path="properties/:id" element={<PropertyDetail />} />
          <Route path="properties/:id/edit" element={<AddEditProperty />} />

          {/* Bookings */}
          <Route path="bookings" element={<OwnerBookings />} />
          <Route path="bookings/:id" element={<OwnerBookings />} />

          {/* Renters */}
          <Route path="renters" element={<OwnerRenters />} />
          <Route path="renters/:id" element={<OwnerRenters />} />

          {/* Payments */}
          <Route path="payments" element={<OwnerPayments />} />
          <Route path="payments/:id" element={<OwnerPayments />} />

          {/* Messages */}
          <Route path="messages" element={<OwnerMessenger />} />
          <Route path="messages/:conversationId" element={<OwnerMessenger />} />

          {/* Other Pages */}
          <Route path="notifications" element={<OwnerNotifications />} />
          <Route path="reports" element={<OwnerReports />} />
          <Route path="subscription" element={<OwnerSubscription />} />
          <Route path="help-support" element={<OwnerHelpSupport />} />
          <Route path="profile" element={<OwnerProfile />} />
          <Route path="profile/edit" element={<OwnerProfile />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
}
