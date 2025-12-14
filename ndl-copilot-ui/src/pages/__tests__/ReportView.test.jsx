// @vitest-environment jsdom
import React from 'react'
import { render, screen } from '@testing-library/react'
import { test, expect, vi } from 'vitest'
import ReportView from '../ReportView'
import * as api from '../../api/apiClient'
import { BrowserRouter } from 'react-router-dom'

vi.mock('../../api/apiClient')

const sample = {
  project_id: 'abc123',
  status: 'done',
  language: 'javascript',
  metrics: { quality: 78, tests: 92 },
  flags: ['no-license', 'no-ci'],
}

test('renders metrics and flags and raw', async () => {
  api.getReport.mockResolvedValue(sample)

  render(
    <BrowserRouter>
      <ReportView />
    </BrowserRouter>
  )

  // wait for metrics to appear
  expect(await screen.findByText(/78%/)).toBeTruthy()
  expect(screen.getByText(/92%/)).toBeTruthy()
  // flags may also appear in the raw JSON; assert at least one match exists
  expect(screen.getAllByText(/no-license/i).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/no-ci/i).length).toBeGreaterThan(0)
})
