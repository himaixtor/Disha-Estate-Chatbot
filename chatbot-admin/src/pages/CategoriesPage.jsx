import { useEffect, useState, useCallback, Fragment } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';

const PAGE_SIZE = 20;

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [syncMessage, setSyncMessage] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());
  const [catModal, setCatModal] = useState(null);
  const [subModal, setSubModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, subs] = await Promise.all([api.get('/categories/admin/all'), api.get('/subcategories')]);
      setCategories(cats);
      setSubcategories(subs);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim().toLowerCase());
      setOffset(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

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

  function matchesBranch(category, ancestors = new Set()) {
    if (search && category.name.toLowerCase().includes(search)) return true;
    if (ancestors.has(Number(category.id))) return false;
    const nextAncestors = new Set([...ancestors, Number(category.id)]);
    return (childrenByParent.get(Number(category.id)) || [])
      .some((child) => matchesBranch(child, nextAncestors));
  }

  function renderCategoryRow(category, depth = 0) {
    const children = childrenByParent.get(Number(category.id)) || [];
    const categoryMatches = !search || category.name.toLowerCase().includes(search);
    const isOpen = expanded.has(category.id) || (Boolean(search) && !categoryMatches);
    const isChild = category.parent_id !== null;
    const visibleChildren = search && !categoryMatches ? children.filter((child) => matchesBranch(child)) : children;
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
        {isOpen && visibleChildren.map((child) => renderCategoryRow(child, depth + 1))}
      </Fragment>
    );
  }

  const matchingCategories = search ? categories.filter((category) => matchesBranch(category)) : categories;
  const visibleCategories = matchingCategories.slice(offset, offset + PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(matchingCategories.length / PAGE_SIZE));
  const page = Math.floor(offset / PAGE_SIZE) + 1;

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
        <div className="leads-toolbar">
          <div className="field search-field">
            <input
              type="search"
              placeholder="Search categories and child categories..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
        </div>
        {visibleCategories.length === 0 ? <div className="empty-state">{loading ? 'Loading categories…' : 'No categories found.'}</div> : (
          <table>
            <thead><tr><th>Name</th><th>Status</th><th>Sort</th><th>Child categories</th><th></th></tr></thead>
            <tbody>
              {visibleCategories.map((category) => renderCategoryRow(category))}
            </tbody>
          </table>
        )}
        <div className="leads-pagination">
          <span>{matchingCategories.length ? `${offset + 1}-${Math.min(offset + PAGE_SIZE, matchingCategories.length)} of ${matchingCategories.length}` : '0 of 0'}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>Page {page} of {pageCount}</span>
            <button className="btn" disabled={loading || offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Previous</button>
            <button className="btn" disabled={loading || offset + PAGE_SIZE >= matchingCategories.length} onClick={() => setOffset(offset + PAGE_SIZE)}>Next</button>
          </div>
        </div>
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
