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
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 w-full">
      {/* Left side: Mobile/Tablet Hamburger & Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2.5 -ml-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Logo Title */}
        <div className="flex items-center gap-2 sm:hidden min-w-0">
          <span className="text-sm font-bold text-slate-900 truncate">
            PlacementAuto
          </span>
        </div>

        {/* Desktop / Tablet Section Title */}
        <div className="hidden sm:block min-w-0">
          <h2 className="text-xs md:text-sm font-semibold text-slate-800 truncate">
            Placement Candidate & Messaging Automation
          </h2>
        </div>
      </div>

      {/* Right side: Status, Notifications & Profile */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Backend API Status Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-50 border-slate-200">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              apiConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span className="text-slate-600 hidden md:inline text-[11px] font-medium">
            {apiConnected ? 'API Connected' : 'Checking API...'}
          </span>
        </div>

        {/* Notifications */}
        <button
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 relative min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>

        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        {/* Authenticated Admin Profile Section */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-semibold text-xs shrink-0">
            <ShieldCheck className="w-4 h-4 text-slate-700" />
          </div>

          <div className="hidden lg:block text-left min-w-0 max-w-[140px] xl:max-w-[200px]">
            <div className="text-xs font-semibold text-slate-900 leading-tight truncate">
              {user?.name || 'Administrator'}
            </div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 truncate">
              <span className="truncate">{user?.email || 'admin@placement.edu'}</span>
              <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] uppercase font-semibold shrink-0">
                {user?.role || 'admin'}
              </span>
            </div>
          </div>

          {/* Logout Action Button */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            title="Log out of admin session"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors min-h-[36px]"
          >
            {isLoggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
