<?php
require_once 'db_config.php'; // Inclui a configuração do banco de dados

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nomeMapa = $_POST['nome_mapa'] ?? '';
    $layoutId = $_POST['layout_id'] ?? null;
    $poltronasDesabilitadas = json_decode($_POST['poltronas_desabilitadas'] ?? '[]', true);
    $doorLocations = json_decode($_POST['door_locations'] ?? '[null, null]', true);
    $saveAction = $_POST['save_action'] ?? 'update'; // NOVA VARIÁVEL: 'update' ou 'insert_new'

    // Validação do nome do mapa no backend
    if (empty($nomeMapa)) {
        http_response_code(400); // Bad Request
        echo json_encode(['success' => false, 'message' => 'O nome do mapa é obrigatório.']);
        exit;
    }

    $totalAssentos = 60; // Este valor deve vir do frontend ou ser dinâmico

    // Prepara os dados do layout para salvar como JSON
    $layoutData = [
        'desabilitados' => $poltronasDesabilitadas,
        'portas' => $doorLocations,
        // Adicionar outras informações do layout aqui, se necessário
    ];
    $jsonLayoutData = json_encode($layoutData);

    $isNewLayout = false; // Flag para indicar se um novo layout foi criado nesta operação
    $message = '';
    $newId = $layoutId; // Por padrão, o ID será o mesmo, a menos que seja uma nova inserção

    try {
        // --- Lógica de Verificação de Nome e Duplicação ---
        $originalName = $nomeMapa;
        $uniqueName = $nomeMapa;
        $counter = 1;

        // Condição para procurar nomes duplicados:
        // 1. Se a ação for 'insert_new' (sempre deve buscar por duplicidade)
        // 2. Se a ação for 'update', mas o nome foi alterado para um que já existe em OUTRO ID
        //    (Para simplificar, vamos sempre buscar por unicidade se o nome já existe no DB,
        //     e geramos um novo se for uma INSERÇÃO ou se o nome foi alterado e colide com outro ID)

        $nameExists = false;
        $stmt = $pdo->prepare("SELECT id FROM layouts WHERE name = :name");
        $stmt->execute([':name' => $originalName]);
        $existingLayoutWithOriginalName = $stmt->fetch();

        if ($existingLayoutWithOriginalName) {
            // Se o nome original já existe E:
            // - A ação é para INSERIR UM NOVO ('insert_new')
            // - OU a ação é para ATUALIZAR ('update') mas o ID do layout existente NÃO é o ID que estamos atualizando (colisão de nome)
            if ($saveAction === 'insert_new' || ($saveAction === 'update' && $existingLayoutWithOriginalName['id'] != $layoutId)) {
                $nameExists = true;
            }
        }

        if ($nameExists) {
            // Se o nome já existe para uma nova inserção ou colide com outro layout na atualização
            while (true) {
                $stmt = $pdo->prepare("SELECT id FROM layouts WHERE name = :name");
                $stmt->execute([':name' => $uniqueName]);
                $existingLayout = $stmt->fetch();

                // Se o nome testado existe E o ID NÃO É o que estamos atualizando (se houver)
                if ($existingLayout && ($layoutId === null || $existingLayout['id'] != $layoutId || $saveAction === 'insert_new')) {
                    // O nome testado já existe para outro layout ou para uma nova inserção
                    $uniqueName = $originalName . ' (' . ($counter++) . ')';
                } else {
                    // O nome é único ou pertence ao layout que está sendo atualizado e não colide
                    break;
                }
            }
            $nomeMapa = $uniqueName; // Usa o nome (potencialmente modificado) para salvar
            $isNewLayout = true; // Força a flag de novo layout se o nome foi alterado para evitar colisão
        }


        // --- Lógica de Salvamento/Atualização ---
        if ($saveAction === 'update' && $layoutId) { // Ação explícita de UPDATE E ID fornecido
            $stmt = $pdo->prepare("UPDATE layouts SET name = :name, total_seats = :total_seats, layout_data = :layout_data WHERE id = :id");
            $stmt->execute([
                ':name' => $nomeMapa,
                ':total_seats' => $totalAssentos,
                ':layout_data' => $jsonLayoutData,
                ':id' => $layoutId
            ]);
            $message = 'Layout atualizado com sucesso!';
            $isNewLayout = false; // Não é um novo layout, é uma atualização
            $newId = $layoutId; // Mantém o mesmo ID
        } else { // Ação é 'insert_new' OU 'update' mas sem ID (primeiro salvamento)
                 // Sempre será uma inserção neste bloco
            $stmt = $pdo->prepare("INSERT INTO layouts (name, total_seats, layout_data) VALUES (:name, :total_seats, :layout_data)");
            $stmt->execute([
                ':name' => $nomeMapa,
                ':total_seats' => $totalAssentos,
                ':layout_data' => $jsonLayoutData
            ]);
            $newId = $pdo->lastInsertId();
            $isNewLayout = true; // É um novo layout
            $message = ($saveAction === 'insert_new') ? 'Novo layout criado com sucesso!' : 'Layout salvo pela primeira vez!';
        }

        echo json_encode([
            'success' => true,
            'message' => $message,
            'id' => $newId,
            'is_new_layout' => $isNewLayout,
            'new_name' => $nomeMapa // Retorna o nome final, caso tenha sido modificado
        ]);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erro ao salvar layout: ' . $e->getMessage()]);
    }
} else {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['success' => false, 'message' => 'Método de requisição não permitido.']);
}
?>