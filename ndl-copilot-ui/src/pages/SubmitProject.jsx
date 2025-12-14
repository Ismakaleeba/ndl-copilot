import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { submitProject } from '../api/apiClient'
import Card from '../components/Card'
import Button from '../components/Button'

export default function SubmitProject() {
  const [repo, setRepo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!repo) return setError('Repository URL is required')
    setLoading(true)
    try {
      const res = await submitProject({ repo })
      setResult(res)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-viewport flex justify-center">
      <div style={{ maxWidth: 'var(--max-w)', width: '100%' }}>
        <Card>
          <h2 className="text-2xl font-bold">Submit Project</h2>
          <p className="mt-2 text-sm text-muted">Paste a GitHub repository URL and we'll run an automatic analysis.</p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <input className="w-full border border-gray-200 rounded-md px-4 py-2" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="https://github.com/owner/repo" />
            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Submitting…' : 'Submit'}</Button>
              <Button type="button" variant="ghost" onClick={() => setRepo('')}>Clear</Button>
            </div>
          </form>

          {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

          {result && (
            <div className="mt-4">
              <p>Project submitted: <strong>{result.project_id}</strong></p>
              <p>Status: <strong>{result.status}</strong></p>
              <div className="mt-2"><Button onClick={() => navigate(`/project/${result.project_id}`)}>View status</Button></div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
