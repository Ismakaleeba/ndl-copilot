import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getStatus } from '../api/apiClient'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'

export default function ProjectStatus() {
  const { id } = useParams()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    const poll = async () => {
      try {
        const res = await getStatus(id)
        if (!mounted.current) return
        setStatus(res.status || 'unknown')
      } catch (err) {
        if (!mounted.current) return
        setError(String(err))
      }
    }

    poll()
    const iv = setInterval(poll, 2000)
    return () => {
      mounted.current = false
      clearInterval(iv)
    }
  }, [id])

  const readable = status === 'auto-done' ? 'Completed' : status === 'queued' ? 'Queued' : status === 'pending' ? 'Pending' : status

  return (
    <div className="container-viewport flex justify-center">
      <div style={{ maxWidth: 'var(--max-w)', width: '100%' }}>
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">Project Status</h3>
              <div className="mt-2 text-sm text-muted">Project ID: <span className="font-medium">{id}</span></div>
            </div>
            <div className="text-right">
              <Badge tone={readable === 'Completed' ? 'success' : readable === 'Queued' ? 'default' : 'warn'}>{readable}</Badge>
            </div>
          </div>

          <div className="mt-6">
            {status === 'loading' && <div className="h-6 bg-gray-100 rounded animate-pulse" />}
            {status === 'auto-done' && (
              <div className="mt-4">
                <Link to={`/project/${id}/report`}><Button>View Auto Report</Button></Link>
              </div>
            )}
            {status !== 'auto-done' && status !== 'loading' && (
              <div className="mt-4 text-sm text-muted">We're processing your project. This usually takes a few minutes.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
