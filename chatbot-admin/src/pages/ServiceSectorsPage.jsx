import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';

const PAGE_SIZE = 20;

export default function ServiceSectorsPage() {
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [modal, setModal] = useState(null);
  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const offsetRef = useRef(0);
  const requestIdRef = useRef(0);

  const load = useCallback(async (reset = false) => {
    if ((!reset && loadingRef.current) || (!reset && !hasMoreRef.current)) return;
    const requestId = reset ? ++requestIdRef.current : requestIdRef.current;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    const offset = reset ? 0 : offsetRef.current;

    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (search) params.set('search', search);
      const result = await api.get(`/service-sectors/admin/all?${params}`);
      if (requestId !== requestIdRef.current) return;
      const items = result.items || [];
      setSectors((current) => reset ? items : [...current, ...items]);
      offsetRef.current = offset + items.length;
      hasMoreRef.current = offsetRef.current < result.total;
      setHasMore(hasMoreRef.current);
    } catch (e) {
      if (requestId === requestIdRef.current) setError(e.message);
    } finally {
      if (requestId === requestIdRef.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    offsetRef.current = 0;
    hasMoreRef.current = true;
    setHasMore(true);
    setSectors([]);
    load(true);
  }, [search, load]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root || !hasMore) return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) load();
    }, { root, rootMargin: '100px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, load, sectors.length]);

  async function save(form) {
    await api.patch(`/service-sectors/${modal.data.id}`, { sectorName: form.sectorName });
    setModal(null);
    await load(true);
  }

  async function toggleActive(row) {
    await api.patch(`/service-sectors/${row.id}`, { isActive: row.is_active ? 0 : 1 });
    await load(true);
  }

  return (
    <>
      <div className="page-header">
        <h1>Service Sectors</h1>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="card">
        <div className="leads-toolbar">
          <div className="field search-field">
            <input
              type="search"
              placeholder="Search by sector name or slug..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
        </div>
        {sectors.length === 0 && !loading && !error ? <div className="empty-state">No service sectors yet.</div> : (
          <>
            <div className="table-scroll" ref={scrollRef}>
              <table>
                <thead><tr><th>Sector name</th><th>Slug</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {sectors.map((row) => (
                    <tr key={row.id}>
                      <td>{row.sector_name}</td>
                      <td>{row.slug}</td>
                      <td><span className={`badge ${row.is_active ? 'active' : 'inactive'}`}>{row.is_active ? 'active' : 'inactive'}</span></td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="btn" onClick={() => setModal({ mode: 'edit', data: row })}>Edit</button>
                        <button className="btn danger" onClick={() => toggleActive(row)}>{row.is_active ? 'Deactivate' : 'Activate'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />
            </div>
            {loading && <div className="empty-state">Loading service sectors…</div>}
            {!loading && hasMore && error && <button type="button" className="btn" onClick={() => load()}>Retry loading</button>}
          </>
        )}
      </div>

      {modal && (
        <Modal title="Edit service sector" onClose={() => setModal(null)}>
          <SectorForm initial={modal.data} onSubmit={save} onCancel={() => setModal(null)} />
        </Modal>
      )}
    </>
  );
}

function SectorForm({ initial, onSubmit, onCancel }) {
  const [sectorName, setSectorName] = useState(initial.sector_name || initial.sectorName || '');
  const [slug, setSlug] = useState(initial.slug || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ sectorName, slug });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label>Sector name</label>
        <input value={sectorName} onChange={(e) => setSectorName(e.target.value)} required minLength={2} />
      </div>
      <div className="field">
        <label>Slug</label>
        <input value={slug} readOnly required maxLength={250} />
      </div>
      {error && <div className="error-text">{error}</div>}
      <div className="actions">
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}
