import React, { useState, useEffect, useMemo } from 'react';
import { FiPlus, FiSearch, FiX, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { getDevices, createDevice, updateDevice, deleteDevice } from '../services/api';

const statusColors = { active: '#16a34a', inactive: '#6b7280', recalled: '#dc2626', pending: '#ca8a04' };
const statusBg = { active: '#dcfce7', inactive: '#f3f4f6', recalled: '#fee2e2', pending: '#fef9c3' };

const Badge = ({ value, colors, backgrounds }) => (
  <span style={{
    padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
    color: colors[value] || '#374151', backgroundColor: backgrounds[value] || '#f3f4f6',
    textTransform: 'capitalize',
  }}>{value}</span>
);

const emptyDevice = {
  name: '', manufacturer: '', model_number: '', device_class: '', status: 'active',
  department: '', next_inspection_date: '', description: '', serial_number: '',
  firmware_version: '', installation_date: '', location: '',
};

export default function DevicesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyDevice);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getDevices();
      setItems(Array.isArray(data) ? data : data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(d =>
      (d.name || '').toLowerCase().includes(q) ||
      (d.manufacturer || '').toLowerCase().includes(q) ||
      (d.department || '').toLowerCase().includes(q) ||
      (d.status || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  const openDetail = (item) => { setSelected(item); setShowDetail(true); };
  const closeDetail = () => { setShowDetail(false); setSelected(null); };

  const openCreate = () => { setFormData({ ...emptyDevice }); setEditingId(null); setShowForm(true); };
  const openEdit = (item) => {
    setFormData({ ...emptyDevice, ...item, next_inspection_date: item.next_inspection_date ? item.next_inspection_date.slice(0, 10) : '', installation_date: item.installation_date ? item.installation_date.slice(0, 10) : '' });
    setEditingId(item.id);
    setShowDetail(false);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) { await updateDevice(editingId, formData); }
      else { await createDevice(formData); }
      setShowForm(false);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDevice(id);
      setConfirmDelete(null);
      setShowDetail(false);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const Field = ({ label, name, type = 'text', options }) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#374151' }}>{label}</label>
      {options ? (
        <select value={formData[name]} onChange={e => setFormData({ ...formData, [name]: e.target.value })}
          style={inputStyle}>{options.map(o => <option key={o} value={o}>{o}</option>)}</select>
      ) : (
        <input type={type} value={formData[name]} onChange={e => setFormData({ ...formData, [name]: e.target.value })}
          style={inputStyle} />
      )}
    </div>
  );

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading devices...</div>;

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Devices</h1>
        <button onClick={openCreate} style={btnPrimary}><FiPlus size={16} /> New Device</button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 400 }}>
        <FiSearch style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
        <input placeholder="Search devices..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, paddingLeft: 34 }} />
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              {['Name', 'Manufacturer', 'Model #', 'Class', 'Status', 'Department', 'Next Inspection'].map(h =>
                <th key={h} style={thStyle}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>No devices found</td></tr>
            ) : filtered.map(d => (
              <tr key={d.id} onClick={() => openDetail(d)} style={{ cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <td style={tdStyle}>{d.name}</td>
                <td style={tdStyle}>{d.manufacturer}</td>
                <td style={tdStyle}>{d.model_number}</td>
                <td style={tdStyle}>{d.device_class}</td>
                <td style={tdStyle}><Badge value={d.status} colors={statusColors} backgrounds={statusBg} /></td>
                <td style={tdStyle}>{d.department}</td>
                <td style={tdStyle}>{d.next_inspection_date ? new Date(d.next_inspection_date).toLocaleDateString() : '—'}</td>
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
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{selected.name}</h2>
              <button onClick={closeDetail} style={btnIcon}><FiX size={18} /></button>
            </div>
            <div style={detailGrid}>
              <DetailRow label="Manufacturer" value={selected.manufacturer} />
              <DetailRow label="Model #" value={selected.model_number} />
              <DetailRow label="Serial #" value={selected.serial_number} />
              <DetailRow label="Class" value={selected.device_class} />
              <DetailRow label="Status" value={<Badge value={selected.status} colors={statusColors} backgrounds={statusBg} />} />
              <DetailRow label="Department" value={selected.department} />
              <DetailRow label="Location" value={selected.location} />
              <DetailRow label="Firmware" value={selected.firmware_version} />
              <DetailRow label="Installation Date" value={selected.installation_date ? new Date(selected.installation_date).toLocaleDateString() : '—'} />
              <DetailRow label="Next Inspection" value={selected.next_inspection_date ? new Date(selected.next_inspection_date).toLocaleDateString() : '—'} />
            </div>
            {selected.description && (
              <div style={{ marginTop: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Description</span>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#374151' }}>{selected.description}</p>
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
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{editingId ? 'Edit Device' : 'New Device'}</h2>
              <button onClick={() => setShowForm(false)} style={btnIcon}><FiX size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <Field label="Name" name="name" />
                <Field label="Manufacturer" name="manufacturer" />
                <Field label="Model #" name="model_number" />
                <Field label="Serial #" name="serial_number" />
                <Field label="Class" name="device_class" options={['I', 'II', 'III']} />
                <Field label="Status" name="status" options={['active', 'inactive', 'recalled', 'pending']} />
                <Field label="Department" name="department" />
                <Field label="Location" name="location" />
                <Field label="Firmware Version" name="firmware_version" />
                <Field label="Installation Date" name="installation_date" type="date" />
                <Field label="Next Inspection" name="next_inspection_date" type="date" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Description</label>
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} style={btnSecondary}>Cancel</button>
                <button type="submit" style={btnPrimary}>{editingId ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </Overlay>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <Overlay onClose={() => setConfirmDelete(null)}>
          <div style={{ ...modalStyle, maxWidth: 400, textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 8px' }}>Delete Device?</h3>
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

/* ── Shared small components ─────────────────────────────────────────────── */

function Overlay({ children, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
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

/* ── Styles ───────────────────────────────────────────────────────────────── */

const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db',
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
};
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 14 };
const thStyle = { textAlign: 'left', padding: '10px 14px', fontWeight: 600, fontSize: 12, color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' };
const tdStyle = { padding: '10px 14px', borderBottom: '1px solid #f3f4f6', color: '#374151' };
const modalStyle = { backgroundColor: '#fff', borderRadius: 12, padding: 24, maxWidth: 640, width: '90vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' };
const detailGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' };
const btnPrimary = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const btnSecondary = { padding: '8px 16px', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const btnDanger = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const btnIcon = { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 };
