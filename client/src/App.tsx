import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Sidebar, type TabType } from './components/Sidebar';
import { DashboardQueueMonitor } from './pages/DashboardQueueMonitor';
import { ProjectLogsViewer } from './pages/ProjectLogsViewer';
import { TemplateBuilder } from './pages/TemplateBuilder';
import { SegmentBuilder } from './pages/SegmentBuilder';
import { SuppressionManager } from './pages/SuppressionManager';
import { ApiService } from './services/api';
import type { MetricCardData, QueueJob, ActivityLog, Template, Campaign, SuppressionItem, BounceReportItem } from './services/api';
import './App.css';

gsap.registerPlugin(useGSAP);

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.matchMedia('(max-width: 840px)').matches);
  const mainRef = useRef<HTMLElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

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

  useGSAP(() => {
    const root = mainRef.current;
    if (!root || shouldReduceMotion) return;

    const targets = root.querySelectorAll('.dashboard-command-hero, .screen-hero, .project-logs-hero, .dashboard-kpi-card');

    gsap.fromTo(
      targets,
      { autoAlpha: 0, y: 10 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.28,
        ease: 'power3.out',
        stagger: 0.035,
        overwrite: true,
      }
    );

    return () => gsap.killTweensOf(targets);
  }, { scope: mainRef, dependencies: [activeTab, loading, shouldReduceMotion], revertOnUpdate: true });

  useEffect(() => {
    const root = mainRef.current;
    if (!root || shouldReduceMotion) return;

    const items = root.querySelectorAll<HTMLElement>(
      '.dashboard-status-stack > div, .dashboard-health-list > div, .dashboard-job-row, tbody tr'
    );
    items.forEach((item) => item.classList.add('io-reveal'));

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [activeTab, loading, shouldReduceMotion]);

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
    const savedItem = await ApiService.addSuppression(email, reason);
    if (savedItem) {
      setSuppressions((prev) => [savedItem, ...prev.filter((item) => item.id !== savedItem.id)]);
    }
  };

  const handleRemoveSuppression = async (id: string) => {
    const removed = await ApiService.removeSuppression(id);
    if (removed) {
      setSuppressions((prev) => prev.filter((s) => s.id !== id));
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
        <main className="app-main" ref={mainRef}>
          {loading ? (
            <div className="app-loading">
              <div className="spin-loader" />
              <p>Synchronizing CPaaS data streams...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                className="app-page-motion"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
              >
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
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  );
};
export default App;
