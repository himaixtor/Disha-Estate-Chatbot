import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

// Shown full-page, in place of the whole Admin Portal shell, to a super admin
// whenever the system has no valid license (blueprint §40 update — "when
// super admin login to the portal show license creation form"). Nothing else
// in the app is reachable until this succeeds — see ProtectedRoute.jsx.
function suggestLicenseId() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `DISHA-${new Date().getFullYear()}-${rand}`;
}

const REASON_COPY = {
  not_configured: {
    title: 'Activate your license',
    body: 'This is a one-time setup step. Fill in the details below to generate the license that protects this Admin Portal.',
  },
  tampered: {
    title: 'License integrity check failed',
    body: 'The installed license file (license.txt) was modified outside the Admin Portal and can no longer be trusted. Issue a new license to restore access for everyone.',
  },
  expired: {
    title: 'License expired',
    body: 'The installed license has passed its validity period. Issue a renewed license to restore access for everyone.',
  },
  inactive: {
    title: 'License is not active',
    body: 'The installed license is suspended or otherwise inactive. Visit License Management once access is restored, or issue a new license below.',
  },
};

export default function LicenseSetupPage() {
  const { user, refreshMe, logout } = useAuth();
  const reason = REASON_COPY[user?.license?.status] || REASON_COPY.not_configured;

  const [form, setForm] = useState({
    licenseId: suggestLicenseId(),
    clientName: '',
    companyEmail: '',
    companyAddress: '',
    companyContact: '',
    productName: 'Disha Estate Management',
    licenseType: 'standard',
    environment: 'production',
    deploymentType: 'cloud',
    maxUsers: 25,
    maxAdminUsers: 5,
    maxTokenUsageCharge: 0,
    validFrom: new Date().toISOString().slice(0, 10),
    validTill: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    remarks: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/licenses', {
        ...form,
        maxUsers: Number(form.maxUsers) || 0,
        maxAdminUsers: Number(form.maxAdminUsers) || 0,
        maxTokenUsageCharge: Number(form.maxTokenUsageCharge) || 0,
      });
      await refreshMe();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card license-setup-card" onSubmit={onSubmit}>
        <h1>{reason.title}</h1>
        <p className="sub">{reason.body}</p>

        <div className="field-grid">
          <div className="field">
            <label>License ID</label>
            <input value={form.licenseId} onChange={(e) => set('licenseId', e.target.value)} required minLength={3} />
          </div>
          <div className="field">
            <label>Product name</label>
            <input value={form.productName} onChange={(e) => set('productName', e.target.value)} required minLength={2} />
          </div>
          <div className="field">
            <label>Client / company name</label>
            <input value={form.clientName} onChange={(e) => set('clientName', e.target.value)} required minLength={2} />
          </div>
          <div className="field">
            <label>Company email</label>
            <input type="email" value={form.companyEmail} onChange={(e) => set('companyEmail', e.target.value)} required />
          </div>
          <div className="field">
            <label>Company contact number</label>
            <input value={form.companyContact} onChange={(e) => set('companyContact', e.target.value)} />
          </div>
          <div className="field">
            <label>Company address</label>
            <input value={form.companyAddress} onChange={(e) => set('companyAddress', e.target.value)} />
          </div>
          <div className="field">
            <label>License type</label>
            <select value={form.licenseType} onChange={(e) => set('licenseType', e.target.value)}>
              <option value="trial">Trial</option>
              <option value="standard">Standard</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div className="field">
            <label>Environment</label>
            <select value={form.environment} onChange={(e) => set('environment', e.target.value)}>
              <option value="development">Development</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </select>
          </div>
          <div className="field">
            <label>Deployment type</label>
            <select value={form.deploymentType} onChange={(e) => set('deploymentType', e.target.value)}>
              <option value="cloud">Cloud</option>
              <option value="on_premise">On-premise</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div className="field">
            <label>Max users</label>
            <input type="number" min={1} value={form.maxUsers} onChange={(e) => set('maxUsers', e.target.value)} />
          </div>
          <div className="field">
            <label>Max admin users</label>
            <input type="number" min={1} value={form.maxAdminUsers} onChange={(e) => set('maxAdminUsers', e.target.value)} />
          </div>
          <div className="field">
            <label>Max token usage charge</label>
            <input type="number" min={0} value={form.maxTokenUsageCharge} onChange={(e) => set('maxTokenUsageCharge', e.target.value)} />
          </div>
          <div className="field">
            <label>Valid from</label>
            <input type="date" value={form.validFrom} onChange={(e) => set('validFrom', e.target.value)} required />
          </div>
          <div className="field">
            <label>Valid till</label>
            <input type="date" value={form.validTill} onChange={(e) => set('validTill', e.target.value)} required />
          </div>
        </div>

        <div className="field">
          <label>Remarks</label>
          <textarea rows={2} value={form.remarks} onChange={(e) => set('remarks', e.target.value)} />
        </div>

        {error && <div className="error-text">{error}</div>}

        <div className="actions" style={{ justifyContent: 'space-between' }}>
          <button type="button" className="btn" onClick={logout}>Sign out</button>
          <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Creating license…' : 'Create license'}</button>
        </div>
      </form>
    </div>
  );
}
