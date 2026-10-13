import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

const PAGE_SIZE = 20;

export default function PropertyConfigurationsPage() {
  const [configurations, setConfigurations] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim().toLowerCase());
      setOffset(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filteredConfigurations = search
    ? configurations.filter((configuration) => [
      configuration.name,
      configuration.slug,
      configuration.type,
      configuration.category_id,
    ].some((value) => String(value ?? '').toLowerCase().includes(search)))
    : configurations;
  const visibleConfigurations = filteredConfigurations.slice(offset, offset + PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filteredConfigurations.length / PAGE_SIZE));
  const page = Math.floor(offset / PAGE_SIZE) + 1;

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
        <div className="leads-toolbar">
          <div className="field search-field">
            <input
              type="search"
              placeholder="Search by name, slug, type, or category ID..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
        </div>
        {loading && configurations.length === 0 ? <div className="empty-state">Loading configurations…</div>
          : visibleConfigurations.length === 0 ? <div className="empty-state">No property configurations found.</div> : (
            <table>
              <thead><tr><th>Name</th><th>Slug</th><th>Type</th><th>Main category ID</th></tr></thead>
              <tbody>
                {visibleConfigurations.map((configuration, index) => (
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
        <div className="leads-pagination">
          <span>{filteredConfigurations.length ? `${offset + 1}-${Math.min(offset + PAGE_SIZE, filteredConfigurations.length)} of ${filteredConfigurations.length}` : '0 of 0'}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>Page {page} of {pageCount}</span>
            <button className="btn" disabled={loading || offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Previous</button>
            <button className="btn" disabled={loading || offset + PAGE_SIZE >= filteredConfigurations.length} onClick={() => setOffset(offset + PAGE_SIZE)}>Next</button>
          </div>
        </div>
      </div>
    </>
  );
}
