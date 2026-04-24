import React, { useState, useEffect } from 'react';
import { FiAlertCircle, FiPlus, FiSearch, FiX, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { getNonconformance, createNonconformance, updateNonconformance, deleteNonconformance, getDevices } from '../services/api';

export default function NonConformancePage() {
  const [items, setItems] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDetail, setShowDetail] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});

  const emptyForm = {
    title: '', device_id: '', category: 'product', severity: 'minor',
    description: '', investigation: '', disposition: '', status: 'open',
    reported_by: '', assigned_to: '', due_date: ''
  };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [r1, r2] = await Promise.all([getNonconformance(), getDevices()]);
      setItems(Array.isArray(r1) ? r1 : r1.data || []); setDevices(Array.isArray(r2) ? r2 : r2.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      if (editItem) { await updateNonconformance(editItem.id, formData); }
      else { await createNonconformance(formData); }
      setShowForm(false); setEditItem(null); loadData();
    } catch (e) { alert('Error saving: ' + e.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this NCR?')) return;
    try { await deleteNonconformance(id); setShowDetail(null); loadData(); }
    catch (e) { alert('Error: ' + e.message); }
  };

  const openNew = () => { setEditItem(null); setFormData({ ...emptyForm }); setShowForm(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setFormData({
      title: item.title || '', device_id: item.device_id || '', category: item.category || 'product',
      severity: item.severity || 'minor', description: item.description || '', investigation: item.investigation || '',
      disposition: item.disposition || '', status: item.status || 'open', reported_by: item.reported_by || '',
      assigned_to: item.assigned_to || '', due_date: item.due_date ? item.due_date.split('T')[0] : ''
    });
    setShowForm(true); setShowDetail(null);
  };

  const filtered = items.filter(i =>
    (i.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.ncr_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.reported_by || '').toLowerCase().includes(search.toLowerCase())
  );

  const severityClass = (s) => ({ critical: 'badge-danger', major: 'badge-warning', minor: 'badge-info' }[s] || 'badge-secondary');
  const statusClass = (s) => ({ open: 'badge-primary', investigation: 'badge-warning', disposition: 'badge-info', closed: 'badge-success' }[s] || 'badge-secondary');

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title"><FiAlertCircle className="page-icon" /> Non-Conformance Reports</div>
        <div className="page-actions">
          <div className="search-bar"><FiSearch /><input placeholder="Search NCRs..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={openNew}><FiPlus /> New NCR</button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>NCR #</th><th>Title</th><th>Device</th><th>Category</th><th>Severity</th><th>Status</th><th>Reported By</th><th>Due Date</th></tr></thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} className="table-row" onClick={() => setShowDetail(item)}>
                <td><strong>{item.ncr_number}</strong></td>
                <td>{item.title}</td>
                <td>{item.device_name || '—'}</td>
                <td>{item.category}</td>
                <td><span className={`badge ${severityClass(item.severity)}`}>{item.severity}</span></td>
                <td><span className={`badge ${statusClass(item.status)}`}>{item.status}</span></td>
                <td>{item.reported_by}</td>
                <td>{item.due_date ? new Date(item.due_date).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="8" className="empty-state">No non-conformance reports found</td></tr>}
          </tbody>
        </table>
      </div>

      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="detail-header">
              <h2>{showDetail.ncr_number} — {showDetail.title}</h2>
              <button className="btn-close" onClick={() => setShowDetail(null)}><FiX /></button>
            </div>
            <div className="detail-body">
              <div className="detail-grid">
                <div className="detail-field"><label>Category</label><span>{showDetail.category}</span></div>
                <div className="detail-field"><label>Severity</label><span className={`badge ${severityClass(showDetail.severity)}`}>{showDetail.severity}</span></div>
                <div className="detail-field"><label>Status</label><span className={`badge ${statusClass(showDetail.status)}`}>{showDetail.status}</span></div>
                <div className="detail-field"><label>Device</label><span>{showDetail.device_name || '—'}</span></div>
                <div className="detail-field"><label>Reported By</label><span>{showDetail.reported_by}</span></div>
                <div className="detail-field"><label>Assigned To</label><span>{showDetail.assigned_to || '—'}</span></div>
                <div className="detail-field"><label>Due Date</label><span>{showDetail.due_date ? new Date(showDetail.due_date).toLocaleDateString() : '—'}</span></div>
                <div className="detail-field"><label>Disposition</label><span>{showDetail.disposition || '—'}</span></div>
              </div>
              <div className="detail-text"><label>Description</label><p>{showDetail.description}</p></div>
              <div className="detail-text"><label>Investigation</label><p>{showDetail.investigation || 'Not yet investigated'}</p></div>
            </div>
            <div className="detail-actions">
              <button className="btn btn-primary" onClick={() => openEdit(showDetail)}><FiEdit2 /> Edit</button>
              <button className="btn btn-danger" onClick={() => handleDelete(showDetail.id)}><FiTrash2 /> Delete</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="detail-header">
              <h2>{editItem ? 'Edit NCR' : 'New Non-Conformance Report'}</h2>
              <button className="btn-close" onClick={() => setShowForm(false)}><FiX /></button>
            </div>
            <div className="detail-body">
              <div className="form-row">
                <div className="form-group"><label>Title</label><input className="form-input" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} /></div>
                <div className="form-group"><label>Device</label>
                  <select className="form-select" value={formData.device_id} onChange={e => setFormData({ ...formData, device_id: e.target.value })}>
                    <option value="">None</option>
                    {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Category</label>
                  <select className="form-select" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                    {['product','process','supplier','documentation','equipment'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Severity</label>
                  <select className="form-select" value={formData.severity} onChange={e => setFormData({ ...formData, severity: e.target.value })}>
                    {['critical','major','minor'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Status</label>
                  <select className="form-select" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    {['open','investigation','disposition','closed'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Due Date</label><input type="date" className="form-input" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Reported By</label><input className="form-input" value={formData.reported_by} onChange={e => setFormData({ ...formData, reported_by: e.target.value })} /></div>
                <div className="form-group"><label>Assigned To</label><input className="form-input" value={formData.assigned_to} onChange={e => setFormData({ ...formData, assigned_to: e.target.value })} /></div>
              </div>
              <div className="form-group"><label>Description</label><textarea className="form-textarea" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
              <div className="form-group"><label>Investigation</label><textarea className="form-textarea" value={formData.investigation} onChange={e => setFormData({ ...formData, investigation: e.target.value })} /></div>
              <div className="form-group"><label>Disposition</label><input className="form-input" value={formData.disposition} onChange={e => setFormData({ ...formData, disposition: e.target.value })} /></div>
            </div>
            <div className="detail-actions">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>{editItem ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
