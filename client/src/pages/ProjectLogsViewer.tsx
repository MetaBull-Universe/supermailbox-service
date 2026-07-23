import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Clock3, Mail, RefreshCw, Server, ShieldCheck } from 'lucide-react';
import { ApiService, type ActivityLog } from '../services/api';

export const ProjectLogsViewer: React.FC = () => {
  const [projectLogs, setProjectLogs] = useState<Record<string, ActivityLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const logs = await ApiService.getProjectLogs();
      setProjectLogs(logs);
      if (Object.keys(logs).length > 0) {
        setSelectedProject(Object.keys(logs)[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const projects = Object.keys(projectLogs);
  const selectedLogs = projectLogs[selectedProject] || [];
  const allLogs = Object.values(projectLogs).flat();
  const deliveredCount = allLogs.filter((log) => log.status === 'Delivered' || log.status === 'Sent').length;
  const failedCount = allLogs.filter((log) => log.status === 'Failed' || log.status === 'Bounced').length;
  const queuedCount = allLogs.filter((log) => log.status === 'Queued').length;
  const projectCount = projects.filter((project) => (projectLogs[project] || []).length > 0).length;

  const formatProjectName = (project: string) =>
    project
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const getStatusClass = (status: ActivityLog['status']) => {
    if (status === 'Delivered' || status === 'Sent') return 'project-logs-status success';
    if (status === 'Failed' || status === 'Bounced') return 'project-logs-status danger';
    return 'project-logs-status neutral';
  };

  const getProjectLogo = (proj: string) => {
    const lower = (proj || '').toLowerCase();
    if (lower.includes('whatsapp')) return 'https://wb.getaipilot.in/logo.png';
    if (lower.includes('social')) return 'https://social.getaipilot.in/logo.png';
    return 'https://getaipilot.in/logo.png';
  };

  return (
    <section className="project-logs-page fade-in">
      <div className="project-logs-hero" style={{ background: '#ffffff url(/bg2.jpg) no-repeat center center', backgroundSize: 'cover' }}>
        <div className="project-logs-hero-copy">
          <span className="project-logs-kicker" style={{ color: '#60a5fa' }}>
            <Server size={14} />
            Multi-project mail stream
          </span>
          <h2 style={{ color: '#ffffff' }}>Project Emails</h2>
          <p style={{ color: 'rgba(255,255,255,0.85)' }}>Track transactional and campaign mail by source project, recipient, provider, and delivery state.</p>
        </div>
        <button className="project-logs-refresh" onClick={fetchLogs} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'project-logs-refreshing' : ''} />
          {loading ? 'Refreshing' : 'Refresh'}
        </button>
      </div>

      <div className="project-logs-stats">
        <div className="project-logs-stat" style={{ flexDirection: 'row', alignItems: 'center', padding: '12px 16px', minHeight: 'auto', gap: '16px' }}>
          <div className="project-logs-stat-header" style={{ width: 'auto', justifyContent: 'flex-start', gap: '12px' }}>
            <div className="project-logs-stat-icon dark" style={{ width: '36px', height: '36px' }}>
              <Mail size={16} />
            </div>
            <span style={{ fontSize: '0.9rem' }}>Total emails</span>
          </div>
          <div className="project-logs-stat-value" style={{ marginLeft: 'auto' }}>
            <strong style={{ fontSize: '1.5rem' }}>{allLogs.length}</strong>
          </div>
        </div>
        <div className="project-logs-stat" style={{ flexDirection: 'row', alignItems: 'center', padding: '12px 16px', minHeight: 'auto', gap: '16px' }}>
          <div className="project-logs-stat-header" style={{ width: 'auto', justifyContent: 'flex-start', gap: '12px' }}>
            <div className="project-logs-stat-icon green" style={{ width: '36px', height: '36px' }}>
              <CheckCircle2 size={16} />
            </div>
            <span style={{ fontSize: '0.9rem' }}>Sent or delivered</span>
          </div>
          <div className="project-logs-stat-value" style={{ marginLeft: 'auto' }}>
            <strong style={{ fontSize: '1.5rem' }}>{deliveredCount}</strong>
          </div>
        </div>
        <div className="project-logs-stat" style={{ flexDirection: 'row', alignItems: 'center', padding: '12px 16px', minHeight: 'auto', gap: '16px' }}>
          <div className="project-logs-stat-header" style={{ width: 'auto', justifyContent: 'flex-start', gap: '12px' }}>
            <div className="project-logs-stat-icon amber" style={{ width: '36px', height: '36px' }}>
              <Clock3 size={16} />
            </div>
            <span style={{ fontSize: '0.9rem' }}>Queued</span>
          </div>
          <div className="project-logs-stat-value" style={{ marginLeft: 'auto' }}>
            <strong style={{ fontSize: '1.5rem' }}>{queuedCount}</strong>
          </div>
        </div>
        <div className="project-logs-stat" style={{ flexDirection: 'row', alignItems: 'center', padding: '12px 16px', minHeight: 'auto', gap: '16px' }}>
          <div className="project-logs-stat-header" style={{ width: 'auto', justifyContent: 'flex-start', gap: '12px' }}>
            <div className="project-logs-stat-icon red" style={{ width: '36px', height: '36px' }}>
              <AlertCircle size={16} />
            </div>
            <span style={{ fontSize: '0.9rem' }}>Failed or bounced</span>
          </div>
          <div className="project-logs-stat-value" style={{ marginLeft: 'auto' }}>
            <strong style={{ fontSize: '1.5rem' }}>{failedCount}</strong>
          </div>
        </div>
      </div>

      <div className="project-logs-shell">
        {loading && projects.length === 0 ? (
          <div className="project-logs-loading">
            <div className="spin-loader" />
            <p>Loading project mail activity...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="project-logs-empty">
            <ShieldCheck size={34} />
            <h3>No project emails yet</h3>
            <p>Send a transactional email or campaign and it will appear here grouped by project.</p>
          </div>
        ) : (
          <div className="project-logs-grid">
            <aside className="project-logs-projects" aria-label="Projects">
              <div className="project-logs-projects-header">
                <span>Projects</span>
                <strong>{projectCount}</strong>
              </div>
              {projects.map((proj) => (
                <button
                  key={proj}
                  onClick={() => setSelectedProject(proj)}
                  className={`project-logs-project-button ${selectedProject === proj ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={getProjectLogo(proj)} alt={proj} style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'contain' }} />
                    <span>
                      <strong>{formatProjectName(proj)}</strong>
                      <small>{proj}</small>
                    </span>
                  </div>
                  <b>{projectLogs[proj].length}</b>
                </button>
              ))}
            </aside>

            <div className="project-logs-table-panel">
              <div className="project-logs-table-title">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src={getProjectLogo(selectedProject)} alt={selectedProject} style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'contain' }} />
                  <div>
                    <span>Selected stream</span>
                    <h3>{formatProjectName(selectedProject)}</h3>
                  </div>
                </div>
                <strong>{selectedLogs.length} emails</strong>
              </div>

              <div className="project-logs-table-wrap">
                <table className="project-logs-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Recipient</th>
                      <th>Type</th>
                      <th>Provider</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLogs.map((log, idx) => (
                      <tr key={log.id || idx}>
                        <td>
                          <span className={getStatusClass(log.status)}>
                            {log.status}
                          </span>
                        </td>
                        <td>
                          <span className="project-logs-recipient">{log.recipient}</span>
                        </td>
                        <td><span className="project-logs-type">{log.type}</span></td>
                        <td className="project-logs-muted">{log.provider}</td>
                        <td className="project-logs-muted">{new Date(log.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                    {selectedLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="project-logs-table-empty">
                          No emails found for {selectedProject}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
