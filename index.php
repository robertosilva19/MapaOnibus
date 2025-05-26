<?php
// --- PHP (Estrutura de Duas Tabelas) ---
require_once 'db_config.php'; // Inclui a configuração do banco de dados

$totalAssentos = 60; // Valor padrão inicial
$poltronas = []; // Inicializado, será preenchido
$poltronasDesabilitadasInicialmente = [];
$portasSalvasAposAssento = [null, null];
$nomeMapaAtual = "Novo Layout";
$currentLayoutId = null; // Para saber qual layout está sendo editado

// Tenta carregar um layout do banco de dados
try {
    // Assume que queremos carregar o último layout salvo.
    // Em uma implementação real, você pode ter um seletor de layouts.
    $stmt = $pdo->query("SELECT id, name, total_seats, layout_data FROM layouts ORDER BY updated_at DESC LIMIT 1");
    $loadedLayout = $stmt->fetch();

    if ($loadedLayout) {
        $currentLayoutId = $loadedLayout['id'];
        $nomeMapaAtual = $loadedLayout['name'];
        $totalAssentos = $loadedLayout['total_seats'];
        $layoutData = json_decode($loadedLayout['layout_data'], true);

        $poltronasDesabilitadasInicialmente = $layoutData['desabilitados'] ?? [];
        $portasSalvasAposAssento = $layoutData['portas'] ?? [null, null];

        // Reconstroi as poltronas com base nos dados carregados
        for ($i = 1; $i <= $totalAssentos; $i++) {
            $status = 'livre';
            if (in_array($i, $poltronasDesabilitadasInicialmente)) {
                $status = 'desabilitado';
            }
            // Adicione lógica para status 'ocupado' se houver
            $poltronas[] = ['numero' => $i, 'status' => $status];
        }
    } else {
        // Se não houver layouts no banco, inicializa um layout padrão de 60 assentos
        for ($i = 1; $i <= $totalAssentos; $i++) {
            $poltronas[] = ['numero' => $i, 'status' => 'livre'];
        }
    }
} catch (PDOException $e) {
    // Em caso de erro no banco, use o layout padrão de 60 assentos
    error_log("Erro ao carregar layout do banco: " . $e->getMessage());
    for ($i = 1; $i <= $totalAssentos; $i++) {
        $poltronas[] = ['numero' => $i, 'status' => 'livre'];
    }
}

$poltronasMapeadas = [];
foreach ($poltronas as $p) {
    $poltronasMapeadas[$p['numero']] = $p;
}

$layoutVisual = [];
$num = 1;
for ($i = 0; $i < 15; $i++) { // Ajustado para 15 fileiras
    $num1 = $num++;
    $num2 = $num++;
    $num3 = $num++;
    $num4 = $num++;
    $layoutVisual[] = [($num1 <= $totalAssentos) ? $num1 : null, ($num2 <= $totalAssentos) ? $num2 : null, null, ($num3 <= $totalAssentos) ? $num3 : null, ($num4 <= $totalAssentos) ? $num4 : null];
}

$candidatosPorta1 = [4, 8, 12];
$candidatosPorta2 = [28, 32, 36, 40];

// JSONs para o JavaScript - serão passados como variáveis globais ou data attributes
$jsonPoltronasDesabilitadas = json_encode($poltronasDesabilitadasInicialmente);
$jsonPortasSalvas = json_encode($portasSalvasAposAssento);

// Função Renderizar TD (Sem botões de porta)
function render_seat_td_separado($numAssento, $poltronasMapeadas, $globalColumnIndex)
{
    if ($numAssento !== null && isset($poltronasMapeadas[$numAssento])) {
        $poltrona = $poltronasMapeadas[$numAssento];
        // Classes: 'seat' sempre, 'habilitado' ou 'desabilitado' ou 'ocupado'
        $classes = ['seat', $poltrona['status']]; // Usa o status do DB para a classe inicial
        if ($globalColumnIndex === 0) $classes[] = 'assento-janela-esquerda';
        elseif ($globalColumnIndex === 1) $classes[] = 'assento-corredor-esquerdo';
        elseif ($globalColumnIndex === 3) $classes[] = 'assento-corredor-direito';
        elseif ($globalColumnIndex === 4) $classes[] = 'assento-janela-direita';

        echo "<td class=\"" . implode(' ', $classes) . "\" data-seat-number=\"" . $poltrona['numero'] . "\">";
        echo "<span class='seat-number'>" . ($poltrona['numero'] ?? '??') . "</span>"; // Sempre presente para assentos
        // Adiciona botões de ação ao lado do assento
        echo "<div class='seat-actions'>";
        echo "<button type='button' class='btn-remove-seat' data-seat-number='" . $poltrona['numero'] . "' title='Remover Assento'>-</button>";
        echo "<button type='button' class='btn-add-seat' data-seat-number='" . $poltrona['numero'] . "' title='Adicionar Assento'>+</button>";
        echo "</div>";
        echo "</td>";
    } else {
        // Para espaços vazios, o span.seat-number não é necessário.
        // O JS vai gerá-lo ao adicionar um assento.
        echo "<td class=\"espaco\">"; // Apenas a classe espaco
        echo "<div class='seat-actions'>";
        echo "<button type='button' class='btn-add-seat' title='Adicionar Assento'>+</button>";
        echo "<button type='button' class='btn-remove-seat' title='Remover Assento'>-</button>";
        echo "</div>";
        echo "</td>";
    }
}
?>
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Editor Layout (Completo - 2 Tabelas)</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
</head>

<body>
    <div class="container text-center">
        <div class="row align-items-start">
            <div class="col">
                <h1>Editor Layout (Completo - 2 Tabelas)</h1>

                <form id="form-layout-onibus">
                    <div class="row justify-content-center mb-4">
                        <div class="col-md-8 col-lg-6">
                            <label for="nome_mapa_input" class="form-label fw-bold">Nome do Mapa:</label>
                            <div class="input-group">
                                <input type="text"
                                    class="form-control form-control-lg"
                                    id="nome_mapa_input"
                                    name="nome_mapa"
                                    placeholder="Ex: Leito DD 64 (Placa XXX-0000)"
                                    value="<?php echo htmlspecialchars($nomeMapaAtual ?? ''); ?>"
                                    required
                                    autocomplete="off"> <button type="button" class="btn btn-secondary btn-lg" id="btn-load-map" title="Carregar Mapa Salvo">Carregar Mapa</button>
                            </div>
                            <div id="map-list-dropdown" class="dropdown-menu" style="width: 100%; max-height: 200px; overflow-y: auto;">
                                </div>
                        </div>
                    </div>
                    <input type="hidden" name="layout_id" id="layout_id_input" value="<?php echo htmlspecialchars($currentLayoutId ?? ''); ?>">
                    <input type="hidden" name="poltronas_desabilitadas" id="poltronas_desabilitadas_input" value="<?php echo htmlspecialchars($jsonPoltronasDesabilitadas); ?>">
                    <input type="hidden" name="door_locations" id="door_locations_input" value="<?php echo htmlspecialchars($jsonPortasSalvas); ?>">
                    <input type="hidden" name="candidatos_porta1" id="candidatos_porta1_input" value="<?php echo htmlspecialchars(json_encode($candidatosPorta1)); ?>">
                    <input type="hidden" name="candidatos_porta2" id="candidatos_porta2_input" value="<?php echo htmlspecialchars(json_encode($candidatosPorta2)); ?>">
                    <input type="hidden" name="save_action" id="save_action_input" value="update">
                    <div id="seat-context-menu">
                        <button type="button" id="toggle-status-btn">Habilitar/Desabilitar</button>
                        <button type="button" id="remove-seat-btn">Remover Assento</button>
                        <button type="button" id="cancel-menu-btn" style="margin-top: 5px; color: grey;">Cancelar</button>
                    </div>

                    <div id="layout_onibus_wrapper">
                        <div class="tabelas-container">
                            <table id="tabela-esquerda" class="poltronas-editaveis">
                                <tbody id="tbody-esquerda">
                                    <?php foreach ($layoutVisual as $rowIndex => $fileira): ?>
                                        <tr class="seat-row" data-row-index="<?php echo $rowIndex; ?>">
                                            <?php render_seat_td_separado($fileira[0] ?? null, $poltronasMapeadas, 0); ?>
                                            <?php render_seat_td_separado($fileira[1] ?? null, $poltronasMapeadas, 1); ?>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                            <div class="corredor-central-spacer"></div>
                            <table id="tabela-direita" class="poltronas-editaveis">
                                <tbody id="tbody-direita">
                                    <?php foreach ($layoutVisual as $rowIndex => $fileira): ?>
                                        <?php
                                        $numAssentoDir1 = $fileira[3] ?? null;
                                        $numAssentoJanelaDir = $fileira[4] ?? null;
                                        $tr_data_attr = ($numAssentoJanelaDir !== null) ? "data-tr-after-seat=\"{$numAssentoJanelaDir}\"" : '';
                                        ?>
                                        <tr class="seat-row" data-row-index="<?php echo $rowIndex; ?>" <?php echo $tr_data_attr; ?>>
                                            <?php render_seat_td_separado($numAssentoDir1, $poltronasMapeadas, 3); ?>
                                            <?php render_seat_td_separado($numAssentoJanelaDir, $poltronasMapeadas, 4); ?>
                                            <td class="coluna-porta">
                                                <?php
                                                if ($numAssentoJanelaDir !== null && isset($poltronasMapeadas[$numAssentoJanelaDir])) {
                                                    $poltronaDir = $poltronasMapeadas[$numAssentoJanelaDir];
                                                    $isEditableDir = ($poltronaDir['status'] !== 'ocupado');
                                                    if ($isEditableDir) {
                                                        if (in_array($numAssentoJanelaDir, $candidatosPorta1)) {
                                                            echo "<button type='button' class='add-door-btn door-1' title='Marcar Entrada 1' data-door-index='0' data-insert-after-seat='" . $numAssentoJanelaDir . "'>1</button>";
                                                        }
                                                        if (in_array($numAssentoJanelaDir, $candidatosPorta2)) {
                                                            echo "<button type='button' class='add-door-btn door-2' title='Marcar Entrada 2' data-door-index='1' data-insert-after-seat='" . $numAssentoJanelaDir . "'>2</button>";
                                                        }
                                                    } else {
                                                        echo " ";
                                                    }
                                                } else {
                                                    echo " ";
                                                }
                                                ?>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>

                        <div id="sidebar_legenda" style="position: absolute; right: -350px; top: 0; width: 300px;">
                            <div class="legenda">
                                <strong>Legenda:</strong>
                                <div><span class="leg-habilitado"></span> Assento Habilitado</div>
                                <div><span class="leg-desabilitado"></span> Assento Desabilitado</div>
                                <div><span class="leg-ocupado"></span> Assento Ocupado</div>
                                <div><span class="leg-espaco"> </span> Espaço Vazio (Adicionar)</div>
                                <div><span class="leg-novo">??</span> Assento Novo</div>
                                <hr style="margin: 8px 0;">
                                <div><span class="leg-door-1">1</span> Botão Porta 1</div>
                                <div><span class="leg-door-2">2</span> Botão Porta 2</div>
                                <div><span class="leg-botao-porta">🚪</span> Indicador de Porta</div>
                                <div>Clique em espaço vazio para adicionar assento.</div>
                                <div>Clique em assento para editar status ou remover.</div>
                            </div>

                            <div class="legenda">
                                <strong>Instruções:</strong>
                                <div>Clique no número do assento para renomeá-lo conforme necessário.</div>
                            </div>

                            <div style="text-align: center; margin-top: 20px;">
                                <button type="submit" class="btn btn-primary btn-lg" id="btn-save-changes">Salvar Alterações</button>
                                <button type="submit" class="btn btn-info btn-lg mt-2" id="btn-save-as-new">Salvar Como Novo Layout</button>
                            </div>
                        </div>
                    </div> </form> </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="main.js"></script>
</body>

</html>
