import React, { useState, useEffect, useCallback } from 'react';
import {
  FiPlus, FiSearch, FiEdit2, FiTrash2, FiX, FiAlertTriangle, FiLoader
} from 'react-icons/fi';
import {
  getTraining, getTrainingRecord, createTraining, updateTraining, deleteTraining
} from '../services/api';

const STATUS_COLORS = {
  completed: '#22c55e',
  scheduled: '#3b82f6',
  overdue: '#ef4444',
  in_progress: '#eab308',
};

const STATUSES = ['completed', 'scheduled', 'overdue', 'in_progress'];

const emptyForm = {
  employee_name: '', employee_id_str: '', department: '', course_name: '',
  course_type: '', trainer: '', training_date: '', expiry_date: '',
  status: 'scheduled', score: '', certificate_number: '',
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

export default function TrainingPage() {
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
      const res = await getTraining();
      setItems(Array.isArray(res) ? res : res.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((i) => {
    const s = search.toLowerCase();
    return (
      (i.employee_name || '').toLowerCase().includes(s) ||
      (i.employee_id_str || '').toLowerCase().includes(s) ||
      (i.department || '').toLowerCase().includes(s) ||
      (i.course_name || '').toLowerCase().includes(s) ||
      (i.status || '').toLowerCase().includes(s)
    );
  });

  const openDetail = async (item) => {
    try { const full = await getTrainingRecord(item.id); setSelected(full.data || full); }
    catch { setSelected(item); }
    setShowDetail(true);
  };

  const openNew = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };

  const openEdit = (item) => {
    setForm({
      employee_name: item.employee_name || '',
      employee_id_str: item.employee_id_str || '',
      department: item.department || '',
      course_name: item.course_name || '',
      course_type: item.course_type || '',
      trainer: item.trainer || '',
      training_date: item.training_date ? item.training_date.slice(0, 10) : '',
      expiry_date: item.expiry_date ? item.expiry_date.slice(0, 10) : '',
      status: item.status || 'scheduled',
      score: item.score != null ? String(item.score) : '',
      certificate_number: item.certificate_number || '',
    });
    setEditId(item.id);
    setShowDetail(false);
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, score: form.score ? Number(form.score) : null };
      if (editId) await updateTraining(editId, payload);
      else await createTraining(payload);
      setShowForm(false);
      await load();
    } catch (e) { alert(e.response?.data?.message || 'Save failed'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    try {
      await deleteTraining(selected.id);
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
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>Training Records</h1>
        <button onClick={openNew} style={btnPrimary}><FiPlus size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />New Record</button>
      </div>

      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 400 }}>
        <FiSearch size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input placeholder="Search training records..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: 38 }} />
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
                {['Employee', 'ID', 'Department', 'Course', 'Type', 'Status', 'Training Date', 'Expiry Date'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No training records found.</td></tr>
              ) : filtered.map((item) => (
                <tr key={item.id} onClick={() => openDetail(item)} style={{ cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{item.employee_name}</td>
                  <td style={{ padding: '12px 16px' }}>{item.employee_id_str || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{item.department || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{item.course_name}</td>
                  <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{item.course_type || '—'}</td>
                  <td style={{ padding: '12px 16px' }}><span style={badge(STATUS_COLORS[item.status] || '#6b7280')}>{(item.status || '').replace('_', ' ')}</span></td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>{item.training_date ? new Date(item.training_date).toLocaleDateString() : '—'}</td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '—'}</td>
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
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Training Record Details</h2>
              <FiX size={20} style={{ cursor: 'pointer', color: '#6b7280' }} onClick={() => setShowDetail(false)} />
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                <Field label="Employee Name" val={selected.employee_name} />
                <Field label="Employee ID" val={selected.employee_id_str} />
                <Field label="Department" val={selected.department} />
                <Field label="Course Name" val={selected.course_name} />
                <Field label="Course Type" val={selected.course_type} />
                <Field label="Trainer" val={selected.trainer} />
                <Field label="Status" val={<span style={badge(STATUS_COLORS[selected.status] || '#6b7280')}>{(selected.status || '').replace('_', ' ')}</span>} />
                <Field label="Score" val={selected.score != null ? selected.score : '—'} />
                <Field label="Training Date" val={selected.training_date ? new Date(selected.training_date).toLocaleDateString() : '—'} />
                <Field label="Expiry Date" val={selected.expiry_date ? new Date(selected.expiry_date).toLocaleDateString() : '—'} />
                <Field label="Certificate Number" val={selected.certificate_number} />
              </div>
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
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{editId ? 'Edit Training Record' : 'New Training Record'}</h2>
              <FiX size={20} style={{ cursor: 'pointer', color: '#6b7280' }} onClick={() => setShowForm(false)} />
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Employee Name *</label>
                  <input value={form.employee_name} onChange={(e) => setForm({ ...form, employee_name: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Employee ID</label>
                  <input value={form.employee_id_str} onChange={(e) => setForm({ ...form, employee_id_str: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Department</label>
                  <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Course Name *</label>
                  <input value={form.course_name} onChange={(e) => setForm({ ...form, course_name: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Course Type</label>
                  <input value={form.course_type} onChange={(e) => setForm({ ...form, course_type: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Trainer</label>
                  <input value={form.trainer} onChange={(e) => setForm({ ...form, trainer: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Training Date</label>
                  <input type="date" value={form.training_date} onChange={(e) => setForm({ ...form, training_date: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Expiry Date</label>
                  <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Score</label>
                  <input type="number" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Certificate Number</label>
                  <input value={form.certificate_number} onChange={(e) => setForm({ ...form, certificate_number: e.target.value })} style={inputStyle} />
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} style={btnSecondary}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.employee_name || !form.course_name} style={{ ...btnPrimary, opacity: saving || !form.employee_name || !form.course_name ? 0.6 : 1 }}>
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
                Are you sure you want to delete the training record for <strong>{selected?.employee_name}</strong>? This action cannot be undone.
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
