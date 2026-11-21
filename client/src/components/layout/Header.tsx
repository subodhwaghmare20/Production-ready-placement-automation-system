import React, { useState } from 'react';
import { Menu, Bell, ShieldCheck, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  onOpenSidebar: () => void;
  apiConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSidebar,
  apiConnected,
}) => {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block">
          <h2 className="text-sm font-semibold text-slate-800">
            Placement Candidate & Messaging Automation
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Backend API Status Pill */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-50 border-slate-200">
          <span
            className={`w-2 h-2 rounded-full ${
              apiConnected ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />
          <span className="text-slate-600 hidden md:inline">
            {apiConnected ? 'API Connected' : 'Checking API...'}
          </span>
        </div>

        <button
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 relative"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>

        <div className="h-8 w-px bg-slate-200" />

        {/* Authenticated Admin Profile Section */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-semibold text-xs">
            <ShieldCheck className="w-4 h-4 text-slate-700" />
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-semibold text-slate-900 leading-tight">
              {user?.name || 'Administrator'}
            </div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
              <span>{user?.email || 'admin@placement.edu'}</span>
              <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] uppercase font-semibold">
                {user?.role || 'admin'}
              </span>
            </div>
          </div>

          {/* Logout Action Button */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            title="Log out of admin session"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors ml-1"
          >
            {isLoggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
