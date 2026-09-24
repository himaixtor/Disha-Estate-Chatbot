import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

// License Management is a sensitive area: every time the page is opened the
// user must re-enter their password (step-up verification). The resulting
// short-lived token lives only in this component's state — it is never
// persisted — so navigating away and back always asks again. The backend
// enforces the same rule (middleware/reauth.js), this is not UI-only.
const REAUTH_PURPOSE = 'license_management';

const STATUS_BADGE = { active: 'active', suspended: 'inactive', expired: 'inactive', revoked: 'inactive', trial: 'new' };

const LABELS = {
  on_premise: 'On-Premise', cloud: 'Cloud', hybrid: 'Hybrid',
  development: 'Development', staging: 'Staging', production: 'Production',
  trial: 'Trial', standard: 'Standard', enterprise: 'Enterprise',
};
const label = (v) => LABELS[v] || v || '—';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDate(value) {
  if (!value) return '—';
  const [y, m, d] = String(value).slice(0, 10).split('-');
  if (!y || !m || !d) return String(value);
  return `${d}-${MONTHS[Number(m) - 1]}-${y}`;
}
const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;
const addYear = (iso) => { const d = new Date(iso); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10); };
const todayIso = () => new Date().toISOString().slice(0, 10);

function Icon({ name }) {
  const paths = {
    lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
    check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
    alert: <><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    coin: <><circle cx="12" cy="12" r="9" /><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2" /></>,
  };
  return <svg className="stat-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function LicensesPage() {
  const [reauthToken, setReauthToken] = useState(null);
  const expire = useCallback(() => setReauthToken(null), []);

  if (!reauthToken) return <ReauthGate onVerified={setReauthToken} />;
  return <LicenseManagement reauthToken={reauthToken} onReauthExpired={expire} />;
}

function ReauthGate({ onVerified }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api.post('/auth/reauthenticate', { password, purpose: REAUTH_PURPOSE });
      onVerified(data.reauthToken);
    } catch (err) {
      setError(err.message);
      setPassword('');
      setBusy(false);
    }
  }

  return (
    <div className="reauth-wrap">
      <form className="card reauth-card" onSubmit={submit}>
        <div className="stat-icon"><Icon name="lock" /></div>
        <span className="eyebrow">Security check</span>
        <h2>Confirm it&rsquo;s you</h2>
        <p className="reauth-sub">License Management contains sensitive settings. Re-enter your password to continue.</p>
        {user?.email && <div className="reauth-user">Signed in as <strong>{user.email}</strong></div>}
        <div className="field">
          <label htmlFor="reauth-password">Password</label>
          <input id="reauth-password" type="password" autoFocus autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <div className="error-text">{error}</div>}
        <div className="reauth-actions">
          <button type="button" className="btn" onClick={() => navigate('/')}>Cancel</button>
          <button type="submit" className="btn primary" disabled={busy || !password}>{busy ? 'Verifying…' : 'Verify & continue'}</button>
        </div>
      </form>
    </div>
  );
}

function LicenseManagement({ reauthToken, onReauthExpired }) {
  const [tab, setTab] = useState('overview');
  const [current, setCurrent] = useState(null);
  const [licenses, setLicenses] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'renew' | 'new'

  const opts = { headers: { 'X-Reauth-Token': reauthToken } };

  const handle = useCallback((err) => {
    if (err.code === 'REAUTH_REQUIRED') onReauthExpired();
    else setError(err.message);
  }, [onReauthExpired]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cur, list] = await Promise.all([
        api.get('/licenses/current', { headers: { 'X-Reauth-Token': reauthToken } }),
        api.get('/licenses', { headers: { 'X-Reauth-Token': reauthToken } }),
      ]);
      setCurrent(cur);
      setLicenses(list);
    } catch (err) {
      handle(err);
    } finally {
      setLoading(false);
    }
  }, [reauthToken, handle]);

  useEffect(() => { load(); }, [load]);

  async function create(form) {
    try {
      await api.post('/licenses', form, opts);
    } catch (err) {
      if (err.code === 'REAUTH_REQUIRED') { onReauthExpired(); return; }
      throw err;
    }
    setModal(null);
    load();
  }

  async function setStatus(id, action) {
    try {
      await api.post(`/licenses/${id}/${action}`, {}, opts);
      load();
    } catch (err) { handle(err); }
  }

  async function download() {
    try {
      const { fileName, content } = await api.get('/licenses/current/download', opts);
      const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) { handle(err); }
  }

  const lic = current?.license;
  const isActive = current?.systemStatus === 'valid';

  const renewInitial = lic ? {
    licenseId: suggestLicenseId(),
    clientName: lic.clientName, companyEmail: lic.companyEmail, companyAddress: lic.companyAddress,
    companyContact: lic.companyContact, productName: lic.productName, licenseType: lic.licenseType,
    environment: lic.environment, deploymentType: lic.deploymentType, maxUsers: lic.maxUsers,
    maxAdminUsers: lic.maxAdminUsers, maxTokenUsageCharge: lic.maxTokenUsageCharge,
    validFrom: todayIso(),
    validTill: addYear(lic.validTill && lic.validTill > todayIso() ? lic.validTill : todayIso()),
  } : {};

  return (
    <>
      <div className="page-header">
        <div>
          <h1>License Management</h1>
          <p className="page-sub">Enterprise license control &amp; monitoring</p>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {[['overview', 'Overview'], ['details', 'Details'], ['history', 'All licenses']].map(([key, text]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={`tab${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>{text}</button>
        ))}
      </div>

      {error && <div className="error-text">{error}</div>}

      {loading && !current ? <div className="empty-state">Loading…</div> : (
        <>
          {tab === 'overview' && (
            !lic ? <div className="card empty-state">No license is installed.</div> : (
              <>
                <div className="grid cols-4">
                  <div className="card stat">
                    <div className={`stat-icon ${isActive ? 'ok' : 'bad'}`}><Icon name={isActive ? 'check' : 'alert'} /></div>
                    <div className="label">License status</div>
                    <div className={`value license-status ${isActive ? 'ok' : 'bad'}`}>{isActive ? 'ACTIVE' : String(current.systemStatus || lic.status).toUpperCase()}</div>
                    {!isActive && current.reason && <div className="stat-note">{current.reason}</div>}
                  </div>
                  <div className="card stat">
                    <div className="stat-icon"><Icon name="calendar" /></div>
                    <div className="label">Days remaining</div>
                    <div className="value">{lic.daysRemaining ?? '—'}</div>
                    <div className="stat-note">Expires: {formatDate(lic.validTill)}</div>
                  </div>
                  <div className="card stat">
                    <div className="stat-icon"><Icon name="users" /></div>
                    <div className="label">Max users</div>
                    <div className="value">{lic.maxUsers}</div>
                    <div className="stat-note">{lic.maxAdminUsers} admin users</div>
                  </div>
                  <div className="card stat">
                    <div className="stat-icon"><Icon name="coin" /></div>
                    <div className="label">Max token charge</div>
                    <div className="value">{formatMoney(lic.maxTokenUsageCharge)}</div>
                    <div className="stat-note">USD per license period</div>
                  </div>
                </div>

                <button className="btn primary btn-block" onClick={() => setModal('renew')}>Renew License</button>
                <div className="license-actions">
                  <button className="btn" onClick={download}>Download License</button>
                  <button className="btn" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
                </div>
              </>
            )
          )}

          {tab === 'details' && (
            !lic ? <div className="card empty-state">No license is installed.</div> : (
              <div className="card">
                <div className="detail-grid">
                  <Detail label="License ID"><div className="mono-box">{lic.licenseId}</div></Detail>
                  <Detail label="Client name">{lic.clientName}</Detail>
                  <Detail label="Product name">{lic.productName}</Detail>
                  <Detail label="License type">{label(lic.licenseType)}</Detail>
                  <Detail label="Deployment type">{label(lic.deploymentType)}</Detail>
                  <Detail label="Environment">{label(lic.environment)}</Detail>
                  <Detail label="Valid from">{formatDate(lic.validFrom)}</Detail>
                  <Detail label="Valid till">{formatDate(lic.validTill)}</Detail>
                  <Detail label="Maximum users">{lic.maxUsers}</Detail>
                  <Detail label="Maximum admin users">{lic.maxAdminUsers}</Detail>
                  <Detail label="Maximum token usage charge (USD)">{formatMoney(lic.maxTokenUsageCharge)}</Detail>
                  <Detail label="Created by">{lic.createdBy}</Detail>
                  <Detail label="Created date">{formatDate(lic.createdDate)}</Detail>
                  <Detail label="Company email">{lic.companyEmail}</Detail>
                  <Detail label="Company contact">{lic.companyContact}</Detail>
                  <Detail label="Company address">{lic.companyAddress}</Detail>
                </div>
              </div>
            )
          )}

          {tab === 'history' && (
            <div className="card">
              <div className="card-heading history-heading">
                <h3>All licenses</h3>
                <button className="btn primary" onClick={() => setModal('new')}>+ New license</button>
              </div>
              {licenses.length === 0 ? <div className="empty-state">No licenses yet.</div> : (
                <table>
                  <thead><tr><th>License ID</th><th>Client</th><th>Type</th><th>Environment</th><th>Valid till</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {licenses.map((l) => (
                      <tr key={l.id}>
                        <td>{l.license_id}{lic?.id === l.id && <span className="badge active installed-badge">Installed</span>}</td>
                        <td>{l.client_name || '—'}</td>
                        <td>{label(l.license_type)}</td>
                        <td>{label(l.environment)}</td>
                        <td>{formatDate(l.valid_till)}</td>
                        <td><span className={`badge ${STATUS_BADGE[l.status] || 'new'}`}>{l.status}</span></td>
                        <td style={{ display: 'flex', gap: 6 }}>
                          {l.status !== 'active' && <button className="btn" onClick={() => setStatus(l.id, 'activate')}>Activate</button>}
                          {l.status === 'active' && <button className="btn danger" onClick={() => setStatus(l.id, 'suspend')}>Suspend</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {modal && (
        <Modal title={modal === 'renew' ? 'Renew license' : 'New license'} onClose={() => setModal(null)}>
          {modal === 'renew' && <p className="modal-note">Issues a new license with the dates below and installs it in place of the current one.</p>}
          <LicenseForm
            onSubmit={create}
            onCancel={() => setModal(null)}
            initial={modal === 'renew' ? renewInitial : { licenseId: suggestLicenseId() }}
            submitLabel={modal === 'renew' ? 'Renew license' : 'Create'}
          />
        </Modal>
      )}
    </>
  );
}

function Detail({ label: text, children }) {
  return (
    <div className="detail-item">
      <div className="detail-label">{text}</div>
      <div className="detail-value">{children ?? '—'}</div>
    </div>
  );
}

function suggestLicenseId() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `DISHA-${new Date().getFullYear()}-${rand}`;
}

// Field set mirrors LicenseSetupPage.jsx's mandatory form — schemas.licenseCreate
// requires clientName, companyEmail, productName, validFrom and validTill, so
// re-issuing/adding a license from here needs the same fields, not just the
// original short set (licenseId/clientName/companyEmail/type/env/deployment/maxUsers).
function LicenseForm({ onSubmit, onCancel, initial = {}, submitLabel = 'Create' }) {
  const [licenseId, setLicenseId] = useState(initial.licenseId || '');
  const [clientName, setClientName] = useState(initial.clientName || '');
  const [companyEmail, setCompanyEmail] = useState(initial.companyEmail || '');
  const [companyAddress, setCompanyAddress] = useState(initial.companyAddress || '');
  const [companyContact, setCompanyContact] = useState(initial.companyContact || '');
  const [productName, setProductName] = useState(initial.productName || 'Disha Estate Management');
  const [licenseType, setLicenseType] = useState(initial.licenseType || 'standard');
  const [environment, setEnvironment] = useState(initial.environment || 'development');
  const [deploymentType, setDeploymentType] = useState(initial.deploymentType || 'cloud');
  const [maxUsers, setMaxUsers] = useState(initial.maxUsers ?? 10);
  const [maxAdminUsers, setMaxAdminUsers] = useState(initial.maxAdminUsers ?? 3);
  const [maxTokenUsageCharge, setMaxTokenUsageCharge] = useState(initial.maxTokenUsageCharge ?? 0);
  const [validFrom, setValidFrom] = useState(initial.validFrom || new Date().toISOString().slice(0, 10));
  const [validTill, setValidTill] = useState(initial.validTill || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState(initial.remarks || '');
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
          <label>Max token usage charge (USD)</label>
          <input type="number" min={0} step="0.01" value={maxTokenUsageCharge} onChange={(e) => setMaxTokenUsageCharge(e.target.value)} />
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
        <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
      </div>
    </form>
  );
}
