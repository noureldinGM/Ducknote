import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleRoute from '@/components/app/RoleRoute';
import AppShell from '@/components/app/AppShell';
import Login from '@/pages/Login';
import RoleLanding from '@/pages/RoleLanding';
import ChangePassword from '@/pages/ChangePassword';
import Home from '@/pages/Home';
import MyPeople from '@/pages/MyPeople';
import Search from '@/pages/Search';
import CreateNote from '@/pages/CreateNote';
import History from '@/pages/History';
import Profile from '@/pages/Profile';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminUsers from '@/pages/AdminUsers';
import AdminActivity from '@/pages/AdminActivity';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Auth errors are handled by public routes and ProtectedRoute.

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/" element={<RoleLanding />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route element={<RoleRoute role="user" />}>
          <Route element={<AppShell role="user" />}>
            <Route path="/home" element={<Home />} />
            <Route path="/people" element={<MyPeople />} />
            <Route path="/search" element={<Search />} />
            <Route path="/create" element={<CreateNote />} />
            <Route path="/history" element={<History />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>
        <Route element={<RoleRoute role="admin" />}>
          <Route element={<AppShell role="admin" />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/activity" element={<AdminActivity />} />
            <Route path="/admin/profile" element={<Profile />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App