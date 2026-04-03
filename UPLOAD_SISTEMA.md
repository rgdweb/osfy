# TecOS - Sistema de Upload de Imagens

## 🗂️ Estrutura de Pastas no Servidor

```
sorteiomax.com.br/tecos-uploads/
├── upload.php              # Recebe upload de imagens
├── delete.php              # Deleta imagens
├── scripts/                # Scripts de backup (adicionados)
│   ├── backup.php
│   ├── restaurar.php
│   └── estatisticas.php
├── backups/                # Backups do banco (adicionado)
└── uploads/                # Imagens do sistema
    └── {lojaId}/           # Uma pasta por loja
        ├── logo/           # Logo da loja
        ├── os/             # Fotos das OS
        ├── produto/        # Fotos de produtos (PDV)
        ├── banner/         # Banners da loja
        └── usuario/        # Foto de perfil do usuário
```

## 🔗 URLs Importantes

| Função | URL |
|--------|-----|
| Upload | `https://sorteiomax.com.br/tecos-uploads/upload.php` |
| Delete | `https://sorteiomax.com.br/tecos-uploads/delete.php` |
| Estatísticas | `https://sorteiomax.com.br/tecos-uploads/scripts/estatisticas.php` |

## 🔐 Autenticação

**API Key**: `a8f7d9e2b4c1m6n3p5q0r9s2t8u1v4w7`

Envie no header:
```
Authorization: Bearer a8f7d9e2b4c1m6n3p5q0r9s2t8u1v4w7
```

## 📤 API de Upload

### Requisição POST para upload.php:

```javascript
const formData = new FormData();
formData.append('arquivo', file);      // Arquivo de imagem
formData.append('lojaId', 'id_da_loja');
formData.append('tipo', 'os');         // logo, os, produto, banner, usuario

fetch('https://sorteiomax.com.br/tecos-uploads/upload.php', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer a8f7d9e2b4c1m6n3p5q0r9s2t8u1v4w7'
  },
  body: formData
});
```

### Resposta de sucesso:
```json
{
  "sucesso": true,
  "url": "https://sorteiomax.com.br/tecos-uploads/uploads/abc123/os/foto_123.jpg",
  "arquivo": "foto_123.jpg"
}
```

## 📥 API de Delete

### Requisição POST para delete.php:

```javascript
fetch('https://sorteiomax.com.br/tecos-uploads/delete.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer a8f7d9e2b4c1m6n3p5q0r9s2t8u1v4w7'
  },
  body: JSON.stringify({
    lojaId: 'id_da_loja',
    arquivo: 'foto_123.jpg',
    tipo: 'os'
  })
});
```

## 🖼️ Tipos de Upload

| Tipo | Descrição | Usado em |
|------|-----------|----------|
| `logo` | Logo da loja | Perfil da loja |
| `os` | Fotos da OS | Fotos do aparelho |
| `produto` | Foto do produto | Cadastro PDV |
| `banner` | Banner promocional | Página da loja |
| `usuario` | Foto de perfil | Perfil do usuário |

## ⚙️ Validações no Backend

- **Formatos**: JPEG, PNG, GIF, WEBP
- **Tamanho máximo**: 10MB
- **Permissão**: Usuário deve pertencer à loja

## 🔄 Fluxo de Upload

```
1. Usuário seleciona imagem no TecOS
2. TecOS envia para /api/painel/upload
3. API valida permissões
4. API encaminha para servidor externo (sorteiomax.com.br)
5. Servidor salva em uploads/{lojaId}/{tipo}/
6. URL da imagem é retornada e salva no banco
```

## 🖥️ Código PHP do Servidor (exemplo)

### upload.php:

```php
<?php
header('Content-Type: application/json');

define('API_KEY', 'a8f7d9e2b4c1m6n3p5q0r9s2t8u1v4w7');
define('UPLOAD_DIR', __DIR__ . '/uploads');

// Validar chave
$headers = getallheaders();
$auth = $headers['Authorization'] ?? '';
if (!preg_match('/Bearer\s+(.+)/', $auth, $m) || $m[1] !== API_KEY) {
    echo json_encode(['sucesso' => false, 'erro' => 'Não autorizado']);
    exit;
}

// Receber dados
$arquivo = $_FILES['arquivo'] ?? null;
$lojaId = $_POST['lojaId'] ?? '';
$tipo = $_POST['tipo'] ?? '';

if (!$arquivo || !$lojaId || !$tipo) {
    echo json_encode(['sucesso' => false, 'erro' => 'Dados incompletos']);
    exit;
}

// Validar tipo
$tiposPermitidos = ['logo', 'os', 'produto', 'banner', 'usuario'];
if (!in_array($tipo, $tiposPermitidos)) {
    echo json_encode(['sucesso' => false, 'erro' => 'Tipo inválido']);
    exit;
}

// Validar arquivo
$extensoes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
$ext = strtolower(pathinfo($arquivo['name'], PATHINFO_EXTENSION));
if (!in_array($ext, $extensoes)) {
    echo json_encode(['sucesso' => false, 'erro' => 'Formato não permitido']);
    exit;
}

if ($arquivo['size'] > 10 * 1024 * 1024) {
    echo json_encode(['sucesso' => false, 'erro' => 'Arquivo muito grande (máx 10MB)']);
    exit;
}

// Criar diretório
$dir = UPLOAD_DIR . "/$lojaId/$tipo";
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

// Gerar nome único
$nomeArquivo = uniqid() . '_' . preg_replace('/[^a-zA-Z0-9.]/', '', $arquivo['name']);
$caminho = "$dir/$nomeArquivo";

// Mover arquivo
if (move_uploaded_file($arquivo['tmp_name'], $caminho)) {
    $url = "https://sorteiomax.com.br/tecos-uploads/uploads/$lojaId/$tipo/$nomeArquivo";
    echo json_encode([
        'sucesso' => true,
        'url' => $url,
        'arquivo' => $nomeArquivo
    ]);
} else {
    echo json_encode(['sucesso' => false, 'erro' => 'Erro ao salvar arquivo']);
}
```

### delete.php:

```php
<?php
header('Content-Type: application/json');

define('API_KEY', 'a8f7d9e2b4c1m6n3p5q0r9s2t8u1v4w7');
define('UPLOAD_DIR', __DIR__ . '/uploads');

// Validar chave
$headers = getallheaders();
$auth = $headers['Authorization'] ?? '';
if (!preg_match('/Bearer\s+(.+)/', $auth, $m) || $m[1] !== API_KEY) {
    echo json_encode(['sucesso' => false, 'erro' => 'Não autorizado']);
    exit;
}

// Receber dados
$input = json_decode(file_get_contents('php://input'), true);
$lojaId = $input['lojaId'] ?? '';
$arquivo = $input['arquivo'] ?? '';
$tipo = $input['tipo'] ?? '';

if (!$lojaId || !$arquivo) {
    echo json_encode(['sucesso' => false, 'erro' => 'Dados incompletos']);
    exit;
}

// Montar caminho
$caminho = UPLOAD_DIR . "/$lojaId/$tipo/$arquivo";

// Verificar se arquivo existe
if (!file_exists($caminho)) {
    echo json_encode(['sucesso' => false, 'erro' => 'Arquivo não encontrado']);
    exit;
}

// Deletar
if (unlink($caminho)) {
    echo json_encode(['sucesso' => true]);
} else {
    echo json_encode(['sucesso' => false, 'erro' => 'Erro ao deletar']);
}
```

## 🔒 Segurança

1. **Sempre use HTTPS**
2. **Nunca exponha a API Key no frontend**
3. **Valide o tipo de arquivo no servidor**
4. **Limite o tamanho máximo**
5. **Use nomes únicos para evitar sobrescrita**

---

*Última atualização: Março 2026*
