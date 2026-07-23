import React, { useState } from 'react';
import { Plus, Trash2, AlertCircle, Search, ShieldAlert, Ban, MailX, UserMinus } from 'lucide-react';
import type { SuppressionItem } from '../services/api';

interface SuppressionProps {
  suppressions: SuppressionItem[];
  onAddSuppression?: (email: string, reason: SuppressionItem['reason']) => void;
  onRemoveSuppression?: (id: string, email: string) => void;
}

export const SuppressionManager: React.FC<SuppressionProps> = ({
  suppressions,
  onAddSuppression,
  onRemoveSuppression,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newReason, setNewReason] = useState<SuppressionItem['reason']>('manual');
  const [searchTerm, setSearchTerm] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    if (onAddSuppression) {
      onAddSuppression(newEmail, newReason);
    }
    setNewEmail('');
    setIsModalOpen(false);
  };

  const filtered = suppressions.filter(s => s.email.toLowerCase().includes(searchTerm.toLowerCase()));
  const bounceCount = suppressions.filter((item) => item.reason === 'bounce').length;
  const complaintCount = suppressions.filter((item) => item.reason === 'complaint').length;
  const unsubscribeCount = suppressions.filter((item) => item.reason === 'unsubscribe').length;
  const manualCount = suppressions.filter((item) => item.reason === 'manual').length;

  return (
    <div className="screen-page suppression-screen fade-in">

      <div className="screen-hero suppression-hero">
        <div>
          <span className="screen-kicker"><ShieldAlert size={14} /> Reputation guardrail</span>
          <h2>
            Suppression List
          </h2>
          <p>
            Manage blocked contacts, hard bounces, and spam complaints.
          </p>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <Plus size={16} /> Block Email
        </button>
      </div>

      <div className="suppression-insight-grid" aria-label="Suppression summary">
        <div className="suppression-insight-card featured">
          <span><Ban size={16} /> Total blocked</span>
          <strong>{suppressions.length}</strong>
          <small>Contacts excluded from every send</small>
        </div>
        <div className="suppression-insight-card">
          <span><MailX size={16} /> Hard bounces</span>
          <strong>{bounceCount}</strong>
          <small>Mailbox-level delivery failures</small>
        </div>
        <div className="suppression-insight-card warning">
          <span><AlertCircle size={16} /> Complaints</span>
          <strong>{complaintCount}</strong>
          <small>Reputation-sensitive events</small>
        </div>
        <div className="suppression-insight-card">
          <span><UserMinus size={16} /> Manual and opt-out</span>
          <strong>{manualCount + unsubscribeCount}</strong>
          <small>Admin blocks and unsubscribes</small>
        </div>
      </div>

      <div className="screen-panel">
        
        <div className="suppression-toolbar">
          <div className="search-shell">
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search blocked emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <span className="suppression-count">
            {filtered.length} entries found
          </span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ width: '30%' }}>Blocked Email</th>
              <th style={{ width: '20%' }}>Reason</th>
              <th style={{ width: '25%' }}>Timestamp</th>
              <th style={{ width: '25%', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                  No suppression records found.
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const reasonColor =
                  item.reason === 'bounce'
                    ? 'var(--error)'
                    : item.reason === 'complaint'
                    ? 'var(--warning)'
                    : 'var(--secondary)';

                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.email}</div>
                    </td>
                    <td>
                      <span className="badge-pill" style={{ background: item.reason === 'bounce' ? 'var(--error-light)' : item.reason === 'complaint' ? 'var(--warning-light)' : 'var(--secondary-light)', color: reasonColor, border: `1px solid ${reasonColor}33` }}>
                        <AlertCircle size={12} /> {item.reason.charAt(0).toUpperCase() + item.reason.slice(1)}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {item.dateAdded}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => onRemoveSuppression && onRemoveSuppression(item.id, item.email)}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--error)', borderColor: 'var(--border-color)' }}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'color-mix(in srgb, var(--ink) 24%, transparent)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="glass-panel"
            style={{
              width: '400px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: 'var(--shadow-dropdown)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)' }}>Block Email Address</h3>
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. baduser@domain.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="ui-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Reason
                </label>
                <select
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value as any)}
                  className="ui-input"
                  style={{ width: '100%' }}
                >
                  <option value="manual">Manual Admin Block</option>
                  <option value="unsubscribe">User Unsubscribed</option>
                  <option value="complaint">Spam Complaint</option>
                  <option value="bounce">Hard Bounce</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, background: 'var(--error)', borderColor: 'var(--error)' }}>
                  Block
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
