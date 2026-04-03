# REGRAS DE TRABALHO - OSfy

## ⚠️ OBRIGATÓRIO LER ANTES DE CADA AÇÃO

### 📌 GIT E GITHUB

| Regra | Descrição |
|-------|-----------|
| **Repositório** | `rgdweb/osfy` - SEMPRE usar este repositório |
| **Branch** | `main` - NUNCA usar `master` ou outra branch |
| **Push** | SEMPRE push normal (`git push origin main`) |
| **FORCE PUSH** | ❌ **NUNCA** fazer force push! Apaga tudo! |
| **Commit automático** | Fazer commit e push ao terminar, sem perguntar |

### 📌 BANCO DE DADOS

| Regra | Descrição |
|-------|-----------|
| **Provider** | `postgresql` - NUNCA SQLite |
| **Motivo** | Vercel usa PostgreSQL (Neon) |
| **Schema** | Sempre verificar `prisma/schema.prisma` antes de mudar |
| **Migração** | Usar `--accept-data-loss` se mudar colunas |

### 📌 SISTEMA DE PAGAMENTO

| Regra | Descrição |
|-------|-----------|
| **Gateway** | Mercado Pago - Asaas foi REMOVIDO 100% |
| **Campos MP** | `mpAccessToken`, `mpPublicKey`, `mpClientId`, `mpClientSecret` |
| **Ambiente** | `sandbox` ou `producao` |

### 📌 FLUXO DE TRABALHO

1. **Antes de fazer qualquer coisa**: Ler este arquivo
2. **Verificar repositório**: `git remote -v` deve mostrar `rgdweb/osfy`
3. **Verificar branch**: `git branch` deve mostrar `* main`
4. **Fazer commit**: Mensagem clara e descritiva
5. **Fazer push**: `git push origin main` (SEM --force)
6. **Avisar usuário**: Confirmar que foi feito

### 📌 COMANDOS PROIBIDOS

```bash
# ❌ NUNCA executar:
git push --force origin main
git push -f origin main
git reset --hard origin/main
git push origin master

# ✅ SEMPRE usar:
git push origin main
```

### 📌 ESTRUTURA DO PROJETO

```
src/
├── app/
│   ├── api/
│   │   ├── webhooks/mercadopago/  # Webhook MP
│   │   ├── os/[id]/pagamento/     # API pagamentos
│   │   └── superadmin/            # APIs admin
│   ├── loja/                      # Área da loja
│   └── superadmin/                # Área admin
├── lib/
│   └── mercadoPago.ts             # Biblioteca MP
└── prisma/
    └── schema.prisma              # Schema PostgreSQL
```

### 📌 TOKEN GITHUB

```
TOKEN_REMOVIDO
```

---

**Última atualização:** 2026-03-23
**Autor:** Sistema de regras para evitar erros
