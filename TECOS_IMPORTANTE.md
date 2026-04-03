# TecOS - Informações Importantes

## ⚠️ REGRAS CRÍTICAS - NUNCA IGNORAR

### 1. BANCO DE DADOS
- **O banco está no Neon (PostgreSQL)**
- **NUNCA usar SQLite** - Vercel usa PostgreSQL
- **SEMPRE verificar se o schema tem todos os campos que existem no banco**
- Campos que EXISTEM no banco Neon e devem ser mantidos:
  - `codigoAcesso` - campo antigo, manter para compatibilidade
  - `codigoOs` - campo novo para assinatura

### 2. GIT - NUNCA FAZER FORCE PUSH
- **NUNCA fazer `git push --force`** - APAGA TUDO!
- **SEMPRE** fazer `git push origin main` (push normal)
- Repositório: `rgdweb/osfy`
- Branch: `main` (NUNCA master)
- **SEMPRE commitar e dar push ao terminar** - NÃO esperar o usuário pedir!

### 3. DEPLOY
- O Vercel faz deploy automático ao receber push
- O build script agora sincroniza o schema:
  ```json
  "build": "prisma generate && prisma db push --accept-data-loss && next build"
  ```

### 4. ESTRUTURA DO PROJETO
- **Painel do técnico**: `/painel/os/[id]/client.tsx`
- **Página pública da OS**: `/os/[id]/client.tsx`
- **API de pagamento**: `/api/os/[id]/pagamento/route.ts`
- **API de avaliação**: `/api/os/[id]/avaliacao/route.ts`
- **Webhook Mercado Pago**: `/api/webhooks/mercadopago/route.ts`

### 5. CAMPOS DE PAGAMENTO NA OS (schema) - MERCADO PAGO
```prisma
// Dados de pagamento Mercado Pago
mpPaymentId           String?   // ID do pagamento no MP
mpPreferenceId        String?   // ID da preferência (link de pagamento)
linkPagamento         String?   // Link de pagamento (init_point)
pixQrCode             String?   // QR Code PIX em base64
pixCopiaCola          String?   // Código PIX copia e cola
boletoUrl             String?   // URL do boleto PDF
boletoLinhaDigitavel  String?   // Linha digitável do boleto
```

### 6. FLUXO DE PAGAMENTO
1. Técnico gera pagamento pelo PAINEL (botões PIX/Boleto/Link)
2. Cliente vê pagamento na PÁGINA PÚBLICA
3. Webhook marca OS como paga automaticamente

### 7. SISTEMA DE AVALIAÇÕES
1. Cliente assina OS na página pública
2. Botão aparece para avaliar (estrelas 1-5)
3. Loja recebe notificação
4. Loja pode responder avaliações

### 8. AUTENTICAÇÃO
- JWT próprio com cookie `tecos-token`
- SuperAdmin gerencia lojas
- Cada loja tem seus clientes e OS

### 9. INTEGRAÇÃO MERCADO PAGO
- Configurar Access Token no superadmin
- Campos no ConfiguracaoPagamento: `mpAccessToken`, `mpPublicKey`, `mpClientId`, `mpClientSecret`
- Webhook URL: `https://tec-os.vercel.app/api/webhooks/mercadopago`
- Eventos: `payment`
- **Asaas foi REMOVIDO completamente do sistema**

### 10. BACKUP E STORAGE
- **Storage**: `sorteiomax.com.br/tecos-uploads/`
- **Scripts de backup**: `scripts-backup/`
- **API de exportação**: `/api/backup/export`
- Configurar CRON no servidor para backup diário

### 11. SISTEMA DE UPLOAD
- **Documentação completa**: `UPLOAD_SISTEMA.md`
- **Servidor**: `sorteiomax.com.br/tecos-uploads/`
- **Scripts PHP**: `upload.php`, `delete.php`
- **API Key**: Configurada nas variáveis de ambiente
- **Estrutura**:
  ```
  uploads/{lojaId}/{tipo}/
  ├── logo/     # Logo da loja
  ├── os/       # Fotos das OS
  ├── produto/  # Fotos do PDV
  ├── banner/   # Banners
  └── usuario/  # Fotos de perfil
  ```

---

## 📋 HISTÓRICO DE PROBLEMAS E SOLUÇÕES

### Problema: Force push sobrescreveu código
**Data**: Março 2026
**Causa**: Fiz `git push --force` sem ter o código mais recente do GitHub
**Solução**: Sempre fazer pull antes, nunca force push

### Problema: OS desapareceram
**Data**: Março 2026  
**Causa**: Schema diferente do banco Neon (campo `codigoAcesso` faltando)
**Solução**: Adicionar campo de volta no schema para compatibilidade

### Problema: Erro no build Vercel
**Erro**: `cannot drop index "OrdemServico_codigoAcesso_key"`
**Causa**: Prisma tentando remover constraint que existe no banco
**Solução**: Manter campo `codigoAcesso` no schema

### Problema: Erro ao resetar pagamento / Ver OS como cliente
**Data**: Março 2026
**Causa**: Campos com nomes antigos (`mercadoPagoPaymentId`, `ticketUrl`, `asaasPaymentId`)
**Solução**: Usar campos corretos: `mpPaymentId`, `mpPreferenceId`, `boletoUrl`

---

## 🆕 FUNCIONALIDADES ADICIONADAS (Março 2026)

### Migração para Mercado Pago
- Asaas REMOVIDO completamente
- Campos atualizados: `mpPaymentId`, `mpPreferenceId`, `mpAccessToken`, etc.
- Biblioteca: `/src/lib/mercadopago.ts`
- Webhook: `/api/webhooks/mercadopago/route.ts`

### Sistema de Avaliações
- Tabela `Avaliacao` no schema
- Estrelas de 1 a 5
- Comentários opcionais
- Resposta da loja
- Estatísticas por loja

### Scripts de Backup
- `backup.php` - Backup automático
- `restaurar.php` - Restaurar backup
- `estatisticas.php` - Ver uso de disco

### Relatórios para Contador (pendente)
- Faturamento mensal
- DRE simplificado
- Exportação Excel/PDF

---

## 🔐 TOKEN GITHUB
- Usado para push quando necessário
- **NUNCA commitar tokens no código**

---

*Última atualização: Março 2026*
