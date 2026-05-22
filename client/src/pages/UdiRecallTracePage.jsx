import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function UdiRecallTracePage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/udi-recall-trace')
      .then((res) => setData(res.data))
      .catch(() => setData(null));
  }, []);

  if (!data) return <div>Loading UDI recall trace...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>UDI Recall Trace</h1>
        <p>Trace affected lots from UDI scans through field actions, customer notices, and effectiveness checks.</p>
      </div>
      <div className="stats-grid">
        {Object.entries(data.summary).map(([key, value]) => (
          <div className="stat-card" key={key}>
            <h3>{value}</h3>
            <p>{key.replace(/([A-Z])/g, ' $1')}</p>
          </div>
        ))}
      </div>
      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>UDI</th><th>Model</th><th>Lot</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {data.lots.map((lot) => (
              <tr key={lot.udi}><td>{lot.udi}</td><td>{lot.model}</td><td>{lot.lot}</td><td>{lot.status}</td><td>{lot.action}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="card">
        <h2>Workflow</h2>
        <p>{data.workflow.join(' -> ')}</p>
      </section>
    </div>
  );
}
