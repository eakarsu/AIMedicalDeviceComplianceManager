import React, { useState, useEffect, useMemo } from 'react';
import { FiSearch, FiX, FiClock } from 'react-icons/fi';
import { getAuditLogs } from '../services/api';

const actionColors = {
  CREATE: '#16a34a', UPDATE: '#2563eb', DELETE: '#dc2626',
  LOGIN: '#7c3aed', LOGOUT: '#6b7280', VIEW: '#0891b2', EXPORT: '#ca8a04',
};
const actionBg = {
  CREATE: '#dcfce7', UPDATE: '#dbeafe', DELETE: '#fee2e2',
  LOGIN: '#f3e8ff', LOGOUT: '#f3f4f6', VIEW: '#cffafe', EXPORT: '#fef9c3',
};

const Badge = ({ value }) => {
  const v = (value || '').toUpperCase();
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
      color: actionColors[v] || '#374151', backgroundColor: actionBg[v] || '#f3f4f6',
      textTransform: 'uppercase',
    }}>{value}</span>
  );
};

export default function AuditLogsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs();
      setItems(Array.isArray(data) ? data : data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(d =>
      (d.user || d.user_name || '').toLowerCase().includes(q) ||
      (d.action || '').toLowerCase().includes(q) ||
      (d.entity_type || '').toLowerCase().includes(q) ||
      (d.details || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  const formatTimestamp = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleString();
  };

  const openDetail = (item) => { setSelected(item); setShowDetail(true); };
  const closeDetail = () => { setShowDetail(false); setSelected(null); };

  if (loading) return <div style={loadingStyle}>Loading audit logs...</div>;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={h1Style}>
          <FiClock style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Audit Logs
        </h1>
      </div>

      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 400 }}>
        <FiSearch style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
        <input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: 34 }} />
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              {['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'Details'].map(h =>
                <th key={h} style={thStyle}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={emptyStyle}>No audit logs found</td></tr>
            ) : filtered.map((d, idx) => (
              <tr key={d.id || idx} onClick={() => openDetail(d)} style={{ cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <td style={{ ...tdStyle, whiteSpace: 'nowrap', fontSize: 13 }}>{formatTimestamp(d.timestamp || d.created_at)}</td>
                <td style={tdStyle}>{d.user || d.user_name}</td>
                <td style={tdStyle}><Badge value={d.action} /></td>
                <td style={tdStyle}>{d.entity_type}</td>
                <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 13 }}>{d.entity_id}</td>
                <td style={{ ...tdStyle, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {typeof d.details === 'object' ? JSON.stringify(d.details) : d.details}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal (read-only) */}
      {showDetail && selected && (
        <Overlay onClose={closeDetail}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Audit Log Detail</h2>
              <button onClick={closeDetail} style={btnIcon}><FiX size={18} /></button>
            </div>
            <div style={detailGrid}>
              <DetailRow label="Timestamp" value={formatTimestamp(selected.timestamp || selected.created_at)} />
              <DetailRow label="User" value={selected.user || selected.user_name} />
              <DetailRow label="Action" value={<Badge value={selected.action} />} />
              <DetailRow label="Entity Type" value={selected.entity_type} />
              <DetailRow label="Entity ID" value={selected.entity_id} />
            </div>
            {selected.ip_address && (
              <div style={{ marginTop: 12 }}>
                <DetailRow label="IP Address" value={selected.ip_address} />
              </div>
            )}
            <div style={{ marginTop: 16 }}>
              <span style={detailLabelS}>Details</span>
              <pre style={{
                margin: '4px 0 0', fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap',
                backgroundColor: '#f9fafb', padding: 12, borderRadius: 6, fontFamily: 'monospace',
                maxHeight: 300, overflowY: 'auto',
              }}>
                {typeof selected.details === 'object'
                  ? JSON.stringify(selected.details, null, 2)
                  : selected.details || '—'}
              </pre>
            </div>
            {selected.previous_values && (
              <div style={{ marginTop: 12 }}>
                <span style={detailLabelS}>Previous Values</span>
                <pre style={{
                  margin: '4px 0 0', fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap',
                  backgroundColor: '#fef9c3', padding: 12, borderRadius: 6, fontFamily: 'monospace',
                  maxHeight: 200, overflowY: 'auto',
                }}>
                  {typeof selected.previous_values === 'object'
                    ? JSON.stringify(selected.previous_values, null, 2)
                    : selected.previous_values}
                </pre>
              </div>
            )}
            {selected.new_values && (
              <div style={{ marginTop: 12 }}>
                <span style={detailLabelS}>New Values</span>
                <pre style={{
                  margin: '4px 0 0', fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap',
                  backgroundColor: '#dcfce7', padding: 12, borderRadius: 6, fontFamily: 'monospace',
                  maxHeight: 200, overflowY: 'auto',
                }}>
                  {typeof selected.new_values === 'object'
                    ? JSON.stringify(selected.new_values, null, 2)
                    : selected.new_values}
                </pre>
              </div>
            )}
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
const loadingStyle = { padding: 40, textAlign: 'center', color: '#6b7280' };
const h1Style = { fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 };
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 14 };
const thStyle = { textAlign: 'left', padding: '10px 14px', fontWeight: 600, fontSize: 12, color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' };
const tdStyle = { padding: '10px 14px', borderBottom: '1px solid #f3f4f6', color: '#374151' };
const emptyStyle = { padding: 24, textAlign: 'center', color: '#9ca3af' };
const modalStyle = { backgroundColor: '#fff', borderRadius: 12, padding: 24, maxWidth: 640, width: '90vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' };
const detailGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' };
const detailLabelS = { fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' };
const btnIcon = { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 };
