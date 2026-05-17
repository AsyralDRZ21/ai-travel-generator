import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import LandingPage    from './pages/LandingPage';
import LoginPage      from './pages/LoginPage';
import RegisterPage   from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage  from './pages/DashboardPage';
import ItineraryPage  from './pages/ItineraryPage';
import BudgetPage     from './pages/BudgetPage';
import CurrencyPage   from './pages/CurrencyPage';
import ProfilePage    from './pages/ProfilePage';
import RecommendPage  from './pages/RecommendPage';
import TripHistoryPage from './pages/TripHistoryPage';
import CommunityPage  from './pages/CommunityPage';
import PublicProfilePage from './pages/PublicProfilePage';
import AdminPage      from './pages/AdminPage';

import StatsPage      from './pages/StatsPage';
import ChatWidget     from './components/ChatWidget';

// Protected route wrapper
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="spinner" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

// Public-only route (redirect if already logged in)
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

function AppRoutes() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      document.body.classList.add('has-sidebar');
    } else {
      document.body.classList.remove('has-sidebar');
    }
  }, [user]);

  return (
    <>
      <Routes>
        <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/reset-password/:token" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/itinerary" element={<PrivateRoute><ItineraryPage /></PrivateRoute>} />
        <Route path="/budget" element={<PrivateRoute><BudgetPage /></PrivateRoute>} />
        <Route path="/currency" element={<PrivateRoute><CurrencyPage /></PrivateRoute>} />
        <Route path="/recommend" element={<PrivateRoute><RecommendPage /></PrivateRoute>} />
        <Route path="/history" element={<PrivateRoute><TripHistoryPage /></PrivateRoute>} />
        <Route path="/community" element={<PrivateRoute><CommunityPage /></PrivateRoute>} />
        <Route path="/user/:userId" element={<PrivateRoute><PublicProfilePage /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="/stats" element={<PrivateRoute><StatsPage /></PrivateRoute>} />

        <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ChatWidget />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
