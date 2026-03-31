<?php
/**
 * TecOS - Script de Restauração de Backup
 * 
 * Este script permite restaurar dados de um backup anterior.
 * USE COM CUIDADO - Isso pode sobrescrever dados existentes.
 */

header('Content-Type: application/json');

// ============================================
// CONFIGURAÇÕES
// ============================================

define('API_KEY', 'a8f7d9e2b4c1m6n3p5q0r9s2t8u1v4w7');
define('TECOS_API_URL', 'https://tec-os.vercel.app/api/backup/import');
define('BACKUP_DIR', __DIR__ . '/../backups');

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

// ============================================
// LISTAR BACKUPS DISPONÍVEIS
// ============================================

if ($_SERVER['REQUEST_METHOD'] === 'GET' && !isset($_GET['arquivo'])) {
    $backups = [];
    
    if (is_dir(BACKUP_DIR)) {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator(BACKUP_DIR, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );
        
        foreach ($iterator as $file) {
            if ($file->isFile() && $file->getExtension() === 'json') {
                $path = $file->getPathname();
                $lojaId = basename(dirname($path));
                $nomeArquivo = $file->getFilename();
                
                // Extrair data do nome do arquivo
                preg_match('/backup_(\d{4}-\d{2}-\d{2})/', $nomeArquivo, $matches);
                $data = $matches[1] ?? 'Desconhecida';
                
                $backups[] = [
                    'loja_id' => $lojaId,
                    'arquivo' => $nomeArquivo,
                    'caminho' => str_replace(BACKUP_DIR . '/', '', $path),
                    'data' => $data,
                    'tamanho' => round($file->getSize() / 1024, 2) . ' KB',
                    'modificado' => date('Y-m-d H:i:s', $file->getMTime())
                ];
            }
        }
    }
    
    // Ordenar por data descendente
    usort($backups, function($a, $b) {
        return strcmp($b['data'], $a['data']);
    });
    
    responder(true, 'Lista de backups', ['backups' => $backups, 'total' => count($backups)]);
}

// ============================================
// RESTAURAR BACKUP
// ============================================

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Validar chave
    $chaveRecebida = $_GET['key'] ?? $_SERVER['HTTP_X_API_KEY'] ?? '';
    if ($chaveRecebida !== API_KEY) {
        responder(false, 'Chave de API inválida');
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    $lojaId = $input['loja_id'] ?? '';
    $arquivo = $input['arquivo'] ?? '';
    $confirmar = $input['confirmar'] ?? false;
    
    if (!$lojaId || !$arquivo) {
        responder(false, 'loja_id e arquivo são obrigatórios');
    }
    
    if (!$confirmar) {
        responder(false, 'Confirmação necessária. Envie confirmar: true');
    }
    
    // Validar caminho do arquivo
    $caminhoArquivo = BACKUP_DIR . '/' . $lojaId . '/' . basename($arquivo);
    
    if (!file_exists($caminhoArquivo)) {
        responder(false, 'Arquivo de backup não encontrado');
    }
    
    // Ler backup
    $dadosBackup = json_decode(file_get_contents($caminhoArquivo), true);
    
    if (!$dadosBackup) {
        responder(false, 'Erro ao ler arquivo de backup');
    }
    
    // Enviar para API do TecOS
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => TECOS_API_URL . '?key=' . API_KEY,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode([
            'loja_id' => $lojaId,
            'dados' => $dadosBackup
        ]),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'X-API-KEY: ' . API_KEY
        ],
        CURLOPT_TIMEOUT => 600,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    
    $resposta = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $erro = curl_error($ch);
    curl_close($ch);
    
    if ($erro) {
        responder(false, 'Erro ao conectar com TecOS: ' . $erro);
    }
    
    $dadosResposta = json_decode($resposta, true);
    
    if ($httpCode === 200 && $dadosResposta['sucesso']) {
        responder(true, 'Backup restaurado com sucesso', $dadosResposta);
    } else {
        responder(false, $dadosResposta['erro'] ?? 'Erro ao restaurar backup');
    }
}

// Método não permitido
responder(false, 'Método não permitido');
