import React from 'react';

export default function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, total, limit } = pagination;

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginTop: 16, padding: '10px 0', flexWrap: 'wrap', gap: 8,
    }}>
      <span style={{ fontSize: 13, color: '#6b7280' }}>
        Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total} records
      </span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          style={{
            padding: '6px 14px', fontSize: 13, border: '1px solid #d1d5db',
            borderRadius: 6, cursor: page > 1 ? 'pointer' : 'not-allowed',
            background: page > 1 ? '#fff' : '#f9fafb', color: page > 1 ? '#374151' : '#9ca3af',
          }}
        >
          ← Prev
        </button>
        <span style={{ fontSize: 13, color: '#374151', minWidth: 80, textAlign: 'center' }}>
          Page {page} / {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          style={{
            padding: '6px 14px', fontSize: 13, border: '1px solid #d1d5db',
            borderRadius: 6, cursor: page < totalPages ? 'pointer' : 'not-allowed',
            background: page < totalPages ? '#fff' : '#f9fafb', color: page < totalPages ? '#374151' : '#9ca3af',
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
