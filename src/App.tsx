
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout/Layout';
import Index from '@/pages/Index';
import { Auth } from '@/pages/Auth';
import { Dashboard } from '@/pages/Dashboard';
import { Clients } from '@/pages/Clients';
import { Vehicles } from '@/pages/Vehicles';
import { Reservations } from '@/pages/Reservations';
import { B2BReservations } from '@/pages/B2BReservations';
import { Entretien } from '@/pages/Entretien';
import { Depenses } from '@/pages/Depenses';
import { Documents } from '@/pages/Documents';
import { Statistics } from '@/pages/Statistics';
import CalendarAvailability from '@/pages/CalendarAvailability';
import { Parametres } from '@/pages/Parametres';
import NotFound from '@/pages/NotFound';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/clients" element={
            <ProtectedRoute>
              <Layout>
                <Clients />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/vehicles" element={
            <ProtectedRoute>
              <Layout>
                <Vehicles />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/reservations" element={
            <ProtectedRoute>
              <Layout>
                <Reservations />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/b2b-reservations" element={
            <ProtectedRoute>
              <Layout>
                <B2BReservations />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/entretien" element={
            <ProtectedRoute>
              <Layout>
                <Entretien />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/depenses" element={
            <ProtectedRoute>
              <Layout>
                <Depenses />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/documents" element={
            <ProtectedRoute>
              <Layout>
                <Documents />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/statistiques" element={
            <ProtectedRoute>
              <Layout>
                <Statistics />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/calendrier" element={
            <ProtectedRoute>
              <Layout>
                <CalendarAvailability />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/parametres" element={
            <ProtectedRoute>
              <Layout>
                <Parametres />
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
        <Toaster />
      </Router>
    </AuthProvider>
  );
}

export default App;
