import React, { useState, useEffect, useMemo } from 'react';
import { FiPlus, FiSearch, FiX, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { getChecklists, createChecklist, updateChecklist, deleteChecklist } from '../services/api';

const statusColors = { pending: '#ca8a04', 'in-progress': '#2563eb', completed: '#16a34a', failed: '#dc2626', 'not-applicable': '#6b7280' };
const statusBg = { pending: '#fef9c3', 'in-progress': '#dbeafe', completed: '#dcfce7', failed: '#fee2e2', 'not-applicable': '#f3f4f6' };
const priorityColors = { critical: '#dc2626', high: '#ea580c', medium: '#ca8a04', low: '#16a34a' };
const priorityBg = { critical: '#fee2e2', high: '#fff7ed', medium: '#fef9c3', low: '#dcfce7' };

const Badge = ({ value, colors, backgrounds }) => (
  <span style={{
    padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
    color: (colors || {})[value] || '#374151', backgroundColor: (backgrounds || {})[value] || '#f3f4f6',
    textTransform: 'capitalize',
  }}>{value}</span>
);

const emptyChecklist = {
  item_name: '', device_id: '', standard_id: '', status: 'pending', priority: 'medium',
  assigned_to: '', due_date: '', description: '', notes: '', device_name: '', standard_name: '',
};

export default function ChecklistsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyChecklist);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getChecklists();
      setItems(Array.isArray(data) ? data : data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(d =>
      (d.item_name || '').toLowerCase().includes(q) ||
      (d.assigned_to || '').toLowerCase().includes(q) ||
      (d.status || '').toLowerCase().includes(q) ||
      (d.priority || '').toLowerCase().includes(q) ||
      (d.device_name || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  const openDetail = (item) => { setSelected(item); setShowDetail(true); };
  const closeDetail = () => { setShowDetail(false); setSelected(null); };
  const openCreate = () => { setFormData({ ...emptyChecklist }); setEditingId(null); setShowForm(true); };
  const openEdit = (item) => {
    setFormData({ ...emptyChecklist, ...item, due_date: item.due_date ? item.due_date.slice(0, 10) : '' });
    setEditingId(item.id); setShowDetail(false); setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      delete payload.device_name;
      delete payload.standard_name;
      if (editingId) { await updateChecklist(editingId, payload); }
      else { await createChecklist(payload); }
      setShowForm(false); fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    try { await deleteChecklist(id); setConfirmDelete(null); setShowDetail(false); fetchData(); }
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

  if (loading) return <div style={loadingStyle}>Loading checklists...</div>;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={h1Style}>Checklists</h1>
        <button onClick={openCreate} style={btnPrimary}><FiPlus size={16} /> New Checklist Item</button>
      </div>

      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 400 }}>
        <FiSearch style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
        <input placeholder="Search checklists..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: 34 }} />
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              {['Item Name', 'Device', 'Standard', 'Status', 'Priority', 'Assigned To', 'Due Date'].map(h =>
                <th key={h} style={thStyle}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={emptyStyle}>No checklist items found</td></tr>
            ) : filtered.map(d => (
              <tr key={d.id} onClick={() => openDetail(d)} style={{ cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <td style={tdStyle}>{d.item_name}</td>
                <td style={tdStyle}>{d.device_name || d.device_id}</td>
                <td style={tdStyle}>{d.standard_name || d.standard_id}</td>
                <td style={tdStyle}><Badge value={d.status} colors={statusColors} backgrounds={statusBg} /></td>
                <td style={tdStyle}><Badge value={d.priority} colors={priorityColors} backgrounds={priorityBg} /></td>
                <td style={tdStyle}>{d.assigned_to}</td>
                <td style={tdStyle}>{d.due_date ? new Date(d.due_date).toLocaleDateString() : '—'}</td>
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
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{selected.item_name}</h2>
              <button onClick={closeDetail} style={btnIcon}><FiX size={18} /></button>
            </div>
            <div style={detailGrid}>
              <DetailRow label="Device" value={selected.device_name || selected.device_id} />
              <DetailRow label="Standard" value={selected.standard_name || selected.standard_id} />
              <DetailRow label="Status" value={<Badge value={selected.status} colors={statusColors} backgrounds={statusBg} />} />
              <DetailRow label="Priority" value={<Badge value={selected.priority} colors={priorityColors} backgrounds={priorityBg} />} />
              <DetailRow label="Assigned To" value={selected.assigned_to} />
              <DetailRow label="Due Date" value={selected.due_date ? new Date(selected.due_date).toLocaleDateString() : '—'} />
            </div>
            {selected.description && (
              <div style={{ marginTop: 16 }}>
                <span style={detailLabel}>Description</span>
                <p style={detailText}>{selected.description}</p>
              </div>
            )}
            {selected.notes && (
              <div style={{ marginTop: 12 }}>
                <span style={detailLabel}>Notes</span>
                <p style={detailText}>{selected.notes}</p>
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
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{editingId ? 'Edit Checklist Item' : 'New Checklist Item'}</h2>
              <button onClick={() => setShowForm(false)} style={btnIcon}><FiX size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <Field label="Item Name" name="item_name" />
                <Field label="Device ID" name="device_id" />
                <Field label="Standard ID" name="standard_id" />
                <Field label="Status" name="status" options={['pending', 'in-progress', 'completed', 'failed', 'not-applicable']} />
                <Field label="Priority" name="priority" options={['critical', 'high', 'medium', 'low']} />
                <Field label="Assigned To" name="assigned_to" />
                <Field label="Due Date" name="due_date" type="date" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Description</label>
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Notes</label>
                <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
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
            <h3 style={{ margin: '0 0 8px' }}>Delete Checklist Item?</h3>
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
