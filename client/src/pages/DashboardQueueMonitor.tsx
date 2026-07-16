import React, { useState } from 'react';
import { Send, AlertTriangle, Eye, Search, ChevronLeft, ChevronRight, X, Terminal, Activity, Layers, Zap } from 'lucide-react';
import type { MetricCardData, QueueJob, ActivityLog } from '../services/api';

interface DashboardProps {
  metrics: MetricCardData[];
  jobs: QueueJob[];
  logs: ActivityLog[];
  onRefresh: () => void;
}

export const DashboardQueueMonitor: React.FC<DashboardProps> = ({
  metrics,
  jobs,
  logs,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<QueueJob | null>(null);
  const itemsPerPage = 8;

  const filteredLogs = logs.filter((l) =>
    l.recipient.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Queue Status section temporarily removed

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      {/* Overview Bento Box */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '16px', letterSpacing: '-0.02em' }}>
          Overview
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {metrics.map((m, i) => (
            <div key={i} className="metric-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {m.title}
                </span>
                {i === 0 && <Activity size={16} color="var(--secondary)" />}
                {i === 1 && <Send size={16} color="var(--primary)" />}
                {i === 2 && <AlertTriangle size={16} color="var(--error)" />}
                {i === 3 && <Eye size={16} color="var(--tertiary)" />}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
                {m.value}
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                {m.subtitle}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dense Logs Table */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Dispatch Logs
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '6px 12px', background: 'var(--bg-surface)' }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search recipient..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-main)',
                fontSize: '0.8125rem',
                width: '200px'
              }}
            />
          </div>
        </div>

        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Recipient</th>
                <th>Type</th>
                <th>Provider</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    No logs found.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {log.timestamp}
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {log.recipient}
                    </td>
                    <td>
                      <span className="badge-pill badge-neutral">
                        {log.type}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {log.provider}
                    </td>
                    <td>
                      <span className={log.status === 'Sent' || log.status === 'Delivered' ? 'badge-pill badge-success' : 'badge-pill badge-error'}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-subsurface)', borderTop: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8125rem' }}
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8125rem' }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Inspector Drawer */}
      {selectedJob && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.2)',
            zIndex: 100,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setSelectedJob(null)}
        >
          <div
            style={{
              width: '480px',
              maxWidth: '90vw',
              background: 'var(--bg-surface)',
              borderLeft: '1px solid var(--border-color)',
              height: '100%',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-dropdown)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)' }}>Job Inspector</h3>
              <button onClick={() => setSelectedJob(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '4px' }}>Job ID</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{selectedJob.id}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '4px' }}>Recipient</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>{selectedJob.recipient}</div>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '8px' }}>
                Payload & Trace
              </div>
              <pre
                style={{
                  background: 'var(--bg-subsurface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  fontSize: '0.8125rem',
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-mono)',
                  overflow: 'auto',
                  flex: 1
                }}
              >
                {JSON.stringify(
                  {
                    id: selectedJob.id,
                    recipient: selectedJob.recipient,
                    status: selectedJob.status,
                    trace: ['Error: Timeout during SMTP handshake', 'at sendEmail (mailer.js:142:15)']
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
