import React, { useState, useEffect, useMemo } from 'react';
import { FiPlus, FiSearch, FiX, FiEdit2, FiTrash2, FiAlertTriangle } from 'react-icons/fi';
import { getRiskAssessments, createRiskAssessment, updateRiskAssessment, deleteRiskAssessment } from '../services/api';

const riskColors = { critical: '#dc2626', high: '#ea580c', medium: '#ca8a04', low: '#16a34a' };
const riskBg = { critical: '#fee2e2', high: '#fff7ed', medium: '#fef9c3', low: '#dcfce7' };
const statusColors = { open: '#2563eb', mitigated: '#16a34a', accepted: '#ca8a04', closed: '#6b7280', 'in-review': '#7c3aed' };
const statusBg = { open: '#dbeafe', mitigated: '#dcfce7', accepted: '#fef9c3', closed: '#f3f4f6', 'in-review': '#f3e8ff' };

const Badge = ({ value, colors, backgrounds }) => (
  <span style={{
    padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
    color: (colors || {})[value] || '#374151', backgroundColor: (backgrounds || {})[value] || '#f3f4f6',
    textTransform: 'capitalize',
  }}>{value}</span>
);

const emptyRisk = {
  hazard: '', device_id: '', category: '', severity: '', probability: '',
  risk_level: 'medium', status: 'open', description: '', mitigation: '',
  residual_risk: '', assigned_to: '', review_date: '', device_name: '',
};

export default function RiskAssessmentsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyRisk);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getRiskAssessments();
      setItems(Array.isArray(data) ? data : data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(d =>
      (d.hazard || '').toLowerCase().includes(q) ||
      (d.category || '').toLowerCase().includes(q) ||
      (d.risk_level || '').toLowerCase().includes(q) ||
      (d.status || '').toLowerCase().includes(q) ||
      (d.device_name || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  const openDetail = (item) => { setSelected(item); setShowDetail(true); };
  const closeDetail = () => { setShowDetail(false); setSelected(null); };
  const openCreate = () => { setFormData({ ...emptyRisk }); setEditingId(null); setShowForm(true); };
  const openEdit = (item) => {
    setFormData({ ...emptyRisk, ...item, review_date: item.review_date ? item.review_date.slice(0, 10) : '' });
    setEditingId(item.id); setShowDetail(false); setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      delete payload.device_name;
      if (editingId) { await updateRiskAssessment(editingId, payload); }
      else { await createRiskAssessment(payload); }
      setShowForm(false); fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    try { await deleteRiskAssessment(id); setConfirmDelete(null); setShowDetail(false); fetchData(); }
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

  if (loading) return <div style={loadingStyle}>Loading risk assessments...</div>;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={h1Style}>
          <FiAlertTriangle style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Risk Assessments
        </h1>
        <button onClick={openCreate} style={btnPrimary}><FiPlus size={16} /> New Assessment</button>
      </div>

      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 400 }}>
        <FiSearch style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
        <input placeholder="Search risk assessments..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: 34 }} />
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              {['Hazard', 'Device', 'Category', 'Severity', 'Probability', 'Risk Level', 'Status'].map(h =>
                <th key={h} style={thStyle}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={emptyStyle}>No risk assessments found</td></tr>
            ) : filtered.map(d => (
              <tr key={d.id} onClick={() => openDetail(d)} style={{ cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <td style={tdStyle}>{d.hazard}</td>
                <td style={tdStyle}>{d.device_name || d.device_id}</td>
                <td style={tdStyle}>{d.category}</td>
                <td style={tdStyle}>{d.severity}</td>
                <td style={tdStyle}>{d.probability}</td>
                <td style={tdStyle}><Badge value={d.risk_level} colors={riskColors} backgrounds={riskBg} /></td>
                <td style={tdStyle}><Badge value={d.status} colors={statusColors} backgrounds={statusBg} /></td>
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
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{selected.hazard}</h2>
              <button onClick={closeDetail} style={btnIcon}><FiX size={18} /></button>
            </div>
            <div style={detailGrid}>
              <DetailRow label="Device" value={selected.device_name || selected.device_id} />
              <DetailRow label="Category" value={selected.category} />
              <DetailRow label="Severity" value={selected.severity} />
              <DetailRow label="Probability" value={selected.probability} />
              <DetailRow label="Risk Level" value={<Badge value={selected.risk_level} colors={riskColors} backgrounds={riskBg} />} />
              <DetailRow label="Status" value={<Badge value={selected.status} colors={statusColors} backgrounds={statusBg} />} />
              <DetailRow label="Residual Risk" value={selected.residual_risk} />
              <DetailRow label="Assigned To" value={selected.assigned_to} />
              <DetailRow label="Review Date" value={selected.review_date ? new Date(selected.review_date).toLocaleDateString() : '—'} />
            </div>
            {selected.description && (
              <div style={{ marginTop: 16 }}>
                <span style={detailLabelS}>Description</span>
                <p style={detailTextS}>{selected.description}</p>
              </div>
            )}
            {selected.mitigation && (
              <div style={{ marginTop: 12 }}>
                <span style={detailLabelS}>Mitigation</span>
                <pre style={{
                  margin: '4px 0 0', fontSize: 14, color: '#374151', whiteSpace: 'pre-wrap',
                  backgroundColor: '#f0fdf4', padding: 12, borderRadius: 6, fontFamily: 'inherit',
                  border: '1px solid #bbf7d0',
                }}>{selected.mitigation}</pre>
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
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{editingId ? 'Edit Risk Assessment' : 'New Risk Assessment'}</h2>
              <button onClick={() => setShowForm(false)} style={btnIcon}><FiX size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <Field label="Hazard" name="hazard" />
                <Field label="Device ID" name="device_id" />
                <Field label="Category" name="category" options={['Electrical', 'Mechanical', 'Software', 'Biological', 'Chemical', 'Radiation', 'Thermal', 'Other']} />
                <Field label="Severity" name="severity" options={['1', '2', '3', '4', '5']} />
                <Field label="Probability" name="probability" options={['1', '2', '3', '4', '5']} />
                <Field label="Risk Level" name="risk_level" options={['critical', 'high', 'medium', 'low']} />
                <Field label="Status" name="status" options={['open', 'mitigated', 'accepted', 'closed', 'in-review']} />
                <Field label="Residual Risk" name="residual_risk" />
                <Field label="Assigned To" name="assigned_to" />
                <Field label="Review Date" name="review_date" type="date" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Description</label>
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Mitigation</label>
                <textarea value={formData.mitigation} onChange={e => setFormData({ ...formData, mitigation: e.target.value })} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
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
            <h3 style={{ margin: '0 0 8px' }}>Delete Risk Assessment?</h3>
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
