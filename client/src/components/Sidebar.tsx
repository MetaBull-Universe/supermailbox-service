import React from 'react';
import { Activity, FileCode, Users, ShieldAlert, ChevronLeft, ChevronRight, User, Layers } from 'lucide-react';

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
      icon: Activity,
    },
    {
      id: 'project_logs' as TabType,
      label: 'Project Logs',
      icon: Layers,
    },
    {
      id: 'templates' as TabType,
      label: 'Templates',
      icon: FileCode,
    },
    {
      id: 'campaigns' as TabType,
      label: 'Campaigns',
      icon: Users,
    },
    {
      id: 'contacts' as TabType,
      label: 'Audience',
      icon: ShieldAlert,
    },
  ];

  return (
    <aside
      className="sidebar-shell"
      style={{
        width: collapsed ? '80px' : '260px',
        transition: 'width 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 40,
        height: '100%',
        flexShrink: 0,
        background: '#ffffff',
        borderRadius: '32px',
        padding: '16px 0',
        border: 'none',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      <div>
        {/* Brand */}
        <div
          className="sidebar-brand"
          style={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            borderBottom: 'none',
            justifyContent: collapsed ? 'center' : 'flex-start'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
            <div
              className="sidebar-logo"
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                color: '#fff',
                fontSize: '1rem',
                flexShrink: 0
              }}
            >
              S
            </div>
            {!collapsed && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>SupermailBox</span>
                <span className="sidebar-brand-subtitle">Delivery control</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '16px 12px' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    textAlign: 'left',
                    width: '100%',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '16px',
                    marginBottom: '4px',
                    background: isActive ? 'var(--neutral)' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text-main)',
                    border: 'none',
                    boxShadow: 'none'
                  }}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={20} color={isActive ? '#ffffff' : 'var(--text-main)'} />
                  {!collapsed && (
                    <span style={{ fontWeight: 500, fontSize: '0.95rem', color: isActive ? '#ffffff' : 'var(--text-main)' }}>
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User Profile & Toggle */}
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {!collapsed && (
          <div
            className="sidebar-user"
            style={{
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer'
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                flexShrink: 0
              }}
            >
              <User size={16} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ color: 'var(--text-main)', fontWeight: 500, fontSize: '0.85rem' }}>
                Admin User
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Workspace
              </span>
            </div>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px',
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
          className="sidebar-collapse"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
};
