<?php
/**
 * TecOS - Script de Estatísticas e Armazenamento
 * 
 * Mostra informações sobre uso de disco, backups e arquivos.
 */

header('Content-Type: application/json');

define('API_KEY', 'a8f7d9e2b4c1m6n3p5q0r9s2t8u1v4w7');
define('UPLOAD_DIR', __DIR__ . '/../uploads');
define('BACKUP_DIR', __DIR__ . '/../backups');

function responder($dados) {
    echo json_encode(array_merge([
        'timestamp' => date('Y-m-d H:i:s')
    ], $dados));
    exit;
}

function calcularTamanhoDiretorio($dir) {
    if (!is_dir($dir)) return 0;
    
    $tamanho = 0;
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS)
    );
    
    foreach ($iterator as $file) {
        $tamanho += $file->getSize();
    }
    
    return $tamanho;
}

function listarArquivosPorLoja($dir, $tipo) {
    $resultado = [];
    
    if (!is_dir($dir)) return $resultado;
    
    $iterator = new DirectoryIterator($dir);
    
    foreach ($iterator as $lojaDir) {
        if ($lojaDir->isDot() || !$lojaDir->isDir()) continue;
        
        $lojaId = $lojaDir->getFilename();
        $tamanho = 0;
        $arquivos = 0;
        
        $subIterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($lojaDir->getPathname(), RecursiveDirectoryIterator::SKIP_DOTS)
        );
        
        foreach ($subIterator as $file) {
            if ($file->isFile()) {
                $tamanho += $file->getSize();
                $arquivos++;
            }
        }
        
        if ($arquivos > 0) {
            $resultado[$lojaId] = [
                'tipo' => $tipo,
                'arquivos' => $arquivos,
                'tamanho_bytes' => $tamanho,
                'tamanho_mb' => round($tamanho / 1024 / 1024, 2)
            ];
        }
    }
    
    return $resultado;
}

// Validar chave
$chaveRecebida = $_GET['key'] ?? $_SERVER['HTTP_X_API_KEY'] ?? '';
if ($chaveRecebida && $chaveRecebida !== API_KEY) {
    responder(['sucesso' => false, 'erro' => 'Chave inválida']);
}

// Calcular estatísticas
$uploadsTamanho = calcularTamanhoDiretorio(UPLOAD_DIR);
$backupsTamanho = calcularTamanhoDiretorio(BACKUP_DIR);
$total = $uploadsTamanho + $backupsTamanho;

// Listar por loja
$uploadsPorLoja = listarArquivosPorLoja(UPLOAD_DIR, 'uploads');
$backupsPorLoja = listarArquivosPorLoja(BACKUP_DIR, 'backups');

// Estatísticas de disco
$espacoLivre = disk_free_space('/');
$espacoTotal = disk_total_space('/');
$espacoUsado = $espacoTotal - $espacoLivre;

responder([
    'sucesso' => true,
    'armazenamento' => [
        'uploads' => [
            'tamanho_bytes' => $uploadsTamanho,
            'tamanho_mb' => round($uploadsTamanho / 1024 / 1024, 2),
            'tamanho_gb' => round($uploadsTamanho / 1024 / 1024 / 1024, 4)
        ],
        'backups' => [
            'tamanho_bytes' => $backupsTamanho,
            'tamanho_mb' => round($backupsTamanho / 1024 / 1024, 2),
            'tamanho_gb' => round($backupsTamanho / 1024 / 1024 / 1024, 4)
        ],
        'total' => [
            'tamanho_bytes' => $total,
            'tamanho_mb' => round($total / 1024 / 1024, 2),
            'tamanho_gb' => round($total / 1024 / 1024 / 1024, 4)
        ]
    ],
    'disco' => [
        'espaco_total_gb' => round($espacoTotal / 1024 / 1024 / 1024, 2),
        'espaco_usado_gb' => round($espacoUsado / 1024 / 1024 / 1024, 2),
        'espaco_livre_gb' => round($espacoLivre / 1024 / 1024 / 1024, 2),
        'percentual_usado' => round(($espacoUsado / $espacoTotal) * 100, 2)
    ],
    'por_loja' => [
        'uploads' => $uploadsPorLoja,
        'backups' => $backupsPorLoja,
        'total_lojas' => count(array_unique(array_merge(
            array_keys($uploadsPorLoja),
            array_keys($backupsPorLoja)
        )))
    ]
]);
