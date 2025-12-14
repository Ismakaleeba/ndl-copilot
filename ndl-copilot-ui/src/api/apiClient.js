const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

export async function submitProject(payload) {
  const res = await fetch(`${API_BASE}/api/v1/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getStatus(projectId) {
  const res = await fetch(`${API_BASE}/api/v1/projects/${projectId}/status`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getReport(projectId) {
  const res = await fetch(`${API_BASE}/api/v1/projects/${projectId}/auto-report`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export default { submitProject, getStatus, getReport }
