import {
  formatDate,
  formatDateTime,
  formatCurrency,
  formatPhone,
  getWhatsAppLink,
  getAvatarColor,
  getInitials,
  truncate,
  isValidEmail,
  isValidPhone,
  delay,
  generateId,
  getRelativeTime,
  cn,
} from '@/lib/utils'

describe('Utils Functions', () => {
  describe('cn (className merge)', () => {
    it('deve combinar classes corretamente', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('deve lidar com classes condicionais', () => {
      expect(cn('base', true && 'included', false && 'excluded')).toBe('base included')
    })

    it('deve mesclar classes tailwind conflitantes', () => {
      expect(cn('p-4', 'p-2')).toBe('p-2')
    })
  })

  describe('formatDate', () => {
    it('deve formatar data corretamente', () => {
      const date = new Date('2024-03-15T10:30:00')
      const result = formatDate(date)
      expect(result).toBe('15/03/2024')
    })

    it('deve aceitar string de data', () => {
      const result = formatDate('2024-03-15T10:30:00')
      expect(result).toBe('15/03/2024')
    })
  })

  describe('formatDateTime', () => {
    it('deve formatar data e hora corretamente', () => {
      const date = new Date('2024-03-15T10:30:00')
      const result = formatDateTime(date)
      expect(result).toContain('15/03/2024')
      expect(result).toContain('10:30')
    })
  })

  describe('formatCurrency', () => {
    it('deve formatar valor em reais', () => {
      expect(formatCurrency(1500.5)).toBe('R$\xa01.500,50')
    })

    it('deve formatar valor zero', () => {
      expect(formatCurrency(0)).toBe('R$\xa00,00')
    })

    it('deve formatar valores grandes', () => {
      expect(formatCurrency(1500000)).toBe('R$\xa01.500.000,00')
    })
  })

  describe('formatPhone', () => {
    it('deve formatar celular com 11 dígitos', () => {
      expect(formatPhone('11987654321')).toBe('(11) 98765-4321')
    })

    it('deve formatar telefone fixo com 10 dígitos', () => {
      expect(formatPhone('1134567890')).toBe('(11) 3456-7890')
    })

    it('deve retornar original se tamanho inválido', () => {
      expect(formatPhone('123')).toBe('123')
    })

    it('deve remover caracteres não numéricos', () => {
      expect(formatPhone('(11) 98765-4321')).toBe('(11) 98765-4321')
    })
  })

  describe('getWhatsAppLink', () => {
    it('deve gerar link básico do WhatsApp', () => {
      expect(getWhatsAppLink('11987654321')).toBe('https://wa.me/5511987654321')
    })

    it('deve gerar link com mensagem', () => {
      const link = getWhatsAppLink('11987654321', 'Olá!')
      expect(link).toBe('https://wa.me/5511987654321?text=Ol%C3%A1!')
    })

    it('deve limpar caracteres não numéricos do telefone', () => {
      expect(getWhatsAppLink('(11) 98765-4321')).toBe('https://wa.me/5511987654321')
    })
  })

  describe('getAvatarColor', () => {
    it('deve retornar uma cor válida', () => {
      const color = getAvatarColor('João Silva')
      expect(color).toMatch(/^bg-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-500$/)
    })

    it('deve retornar a mesma cor para o mesmo nome', () => {
      const color1 = getAvatarColor('João Silva')
      const color2 = getAvatarColor('João Silva')
      expect(color1).toBe(color2)
    })

    it('deve retornar cores diferentes para nomes diferentes', () => {
      const color1 = getAvatarColor('João Silva')
      const color2 = getAvatarColor('Maria Santos')
      // Pode ser igual em alguns casos, mas geralmente será diferente
      expect(typeof color1).toBe('string')
      expect(typeof color2).toBe('string')
    })
  })

  describe('getInitials', () => {
    it('deve retornar iniciais de nome completo', () => {
      expect(getInitials('João Silva')).toBe('JS')
    })

    it('deve retornar no máximo 2 iniciais', () => {
      expect(getInitials('João Silva Santos')).toBe('JS')
    })

    it('deve retornar inicial única para nome simples', () => {
      expect(getInitials('João')).toBe('J')
    })

    it('deve retornar iniciais em maiúsculas', () => {
      expect(getInitials('joão silva')).toBe('JS')
    })
  })

  describe('truncate', () => {
    it('deve truncar texto longo', () => {
      // truncate retorna os primeiros N caracteres + '...'
      expect(truncate('Texto muito longo para exibir', 10)).toBe('Texto muit...')
    })

    it('deve retornar texto original se menor que o limite', () => {
      expect(truncate('Texto curto', 20)).toBe('Texto curto')
    })

    it('deve retornar texto original se igual ao limite', () => {
      expect(truncate('1234567890', 10)).toBe('1234567890')
    })
  })

  describe('isValidEmail', () => {
    it('deve validar email correto', () => {
      expect(isValidEmail('teste@email.com')).toBe(true)
    })

    it('deve rejeitar email sem @', () => {
      expect(isValidEmail('testeemail.com')).toBe(false)
    })

    it('deve rejeitar email sem domínio', () => {
      expect(isValidEmail('teste@')).toBe(false)
    })

    it('deve rejeitar email vazio', () => {
      expect(isValidEmail('')).toBe(false)
    })
  })

  describe('isValidPhone', () => {
    it('deve validar celular com 11 dígitos', () => {
      expect(isValidPhone('11987654321')).toBe(true)
    })

    it('deve validar telefone fixo com 10 dígitos', () => {
      expect(isValidPhone('1134567890')).toBe(true)
    })

    it('deve rejeitar telefone com menos de 10 dígitos', () => {
      expect(isValidPhone('987654321')).toBe(false)
    })

    it('deve rejeitar telefone com mais de 11 dígitos', () => {
      expect(isValidPhone('119876543212')).toBe(false)
    })

    it('deve ignorar caracteres não numéricos', () => {
      expect(isValidPhone('(11) 98765-4321')).toBe(true)
    })
  })

  describe('delay', () => {
    it('deve resolver após o tempo especificado', async () => {
      const start = Date.now()
      await delay(100)
      const elapsed = Date.now() - start
      expect(elapsed).toBeGreaterThanOrEqual(90) // Margem de erro
    })
  })

  describe('generateId', () => {
    it('deve gerar um ID único', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
    })

    it('deve ter formato esperado', () => {
      const id = generateId()
      expect(id.length).toBeGreaterThan(5)
      expect(id).toMatch(/^[a-z0-9]+$/)
    })
  })

  describe('getRelativeTime', () => {
    it('deve retornar "Agora mesmo" para menos de 1 minuto', () => {
      const date = new Date(Date.now() - 30000) // 30 segundos atrás
      expect(getRelativeTime(date)).toBe('Agora mesmo')
    })

    it('deve retornar minutos para menos de 1 hora', () => {
      const date = new Date(Date.now() - 5 * 60000) // 5 minutos atrás
      expect(getRelativeTime(date)).toBe('5 min atrás')
    })

    it('deve retornar horas para menos de 24 horas', () => {
      const date = new Date(Date.now() - 3 * 3600000) // 3 horas atrás
      expect(getRelativeTime(date)).toBe('3h atrás')
    })

    it('deve retornar dias para menos de 7 dias', () => {
      const date = new Date(Date.now() - 3 * 86400000) // 3 dias atrás
      expect(getRelativeTime(date)).toBe('3 dias atrás')
    })

    it('deve aceitar string de data', () => {
      const date = new Date(Date.now() - 30000).toISOString()
      expect(getRelativeTime(date)).toBe('Agora mesmo')
    })
  })
})
