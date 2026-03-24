<?php
/**
 * TecOS - Script de Backup Automático
 * 
 * Este script deve ser colocado no servidor de hospedagem (sorteiomax.com.br/tecos-uploads/)
 * e executado via cron job diariamente.
 * 
 * CRON: 0 3 * * * php /caminho/tecos-uploads/scripts/backup.php
 */

header('Content-Type: application/json');

// ============================================
// CONFIGURAÇÕES - EDITE AQUI
// ============================================

// Chave de API para segurança
define('API_KEY', 'a8f7d9e2b4c1m6n3p5q0r9s2t8u1v4w7');

// URL do TecOS (onde está o banco Neon)
define('TECOS_API_URL', 'https://tec-os.vercel.app/api/backup/export');

// Diretório onde os backups serão salvos
define('BACKUP_DIR', __DIR__ . '/../backups');

// Dias para manter backups (antigos serão deletados)
define('DIAS_RETENCAO', 30);

// Email para notificar em caso de erro (opcional)
define('ADMIN_EMAIL', '');

// ============================================
// FUNÇÕES
// ============================================

function responder($sucesso, $mensagem, $dados = []) {
    echo json_encode([
        'sucesso' => $sucesso,
        'mensagem' => $mensagem,
        'timestamp' => date('Y-m-d H:i:s'),
        'dados' => $dados
    ]);
    exit;
}

function criarDiretorio($dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

function logErro($mensagem) {
    $logFile = BACKUP_DIR . '/erros.log';
    $data = date('Y-m-d H:i:s') . " - " . $mensagem . "\n";
    file_put_contents($logFile, $data, FILE_APPEND);
}

// ============================================
// VALIDAÇÃO
// ============================================

// Verificar chave de API (se passado via parâmetro)
$chaveRecebida = $_GET['key'] ?? $_SERVER['HTTP_X_API_KEY'] ?? '';
if ($chaveRecebida && $chaveRecebida !== API_KEY) {
    responder(false, 'Chave de API inválida');
}

// ============================================
// EXECUÇÃO
// ============================================

try {
    // Criar diretório de backups
    criarDiretorio(BACKUP_DIR);
    
    // Data atual para nome do arquivo
    $dataAtual = date('Y-m-d_His');
    
    // Chamar API do TecOS para exportar dados
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => TECOS_API_URL . '?key=' . API_KEY,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 300,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    
    $resposta = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $erro = curl_error($ch);
    curl_close($ch);
    
    if ($erro) {
        throw new Exception("Erro ao conectar com TecOS: " . $erro);
    }
    
    if ($httpCode !== 200) {
        throw new Exception("API retornou erro HTTP $httpCode");
    }
    
    $dados = json_decode($resposta, true);
    if (!$dados || !$dados['sucesso']) {
        throw new Exception("Resposta inválida da API: " . ($dados['erro'] ?? 'Erro desconhecido'));
    }
    
    // Salvar backup por loja
    $lojasProcessadas = 0;
    $tamanhoTotal = 0;
    
    if (isset($dados['lojas'])) {
        foreach ($dados['lojas'] as $lojaId => $dadosLoja) {
            // Criar diretório da loja
            $dirLoja = BACKUP_DIR . '/' . $lojaId;
            criarDiretorio($dirLoja);
            
            // Nome do arquivo
            $arquivo = $dirLoja . '/backup_' . $dataAtual . '.json';
            
            // Salvar dados
            $json = json_encode($dadosLoja, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            $bytes = file_put_contents($arquivo, $json);
            
            if ($bytes === false) {
                throw new Exception("Erro ao salvar backup da loja $lojaId");
            }
            
            $tamanhoTotal += $bytes;
            $lojasProcessadas++;
        }
    }
    
    // Limpar backups antigos
    $arquivosRemovidos = 0;
    $dataLimite = strtotime('-' . DIAS_RETENCAO . ' days');
    
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator(BACKUP_DIR, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    
    foreach ($iterator as $file) {
        if ($file->isFile() && $file->getFilename() !== 'erros.log') {
            if ($file->getMTime() < $dataLimite) {
                unlink($file->getPathname());
                $arquivosRemovidos++;
            }
        }
    }
    
    // Resposta de sucesso
    responder(true, 'Backup realizado com sucesso', [
        'lojas_processadas' => $lojasProcessadas,
        'tamanho_bytes' => $tamanhoTotal,
        'tamanho_mb' => round($tamanhoTotal / 1024 / 1024, 2),
        'arquivos_antigos_removidos' => $arquivosRemovidos,
        'arquivo_gerado' => 'backup_' . $dataAtual . '.json'
    ]);
    
} catch (Exception $e) {
    logErro($e->getMessage());
    responder(false, 'Erro: ' . $e->getMessage());
}
