// --- JAVASCRIPT COMPLETO (2 Tabelas, Menu, Renum. Auto) ---
document.addEventListener('DOMContentLoaded', () => {
    const layoutWrapper = document.getElementById('layout_onibus_wrapper');

    // Referências do DOM
    const formOnibus = document.getElementById('form-layout-onibus');
    const hiddenInputDisabled = document.getElementById('poltronas_desabilitadas_input');
    const hiddenInputDoors = document.getElementById('door_locations_input');
    const layoutIdInput = document.getElementById('layout_id_input');
    const leftTableBody = document.getElementById('tbody-esquerda');
    const rightTableBody = document.getElementById('tbody-direita');
    const contextMenu = document.getElementById('seat-context-menu');
    const toggleStatusBtn = document.getElementById('toggle-status-btn');
    const removeSeatBtn = document.getElementById('remove-seat-btn');
    const cancelMenuBtn = document.getElementById('cancel-menu-btn');

    // Carregar dados iniciais do PHP (via hidden inputs)
    // Estado inicial de desabilitados
    let desabilitadosAtualmente = [];
    try {
        const d = JSON.parse(hiddenInputDisabled.value || '[]');
        if (Array.isArray(d)) desabilitadosAtualmente = d.map(n => parseInt(n, 10)).filter(n => !isNaN(n) && n > 0);
    } catch (e) { console.error("Erro ao parsear desabilitados:", e); }

    // Estado inicial de portas
    let portaAposAssento = [null, null];
    try {
        const p = JSON.parse(hiddenInputDoors.value || '[null, null]');
        if (Array.isArray(p) && p.length === 2) portaAposAssento = p.map(n => n === null ? null : parseInt(n, 10)).map(n => (n === null || (!isNaN(n) && n > 0)) ? n : null);
    } catch (e) { console.error("Erro ao parsear portas:", e); }

    // Candidatos a porta (também do PHP, via hidden inputs)
    const candidatosP1 = JSON.parse(document.getElementById('candidatos_porta1_input').value || '[]');
    const candidatosP2 = JSON.parse(document.getElementById('candidatos_porta2_input').value || '[]');

    let currentEditingSeatTd = null; // Assento atualmente clicado para o menu de contexto

    // --- Funções Auxiliares ---

    // Atualiza o input oculto de poltronas desabilitadas
    function atualizarInputDesabilitados() {
        desabilitadosAtualmente.sort((a, b) => a - b);
        hiddenInputDisabled.value = JSON.stringify(desabilitadosAtualmente);
    }

    // Adiciona ou remove a linha visual da porta
    function updateDoorRow(seatNumberBeforeDoor) {
        if (!seatNumberBeforeDoor) return;

        // Encontrar a linha TR após o assento específico em AMBAS as tabelas
        const targetRow = document.querySelector(`tr.seat-row[data-tr-after-seat="${seatNumberBeforeDoor}"]`) ||
                          document.querySelector(`#tabela-esquerda tr.seat-row:has(td.seat[data-seat-number="${seatNumberBeforeDoor}"])`) ||
                          document.querySelector(`#tabela-direita tr.seat-row:has(td.seat[data-seat-number="${seatNumberBeforeDoor}"])`);

        if (!targetRow) return;

        // Verificar se este assento tem uma porta associada
        const isDoor1 = portaAposAssento[0] === seatNumberBeforeDoor;
        const isDoor2 = portaAposAssento[1] === seatNumberBeforeDoor;

        // Remover qualquer linha de porta existente após este assento
        const nextSibling = targetRow.nextElementSibling;
        if (nextSibling && nextSibling.classList.contains('door-row') &&
            parseInt(nextSibling.dataset.doorAfterSeat, 10) === seatNumberBeforeDoor) {
            nextSibling.remove();
        }

        // Adicionar uma nova linha de porta se necessário
        if (isDoor1 || isDoor2) {
            const doorNumber = isDoor1 ? 1 : 2;
            const doorColor = isDoor1 ? '#f0ad4e' : '#5bc0de';

            const doorRow = document.createElement('tr');
            doorRow.className = 'door-row';
            doorRow.dataset.doorAfterSeat = seatNumberBeforeDoor;
            doorRow.dataset.doorIndex = isDoor1 ? '0' : '1';
            // Estrutura modificada para minimizar o impacto no layout
            doorRow.innerHTML = `
                <td class="door-space-left" style="width: 5px !important; padding: 0 !important;"></td>
                <td class="door-space-left" style="width: 5px !important; padding: 0 !important;"></td>
                <td class="door-entry" colspan="2" style="border-color: ${doorColor};">
                    🚪 Entrada ${doorNumber}
                </td>
                <td class="door-space-right"></td>
            `;
            // Inserir a linha de porta após o assento
            targetRow.insertAdjacentElement('afterend', doorRow);
        }
    }

    // Esconde o menu de contexto
    function hideContextMenu() {
        if (contextMenu.style.display === 'block') {
            contextMenu.style.display = 'none';
        }
        currentEditingSeatTd = null;
    }

    // --- Inicialização da interface (aplicar estado carregado do DB) ---

    // Aplicar classes 'desabilitado' aos assentos que vêm como desabilitados do DB
    desabilitadosAtualmente.forEach(seatNum => {
        const seatTd = document.querySelector(`td.seat[data-seat-number="${seatNum}"]`);
        if (seatTd) {
            seatTd.classList.remove('habilitado');
            seatTd.classList.add('desabilitado');
        }
    });

    // Renderizar as portas salvas inicialmente
    const allSeatRows = document.querySelectorAll('tr.seat-row');
    allSeatRows.forEach(row => {
        let foundSeatForDoor = null;
        row.querySelectorAll('.seat').forEach(seatTd => {
            const seatNum = parseInt(seatTd.dataset.seatNumber, 10);
            if (seatNum && (candidatosP1.includes(seatNum) || candidatosP2.includes(seatNum))) {
                 if (portaAposAssento.includes(seatNum)) {
                    foundSeatForDoor = seatNum;
                    // Adiciona o data-tr-after-seat se não existir para ajudar no updateDoorRow
                    if (!row.hasAttribute('data-tr-after-seat')) {
                        row.setAttribute('data-tr-after-seat', seatNum);
                    }
                }
            }
        });
        if (foundSeatForDoor) {
            updateDoorRow(foundSeatForDoor);
        }
    });

    // --- Listeners de Eventos ---

    // Listener global para fechar o menu de contexto ao clicar fora
    document.addEventListener('click', (event) => {
        if (contextMenu.style.display === 'block' && !contextMenu.contains(event.target) && event.target !== currentEditingSeatTd) {
            hideContextMenu();
        }
    }, false);

    // Listener principal no wrapper para cliques nos assentos e espaços vazios
    if (layoutWrapper) {
        layoutWrapper.addEventListener('click', (event) => {
            let target = event.target;
            if (contextMenu.contains(target)) return; // Ignora cliques no menu

            // Se o clique foi no número do assento, usa a célula pai (TD) como alvo
            if (target.classList.contains('seat-number') && target.parentElement.classList.contains('seat')) {
                target = target.parentElement;
            }

            // Fecha menu se clicar fora do TD ativo (exceto botão porta)
            if (contextMenu.style.display === 'block' && target !== currentEditingSeatTd && !target.classList.contains('add-door-btn')) {
                hideContextMenu();
            }

            // 1. Clique em Assento Editável -> Mostra/Esconde Menu de Contexto
            if (target.tagName === 'TD' && target.classList.contains('seat') && !target.classList.contains('ocupado')) {
                if (currentEditingSeatTd === target) { // Clicou no mesmo assento, então esconde
                    hideContextMenu();
                    return;
                }
                currentEditingSeatTd = target; // Define o assento atual para edição
                const rect = target.getBoundingClientRect();
                contextMenu.style.top = `${window.scrollY + rect.bottom + 2}px`;
                contextMenu.style.left = `${window.scrollX + rect.left}px`;
                contextMenu.style.display = 'block';
                toggleStatusBtn.textContent = target.classList.contains('desabilitado') ? 'Habilitar Assento' : 'Desabilitar Assento';
            }
            // 2. Clique no botão de adicionar/remover assento (+) ou (-)
            else if (event.target.classList.contains('btn-add-seat')) {
                const seatTd = event.target.closest('td');
                if (seatTd && seatTd.classList.contains('espaco')) {
                    const newSeatNumber = prompt("Digite o número para este assento:", "");
                    if (newSeatNumber !== null && newSeatNumber.trim() !== "") {
                        const parsedNumber = parseInt(newSeatNumber.trim(), 10);
                        if (!isNaN(parsedNumber) && parsedNumber > 0) {
                            // Validação de unicidade do número do assento
                            const existingSeat = document.querySelector(`.seat[data-seat-number="${parsedNumber}"]`);
                            if (existingSeat) {
                                alert(`O número de assento ${parsedNumber} já está em uso.`);
                                return;
                            }

                            seatTd.className = 'seat habilitado'; // Novo assento é habilitado por padrão
                            seatTd.dataset.seatNumber = parsedNumber;
                            seatTd.innerHTML = `
                                <span class='seat-number'>${parsedNumber}</span>
                                <div class='seat-actions'>
                                    <button class='btn-add-seat' title='Adicionar Assento'>+</button>
                                    <button class='btn-remove-seat' title='Remover Assento'>-</button>
                                </div>
                            `;
                        } else {
                            alert("Número de assento inválido. Por favor, digite um número inteiro positivo.");
                        }
                    } else {
                        alert("Número do assento é obrigatório para adicionar.");
                    }
                }
            } else if (event.target.classList.contains('btn-remove-seat')) {
                const seatTd = event.target.closest('td');
                if (seatTd && seatTd.classList.contains('seat') && seatTd.dataset.seatNumber) {
                    const seatNumber = seatTd.dataset.seatNumber;
                    if (confirm(`Tem certeza que deseja remover o assento ${seatNumber}?`)) {
                        seatTd.className = 'espaco';
                        seatTd.removeAttribute('data-seat-number');
                        seatTd.querySelector('.seat-number')?.remove(); // Remove o span do número

                        // Remove da lista de desabilitados se estava lá
                        const numRemoved = parseInt(seatNumber, 10);
                        const indexInArray = desabilitadosAtualmente.indexOf(numRemoved);
                        if (indexInArray > -1) {
                            desabilitadosAtualmente.splice(indexInArray, 1);
                            atualizarInputDesabilitados();
                        }

                        // Garante que os botões de ação permaneçam no espaço vazio
                        if (!seatTd.querySelector('.seat-actions')) {
                            seatTd.innerHTML += `
                                <div class='seat-actions'>
                                    <button class='btn-add-seat' title='Adicionar Assento'>+</button>
                                    <button class='btn-remove-seat' title='Remover Assento'>-</button>
                                </div>
                            `;
                        }
                    }
                }
            }
            // 3. Clique nos botões de porta (1 ou 2)
            else if (target.classList.contains('add-door-btn') && target.dataset.insertAfterSeat && target.dataset.doorIndex) {
                hideContextMenu();
                const seatNum = parseInt(target.dataset.insertAfterSeat, 10);
                const doorIndex = parseInt(target.dataset.doorIndex, 10);

                const seatCell = document.querySelector(`td.seat[data-seat-number="${seatNum}"]`);
                const seatRow = seatCell ? seatCell.closest('tr') : null;

                if (seatRow) {
                    // Adicionar o atributo data-tr-after-seat ao TR se ainda não existir
                    if (!seatRow.hasAttribute('data-tr-after-seat')) {
                        seatRow.setAttribute('data-tr-after-seat', seatNum);
                    }

                    // Se a porta já estiver neste assento, remova-a. Senão, adicione-a.
                    if (portaAposAssento[doorIndex] === seatNum) {
                        portaAposAssento[doorIndex] = null;
                    } else {
                        // Se já houver uma porta do mesmo tipo em outro assento, remova-a de lá primeiro
                        if (portaAposAssento[doorIndex] !== null) {
                            updateDoorRow(portaAposAssento[doorIndex]); // Atualiza o local antigo para remover
                        }
                        portaAposAssento[doorIndex] = seatNum;
                    }

                    updateDoorRow(seatNum); // Atualiza o local atual para adicionar/remover
                    hiddenInputDoors.value = JSON.stringify(portaAposAssento); // Atualiza o hidden input
                }
            }
        });
    }

    // --- Ações dos Botões do Menu de Contexto ---

    // Botão Habilitar/Desabilitar
    toggleStatusBtn.addEventListener('click', () => {
        if (!currentEditingSeatTd) return;
        const seatNumberStr = currentEditingSeatTd.dataset.seatNumber;
        const seatNumber = parseInt(seatNumberStr, 10);

        if (!seatNumberStr || isNaN(seatNumber) || seatNumber <= 0) {
            alert("Assento precisa ter um número válido.");
            hideContextMenu();
            return;
        }

        const isDisabled = currentEditingSeatTd.classList.contains('desabilitado');
        const indexInArray = desabilitadosAtualmente.indexOf(seatNumber);
        const isInArray = indexInArray > -1;

        if (isDisabled) {
            currentEditingSeatTd.classList.remove('desabilitado');
            currentEditingSeatTd.classList.add('habilitado');
            if (isInArray) {
                desabilitadosAtualmente.splice(indexInArray, 1);
            }
        } else {
            currentEditingSeatTd.classList.remove('habilitado');
            currentEditingSeatTd.classList.add('desabilitado');
            if (!isInArray) {
                desabilitadosAtualmente.push(seatNumber);
            }
        }
        atualizarInputDesabilitados(); // Salva o novo estado no hidden input
        hideContextMenu();
    });

    // Botão Remover Assento (do menu de contexto)
    // Note: A lógica para o botão '-' nos assentos já lida com a remoção.
    // Este é um método alternativo via menu de contexto.
    removeSeatBtn.addEventListener('click', () => {
        if (!currentEditingSeatTd) return;

        const seatNumText = currentEditingSeatTd.querySelector('.seat-number')?.textContent || 'este';
        if (!confirm(`Tem certeza que deseja remover o assento ${seatNumText}?`)) {
            hideContextMenu();
            return;
        }

        currentEditingSeatTd.className = 'espaco';
        currentEditingSeatTd.removeAttribute('data-seat-number');
        currentEditingSeatTd.querySelector('.seat-number')?.remove(); // Remove o span do número

        // Garante que os botões de ação estejam presentes no espaço vazio
        if (!currentEditingSeatTd.querySelector('.seat-actions')) {
             currentEditingSeatTd.innerHTML += `
                <div class='seat-actions'>
                    <button class='btn-add-seat' title='Adicionar Assento'>+</button>
                    <button class='btn-remove-seat' title='Remover Assento'>-</button>
                </div>
            `;
        }

        // Se o assento removido era desabilitado, remova-o da lista de desabilitados
        const seatNumber = parseInt(seatNumText, 10); // Usa o texto para parsear
        const indexInArray = desabilitadosAtualmente.indexOf(seatNumber);
        if (indexInArray > -1) {
            desabilitadosAtualmente.splice(indexInArray, 1);
            atualizarInputDesabilitados();
        }

        hideContextMenu();
    });

    // Botão Cancelar (do menu de contexto)
    cancelMenuBtn.addEventListener('click', () => {
        hideContextMenu();
    });

    // Evento para renomear assentos ao clicar no número do assento
    document.addEventListener('click', (event) => {
        const target = event.target;

        if (target.classList.contains('seat-number')) {
            const oldSeatNumber = parseInt(target.parentElement.dataset.seatNumber, 10); // Captura o número antigo
            const newSeatNumber = prompt("Digite o novo número para este assento:", target.textContent);

            if (newSeatNumber !== null && newSeatNumber.trim() !== "") {
                const parsedNumber = parseInt(newSeatNumber.trim(), 10);

                if (!isNaN(parsedNumber) && parsedNumber > 0) {
                    // Validação de unicidade: Verifica se o novo número já existe
                    const existingSeat = document.querySelector(`.seat[data-seat-number="${parsedNumber}"]`);
                    if (existingSeat && existingSeat !== target.parentElement) {
                        alert(`O número de assento ${parsedNumber} já está em uso.`);
                        return;
                    }

                    // Atualiza a lista de desabilitados se o número do assento mudar e ele estiver desabilitado
                    const oldIndexInDisabled = desabilitadosAtualmente.indexOf(oldSeatNumber);
                    if (target.parentElement.classList.contains('desabilitado')) {
                        if (oldIndexInDisabled > -1) {
                            desabilitadosAtualmente[oldIndexInDisabled] = parsedNumber; // Atualiza o número
                        } else {
                            desabilitadosAtualmente.push(parsedNumber); // Adiciona se por algum motivo não estava lá
                        }
                    } else { // Se o assento NÃO está desabilitado, remove ele da lista de desabilitados se estava lá
                        if (oldIndexInDisabled > -1) {
                            desabilitadosAtualmente.splice(oldIndexInDisabled, 1);
                        }
                    }
                    atualizarInputDesabilitados(); // Salva o novo estado no hidden input

                    target.textContent = parsedNumber; // Atualiza o texto visível
                    target.parentElement.dataset.seatNumber = parsedNumber; // Atualiza o data attribute
                } else {
                    alert("Número de assento inválido. Por favor, digite um número inteiro positivo.");
                }
            }
        }
    });

    // Listener para o formulário de submissão
    formOnibus.addEventListener('submit', (event) => {
        // As hidden inputs `poltronas_desabilitadas` e `door_locations` já são
        // atualizadas em tempo real pelas funções JavaScript (`atualizarInputDesabilitados`, `updateDoorRow`).
        // O `layout_id_input` e `nome_mapa_input` são preenchidos pelo PHP e editáveis pelo usuário.
        // O restante dos dados do layout (quais assentos existem, onde estão) será
        // inferido no backend com base nos números de assentos e no `total_seats` (que é fixo em 60 por enquanto).
        // Se você precisar salvar a estrutura visual exata (tipo `layoutVisual` do PHP),
        // precisará coletar essa informação no JS e enviar como um JSON também.
        // Por agora, o que já está sendo enviado é suficiente para a persistência básica.
    });

}); // Fim DOMContentLoaded