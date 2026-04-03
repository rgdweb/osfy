# TecOS - Referência Técnica Completa

> Última atualização: 2026-03-20

---

## 🎯 Visão Geral do Sistema

TecOS é um **SaaS multi-tenant** para gestão de assistências técnicas. Cada loja tem seu próprio isolamento de dados através do `lojaId`.

### Arquitetura
- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript
- **Backend**: Next.js API Routes (Serverless)
- **Banco**: PostgreSQL (Neon) + Prisma ORM
- **Auth**: JWT customizado (jose) + Cookies HTTP-only
- **Estilo**: Tailwind CSS 4 + shadcn/ui
- **Deploy**: Vercel

---

## 📂 Estrutura de Arquivos Principal

```
/home/z/my-project/
├── src/
│   ├── app/                          # App Router (páginas e APIs)
│   │   ├── api/                      # APIs REST
│   │   │   ├── auth/                 # Autenticação
│   │   │   │   ├── check/route.ts    # Verifica se usuário está logado
│   │   │   │   ├── login/route.ts    # Login de loja
│   │   │   │   ├── superadmin/route.ts # Login super admin
│   │   │   │   └── logout/route.ts   # Logout
│   │   │   │
│   │   │   ├── painel/               # APIs do painel da loja
│   │   │   │   ├── os/               # Ordens de serviço
│   │   │   │   │   ├── route.ts      # GET (lista) / POST (cria)
│   │   │   │   │   └── [id]/         # OS específica
│   │   │   │   │       ├── route.ts  # GET/PATCH/DELETE
│   │   │   │   │       └── fotos/route.ts # Upload de fotos
│   │   │   │   │
│   │   │   │   ├── clientes/route.ts # Clientes
│   │   │   │   ├── dashboard/route.ts # Estatísticas
│   │   │   │   ├── configuracoes/route.ts # Configs da loja
│   │   │   │   ├── gerar-cobranca/route.ts # Cobranças Asaas
│   │   │   │   ├── status-pagamento/route.ts # Status financeiro
│   │   │   │   │
│   │   │   │   ├── pdv/              # Ponto de Venda
│   │   │   │   │   ├── produtos/     # Produtos
│   │   │   │   │   │   ├── route.ts  # GET/POST
│   │   │   │   │   │   └── [id]/route.ts # PUT/DELETE
│   │   │   │   │   ├── categorias/   # Categorias
│   │   │   │   │   ├── vendas/       # Vendas
│   │   │   │   │   └── caixa/        # Controle de caixa
│   │   │   │   │       ├── route.ts  # Abrir caixa
│   │   │   │   │       └── fechar/route.ts
│   │   │   │   │
│   │   │   │   └── upload/route.ts   # Upload de imagens
│   │   │   │
│   │   │   ├── superadmin/           # APIs do super admin
│   │   │   │   ├── lojas/            # Gerenciar lojas
│   │   │   │   │   ├── route.ts      # GET/POST
│   │   │   │   │   └── [id]/route.ts # GET/DELETE
│   │   │   │   ├── faturas/route.ts  # Faturas
│   │   │   │   ├── stats/route.ts    # Estatísticas globais
│   │   │   │   └── configuracoes/    # Configs do sistema
│   │   │   │
│   │   │   ├── lojas/route.ts        # Cadastro de novas lojas
│   │   │   └── os/consultar/route.ts # Consulta pública de OS
│   │   │
│   │   ├── painel/                   # Páginas do painel
│   │   │   ├── page.tsx              # Dashboard
│   │   │   ├── layout.tsx            # Layout com sidebar
│   │   │   ├── perfil/page.tsx       # Perfil da loja
│   │   │   ├── configuracoes/page.tsx
│   │   │   ├── clientes/page.tsx
│   │   │   ├── os/
│   │   │   │   ├── page.tsx          # Lista de OS
│   │   │   │   ├── nova/page.tsx     # Nova OS
│   │   │   │   └── [id]/             # Detalhes
│   │   │   │       ├── page.tsx      # Server component
│   │   │   │       └── client.tsx    # Client component
│   │   │   └── pdv/
│   │   │       ├── page.tsx          # Frente de caixa
│   │   │       ├── produtos/page.tsx # Gerenciar produtos
│   │   │       ├── vendas/page.tsx   # Histórico vendas
│   │   │       ├── categorias/page.tsx
│   │   │       └── recibo/[id]/page.tsx
│   │   │
│   │   ├── superadmin/               # Painel super admin
│   │   │   ├── page.tsx              # Dashboard
│   │   │   ├── layout.tsx
│   │   │   ├── lojas/page.tsx
│   │   │   ├── faturas/page.tsx
│   │   │   └── login/page.tsx
│   │   │
│   │   ├── loja/[slug]/              # Página pública da loja
│   │   │   ├── page.tsx              # Server component
│   │   │   └── client.tsx            # Client component
│   │   │
│   │   └── os/[id]/                  # Página pública da OS
│   │       ├── page.tsx
│   │       └── client.tsx
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   └── ... (outros)
│   │   │
│   │   └── painel/
│   │       ├── UploadImagem.tsx      # Componente de upload
│   │       ├── AvisoPagamento.tsx    # Aviso de fatura
│   │       └── Sidebar.tsx           # Menu lateral
│   │
│   ├── lib/
│   │   ├── auth/
│   │   │   └── auth.ts               # Sistema de autenticação JWT
│   │   ├── db.ts                     # Cliente Prisma singleton
│   │   ├── upload.ts                 # Utilitários de upload
│   │   └── utils.ts                  # Funções utilitárias
│   │
│   └── types/
│       └── index.ts                  # Tipos TypeScript
│
├── prisma/
│   ├── schema.prisma                 # Schema do banco
│   └── seed.ts                       # Dados iniciais
│
├── DOCUMENTACAO_COMPLETA.md          # Documentação geral
├── TECNICO_COMPLETO.md               # Este arquivo
└── package.json
```

---

## 🔐 Sistema de Autenticação

### Arquivo: `src/lib/auth/auth.ts`

#### Funções Principais:

```typescript
// Tipos de usuário
type UserType = 'loja' | 'usuario' | 'superadmin'

interface AuthUser {
  id: string
  tipo: UserType
  lojaId?: string
  nome: string
  email: string
}

// Hash de senha
async function hashPassword(password: string): Promise<string>

// Verificar senha
async function verifyPassword(password: string, hash: string): Promise<boolean>

// Gerar token JWT (validade: 7 dias)
async function generateToken(user: AuthUser): Promise<string>

// Verificar token JWT
async function verifyToken(token: string): Promise<AuthUser | null>

// Login de loja
async function loginLoja(email: string, senha: string): Promise<{ success: boolean; token?: string; error?: string }>

// Login de usuário (técnico)
async function loginUsuario(email: string, senha: string, lojaSlug: string): Promise<{...}>

// Login de super admin
async function loginSuperAdmin(email: string, senha: string): Promise<{...}>

// Obter usuário atual (lê do cookie)
async function getCurrentUser(): Promise<AuthUser | null>

// Gerar slug único
function generateSlug(nome: string): string
async function generateUniqueSlug(nome: string): Promise<string>
```

#### Cookie:
- Nome: `tecos-token`
- Tipo: HTTP-only
- Validade: 7 dias

---

## 🗄️ Schema do Prisma

### Arquivo: `prisma/schema.prisma`

#### Modelos:

```prisma
model SuperAdmin {
  id           String   @id @default(cuid())
  nome         String
  email        String   @unique
  senhaHash    String
  criadoEm     DateTime @default(now())
  atualizadoEm DateTime @updatedAt
}

model Loja {
  id                 String         @id @default(cuid())
  nome               String
  slug               String         @unique
  responsavel        String
  telefone           String
  whatsapp           String
  email              String         @unique
  senhaHash          String
  cidade             String
  estado             String
  endereco           String
  descricao          String?
  logo               String?
  horarioAtendimento String?
  tiposServico       String?
  status             String         @default("pendente") // pendente, ativa, bloqueada
  plano              String         @default("basico")
  precoPlano         Float          @default(99.90)
  trialAte           DateTime?
  trialUsado         Boolean        @default(false)
  asaasCustomerId    String?        // ID do customer no Asaas
  
  // Relacionamentos
  clientes           Cliente[]
  ordens             OrdemServico[]
  usuarios           Usuario[]
  categorias         Categoria[]
  produtos           Produto[]
  vendas             Venda[]
  caixas             Caixa[]
  faturas            Fatura[]
}

model Usuario {
  id           String         @id @default(cuid())
  lojaId       String
  nome         String
  email        String
  senhaHash    String
  foto         String?
  tipo         String         @default("tecnico") // admin, tecnico
  ativo        Boolean        @default(true)
  criadoEm     DateTime       @default(now())
  atualizadoEm DateTime       @updatedAt
  
  ordens       OrdemServico[]
  loja         Loja           @relation(...)
  
  @@unique([lojaId, email])
}

model Cliente {
  id           String         @id @default(cuid())
  lojaId       String
  nome         String
  telefone     String
  email        String?
  cpf          String?        // NOVO
  endereco     String?        // NOVO
  criadoEm     DateTime       @default(now())
  atualizadoEm DateTime       @updatedAt
  
  loja         Loja           @relation(...)
  ordens       OrdemServico[]

  @@unique([lojaId, telefone])
}

model OrdemServico {
  id              String        @id @default(cuid())
  lojaId          String
  clienteId       String
  tecnicoId       String?
  numeroOs        Int
  equipamento     String
  marca           String?
  modelo          String?
  imeiSerial      String?
  senhaAparelho   String?
  problema        String
  acessorios      String?
  estadoAparelho  String?
  diagnostico     String?
  solucao         String?
  status          String        @default("recebido")
  orcamento       Float?
  aprovado        Boolean?
  dataAprovacao   DateTime?
  valorServico    Float?
  valorPecas      Float?
  valorTotal      Float?
  pago            Boolean       @default(false)
  formaPagamento  String?
  dataPagamento   DateTime?
  dataCriacao     DateTime      @default(now())
  dataPrevisao    DateTime?
  dataFinalizacao DateTime?
  atualizadoEm    DateTime      @updatedAt
  
  assinatura      Assinatura?
  fotos           FotoOS[]
  historico       HistoricoOS[]
  tecnico         Usuario?      @relation(...)
  cliente         Cliente       @relation(...)
  loja            Loja          @relation(...)

  @@unique([lojaId, numeroOs])
}

model HistoricoOS {
  id        String       @id @default(cuid())
  osId      String
  descricao String
  status    String?
  criadoEm  DateTime     @default(now())
  ordem     OrdemServico @relation(...)
}

model FotoOS {
  id        String       @id @default(cuid())
  osId      String
  arquivo   String
  descricao String?
  tipo      String       @default("recebimento")
  criadoEm  DateTime     @default(now())
  ordem     OrdemServico @relation(...)
}

model Assinatura {
  id       String       @id @default(cuid())
  osId     String       @unique
  imagem   String
  nome     String?
  criadoEm DateTime     @default(now())
  ordem    OrdemServico @relation(...)
}

// PDV
model Categoria {
  id           String    @id @default(cuid())
  lojaId       String
  nome         String
  descricao    String?
  ativo        Boolean   @default(true)
  criadoEm     DateTime  @default(now())
  atualizadoEm DateTime  @updatedAt
  
  loja         Loja      @relation(...)
  produtos     Produto[]

  @@unique([lojaId, nome])
}

model Produto {
  id                      String    @id @default(cuid())
  lojaId                  String
  categoriaId             String?
  codigoBarras            String?   @unique
  codigoInterno           String?
  nome                    String
  descricao               String?
  precoCusto              Float?
  precoVenda              Float
  estoque                 Int       @default(0)
  estoqueMinimo           Int       @default(0)
  unidade                 String    @default("UN")
  localizacao             String?
  ativo                   Boolean   @default(true)
  permiteVendaSemEstoque  Boolean   @default(true)
  imagem                  String?
  criadoEm                DateTime  @default(now())
  atualizadoEm            DateTime  @updatedAt
  
  loja         Loja       @relation(...)
  categoria    Categoria? @relation(...)
  itensVenda   ItemVenda[]

  @@unique([lojaId, codigoInterno])
  @@index([codigoBarras])
}

model Caixa {
  id                String    @id @default(cuid())
  lojaId            String
  usuarioAbertura   String
  usuarioFechamento String?
  saldoInicial      Float
  saldoFinal        Float?
  totalVendas       Float     @default(0)
  totalDinheiro     Float     @default(0)
  totalPix          Float     @default(0)
  totalCartaoCredito Float   @default(0)
  totalCartaoDebito Float     @default(0)
  totalOutros       Float     @default(0)
  totalSangrias     Float     @default(0)
  totalReforcos     Float     @default(0)
  status            String    @default("aberto")
  observacaoAbertura String?
  observacaoFechamento String?
  dataAbertura      DateTime  @default(now())
  dataFechamento    DateTime?
  criadoEm          DateTime  @default(now())
  atualizadoEm      DateTime  @updatedAt
  
  loja          Loja              @relation(...)
  vendas        Venda[]
  movimentacoes MovimentacaoCaixa[]

  @@index([lojaId, status])
}

model Venda {
  id             String    @id @default(cuid())
  lojaId         String
  caixaId        String
  numeroVenda    Int
  clienteNome    String?
  clienteCpf     String?
  subtotal       Float
  desconto       Float     @default(0)
  total          Float
  formaPagamento String
  valorPago      Float?
  troco          Float?
  status         String    @default("concluida")
  observacao     String?
  tipo           String    @default("produto")
  dataVenda      DateTime  @default(now())
  criadoEm       DateTime  @default(now())
  atualizadoEm   DateTime  @updatedAt
  
  loja    Loja       @relation(...)
  caixa   Caixa      @relation(...)
  itens   ItemVenda[]

  @@unique([lojaId, numeroVenda])
  @@index([lojaId, dataVenda])
}

model ItemVenda {
  id            String   @id @default(cuid())
  vendaId       String
  produtoId     String?
  codigoBarras  String?
  descricao     String
  quantidade    Int
  precoUnitario Float
  desconto      Float    @default(0)
  total         Float
  tipo          String   @default("produto")
  observacao    String?
  criadoEm      DateTime @default(now())
  
  venda    Venda    @relation(...)
  produto  Produto? @relation(...)

  @@index([vendaId])
}

model MovimentacaoCaixa {
  id              String   @id @default(cuid())
  caixaId         String
  tipo            String   // sangria, reforco
  valor           Float
  descricao       String
  formaPagamento  String?
  criadoEm        DateTime @default(now())
  caixa           Caixa    @relation(...)

  @@index([caixaId])
}

// Faturas/Cobranças
model Fatura {
  id             String    @id @default(cuid())
  lojaId         String
  numeroFatura   Int
  valor          Float
  status         String    @default("pendente")
  formaPagamento String?
  
  asaasId        String?
  asaasCustomerId String?
  codigoPix      String?
  qrCodePix      String?
  linkBoleto     String?
  codigoBoleto   String?
  linkPagamento  String?
  
  dataVencimento DateTime
  dataPagamento  DateTime?
  dataCriacao    DateTime  @default(now())
  dataLembrete   DateTime?
  atualizadoEm   DateTime  @updatedAt
  
  referencia     String?
  observacao     String?
  
  loja           Loja      @relation(...)

  @@unique([lojaId, numeroFatura])
  @@index([lojaId, status])
  @@index([lojaId, dataVencimento])
  @@index([status, dataVencimento])
}

model Configuracao {
  id           String   @id @default(cuid())
  chave        String   @unique
  valor        String
  descricao    String?
  atualizadoEm DateTime @updatedAt

  @@index([chave])
}

model ContadorOS {
  id           String   @id @default(cuid())
  lojaId       String   @unique
  ultimoNumero Int      @default(0)
  atualizadoEm DateTime @updatedAt
}

model ConfiguracaoPagamento {
  id                    String   @id @default(cuid())
  asaasApiKey           String?
  asaasAmbiente         String   @default("sandbox")
  chavePix              String?
  tipoChavePix          String?
  nomeRecebedor         String?
  valorMensalidade      Float    @default(29.90)
  valorAnuidade         Float    @default(290.00)
  diaVencimento         Int      @default(10)
  diasBloqueio         Int      @default(20)
  diasTolerancia        Int      @default(3)
  webhookSecret         String?
  ativo                 Boolean  @default(false)
  atualizadoEm          DateTime @updatedAt
}
```

---

## 📡 APIs REST

### Autenticação

#### POST `/api/auth/login`
Login de loja
```json
// Request
{ "email": "loja@email.com", "senha": "123456" }

// Response
{ "success": true, "token": "jwt..." }
// ou
{ "success": false, "error": "mensagem" }
```

#### POST `/api/auth/superadmin`
Login do super admin
```json
{ "email": "admin@email.com", "senha": "senha" }
```

#### GET `/api/auth/check`
Verifica se usuário está logado
```json
// Response
{
  "authenticated": true,
  "user": { "id": "...", "tipo": "loja", "lojaId": "...", "nome": "...", "email": "..." }
}
```

#### POST `/api/auth/logout`
Faz logout (limpa cookie)

---

### APIs do Painel da Loja

#### GET `/api/painel/dashboard`
Estatísticas do dashboard
```json
{
  "success": true,
  "stats": {
    "totalOs": 50,
    "osAbertas": 10,
    "osEmManutencao": 5,
    "osAguardandoPeca": 3,
    "osProntas": 8,
    "osEntregues": 24,
    "clientesCount": 30,
    "faturamentoMes": 5000.00,
    "produtosCount": 100,
    "vendasHoje": 15,
    "totalVendasHoje": 1500.00,
    "caixaAberto": true
  },
  "ultimasOs": [...]
}
```

#### GET `/api/painel/os`
Lista ordens de serviço
- Query params: `status`, `busca`

#### POST `/api/painel/os`
Cria nova OS
```json
{
  "clienteNome": "João",
  "clienteTelefone": "11999999999",
  "clienteEmail": "joao@email.com",
  "equipamento": "iPhone 13",
  "marca": "Apple",
  "modelo": "iPhone 13",
  "imeiSerial": "123456789",
  "senhaAparelho": "1234",
  "problema": "Tela quebrada",
  "acessorios": "Carregador, capa",
  "estadoAparelho": "Arranhado na lateral",
  "dataPrevisao": "2026-03-25"
}
```

#### GET/PATCH/DELETE `/api/painel/os/[id]`
Busca, atualiza ou deleta OS específica

#### POST `/api/painel/os/[id]/fotos`
Adiciona foto à OS

#### GET `/api/painel/clientes`
Lista clientes

#### GET/POST `/api/painel/pdv/produtos`
Lista ou cria produtos

#### PUT/DELETE `/api/painel/pdv/produtos/[id]`
Atualiza ou deleta produto

#### GET/POST `/api/painel/pdv/categorias`
Lista ou cria categorias

#### GET/POST `/api/painel/pdv/vendas`
Lista ou cria vendas

#### GET/POST `/api/painel/pdv/caixa`
Lista ou abre caixa

#### POST `/api/painel/pdv/caixa/fechar`
Fecha caixa

#### POST `/api/painel/upload`
Upload de imagem
```multipart
FormData:
- arquivo: File
- tipo: "logo" | "produto" | "os" | "banner" | "usuario"
- lojaId: string
```

#### DELETE `/api/painel/upload`
Remove imagem
```json
{ "lojaId": "...", "arquivo": "nome.jpg", "tipo": "produto" }
```

---

### APIs do Super Admin

#### GET/POST `/api/superadmin/lojas`
Lista ou cria lojas

#### GET/DELETE `/api/superadmin/lojas/[id]`
Busca ou deleta loja específica

#### GET `/api/superadmin/stats`
Estatísticas globais

#### GET/POST `/api/superadmin/faturas`
Lista ou cria faturas

---

### APIs Públicas

#### GET `/api/lojas/[slug]`
Busca loja pelo slug (página pública)

#### GET `/api/os/consultar`
Consulta OS por número
- Query params: `lojaId`, `numeroOs`

---

## 🖼️ Sistema de Upload

### Fluxo:
1. Frontend envia arquivo para `/api/painel/upload`
2. API valida tipo e tamanho
3. API encaminha para servidor PHP externo
4. Servidor PHP salva em pasta organizada
5. URL da imagem é retornada

### Servidor PHP:
- **URL**: `https://sorteiomax.com.br/tecos-uploads/upload.php`
- **Delete**: `https://sorteiomax.com.br/tecos-uploads/delete.php`
- **API Key**: `a8f7d9e2b4c1m6n3p5q0r9s2t8u1v4w7`

### Estrutura de pastas:
```
tecos-uploads/
├── {lojaId}/
│   ├── logo/
│   ├── produto/
│   ├── os/
│   └── usuario/
```

### Tipos permitidos:
- JPEG, PNG, GIF, WebP
- Máximo: 10MB

---

## 🎨 Componentes Importantes

### UploadImagem (`src/components/painel/UploadImagem.tsx`)
```tsx
<UploadImagem
  valorAtual={urlOuNull}
  onUpload={(url) => setUrl(url)}
  onRemover={() => setUrl(null)}
  tipo="produto"
  lojaId="cuid..."
  label="Imagem do Produto"
  tamanhoPreview={120}
/>
```

### AvisoPagamento (`src/components/painel/AvisoPagamento.tsx`)
Mostra aviso de trial ou pagamento pendente no topo do painel.

---

## ⚙️ Configurações

### Variáveis de Ambiente (Vercel):
```
DATABASE_URL=postgresql://...
JWT_SECRET=tecos-secret-key-super-segura-2024
UPLOAD_SERVER_URL=https://sorteiomax.com.br/tecos-uploads/upload.php
UPLOAD_DELETE_URL=https://sorteiomax.com.br/tecos-uploads/delete.php
UPLOAD_API_KEY=a8f7d9e2b4c1m6n3p5q0r9s2t8u1v4w7
```

### Build Automático:
```json
// package.json
{
  "scripts": {
    "build": "prisma generate && prisma db push --accept-data-loss && next build",
    "postinstall": "prisma generate"
  }
}
```

---

## 🔧 Problemas Conhecidos

1. **Imagem não aparece (INVALID_IMAGE_OPTIMIZE_REQUEST)**
   - Solução: Usar `<img>` HTML normal em vez de `<Image>` do Next.js para imagens externas

2. **Branch errado (master vs main)**
   - Solução: Sempre usar `git push origin main`

3. **Dados não aparecem nas listagens**
   - Causa: Schema atualizado mas banco sem novos campos
   - Solução: Usar `select` com campos específicos ou aguardar build aplicar migração

---

## 📞 Contato

- **Desenvolvedor**: rgdweb
- **GitHub**: https://github.com/rgdweb
- **Token GitHub**: (veja com o desenvolvedor)

---

*Este arquivo contém todas as informações técnicas necessárias para manter e expandir o sistema TecOS.*
