import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Ban,
  BarChart3,
  ExternalLink,
  HardDriveDownload,
  MailX,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  TrendingDown,
  X
} from 'lucide-react';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { BounceReportItem, SuppressionItem } from '../services/api';

interface SuppressionProps {
  suppressions: SuppressionItem[];
  bounceReports: BounceReportItem[];
  onAddSuppression?: (email: string, reason: SuppressionItem['reason']) => void;
  onRemoveSuppression?: (id: string, email: string) => void;
}

type ReportTab = 'overview' | 'bounces' | 'suppression';
type BounceFilter = 'all' | 'hard' | 'soft';

const BOUNCE_COLORS = {
  hard: '#D96767',
  soft: '#D99745',
  total: '#5263D8',
  suppressed: '#1F6F5B',
  complaint: '#C026D3',
  manual: '#7BAEF2'
};

const toDateKey = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const buildAudienceWeek = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - index));
    return {
      key: toDateKey(day),
      label: day.toLocaleDateString(undefined, { day: 'numeric' }),
      month: day.toLocaleDateString(undefined, { month: 'long' }),
      total: 0,
      hard: 0,
      soft: 0,
      suppressed: 0,
      complaint: 0,
      manual: 0
    };
  });
};

const getReasonColor = (reason: SuppressionItem['reason']) => {
  if (reason === 'bounce') return 'var(--error)';
  if (reason === 'complaint') return 'var(--warning)';
  return 'var(--secondary)';
};

const getCategoryDescription = (category?: string) => {
  const descriptions: Record<string, string> = {
    'Connection issue': 'This category covers temporary network or recipient-server availability problems. These should be watched before blocking the recipient.',
    'Domain not found': 'These bounces happen when the recipient domain cannot be resolved. They are usually permanent and should stay suppressed.',
    'Over quota': 'The mailbox exists, but it cannot accept mail because storage is full or quota limits were reached.',
    'User not found': 'The recipient address does not exist at the destination server. These are permanent failures.',
    'Policy failure': 'The recipient server rejected delivery because of policy, reputation, size, or content rules.'
  };

  return descriptions[category || ''] || 'These bounce records share the same delivery failure category.';
};

const getCategoryColor = (index: number) => ['#6F5570', '#1F6F5B', '#D96767', '#D99745', '#769181'][index % 5];

export const SuppressionManager: React.FC<SuppressionProps> = ({
  suppressions = [],
  bounceReports = [],
  onAddSuppression,
  onRemoveSuppression,
}) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('bounces');
  const [bounceFilter, setBounceFilter] = useState<BounceFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [emailDialogCategory, setEmailDialogCategory] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newReason, setNewReason] = useState<SuppressionItem['reason']>('manual');

  const hardBounces = bounceReports.filter((item) => item.bounceType === 'hard');
  const softBounces = bounceReports.filter((item) => item.bounceType === 'soft');
  const complaintCount = suppressions.filter((item) => item.reason === 'complaint').length;
  const unsubscribeCount = suppressions.filter((item) => item.reason === 'unsubscribe').length;
  const manualCount = suppressions.filter((item) => item.reason === 'manual').length;
  const hardBounceRate = bounceReports.length > 0 ? (hardBounces.length / bounceReports.length) * 100 : 0;

  const typeFilteredBounces = bounceReports.filter((item) => bounceFilter === 'all' || item.bounceType === bounceFilter);

  const categoryData = useMemo(() => {
    const grouped = typeFilteredBounces.reduce<Record<string, { name: string; value: number; hard: number; soft: number; color: string }>>((acc, item) => {
      const category = item.category || 'Uncategorized';
      acc[category] ??= { name: category, value: 0, hard: 0, soft: 0, color: '#769181' };
      acc[category].value += 1;
      acc[category][item.bounceType] += 1;
      return acc;
    }, {});

    return Object.values(grouped)
      .sort((a, b) => b.value - a.value)
      .map((item, index) => ({ ...item, color: getCategoryColor(index) }));
  }, [typeFilteredBounces]);

  const audienceTrendData = useMemo(() => {
    const buckets = new Map(buildAudienceWeek().map((day) => [day.key, day]));

    bounceReports.forEach((item) => {
      const bucket = buckets.get(toDateKey(item.processedAt));
      if (!bucket) return;
      bucket.total += 1;
      bucket[item.bounceType] += 1;
    });

    suppressions.forEach((item) => {
      const bucket = buckets.get(toDateKey(item.dateAdded));
      if (!bucket) return;
      bucket.suppressed += 1;
      if (item.reason === 'complaint') bucket.complaint += 1;
      if (item.reason === 'manual' || item.reason === 'unsubscribe') bucket.manual += 1;
    });

    return Array.from(buckets.values()).reduce<Array<ReturnType<typeof buildAudienceWeek>[number]>>((acc, day) => {
      const previous = acc[acc.length - 1];
      acc.push({
        ...day,
        total: day.total + (previous?.total || 0),
        hard: day.hard + (previous?.hard || 0),
        soft: day.soft + (previous?.soft || 0),
        suppressed: day.suppressed + (previous?.suppressed || 0),
        complaint: day.complaint + (previous?.complaint || 0),
        manual: day.manual + (previous?.manual || 0)
      });
      return acc;
    }, []);
  }, [bounceReports, suppressions]);

  const audienceTotals = audienceTrendData[audienceTrendData.length - 1] || {
    total: 0,
    hard: 0,
    soft: 0,
    suppressed: 0,
    complaint: 0,
    manual: 0,
    month: ''
  };

  const audienceLegend = [
    { key: 'total', label: 'All bounces', value: audienceTotals.total, color: BOUNCE_COLORS.total },
    { key: 'soft', label: 'Soft bounces', value: audienceTotals.soft, color: BOUNCE_COLORS.soft },
    { key: 'hard', label: 'Hard bounces', value: audienceTotals.hard, color: BOUNCE_COLORS.hard, suffix: hardBounceRate > 0 ? `(${hardBounceRate.toFixed(2)}%)` : '' },
    { key: 'suppressed', label: 'Suppressed', value: audienceTotals.suppressed, color: BOUNCE_COLORS.suppressed },
    { key: 'complaint', label: 'Complaints', value: audienceTotals.complaint, color: BOUNCE_COLORS.complaint },
    { key: 'manual', label: 'Manual / opt-out', value: audienceTotals.manual, color: BOUNCE_COLORS.manual },
  ];

  const selectedCategoryName = categoryFilter === 'all' ? categoryData[0]?.name : categoryFilter;
  const selectedCategoryRecords = typeFilteredBounces.filter((item) => item.category === selectedCategoryName);
  const selectedCategoryReasons = Object.values(selectedCategoryRecords.reduce<Record<string, { name: string; value: number }>>((acc, item) => {
    const reason = item.category === 'Connection issue' ? 'Host not reachable' : item.category;
    acc[reason] ??= { name: reason || 'Uncategorized', value: 0 };
    acc[reason].value += 1;
    return acc;
  }, {}));

  const dialogRecords = bounceReports.filter((item) => {
    const matchesCategory = emailDialogCategory === 'all' || item.category === emailDialogCategory;
    const haystack = `${item.email} ${item.subject} ${item.reason} ${item.category}`.toLowerCase();
    return matchesCategory && haystack.includes(searchTerm.toLowerCase());
  });

  const filteredSuppressions = suppressions.filter((item) => {
    const haystack = `${item.email} ${item.reason}`.toLowerCase();
    return haystack.includes(searchTerm.toLowerCase());
  });

  const selectedCategory = categoryFilter === 'all' ? categoryData[0] : categoryData.find((item) => item.name === categoryFilter);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    onAddSuppression?.(newEmail, newReason);
    setNewEmail('');
    setIsModalOpen(false);
  };

  return (
    <div className="screen-page suppression-screen fade-in">
      <div className="screen-hero suppression-hero" style={{ background: '#ffffff url(/bg2.jpg) no-repeat center center', backgroundSize: 'cover' }}>
        <div>
          <span className="screen-kicker" style={{ color: '#60a5fa' }}><ShieldAlert size={14} /> Reputation analytics</span>
          <h2 style={{ color: '#ffffff' }}>Bounce and suppression reports</h2>
          <p style={{ color: 'rgba(255,255,255,0.85)' }}>Review soft bounces, hard bounces, and the contacts blocked from future sends.</p>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <Plus size={16} /> Block Email
        </button>
      </div>

      <div className="reputation-tabs" aria-label="Reputation report views">
        <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={activeTab === 'bounces' ? 'active' : ''} onClick={() => setActiveTab('bounces')}>Bounce reports</button>
        <button className={activeTab === 'suppression' ? 'active' : ''} onClick={() => setActiveTab('suppression')}>Suppression list</button>
      </div>

      <div className="suppression-insight-grid" aria-label="Reputation summary">
        <div className="suppression-insight-card featured">
          <span><BarChart3 size={16} /> Total bounces</span>
          <strong>{bounceReports.length}</strong>
          <small>Hard and soft failures from ZeptoMail</small>
        </div>
        <div className="suppression-insight-card warning">
          <span><MailX size={16} /> Hard bounces</span>
          <strong>{hardBounces.length}</strong>
          <small>Permanent failures added to suppression</small>
        </div>
        <div className="suppression-insight-card">
          <span><TrendingDown size={16} /> Soft bounces</span>
          <strong>{softBounces.length}</strong>
          <small>Temporary delivery failures to watch</small>
        </div>
        <div className="suppression-insight-card">
          <span><Ban size={16} /> Suppressed</span>
          <strong>{suppressions.length}</strong>
          <small>{complaintCount} complaints, {manualCount + unsubscribeCount} manual or opt-out</small>
        </div>
      </div>

      {activeTab !== 'suppression' && (
        <div className="screen-panel audience-tracker-panel">
          <div className="audience-tracker-header">
            <div>
              <span>Audience analysis</span>
              <h3>Last 7 days bounce and suppression tracker</h3>
            </div>
            <div className="audience-tracker-controls">
              <div className="bounce-type-toggle" aria-label="Bounce type filter">
                {(['all', 'hard', 'soft'] as BounceFilter[]).map((type) => (
                  <button key={type} className={bounceFilter === type ? 'active' : ''} onClick={() => setBounceFilter(type)}>
                    {type === 'all' ? 'All' : `${type.charAt(0).toUpperCase()}${type.slice(1)}`}
                  </button>
                ))}
              </div>
              <select className="audience-range-select" defaultValue="7">
                <option value="7">Last 7 days</option>
              </select>
            </div>
          </div>

          <div className="audience-tracker-layout">
            <div className="audience-tracker-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={audienceTrendData} margin={{ top: 8, right: 18, left: -8, bottom: 8 }}>
                  <CartesianGrid stroke="rgba(119, 124, 120, 0.18)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={34} />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" stroke={BOUNCE_COLORS.total} strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="hard" stroke={BOUNCE_COLORS.hard} strokeWidth={2.6} dot={false} />
                  <Line type="monotone" dataKey="soft" stroke={BOUNCE_COLORS.soft} strokeWidth={2.6} dot={false} />
                  <Line type="monotone" dataKey="suppressed" stroke={BOUNCE_COLORS.suppressed} strokeWidth={2.6} dot={false} />
                  <Line type="monotone" dataKey="complaint" stroke={BOUNCE_COLORS.complaint} strokeWidth={2.2} dot={false} />
                  <Line type="monotone" dataKey="manual" stroke={BOUNCE_COLORS.manual} strokeWidth={2.2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <span className="audience-month-label">{audienceTotals.month}</span>
            </div>

            <div className="audience-tracker-legend">
              {audienceLegend.map((item) => (
                <div key={item.key}>
                  <span><b style={{ background: item.color }} /> {item.label}</span>
                  <strong>{item.value}</strong>
                  {item.suffix ? <em>{item.suffix}</em> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="screen-panel bounce-explainer">
          <HardDriveDownload size={18} />
          <div>
            <h3>Hard bounces become suppressions. Soft bounces stay visible here.</h3>
            <p>Use this report to spot temporary mailbox issues without blocking valid contacts too early.</p>
          </div>
        </div>
      )}

      {activeTab === 'bounces' && (
        <div className="bounce-classification-shell">
          <aside className="bounce-category-rail" aria-label="Bounce categories">
            {categoryData.length === 0 ? (
              <div className="reputation-empty compact">No categories found.</div>
            ) : (
              categoryData.map((item) => {
                const percent = typeFilteredBounces.length > 0 ? ((item.value / typeFilteredBounces.length) * 100).toFixed(2) : '0.00';
                return (
                  <button
                    key={item.name}
                    className={selectedCategoryName === item.name ? 'active' : ''}
                    onClick={() => setCategoryFilter(item.name)}
                  >
                    <span><b style={{ background: item.color }} /> {item.name}</span>
                    <em>{percent}%</em>
                    <strong>{item.value}</strong>
                  </button>
                );
              })
            )}
          </aside>

          <div className="screen-panel bounce-category-detail">
            <div className="bounce-detail-header">
              <h3>{selectedCategory?.name || 'No category selected'}</h3>
              <button
                className="link-button"
                onClick={() => setEmailDialogCategory(selectedCategory?.name || 'all')}
                disabled={!selectedCategory}
              >
                View emails <ExternalLink size={14} />
              </button>
            </div>

            {selectedCategory ? (
              <div className="bounce-detail-body">
                <div className="category-donut-block">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={[selectedCategory]}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={48}
                        outerRadius={68}
                        startAngle={90}
                        endAngle={450}
                      >
                        <Cell fill={selectedCategory.color} />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="category-donut-label">
                    <strong>{selectedCategory.value}</strong>
                    <span>Total</span>
                  </div>
                </div>

                <div className="category-reason-list">
                  {selectedCategoryReasons.map((item) => (
                    <span key={item.name}>
                      <b style={{ background: selectedCategory.color }} />
                      {item.name}
                      <strong>{item.value}</strong>
                    </span>
                  ))}
                </div>

                <div className="category-help-card">
                  <div>
                    <h4>{selectedCategory.name}</h4>
                  </div>
                  <p>{getCategoryDescription(selectedCategory.name)}</p>
                </div>
              </div>
            ) : (
              <div className="reputation-empty">No bounce classifications found.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'suppression' && (
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
            <span className="suppression-count">{filteredSuppressions.length} entries found</span>
          </div>
          <table className="reputation-table">
            <thead>
              <tr>
                <th>Blocked email</th>
                <th>Reason</th>
                <th>Timestamp</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppressions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="reputation-empty">No suppression records found.</td>
                </tr>
              ) : (
                filteredSuppressions.map((item) => {
                  const reasonColor = getReasonColor(item.reason);
                  return (
                    <tr key={item.id}>
                      <td><strong>{item.email}</strong></td>
                      <td>
                        <span className="badge-pill" style={{ background: item.reason === 'bounce' ? 'var(--error-light)' : item.reason === 'complaint' ? 'var(--warning-light)' : 'var(--secondary-light)', color: reasonColor, border: `1px solid ${reasonColor}33` }}>
                          <AlertCircle size={12} /> {item.reason.charAt(0).toUpperCase() + item.reason.slice(1)}
                        </span>
                      </td>
                      <td className="mono-cell">{item.dateAdded}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => onRemoveSuppression?.(item.id, item.email)}
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
      )}

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
                />
              </div>

              <label>
                Reason
                <select value={newReason} onChange={(e) => setNewReason(e.target.value as SuppressionItem['reason'])} className="ui-input">
                  <option value="manual">Manual Admin Block</option>
                  <option value="unsubscribe">User Unsubscribed</option>
                  <option value="complaint">Spam Complaint</option>
                  <option value="bounce">Hard Bounce</option>
                </select>
              </label>

              <div>
                <button type="submit" className="btn-primary">Block</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {emailDialogCategory && (
        <div className="modal-backdrop analytics-dialog-backdrop" onClick={() => setEmailDialogCategory(null)}>
          <div className="analytics-email-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="analytics-dialog-search">
              <div className="search-shell">
                <Search size={16} color="var(--text-main)" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <span>Date & Time&nbsp; 22/07/2026</span>
              <span>Bounce category&nbsp; {emailDialogCategory === 'all' ? 'All' : emailDialogCategory}</span>
              <button onClick={() => setSearchTerm('')}>Clear</button>
              <button className="dialog-close" onClick={() => setEmailDialogCategory(null)} aria-label="Close bounce email results">
                <X size={18} />
              </button>
            </div>

            <div className="analytics-dialog-header">
              <h3>Search results</h3>
              <div>
                <button className="link-button"><ExternalLink size={14} /> Export</button>
                <select className="agent-select" defaultValue="all">
                  <option value="all">All Agents</option>
                </select>
              </div>
            </div>

            <div className="analytics-dialog-table-wrap">
              <table className="reputation-table analytics-dialog-table">
                <thead>
                  <tr>
                    <th>From</th>
                    <th>To</th>
                    <th>Date & Time</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {dialogRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="reputation-empty">No emails found for this category.</td>
                    </tr>
                  ) : (
                    dialogRecords.map((item) => (
                      <tr key={item.id}>
                        <td>support@getaipilot.com</td>
                        <td>{item.email}</td>
                        <td>{item.displayTime}</td>
                        <td>{item.subject}</td>
                        <td>
                          <span className={`dialog-status ${item.bounceType}`}>
                            {item.bounceType === 'hard' ? 'Hard bounce' : 'Soft bounce'}
                          </span>
                        </td>
                        <td><button className="btn-secondary compact">View Details</button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="analytics-dialog-shortcuts">
              <span>Enter</span> Search <span>ctrl</span><span>k</span> Open <span>esc</span> Close
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
