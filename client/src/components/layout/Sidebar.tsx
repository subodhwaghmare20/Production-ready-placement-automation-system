import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  FolderTree,
  UserCheck,
  MessageSquare,
  FileCode2,
  BarChart3,
  TrendingUp,
  Settings,
  GraduationCap,
  X,
  LogOut,
  User,
  Cloud,
  Inbox,
  Server,
  ShieldCheck,
  Shield,
  FileText,
  Laptop,
  Sliders,
} from 'lucide-react';
import { NavItem } from '../../types';
import { cn } from '../../utils/cn';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Candidates', href: '/candidates', icon: Users },
  { title: 'Companies', href: '/companies', icon: Building2 },
  { title: 'Virtual Groups', href: '/virtual-groups', icon: FolderTree },
  { title: 'Contact Fetcher', href: '/contact-fetcher', icon: UserCheck },
  { title: 'WhatsApp Messages', href: '/whatsapp-messages', icon: MessageSquare },
  { title: 'Campaign Analytics', href: '/campaign-analytics', icon: TrendingUp },
  { title: 'Message Templates', href: '/message-templates', icon: FileCode2 },
  { title: 'Reports & Exports', href: '/reports', icon: BarChart3 },
  { title: 'WhatsApp Cloud API', href: '/whatsapp-cloud-settings', icon: Cloud },
  { title: 'Meta Templates', href: '/meta-templates', icon: FileCode2 },
  { title: 'Inbound Inbox', href: '/inbound-messages', icon: Inbox },
  { title: 'Webhook Events', href: '/webhook-events', icon: Server },
  { title: 'Administrators', href: '/admins', icon: ShieldCheck },
  { title: 'Roles & RBAC', href: '/roles', icon: Shield },
  { title: 'Audit Trail', href: '/audit-logs', icon: FileText },
  { title: 'Active Sessions', href: '/sessions', icon: Laptop },
  { title: 'System Settings', href: '/system-settings', icon: Sliders },
  { title: 'WhatsApp Settings', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  // Prevent background scrolling when mobile/tablet drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Mobile/Tablet Backdrop Blur */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] lg:w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto shadow-xl lg:shadow-none h-full max-h-[100dvh]',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand / Logo Header */}
        <div className="h-16 flex items-center justify-between px-5 sm:px-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none truncate">
                PlacementAuto
              </h1>
              <span className="text-[11px] font-medium text-slate-400">Admin Console</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links with Smooth Scrolling */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overscroll-contain">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                )
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.title}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Card & Logout in Footer */}
        <div className="p-3 border-t border-slate-100 space-y-2 shrink-0 bg-white">
          {user && (
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 shrink-0 font-semibold text-xs">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={() => logout()}
                title="Logout"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 px-2 py-0.5 text-[10px] text-slate-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">Production Staging v1.0 • Verified</span>
          </div>
        </div>
      </aside>
    </>
  );
};
