import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MailCheck,
  Megaphone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

export type TabType = 'dashboard' | 'project_logs' | 'templates' | 'campaigns' | 'contacts';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
}) => {
  const navItems = [
    {
      id: 'dashboard' as TabType,
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'project_logs' as TabType,
      label: 'Project Logs',
      icon: ClipboardList,
    },
    {
      id: 'templates' as TabType,
      label: 'Templates',
      icon: FileText,
    },
    {
      id: 'campaigns' as TabType,
      label: 'Campaigns',
      icon: Megaphone,
    },
    {
      id: 'contacts' as TabType,
      label: 'Audience',
      icon: ShieldCheck,
    },
  ];

  return (
    <aside className={`sidebar-shell ${collapsed ? 'collapsed' : ''}`}>
      <div>
        <div className="sidebar-brand">
          <div className="sidebar-logo" aria-hidden="true">
            <MailCheck size={18} strokeWidth={2.4} />
          </div>
          {!collapsed && (
            <div className="sidebar-brand-copy">
              <span>SupermailBox</span>
              <small>Delivery control</small>
            </div>
          )}
        </div>

        <div className="sidebar-nav-shell">
          <nav className="sidebar-nav" aria-label="Primary navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={19} strokeWidth={2.1} />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="sidebar-footer">
        {!collapsed && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              <UserRound size={16} />
            </div>
            <div className="sidebar-user-copy">
              <span>Admin User</span>
              <small>Workspace</small>
            </div>
            <span className="sidebar-status-dot" aria-label="Online" />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="sidebar-collapse"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
};
