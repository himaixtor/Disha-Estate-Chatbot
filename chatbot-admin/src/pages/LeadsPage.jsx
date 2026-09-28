import { useEffect, useMemo, useState, useCallback } from 'react';
import { api } from '../api/client';
import ChatHistoryModal from '../components/ChatHistoryModal';

const LIMIT = 50;

export default function LeadsPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [offset, setOffset] = useState(0);
  const [viewingSessionId, setViewingSessionId] = useState(null);
  const [error, setError] = useState(null);

  // Debounce free-text search so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setOffset(0); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(() => {
    const q = new URLSearchParams({ limit: LIMIT, offset });
    if (search) q.set('search', search);
    if (dateFrom) q.set('dateFrom', dateFrom);
    if (dateTo) q.set('dateTo', dateTo);
    api.get(`/leads?${q.toString()}`)
      .then((d) => { setItems(d.items); setTotal(d.total); })
      .catch((e) => setError(e.message));
  }, [search, dateFrom, dateTo, offset]);

  useEffect(() => { load(); }, [load]);

  async function togglePin(row) {
    await api.patch(`/leads/${row.session_id}`, { isPinned: row.is_pinned ? 0 : 1 });
    load();
  }

  function clearFilters() {
    setSearchInput('');
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setOffset(0);
  }

  const hasFilters = search || dateFrom || dateTo;
  const page = Math.floor(offset / LIMIT) + 1;
  const pageCount = Math.max(1, Math.ceil(total / LIMIT));
  const rangeLabel = useMemo(() => {
    if (!total) return '0 of 0';
    const from = offset + 1;
    const to = Math.min(offset + LIMIT, total);
    return `${from}-${to} of ${total}`;
  }, [offset, total]);

  return (
    <>
      <div className="page-header">
        <h1>Leads &amp; Chats</h1>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="card">
        <div className="leads-toolbar">
          <div className="field search-field">
            <input
              type="text"
              placeholder="Search by name or phone number..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="field date-field">
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => { setDateFrom(e.target.value); setOffset(0); }}
              title="From date"
            />
          </div>
          <div className="field date-field">
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => { setDateTo(e.target.value); setOffset(0); }}
              title="To date"
            />
          </div>
          {hasFilters && <button type="button" className="btn" onClick={clearFilters}>Clear filters</button>}
        </div>

        {items.length === 0 ? (
          <div className="empty-state">No leads found.</div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th></th><th>Name</th><th>Mobile</th><th>Created</th><th></th><th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.session_id}>
                    <td>{row.is_pinned ? '📌' : ''}</td>
                    <td>{row.name || '(anonymous)'}</td>
                    <td>{row.mobile_number || '—'}</td>
                    <td>{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="icon-btn"
                        title="View conversation"
                        aria-label="View conversation"
                        onClick={() => setViewingSessionId(row.session_id)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                    </td>
                    <td><button className="btn" onClick={() => togglePin(row)}>{row.is_pinned ? 'Unpin' : 'Pin'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="leads-pagination">
          <span>{rangeLabel}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>Page {page} of {pageCount}</span>
            <button className="btn" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>Previous</button>
            <button className="btn" disabled={offset + LIMIT >= total} onClick={() => setOffset(offset + LIMIT)}>Next</button>
          </div>
        </div>
      </div>

      {viewingSessionId && (
        <ChatHistoryModal sessionId={viewingSessionId} onClose={() => setViewingSessionId(null)} />
      )}
    </>
  );
}
