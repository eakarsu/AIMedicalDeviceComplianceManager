import React, { useState, useEffect } from 'react';
import { FiGitPullRequest, FiPlus, FiSearch, FiX, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { getChangeControls, createChangeControl, updateChangeControl, deleteChangeControl, getDevices } from '../services/api';

export default function ChangeControlsPage() {
  const [items, setItems] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDetail, setShowDetail] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});

  const emptyForm = {
    title: '', change_type: 'design', device_id: '', description: '', justification: '',
    impact_assessment: '', status: 'requested', priority: 'medium', requested_by: '',
    approved_by: '', implementation_date: ''
  };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [r1, r2] = await Promise.all([getChangeControls(), getDevices()]);
      setItems(Array.isArray(r1) ? r1 : r1.data || []); setDevices(Array.isArray(r2) ? r2 : r2.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      if (editItem) { await updateChangeControl(editItem.id, formData); }
      else { await createChangeControl(formData); }
      setShowForm(false); setEditItem(null); loadData();
    } catch (e) { alert('Error saving: ' + e.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this change control?')) return;
    try { await deleteChangeControl(id); setShowDetail(null); loadData(); }
    catch (e) { alert('Error: ' + e.message); }
  };

  const openNew = () => { setEditItem(null); setFormData({ ...emptyForm }); setShowForm(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setFormData({
      title: item.title || '', change_type: item.change_type || 'design', device_id: item.device_id || '',
      description: item.description || '', justification: item.justification || '', impact_assessment: item.impact_assessment || '',
      status: item.status || 'requested', priority: item.priority || 'medium', requested_by: item.requested_by || '',
      approved_by: item.approved_by || '', implementation_date: item.implementation_date ? item.implementation_date.split('T')[0] : ''
    });
    setShowForm(true); setShowDetail(null);
  };

  const filtered = items.filter(i =>
    (i.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.change_number || '').toLowerCase().includes(search.toLowerCase())
  );

  const statusClass = (s) => ({
    requested: 'badge-primary', review: 'badge-warning', approved: 'badge-success',
    implementation: 'badge-info', closed: 'badge-secondary', rejected: 'badge-danger'
  }[s] || 'badge-secondary');
  const priorityClass = (p) => ({ critical: 'badge-danger', high: 'badge-warning', medium: 'badge-info', low: 'badge-success' }[p] || 'badge-secondary');

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title"><FiGitPullRequest className="page-icon" /> Change Controls</div>
        <div className="page-actions">
          <div className="search-bar"><FiSearch /><input placeholder="Search changes..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={openNew}><FiPlus /> New Change</button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>CC #</th><th>Title</th><th>Type</th><th>Device</th><th>Status</th><th>Priority</th><th>Requested By</th><th>Implementation</th></tr></thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} className="table-row" onClick={() => setShowDetail(item)}>
                <td><strong>{item.change_number}</strong></td>
                <td>{item.title}</td>
                <td>{item.change_type}</td>
                <td>{item.device_name || '—'}</td>
                <td><span className={`badge ${statusClass(item.status)}`}>{item.status}</span></td>
                <td><span className={`badge ${priorityClass(item.priority)}`}>{item.priority}</span></td>
                <td>{item.requested_by}</td>
                <td>{item.implementation_date ? new Date(item.implementation_date).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="8" className="empty-state">No change controls found</td></tr>}
          </tbody>
        </table>
      </div>

      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="detail-header">
              <h2>{showDetail.change_number} — {showDetail.title}</h2>
              <button className="btn-close" onClick={() => setShowDetail(null)}><FiX /></button>
            </div>
            <div className="detail-body">
              <div className="detail-grid">
                <div className="detail-field"><label>Type</label><span>{showDetail.change_type}</span></div>
                <div className="detail-field"><label>Status</label><span className={`badge ${statusClass(showDetail.status)}`}>{showDetail.status}</span></div>
                <div className="detail-field"><label>Priority</label><span className={`badge ${priorityClass(showDetail.priority)}`}>{showDetail.priority}</span></div>
                <div className="detail-field"><label>Device</label><span>{showDetail.device_name || '—'}</span></div>
                <div className="detail-field"><label>Requested By</label><span>{showDetail.requested_by}</span></div>
                <div className="detail-field"><label>Approved By</label><span>{showDetail.approved_by || '—'}</span></div>
                <div className="detail-field"><label>Implementation Date</label><span>{showDetail.implementation_date ? new Date(showDetail.implementation_date).toLocaleDateString() : '—'}</span></div>
              </div>
              <div className="detail-text"><label>Description</label><p>{showDetail.description}</p></div>
              <div className="detail-text"><label>Justification</label><p>{showDetail.justification || '—'}</p></div>
              <div className="detail-text"><label>Impact Assessment</label><p>{showDetail.impact_assessment || '—'}</p></div>
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
              <h2>{editItem ? 'Edit Change Control' : 'New Change Control'}</h2>
              <button className="btn-close" onClick={() => setShowForm(false)}><FiX /></button>
            </div>
            <div className="detail-body">
              <div className="form-row">
                <div className="form-group"><label>Title</label><input className="form-input" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} /></div>
                <div className="form-group"><label>Type</label>
                  <select className="form-select" value={formData.change_type} onChange={e => setFormData({ ...formData, change_type: e.target.value })}>
                    {['design','process','document','supplier','software'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Device</label>
                  <select className="form-select" value={formData.device_id} onChange={e => setFormData({ ...formData, device_id: e.target.value })}>
                    <option value="">None</option>
                    {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Status</label>
                  <select className="form-select" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    {['requested','review','approved','implementation','closed','rejected'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Priority</label>
                  <select className="form-select" value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                    {['critical','high','medium','low'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Implementation Date</label><input type="date" className="form-input" value={formData.implementation_date} onChange={e => setFormData({ ...formData, implementation_date: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Requested By</label><input className="form-input" value={formData.requested_by} onChange={e => setFormData({ ...formData, requested_by: e.target.value })} /></div>
                <div className="form-group"><label>Approved By</label><input className="form-input" value={formData.approved_by} onChange={e => setFormData({ ...formData, approved_by: e.target.value })} /></div>
              </div>
              <div className="form-group"><label>Description</label><textarea className="form-textarea" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
              <div className="form-group"><label>Justification</label><textarea className="form-textarea" value={formData.justification} onChange={e => setFormData({ ...formData, justification: e.target.value })} /></div>
              <div className="form-group"><label>Impact Assessment</label><textarea className="form-textarea" value={formData.impact_assessment} onChange={e => setFormData({ ...formData, impact_assessment: e.target.value })} /></div>
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
