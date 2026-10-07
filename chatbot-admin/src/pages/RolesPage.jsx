import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { LEVEL_LABELS, assignableLevels } from '../roleLevels';

const PERMISSIONS = [
  ['canAccessDashboard', 'can_access_dashboard', 'View dashboard'],
  ['canViewAllChats', 'can_view_all_chats', 'View all chats'],
  ['canViewAllAdminChats', 'can_view_all_admin_chats', 'View all admin chats'],
  ['canDownload', 'can_download', 'Export / download data'],
  ['canManageUsers', 'can_manage_users', 'Manage users'],
  ['canManageCategories', 'can_manage_categories', 'Manage categories, subcategories & property configurations'],
  ['canManageRoles', 'can_manage_roles', 'Manage roles'],
  ['canAccessTrainAi', 'can_access_train_ai', 'AI training'],
  ['canAccessTokenUsage', 'can_access_token_usage', 'Token usage'],
  ['canAccessScheduler', 'can_access_scheduler', 'Scheduler'],
  ['canAccessLicenseManagement', 'can_access_license_management', 'License management'],
];

export default function RolesPage() {
  const { user } = useAuth();
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // { mode: 'new'|'edit', data }

  const myLevels = assignableLevels(user?.roleLevel);

  const load = useCallback(() => {
    api.get('/admin/roles').then(setRoles).catch((e) => setError(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(form) {
    if (modal.mode === 'new') {
      await api.post('/admin/roles', form);
    } else {
      await api.patch(`/admin/roles/${modal.data.uid}`, form);
    }
    setModal(null);
    load();
  }

  async function remove(role) {
    if (!window.confirm(`Delete the "${role.role_name}" role?`)) return;
    try {
      await api.delete(`/admin/roles/${role.uid}`);
    } catch (e) {
      setError(e.message);
    }
    load();
  }

  return (
    <>
      <div className="page-header">
        <h1>Roles</h1>
        {myLevels.length > 0 && (
          <button className="btn primary" onClick={() => setModal({ mode: 'new', data: { roleLevel: myLevels[myLevels.length - 1] } })}>+ New role</button>
        )}
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="card">
        {roles.length === 0 ? <div className="empty-state">No roles yet.</div> : (
          <table>
            <thead><tr><th>Name</th><th>Level</th><th>Permissions</th><th></th></tr></thead>
            <tbody>
              {roles.map((r) => {
                const canManage = myLevels.includes(r.role_level);
                const activePerms = PERMISSIONS.filter(([, col]) => !!r[col]).length;
                return (
                  <tr key={r.uid}>
                    <td>{r.role_name}{r.is_system ? <span className="badge active" style={{ marginLeft: 8 }}>system</span> : null}</td>
                    <td style={{ textTransform: 'capitalize' }}>{LEVEL_LABELS[r.role_level] || r.role_level}</td>
                    <td>{activePerms} of {PERMISSIONS.length}</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn" disabled={!canManage} onClick={() => setModal({ mode: 'edit', data: r })}>Edit</button>
                      <button className="btn danger" disabled={!canManage || !!r.is_system} onClick={() => remove(r)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === 'new' ? 'New role' : 'Edit role'} onClose={() => setModal(null)}>
          <RoleForm initial={modal.data} levels={myLevels} onSubmit={save} onCancel={() => setModal(null)} />
        </Modal>
      )}
    </>
  );
}

function RoleForm({ initial, levels, onSubmit, onCancel }) {
  const [roleName, setRoleName] = useState(initial.role_name || '');
  const [roleLevel, setRoleLevel] = useState(initial.role_level || levels[0]);
  const [perms, setPerms] = useState(() => {
    const p = {};
    PERMISSIONS.forEach(([key, col]) => { p[key] = !!initial[col]; });
    return p;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function togglePerm(key) {
    setPerms((p) => ({ ...p, [key]: !p[key] }));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ roleName, roleLevel, ...perms });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label>Role name</label>
        <input value={roleName} onChange={(e) => setRoleName(e.target.value)} required minLength={2} />
      </div>
      <div className="field">
        <label>Level</label>
        <select value={roleLevel} onChange={(e) => setRoleLevel(e.target.value)}>
          {levels.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Permissions</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
          {PERMISSIONS.map(([key, , label]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500 }}>
              <input type="checkbox" checked={perms[key]} onChange={() => togglePerm(key)} />
              {label}
            </label>
          ))}
        </div>
      </div>
      {error && <div className="error-text">{error}</div>}
      <div className="actions">
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}
