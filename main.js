// --- JAVASCRIPT COMPLETO (2 Tabelas, Menu, Renum. Auto) ---
document.addEventListener('DOMContentLoaded', () => {
    const layoutWrapper = document.getElementById('layout_onibus_wrapper');

    // Referências do DOM
    const formOnibus = document.getElementById('form-layout-onibus');
    console.log('1. Elemento do formulário encontrado:', formOnibus); // Log de depuração

    const nomeMapaInput = document.getElementById('nome_mapa_input');
    console.log('1a. Elemento nomeMapaInput encontrado:', nomeMapaInput); // Log de depuração

    // Referências dos botões principais
    const btnSaveChanges = document.getElementById('btn-save-changes');
    const btnSaveAsNew = document.getElementById('btn-save-as-new');
    const saveActionInput = document.getElementById('save_action_input');


    // Referências do menu de contexto e seus botões (DEVE-SE VERIFICAR SE EXISTEM!)
    const contextMenu = document.getElementById('seat-context-menu');
    const toggleStatusBtn = document.getElementById('toggle-status-btn');
    const removeSeatBtnContextMenu = document.getElementById('remove-seat-btn'); // RENOMEADO para evitar conflito de nome
    const cancelMenuBtn = document.getElementById('cancel-menu-btn');

    console.log('toggleStatusBtn:', toggleStatusBtn); // Log de depuração
    console.log('removeSeatBtn (do menu):', removeSeatBtnContextMenu); // Log de depuração (agora com nome diferente)
    console.log('cancelMenuBtn:', cancelMenuBtn); // Log de depuração


    // Outras referências
    const hiddenInputDisabled = document.getElementById('poltronas_desabilitadas_input');
    const hiddenInputDoors = document.getElementById('door_locations_input');
    const layoutIdInput = document.getElementById('layout_id_input');


    const leftTableBody = document.getElementById('tbody-esquerda');
    const rightTableBody = document.getElementById('tbody-direita');


    // Carregar dados iniciais do PHP (via hidden inputs)
    let desabilitadosAtualmente = [];
    try {
        const d = JSON.parse(hiddenInputDisabled.value || '[]');
        if (Array.isArray(d)) desabilitadosAtualmente = d.map(n => parseInt(n, 10)).filter(n => !isNaN(n) && n > 0);
    } catch (e) { console.error("Erro ao parsear desabilitados:", e); }

    let portaAposAssento = [null, null];
    try {
        const p = JSON.parse(hiddenInputDoors.value || '[null, null]');
        if (Array.isArray(p) && p.length === 2) portaAposAssento = p.map(n => n === null ? null : parseInt(n, 10)).map(n => (n === null || (!isNaN(n) && n > 0)) ? n : null);
    } catch (e) { console.error("Erro ao parsear portas:", e); }

    const candidatosP1 = JSON.parse(document.getElementById('candidatos_porta1_input').value || '[]');
    const candidatosP2 = JSON.parse(document.getElementById('candidatos_porta2_input').value || '[]');

    let currentEditingSeatTd = null;

    // --- Funções Auxiliares ---
    function atualizarInputDesabilitados() {
        desabilitadosAtualmente.sort((a, b) => a - b);
        hiddenInputDisabled.value = JSON.stringify(desabilitadosAtualmente);
    }

    function updateDoorRow(seatNumberBeforeDoor) {
        if (!seatNumberBeforeDoor) return;

        const targetRow = document.querySelector(`tr.seat-row[data-tr-after-seat="${seatNumberBeforeDoor}"]`) ||
                          document.querySelector(`#tabela-esquerda tr.seat-row:has(td.seat[data-seat-number="${seatNumberBeforeDoor}"])`) ||
                          document.querySelector(`#tabela-direita tr.seat-row:has(td.seat[data-seat-number="${seatNumberBeforeDoor}"])`);

        if (!targetRow) return;

        const isDoor1 = portaAposAssento[0] === seatNumberBeforeDoor;
        const isDoor2 = portaAposAssento[1] === seatNumberBeforeDoor;

        const nextSibling = targetRow.nextElementSibling;
        if (nextSibling && nextSibling.classList.contains('door-row') &&
            parseInt(nextSibling.dataset.doorAfterSeat, 10) === seatNumberBeforeDoor) {
            nextSibling.remove();
        }

        if (isDoor1 || isDoor2) {
            const doorNumber = isDoor1 ? 1 : 2;
            const doorColor = isDoor1 ? '#f0ad4e' : '#5bc0de';

            const doorRow = document.createElement('tr');
            doorRow.className = 'door-row';
            doorRow.dataset.doorAfterSeat = seatNumberBeforeDoor;
            doorRow.dataset.doorIndex = isDoor1 ? '0' : '1';
            doorRow.innerHTML = `
                <td class="door-space-left" style="width: 5px !important; padding: 0 !important;"></td>
                <td class="door-space-left" style="width: 5px !important; padding: 0 !important;"></td>
                <td class="door-entry" colspan="2" style="border-color: ${doorColor};">
                    🚪 Entrada ${doorNumber}
                </td>
                <td class="door-space-right"></td>
            `;
            targetRow.insertAdjacentElement('afterend', doorRow);
        }
    }

    function hideContextMenu() {
        if (contextMenu && contextMenu.style.display === 'block') { // VERIFICA SE contextMenu EXISTE
            contextMenu.style.display = 'none';
        }
        currentEditingSeatTd = null;
    }

    function showMessage(message, isSuccess = true) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert ${isSuccess ? 'alert-success' : 'alert-danger'} alert-dismissible fade show mt-3`;
        alertDiv.setAttribute('role', 'alert');
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        const container = document.querySelector('.container.text-center');
        const h1 = document.querySelector('h1');
        h1.parentNode.insertBefore(alertDiv, h1.nextSibling);

        setTimeout(() => {
            if (alertDiv) {
                alertDiv.classList.remove('show');
                alertDiv.classList.add('fade');
                alertDiv.addEventListener('transitionend', () => alertDiv.remove());
            }
        }, 5000);
    }


    // --- Inicialização da interface (aplicar estado carregado do DB) ---
    desabilitadosAtualmente.forEach(seatNum => {
        const seatTd = document.querySelector(`td.seat[data-seat-number="${seatNum}"]`);
        if (seatTd) {
            seatTd.classList.remove('habilitado');
            seatTd.classList.add('desabilitado');
        }
    });

    const allSeatRows = document.querySelectorAll('tr.seat-row');
    allSeatRows.forEach(row => {
        let foundSeatForDoor = null;
        row.querySelectorAll('.seat').forEach(seatTd => {
            const seatNum = parseInt(seatTd.dataset.seatNumber, 10);
            if (seatNum && (candidatosP1.includes(seatNum) || candidatosP2.includes(seatNum))) {
                 if (portaAposAssento.includes(seatNum)) {
                    foundSeatForDoor = seatNum;
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
    // e para renomear assentos.
    document.addEventListener('click', (event) => {
        // Se contextMenu existe, aplica lógica de hideContextMenu
        if (contextMenu && contextMenu.style.display === 'block' && !contextMenu.contains(event.target) && event.target !== currentEditingSeatTd) {
            hideContextMenu();
        }

        // Lógica para renomear assentos
        const target = event.target;
        if (target.classList.contains('seat-number')) {
            const oldSeatNumber = parseInt(target.parentElement.dataset.seatNumber, 10);
            const newSeatNumber = prompt("Digite o novo número para este assento:", target.textContent);

            if (newSeatNumber !== null && newSeatNumber.trim() !== "") {
                const parsedNumber = parseInt(newSeatNumber.trim(), 10);
                if (!isNaN(parsedNumber) && parsedNumber > 0) {
                    const existingSeat = document.querySelector(`.seat[data-seat-number="${parsedNumber}"]`);
                    if (existingSeat && existingSeat !== target.parentElement) {
                        showMessage(`O número de assento ${parsedNumber} já está em uso.`, false);
                        return;
                    }

                    const oldIndexInDisabled = desabilitadosAtualmente.indexOf(oldSeatNumber);
                    if (target.parentElement.classList.contains('desabilitado')) {
                        if (oldIndexInDisabled > -1) {
                            desabilitadosAtualmente[oldIndexInDisabled] = parsedNumber;
                        } else {
                            desabilitadosAtualmente.push(parsedNumber);
                        }
                    } else {
                        if (oldIndexInDisabled > -1) {
                            desabilitadosAtualmente.splice(oldIndexInDisabled, 1);
                        }
                    }
                    atualizarInputDesabilitados();

                    target.textContent = parsedNumber;
                    target.parentElement.dataset.seatNumber = parsedNumber;
                } else {
                    showMessage("Número de assento inválido. Por favor, digite um número inteiro positivo.", false);
                }
            }
        }
    });


    // O layoutWrapper.addEventListener('click') deve conter TODA a lógica de clique de assentos/botões internos
    if (layoutWrapper) {
        layoutWrapper.addEventListener('click', (event) => {
            let target = event.target;
            if (contextMenu && contextMenu.contains(target)) return; // VERIFICA SE contextMenu EXISTE

            if (target.classList.contains('seat-number') && target.parentElement.classList.contains('seat')) {
                target = target.parentElement;
            }

            if (contextMenu && contextMenu.style.display === 'block' && target !== currentEditingSeatTd && !target.classList.contains('add-door-btn')) { // VERIFICA SE contextMenu EXISTE
                hideContextMenu();
            }

            if (target.tagName === 'TD' && target.classList.contains('seat') && !target.classList.contains('ocupado')) {
                if (currentEditingSeatTd === target) {
                    hideContextMenu();
                    return;
                }
                currentEditingSeatTd = target;
                const rect = target.getBoundingClientRect();
                contextMenu.style.top = `${window.scrollY + rect.bottom + 2}px`;
                contextMenu.style.left = `${window.scrollX + rect.left}px`;
                contextMenu.style.display = 'block';
                toggleStatusBtn.textContent = target.classList.contains('desabilitado') ? 'Habilitar Assento' : 'Desabilitar Assento';
            }
            else if (event.target.classList.contains('btn-add-seat')) {
                console.log('Botão "+" clicado!'); // DEBUG LOG
                const seatTd = event.target.closest('td');
                if (seatTd && seatTd.classList.contains('espaco')) {
                    const newSeatNumber = prompt("Digite o número para este assento:", "");
                    if (newSeatNumber !== null && newSeatNumber.trim() !== "") {
                        const parsedNumber = parseInt(newSeatNumber.trim(), 10);
                        if (!isNaN(parsedNumber) && parsedNumber > 0) {
                            const existingSeat = document.querySelector(`.seat[data-seat-number="${parsedNumber}"]`);
                            if (existingSeat) {
                                showMessage(`O número de assento ${parsedNumber} já está em uso.`, false);
                                return;
                            }

                            seatTd.className = 'seat habilitado';
                            seatTd.dataset.seatNumber = parsedNumber;
                            seatTd.innerHTML = `
                                <span class='seat-number'>${parsedNumber}</span>
                                <div class='seat-actions'>
                                    <button type='button' class='btn-add-seat' title='Adicionar Assento'>+</button>
                                    <button type='button' class='btn-remove-seat' title='Remover Assento'>-</button>
                                </div>
                            `;
                        } else {
                            showMessage("Número de assento inválido. Por favor, digite um número inteiro positivo.", false);
                        }
                    } else {
                        showMessage("Número do assento é obrigatório para adicionar.", false);
                    }
                }
            } else if (event.target.classList.contains('btn-remove-seat')) {
                console.log('Botão "-" clicado!'); // DEBUG LOG
                const seatTd = event.target.closest('td');
                if (seatTd && seatTd.classList.contains('seat') && seatTd.dataset.seatNumber) {
                    const seatNumber = seatTd.dataset.seatNumber;
                    if (confirm(`Tem certeza que deseja remover o assento ${seatNumber}?`)) {
                        seatTd.className = 'espaco';
                        seatTd.removeAttribute('data-seat-number');
                        seatTd.querySelector('.seat-number')?.remove();

                        const numRemoved = parseInt(seatNumber, 10);
                        const indexInArray = desabilitadosAtualmente.indexOf(numRemoved);
                        if (indexInArray > -1) {
                            desabilitadosAtualmente.splice(indexInArray, 1);
                            atualizarInputDesabilitados();
                        }

                        if (!seatTd.querySelector('.seat-actions')) {
                            seatTd.innerHTML += `
                                <div class='seat-actions'>
                                    <button type='button' class='btn-add-seat' title='Adicionar Assento'>+</button>
                                    <button type='button' class='btn-remove-seat' title='Remover Assento'>-</button>
                                </div>
                            `;
                        } else {
                             const existingActionsDiv = seatTd.querySelector('.seat-actions');
                             existingActionsDiv.innerHTML = `
                                <button type='button' class='btn-add-seat' title='Adicionar Assento'>+</button>
                                <button type='button' class='btn-remove-seat' title='Remover Assento'>-</button>
                             `;
                        }
                    }
                }
            } else if (target.classList.contains('add-door-btn') && target.dataset.insertAfterSeat && target.dataset.doorIndex) {
                hideContextMenu();
                const seatNum = parseInt(target.dataset.insertAfterSeat, 10);
                const doorIndex = parseInt(target.dataset.doorIndex, 10);

                const seatCell = document.querySelector(`td.seat[data-seat-number="${seatNum}"]`);
                const seatRow = seatCell ? seatCell.closest('tr') : null;

                if (seatRow) {
                    if (!seatRow.hasAttribute('data-tr-after-seat')) {
                        seatRow.setAttribute('data-tr-after-seat', seatNum);
                    }

                    if (portaAposAssento[doorIndex] === seatNum) {
                        portaAposAssento[doorIndex] = null;
                    } else {
                        if (portaAposAssento[doorIndex] !== null) {
                            updateDoorRow(portaAposAssento[doorIndex]);
                        }
                        portaAposAssento[doorIndex] = seatNum;
                    }

                    updateDoorRow(seatNum);
                    hiddenInputDoors.value = JSON.stringify(portaAposAssento);
                }
            }
        }); // FIM DO layoutWrapper.addEventListener('click')
    }

    // --- LÓGICA DOS BOTÕES DO MENU DE CONTEXTO ---
    if (toggleStatusBtn) { // ADICIONA VERIFICAÇÃO
        toggleStatusBtn.addEventListener('click', () => {
            if (!currentEditingSeatTd) return;
            const seatNumberStr = currentEditingSeatTd.dataset.seatNumber;
            const seatNumber = parseInt(seatNumberStr, 10);

            if (!seatNumberStr || isNaN(seatNumber) || seatNumber <= 0) {
                showMessage("Assento precisa ter um número válido.", false);
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
            atualizarInputDesabilitados();
            hideContextMenu();
        });
    }

    if (removeSeatBtnContextMenu) { // ADICIONA VERIFICAÇÃO, USA O NOVO NOME DA VARIAVEL
        removeSeatBtnContextMenu.addEventListener('click', () => {
            if (!currentEditingSeatTd) return;

            const seatNumText = currentEditingSeatTd.querySelector('.seat-number')?.textContent || 'este';
            if (!confirm(`Tem certeza que deseja remover o assento ${seatNumText}?`)) {
                hideContextMenu();
                return;
            }

            currentEditingSeatTd.className = 'espaco';
            currentEditingSeatTd.removeAttribute('data-seat-number');
            currentEditingSeatTd.querySelector('.seat-number')?.remove();

            if (!currentEditingSeatTd.querySelector('.seat-actions')) {
                 currentEditingSeatTd.innerHTML += `
                    <div class='seat-actions'>
                        <button type='button' class='btn-add-seat' title='Adicionar Assento'>+</button>
                        <button type='button' class='btn-remove-seat' title='Remover Assento'>-</button>
                    </div>
                `;
            }

            const seatNumber = parseInt(seatNumText, 10);
            const indexInArray = desabilitadosAtualmente.indexOf(seatNumber);
            if (indexInArray > -1) {
                desabilitadosAtualmente.splice(indexInArray, 1);
                atualizarInputDesabilitados();
            }

            hideContextMenu();
        });
    }

    if (cancelMenuBtn) { // ADICIONA VERIFICAÇÃO
        cancelMenuBtn.addEventListener('click', () => {
            hideContextMenu();
        });
    }


    // --- LÓGICA DOS BOTÕES DE SUBMISSÃO (NOVO E SALVAR) ---
    if (btnSaveChanges) {
        btnSaveChanges.addEventListener('click', () => {
            saveActionInput.value = 'update'; // Define a ação como 'update'
        });
    }
    if (btnSaveAsNew) {
        btnSaveAsNew.addEventListener('click', () => {
            saveActionInput.value = 'insert_new'; // Define a ação como 'insert_new'
        });
    }

    // --- Submissão do formulário via AJAX ---
    if (formOnibus) {
        formOnibus.addEventListener('submit', async (event) => {
            console.log('2. Evento de submit do formulário disparado.'); // Log de depuração
            event.preventDefault(); // Impede o envio tradicional do formulário por padrão

            const currentSaveAction = saveActionInput.value; // Obtém a ação selecionada

            // Confirmação antes de salvar
            if (currentSaveAction === 'update') {
                if (!confirm("Tem certeza que deseja SALVAR as alterações neste layout?")) {
                    return; // Aborta a submissão se o usuário cancelar
                }
            } else if (currentSaveAction === 'insert_new') {
                if (!confirm("Tem certeza que deseja CRIAR um NOVO layout com essas configurações?")) {
                    return; // Aborta a submissão se o usuário cancelar
                }
            }

            const nomeMapa = nomeMapaInput.value.trim();
            if (!nomeMapa) {
                showMessage("O nome do mapa é obrigatório.", false);
                return; // Impede a submissão se o nome estiver vazio
            }

            const formData = new FormData(formOnibus);

            try {
                const response = await fetch('salvar_layout.php', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    showMessage(result.message, true);
                    if (result.is_new_layout) {
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    }
                    if (result.id && layoutIdInput.value !== result.id) {
                         layoutIdInput.value = result.id;
                    }
                    if (result.new_name && nomeMapaInput.value !== result.new_name) {
                        nomeMapaInput.value = result.new_name;
                    }

                } else {
                    showMessage(result.message, false);
                }
            } catch (error) {
                console.error('Erro ao salvar layout:', error);
                showMessage('Ocorreu um erro ao salvar o layout. Tente novamente.', false);
            }
        });
    } else {
        console.error("Erro: Elemento 'form-layout-onibus' não encontrado no DOM. O listener de submit não foi anexado.");
    }

}); // Fim DOMContentLoaded