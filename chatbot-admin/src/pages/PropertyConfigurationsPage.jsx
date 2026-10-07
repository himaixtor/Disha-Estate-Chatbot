import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

export default function PropertyConfigurationsPage() {
  const [configurations, setConfigurations] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setConfigurations(await api.get('/property-configurations'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="page-header">
        <h1>Property Configuration</h1>
        <button className="btn" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh from CMS'}
        </button>
      </div>

      {error && <div className="error-text" role="alert">{error}</div>}

      <div className="card">
        {loading && configurations.length === 0 ? <div className="empty-state">Loading configurations…</div>
          : configurations.length === 0 ? <div className="empty-state">No property configurations found.</div> : (
            <table>
              <thead><tr><th>Name</th><th>Slug</th><th>Type</th><th>Main category ID</th></tr></thead>
              <tbody>
                {configurations.map((configuration, index) => (
                  <tr key={`${configuration.slug || configuration.name || 'configuration'}-${index}`}>
                    <td>{configuration.name || '—'}</td>
                    <td>{configuration.slug || '—'}</td>
                    <td>{configuration.type || '—'}</td>
                    <td>{configuration.category_id ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </>
  );
}
