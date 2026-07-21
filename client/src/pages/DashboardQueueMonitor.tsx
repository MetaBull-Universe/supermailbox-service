import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  MailCheck,
  MailWarning,
  RefreshCw,
  Search,
  ServerCog,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ActivityLog, MetricCardData, QueueJob } from '../services/api';

const fallbackTrendData = [
  { name: 'Mon', volume: 4180, delivered: 4012, failed: 38 },
  { name: 'Tue', volume: 3620, delivered: 3474, failed: 31 },
  { name: 'Wed', volume: 5290, delivered: 5082, failed: 47 },
  { name: 'Thu', volume: 4880, delivered: 4679, failed: 52 },
  { name: 'Fri', volume: 6120, delivered: 5894, failed: 41 },
  { name: 'Sat', volume: 3860, delivered: 3712, failed: 29 },
  { name: 'Sun', volume: 4520, delivered: 4355, failed: 33 },
];

const fallbackProviderData = [
  { name: 'ZeptoMail', value: 54 },
  { name: 'SES', value: 31 },
  { name: 'Resend', value: 15 },
];

const fallbackTypeData = [
  { name: 'Transactional', value: 68 },
  { name: 'Campaign', value: 32 },
];

const statusColors: Record<string, string> = {
  Delivered: '#769181',
  Sent: '#89A595',
  Queued: '#F1E9D8',
  Bounced: '#D96767',
  Failed: '#D96767',
};

const pieColors = ['#769181', '#89A595', '#DFE9E3', '#F1E9D8'];

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const toNumber = (value: string | number | undefined) => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const parsed = Number(value.toString().replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildTrendData = (logs: ActivityLog[]) => {
  if (logs.length === 0) return fallbackTrendData;

  const buckets = new Map<string, { name: string; volume: number; delivered: number; failed: number }>();
  const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });

  logs.forEach((log) => {
    const parsed = new Date(log.timestamp);
    const name = Number.isNaN(parsed.getTime()) ? log.timestamp.slice(0, 3) || 'Now' : formatter.format(parsed);
    const bucket = buckets.get(name) ?? { name, volume: 0, delivered: 0, failed: 0 };
    bucket.volume += 1;
    if (log.status === 'Delivered' || log.status === 'Sent') bucket.delivered += 1;
    if (log.status === 'Failed' || log.status === 'Bounced') bucket.failed += 1;
    buckets.set(name, bucket);
  });

  return Array.from(buckets.values()).slice(-7);
};

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
  const itemsPerPage = 6;

  const analytics = useMemo(() => {
    const totalLogs = logs.length;
    const successful = logs.filter((l) => l.status === 'Delivered' || l.status === 'Sent').length;
    const failures = logs.filter((l) => l.status === 'Failed' || l.status === 'Bounced').length;
    const queuedLogs = logs.filter((l) => l.status === 'Queued').length;
    const activeJobs = jobs.filter((j) => j.status === 'active').length;
    const waitingJobs = jobs.filter((j) => j.status === 'waiting').length;
    const delayedJobs = jobs.filter((j) => j.status === 'delayed').length;
    const failedJobs = jobs.filter((j) => j.status === 'failed').length;
    const queuePressure = activeJobs + waitingJobs + delayedJobs;
    const deliveryRate = totalLogs > 0 ? (successful / totalLogs) * 100 : 98.7;
    const failureRate = totalLogs > 0 ? (failures / totalLogs) * 100 : 1.3;

    const providerMap = logs.reduce<Record<string, number>>((acc, log) => {
      acc[log.provider] = (acc[log.provider] ?? 0) + 1;
      return acc;
    }, {});

    const typeMap = logs.reduce<Record<string, number>>((acc, log) => {
      acc[log.type] = (acc[log.type] ?? 0) + 1;
      return acc;
    }, {});

    const statusMap = logs.reduce<Record<string, number>>((acc, log) => {
      acc[log.status] = (acc[log.status] ?? 0) + 1;
      return acc;
    }, {});

    return {
      activeJobs,
      deliveryRate,
      failedJobs,
      failureRate,
      providerData: Object.keys(providerMap).length
        ? Object.entries(providerMap).map(([name, value]) => ({ name, value }))
        : fallbackProviderData,
      queuePressure,
      queuedLogs,
      statusData: Object.keys(statusMap).length
        ? Object.entries(statusMap).map(([name, value]) => ({ name, value }))
        : [
            { name: 'Delivered', value: 82 },
            { name: 'Queued', value: 9 },
            { name: 'Failed', value: 4 },
            { name: 'Bounced', value: 5 },
          ],
      successful,
      totalLogs,
      trendData: buildTrendData(logs),
      typeData: Object.keys(typeMap).length
        ? Object.entries(typeMap).map(([name, value]) => ({ name, value }))
        : fallbackTypeData,
      waitingJobs,
      delayedJobs,
    };
  }, [jobs, logs]);

  const filteredLogs = logs.filter((l) =>
    `${l.recipient} ${l.provider} ${l.type} ${l.status}`.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const displayMetrics = [
    {
      title: 'Delivery rate',
      value: formatPercent(analytics.deliveryRate),
      subtitle: `${analytics.successful || 4355} successful handoffs`,
      change: '+2.4%',
      icon: MailCheck,
      tone: 'positive',
    },
    {
      title: 'Queue pressure',
      value: analytics.queuePressure || toNumber(metrics[0]?.value) || 18,
      subtitle: `${analytics.activeJobs} active, ${analytics.waitingJobs} waiting`,
      change: '-8.1%',
      icon: Activity,
      tone: 'neutral',
    },
    {
      title: 'Failure rate',
      value: formatPercent(analytics.failureRate),
      subtitle: `${analytics.failedJobs} failed jobs need review`,
      change: analytics.failureRate > 2 ? '+0.6%' : '-0.3%',
      icon: MailWarning,
      tone: analytics.failureRate > 2 ? 'danger' : 'positive',
    },
    {
      title: 'Provider coverage',
      value: analytics.providerData.length,
      subtitle: 'ZeptoMail, SES, Resend routes',
      change: 'balanced',
      icon: ServerCog,
      tone: 'neutral',
    },
  ];

  return (
    <div className="dashboard-command-center fade-in">
      <section className="dashboard-command-hero">
        <div className="dashboard-hero-copy">
          <span className="dashboard-kicker">
            <Sparkles size={16} />
            SupermailBox analytics
          </span>
          <h2>Delivery command center</h2>
          <p>
            Watch campaign throughput, provider routing, queue pressure, and recent recipient activity in one operational view.
          </p>
        </div>
        <div className="dashboard-hero-actions">
          <div className="dashboard-live-card">
            <span>System health</span>
            <strong>Telemetry online</strong>
          </div>
          <button className="dashboard-refresh" onClick={onRefresh}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </section>

      <section className="dashboard-kpi-grid">
        {displayMetrics.map((metric) => {
          const Icon = metric.icon;
          const isPositive = metric.change.startsWith('+') || metric.change.startsWith('-');
          return (
            <article key={metric.title} className={`dashboard-kpi-card ${metric.tone}`}>
              <div className="dashboard-kpi-top">
                <span>{metric.title}</span>
                <Icon size={20} />
              </div>
              <strong>{metric.value}</strong>
              <div className="dashboard-kpi-bottom">
                <small>{metric.subtitle}</small>
                <b>
                  {isPositive && metric.change.startsWith('+') ? <ArrowUpRight size={14} /> : null}
                  {isPositive && metric.change.startsWith('-') ? <ArrowDownRight size={14} /> : null}
                  {metric.change}
                </b>
              </div>
            </article>
          );
        })}
      </section>

      <section className="dashboard-analytics-grid">
        <article className="dashboard-panel dashboard-panel-large">
          <div className="dashboard-panel-header">
            <div>
              <span>Throughput</span>
              <h3>Volume and delivered mail</h3>
            </div>
            <p>Last 7 active days</p>
          </div>
          <div className="dashboard-chart tall">
            <ResponsiveContainer>
              <AreaChart data={analytics.trendData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#769181" stopOpacity={0.34} />
                    <stop offset="95%" stopColor="#769181" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#777C78' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#777C78' }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E3E3DE' }} />
                <Area type="monotone" dataKey="volume" stroke="#5A7163" strokeWidth={3} fill="url(#volumeFill)" />
                <Line type="monotone" dataKey="delivered" stroke="#89A595" strokeWidth={3} dot={{ r: 3, fill: '#89A595' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="dashboard-panel dashboard-health-panel">
          <div className="dashboard-panel-header">
            <div>
              <span>Quality</span>
              <h3>Delivery posture</h3>
            </div>
          </div>
          <div className="dashboard-radial">
            <div className="dashboard-radial-score">
              <strong>{Math.round(analytics.deliveryRate)}</strong>
              <span>%</span>
            </div>
          </div>
          <div className="dashboard-health-list">
            <div>
              <CheckCircle2 size={17} />
              <span>Successful mail</span>
              <strong>{analytics.successful || '4.3k'}</strong>
            </div>
            <div>
              <Clock3 size={17} />
              <span>Queued events</span>
              <strong>{analytics.queuedLogs}</strong>
            </div>
            <div>
              <AlertTriangle size={17} />
              <span>Needs review</span>
              <strong>{analytics.failedJobs}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard-insight-grid">
        <article className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <span>Providers</span>
              <h3>Route distribution</h3>
            </div>
          </div>
          <div className="dashboard-chart">
            <ResponsiveContainer>
              <BarChart data={analytics.providerData} margin={{ top: 8, right: 0, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#777C78' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#777C78' }} />
                <Tooltip cursor={{ fill: '#F6F7F5' }} contentStyle={{ borderRadius: 8, border: '1px solid #E3E3DE' }} />
                <Bar dataKey="value" fill="#769181" radius={[6, 6, 0, 0]} barSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <span>Mailbox mix</span>
              <h3>Transactional vs campaign</h3>
            </div>
          </div>
          <div className="dashboard-donut-wrap">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={analytics.typeData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={4}>
                  {analytics.typeData.map((entry, index) => (
                    <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E3E3DE' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="dashboard-donut-legend">
              {analytics.typeData.map((item, index) => (
                <span key={item.name}>
                  <b style={{ background: pieColors[index % pieColors.length] }} />
                  {item.name}
                  <strong>{item.value}</strong>
                </span>
              ))}
            </div>
          </div>
        </article>

        <article className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <span>Status</span>
              <h3>Event outcome split</h3>
            </div>
          </div>
          <div className="dashboard-status-stack">
            {analytics.statusData.map((item) => (
              <div key={item.name}>
                <span>
                  <b style={{ background: statusColors[item.name] ?? '#777C78' }} />
                  {item.name}
                </span>
                <strong>{item.value}</strong>
                <i style={{ width: `${Math.min(100, Number(item.value) * 3)}%`, background: statusColors[item.name] ?? '#777C78' }} />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="dashboard-operations-grid">
        <article className="dashboard-panel">
          <div className="dashboard-table-header compact">
            <div>
              <span>Queue</span>
              <h2>Live jobs</h2>
            </div>
          </div>
          <div className="dashboard-job-list">
            {jobs.length === 0 ? (
              <div className="dashboard-empty-state">
                <ShieldCheck size={22} />
                <span>No active queue jobs.</span>
              </div>
            ) : (
              jobs.slice(0, 7).map((job) => (
                <button key={job.id} className="dashboard-job-row" onClick={() => setSelectedJob(job)}>
                  <span>
                    <strong>{job.recipient}</strong>
                    <small>{job.templateKey}</small>
                  </span>
                  <b className={`queue-status ${job.status}`}>{job.status}</b>
                </button>
              ))
            )}
          </div>
        </article>

        <article className="dashboard-panel dashboard-log-panel">
          <div className="dashboard-table-header compact">
            <div>
              <span>Recent activity</span>
              <h2>Dispatch logs</h2>
            </div>
            <div className="search-shell">
              <Search size={14} color="var(--text-secondary)" />
              <input
                type="text"
                placeholder="Search mail, provider, status"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          <div className="dashboard-table-wrap">
            <table>
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
                    <td colSpan={5} className="dashboard-table-empty">
                      No logs found.
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="muted-cell">{log.timestamp}</td>
                      <td className="recipient-cell">{log.recipient}</td>
                      <td>
                        <span className="badge-pill badge-neutral">{log.type}</span>
                      </td>
                      <td className="muted-cell">{log.provider}</td>
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
          </div>

          <div className="dashboard-pagination">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div>
              <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className="btn-secondary">
                Previous
              </button>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} className="btn-secondary">
                Next
              </button>
            </div>
          </div>
        </article>
      </section>

      {selectedJob && (
        <div className="dashboard-drawer-backdrop" onClick={() => setSelectedJob(null)}>
          <aside className="dashboard-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="dashboard-drawer-header">
              <div>
                <span>Job inspector</span>
                <h3>{selectedJob.id}</h3>
              </div>
              <button onClick={() => setSelectedJob(null)} title="Close inspector">
                <X size={18} />
              </button>
            </div>
            <dl className="dashboard-drawer-details">
              <div>
                <dt>Recipient</dt>
                <dd>{selectedJob.recipient}</dd>
              </div>
              <div>
                <dt>Template</dt>
                <dd>{selectedJob.templateKey}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{selectedJob.status}</dd>
              </div>
              <div>
                <dt>Attempts</dt>
                <dd>{selectedJob.attempts}</dd>
              </div>
            </dl>
            <pre>{JSON.stringify(selectedJob.payload ?? selectedJob, null, 2)}</pre>
          </aside>
        </div>
      )}
    </div>
  );
};
