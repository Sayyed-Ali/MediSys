// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Pages
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import PatientDashboard from "./pages/PatientDashboard";
import UsersPage from "./pages/UsersPage";
import AdmissionsPage from "./pages/AdmissionsPage";
import InventoryPage from "./pages/InventoryPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import DonorsPage from "./pages/DonorsPage";
import PatientRecordsPage from "./pages/PatientRecordsPage";
import Sidebar from "./components/Sidebar";
import ReviewPage from './pages/ReviewPage';
import UploadInvoice from "./components/UploadInvoice";
import BillingPage from "./pages/BillingPage";
import ReportsPage from './pages/ReportsPage';
import PathLabDashboard from "./pages/PathLabDashboard";
import PathLabUpload from "./components/PathLabUpload"; // ← NEW: PathLab upload page

// -------------------------------------------------------------
// Protected Route Component (Role-aware, graceful)
// -------------------------------------------------------------
const ProtectedRoute = ({ element: Element, allowedRoles = [], isDashboard }) => {
  const { token, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-lg text-indigo-600">
        Loading Application...
      </div>
    );
  }

  const isAuthenticated = !!token;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const role = user?.role || "User";

  // Map role → dashboard
  const getDashboardComponent = (role) => {
    switch (role) {
      case "Admin": return AdminDashboard;
      case "Staff":
      case "Nurse": return StaffDashboard;
      case "Doctor": return DoctorDashboard;
      case "Patient": return PatientDashboard;
      case "PathLab": return PathLabDashboard;
      default: return LoginPage;
    }
  };

  const ComponentToRender = isDashboard ? getDashboardComponent(role) : Element;

  // 🚫 Unauthorized access redirect logic
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    const userDashboardPath = "/dashboard";
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 text-red-700">
        <h1 className="text-3xl font-bold mb-3">403 - Access Denied</h1>
        <p className="text-lg mb-6">
          You don’t have permission to access this page.
        </p>
        <button
          onClick={() => (window.location.href = userDashboardPath)}
          className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 overflow-y-auto">
        <ComponentToRender />
      </main>
    </div>
  );
};

// -------------------------------------------------------------
// Routes Definition
// -------------------------------------------------------------
const AppContent = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />

    {/* 🔐 Unified dashboard for all roles */}
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute
          element={AdminDashboard}
          allowedRoles={["Admin", "Staff", "Nurse", "Doctor", "Patient", "PathLab"]}
          isDashboard={true}
        />
      }
    />

    {/* Admin-only management pages */}
    <Route path="/users" element={<ProtectedRoute element={UsersPage} allowedRoles={['Admin']} />} />
    <Route path="/upload-invoice" element={<ProtectedRoute element={UploadInvoice} allowedRoles={['Admin']} />} />
    <Route path="/review" element={<ProtectedRoute element={ReviewPage} allowedRoles={['Admin']} />} />

    {/* PathLab upload (only PathLab users) */}
    <Route path="/reports/upload" element={<ProtectedRoute element={PathLabUpload} allowedRoles={['PathLab']} />} />

    {/* Reports review/view (Admin, Doctor, PathLab may view their uploads) */}
    <Route path="/reports" element={<ProtectedRoute element={ReportsPage} allowedRoles={['Admin', 'Doctor', 'PathLab']} />} />

    {/* Shared pages by multiple roles */}
    <Route path="/admissions" element={<ProtectedRoute element={AdmissionsPage} allowedRoles={['Admin', 'Staff', 'Nurse', 'Doctor']} />} />
    <Route path="/inventory" element={<ProtectedRoute element={InventoryPage} allowedRoles={['Admin', 'Staff', 'Nurse']} />} />
    <Route path="/analytics" element={<ProtectedRoute element={AnalyticsPage} allowedRoles={['Admin', 'Doctor']} />} />
    <Route path="/donors" element={<ProtectedRoute element={DonorsPage} allowedRoles={['Admin', 'Staff', 'Nurse', 'Doctor']} />} />
    <Route path="/patients" element={<ProtectedRoute element={PatientRecordsPage} allowedRoles={['Admin', 'Staff', 'Nurse', 'Doctor']} />} />

    {/* Billing and patient-related pages */}
    <Route path="/billing" element={<ProtectedRoute element={BillingPage} allowedRoles={['Admin', 'Staff', 'Patient']} />} />
    <Route
      path="/appointments"
      element={
        <ProtectedRoute
          element={() => <h1 className="text-3xl font-bold text-gray-800">Appointments Page</h1>}
          allowedRoles={['Patient', 'Doctor']}
        />
      }
    />

    {/* Redirect Root to Dashboard */}
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="*" element={<h1 className="text-center mt-20 text-4xl text-gray-700">404 - Page Not Found</h1>} />
  </Routes>
);

// -------------------------------------------------------------
// App Root Wrapper
// -------------------------------------------------------------
const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </BrowserRouter>
);

export default App;