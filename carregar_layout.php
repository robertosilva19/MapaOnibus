<?php
require_once 'db_config.php'; // Inclui a configuração do banco de dados

header('Content-Type: application/json');

$layoutId = $_GET['layout_id'] ?? null; // Parâmetro para buscar por ID (usado no carregamento inicial)
$layoutName = $_GET['name'] ?? null;    // Parâmetro para buscar por nome (usado pelo botão)
$action = $_GET['action'] ?? null;       // NOVO: Parâmetro para a ação (ex: 'list')

$layout = null;

try {
    if ($action === 'list') {
        // Retorna apenas a lista de IDs e nomes dos layouts
        $stmt = $pdo->query("SELECT id, name FROM layouts ORDER BY name ASC");
        $maps = $stmt->fetchAll();
        echo json_encode(['success' => true, 'maps' => $maps]);
        exit; // Termina a execução após retornar a lista
    }
    // --- Lógica existente para carregar um layout específico ---
    elseif ($layoutId) {
        // Busca por ID
        $stmt = $pdo->prepare("SELECT id, name, total_seats, layout_data FROM layouts WHERE id = :id");
        $stmt->execute([':id' => $layoutId]);
        $layout = $stmt->fetch();
    } elseif ($layoutName) {
        // Busca por Nome
        $stmt = $pdo->prepare("SELECT id, name, total_seats, layout_data FROM layouts WHERE name = :name");
        $stmt->execute([':name' => $layoutName]);
        $layout = $stmt->fetch();
    } else {
        // Se nenhum ID ou nome for fornecido, carrega o último layout salvo
        $stmt = $pdo->query("SELECT id, name, total_seats, layout_data FROM layouts ORDER BY updated_at DESC LIMIT 1");
        $layout = $stmt->fetch();
    }

    if ($layout) {
        echo json_encode([
            'success' => true,
            'id' => $layout['id'],
            'name' => $layout['name'],
            'total_seats' => $layout['total_seats'],
            'layout_data' => json_decode($layout['layout_data'], true) // Decodifica o JSON de volta para array PHP
        ]);
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Layout não encontrado.']);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro ao carregar layout: ' . $e->getMessage()]);
}
?>
