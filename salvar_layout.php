<?php
require_once 'db_config.php'; // Inclui a configuração do banco de dados

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nomeMapa = $_POST['nome_mapa'] ?? 'Novo Layout';
    $layoutId = $_POST['layout_id'] ?? null; // Novo: ID do layout para edição
    $poltronasDesabilitadas = json_decode($_POST['poltronas_desabilitadas'] ?? '[]', true);
    $doorLocations = json_decode($_POST['door_locations'] ?? '[null, null]', true);

    // TODO: Enviar a estrutura completa do layoutVisual e o status de cada assento do frontend.
    // Por enquanto, usaremos um placeholder para 'total_seats' e 'layout_data'

    $totalAssentos = 60; // Este valor deve vir do frontend ou ser dinâmico
    $layoutData = [
        'desabilitados' => $poltronasDesabilitadas,
        'portas' => $doorLocations,
        // Adicionar outras informações do layout aqui, se necessário (ex: layoutVisual, assentos existentes)
    ];

    $jsonLayoutData = json_encode($layoutData);

    try {
        if ($layoutId) {
            // Atualizar layout existente
            $stmt = $pdo->prepare("UPDATE layouts SET name = :name, total_seats = :total_seats, layout_data = :layout_data WHERE id = :id");
            $stmt->execute([
                ':name' => $nomeMapa,
                ':total_seats' => $totalAssentos,
                ':layout_data' => $jsonLayoutData,
                ':id' => $layoutId
            ]);
            echo json_encode(['success' => true, 'message' => 'Layout atualizado com sucesso!', 'id' => $layoutId]);
        } else {
            // Inserir novo layout
            $stmt = $pdo->prepare("INSERT INTO layouts (name, total_seats, layout_data) VALUES (:name, :total_seats, :layout_data)");
            $stmt->execute([
                ':name' => $nomeMapa,
                ':total_seats' => $totalAssentos,
                ':layout_data' => $jsonLayoutData
            ]);
            echo json_encode(['success' => true, 'message' => 'Layout salvo com sucesso!', 'id' => $pdo->lastInsertId()]);
        }

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erro ao salvar layout: ' . $e->getMessage()]);
    }
} else {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['success' => false, 'message' => 'Método de requisição não permitido.']);
}
?>