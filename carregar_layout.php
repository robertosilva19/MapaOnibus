<?php
require_once 'db_config.php'; // Inclui a configuração do banco de dados

header('Content-Type: application/json');

$layoutId = $_GET['id'] ?? null; // Assume que o ID do layout será passado via GET

if ($layoutId) {
    try {
        $stmt = $pdo->prepare("SELECT id, name, total_seats, layout_data FROM layouts WHERE id = :id");
        $stmt->execute([':id' => $layoutId]);
        $layout = $stmt->fetch();

        if ($layout) {
            echo json_encode([
                'success' => true,
                'id' => $layout['id'], // Retorna o ID
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
} else {
    // Se nenhum ID for fornecido, tenta carregar o último layout salvo
    try {
        $stmt = $pdo->query("SELECT id, name, total_seats, layout_data FROM layouts ORDER BY updated_at DESC LIMIT 1");
        $loadedLayout = $stmt->fetch();

        if ($loadedLayout) {
            echo json_encode([
                'success' => true,
                'id' => $loadedLayout['id'],
                'name' => $loadedLayout['name'],
                'total_seats' => $loadedLayout['total_seats'],
                'layout_data' => json_decode($loadedLayout['layout_data'], true)
            ]);
        } else {
            // Nenhum layout no banco, retorna um estado vazio ou padrão
            echo json_encode(['success' => false, 'message' => 'Nenhum layout encontrado.']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erro ao listar/carregar layouts: ' . $e->getMessage()]);
    }
}
?>