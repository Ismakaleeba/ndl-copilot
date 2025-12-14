// @vitest-environment jsdom
import React from 'react'
import { render, screen } from '@testing-library/react'
import { test, expect, vi } from 'vitest'
import ProjectStatus from '../ProjectStatus'
import * as api from '../../api/apiClient'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../../api/apiClient')

test('shows link when auto-done', async () => {
  api.getStatus.mockResolvedValue({ project_id: 'abc', status: 'auto-done' })

  render(
    <MemoryRouter initialEntries={["/project/abc"]}>
      <Routes>
        <Route path="/project/:id" element={<ProjectStatus />} />
      </Routes>
    </MemoryRouter>
  )

  expect(await screen.findByText(/View\s*Auto\s*Report/i)).toBeTruthy()
})
