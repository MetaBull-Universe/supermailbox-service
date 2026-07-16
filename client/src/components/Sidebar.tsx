import React from 'react';
import { Activity, FileCode, Users, ShieldAlert, ChevronLeft, ChevronRight, User } from 'lucide-react';

export type TabType = 'dashboard' | 'templates' | 'campaigns' | 'contacts';

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
      style={{
        width: collapsed ? '72px' : '240px',
        background: 'var(--bg-app)',
        borderRight: '1px solid var(--border-color)',
        transition: 'width 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 40,
        height: '100vh',
        flexShrink: 0
      }}
    >
      <div>
        {/* Brand */}
        <div 
          style={{ 
            height: '64px', 
            display: 'flex', 
            alignItems: 'center', 
            padding: '0 20px',
            justifyContent: collapsed ? 'center' : 'flex-start'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '8px', 
                background: 'var(--primary)',
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
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: isActive ? 'var(--bg-surface)' : 'transparent',
                    color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                    border: '1px solid transparent',
                    borderColor: isActive ? 'var(--border-color)' : 'transparent',
                    boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                    width: '100%',
                    gap: '12px'
                  }}
                  title={collapsed ? item.label : undefined}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'var(--bg-surface)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <Icon size={18} color={isActive ? 'var(--text-main)' : 'var(--text-muted)'} />
                  {!collapsed && (
                    <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>
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
            style={{
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
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
            cursor: 'pointer',
            borderRadius: 'var(--radius-md)',
            transition: 'background 0.15s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
};
