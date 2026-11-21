import React from 'react';
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

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand / Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
                PlacementAuto
              </h1>
              <span className="text-[11px] font-medium text-slate-400">Admin Console</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                )
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.title}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Card & Logout in Footer */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          {user && (
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={() => logout()}
                title="Logout"
                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-white"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 px-2 py-1 text-[11px] text-slate-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Module 2: Auth & Dashboard</span>
          </div>
        </div>
      </aside>
    </>
  );
};
