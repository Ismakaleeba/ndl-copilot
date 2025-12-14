import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import SubmitProject from './pages/SubmitProject'
import ProjectStatus from './pages/ProjectStatus'
import ReportView from './pages/ReportView'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="nav">
        <div className="container-viewport flex items-center justify-between" style={{ maxWidth: 'var(--max-w)', width: '100%' }}>
          <Link to="/" className="logo">NDL Copilot</Link>
          <div className="text-sm text-muted">Beta</div>
        </div>
      </nav>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<SubmitProject />} />
          <Route path="/project/:id" element={<ProjectStatus />} />
          <Route path="/project/:id/report" element={<ReportView />} />
        </Routes>
      </main>

      <footer className="border-t border-gray-100">
        <div className="container-viewport text-xs text-muted" style={{ maxWidth: 'var(--max-w)', width: '100%' }}>
          © NDL Copilot — Demo
        </div>
      </footer>
    </div>
  )
}
