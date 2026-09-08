import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(false);

  const load = useCallback(() => {
    Promise.all([api.get('/admin/users'), api.get('/admin/roles')])
      .then(([u, r]) => { setUsers(u); setRoles(r); })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createUser(form) {
    await api.post('/admin/users', form);
    setModal(false);
    load();
  }

  async function toggleActive(u) {
    await api.patch(`/admin/users/${u.uid}/active`, { isActive: !u.is_active });
    load();
  }

  function roleName(roleUid) {
    return roles.find((r) => r.uid === roleUid)?.role_name || roleUid;
  }

  return (
    <>
      <div className="page-header">
        <h1>Users</h1>
        <button className="btn primary" onClick={() => setModal(true)}>+ New user</button>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="card">
        {users.length === 0 ? <div className="empty-state">No users yet.</div> : (
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{roleName(u.role_uid)}</td>
                  <td><span className={`badge ${u.is_active ? 'active' : 'inactive'}`}>{u.is_active ? 'active' : 'inactive'}</span></td>
                  <td><button className="btn danger" onClick={() => toggleActive(u)}>{u.is_active ? 'Deactivate' : 'Activate'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title="New user" onClose={() => setModal(false)}>
          <UserForm roles={roles} onSubmit={createUser} onCancel={() => setModal(false)} />
        </Modal>
      )}
    </>
  );
}

function UserForm({ roles, onSubmit, onCancel }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [roleUid, setRoleUid] = useState(roles[0]?.uid || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ name, email, password, roleUid, contactNumber: contactNumber || undefined });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
      </div>
      <div className="field">
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="field">
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
      </div>
      <div className="field">
        <label>Contact number</label>
        <input value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
      </div>
      <div className="field">
        <label>Role</label>
        <select value={roleUid} onChange={(e) => setRoleUid(e.target.value)} required>
          {roles.map((r) => <option key={r.uid} value={r.uid}>{r.role_name}</option>)}
        </select>
      </div>
      {error && <div className="error-text">{error}</div>}
      <div className="actions">
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Creating…' : 'Create'}</button>
      </div>
    </form>
  );
}
