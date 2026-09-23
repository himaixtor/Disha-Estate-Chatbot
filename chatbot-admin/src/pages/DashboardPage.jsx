import { useEffect, useState } from 'react';
import { api } from '../api/client';

// One icon per metric, replacing the old "01/02/03/04" numeric badges — see
// .stat-icon in index.css. All four stat cards sit in the same 4-column
// grid.cols-4 row with equal fr widths and a shared min-height, so they are
// always the same size regardless of icon/label length (no auto-fit/auto-fill
// anywhere in this grid — that's what causes an uneven "big first card" look).
function StatIcon({ name }) {
  const paths = {
    chats: <path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.7 8.7 0 0 1-3.5-.75L4 20l1.5-4A7.5 7.5 0 1 1 20 11.5Z" />,
    leads: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="m17 11 2 2 4-4" /></>,
    today: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    active: <path d="M3 12h4l2-7 4 14 2-7h6" />,
  };
  return <svg className="stat-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/admin/dashboard').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error-text">{error}</div>;
  if (!data) return <div className="empty-state">Loading…</div>;

  const t = data.totals || {};
  const stats = [
    ['Total conversations', t.total_conversations, 'All customer interactions', 'chats'],
    ['Total leads', t.total_leads, 'Prospects verified via OTP', 'leads'],
    ['Conversations today', t.conversations_today, 'Started in the last 24 hours', 'today'],
    ['Active sessions', t.active_sessions, 'Still in progress, not yet completed', 'active'],
  ];

  return (
    <>
      <div className="page-header dashboard-heading"><div><span className="eyebrow">Overview</span><h1>Good to see you.</h1><p>Keep track of the conversations and leads moving through Disha.</p></div><div className="status-pill"><span></span> System operational</div></div>

      <div className="grid cols-4">
        {stats.map(([label, value, description, icon]) => (
          <div className="card stat" key={label}>
            <div className="stat-icon"><StatIcon name={icon} /></div><div className="label">{label}</div>
            <div className="value">{value ?? 0}</div>
            <div className="stat-note">{description}</div>
          </div>
        ))}
      </div>

      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-heading"><div><span className="eyebrow">Distribution</span><h3>Leads by category</h3></div></div>
          {data.byCategory?.length ? (
            <table>
              <tbody>
                {data.byCategory.map((row) => (
                  <tr key={row.name}><td>{row.name}</td><td style={{ textAlign: 'right' }}>{row.count}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty-state">No data yet.</div>}
        </div>
        <div className="card">
          <div className="card-heading"><div><span className="eyebrow">Coverage</span><h3>Top service sectors</h3></div></div>
          {data.bySector?.length ? (
            <table>
              <tbody>
                {data.bySector.map((row) => (
                  <tr key={row.sector_name}><td>{row.sector_name}</td><td style={{ textAlign: 'right' }}>{row.count}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty-state">No data yet.</div>}
        </div>
      </div>

      <div className="insight-card">
        <span className="insight-icon">✦</span><div><strong>AI insights are on the way</strong><p>Request and token-cost metrics will appear here when the AI module is enabled.</p></div>
      </div>
    </>
  );
}
