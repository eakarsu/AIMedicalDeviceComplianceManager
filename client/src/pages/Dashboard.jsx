import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiMonitor,
  FiFileText,
  FiCheckSquare,
  FiActivity,
  FiFolder,
  FiAlertTriangle,
  FiTool,
  FiUsers,
  FiTruck,
  FiAlertCircle,
  FiGitPullRequest,
  FiThermometer,
  FiCpu,
} from 'react-icons/fi';
import {
  devicesService,
  capaService,
  checklistsService,
  calibrationService,
} from '../services/api';

const CARDS = [
  { title: 'Device Registry', desc: 'Manage medical device inventory', icon: FiMonitor, route: '/devices', color: '#1a73e8', key: 'devices' },
  { title: 'Regulatory Standards', desc: 'Track regulatory requirements', icon: FiFileText, route: '/standards', color: '#7c3aed' },
  { title: 'Compliance Checklists', desc: 'Monitor compliance status', icon: FiCheckSquare, route: '/checklists', color: '#059669', key: 'checklists' },
  { title: 'Audit Trail', desc: 'View system activity logs', icon: FiActivity, route: '/audit-logs', color: '#d97706' },
  { title: 'Document Management', desc: 'Manage compliance documents', icon: FiFolder, route: '/documents', color: '#dc2626' },
  { title: 'Risk Assessment', desc: 'Evaluate and mitigate risks', icon: FiAlertTriangle, route: '/risk-assessments', color: '#ea580c' },
  { title: 'CAPA Management', desc: 'Corrective & preventive actions', icon: FiTool, route: '/capa', color: '#0891b2', key: 'capa' },
  { title: 'Training Records', desc: 'Track employee training', icon: FiUsers, route: '/training', color: '#4f46e5' },
  { title: 'Supplier Management', desc: 'Manage supplier qualifications', icon: FiTruck, route: '/suppliers', color: '#be185d' },
  { title: 'Non-Conformance', desc: 'Track non-conformance reports', icon: FiAlertCircle, route: '/nonconformance', color: '#b91c1c' },
  { title: 'Change Control', desc: 'Manage change requests', icon: FiGitPullRequest, route: '/change-controls', color: '#6d28d9' },
  { title: 'Calibration', desc: 'Equipment calibration tracking', icon: FiThermometer, route: '/calibration', color: '#0d9488', key: 'calibration' },
  { title: 'AI Compliance Tools', desc: 'AI-powered analysis tools', icon: FiCpu, route: '/ai-tools', color: '#7c3aed' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    devices: 0,
    capa: 0,
    checklists: 0,
    calibration: 0,
  });
  const [counts, setCounts] = useState({});

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [devicesRes, capaRes, checklistsRes, calibrationRes] =
          await Promise.allSettled([
            devicesService.getAll(),
            capaService.getAll(),
            checklistsService.getAll(),
            calibrationService.getAll(),
          ]);

        const extract = (result) => {
          if (result.status !== 'fulfilled') return [];
          const d = result.value;
          return Array.isArray(d) ? d : d?.data ?? d?.items ?? [];
        };

        const devicesList = extract(devicesRes);
        const capaList = extract(capaRes);
        const checklistsList = extract(checklistsRes);
        const calibrationList = extract(calibrationRes);

        setStats({
          devices: devicesList.length,
          capa: capaList.filter((c) => c.status === 'Open' || c.status === 'open').length,
          checklists: checklistsList.filter(
            (c) => c.status === 'Pending' || c.status === 'pending'
          ).length,
          calibration: calibrationList.filter((c) => {
            if (!c.nextDueDate && !c.next_due_date) return false;
            const due = new Date(c.nextDueDate || c.next_due_date);
            return due < new Date();
          }).length,
        });

        setCounts({
          devices: devicesList.length,
          capa: capaList.length,
          checklists: checklistsList.length,
          calibration: calibrationList.length,
        });
      } catch {
        // stats remain at defaults
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Devices', value: stats.devices, color: '#1a73e8' },
    { label: 'Open CAPAs', value: stats.capa, color: '#dc2626' },
    { label: 'Pending Checklists', value: stats.checklists, color: '#d97706' },
    { label: 'Overdue Calibrations', value: stats.calibration, color: '#059669' },
  ];

  return (
    <div
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        padding: '24px',
        background: '#f3f4f6',
        minHeight: '100vh',
      }}
    >
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: '0 0 24px' }}>
        Dashboard
      </h1>

      {/* Stats Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        {statCards.map((s) => (
          <div
            key={s.label}
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              borderLeft: `4px solid ${s.color}`,
            }}
          >
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
              {s.label}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Feature Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
          gap: '16px',
        }}
      >
        {CARDS.map((card) => {
          const Icon = card.icon;
          const count = card.key ? counts[card.key] : null;

          return (
            <div
              key={card.route}
              onClick={() => navigate(card.route)}
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '24px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: `${card.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={20} color={card.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 }}>
                    {card.title}
                  </h3>
                  {count != null && (
                    <span
                      style={{
                        background: `${card.color}15`,
                        color: card.color,
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '10px',
                      }}
                    >
                      {count}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0' }}>
                  {card.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
