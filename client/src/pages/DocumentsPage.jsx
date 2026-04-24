import React, { useState, useEffect, useMemo } from 'react';
import { FiPlus, FiSearch, FiX, FiEdit2, FiTrash2, FiFileText } from 'react-icons/fi';
import { getDocuments, createDocument, updateDocument, deleteDocument } from '../services/api';

const statusColors = { draft: '#ca8a04', review: '#2563eb', approved: '#16a34a', obsolete: '#6b7280' };
const statusBg = { draft: '#fef9c3', review: '#dbeafe', approved: '#dcfce7', obsolete: '#f3f4f6' };

const Badge = ({ value }) => (
  <span style={{
    padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
    color: statusColors[value] || '#374151', backgroundColor: statusBg[value] || '#f3f4f6',
    textTransform: 'capitalize',
  }}>{value}</span>
);

const emptyDocument = {
  title: '', type: '', version: '', status: 'draft', device_id: '',
  author: '', approved_date: '', approved_by: '', description: '', content: '',
  device_name: '',
};

export default function DocumentsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyDocument);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getDocuments();
      setItems(Array.isArray(data) ? data : data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(d =>
      (d.title || '').toLowerCase().includes(q) ||
      (d.type || '').toLowerCase().includes(q) ||
      (d.author || '').toLowerCase().includes(q) ||
      (d.status || '').toLowerCase().includes(q) ||
      (d.device_name || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  const openDetail = (item) => { setSelected(item); setShowDetail(true); };
  const closeDetail = () => { setShowDetail(false); setSelected(null); };
  const openCreate = () => { setFormData({ ...emptyDocument }); setEditingId(null); setShowForm(true); };
  const openEdit = (item) => {
    setFormData({ ...emptyDocument, ...item, approved_date: item.approved_date ? item.approved_date.slice(0, 10) : '' });
    setEditingId(item.id); setShowDetail(false); setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      delete payload.device_name;
      if (editingId) { await updateDocument(editingId, payload); }
      else { await createDocument(payload); }
      setShowForm(false); fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    try { await deleteDocument(id); setConfirmDelete(null); setShowDetail(false); fetchData(); }
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

  if (loading) return <div style={loadingStyle}>Loading documents...</div>;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={h1Style}>
          <FiFileText style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Documents
        </h1>
        <button onClick={openCreate} style={btnPrimary}><FiPlus size={16} /> New Document</button>
      </div>

      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 400 }}>
        <FiSearch style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
        <input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: 34 }} />
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              {['Title', 'Type', 'Version', 'Status', 'Device', 'Author', 'Approved Date'].map(h =>
                <th key={h} style={thStyle}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={emptyStyle}>No documents found</td></tr>
            ) : filtered.map(d => (
              <tr key={d.id} onClick={() => openDetail(d)} style={{ cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <td style={tdStyle}>{d.title}</td>
                <td style={tdStyle}>{d.type}</td>
                <td style={tdStyle}>{d.version}</td>
                <td style={tdStyle}><Badge value={d.status} /></td>
                <td style={tdStyle}>{d.device_name || d.device_id}</td>
                <td style={tdStyle}>{d.author}</td>
                <td style={tdStyle}>{d.approved_date ? new Date(d.approved_date).toLocaleDateString() : '—'}</td>
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
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{selected.title}</h2>
              <button onClick={closeDetail} style={btnIcon}><FiX size={18} /></button>
            </div>
            <div style={detailGrid}>
              <DetailRow label="Type" value={selected.type} />
              <DetailRow label="Version" value={selected.version} />
              <DetailRow label="Status" value={<Badge value={selected.status} />} />
              <DetailRow label="Device" value={selected.device_name || selected.device_id} />
              <DetailRow label="Author" value={selected.author} />
              <DetailRow label="Approved By" value={selected.approved_by} />
              <DetailRow label="Approved Date" value={selected.approved_date ? new Date(selected.approved_date).toLocaleDateString() : '—'} />
              <DetailRow label="Created" value={selected.created_at ? new Date(selected.created_at).toLocaleDateString() : '—'} />
            </div>
            {selected.description && (
              <div style={{ marginTop: 16 }}>
                <span style={detailLabelS}>Description</span>
                <p style={detailTextS}>{selected.description}</p>
              </div>
            )}
            {selected.content && (
              <div style={{ marginTop: 12 }}>
                <span style={detailLabelS}>Content</span>
                <pre style={{
                  margin: '4px 0 0', fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap',
                  backgroundColor: '#f9fafb', padding: 12, borderRadius: 6, fontFamily: 'inherit',
                  maxHeight: 300, overflowY: 'auto',
                }}>{selected.content}</pre>
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
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{editingId ? 'Edit Document' : 'New Document'}</h2>
              <button onClick={() => setShowForm(false)} style={btnIcon}><FiX size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <Field label="Title" name="title" />
                <Field label="Type" name="type" options={['SOP', 'Policy', 'Manual', 'Report', 'Certificate', 'Specification', 'Other']} />
                <Field label="Version" name="version" />
                <Field label="Status" name="status" options={['draft', 'review', 'approved', 'obsolete']} />
                <Field label="Device ID" name="device_id" />
                <Field label="Author" name="author" />
                <Field label="Approved By" name="approved_by" />
                <Field label="Approved Date" name="approved_date" type="date" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Description</label>
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Content</label>
                <textarea value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} rows={6} style={{ ...inputStyle, resize: 'vertical' }} />
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
            <h3 style={{ margin: '0 0 8px' }}>Delete Document?</h3>
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
const detailLabelS = { fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' };
const detailTextS = { margin: '4px 0 0', fontSize: 14, color: '#374151' };
const btnPrimary = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const btnSecondary = { padding: '8px 16px', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const btnDanger = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const btnIcon = { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 };
