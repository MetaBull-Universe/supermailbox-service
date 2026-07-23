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
        <div className="sidebar-brand" style={{ justifyContent: collapsed ? 'center' : 'space-between', padding: collapsed ? '10px 0 14px 0' : '10px 16px 14px' }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="sidebar-logo" aria-hidden="true" style={{ background: 'transparent', padding: 0, width: '28px', height: '28px' }}>
                <img src="/logo.jpg" alt="GetAiPilot Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} />
              </div>
              <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--ink)' }}>SuperMail</span>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="sidebar-collapse-icon"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px', color: 'var(--ink)' }}><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
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
      </div>
    </aside>
  );
};
