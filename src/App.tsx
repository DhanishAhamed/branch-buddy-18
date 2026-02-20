import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { AppLayout } from "@/components/layout/AppLayout";

import Login from "./pages/Login";
import PendingApproval from "./pages/PendingApproval";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Pipeline from "./pages/Pipeline";
import PipelineV2 from "./pages/PipelineV2";
import Properties from "./pages/Properties";
import MapSearch from "./pages/MapSearch";
import Chat from "./pages/Chat";
import Portal from "./pages/Portal";
import AdminUsers from "./pages/admin/Users";
import AdminSettings from "./pages/admin/Settings";
import WorkspaceSettings from "./pages/admin/WorkspaceSettings";
import AdminOwners from "./pages/admin/Owners";
import CalendarPage from "./pages/CalendarPage";
import NotificationPreferences from "./pages/NotificationPreferences";
import Customers from "./pages/Customers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (profile && !profile.is_approved) return <Navigate to="/pending-approval" replace />;

  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/pending-approval" element={
        !user ? <Navigate to="/login" replace /> : 
        profile?.is_approved ? <Navigate to="/dashboard" replace /> : 
        <PendingApproval />
      } />
      
      {/* Public Portals */}
      <Route path="/portal/rentals" element={<Navigate to="/portal/residential" replace />} />
      <Route path="/portal/:type" element={<Portal />} />

      {/* Protected Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
      <Route path="/pipeline" element={<ProtectedRoute><PipelineV2 /></ProtectedRoute>} />
      <Route path="/properties" element={<ProtectedRoute><Properties /></ProtectedRoute>} />
      <Route path="/map" element={<ProtectedRoute><MapSearch /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
      <Route path="/notifications/preferences" element={<ProtectedRoute><NotificationPreferences /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
      
      {/* Admin Routes */}
      <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
      <Route path="/admin/workspaces" element={<ProtectedRoute><WorkspaceSettings /></ProtectedRoute>} />
      <Route path="/admin/owners" element={<ProtectedRoute><AdminOwners /></ProtectedRoute>} />

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <WorkspaceProvider>
                <AppRoutes />
              </WorkspaceProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
