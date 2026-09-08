import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';

const STATUS_BADGE = { active: 'active', suspended: 'inactive', expired: 'inactive', trial: 'new' };

export default function LicensesPage() {
  const [licenses, setLicenses] = useState([]);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(false);

  const load = useCallback(() => {
    api.get('/licenses').then(setLicenses).catch((e) => setError(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create(form) {
    await api.post('/licenses', form);
    setModal(false);
    load();
  }

  async function setStatus(id, action) {
    await api.post(`/licenses/${id}/${action}`, {});
    load();
  }

  return (
    <>
      <div className="page-header">
        <h1>Licenses</h1>
        <button className="btn primary" onClick={() => setModal(true)}>+ New license</button>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="card">
        {licenses.length === 0 ? <div className="empty-state">No licenses yet.</div> : (
          <table>
            <thead><tr><th>License ID</th><th>Client</th><th>Type</th><th>Environment</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {licenses.map((l) => (
                <tr key={l.id}>
                  <td>{l.license_id}</td>
                  <td>{l.client_name || '—'}</td>
                  <td>{l.license_type}</td>
                  <td>{l.environment}</td>
                  <td><span className={`badge ${STATUS_BADGE[l.status] || 'new'}`}>{l.status}</span></td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    {l.status !== 'active' && <button className="btn" onClick={() => setStatus(l.id, 'activate')}>Activate</button>}
                    {l.status === 'active' && <button className="btn danger" onClick={() => setStatus(l.id, 'suspend')}>Suspend</button>}
                    <button className="btn" onClick={() => setStatus(l.id, 'renew')}>Renew</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title="New license" onClose={() => setModal(false)}>
          <LicenseForm onSubmit={create} onCancel={() => setModal(false)} />
        </Modal>
      )}
    </>
  );
}

function LicenseForm({ onSubmit, onCancel }) {
  const [licenseId, setLicenseId] = useState('');
  const [clientName, setClientName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [licenseType, setLicenseType] = useState('standard');
  const [environment, setEnvironment] = useState('development');
  const [deploymentType, setDeploymentType] = useState('cloud');
  const [maxUsers, setMaxUsers] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        licenseId, clientName: clientName || undefined, companyEmail: companyEmail || undefined,
        licenseType, environment, deploymentType, maxUsers: Number(maxUsers) || 0,
      });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label>License ID</label>
        <input value={licenseId} onChange={(e) => setLicenseId(e.target.value)} required minLength={3} />
      </div>
      <div className="field">
        <label>Client name</label>
        <input value={clientName} onChange={(e) => setClientName(e.target.value)} />
      </div>
      <div className="field">
        <label>Company email</label>
        <input type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} />
      </div>
      <div className="field">
        <label>License type</label>
        <select value={licenseType} onChange={(e) => setLicenseType(e.target.value)}>
          <option value="trial">Trial</option>
          <option value="standard">Standard</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>
      <div className="field">
        <label>Environment</label>
        <select value={environment} onChange={(e) => setEnvironment(e.target.value)}>
          <option value="development">Development</option>
          <option value="staging">Staging</option>
          <option value="production">Production</option>
        </select>
      </div>
      <div className="field">
        <label>Deployment type</label>
        <select value={deploymentType} onChange={(e) => setDeploymentType(e.target.value)}>
          <option value="cloud">Cloud</option>
          <option value="on_premise">On-premise</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </div>
      <div className="field">
        <label>Max users</label>
        <input type="number" value={maxUsers} onChange={(e) => setMaxUsers(e.target.value)} />
      </div>
      {error && <div className="error-text">{error}</div>}
      <div className="actions">
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Creating…' : 'Create'}</button>
      </div>
    </form>
  );
}
