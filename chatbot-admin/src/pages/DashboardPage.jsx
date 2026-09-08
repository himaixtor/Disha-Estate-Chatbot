import { useEffect, useState } from 'react';
import { api } from '../api/client';

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
    ['Total conversations', t.total_conversations, 'All customer interactions'],
    ['Total leads', t.total_leads, 'Prospects verified via OTP'],
    ['Conversations today', t.conversations_today, 'Started in the last 24 hours'],
    ['Active sessions', t.active_sessions, 'Still in progress, not yet completed'],
  ];

  return (
    <>
      <div className="page-header dashboard-heading"><div><span className="eyebrow">Overview</span><h1>Good to see you.</h1><p>Keep track of the conversations and leads moving through Disha.</p></div><div className="status-pill"><span></span> System operational</div></div>

      <div className="grid cols-4">
        {stats.map(([label, value, description], index) => (
          <div className="card stat" key={label}>
            <div className="stat-icon">0{index + 1}</div><div className="label">{label}</div>
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
