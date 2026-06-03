import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import GameForm from '../components/GameForm'

describe('GameForm', () => {
  it('renders Add Game title when no initial', () => {
    render(<GameForm onSave={() => {}} onClose={() => {}} />)
    expect(screen.getByText('Add Game')).toBeInTheDocument()
  })

  it('renders Edit Game title when initial provided', () => {
    render(<GameForm initial={{ title: 'X', genre: 'RPG', status: 'playing', hours: 0 }} onSave={() => {}} onClose={() => {}} />)
    expect(screen.getByText('Edit Game')).toBeInTheDocument()
  })

  it('shows validation errors when submitting empty', () => {
    const onSave = vi.fn()
    render(<GameForm onSave={onSave} onClose={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: /add game/i }))

    expect(onSave).not.toHaveBeenCalled()
  })

  it('saves with valid data', () => {
    const onSave = vi.fn()
    render(<GameForm onSave={onSave} onClose={() => {}} />)

    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[0], { target: { value: 'Test Game' } })
    fireEvent.change(screen.getByDisplayValue('Select genre...'), { target: { value: 'RPG' } })
    fireEvent.click(screen.getByRole('button', { name: /playing/i }))
    fireEvent.click(screen.getByRole('button', { name: /^add game$/i }))

    expect(onSave).toHaveBeenCalled()
    const payload = onSave.mock.calls[0][0]
    expect(payload.title).toBe('Test Game')
    expect(payload.genre).toBe('RPG')
    expect(payload.status).toBe('playing')
  })

  it('calls onClose when Cancel clicked', () => {
    const onClose = vi.fn()
    render(<GameForm onSave={() => {}} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('switches between status options', () => {
    const onSave = vi.fn()
    render(<GameForm initial={{ title: 'A', genre: 'RPG', status: 'backlog', hours: 0 }} onSave={onSave} onClose={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: /completed/i }))
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    expect(onSave).toHaveBeenCalled()
    expect(onSave.mock.calls[0][0].status).toBe('completed')
  })
})
