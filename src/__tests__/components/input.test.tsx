import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/input'

describe('Input Component', () => {
  it('deve renderizar o input', () => {
    render(<Input placeholder="Digite aqui" />)
    expect(screen.getByPlaceholderText('Digite aqui')).toBeInTheDocument()
  })

  it('deve aceitar valor', () => {
    render(<Input value="teste" readOnly />)
    expect(screen.getByDisplayValue('teste')).toBeInTheDocument()
  })

  it('deve permitir digitação', async () => {
    const user = userEvent.setup()
    render(<Input placeholder="Digite" />)
    
    const input = screen.getByPlaceholderText('Digite')
    await user.type(input, 'texto teste')
    
    expect(input).toHaveValue('texto teste')
  })

  it('deve estar desabilitado quando disabled é true', () => {
    render(<Input disabled placeholder="Disabled" />)
    const input = screen.getByPlaceholderText('Disabled')
    expect(input).toBeDisabled()
  })

  it('deve aceitar className customizado', () => {
    render(<Input className="custom-class" placeholder="Custom" />)
    const input = screen.getByPlaceholderText('Custom')
    expect(input).toHaveClass('custom-class')
  })

  it('deve aceitar tipo diferente', () => {
    render(<Input type="email" placeholder="Email" />)
    const input = screen.getByPlaceholderText('Email')
    expect(input).toHaveAttribute('type', 'email')
  })

  it('deve aceitar tipo password', () => {
    render(<Input type="password" placeholder="Senha" data-testid="password-input" />)
    const input = screen.getByTestId('password-input')
    expect(input).toHaveAttribute('type', 'password')
  })

  it('deve chamar onChange quando valor muda', async () => {
    const handleChange = jest.fn()
    const user = userEvent.setup()
    
    render(<Input onChange={handleChange} placeholder="Change" />)
    
    await user.type(screen.getByPlaceholderText('Change'), 'a')
    expect(handleChange).toHaveBeenCalled()
  })

  it('deve aceitar name attribute', () => {
    render(<Input name="campo" placeholder="Named" />)
    const input = screen.getByPlaceholderText('Named')
    expect(input).toHaveAttribute('name', 'campo')
  })

  it('deve aceitar id attribute', () => {
    render(<Input id="campo-id" placeholder="ID" />)
    const input = screen.getByPlaceholderText('ID')
    expect(input).toHaveAttribute('id', 'campo-id')
  })
})
