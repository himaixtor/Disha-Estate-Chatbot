import { useEffect, useState, useCallback, Fragment } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [catModal, setCatModal] = useState(null); // { mode: 'new'|'edit', data }
  const [subModal, setSubModal] = useState(null); // { mode, categoryId, data }

  const load = useCallback(() => {
    Promise.all([api.get('/categories/admin/all'), api.get('/subcategories')])
      .then(([cats, subs]) => { setCategories(cats); setSubcategories(subs); })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveCategory(form) {
    if (catModal.mode === 'new') {
      await api.post('/categories', { name: form.name, sortOrder: Number(form.sortOrder) || 0 });
    } else {
      await api.patch(`/categories/${catModal.data.id}`, { name: form.name, sortOrder: Number(form.sortOrder) || 0 });
    }
    setCatModal(null);
    load();
  }

  async function toggleCategoryActive(cat) {
    await api.patch(`/categories/${cat.id}`, { isActive: cat.is_active ? 0 : 1 });
    load();
  }

  async function saveSubcategory(form) {
    if (subModal.mode === 'new') {
      await api.post('/subcategories', { categoryId: subModal.categoryId, name: form.name, sortOrder: Number(form.sortOrder) || 0 });
    } else {
      await api.patch(`/subcategories/${subModal.data.id}`, { name: form.name, sortOrder: Number(form.sortOrder) || 0 });
    }
    setSubModal(null);
    load();
  }

  async function toggleSubActive(sub) {
    await api.patch(`/subcategories/${sub.id}`, { isActive: sub.is_active ? 0 : 1 });
    load();
  }

  return (
    <>
      <div className="page-header">
        <h1>Categories</h1>
        <button className="btn primary" onClick={() => setCatModal({ mode: 'new', data: { name: '', sortOrder: 0 } })}>+ New category</button>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="card">
        {categories.length === 0 ? <div className="empty-state">No categories yet.</div> : (
          <table>
            <thead><tr><th>Name</th><th>Status</th><th>Sort</th><th>Subcategories</th><th></th></tr></thead>
            <tbody>
              {categories.map((cat) => {
                const subs = subcategories.filter((s) => s.category_id === cat.id);
                const isOpen = expanded === cat.id;
                return (
                  <Fragment key={cat.id}>
                    <tr>
                      <td>{cat.name}</td>
                      <td><span className={`badge ${cat.is_active ? 'active' : 'inactive'}`}>{cat.is_active ? 'active' : 'inactive'}</span></td>
                      <td>{cat.sort_order}</td>
                      <td>
                        <button className="btn" onClick={() => setExpanded(isOpen ? null : cat.id)}>{subs.length} — {isOpen ? 'hide' : 'show'}</button>
                      </td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="btn" onClick={() => setCatModal({ mode: 'edit', data: cat })}>Edit</button>
                        <button className="btn danger" onClick={() => toggleCategoryActive(cat)}>{cat.is_active ? 'Deactivate' : 'Activate'}</button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${cat.id}-subs`}>
                        <td colSpan={5} style={{ background: '#f8fafc' }}>
                          <div style={{ padding: '8px 4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                              <strong style={{ fontSize: '.8rem' }}>Subcategories</strong>
                              <button className="btn" onClick={() => setSubModal({ mode: 'new', categoryId: cat.id, data: { name: '', sortOrder: 0 } })}>+ Add subcategory</button>
                            </div>
                            {subs.length === 0 ? <div className="empty-state">None yet.</div> : (
                              <table>
                                <thead><tr><th>Name</th><th>Status</th><th>Sort</th><th></th></tr></thead>
                                <tbody>
                                  {subs.map((sub) => (
                                    <tr key={sub.id}>
                                      <td>{sub.name}</td>
                                      <td><span className={`badge ${sub.is_active ? 'active' : 'inactive'}`}>{sub.is_active ? 'active' : 'inactive'}</span></td>
                                      <td>{sub.sort_order}</td>
                                      <td style={{ display: 'flex', gap: 6 }}>
                                        <button className="btn" onClick={() => setSubModal({ mode: 'edit', categoryId: cat.id, data: sub })}>Edit</button>
                                        <button className="btn danger" onClick={() => toggleSubActive(sub)}>{sub.is_active ? 'Deactivate' : 'Activate'}</button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {catModal && (
        <Modal title={catModal.mode === 'new' ? 'New category' : 'Edit category'} onClose={() => setCatModal(null)}>
          <NameSortForm initial={catModal.data} onSubmit={saveCategory} onCancel={() => setCatModal(null)} />
        </Modal>
      )}

      {subModal && (
        <Modal title={subModal.mode === 'new' ? 'New subcategory' : 'Edit subcategory'} onClose={() => setSubModal(null)}>
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
