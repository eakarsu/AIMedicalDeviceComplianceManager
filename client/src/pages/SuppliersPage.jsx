import React, { useState, useEffect, useCallback } from 'react';
import {
  FiPlus, FiSearch, FiEdit2, FiTrash2, FiX, FiAlertTriangle, FiLoader, FiCheck, FiMinus
} from 'react-icons/fi';
import {
  getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier
} from '../services/api';

const QUAL_COLORS = {
  qualified: '#22c55e',
  conditional: '#eab308',
  disqualified: '#ef4444',
  pending: '#3b82f6',
};

const QUAL_STATUSES = ['qualified', 'conditional', 'disqualified', 'pending'];

const emptyForm = {
  name: '', contact_person: '', email: '', phone: '', address: '',
  category: '', qualification_status: 'pending', iso_certified: false,
  last_audit_date: '', next_audit_date: '', risk_rating: '', notes: '',
};

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modalBox = {
  background: '#fff', borderRadius: 12, width: '95%', maxWidth: 720,
  maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
};
const badge = (bg) => ({
  display: 'inline-block', padding: '2px 10px', borderRadius: 12,
  fontSize: 12, fontWeight: 600, color: '#fff', background: bg, textTransform: 'capitalize',
});
const inputStyle = {
  width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
  borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none',
};
const btnPrimary = {
  padding: '10px 20px', background: '#1a73e8', color: '#fff', border: 'none',
  borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14,
};
const btnDanger = {
  padding: '10px 20px', background: '#ef4444', color: '#fff', border: 'none',
  borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14,
};
const btnSecondary = {
  padding: '10px 20px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db',
  borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14,
};

export default function SuppliersPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSuppliers();
      setItems(Array.isArray(res) ? res : res.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((i) => {
    const s = search.toLowerCase();
    return (
      (i.name || '').toLowerCase().includes(s) ||
      (i.contact_person || '').toLowerCase().includes(s) ||
      (i.email || '').toLowerCase().includes(s) ||
      (i.category || '').toLowerCase().includes(s) ||
      (i.qualification_status || '').toLowerCase().includes(s)
    );
  });

  const openDetail = async (item) => {
    try { const full = await getSupplier(item.id); setSelected(full.data || full); }
    catch { setSelected(item); }
    setShowDetail(true);
  };

  const openNew = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };

  const openEdit = (item) => {
    setForm({
      name: item.name || '',
      contact_person: item.contact_person || '',
      email: item.email || '',
      phone: item.phone || '',
      address: item.address || '',
      category: item.category || '',
      qualification_status: item.qualification_status || 'pending',
      iso_certified: !!item.iso_certified,
      last_audit_date: item.last_audit_date ? item.last_audit_date.slice(0, 10) : '',
      next_audit_date: item.next_audit_date ? item.next_audit_date.slice(0, 10) : '',
      risk_rating: item.risk_rating || '',
      notes: item.notes || '',
    });
    setEditId(item.id);
    setShowDetail(false);
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editId) await updateSupplier(editId, form);
      else await createSupplier(form);
      setShowForm(false);
      await load();
    } catch (e) { alert(e.response?.data?.message || 'Save failed'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    try {
      await deleteSupplier(selected.id);
      setShowDelete(false); setShowDetail(false); setSelected(null);
      await load();
    } catch { alert('Delete failed'); }
  };

  const Field = ({ label, val }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#111827' }}>{val || '—'}</div>
    </div>
  );

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>Supplier Management</h1>
        <button onClick={openNew} style={btnPrimary}><FiPlus size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />New Supplier</button>
      </div>

      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 400 }}>
        <FiSearch size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: 38 }} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
          <FiLoader size={32} style={{ animation: 'spin 1s linear infinite' }} /><p>Loading...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Name', 'Contact', 'Email', 'Category', 'Qualification', 'ISO Certified', 'Risk Rating'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No suppliers found.</td></tr>
              ) : filtered.map((item) => (
                <tr key={item.id} onClick={() => openDetail(item)} style={{ cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{item.name}</td>
                  <td style={{ padding: '12px 16px' }}>{item.contact_person || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{item.email || '—'}</td>
                  <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{item.category || '—'}</td>
                  <td style={{ padding: '12px 16px' }}><span style={badge(QUAL_COLORS[item.qualification_status] || '#6b7280')}>{item.qualification_status}</span></td>
                  <td style={{ padding: '12px 16px' }}>
                    {item.iso_certified
                      ? <FiCheck size={18} color="#22c55e" />
                      : <FiMinus size={18} color="#d1d5db" />}
                  </td>
                  <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{item.risk_rating || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selected && (
        <div style={overlay} onClick={() => setShowDetail(false)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Supplier Details</h2>
              <FiX size={20} style={{ cursor: 'pointer', color: '#6b7280' }} onClick={() => setShowDetail(false)} />
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                <Field label="Name" val={selected.name} />
                <Field label="Contact Person" val={selected.contact_person} />
                <Field label="Email" val={selected.email} />
                <Field label="Phone" val={selected.phone} />
                <Field label="Category" val={selected.category} />
                <Field label="Qualification" val={<span style={badge(QUAL_COLORS[selected.qualification_status] || '#6b7280')}>{selected.qualification_status}</span>} />
                <Field label="ISO Certified" val={selected.iso_certified ? 'Yes' : 'No'} />
                <Field label="Risk Rating" val={selected.risk_rating} />
                <Field label="Last Audit Date" val={selected.last_audit_date ? new Date(selected.last_audit_date).toLocaleDateString() : '—'} />
                <Field label="Next Audit Date" val={selected.next_audit_date ? new Date(selected.next_audit_date).toLocaleDateString() : '—'} />
              </div>
              <Field label="Address" val={selected.address} />
              <Field label="Notes" val={selected.notes} />
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => openEdit(selected)} style={btnPrimary}><FiEdit2 size={14} style={{ marginRight: 4 }} />Edit</button>
              <button onClick={() => setShowDelete(true)} style={btnDanger}><FiTrash2 size={14} style={{ marginRight: 4 }} />Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div style={overlay} onClick={() => setShowForm(false)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{editId ? 'Edit Supplier' : 'New Supplier'}</h2>
              <FiX size={20} style={{ cursor: 'pointer', color: '#6b7280' }} onClick={() => setShowForm(false)} />
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Contact Person</label>
                  <input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Category</label>
                  <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Qualification Status</label>
                  <select value={form.qualification_status} onChange={(e) => setForm({ ...form, qualification_status: e.target.value })} style={inputStyle}>
                    {QUAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Risk Rating</label>
                  <input value={form.risk_rating} onChange={(e) => setForm({ ...form, risk_rating: e.target.value })} style={inputStyle} placeholder="e.g. low, medium, high" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
                  <input type="checkbox" checked={form.iso_certified} onChange={(e) => setForm({ ...form, iso_certified: e.target.checked })} id="iso" style={{ width: 18, height: 18 }} />
                  <label htmlFor="iso" style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>ISO Certified</label>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Last Audit Date</label>
                  <input type="date" value={form.last_audit_date} onChange={(e) => setForm({ ...form, last_audit_date: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Next Audit Date</label>
                  <input type="date" value={form.next_audit_date} onChange={(e) => setForm({ ...form, next_audit_date: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Address</label>
                  <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Notes</label>
                  <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} style={btnSecondary}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name} style={{ ...btnPrimary, opacity: saving || !form.name ? 0.6 : 1 }}>
                {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDelete && (
        <div style={overlay} onClick={() => setShowDelete(false)}>
          <div style={{ ...modalBox, maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 32, textAlign: 'center' }}>
              <FiAlertTriangle size={48} color="#ef4444" />
              <h3 style={{ margin: '16px 0 8px', fontSize: 18 }}>Confirm Delete</h3>
              <p style={{ color: '#6b7280', margin: '0 0 24px' }}>
                Are you sure you want to delete <strong>{selected?.name}</strong>? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button onClick={() => setShowDelete(false)} style={btnSecondary}>Cancel</button>
                <button onClick={handleDelete} style={btnDanger}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
