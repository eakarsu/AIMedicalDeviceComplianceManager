import React, { useState, useEffect } from 'react';
import { FiThermometer, FiPlus, FiSearch, FiX, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { getCalibration, createCalibration, updateCalibration, deleteCalibration, getDevices } from '../services/api';

export default function CalibrationPage() {
  const [items, setItems] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDetail, setShowDetail] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});

  const emptyForm = {
    equipment_name: '', equipment_id_str: '', device_id: '', calibration_type: 'periodic',
    calibration_date: '', next_calibration_date: '', performed_by: '', status: 'calibrated',
    standard_used: '', results: '', certificate_number: ''
  };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [r1, r2] = await Promise.all([getCalibration(), getDevices()]);
      setItems(Array.isArray(r1) ? r1 : r1.data || []); setDevices(Array.isArray(r2) ? r2 : r2.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      if (editItem) { await updateCalibration(editItem.id, formData); }
      else { await createCalibration(formData); }
      setShowForm(false); setEditItem(null); loadData();
    } catch (e) { alert('Error saving: ' + e.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this calibration record?')) return;
    try { await deleteCalibration(id); setShowDetail(null); loadData(); }
    catch (e) { alert('Error: ' + e.message); }
  };

  const openNew = () => { setEditItem(null); setFormData({ ...emptyForm }); setShowForm(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setFormData({
      equipment_name: item.equipment_name || '', equipment_id_str: item.equipment_id_str || '',
      device_id: item.device_id || '', calibration_type: item.calibration_type || 'periodic',
      calibration_date: item.calibration_date ? item.calibration_date.split('T')[0] : '',
      next_calibration_date: item.next_calibration_date ? item.next_calibration_date.split('T')[0] : '',
      performed_by: item.performed_by || '', status: item.status || 'calibrated',
      standard_used: item.standard_used || '', results: item.results || '', certificate_number: item.certificate_number || ''
    });
    setShowForm(true); setShowDetail(null);
  };

  const filtered = items.filter(i =>
    (i.equipment_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.equipment_id_str || '').toLowerCase().includes(search.toLowerCase())
  );

  const statusClass = (s) => ({
    calibrated: 'badge-success', out_of_tolerance: 'badge-danger', due: 'badge-warning', overdue: 'badge-info'
  }[s] || 'badge-secondary');

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title"><FiThermometer className="page-icon" /> Calibration Records</div>
        <div className="page-actions">
          <div className="search-bar"><FiSearch /><input placeholder="Search calibrations..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={openNew}><FiPlus /> New Record</button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Equipment</th><th>ID</th><th>Device</th><th>Type</th><th>Status</th><th>Cal. Date</th><th>Next Due</th><th>Performed By</th></tr></thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} className="table-row" onClick={() => setShowDetail(item)}>
                <td><strong>{item.equipment_name}</strong></td>
                <td>{item.equipment_id_str}</td>
                <td>{item.device_name || '—'}</td>
                <td>{item.calibration_type}</td>
                <td><span className={`badge ${statusClass(item.status)}`}>{item.status?.replace('_', ' ')}</span></td>
                <td>{item.calibration_date ? new Date(item.calibration_date).toLocaleDateString() : '—'}</td>
                <td>{item.next_calibration_date ? new Date(item.next_calibration_date).toLocaleDateString() : '—'}</td>
                <td>{item.performed_by}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="8" className="empty-state">No calibration records found</td></tr>}
          </tbody>
        </table>
      </div>

      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="detail-header">
              <h2>{showDetail.equipment_name} ({showDetail.equipment_id_str})</h2>
              <button className="btn-close" onClick={() => setShowDetail(null)}><FiX /></button>
            </div>
            <div className="detail-body">
              <div className="detail-grid">
                <div className="detail-field"><label>Device</label><span>{showDetail.device_name || '—'}</span></div>
                <div className="detail-field"><label>Type</label><span>{showDetail.calibration_type}</span></div>
                <div className="detail-field"><label>Status</label><span className={`badge ${statusClass(showDetail.status)}`}>{showDetail.status?.replace('_', ' ')}</span></div>
                <div className="detail-field"><label>Calibration Date</label><span>{showDetail.calibration_date ? new Date(showDetail.calibration_date).toLocaleDateString() : '—'}</span></div>
                <div className="detail-field"><label>Next Due</label><span>{showDetail.next_calibration_date ? new Date(showDetail.next_calibration_date).toLocaleDateString() : '—'}</span></div>
                <div className="detail-field"><label>Performed By</label><span>{showDetail.performed_by}</span></div>
                <div className="detail-field"><label>Standard Used</label><span>{showDetail.standard_used || '—'}</span></div>
                <div className="detail-field"><label>Certificate #</label><span>{showDetail.certificate_number || '—'}</span></div>
              </div>
              <div className="detail-text"><label>Results</label><p>{showDetail.results || '—'}</p></div>
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
              <h2>{editItem ? 'Edit Calibration Record' : 'New Calibration Record'}</h2>
              <button className="btn-close" onClick={() => setShowForm(false)}><FiX /></button>
            </div>
            <div className="detail-body">
              <div className="form-row">
                <div className="form-group"><label>Equipment Name</label><input className="form-input" value={formData.equipment_name} onChange={e => setFormData({ ...formData, equipment_name: e.target.value })} /></div>
                <div className="form-group"><label>Equipment ID</label><input className="form-input" value={formData.equipment_id_str} onChange={e => setFormData({ ...formData, equipment_id_str: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Device</label>
                  <select className="form-select" value={formData.device_id} onChange={e => setFormData({ ...formData, device_id: e.target.value })}>
                    <option value="">None</option>
                    {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Calibration Type</label>
                  <select className="form-select" value={formData.calibration_type} onChange={e => setFormData({ ...formData, calibration_type: e.target.value })}>
                    {['initial','periodic','after_repair','verification'].map(o => <option key={o} value={o}>{o.replace('_',' ')}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Calibration Date</label><input type="date" className="form-input" value={formData.calibration_date} onChange={e => setFormData({ ...formData, calibration_date: e.target.value })} /></div>
                <div className="form-group"><label>Next Due Date</label><input type="date" className="form-input" value={formData.next_calibration_date} onChange={e => setFormData({ ...formData, next_calibration_date: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Performed By</label><input className="form-input" value={formData.performed_by} onChange={e => setFormData({ ...formData, performed_by: e.target.value })} /></div>
                <div className="form-group"><label>Status</label>
                  <select className="form-select" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    {['calibrated','out_of_tolerance','due','overdue'].map(o => <option key={o} value={o}>{o.replace('_',' ')}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Standard Used</label><input className="form-input" value={formData.standard_used} onChange={e => setFormData({ ...formData, standard_used: e.target.value })} /></div>
                <div className="form-group"><label>Certificate #</label><input className="form-input" value={formData.certificate_number} onChange={e => setFormData({ ...formData, certificate_number: e.target.value })} /></div>
              </div>
              <div className="form-group"><label>Results</label><textarea className="form-textarea" value={formData.results} onChange={e => setFormData({ ...formData, results: e.target.value })} /></div>
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
