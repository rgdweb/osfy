/**
 * Gerador de PIX Estático (BR Code)
 * Seguindo padrão do BACEN (Banco Central do Brasil)
 * Não exige CPF - usa apenas a chave PIX cadastrada
 */

import QRCode from 'qrcode'

interface PixEstaticoParams {
  chavePix: string
  valor: number
  nomeRecebedor: string
  cidade?: string
  txid?: string
}

/**
 * Gera o payload do PIX (copia e cola)
 * Formato: BR Code padrão EMV-QR
 */
export function gerarPayloadPix(params: PixEstaticoParams): string {
  const { chavePix, valor, nomeRecebedor, cidade = 'BRASIL', txid = '***' } = params

  // Função para criar campo EMV (ID + Tamanho + Valor)
  const emv = (id: string, value: string): string => {
    const len = value.length.toString().padStart(2, '0')
    return `${id}${len}${value}`
  }

  // 00 - Payload Format Indicator (obrigatório)
  const payloadFormat = emv('00', '01')

  // 26 - Merchant Account Information - PIX
  const guiBacen = emv('00', 'BR.GOV.BCB.PIX') // GUI do PIX
  const chavePixEmv = emv('01', chavePix) // Chave PIX
  const merchantAccount = emv('26', guiBacen + chavePixEmv)

  // 52 - Merchant Category Code (0000 = desconhecido)
  const merchantCategory = emv('52', '0000')

  // 53 - Transaction Currency (986 = Real Brasileiro - ISO 4217)
  const currency = emv('53', '986')

  // 54 - Transaction Amount (valor do PIX)
  const valorStr = valor.toFixed(2)
  const amount = emv('54', valorStr)

  // 58 - Country Code (BR = Brasil)
  const country = emv('58', 'BR')

  // 59 - Merchant Name (nome do recebedor, até 25 caracteres)
  const merchantName = emv('59', nomeRecebedor.substring(0, 25).toUpperCase())

  // 60 - Merchant City (cidade, até 15 caracteres)
  const merchantCity = emv('60', cidade.substring(0, 15).toUpperCase())

  // 62 - Additional Data Field (TXID)
  const txIdField = emv('05', txid.substring(0, 25))
  const additionalData = emv('62', txIdField)

  // Monta payload sem CRC para calcular
  const payloadSemCRC = 
    payloadFormat +
    merchantAccount +
    merchantCategory +
    currency +
    amount +
    country +
    merchantName +
    merchantCity +
    additionalData +
    '6304' // ID 63 com tamanho 04 (CRC terá 4 caracteres)

  // Calcula CRC16-CCITT
  const crc = calcularCRC16(payloadSemCRC)

  return payloadSemCRC + crc
}

/**
 * Calcula CRC16-CCITT (padrão usado no PIX)
 */
export function calcularCRC16(str: string): string {
  let crc = 0xFFFF
  const polynomial = 0x1021

  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ polynomial
      } else {
        crc <<= 1
      }
    }
  }

  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')
}

/**
 * Gera QR Code PIX como Data URL (base64)
 * Usa a biblioteca 'qrcode' localmente
 */
export async function gerarQrCodePix(payload: string): Promise<string> {
  try {
    // Gerar QR Code como Data URL (base64)
    const dataUrl = await QRCode.toDataURL(payload, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    })
    return dataUrl
  } catch (error) {
    console.error('[PIX] Erro ao gerar QR Code:', error)
    throw new Error('Erro ao gerar QR Code')
  }
}

/**
 * Gera PIX estático completo (payload + QR Code)
 */
export async function gerarPixEstatico(params: PixEstaticoParams): Promise<{
  payload: string
  qrCodeBase64: string
}> {
  const payload = gerarPayloadPix(params)
  const qrCodeBase64 = await gerarQrCodePix(payload)

  return {
    payload,
    qrCodeBase64
  }
}
