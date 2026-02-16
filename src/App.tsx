import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { VoiceFeatureGuard } from "@/components/guards/VoiceFeatureGuard.tsx";
import { WhatsAppFeatureGuard } from "@/components/guards/WhatsAppFeatureGuard.tsx";
import { DashboardRouter } from "@/components/guards/DashboardRouter.tsx";
import { AppLayout } from "@/components/layout/AppLayout";
import Homepage from "./pages/Homepage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VoiceDashboard from "./pages/VoiceDashboard";
import WhatsAppDashboard from "./pages/WhatsAppDashboard";
import CreateAgent from "./pages/CreateAgent";
import RunVoiceCampaign from "./pages/RunVoiceCampaign";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Support from "./pages/Support";
import Contacts from "./pages/Contacts";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes without sidebar */}
            <Route path="/" element={<Homepage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Default dashboard - redirects based on feature flags */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            } />
            
            {/* Voice routes */}
            <Route path="/dashboard/voice" element={
              <ProtectedRoute>
                <VoiceFeatureGuard>
                  <AppLayout><VoiceDashboard /></AppLayout>
                </VoiceFeatureGuard>
              </ProtectedRoute>
            } />
            <Route path="/create-agent" element={
              <ProtectedRoute>
                <VoiceFeatureGuard>
                  <AppLayout><CreateAgent /></AppLayout>
                </VoiceFeatureGuard>
              </ProtectedRoute>
            } />
            <Route path="/campaigns/voice" element={
              <ProtectedRoute>
                <VoiceFeatureGuard>
                  <AppLayout><RunVoiceCampaign /></AppLayout>
                </VoiceFeatureGuard>
              </ProtectedRoute>
            } />
            {/* Backward compatibility - redirect old route */}
            <Route path="/run-campaign" element={
              <ProtectedRoute>
                <VoiceFeatureGuard>
                  <AppLayout><RunVoiceCampaign /></AppLayout>
                </VoiceFeatureGuard>
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <VoiceFeatureGuard>
                  <AppLayout><Analytics /></AppLayout>
                </VoiceFeatureGuard>
              </ProtectedRoute>
            } />
            
            {/* WhatsApp routes */}
            <Route path="/dashboard/whatsapp" element={
              <ProtectedRoute>
                <WhatsAppFeatureGuard>
                  <AppLayout><WhatsAppDashboard /></AppLayout>
                </WhatsAppFeatureGuard>
              </ProtectedRoute>
            } />
            {/* Shared routes */}
            <Route path="/contacts" element={
              <ProtectedRoute>
                <AppLayout><Contacts /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <AppLayout><Settings /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/support" element={
              <ProtectedRoute>
                <AppLayout><Support /></AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
