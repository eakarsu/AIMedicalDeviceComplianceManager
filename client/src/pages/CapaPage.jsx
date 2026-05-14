import React, { useState, useEffect, useCallback } from 'react';
import {
  FiPlus, FiSearch, FiEdit2, FiTrash2, FiX, FiAlertTriangle,
  FiLoader, FiChevronDown, FiCheck
} from 'react-icons/fi';
import {
  getCapas, getCapa, createCapa, updateCapa, deleteCapa, getDevices, closeCapa
} from '../services/api';

const STATUS_COLORS = {
  open: '#3b82f6',
  investigation: '#eab308',
  implementation: '#f97316',
  verification: '#a855f7',
  closed: '#22c55e',
};

const PRIORITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

const SOURCES = ['audit', 'complaint', 'ncr', 'inspection', 'internal'];
const TYPES = ['corrective', 'preventive'];
const STATUSES = ['open', 'investigation', 'implementation', 'verification', 'closed'];
const PRIORITIES = ['critical', 'high', 'medium', 'low'];

const emptyForm = {
  title: '', type: 'corrective', source: 'internal', device_id: '',
  description: '', root_cause: '', action_plan: '', status: 'open',
  priority: 'medium', assigned_to: '', due_date: '', completion_date: '',
};

/* ── shared inline styles ────────────────────────────────────────────────── */
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
  fontSize: 12, fontWeight: 600, color: '#fff', background: bg,
  textTransform: 'capitalize',
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

export default function CapaPage() {
  const [items, setItems] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [closureReason, setClosureReason] = useState('');
  const [effectivenessVerified, setEffectivenessVerified] = useState(false);
  const [closingCapa, setClosingCapa] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [capaRes, devRes] = await Promise.all([getCapas(), getDevices()]);
      setItems(Array.isArray(capaRes) ? capaRes : capaRes.data || []);
      setDevices(Array.isArray(devRes) ? devRes : devRes.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((i) => {
    const s = search.toLowerCase();
    return (
      (i.title || '').toLowerCase().includes(s) ||
      (i.type || '').toLowerCase().includes(s) ||
      (i.source || '').toLowerCase().includes(s) ||
      (i.assigned_to || '').toLowerCase().includes(s) ||
      (i.status || '').toLowerCase().includes(s)
    );
  });

  const deviceName = (id) => {
    const d = devices.find((x) => x.id === id || x.id === Number(id));
    return d ? d.name : id || '—';
  };

  const openDetail = async (item) => {
    try {
      const full = await getCapa(item.id);
      setSelected(full.data || full);
    } catch { setSelected(item); }
    setShowDetail(true);
  };

  const openNew = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setForm({
      title: item.title || '',
      type: item.type || 'corrective',
      source: item.source || 'internal',
      device_id: item.device_id || '',
      description: item.description || '',
      root_cause: item.root_cause || '',
      action_plan: item.action_plan || '',
      status: item.status || 'open',
      priority: item.priority || 'medium',
      assigned_to: item.assigned_to || '',
      due_date: item.due_date ? item.due_date.slice(0, 10) : '',
      completion_date: item.completion_date ? item.completion_date.slice(0, 10) : '',
    });
    setEditId(item.id);
    setShowDetail(false);
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, device_id: form.device_id || null };
      if (!payload.completion_date) delete payload.completion_date;
      if (editId) { await updateCapa(editId, payload); }
      else { await createCapa(payload); }
      setShowForm(false);
      await load();
    } catch (e) { alert(e.response?.data?.message || 'Save failed'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    try {
      await deleteCapa(selected.id);
      setShowDelete(false);
      setShowDetail(false);
      setSelected(null);
      await load();
    } catch (e) { alert('Delete failed'); }
  };

  const handleClose = async () => {
    setClosingCapa(true);
    try {
      await closeCapa(selected.id, { closure_reason: closureReason, effectiveness_verified: effectivenessVerified });
      setShowClose(false);
      setShowDetail(false);
      setSelected(null);
      setClosureReason('');
      setEffectivenessVerified(false);
      await load();
    } catch (e) {
      alert(e.response?.data?.error || 'Close CAPA failed. You may not have sufficient permissions.');
    }
    setClosingCapa(false);
  };

  const Field = ({ label, val }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#111827' }}>{val || '—'}</div>
    </div>
  );

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>CAPA Management</h1>
        <button onClick={openNew} style={btnPrimary}>
          <FiPlus size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          New CAPA
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 400 }}>
        <FiSearch size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input
          placeholder="Search CAPAs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, paddingLeft: 38 }}
        />
      </div>

      {/* Loading */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
          <FiLoader size={32} style={{ animation: 'spin 1s linear infinite' }} />
          <p>Loading CAPAs...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        /* Table */
        <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Title', 'Type', 'Source', 'Device', 'Status', 'Priority', 'Assigned To', 'Due Date'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No CAPAs found.</td></tr>
              ) : filtered.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => openDetail(item)}
                  style={{ cursor: 'pointer', borderBottom: '1px solid #f3f4f6', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{item.title}</td>
                  <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{item.type}</td>
                  <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{item.source}</td>
                  <td style={{ padding: '12px 16px' }}>{deviceName(item.device_id)}</td>
                  <td style={{ padding: '12px 16px' }}><span style={badge(STATUS_COLORS[item.status] || '#6b7280')}>{item.status}</span></td>
                  <td style={{ padding: '12px 16px' }}><span style={badge(PRIORITY_COLORS[item.priority] || '#6b7280')}>{item.priority}</span></td>
                  <td style={{ padding: '12px 16px' }}>{item.assigned_to || '—'}</td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>{item.due_date ? new Date(item.due_date).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Detail Modal ──────────────────────────────────────────────────── */}
      {showDetail && selected && (
        <div style={overlay} onClick={() => setShowDetail(false)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>CAPA Details</h2>
              <FiX size={20} style={{ cursor: 'pointer', color: '#6b7280' }} onClick={() => setShowDetail(false)} />
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                <Field label="Title" val={selected.title} />
                <Field label="Type" val={selected.type} />
                <Field label="Source" val={selected.source} />
                <Field label="Device" val={deviceName(selected.device_id)} />
                <Field label="Status" val={<span style={badge(STATUS_COLORS[selected.status] || '#6b7280')}>{selected.status}</span>} />
                <Field label="Priority" val={<span style={badge(PRIORITY_COLORS[selected.priority] || '#6b7280')}>{selected.priority}</span>} />
                <Field label="Assigned To" val={selected.assigned_to} />
                <Field label="Due Date" val={selected.due_date ? new Date(selected.due_date).toLocaleDateString() : '—'} />
                <Field label="Completion Date" val={selected.completion_date ? new Date(selected.completion_date).toLocaleDateString() : '—'} />
              </div>
              <Field label="Description" val={selected.description} />
              <Field label="Root Cause" val={selected.root_cause} />
              <Field label="Action Plan" val={selected.action_plan} />
            </div>
            {selected.closure_reason && (
              <div style={{ padding: '12px 24px', background: '#f0fdf4', borderRadius: 8, margin: '0 24px 16px' }}>
                <strong style={{ fontSize: 12, color: '#16a34a' }}>CLOSED</strong>
                <p style={{ margin: '4px 0 0', fontSize: 13 }}>Reason: {selected.closure_reason}</p>
                {selected.effectiveness_verified && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#16a34a' }}>Effectiveness verified</p>}
              </div>
            )}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {selected.status !== 'closed' && (
                <button onClick={() => setShowClose(true)} style={{ ...btnPrimary, background: '#16a34a' }}>
                  <FiCheck size={14} style={{ marginRight: 4 }} />Close CAPA
                </button>
              )}
              <button onClick={() => openEdit(selected)} style={btnPrimary}><FiEdit2 size={14} style={{ marginRight: 4 }} />Edit</button>
              <button onClick={() => setShowDelete(true)} style={btnDanger}><FiTrash2 size={14} style={{ marginRight: 4 }} />Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Form Modal ────────────────────────────────────────────────────── */}
      {showForm && (
        <div style={overlay} onClick={() => setShowForm(false)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{editId ? 'Edit CAPA' : 'New CAPA'}</h2>
              <FiX size={20} style={{ cursor: 'pointer', color: '#6b7280' }} onClick={() => setShowForm(false)} />
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Title *</label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inputStyle}>
                    {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Source</label>
                  <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} style={inputStyle}>
                    {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Device</label>
                  <select value={form.device_id} onChange={(e) => setForm({ ...form, device_id: e.target.value })} style={inputStyle}>
                    <option value="">-- Select Device --</option>
                    {devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={inputStyle}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Assigned To</label>
                  <input value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Due Date</label>
                  <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Completion Date</label>
                  <input type="date" value={form.completion_date} onChange={(e) => setForm({ ...form, completion_date: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Description</label>
                  <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Root Cause</label>
                  <textarea rows={3} value={form.root_cause} onChange={(e) => setForm({ ...form, root_cause: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Action Plan</label>
                  <textarea rows={3} value={form.action_plan} onChange={(e) => setForm({ ...form, action_plan: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} style={btnSecondary}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.title} style={{ ...btnPrimary, opacity: saving || !form.title ? 0.6 : 1 }}>
                {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ───────────────────────────────────────────── */}
      {showDelete && (
        <div style={overlay} onClick={() => setShowDelete(false)}>
          <div style={{ ...modalBox, maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 32, textAlign: 'center' }}>
              <FiAlertTriangle size={48} color="#ef4444" />
              <h3 style={{ margin: '16px 0 8px', fontSize: 18 }}>Confirm Delete</h3>
              <p style={{ color: '#6b7280', margin: '0 0 24px' }}>
                Are you sure you want to delete <strong>{selected?.title}</strong>? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button onClick={() => setShowDelete(false)} style={btnSecondary}>Cancel</button>
                <button onClick={handleDelete} style={btnDanger}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Close CAPA Dialog ─────────────────────────────────────────────── */}
      {showClose && (
        <div style={overlay} onClick={() => setShowClose(false)}>
          <div style={{ ...modalBox, maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#16a34a' }}>Close CAPA</h2>
              <FiX size={20} style={{ cursor: 'pointer', color: '#6b7280' }} onClick={() => setShowClose(false)} />
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
                  Closure Reason *
                </label>
                <textarea
                  value={closureReason}
                  onChange={e => setClosureReason(e.target.value)}
                  placeholder="Describe the actions taken and why this CAPA is being closed..."
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', marginBottom: 20 }}>
                <input
                  type="checkbox"
                  checked={effectivenessVerified}
                  onChange={e => setEffectivenessVerified(e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <span style={{ fontSize: 14, color: '#374151' }}>Effectiveness has been verified</span>
              </label>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowClose(false)} style={btnSecondary}>Cancel</button>
                <button
                  onClick={handleClose}
                  disabled={closingCapa || !closureReason.trim()}
                  style={{ ...btnPrimary, background: '#16a34a', opacity: (!closureReason.trim() || closingCapa) ? 0.6 : 1 }}
                >
                  {closingCapa ? 'Closing...' : 'Confirm Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
