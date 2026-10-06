import { useEffect, useState, useCallback, Fragment } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [error, setError] = useState(null);
  const [syncMessage, setSyncMessage] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());
  const [catModal, setCatModal] = useState(null);
  const [subModal, setSubModal] = useState(null);

  const load = useCallback(() => {
    Promise.all([api.get('/categories/admin/all'), api.get('/subcategories')])
      .then(([cats, subs]) => { setCategories(cats); setSubcategories(subs); })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveCategory(form) {
    await api.patch(`/categories/${catModal.data.id}`, { name: form.name, sortOrder: Number(form.sortOrder) || 0 });
    setCatModal(null);
    load();
  }

  async function toggleCategoryActive(cat) {
    await api.patch(`/categories/${cat.id}`, { isActive: cat.is_active ? 0 : 1 });
    load();
  }

  async function saveSubcategory(form) {
    await api.patch(`/subcategories/${subModal.data.id}`, { name: form.name, sortOrder: Number(form.sortOrder) || 0 });
    setSubModal(null);
    load();
  }

  async function toggleSubActive(sub) {
    await api.patch(`/subcategories/${sub.id}`, { isActive: sub.is_active ? 0 : 1 });
    load();
  }

  function toggleExpanded(id) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const childrenByParent = new Map();
  subcategories.forEach((category) => {
    const parentId = Number(category.parent_id);
    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
    childrenByParent.get(parentId).push(category);
  });

  function renderCategoryRow(category, depth = 0) {
    const children = childrenByParent.get(Number(category.id)) || [];
    const isOpen = expanded.has(category.id);
    const isChild = category.parent_id !== null;
    return (
      <Fragment key={category.id}>
        <tr>
          <td style={{ paddingLeft: 10 + depth * 22 }}>{depth > 0 ? '↳ ' : ''}{category.name}</td>
          <td><span className={`badge ${category.is_active ? 'active' : 'inactive'}`}>{category.is_active ? 'active' : 'inactive'}</span></td>
          <td>{category.sort_order}</td>
          <td>
            {children.length > 0
              ? <button className="btn" onClick={() => toggleExpanded(category.id)}>{children.length} — {isOpen ? 'hide' : 'show'}</button>
              : <span>—</span>}
          </td>
          <td style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button className="btn" onClick={() => (isChild
              ? setSubModal({ mode: 'edit', categoryId: category.parent_id, data: category })
              : setCatModal({ mode: 'edit', data: category }))}>Edit</button>
            <button className="btn danger" onClick={() => (isChild ? toggleSubActive(category) : toggleCategoryActive(category))}>
              {category.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </td>
        </tr>
        {isOpen && children.map((child) => renderCategoryRow(child, depth + 1))}
      </Fragment>
    );
  }

  async function syncFromCms() {
    setSyncing(true);
    setError(null);
    setSyncMessage(null);
    try {
      const result = await api.post('/categories/sync', {});
      setSyncMessage(`Synced ${result.categoriesSynced} property types, ${result.subcategoriesSynced} child categories, and ${result.locationsSynced} locations.`);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Categories</h1>
        <button className="btn" onClick={syncFromCms} disabled={syncing}>
          {syncing ? 'Syncing…' : 'Sync from CMS'}
        </button>
      </div>

      {error && <div className="error-text">{error}</div>}
      {syncMessage && <div className="status-pill" role="status"><span />{syncMessage}</div>}

      <div className="card">
        {categories.length === 0 ? <div className="empty-state">No categories yet.</div> : (
          <table>
            <thead><tr><th>Name</th><th>Status</th><th>Sort</th><th>Child categories</th><th></th></tr></thead>
            <tbody>
              {categories.map((category) => renderCategoryRow(category))}
            </tbody>
          </table>
        )}
      </div>

      {catModal && (
        <Modal title="Edit category" onClose={() => setCatModal(null)}>
          <NameSortForm initial={catModal.data} onSubmit={saveCategory} onCancel={() => setCatModal(null)} />
        </Modal>
      )}

      {subModal && (
        <Modal title="Edit child category" onClose={() => setSubModal(null)}>
          <NameSortForm initial={subModal.data} onSubmit={saveSubcategory} onCancel={() => setSubModal(null)} />
        </Modal>
      )}
    </>
  );
}

function NameSortForm({ initial, onSubmit, onCancel }) {
  const [name, setName] = useState(initial.name || '');
  const [sortOrder, setSortOrder] = useState(initial.sort_order ?? initial.sortOrder ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ name, sortOrder });
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
        <label>Sort order</label>
        <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
      </div>
      {error && <div className="error-text">{error}</div>}
      <div className="actions">
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}
