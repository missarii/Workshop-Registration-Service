import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ScrollText } from 'lucide-react'
import api from '../lib/api'
import type { AuditLog } from '../types'

export default function AuditPage() {
  const { data, isLoading } = useQuery<{ logs: AuditLog[], total: number }>({
    queryKey: ['audit'],
    queryFn: () => api.get('/audit?take=100').then((r) => r.data),
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">Complete history of business actions.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-page">
          <div className="loading-spinner" />
        </div>
      ) : data?.logs.length === 0 ? (
        <div className="empty-state">
          <ScrollText className="empty-state-icon" />
          <h3 className="empty-state-title">No audit logs found</h3>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {data?.logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 500 }}>{format(new Date(log.createdAt), 'MMM d, yyyy')}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{format(new Date(log.createdAt), 'h:mm:ss a')}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{log.actor.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.actor.role}</div>
                  </td>
                  <td>
                    <span className="badge badge-muted" style={{ fontSize: '0.7rem' }}>
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8125rem' }}>
                      <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{log.entityType}</span>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{log.entityId}</div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', background: 'var(--color-surface-2)', padding: '4px 8px', borderRadius: '4px', maxWidth: '300px', overflowX: 'auto', whiteSpace: 'pre' }}>
                      {JSON.stringify(log.metadata, null, 2)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
