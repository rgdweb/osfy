import React from 'react'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/badge'

describe('Badge Component', () => {
  it('deve renderizar o badge com texto', () => {
    render(<Badge>Status</Badge>)
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('deve aplicar variante default por padrão', () => {
    render(<Badge>Default</Badge>)
    const badge = screen.getByText('Default')
    expect(badge).toHaveClass('bg-primary')
  })

  it('deve aplicar variante secondary', () => {
    render(<Badge variant="secondary">Secondary</Badge>)
    const badge = screen.getByText('Secondary')
    expect(badge).toHaveClass('bg-secondary')
  })

  it('deve aplicar variante destructive', () => {
    render(<Badge variant="destructive">Destructive</Badge>)
    const badge = screen.getByText('Destructive')
    expect(badge).toHaveClass('bg-destructive')
  })

  it('deve aplicar variante outline', () => {
    render(<Badge variant="outline">Outline</Badge>)
    const badge = screen.getByText('Outline')
    expect(badge).toHaveClass('text-foreground')
  })

  it('deve aceitar className customizado', () => {
    render(<Badge className="custom-badge">Custom</Badge>)
    const badge = screen.getByText('Custom')
    expect(badge).toHaveClass('custom-badge')
  })

  it('deve renderizar como span por padrão', () => {
    render(<Badge>Span Badge</Badge>)
    const badge = screen.getByText('Span Badge')
    expect(badge.tagName.toLowerCase()).toBe('span')
  })

  it('deve ter data-slot="badge"', () => {
    render(<Badge>Test</Badge>)
    const badge = screen.getByText('Test')
    expect(badge).toHaveAttribute('data-slot', 'badge')
  })

  it('deve aceitar classes de tamanho', () => {
    render(<Badge className="text-sm">Small</Badge>)
    const badge = screen.getByText('Small')
    expect(badge).toHaveClass('text-sm')
  })

  it('deve ser inline-flex', () => {
    render(<Badge>Flex</Badge>)
    const badge = screen.getByText('Flex')
    expect(badge).toHaveClass('inline-flex')
  })

  it('deve ter bordas arredondadas', () => {
    render(<Badge>Rounded</Badge>)
    const badge = screen.getByText('Rounded')
    expect(badge).toHaveClass('rounded-md')
  })
})
