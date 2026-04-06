# 📚 CONTEXTO COMPLETO - SISTEMA OSFY

> **Arquivo gerado para continuidade de conversas e desenvolvimento do sistema**
> 
> **Data de criação:** 07/04/2026
> 
> **Versão do sistema:** Produção Estável

---

## 🔗 LINKS E CREDENCIAIS IMPORTANTES

### GitHub
- **Repositório:** https://github.com/rgdweb/osfy
- **Token de acesso:** ``
- **Branch principal:** main
- **Proprietário:** rgdweb

### Banco de Dados - Neon (PostgreSQL)
- **Provedor:** Neon (neon.tech)
- **Tipo:** PostgreSQL Serverless
- **Características:**
  - Atualiza schema automaticamente quando roda `npx prisma db push`
  - Escala automática
  - Connection pooling integrado
- **String de conexão:** Configurada no `.env` do Vercel

### Hospedagem - Vercel
- **Provedor:** Vercel
- **Deploy automático:** SIM - quando faz push na branch main
- **Domínio de preview:** `https://preview-chat-[chatid].space.z.ai/`
- **Variáveis de ambiente:** Configuradas no painel do Vercel

---

## ⚠️ REGRAS OBRIGATÓRIAS

### 1. NUNCA usar `git push --force`
```
❌ ERRADO: git push --force origin main
✅ CORRETO: git push origin main
```
**Motivo:** O Vercel faz deploy automático após cada push. Push force pode quebrar o deploy.

### 2. Sempre fazer backup antes de grandes alterações
```
✅ Criar backup em /home/z/my-project/backups/
```

### 3. Banco Neon atualiza sozinho
```
✅ npx prisma db push (para sincronizar schema)
✅ npx prisma generate (para atualizar tipos)
```
**Não precisa** de migrations manuais para desenvolvimento.

### 4. Diretório de trabalho obrigatório
```
✅ /home/z/my-project/ (raiz do projeto)
✅ Arquivos gerados em: /home/z/my-project/download/
```

### 5. Arquivos de backup e documentação
```
✅ Worklog em: /home/z/my-project/worklog.md
✅ Backups em: /home/z/my-project/backups/
```

---

## 🛠️ STACK TECNOLÓGICA

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS
- **Componentes UI:** shadcn/ui
- **Ícones:** Lucide React

### Backend
- **Runtime:** Node.js
- **API:** Next.js API Routes
- **ORM:** Prisma
- **Banco:** PostgreSQL (Neon)

### Bibliotecas Principais
- `qrcode` - Geração de QR Codes
- `next-auth` - Autenticação (se aplicável)
- `@prisma/client` - Cliente do banco
- `zod` - Validação de dados

### Integrações
- **Mercado Pago** - Pagamentos (REMOVIDO do sistema)
- **WhatsApp** - Envio de pedidos via link wa.me

---

## 📐 ARQUITETURA DO SISTEMA

### Sistema Multi-Tenant
O sistema é multi-tenant, onde cada loja tem seus dados isolados:

```
┌─────────────────────────────────────────────────────────────┐
│                      SUPERADMIN                              │
│  - Gerencia todas as lojas                                   │
│  - Configurações globais                                     │
│  - Planos e assinaturas                                      │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│    LOJA A     │    │    LOJA B     │    │    LOJA C     │
│  - OS         │    │  - OS         │    │  - OS         │
│  - Clientes   │    │  - Clientes   │    │  - Clientes   │
│  - PDV        │    │  - PDV        │    │  - PDV        │
│  - Produtos   │    │  - Produtos   │    │  - Produtos   │
└───────────────┘    └───────────────┘    └───────────────┘
```

### Estrutura de URLs
```
/                           → Landing page
/criar-loja                 → Criar nova loja
/loja/[slug]                → Página pública da loja
/loja/[slug]/catalogo       → Catálogo de produtos (NOVO)
/os/[id]                    → Página pública da OS (cliente)
/login-simples              → Login

/painel                     → Dashboard da loja
/painel/os                  → Lista de OS
/painel/os/[id]             → Detalhes da OS
/painel/os/nova             → Nova OS
/painel/clientes            → Clientes
/painel/pdv                 → PDV
/painel/pdv/produtos        → Produtos PDV
/painel/pdv/vendas          → Vendas PDV
/painel/pdv/categorias      → Categorias PDV
/painel/configuracoes       → Configurações da loja
/painel/relatorios          → Relatórios

/superadmin                 → Dashboard admin
/superadmin/lojas           → Gerenciar lojas
/superadmin/faturas         → Faturas
/superadmin/trials          → Trials

/técnico                    → Painel do técnico (login separado)
/técnico/os/[id]            → OS do técnico
```

---

## 📁 ESTRUTURA DE ARQUIVOS PRINCIPAL

```
/home/z/my-project/
├── prisma/
│   └── schema.prisma          # Schema do banco de dados
├── src/
│   ├── app/
│   │   ├── api/               # API Routes
│   │   │   ├── auth/          # Autenticação
│   │   │   ├── os/            # APIs de OS
│   │   │   ├── painel/        # APIs do painel
│   │   │   ├── superadmin/    # APIs admin
│   │   │   ├── catalogo/      # API do catálogo (CRIAR)
│   │   │   └── webhooks/      # Webhooks
│   │   ├── os/[id]/           # Página pública da OS
│   │   ├── loja/[slug]/       # Páginas da loja
│   │   │   └── catalogo/      # Catálogo (CRIAR)
│   │   ├── painel/            # Painel da loja
│   │   │   ├── os/            # Ordens de serviço
│   │   │   ├── pdv/           # PDV
│   │   │   ├── clientes/      # Clientes
│   │   │   ├── configuracoes/ # Configurações
│   │   │   └── relatorios/    # Relatórios
│   │   ├── superadmin/        # Painel admin
│   │   └── técnico/           # Painel do técnico
│   ├── components/            # Componentes React
│   │   ├── ui/                # shadcn/ui components
│   │   └── painel/            # Componentes do painel
│   ├── lib/                   # Utilitários
│   │   ├── db.ts              # Cliente Prisma
│   │   ├── utils.ts           # Funções utilitárias
│   │   └── pix-estatico.ts    # Geração de PIX
│   └── types/                 # Tipos TypeScript
├── backups/                   # Backups do sistema
├── download/                  # Arquivos para download
├── worklog.md                 # Log de trabalho
└── package.json               # Dependências
```

---

## 🗄️ MODELOS DO BANCO DE DADOS (Prisma Schema)

### Modelos Principais

#### Loja
```prisma
model Loja {
  id                String   @id @default(cuid())
  slug              String   @unique
  nome              String
  telefone          String?
  email             String?
  endereco          String?
  logoUrl           String?
  corPrimaria       String?  @default("#3B82F6")
  ativo             Boolean  @default(true)
  plano             String?  @default("gratis")
  trialAte          DateTime?
  
  // Relacionamentos
  usuarios          Usuario[]
  ordensServico     OrdemServico[]
  clientes          Cliente[]
  categoriasPDV     CategoriaPDV[]
  produtosPDV       ProdutoPDV[]
  vendasPDV         VendaPDV[]
  avaliacoes        Avaliacao[]
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

#### OrdemServico (OS)
```prisma
model OrdemServico {
  id                String   @id @default(cuid())
  numero            String   @unique
  clienteNome       String
  clienteTelefone   String?
  clienteEmail      String?
  descricao         String?
  status            String   @default("pendente")
  valorTotal        Decimal  @default(0)
  observacoes       String?
  assinaturaCliente String?
  fotos             String?  // JSON array de URLs
  
  lojaId            String
  loja              Loja     @relation(fields: [lojaId], references: [id])
  
  // Pagamento (REMOVIDO do sistema)
  // pagamentoId       String?
  // pagamentoStatus   String?
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

#### Cliente
```prisma
model Cliente {
  id            String   @id @default(cuid())
  nome          String
  telefone      String?
  email         String?
  endereco      String?
  
  lojaId        String
  loja          Loja     @relation(fields: [lojaId], references: [id])
  ordensServico OrdemServico[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

#### ProdutoPDV
```prisma
model ProdutoPDV {
  id            String   @id @default(cuid())
  nome          String
  descricao     String?
  preco         Decimal
  imagemUrl     String?
  ativo         Boolean  @default(true)
  
  categoriaId   String
  categoria     CategoriaPDV @relation(fields: [categoriaId], references: [id])
  
  lojaId        String
  loja          Loja     @relation(fields: [lojaId], references: [id])
  
  itensVenda    ItemVenda[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

#### CategoriaPDV
```prisma
model CategoriaPDV {
  id            String   @id @default(cuid())
  nome          String
  ativo         Boolean  @default(true)
  
  lojaId        String
  loja          Loja     @relation(fields: [lojaId], references: [id])
  
  produtos      ProdutoPDV[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

#### VendaPDV
```prisma
model VendaPDV {
  id            String   @id @default(cuid())
  total         Decimal
  formaPagamento String?
  observacoes   String?
  status        String   @default("concluida")
  
  lojaId        String
  loja          Loja     @relation(fields: [lojaId], references: [id])
  
  itens         ItemVenda[]
  
  createdAt     DateTime @default(now())
}
```

#### Usuario
```prisma
model Usuario {
  id            String   @id @default(cuid())
  nome          String
  email         String   @unique
  senha         String
  tipo          String   @default("loja") // loja, admin, tecnico
  
  lojaId        String?
  loja          Loja?    @relation(fields: [lojaId], references: [id])
  
  sessoes       Sessao[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

---

## 🔧 FUNCIONALIDADES DO SISTEMA

### 1. Ordens de Serviço (OS)

#### Criar OS
- Endpoint: `/api/painel/os` (POST)
- Gera número automático sequencial
- Valida dados do cliente
- Salva assinatura digital
- Permite múltiplas fotos

#### Página Pública da OS
- URL: `/os/[id]`
- Cliente visualiza status
- QR Code para acompanhar (usar biblioteca `qrcode`)
- Botão de impressão
- Avaliação do atendimento

#### QR Code da OS
- **IMPORTANTE:** Usar biblioteca `qrcode` com `toDataURL`
- Não usar QRCodeSVG ou API externa (problemas na impressão)
- Código correto:
```typescript
import QRCode from 'qrcode';

useEffect(() => {
  if (typeof window !== 'undefined' && osId) {
    const url = `${window.location.origin}/os/${osId}`;
    QRCode.toDataURL(url, {
      width: 150,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then(setQrCodeDataUrl)
      .catch(console.error);
  }
}, [osId]);

// No JSX:
{qrCodeDataUrl && <img src={qrCodeDataUrl} alt="QR Code" />}
```

#### Status da OS
- `pendente` - Aguardando atendimento
- `em_andamento` - Em atendimento
- `aguardando_peca` - Aguardando peças
- `concluido` - Finalizado
- `entregue` - Entregue ao cliente

### 2. PDV (Ponto de Venda)

#### Produtos
- CRUD completo
- Categorias
- Upload de imagem
- Preço e descrição
- Ativar/desativar

#### Vendas
- Adicionar produtos ao carrinho
- Calcular total automático
- Forma de pagamento
- Recibo impresso
- Histórico de vendas

#### Fechar Caixa
- Resumo do dia
- Total em dinheiro/cartão
- Relatório simples

### 3. Clientes

- Cadastro completo
- Histórico de OS
- Histórico de compras
- Busca por nome/telefone

### 4. Painel do Técnico

#### Acesso
- URL: `/tecnico`
- Login separado do painel da loja
- Permissões limitadas

#### Funcionalidades
- Ver OS atribuídas
- Atualizar status
- Adicionar observações
- Ver QR Code da OS

#### ⚠️ REMOVER: Pagamento Online
- **NÃO existe mais no sistema**
- Remover qualquer botão/seção de "Gerar PIX"
- O sistema de pagamento foi descontinuado

### 5. SuperAdmin

#### Gerenciamento de Lojas
- Criar/editar/desativar lojas
- Ver estatísticas
- Configurar trials

#### Planos
- `gratis` - Plano gratuito
- `basico` - Plano básico
- `pro` - Plano profissional

#### Trials
- 7 dias grátis para novas lojas
- Extender trial
- Remover trial

### 6. Catálogo de Produtos (NOVO - PENDENTE)

#### Funcionalidades
- Página pública em `/loja/[slug]/catalogo`
- Produtos vindos do PDV
- Carrinho com localStorage
- Envio para WhatsApp

#### Mensagem WhatsApp (SEM EMOJIS)
```
NOVO PEDIDO - [Nome da Loja]

Cliente: [Nome]
Telefone: [Telefone]

ITENS:
- 2x Produto A - R$ 50.00
- 1x Produto B - R$ 30.00

TOTAL: R$ 80.00

Observacoes: [obs ou Nenhuma]
```

---

## 📡 APIs DO SISTEMA

### Autenticação
```
POST /api/auth/login        - Login
POST /api/auth/logout       - Logout
GET  /api/auth/check        - Verificar sessão
```

### Ordens de Serviço
```
GET    /api/painel/os           - Listar OS
POST   /api/painel/os           - Criar OS
GET    /api/painel/os/[id]      - Detalhes da OS
PUT    /api/painel/os/[id]      - Atualizar OS
DELETE /api/painel/os/[id]      - Deletar OS
GET    /api/os/[id]             - OS pública (cliente)
POST   /api/os/[id]/avaliacao   - Avaliar atendimento
```

### PDV
```
GET    /api/painel/pdv/produtos     - Listar produtos
POST   /api/painel/pdv/produtos     - Criar produto
PUT    /api/painel/pdv/produtos/[id] - Atualizar produto
DELETE /api/painel/pdv/produtos/[id] - Deletar produto

GET    /api/painel/pdv/categorias   - Listar categorias
POST   /api/painel/pdv/categorias   - Criar categoria

GET    /api/painel/pdv/vendas       - Listar vendas
POST   /api/painel/pdv/vendas       - Criar venda

POST   /api/painel/pdv/caixa        - Abrir caixa
POST   /api/painel/pdv/caixa/fechar - Fechar caixa
```

### Catálogo (CRIAR)
```
GET /api/catalogo/[slug]    - Buscar produtos da loja
```

### SuperAdmin
```
GET  /api/superadmin/lojas      - Listar lojas
GET  /api/superadmin/lojas/[id] - Detalhes loja
PUT  /api/superadmin/lojas/[id] - Atualizar loja

GET  /api/superadmin/stats      - Estatísticas gerais
POST /api/superadmin/trials/ativar - Ativar trial
```

---

## 🚀 COMANDOS ÚTEIS

### Desenvolvimento
```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build de produção
npm run build

# Rodar produção
npm start
```

### Prisma
```bash
# Gerar cliente
npx prisma generate

# Sincronizar banco (Neon atualiza sozinho)
npx prisma db push

# Abrir Prisma Studio
npx prisma studio

# Ver status das migrations
npx prisma migrate status
```

### Git
```bash
# Ver status
git status

# Adicionar arquivos
git add .

# Commitar
git commit -m "Mensagem"

# Push (NUNCA usar --force)
git push origin main

# Configurar remote com token
git remote set-url origin https://TOKEN@github.com/rgdweb/osfy.git
```

### Backup
```bash
# Criar backup manual
tar -czvf backup_$(date +%Y%m%d).tar.gz src/ prisma/ package.json
```

---

## 📋 PENDÊNCIAS E TAREFAS

### URGENTE - Fazer Agora

#### 1. ✅ Remover "Pagamento Online" do Painel do Técnico
- **Arquivo:** `src/app/painel/os/[id]/client.tsx`
- **O que remover:** Seção que gera PIX/pagamento
- **Texto a procurar:** "Pagamento Online", "Gerar PIX", "Gere um PIX"
- **Status:** PENDENTE

#### 2. ✅ Corrigir QR Code na Página Pública
- **Arquivo:** `src/app/os/[id]/client.tsx`
- **Problema:** QR Code aparece em branco na impressão
- **Solução:** Usar `qrcode.toDataURL()` (mesmo método do painel técnico)
- **Status:** PENDENTE - Verificar se já está correto

#### 3. ✅ Criar Catálogo de Produtos
- **Arquivos a criar:**
  - `src/app/api/catalogo/[slug]/route.ts`
  - `src/app/loja/[slug]/catalogo/page.tsx`
- **Funcionalidades:**
  - Produtos do PDV
  - Carrinho localStorage
  - WhatsApp sem emojis
- **Status:** PENDENTE

### Melhorias Futuras

1. **Relatórios no Painel do Técnico**
   - Avaliar se necessário

2. **Sistema de Notificações**
   - WhatsApp automático para clientes

3. **App Mobile**
   - React Native para técnicos

---

## 🐛 PROBLEMAS CONHECIDOS

### 1. QR Code na Impressão
- **Problema:** Aparece em branco
- **Causa:** Usar QRCodeSVG ou API externa
- **Solução:** Usar `qrcode.toDataURL()`

### 2. Mensagem WhatsApp com Caracteres Estranhos
- **Problema:** Emojis ficam `????` em alguns celulares
- **Causa:** Codificação na URL
- **Solução:** Não usar emojis na mensagem

### 3. Ambiente de Execução Bugado
- **Problema:** Comandos retornam "error: pathspec 'main'"
- **Causa:** Configuração do shell/git
- **Solução:** Reiniciar sessão

---

## 📝 NOTAS IMPORTANTES

1. **O sistema de pagamento (Mercado Pago) foi REMOVIDO**
   - Não existe mais no sistema
   - Remover qualquer referência

2. **O QR Code deve ser gerado LOCALMENTE**
   - Usar biblioteca `qrcode`
   - Não depender de APIs externas

3. **O Vercel faz deploy AUTOMÁTICO**
   - Cuidado com push
   - Nunca usar force push

4. **O Neon sincroniza AUTOMÁTICO**
   - Usar `prisma db push`
   - Não precisar de migrations manuais

---

## 🔄 WORKFLOW DE DESENVOLVIMENTO

```
1. Fazer backup
   ↓
2. Criar/modificar arquivos
   ↓
3. Testar localmente (npm run dev)
   ↓
4. Commitar mudanças
   ↓
5. Push para GitHub
   ↓
6. Vercel faz deploy automático
   ↓
7. Testar em produção
```

---

## 📞 CONTATOS E SUPORTE

- **Desenvolvedor:** rgdweb
- **GitHub:** https://github.com/rgdweb/osfy
- **Repositório:** https://github.com/rgdweb/osfy

---

## 📄 ARQUIVOS DE REFERÊNCIA NO PROJETO

- `DOCUMENTACAO_COMPLETA.md` - Documentação técnica
- `TECNICO_COMPLETO.md` - Manual do painel técnico
- `TECOS_SISTEMA.md` - Informações do sistema
- `PLANOS-FUTUROS.md` - Roadmap
- `worklog.md` - Log de trabalho

---

> **Este arquivo deve ser usado no início de cada nova conversa para contexto completo do projeto.**
> 
> **Última atualização:** 07/04/2026
