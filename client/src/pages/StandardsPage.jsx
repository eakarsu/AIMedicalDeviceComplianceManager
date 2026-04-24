import React, { useState, useEffect, useMemo } from 'react';
import { FiPlus, FiSearch, FiX, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { getStandards, createStandard, updateStandard, deleteStandard } from '../services/api';

const statusColors = { active: '#16a34a', draft: '#ca8a04', retired: '#6b7280', superseded: '#9333ea' };
const statusBg = { active: '#dcfce7', draft: '#fef9c3', retired: '#f3f4f6', superseded: '#f3e8ff' };

const Badge = ({ value }) => (
  <span style={{
    padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
    color: statusColors[value] || '#374151', backgroundColor: statusBg[value] || '#f3f4f6',
    textTransform: 'capitalize',
  }}>{value}</span>
);

const emptyStandard = {
  code: '', name: '', category: '', authority: '', version: '', status: 'active',
  description: '', requirements: '', effective_date: '', expiry_date: '',
};

export default function StandardsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyStandard);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getStandards();
      setItems(Array.isArray(data) ? data : data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(d =>
      (d.code || '').toLowerCase().includes(q) ||
      (d.name || '').toLowerCase().includes(q) ||
      (d.category || '').toLowerCase().includes(q) ||
      (d.authority || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  const openDetail = (item) => { setSelected(item); setShowDetail(true); };
  const closeDetail = () => { setShowDetail(false); setSelected(null); };
  const openCreate = () => { setFormData({ ...emptyStandard }); setEditingId(null); setShowForm(true); };
  const openEdit = (item) => {
    setFormData({ ...emptyStandard, ...item, effective_date: item.effective_date ? item.effective_date.slice(0, 10) : '', expiry_date: item.expiry_date ? item.expiry_date.slice(0, 10) : '' });
    setEditingId(item.id); setShowDetail(false); setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) { await updateStandard(editingId, formData); }
      else { await createStandard(formData); }
      setShowForm(false); fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    try { await deleteStandard(id); setConfirmDelete(null); setShowDetail(false); fetchData(); }
    catch (err) { console.error(err); }
  };

  const Field = ({ label, name, type = 'text', options }) => (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      {options ? (
        <select value={formData[name]} onChange={e => setFormData({ ...formData, [name]: e.target.value })} style={inputStyle}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={formData[name]} onChange={e => setFormData({ ...formData, [name]: e.target.value })} style={inputStyle} />
      )}
    </div>
  );

  if (loading) return <div style={loadingStyle}>Loading standards...</div>;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={h1Style}>Standards</h1>
        <button onClick={openCreate} style={btnPrimary}><FiPlus size={16} /> New Standard</button>
      </div>

      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 400 }}>
        <FiSearch style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
        <input placeholder="Search standards..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: 34 }} />
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              {['Code', 'Name', 'Category', 'Authority', 'Version', 'Status'].map(h => <th key={h} style={thStyle}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={emptyStyle}>No standards found</td></tr>
            ) : filtered.map(d => (
              <tr key={d.id} onClick={() => openDetail(d)} style={{ cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{d.code}</td>
                <td style={tdStyle}>{d.name}</td>
                <td style={tdStyle}>{d.category}</td>
                <td style={tdStyle}>{d.authority}</td>
                <td style={tdStyle}>{d.version}</td>
                <td style={tdStyle}><Badge value={d.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showDetail && selected && (
        <Overlay onClose={closeDetail}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{selected.code} — {selected.name}</h2>
              <button onClick={closeDetail} style={btnIcon}><FiX size={18} /></button>
            </div>
            <div style={detailGrid}>
              <DetailRow label="Code" value={selected.code} />
              <DetailRow label="Category" value={selected.category} />
              <DetailRow label="Authority" value={selected.authority} />
              <DetailRow label="Version" value={selected.version} />
              <DetailRow label="Status" value={<Badge value={selected.status} />} />
              <DetailRow label="Effective Date" value={selected.effective_date ? new Date(selected.effective_date).toLocaleDateString() : '—'} />
              <DetailRow label="Expiry Date" value={selected.expiry_date ? new Date(selected.expiry_date).toLocaleDateString() : '—'} />
            </div>
            {selected.description && (
              <div style={{ marginTop: 16 }}>
                <span style={detailLabel}>Description</span>
                <p style={detailText}>{selected.description}</p>
              </div>
            )}
            {selected.requirements && (
              <div style={{ marginTop: 12 }}>
                <span style={detailLabel}>Requirements</span>
                <pre style={{ ...detailText, whiteSpace: 'pre-wrap', backgroundColor: '#f9fafb', padding: 12, borderRadius: 6, fontFamily: 'inherit' }}>{selected.requirements}</pre>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => openEdit(selected)} style={btnPrimary}><FiEdit2 size={14} /> Edit</button>
              <button onClick={() => setConfirmDelete(selected.id)} style={btnDanger}><FiTrash2 size={14} /> Delete</button>
            </div>
          </div>
        </Overlay>
      )}

      {/* Form Modal */}
      {showForm && (
        <Overlay onClose={() => setShowForm(false)}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{editingId ? 'Edit Standard' : 'New Standard'}</h2>
              <button onClick={() => setShowForm(false)} style={btnIcon}><FiX size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <Field label="Code" name="code" />
                <Field label="Name" name="name" />
                <Field label="Category" name="category" />
                <Field label="Authority" name="authority" />
                <Field label="Version" name="version" />
                <Field label="Status" name="status" options={['active', 'draft', 'retired', 'superseded']} />
                <Field label="Effective Date" name="effective_date" type="date" />
                <Field label="Expiry Date" name="expiry_date" type="date" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Description</label>
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Requirements</label>
                <textarea value={formData.requirements} onChange={e => setFormData({ ...formData, requirements: e.target.value })} rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} style={btnSecondary}>Cancel</button>
                <button type="submit" style={btnPrimary}>{editingId ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </Overlay>
      )}

      {confirmDelete && (
        <Overlay onClose={() => setConfirmDelete(null)}>
          <div style={{ ...modalStyle, maxWidth: 400, textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 8px' }}>Delete Standard?</h3>
            <p style={{ color: '#6b7280', margin: '0 0 20px' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => setConfirmDelete(null)} style={btnSecondary}>Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} style={btnDanger}>Delete</button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{label}</span>
      <div style={{ fontSize: 14, color: '#111827', marginTop: 2 }}>{value || '—'}</div>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#374151' };
const loadingStyle = { padding: 40, textAlign: 'center', color: '#6b7280' };
const h1Style = { fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 };
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 14 };
const thStyle = { textAlign: 'left', padding: '10px 14px', fontWeight: 600, fontSize: 12, color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' };
const tdStyle = { padding: '10px 14px', borderBottom: '1px solid #f3f4f6', color: '#374151' };
const emptyStyle = { padding: 24, textAlign: 'center', color: '#9ca3af' };
const modalStyle = { backgroundColor: '#fff', borderRadius: 12, padding: 24, maxWidth: 640, width: '90vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' };
const detailGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' };
const detailLabel = { fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' };
const detailText = { margin: '4px 0 0', fontSize: 14, color: '#374151' };
const btnPrimary = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const btnSecondary = { padding: '8px 16px', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const btnDanger = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const btnIcon = { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 };
