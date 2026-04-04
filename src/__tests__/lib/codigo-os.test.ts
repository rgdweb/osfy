import { validarCodigoOs } from '@/lib/utils/codigo-os'

// Mock do banco de dados
jest.mock('@/lib/db', () => ({
  db: {
    ordemServico: {
      findUnique: jest.fn(),
    },
  },
}))

describe('Código de OS', () => {
  describe('validarCodigoOs', () => {
    it('deve validar código no formato correto', () => {
      expect(validarCodigoOs('A053219')).toBe(true)
      expect(validarCodigoOs('B876543')).toBe(true)
      expect(validarCodigoOs('Z999999')).toBe(true)
    })

    it('deve rejeitar código com letra minúscula', () => {
      expect(validarCodigoOs('a053219')).toBe(false)
    })

    it('deve rejeitar código sem letra', () => {
      expect(validarCodigoOs('0532199')).toBe(false)
    })

    it('deve rejeitar código com menos de 6 dígitos', () => {
      expect(validarCodigoOs('A05321')).toBe(false)
    })

    it('deve rejeitar código com mais de 6 dígitos', () => {
      expect(validarCodigoOs('A0532199')).toBe(false)
    })

    it('deve rejeitar código vazio', () => {
      expect(validarCodigoOs('')).toBe(false)
    })

    it('deve rejeitar código com caracteres especiais', () => {
      expect(validarCodigoOs('A05321!')).toBe(false)
    })

    it('deve aceitar todas as letras de A a Z', () => {
      const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      for (const letra of letras) {
        expect(validarCodigoOs(`${letra}123456`)).toBe(true)
      }
    })
  })

  describe('gerarCodigoOsUnico', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('deve gerar código único quando não existe', async () => {
      const { db } = await import('@/lib/db')
      const { gerarCodigoOsUnico } = await import('@/lib/utils/codigo-os')

      // Mock: código não existe no banco
      ;(db.ordemServico.findUnique as jest.Mock).mockResolvedValue(null)

      const codigo = await gerarCodigoOsUnico()

      // Verificar formato
      expect(validarCodigoOs(codigo)).toBe(true)
    })

    it('deve tentar novamente se código já existir', async () => {
      const { db } = await import('@/lib/db')
      const { gerarCodigoOsUnico } = await import('@/lib/utils/codigo-os')

      // Mock: primeira tentativa encontra código, segunda não
      ;(db.ordemServico.findUnique as jest.Mock)
        .mockResolvedValueOnce({ codigoOs: 'A053219' }) // Existe
        .mockResolvedValueOnce(null) // Não existe

      const codigo = await gerarCodigoOsUnico()

      expect(validarCodigoOs(codigo)).toBe(true)
      expect(db.ordemServico.findUnique).toHaveBeenCalledTimes(2)
    })
  })
})
