# TecOS - Sistema de Backup e Avaliações

## 📁 Scripts de Backup

### Arquivos criados:

```
scripts-backup/
├── backup.php       # Executa backup diário
├── restaurar.php    # Restaura um backup específico
├── estatisticas.php # Mostra uso de disco
└── README.md        # Este arquivo
```

### 🚀 Como configurar no seu servidor (sorteiomax.com.br):

1. **Copiar arquivos** para `sorteiomax.com.br/tecos-uploads/scripts/`

2. **Criar diretórios**:
```bash
mkdir -p /caminho/tecos-uploads/backups
chmod 755 /caminho/tecos-uploads/backups
```

3. **Configurar CRON** (backup diário às 3h da manhã):
```bash
crontab -e
```
Adicionar:
```
0 3 * * * php /caminho/tecos-uploads/scripts/backup.php
```

4. **Testar backup manual**:
```bash
php backup.php
```

### 📊 Ver estatísticas:

Acesse: `https://sorteiomax.com.br/tecos-uploads/scripts/estatisticas.php?key=SUA_CHAVE`

### 🔄 Restaurar backup:

```bash
curl -X POST "https://sorteiomax.com.br/tecos-uploads/scripts/restaurar.php?key=SUA_CHAVE" \
  -H "Content-Type: application/json" \
  -d '{"loja_id":"ID_DA_LOJA","arquivo":"backup_2026-03-21_030000.json","confirmar":true}'
```

---

## ⭐ Sistema de Avaliações

### Como funciona:

1. **Cliente assina a OS** na página pública
2. **Botão aparece** para avaliar o atendimento
3. **Cliente clica** em "Avaliar Atendimento"
4. **Seleciona estrelas** (1 a 5) e pode comentar
5. **Avaliação salva** e loja recebe notificação

### No painel da loja:

- Ver todas as avaliações recebidas
- Média de estrelas
- Distribuição por nota
- Responder avaliações

### API disponível:

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/os/[id]/avaliacao` | Buscar avaliação de uma OS |
| POST | `/api/os/[id]/avaliacao` | Criar avaliação |
| GET | `/api/painel/avaliacoes` | Listar avaliações da loja |
| PATCH | `/api/painel/avaliacoes/[id]` | Responder avaliação |

---

## 🔐 Segurança

- **API Key**: `a8f7d9e2b4c1m6n3p5q0r9s2t8u1v4w7`
- **Mude esta chave** para algo único seu
- **Nunca commit** a chave no GitHub
- **Use HTTPS** sempre

---

## ⚠️ IMPORTANTE

1. **Backups não substituem o banco Neon** - os dados continuam lá
2. **Backup é uma CÓPIA** para segurança extra
3. **Execute o backup** pelo menos uma vez por dia
4. **Teste a restauração** periodicamente

---

*Última atualização: Março 2026*
