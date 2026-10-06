import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';

export default function ServiceSectorsPage() {
  const [sectors, setSectors] = useState([]);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);

  const load = useCallback(() => {
    api.get('/service-sectors/admin/all').then(setSectors).catch((e) => setError(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(form) {
    if (modal.mode === 'new') {
      await api.post('/service-sectors', { sectorName: form.sectorName, slug: form.slug });
    } else {
      await api.patch(`/service-sectors/${modal.data.id}`, { sectorName: form.sectorName });
    }
    setModal(null);
    load();
  }

  async function toggleActive(row) {
    await api.patch(`/service-sectors/${row.id}`, { isActive: row.is_active ? 0 : 1 });
    load();
  }

  return (
    <>
      <div className="page-header">
        <h1>Service Sectors</h1>
        <button className="btn primary" onClick={() => setModal({ mode: 'new', data: { sectorName: '', slug: '' } })}>+ New sector</button>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="card">
        {sectors.length === 0 ? <div className="empty-state">No service sectors yet.</div> : (
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
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === 'new' ? 'New service sector' : 'Edit service sector'} onClose={() => setModal(null)}>
          <SectorForm initial={modal.data} slugReadOnly={modal.mode === 'edit'} onSubmit={save} onCancel={() => setModal(null)} />
        </Modal>
      )}
    </>
  );
}

function SectorForm({ initial, slugReadOnly = false, onSubmit, onCancel }) {
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
        <input value={slug} onChange={(e) => setSlug(e.target.value)} readOnly={slugReadOnly} required maxLength={250} />
      </div>
      {error && <div className="error-text">{error}</div>}
      <div className="actions">
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}
