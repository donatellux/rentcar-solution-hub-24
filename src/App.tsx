
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout/Layout";

// Pages
import { Auth } from "@/pages/Auth";
import { Dashboard } from "@/pages/Dashboard";
import { Vehicles } from "@/pages/Vehicles";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/vehicles"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Vehicles />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients"
              element={
                <ProtectedRoute>
                  <Layout>
                    <div className="text-center py-12">
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Clients</h1>
                      <p className="text-gray-600 dark:text-gray-400">Module en cours de développement</p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reservations"
              element={
                <ProtectedRoute>
                  <Layout>
                    <div className="text-center py-12">
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Réservations</h1>
                      <p className="text-gray-600 dark:text-gray-400">Module en cours de développement</p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/maintenance"
              element={
                <ProtectedRoute>
                  <Layout>
                    <div className="text-center py-12">
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Entretiens</h1>
                      <p className="text-gray-600 dark:text-gray-400">Module en cours de développement</p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses"
              element={
                <ProtectedRoute>
                  <Layout>
                    <div className="text-center py-12">
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Dépenses</h1>
                      <p className="text-gray-600 dark:text-gray-400">Module en cours de développement</p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <Layout>
                    <div className="text-center py-12">
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Documents</h1>
                      <p className="text-gray-600 dark:text-gray-400">Module en cours de développement</p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Layout>
                    <div className="text-center py-12">
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Rapports</h1>
                      <p className="text-gray-600 dark:text-gray-400">Module en cours de développement</p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <div className="text-center py-12">
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Paramètres</h1>
                      <p className="text-gray-600 dark:text-gray-400">Module en cours de développement</p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
