import React, { useState, useEffect } from 'react';
import { Sidebar, type TabType } from './components/Sidebar';
import { DashboardQueueMonitor } from './pages/DashboardQueueMonitor';
import { ProjectLogsViewer } from './pages/ProjectLogsViewer';
import { TemplateBuilder } from './pages/TemplateBuilder';
import { SegmentBuilder } from './pages/SegmentBuilder';
import { SuppressionManager } from './pages/SuppressionManager';
import { ApiService } from './services/api';
import type { MetricCardData, QueueJob, ActivityLog, Template, Campaign, SuppressionItem, BounceReportItem } from './services/api';
import './App.css';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // App Data State
  const [metrics, setMetrics] = useState<MetricCardData[]>([]);
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [suppressions, setSuppressions] = useState<SuppressionItem[]>([]);
  const [bounceReports, setBounceReports] = useState<BounceReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, j, l, t, c, s, b] = await Promise.all([
        ApiService.getMetrics(),
        ApiService.getQueueJobs(),
        ApiService.getActivityLogs(),
        ApiService.getTemplates(),
        ApiService.getCampaigns(),
        ApiService.getSuppressions(),
        ApiService.getBounceReports(),
      ]);
      setMetrics(m);
      setJobs(j);
      setLogs(l);
      setTemplates(t);
      setCampaigns(c);
      setSuppressions(s);
      setBounceReports(b);
    } catch (err) {
      console.error('Telemetry fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePromoteVersion = (templateKey: string, versionName: string) => {
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.key !== templateKey) return t;
        const updatedVer = t.versions.map((v) =>
          v.version === versionName
            ? { ...v, status: 'Live' as const }
            : { ...v, status: v.status === 'Live' ? ('Approved' as const) : v.status }
        );
        return { ...t, versions: updatedVer };
      })
    );
  };

  const handleSaveDraft = async (templateKey: string, subject: string, html: string) => {
    const tmpl = templates.find(t => t.key === templateKey);
    if (tmpl) {
      await ApiService.saveTemplate({
        key: templateKey,
        name: tmpl.name,
        category: tmpl.category,
        html,
        subject
      });
      
      const freshTemplates = await ApiService.getTemplates();
      if (freshTemplates && freshTemplates.length > 0) {
        setTemplates(freshTemplates);
      }
    }
  };

  const handleCreateTemplate = (newTmpl: Template) => {
    setTemplates((prev) => [newTmpl, ...prev]);
  };

  const handleLaunchCampaign = (name: string, templateKey: string, scheduledAt?: string) => {
    const newCamp: Campaign = {
      id: `camp_${Math.floor(100 + Math.random() * 900)}`,
      name,
      templateKey,
      audienceCount: 1840,
      sentCount: scheduledAt ? 0 : 1840,
      deliveredRate: scheduledAt ? 0 : 99.2,
      openRate: scheduledAt ? 0 : 12.5,
      status: scheduledAt ? 'scheduled' : 'active',
      scheduledAt
    };
    setCampaigns([newCamp, ...campaigns]);
  };

  const handleAddSuppression = async (email: string, reason: SuppressionItem['reason']) => {
    try {
      const savedItem = await ApiService.addSuppression(email, reason);
      if (savedItem) {
        setSuppressions((prev) => [savedItem, ...prev.filter((item) => item.id !== savedItem.id)]);
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Unable to add suppression');
    }
  };

  const handleRemoveSuppression = async (id: string) => {
    try {
      const removed = await ApiService.removeSuppression(id);
      if (removed) {
        setSuppressions((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Unable to remove suppression');
    }
  };

  return (
    <div className="app-shell">
      {/* Collapsible Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Workspace Content */}
      <div className="app-workspace">

        {/* Dynamic Screen Viewport */}
        <main className="app-main">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
              <div className="spin-loader" style={{ width: '40px', height: '40px' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Synchronizing CPaaS data streams...</p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardQueueMonitor
                  metrics={metrics}
                  jobs={jobs}
                  logs={logs}
                  onRefresh={loadData}
                />
              )}
              {activeTab === 'project_logs' && (
                <ProjectLogsViewer />
              )}
              {activeTab === 'templates' && (
                <TemplateBuilder
                  templates={templates}
                  onPromoteVersion={handlePromoteVersion}
                  onSaveDraft={handleSaveDraft}
                  onCreateTemplate={handleCreateTemplate}
                />
              )}
              {activeTab === 'campaigns' && (
                <SegmentBuilder
                  campaigns={campaigns}
                  templates={templates}
                  onLaunchCampaign={handleLaunchCampaign}
                />
              )}
              {activeTab === 'contacts' && (
                <SuppressionManager
                  suppressions={suppressions}
                  bounceReports={bounceReports}
                  onAddSuppression={handleAddSuppression}
                  onRemoveSuppression={handleRemoveSuppression}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
export default App;
