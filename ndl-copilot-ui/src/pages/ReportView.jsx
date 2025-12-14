import React, { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { getReport } from '../api/apiClient'
import ScoreBar from '../components/ScoreBar'
import Card from '../components/Card'
import Badge from '../components/Badge'

export default function ReportView() {
  const { id } = useParams()
  const [report, setReport] = useState(null)
  const [error, setError] = useState(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    const poll = async () => {
      try {
        const r = await getReport(id)
        if (!mounted.current) return
        setReport(r)
      } catch (err) {
        // keep polling until report exists
      }
    }

    poll()
    const iv = setInterval(poll, 2000)
    return () => {
      mounted.current = false
      clearInterval(iv)
    }
  }, [id])

  if (error) return <div className="error">{error}</div>
  if (!report) return <div>Waiting for report…</div>

  const metrics = report.metrics || {}

  return (
    <div className="container-viewport flex justify-center">
      <div style={{ maxWidth: 'var(--max-w)', width: '100%' }}>
        <Card>
          <div className="flex items-start justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold">Auto-Report</h2>
              <div className="mt-1 text-sm text-muted">Project: <strong>{report.project_id || id}</strong></div>
            </div>
            <div className="text-right">
              <Badge tone={report.status === 'done' ? 'success' : 'default'}>{report.status || 'unknown'}</Badge>
            </div>
          </div>

          <div className="mt-6 score-grid">
            {Object.entries(metrics).map(([k, v]) => {
              const value = typeof v === 'number' ? v : (v && (v.score ?? v.value)) || 0
              return (
                <div key={k} className="card">
                  <div className="text-sm text-muted">{k}</div>
                  <div className="mt-4">
                    <ScoreBar label={k} value={value} />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold">Flags</h3>
            <div className="mt-2 flex gap-2">
              {report.flags && report.flags.length ? report.flags.map((f, i) => <Badge key={i} className="text-sm">{f}</Badge>) : <div className="muted">No flags detected</div>}
            </div>
          </div>

          {report.explanation && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold">Explanation</h3>
              <p className="mt-2 text-sm text-muted">{report.explanation}</p>
            </div>
          )}

          <details className="mt-6">
            <summary className="cursor-pointer underline">Raw JSON</summary>
            <pre className="report-json mt-3">{JSON.stringify(report, null, 2)}</pre>
          </details>
        </Card>
      </div>
    </div>
  )
}
