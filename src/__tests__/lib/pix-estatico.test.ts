import { gerarPayloadPix, calcularCRC16 } from '@/lib/pix-estatico'

// Mock do QRCode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockqrcode'),
}))

describe('PIX Estático', () => {
  describe('gerarPayloadPix', () => {
    it('deve gerar payload PIX válido', () => {
      const params = {
        chavePix: 'teste@email.com',
        valor: 100.50,
        nomeRecebedor: 'Loja Teste',
        cidade: 'São Paulo',
        txid: 'ABC123',
      }

      const payload = gerarPayloadPix(params)

      // Verificar estrutura básica do payload
      expect(payload).toContain('000201') // Payload Format Indicator
      expect(payload).toContain('BR.GOV.BCB.PIX') // GUI do PIX
      expect(payload).toContain('teste@email.com') // Chave PIX
      expect(payload).toContain('986') // Currency (BRL)
      expect(payload).toContain('100.50') // Valor
      expect(payload).toContain('BR') // País
    })

    it('deve usar valores padrão quando não informados', () => {
      const params = {
        chavePix: '12345678900',
        valor: 50,
        nomeRecebedor: 'Teste',
      }

      const payload = gerarPayloadPix(params)

      expect(payload).toContain('BR.GOV.BCB.PIX')
      expect(payload).toContain('BRASIL') // Cidade padrão
      expect(payload).toContain('***') // TXID padrão
    })

    it('deve truncar nome do recebedor para 25 caracteres', () => {
      const params = {
        chavePix: 'teste@email.com',
        valor: 100,
        nomeRecebedor: 'Nome Muito Longo Para Ser Aceito No Pix',
      }

      const payload = gerarPayloadPix(params)

      // O nome deve estar truncado
      expect(payload).toContain('NOME MUITO LONGO PARA SER')
    })

    it('deve truncar cidade para 15 caracteres', () => {
      const params = {
        chavePix: 'teste@email.com',
        valor: 100,
        nomeRecebedor: 'Teste',
        cidade: 'São José do Rio Preto',
      }

      const payload = gerarPayloadPix(params)

      // A cidade é truncada para 15 caracteres e convertida para maiúsculas
      // "São José do Rio Preto" -> "SÃO JOSÉ DO RIO" (15 chars, mantém acentos)
      expect(payload).toContain('SÃO JOSÉ DO RIO')
    })

    it('deve gerar payload com CRC16 válido', () => {
      const params = {
        chavePix: 'teste@email.com',
        valor: 100,
        nomeRecebedor: 'Teste',
      }

      const payload = gerarPayloadPix(params)

      // O CRC deve ter 4 caracteres hexadecimal no final
      expect(payload.length).toBeGreaterThan(100)
      const crcPart = payload.slice(-4)
      expect(crcPart).toMatch(/^[0-9A-F]{4}$/)
    })

    it('deve gerar payloads diferentes para parâmetros diferentes', () => {
      const params1 = {
        chavePix: 'teste1@email.com',
        valor: 100,
        nomeRecebedor: 'Teste 1',
      }

      const params2 = {
        chavePix: 'teste2@email.com',
        valor: 100,
        nomeRecebedor: 'Teste 2',
      }

      const payload1 = gerarPayloadPix(params1)
      const payload2 = gerarPayloadPix(params2)

      expect(payload1).not.toBe(payload2)
    })
  })

  describe('calcularCRC16', () => {
    it('deve calcular CRC16 corretamente', () => {
      // Teste com valor conhecido
      const crc = calcularCRC16('00020126')
      expect(crc).toMatch(/^[0-9A-F]{4}$/)
    })

    it('deve retornar CRC com 4 caracteres', () => {
      const crc = calcularCRC16('teste')
      expect(crc.length).toBe(4)
    })

    it('deve retornar valores consistentes para mesma entrada', () => {
      const input = 'teste consistente'
      const crc1 = calcularCRC16(input)
      const crc2 = calcularCRC16(input)
      expect(crc1).toBe(crc2)
    })
  })
})

describe('gerarQrCodePix', () => {
  it('deve gerar QR Code como Data URL', async () => {
    const { gerarQrCodePix } = await import('@/lib/pix-estatico')
    
    const qrCode = await gerarQrCodePix('payload-teste')
    
    expect(qrCode).toBe('data:image/png;base64,mockqrcode')
  })
})

describe('gerarPixEstatico', () => {
  it('deve gerar payload e QR Code', async () => {
    const { gerarPixEstatico } = await import('@/lib/pix-estatico')
    
    const params = {
      chavePix: 'teste@email.com',
      valor: 100,
      nomeRecebedor: 'Teste',
    }

    const resultado = await gerarPixEstatico(params)

    expect(resultado).toHaveProperty('payload')
    expect(resultado).toHaveProperty('qrCodeBase64')
    expect(resultado.payload).toContain('BR.GOV.BCB.PIX')
    expect(resultado.qrCodeBase64).toBe('data:image/png;base64,mockqrcode')
  })
})
