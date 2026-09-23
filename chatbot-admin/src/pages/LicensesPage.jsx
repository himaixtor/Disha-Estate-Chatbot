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

// Field set mirrors LicenseSetupPage.jsx's mandatory form — schemas.licenseCreate
// requires clientName, companyEmail, productName, validFrom and validTill, so
// re-issuing/adding a license from here needs the same fields, not just the
// original short set (licenseId/clientName/companyEmail/type/env/deployment/maxUsers).
function LicenseForm({ onSubmit, onCancel }) {
  const [licenseId, setLicenseId] = useState('');
  const [clientName, setClientName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyContact, setCompanyContact] = useState('');
  const [productName, setProductName] = useState('Disha Estate Management');
  const [licenseType, setLicenseType] = useState('standard');
  const [environment, setEnvironment] = useState('development');
  const [deploymentType, setDeploymentType] = useState('cloud');
  const [maxUsers, setMaxUsers] = useState(10);
  const [maxAdminUsers, setMaxAdminUsers] = useState(3);
  const [maxTokenUsageCharge, setMaxTokenUsageCharge] = useState(0);
  const [validFrom, setValidFrom] = useState(new Date().toISOString().slice(0, 10));
  const [validTill, setValidTill] = useState(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        licenseId, clientName, companyEmail, productName,
        companyAddress: companyAddress || undefined, companyContact: companyContact || undefined,
        licenseType, environment, deploymentType,
        maxUsers: Number(maxUsers) || 0, maxAdminUsers: Number(maxAdminUsers) || 0,
        maxTokenUsageCharge: Number(maxTokenUsageCharge) || 0,
        validFrom, validTill, remarks: remarks || undefined,
      });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field-grid">
        <div className="field">
          <label>License ID</label>
          <input value={licenseId} onChange={(e) => setLicenseId(e.target.value)} required minLength={3} />
        </div>
        <div className="field">
          <label>Product name</label>
          <input value={productName} onChange={(e) => setProductName(e.target.value)} required minLength={2} />
        </div>
        <div className="field">
          <label>Client name</label>
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} required minLength={2} />
        </div>
        <div className="field">
          <label>Company email</label>
          <input type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Company contact</label>
          <input value={companyContact} onChange={(e) => setCompanyContact(e.target.value)} />
        </div>
        <div className="field">
          <label>Company address</label>
          <input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
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
          <input type="number" min={1} value={maxUsers} onChange={(e) => setMaxUsers(e.target.value)} />
        </div>
        <div className="field">
          <label>Max admin users</label>
          <input type="number" min={1} value={maxAdminUsers} onChange={(e) => setMaxAdminUsers(e.target.value)} />
        </div>
        <div className="field">
          <label>Max token usage charge</label>
          <input type="number" min={0} value={maxTokenUsageCharge} onChange={(e) => setMaxTokenUsageCharge(e.target.value)} />
        </div>
        <div className="field">
          <label>Valid from</label>
          <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} required />
        </div>
        <div className="field">
          <label>Valid till</label>
          <input type="date" value={validTill} onChange={(e) => setValidTill(e.target.value)} required />
        </div>
      </div>
      <div className="field">
        <label>Remarks</label>
        <textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </div>
      {error && <div className="error-text">{error}</div>}
      <div className="actions">
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Creating…' : 'Create'}</button>
      </div>
    </form>
  );
}
