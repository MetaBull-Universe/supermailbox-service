import React, { useState } from 'react';
import { Plus, Trash2, AlertCircle, Search } from 'lucide-react';
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
    onAddSuppression && onAddSuppression(newEmail, newReason);
    setNewEmail('');
    setIsModalOpen(false);
  };

  const filtered = suppressions.filter(s => s.email.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Suppression List
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Manage blocked contacts, hard bounces, and spam complaints.
          </p>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <Plus size={16} /> Block Email
        </button>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-subsurface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '6px 12px', width: '280px' }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search blocked emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.8125rem', width: '100%', color: 'var(--text-main)' }}
            />
          </div>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
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
            background: 'rgba(0, 0, 0, 0.2)',
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
