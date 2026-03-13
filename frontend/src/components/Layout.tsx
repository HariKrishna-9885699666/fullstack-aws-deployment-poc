import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut, LayoutDashboard, FileText, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/axios';

export function Layout() {
  const { user, token, logout, setAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Check if we have a token but no user (happens on refresh with old storage)
    const fetchUserIfNeeded = async () => {
      if (token && !user) {
        try {
          const res = await api.get('/auth/me');
          setAuth(token, res.data);
        } catch (error) {
          console.error('Failed to fetch user data:', error);
          logout();
          navigate('/login');
        }
      }
      setIsHydrated(true);
    };

    fetchUserIfNeeded();
  }, [token, user, setAuth, logout, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  // Don't render navigation until we've checked user state
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Animated background gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-20 right-1/3 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <nav className="border-b border-white/5 bg-gray-900/40 backdrop-blur-xl sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link 
              to={user ? "/dashboard" : "/"} 
              className="flex items-center gap-3 text-white font-bold text-xl group"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg blur-lg opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="relative bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-lg shadow-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              </div>
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                FileFlow
              </span>
            </Link>
            {user && (
              <div className="flex items-center gap-6">
                <Link 
                  to="/dashboard" 
                  className={`flex items-center gap-2 text-sm font-medium transition-all px-3 py-1.5 rounded-lg ${
                    isActive('/dashboard') 
                      ? 'text-blue-400 bg-blue-500/10' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
                <Link 
                  to="/records" 
                  className={`flex items-center gap-2 text-sm font-medium transition-all px-3 py-1.5 rounded-lg ${
                    isActive('/records') || location.pathname.startsWith('/records')
                      ? 'text-blue-400 bg-blue-500/10' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Records</span>
                </Link>
                <div className="h-6 w-px bg-white/10 hidden sm:block" />
                <div className="flex items-center gap-3">
                  <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-sm text-slate-300">{user.email}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-red-400 transition-all rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                    aria-label="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
