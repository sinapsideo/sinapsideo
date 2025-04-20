document.addEventListener('DOMContentLoaded', () => {
    console.log("[Init] DOMContentLoaded disparado.");

    // --- Seletores Globais ---
    const tabLinks = document.querySelectorAll('.tab-nav .tab-link');
    const tabContents = document.querySelectorAll('.tab-content-wrapper .tab-content');
    const notesTabNav = document.querySelector('.notes-tab-nav');
    const notesContentArea = document.querySelector('.notes-content-area');
    const addNoteTabBtn = document.getElementById('add-note-tab-btn');
    const saveNoteBtn = document.getElementById('save-current-note-btn');
    const deleteNoteBtn = document.getElementById('delete-current-note-btn');
    const noteStatus = document.getElementById('note-status');
    const placeholder = document.querySelector('.note-editor-placeholder');
    const medSearchBtn = document.getElementById('med-search-btn');
    const medSearchInput = document.getElementById('med-search-input');
    const medResultsArea = document.getElementById('med-results-area');

    // --- Estado Global das Notas ---
    let notes = {}; // { noteId: { title: string, content: string, saved: boolean, editorElement: HTMLTextAreaElement | null } }
    let activeNoteId = null; // Guarda o ID (string) da nota ativa
    let noteCounter = 0; // Contador para IDs temporários
    let saveTimeout = null; // Referência para o timeout do autosave
    let isSaving = false; // Flag global para prevenir saves concorrentes
    let notesLoaded = false; // Flag para controlar o carregamento inicial das notas

    // --- Verificação de Elementos Essenciais ---
    if (!notesTabNav || !notesContentArea || !addNoteTabBtn || !saveNoteBtn || !deleteNoteBtn || !noteStatus || !placeholder) {
        console.error("!!! ALERTA CRÍTICO: Um ou mais elementos essenciais da interface MedNotes não foram encontrados. Verifique os IDs no HTML. Funcionalidade de notas pode estar quebrada. !!!");
        if(noteStatus) noteStatus.textContent = "Erro: Interface de notas quebrada.";
        // Considerar desabilitar toda a funcionalidade de notas se elementos críticos faltam
    } else {
        console.log("[Init] Elementos principais de MedNotes encontrados.");
    }

    // =====================================================
    // --- FUNÇÕES AUXILIARES ---
    // =====================================================

    /** Mostra mensagem de status na barra inferior */
    const showStatus = (message, type = 'info', duration = 3000) => {
        if (!noteStatus) return;
        if (noteStatus.timeoutId) clearTimeout(noteStatus.timeoutId);
        noteStatus.textContent = message;
        noteStatus.className = `status-message ${type}`; // Aplica a classe de tipo
        if (type !== 'saving' && duration > 0) {
             noteStatus.timeoutId = setTimeout(() => {
                if (noteStatus.textContent === message) { noteStatus.textContent = ''; noteStatus.className = 'status-message'; }
                noteStatus.timeoutId = null;
             }, duration);
        } else {
             noteStatus.timeoutId = null;
        }
    };

    /** Função auxiliar para escapar HTML (Prevenção básica de XSS) */
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') {
            try { unsafe = String(unsafe); } catch (e) { return ''; }
        }
        return unsafe.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    /** Salva a ordem atual das abas e o ID da aba ativa no localStorage */
    const saveTabOrderAndActiveState = () => {
        if (!notesTabNav) return;
        const tabButtons = notesTabNav.querySelectorAll('.note-tab-button[data-note-id]');
        const currentTabOrder = Array.from(tabButtons)
            .map(button => button.dataset.noteId)
            .filter(id => id && !id.startsWith('new-')); // Salva apenas IDs reais
        try {
            localStorage.setItem('mednotesTabOrder', JSON.stringify(currentTabOrder));
            console.log('[Order] Ordem das abas salva:', currentTabOrder);
            if (activeNoteId && !activeNoteId.toString().startsWith('new-')) {
                localStorage.setItem('mednotesLastActiveId', activeNoteId);
                console.log('[Order] Último ID ativo salvo:', activeNoteId);
            } else {
                 localStorage.removeItem('mednotesLastActiveId');
                 console.log('[Order] Nenhum ID ativo válido para salvar.');
            }
        } catch (e) {
            console.error('[Order] Erro ao salvar estado no localStorage:', e);
            showStatus('Erro ao salvar preferências de abas.', 'error', 5000);
        }
    };

    // =====================================================
    // --- LÓGICA PRINCIPAL DAS ABAS (NÃO MEDNOTES) ---
    // =====================================================
    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            const tabId = link.getAttribute('data-tab');
            if (!tabId || link.classList.contains('active')) return;
            console.log(`[Tabs] Clicou na aba principal: ${tabId}`);
            tabLinks.forEach(l => l.classList.remove('active'));
            tabContents.forEach(c => { c.classList.remove('active'); c.style.display = 'none'; });
            link.classList.add('active');
            const activeContent = document.getElementById(tabId);
            if (activeContent) {
                activeContent.classList.add('active');
                activeContent.style.display = 'block';
                console.log(`[Tabs] Conteúdo da aba ${tabId} ativado.`);
                if (tabId === 'mednotes' && !notesLoaded) {
                    console.log("[Tabs] Carregando notas ao ativar aba MedNotes...");
                    loadNotes();
                }
            } else {
                console.error(`[Tabs] Conteúdo da aba não encontrado para id: ${tabId}`);
            }
        });
    });

    // =====================================================
    // --- CALCULADORAS, BULÁRIO, TEMPLATES ---
    // =====================================================

    // Função IMC
    window.calcularIMC = function() { /* ... (seu código IMC como antes) ... */
        const pesoInput = document.getElementById('peso'); const alturaInput = document.getElementById('altura'); const resultadoEl = document.getElementById('resultadoIMC'); const resultadoP = resultadoEl ? resultadoEl.closest('.result-output') : null; if (!pesoInput || !alturaInput || !resultadoEl || !resultadoP) return; resultadoP.classList.remove('error'); resultadoEl.textContent = '--'; const peso = parseFloat(pesoInput.value); const altura = parseFloat(alturaInput.value); if (isNaN(peso) || isNaN(altura) || altura <= 0 || peso <= 0) { resultadoEl.textContent = 'Inválido'; resultadoP.classList.add('error'); return; } resultadoEl.textContent = (peso / (altura * altura)).toFixed(2);
    }
    // Função Cockcroft-Gault
    window.calcularCockcroftGault = function() { /* ... (seu código Cockcroft como antes) ... */
        const idadeInput = document.getElementById('idade'); const pesoInput = document.getElementById('peso_cg'); const creatininaInput = document.getElementById('creatinina_serica'); const sexoSelect = document.getElementById('sexo_cg'); const resultadoEl = document.getElementById('resultadoCG'); const resultadoP = resultadoEl ? resultadoEl.closest('.result-output') : null; if (!idadeInput || !pesoInput || !creatininaInput || !sexoSelect || !resultadoEl || !resultadoP) return; resultadoP.classList.remove('error'); resultadoEl.textContent = '--'; const idade = parseInt(idadeInput.value); const peso = parseFloat(pesoInput.value); const creatinina = parseFloat(creatininaInput.value); const sexo = sexoSelect.value; if (isNaN(idade) || isNaN(peso) || isNaN(creatinina) || idade <= 0 || peso <= 0 || creatinina <= 0) { resultadoEl.textContent = 'Inválido'; resultadoP.classList.add('error'); return; } let clearance = ((140 - idade) * peso) / (72 * creatinina); if (sexo === 'feminino') clearance *= 0.85; resultadoEl.textContent = clearance.toFixed(2);
    }
    // Função Superfície Corporal (Mosteller)
    window.calcularSC = function() { /* ... (seu código SC como antes) ... */
        const pesoInput = document.getElementById('peso_sc'); const alturaInput = document.getElementById('altura_sc'); const resultadoEl = document.getElementById('resultadoSC'); const resultadoP = resultadoEl ? resultadoEl.closest('.result-output') : null; if (!pesoInput || !alturaInput || !resultadoEl || !resultadoP) return; resultadoP.classList.remove('error'); resultadoEl.textContent = '--'; const peso = parseFloat(pesoInput.value); const alturaCm = parseFloat(alturaInput.value); if (isNaN(peso) || isNaN(alturaCm) || peso <= 0 || alturaCm <= 0) { resultadoEl.textContent = 'Inválido'; resultadoP.classList.add('error'); return; } resultadoEl.textContent = Math.sqrt((peso * alturaCm) / 3600).toFixed(3);
    }
    // Função Copiar Template (Evoluções)
    window.copyTemplate = function(button) { /* ... (seu código copyTemplate como antes) ... */
        const textarea = button.previousElementSibling; if (textarea && textarea.tagName === 'TEXTAREA') { navigator.clipboard.writeText(textarea.value).then(() => { const originalText = button.dataset.originalText || 'Copiar Modelo'; button.innerHTML = '<i class="fas fa-check"></i> Copiado!'; button.style.backgroundColor = '#28a745'; button.disabled = true; setTimeout(() => { button.innerHTML = `<i class="fas fa-copy"></i> ${originalText}`; button.style.backgroundColor = ''; button.disabled = false; }, 2000); }).catch(err => { console.error('Erro ao copiar texto: ', err); textarea.select(); textarea.setSelectionRange(0, 99999); alert('Erro ao copiar. Texto selecionado (Ctrl+C).'); }); }
    }
    // Função Buscar Medicamentos (Bulário)
    const buscarMedicamentos = async () => { /* ... (seu código buscarMedicamentos como antes) ... */
         if (!medSearchInput || !medResultsArea || !medSearchBtn) return; const searchTerm = medSearchInput.value.trim(); if (searchTerm.length < 2) { medResultsArea.innerHTML = '<p>Digite pelo menos 2 caracteres.</p>'; return; } medResultsArea.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Buscando...</p>'; medSearchBtn.disabled = true; medSearchInput.disabled = true; try { const response = await fetch('api/meds_handler.php', { method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: `action=search&term=${encodeURIComponent(searchTerm)}` }); if (!response.ok) throw new Error(`Erro rede: ${response.status}`); const data = await response.json(); if (data.success && Array.isArray(data.medications) && data.medications.length > 0) { medResultsArea.innerHTML = ''; data.medications.forEach(med => { const medDiv = document.createElement('div'); medDiv.classList.add('med-item'); medDiv.innerHTML = `<h4>${escapeHtml(med.name)}</h4><p><strong>Descrição:</strong> ${escapeHtml(med.description||'N/A')}</p><p><strong>Forma de Uso:</strong> ${escapeHtml(med.usage_info||'N/A')}</p><p><strong>Contraindicações:</strong> ${escapeHtml(med.contraindications||'N/A')}</p>`; medResultsArea.appendChild(medDiv); }); } else if (data.success) { medResultsArea.innerHTML = `<p>Nenhum medicamento encontrado para "${escapeHtml(searchTerm)}".</p>`; } else { medResultsArea.innerHTML = `<p class="error-message">Erro: ${escapeHtml(data.message||'Erro desconhecido')}</p>`; } } catch (error) { console.error('Erro busca meds:', error); medResultsArea.innerHTML = `<p class="error-message">Erro ao conectar (${escapeHtml(error.message)}).</p>`; } finally { medSearchBtn.disabled = false; medSearchInput.disabled = false; }
    };
    if (medSearchBtn) medSearchBtn.addEventListener('click', buscarMedicamentos);
    if (medSearchInput) medSearchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') buscarMedicamentos(); });


    // =====================================================
    // --- MEDNOTES: Funções Principais ---
    // =====================================================

    /** Habilita/desabilita botões Salvar/Excluir e mostra/esconde placeholder */
    const updateActionButtons = () => {
        if (!saveNoteBtn || !deleteNoteBtn || !placeholder) return; // Sai se elementos não existem
        const hasActiveNote = activeNoteId !== null && notes[activeNoteId];
        const isActiveNoteUnsaved = hasActiveNote && notes[activeNoteId].saved === false;
        saveNoteBtn.disabled = !(hasActiveNote && isActiveNoteUnsaved && !isSaving);
        deleteNoteBtn.disabled = !(hasActiveNote && !isSaving);
        placeholder.style.display = hasActiveNote ? 'none' : 'flex';
        // console.log(`[Buttons] Updated. Active: ${activeNoteId}, Unsaved: ${isActiveNoteUnsaved}, Saving: ${isSaving}. SaveBtn Enabled: ${!saveNoteBtn.disabled}, DelBtn Enabled: ${!deleteNoteBtn.disabled}`);
    };

    /** Cria o elemento <textarea> para uma nota, ou reutiliza se já existir no DOM */
    const createEditor = (noteId) => {
        if (!notes[noteId] || !notesContentArea) {
            console.error(`[Editor] createEditor: Nota ${noteId} ou notesContentArea não encontrado.`);
            return null;
        }

        let editor = notesContentArea.querySelector(`#editor-${noteId}`);
        if (editor) {
            console.log(`[Editor] Reutilizando editor DOM para ${noteId}.`);
            if (notes[noteId].content !== editor.value) {
                editor.value = notes[noteId].content || '';
            }
            if (!notes[noteId].editorElement || notes[noteId].editorElement !== editor) {
                 notes[noteId].editorElement = editor; // Garante associação correta
            }
            return editor;
        }

        console.log(`[Editor] Criando novo editor para ${noteId}`);
        editor = document.createElement('textarea');
        editor.id = `editor-${noteId}`; // ID USA O NOTEID CORRETO
        editor.classList.add('note-editor');
        editor.placeholder = 'Comece a digitar sua nota aqui...';
        editor.value = notes[noteId].content || '';
        editor.style.display = 'none';

        editor.addEventListener('input', (e) => {
            const currentEditor = e.target;
            // Pega o ID DA NOTA a partir do ID DO EDITOR que disparou o evento
            const editorNoteId = currentEditor.id.replace('editor-', '');
            // console.log(`[Editor] Input event on ${currentEditor.id}. Editor's Note ID: ${editorNoteId}. Active Note ID: ${activeNoteId}.`);

            // Verifica se a nota ATIVA é a MESMA do editor E se a nota AINDA EXISTE no objeto 'notes'
            if (activeNoteId === editorNoteId && notes[editorNoteId]) {
                const currentContentInEditor = currentEditor.value;
                const previousContentInObject = notes[editorNoteId].content;

                if (previousContentInObject !== currentContentInEditor) {
                    notes[editorNoteId].content = currentContentInEditor; // Atualiza conteúdo no objeto

                    if (notes[editorNoteId].saved === true) {
                        notes[editorNoteId].saved = false; // Marca como NÃO salvo
                        console.log(`[Editor] Nota ${editorNoteId} marcada como NÃO SALVA.`);
                        showStatus('Alterações não salvas...', 'info', 5000);
                        updateActionButtons(); // Habilita botão salvar
                    }
                    // Se já estava false, não precisa mostrar status de novo, mas botões podem precisar atualizar se isSaving mudou
                    else {
                        updateActionButtons();
                    }


                    // Agenda autosave, verificando se não está salvando no momento do timeout
                    clearTimeout(saveTimeout);
                    saveTimeout = setTimeout(() => {
                        // Verifica tudo de novo + !isSaving
                        if (!isSaving && activeNoteId === editorNoteId && notes[editorNoteId] && notes[editorNoteId].saved === false) {
                            console.log(`[Editor] Autosave disparado para ${editorNoteId}`);
                            saveNote(editorNoteId, true); // Chama autosave com o ID correto
                        } else {
                             console.log(`[Editor] Autosave cancelado para ${editorNoteId} (isSaving: ${isSaving}, not active, not unsaved, etc.).`);
                        }
                    }, 2500);
                }
            } else {
                 console.warn(`[Editor] Input no editor ${currentEditor.id}, mas não é a nota ativa (${activeNoteId}) ou a nota ${editorNoteId} não existe mais. Ignorando.`);
            }
        });

        // Associa ao objeto notes ANTES de adicionar ao DOM
        if (notes[noteId]) {
             notes[noteId].editorElement = editor;
        } else {
             console.error(`[Editor] Nota ${noteId} sumiu ANTES de associar editor!`);
             return null; // Não adiciona ao DOM
        }
        notesContentArea.appendChild(editor);
        console.log(`[Editor] Editor para ${noteId} criado e adicionado.`);
        return editor;
    };

    /** Cria o botão da aba para uma nota */
    const createNoteTab = (noteId, title) => {
        if (!notesTabNav || !addNoteTabBtn) { console.error("[Tabs] createNoteTab: Nav/AddBtn não encontrado."); return null; }
        console.log(`[Tabs] Criando botão da aba - ID inicial: ${noteId}, Título: "${title}"`);

        const tabButton = document.createElement('button');
        tabButton.dataset.noteId = noteId; // ID inicial (pode ser 'new-...')
        tabButton.classList.add('note-tab-button');

        const titleContainer = document.createElement('div');
        titleContainer.className = 'note-title-container';
        titleContainer.title = title;

        const titleSpan = document.createElement('span');
        titleSpan.className = 'note-title-span';
        titleSpan.textContent = title;
        titleContainer.appendChild(titleSpan);

        titleContainer.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            const currentNoteId = tabButton.dataset.noteId; // Lê ID ATUAL
            console.log(`[Tabs] Dblclick para editar título de ${currentNoteId}`);
            if (!notes[currentNoteId]) { console.error(`[Tabs] Nota ${currentNoteId} não encontrada para editar.`); return; }
            handleTitleEdit(currentNoteId, tabButton, titleContainer, titleSpan);
        });

        const closeBtn = document.createElement('button');
        closeBtn.classList.add('close-note-btn');
        closeBtn.setAttribute('aria-label', 'Excluir nota');
        closeBtn.title = 'Excluir esta nota';
        closeBtn.innerHTML = '<i class="fas fa-times" aria-hidden="true"></i>';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const currentNoteId = tabButton.dataset.noteId; // Lê ID ATUAL
            console.log(`[Tabs] CloseBtn clicado para ${currentNoteId}`);
            deleteNote(currentNoteId);
        });

        tabButton.appendChild(titleContainer);
        tabButton.appendChild(closeBtn);

        tabButton.addEventListener('click', (e) => {
             const currentNoteId = tabButton.dataset.noteId; // Lê ID ATUAL
             if (e.target.closest('.close-note-btn') || tabButton.querySelector('.edit-title-input')) {
                 return; // Ignora clique no X ou durante edição
             }
             if(activeNoteId !== currentNoteId) { // Só ativa se não for a ativa
                console.log(`[Tabs] Click para ativar ${currentNoteId}`);
                activateNoteTab(currentNoteId);
             } else {
                 console.log(`[Tabs] Click na aba ${currentNoteId} que já está ativa.`);
                 // Foca o editor se possível
                 if(notes[currentNoteId]?.editorElement) notes[currentNoteId].editorElement.focus();
             }
        });

        notesTabNav.insertBefore(tabButton, addNoteTabBtn);
        console.log(`[Tabs] Botão da aba ${noteId} inserido.`);
        return tabButton;
    };

    /** Lida com a edição do título da nota na aba */
    const handleTitleEdit = (noteId, tabButton, titleContainer, titleSpan) => {
        if (!notes[noteId]) { console.error(`[TitleEdit] Nota ${noteId} não encontrada.`); return; }
        if (document.querySelector('.edit-title-input')) { console.warn("[TitleEdit] Edição já ativa."); return; }
        console.log(`[TitleEdit] Iniciando edição para ${noteId}`);

        const originalTitle = notes[noteId].title;
        const input = document.createElement('input');
        input.type = 'text'; input.className = 'edit-title-input'; input.value = originalTitle;
        input.setAttribute('aria-label', 'Editar título');

        titleContainer.style.display = 'none';
        const closeBtnRef = tabButton.querySelector('.close-note-btn');
        if (closeBtnRef) tabButton.insertBefore(input, closeBtnRef);
        else tabButton.appendChild(input);

        input.focus(); input.select();
        let escaped = false;

        const completeEdit = () => {
            input.removeEventListener('blur', completeEdit); input.removeEventListener('keydown', handleKeyDown);
            if (input.parentNode === tabButton) tabButton.removeChild(input);
            titleContainer.style.display = '';

            if (escaped) {
                console.log(`[TitleEdit] Edição cancelada para ${noteId}.`);
                titleSpan.textContent = originalTitle; titleContainer.title = originalTitle; return;
            }
            const newTitle = input.value.trim();

            // Verifica se mudou E se a nota ainda existe com o ID original (importante se houve update de ID concorrente)
            if (newTitle && newTitle !== originalTitle && notes[noteId]) {
                console.log(`[TitleEdit] Título alterado para ${noteId}: "${newTitle}"`);
                notes[noteId].title = newTitle; notes[noteId].saved = false; // Marca como não salvo
                titleSpan.textContent = newTitle; titleContainer.title = newTitle;
                updateActionButtons();
                showStatus('Título alterado. Salvando...', 'info');
                saveNote(noteId, false); // Salva a mudança (passa o ID com o qual a edição começou)
            } else {
                console.log(`[TitleEdit] Título não alterado ou inválido para ${noteId}. Restaurando: "${originalTitle}"`);
                titleSpan.textContent = originalTitle; titleContainer.title = originalTitle;
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
            else if (e.key === 'Escape') { escaped = true; input.blur(); }
            e.stopPropagation();
        };
        input.addEventListener('blur', completeEdit); input.addEventListener('keydown', handleKeyDown);
        input.addEventListener('click', (e) => e.stopPropagation());
    };

    /** Ativa uma aba de nota específica e seu editor */
    const activateNoteTab = (noteId) => {
        const noteIdStr = noteId ? noteId.toString() : null;
        console.log(`[Activate] Tentando ativar: ${noteIdStr}. Ativa atual: ${activeNoteId}`);

        if (!noteIdStr) { console.error("[Activate] ID inválido fornecido."); return; }

        // Se já está ativa, apenas retorna (ou foca, mas evita reprocessamento)
        if (activeNoteId === noteIdStr) {
            console.log(`[Activate] Nota ${noteIdStr} já ativa.`);
            if (notes[noteIdStr]?.editorElement?.focus) setTimeout(()=>notes[noteIdStr].editorElement.focus(),0);
            return;
        }

        // Verifica se a nota alvo existe no objeto 'notes'
        if (!notes[noteIdStr]) {
            console.error(`[Activate] Nota ${noteIdStr} não encontrada no objeto 'notes'.`);
            // Tenta fallback para outra aba se esta sumiu
            activeNoteId = null; // Reseta ativo
            const firstRemainingTab = notesTabNav.querySelector('.note-tab-button[data-note-id]');
            if (firstRemainingTab) {
                console.log(`[Activate] Fallback para: ${firstRemainingTab.dataset.noteId}`);
                setTimeout(() => activateNoteTab(firstRemainingTab.dataset.noteId), 0); // Evita recursão síncrona
            } else {
                console.log("[Activate] Nenhuma aba restante para fallback.");
                updateActionButtons();
                saveTabOrderAndActiveState();
            }
            return;
        }

        // --- Desativação da Aba Anterior ---
        if (activeNoteId !== null && notes[activeNoteId]) { // Desativa só se existia uma ativa e ela ainda está no objeto
            const previousTab = notesTabNav.querySelector(`.note-tab-button[data-note-id="${activeNoteId}"]`);
            if (previousTab) previousTab.classList.remove('active-note-tab');
            if (notes[activeNoteId].editorElement) notes[activeNoteId].editorElement.style.display = 'none';
            console.log(`[Activate] Aba/Editor anterior ${activeNoteId} desativado/oculto.`);
        } else if (activeNoteId !== null) {
            console.warn(`[Activate] Nota ativa anterior ${activeNoteId} não encontrada no objeto 'notes' ao tentar desativar.`);
            // Remove a classe 'active' de qualquer aba que ainda possa tê-la (limpeza)
            notesTabNav.querySelectorAll('.note-tab-button.active-note-tab').forEach(t => t.classList.remove('active-note-tab'));
        }
         // --- Fim Desativação ---

        // --- Ativação da Nova Aba ---
        const newActiveTab = notesTabNav.querySelector(`.note-tab-button[data-note-id="${noteIdStr}"]`);
        if (!newActiveTab) {
             console.error(`[Activate] Botão da aba ${noteIdStr} não encontrado no DOM para ativar!`);
             activeNoteId = null; updateActionButtons(); saveTabOrderAndActiveState(); // Reseta e salva estado
             return;
        }
        newActiveTab.classList.add('active-note-tab');
        const previousActiveId = activeNoteId; // Guarda o anterior para log
        activeNoteId = noteIdStr; // Define a nova nota ativa
        console.log(`[Activate] Aba ${activeNoteId} marcada como ativa (anterior: ${previousActiveId}).`);
         // --- Fim Ativação Aba ---

        // --- Gerencia Editor da Nota Ativa ---
        let editor = notes[activeNoteId].editorElement;
        // Cria ou reutiliza o editor, garantindo que esteja no DOM e associado
        if (!editor || !document.body.contains(editor)) {
             if(editor && !document.body.contains(editor)) {
                 console.warn(`[Activate] Editor ${activeNoteId} fora do DOM. Recriando.`);
                 editor.remove(); // Tenta remover se perdido
                 notes[activeNoteId].editorElement = null;
             }
             editor = createEditor(activeNoteId);
             if (!editor) { console.error(`[Activate] Falha ao criar editor para ${activeNoteId}.`); activeNoteId = null; updateActionButtons(); saveTabOrderAndActiveState(); return; }
        } else {
            // Se reutilizando, garante que o conteúdo está atualizado
             if (editor.value !== notes[activeNoteId].content) {
                 editor.value = notes[activeNoteId].content || '';
             }
        }

        // Mostra o editor correto e foca nele
        editor.style.display = 'block';
        setTimeout(() => editor.focus(), 50);
        console.log(`[Activate] Editor ${activeNoteId} exibido/focado.`);
         // --- Fim Gerencia Editor ---

        // Atualiza status e botões para refletir o estado da nota recém-ativada
        updateActionButtons();
        if (notes[activeNoteId].saved === true) {
            if (noteStatus && !noteStatus.classList.contains('error') && !noteStatus.classList.contains('saving')) { noteStatus.textContent = ''; noteStatus.className = 'status-message'; }
        } else {
             showStatus('Alterações não salvas...', 'info', 5000);
        }

        // Salva o novo estado ativo (e a ordem atual, que não mudou)
        saveTabOrderAndActiveState();

        // Scroll da aba para a visão
        if (newActiveTab.scrollIntoView) newActiveTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
   };

    /** Adiciona uma nova nota (interface/local) ou carrega uma existente (da API) */
    const addNewNote = (noteData = null) => {
        let noteId, title, content, savedState, isNew;
        if (noteData && noteData.id) { // Carregando
            noteId = noteData.id.toString(); // Garante string
            title = noteData.title ? noteData.title.trim() : `Nota ${noteId}`; if (!title) title = `Nota ${noteId}`;
            content = noteData.content || ''; savedState = true; isNew = false;
            if (notes[noteId]) { console.warn(`[AddNote] Nota ${noteId} já existe. Pulando.`); return; }
            notes[noteId] = { title, content, saved: savedState, editorElement: null };
            console.log(`[AddNote] Carregando nota: ID ${noteId}, Título "${title}"`);
        } else { // Nova
            noteCounter++; noteId = `new-${Date.now()}-${noteCounter}`; title = `Nova Nota ${noteCounter}`;
            content = ''; savedState = false; isNew = true;
            notes[noteId] = { title, content, saved: savedState, editorElement: null };
            console.log(`[AddNote] Criando nota nova: ID temp ${noteId}, Título "${title}"`);
        }

        const tabButton = createNoteTab(noteId, title); // Cria o botão da aba
        if (tabButton) {
            // Ativa a nota imediatamente (seja nova ou carregada)
            activateNoteTab(noteId);
            // Se for nova, salva para obter ID real
            if (isNew) {
                showStatus('Nota criada. Salvando...', 'info');
                // Passa o botão para saveNote poder atualizar seu dataset
                saveNote(noteId, false, tabButton);
            }
        } else {
            console.error(`[AddNote] Falha ao criar aba para ${noteId}. Removendo do objeto.`);
            if (notes[noteId]) delete notes[noteId];
            showStatus('Erro ao criar aba.', 'error');
        }
    };

    /** Remove a aba/editor da UI e a nota do objeto local */
    const closeNoteUI = (noteIdToClose) => {
        const noteIdStr = noteIdToClose.toString();
        console.log(`[CloseUI] Iniciando para ${noteIdStr}`);
        const note = notes[noteIdStr];

        const tabButton = notesTabNav.querySelector(`.note-tab-button[data-note-id="${noteIdStr}"]`);
        if (tabButton) tabButton.remove();
        else console.warn(`[CloseUI] Botão aba ${noteIdStr} não encontrado.`);

        if (note?.editorElement) {
            if(document.body.contains(note.editorElement)) note.editorElement.remove();
            note.editorElement = null; // Limpa referência
        }

        if (notes[noteIdStr]) delete notes[noteIdStr];
        else console.warn(`[CloseUI] Nota ${noteIdStr} já não existia no objeto.`);

        // Salva a nova ordem das abas restantes ANTES de decidir qual ativar
        saveTabOrderAndActiveState();
        console.log(`[CloseUI] Ordem salva após remover ${noteIdStr}.`);

        // Se a fechada era a ativa, ativa a última restante (se houver)
        if (activeNoteId === noteIdStr) {
            activeNoteId = null;
            const remainingTabs = notesTabNav.querySelectorAll('.note-tab-button[data-note-id]');
            if (remainingTabs.length > 0) {
                 const lastTabId = remainingTabs[remainingTabs.length - 1].dataset.noteId;
                 console.log(`[CloseUI] ${noteIdStr} era ativa. Ativando última: ${lastTabId}`);
                 activateNoteTab(lastTabId); // Isto salvará o novo estado ativo
             } else {
                 console.log(`[CloseUI] ${noteIdStr} era ativa. Nenhuma aba restante.`);
                 updateActionButtons(); // Mostra placeholder
                 if (noteStatus && noteStatus.className === 'status-message') noteStatus.textContent = '';
                 // saveTabOrderAndActiveState já limpou o lastActiveId
             }
        } else {
             console.log(`[CloseUI] ${noteIdStr} fechada, não era ativa (${activeNoteId}).`);
             updateActionButtons(); // Atualiza botões para a nota que continua ativa
        }
    };

    /** Salva a nota no backend e atualiza estado local, lidando com atualização de ID */
    const saveNote = async (noteId, isAutoSave = false, tabButtonElement = null) => {
        const originalNoteId = noteId.toString(); // Guarda o ID com o qual a função foi chamada

        if (isSaving) {
            console.warn(`[Save] Bloqueado para ${originalNoteId}, save em andamento.`);
            if (isAutoSave && notes[originalNoteId]) notes[originalNoteId].saved = false;
            return;
        }

        if (!tabButtonElement && originalNoteId.startsWith('new-')) {
            tabButtonElement = notesTabNav.querySelector(`.note-tab-button[data-note-id="${originalNoteId}"]`);
        }

        // Verifica se a nota (com o ID original) existe ANTES de iniciar
        if (!notes[originalNoteId]) {
             console.error(`[Save] Nota ${originalNoteId} não encontrada no objeto. Abortando.`);
             if (!isAutoSave) showStatus('Erro: Nota não encontrada.', 'error');
             return;
        }

        isSaving = true; updateActionButtons(); // Bloqueia UI

        const currentTitle = notes[originalNoteId].title;
        const currentContent = notes[originalNoteId].content;
        const isTempNewNote = originalNoteId.startsWith('new-');

        if (isAutoSave && isTempNewNote && !currentContent.trim() && currentTitle.trim().toLowerCase().startsWith('nova nota')) {
            console.log(`[Save] Autosave ignorado para ${originalNoteId} (nova/vazia).`);
            notes[originalNoteId].saved = false; isSaving = false; updateActionButtons(); return;
        }

        if (!isAutoSave) showStatus('Salvando...', 'saving');
        else if (originalNoteId === activeNoteId) showStatus('Salvando automaticamente...', 'saving');
        else console.log(`[Save] Autosave silencioso para ${originalNoteId}...`);

        const noteDataToSend = { id: isTempNewNote ? null : originalNoteId, title: currentTitle, content: currentContent };
        console.log(`[Save] Enviando (ID original: ${originalNoteId}):`, noteDataToSend);

        let savedNoteId = null; // ID retornado pelo backend (será string)
        let finalNoteId = originalNoteId; // ID que a nota terá após esta função

        try {
            // --- FETCH ---
            const response = await fetch('api/notes_handler.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save', note: noteDataToSend }) });
            // ... (tratamento de erro de rede e resposta não ok) ...
            if (!response.ok) { let errorMsg = `Erro rede: ${response.status}`; try { const d=await response.json(); errorMsg=d.message||errorMsg; } catch(e){} throw new Error(errorMsg); }
            const data = await response.json();
            console.log('[Save] Resposta:', data);
            if (!data.success || !data.note_id) throw new Error(data.message || 'Resposta inválida do servidor.');
            savedNoteId = data.note_id.toString(); // ID real do backend
            // --- FIM FETCH ---


            // --- PROCESSAMENTO DA RESPOSTA ---
            // Verifica se a nota com o ID ORIGINAL ainda existe localmente.
            // Se não existir, significa que foi fechada/removida enquanto o fetch estava ocorrendo.
            if (!notes[originalNoteId]) {
                console.warn(`[Save] Nota ${originalNoteId} não existe mais localmente após receber resposta (ID retornado: ${savedNoteId}). Abortando processamento da resposta.`);
                // Não lança erro, apenas sai, o finally cuidará de isSaving.
                return;
            }

            // --- Atualização de ID para Notas Novas ---
            if (isTempNewNote && originalNoteId !== savedNoteId) {
                console.log(`[Save] ID será atualizado: ${originalNoteId} -> ${savedNoteId}`);
                finalNoteId = savedNoteId; // O ID final é o do backend

                // 1. Copia os dados para a nova chave (ID real) no objeto 'notes'
                notes[savedNoteId] = notes[originalNoteId];

                // 2. Atualiza o ID do editor se ele existir
                if (notes[savedNoteId].editorElement) {
                    notes[savedNoteId].editorElement.id = `editor-${savedNoteId}`;
                    console.log(`[Save] ID do editor atualizado para editor-${savedNoteId}`);
                }

                // 3. Remove a entrada antiga ('new-...') do objeto 'notes'
                delete notes[originalNoteId];
                console.log(`[Save] Objeto 'notes' atualizado: Chave ${originalNoteId} removida, ${savedNoteId} adicionada.`);

                // 4. Atualiza o dataset.noteId no botão da aba (ESSENCIAL!)
                const tabButtonToUpdate = tabButtonElement || notesTabNav.querySelector(`.note-tab-button[data-note-id="${originalNoteId}"]`);
                if (tabButtonToUpdate) {
                    tabButtonToUpdate.dataset.noteId = savedNoteId;
                    console.log(`[Save] Dataset da aba atualizado para ${savedNoteId}`);
                    // Salva a ordem AGORA que a aba tem o ID real
                    saveTabOrderAndActiveState();
                } else {
                     console.warn(`[Save] Botão da aba ${originalNoteId} não encontrado para atualizar dataset.`);
                     // Tenta salvar a ordem mesmo assim
                     saveTabOrderAndActiveState();
                }

                // 5. Atualiza activeNoteId se a nota ativa era a que teve o ID mudado
                if (activeNoteId === originalNoteId) {
                    activeNoteId = savedNoteId;
                    console.log(`[Save] activeNoteId atualizado para ${savedNoteId}`);
                    // Salva o estado ativo novamente (pode ser redundante se a aba foi encontrada, mas garante)
                    if (!tabButtonToUpdate) saveTabOrderAndActiveState();
                }
            }
            // --- Fim Atualização de ID ---

            // Marca como salva usando o ID FINAL
            if (notes[finalNoteId]) {
                notes[finalNoteId].saved = true;
                console.log(`[Save] Nota ${finalNoteId} marcada como salva.`);
                // Exibe status de sucesso
                if (!isAutoSave) showStatus('Nota salva com sucesso!', 'success');
                else if (finalNoteId === activeNoteId) showStatus('Nota salva.', 'success', 1500);
                else console.log(`[Save] Autosave OK para ${finalNoteId} (não ativa)`);
            } else {
                // Este erro indica um problema sério na lógica de atualização de ID
                console.error(`[Save] ERRO CRÍTICO: Nota ${finalNoteId} não encontrada após tentativa de atualização de ID.`);
                showStatus('Erro ao finalizar salvamento.', 'error');
            }
             // --- FIM PROCESSAMENTO ---

        } catch (error) {
            console.error('[Save] Erro detalhado durante fetch ou processamento:', error);
            // Tenta mostrar erro apenas se a nota original AINDA existe no objeto
            // Isso evita mostrar o erro "Nota X não existe mais..." que vimos antes
            if (notes[originalNoteId]) {
               showStatus(`Erro ao salvar: ${error.message}`, 'error', 5000);
               // Garante que fique como não salva para poder tentar de novo
               notes[originalNoteId].saved = false;
            } else {
                // Se a nota original não existe mais (provavelmente foi renomeada com sucesso por outra chamada),
                // verifica se a nota com o ID final (savedNoteId) existe e mostra o erro lá, se apropriado.
                 if (savedNoteId && notes[savedNoteId]) {
                     showStatus(`Erro ao salvar (ref ${originalNoteId}): ${error.message}`, 'error', 5000);
                     notes[savedNoteId].saved = false; // Marca a nota correta como não salva
                 } else {
                    console.warn(`[Save] Erro ao salvar ${originalNoteId}, mas nota original ou final (${savedNoteId}) não existem mais.`);
                 }
            }
        } finally {
             isSaving = false; // Libera a flag SEMPRE
             console.log(`[Save] Finally para ID original ${originalNoteId}, ID final esperado ${finalNoteId}. ActiveId: ${activeNoteId}`);
             // Atualiza os botões SOMENTE se a nota afetada (com seu ID final) é a ativa.
             if (activeNoteId === finalNoteId) {
                 updateActionButtons();
             } else {
                 console.log(`[Save] A nota ${finalNoteId} não é a ativa, update de botões não chamado no finally.`);
                 // Se a nota ativa NÃO é a que acabou de ser salva, garante que os botões dela estejam corretos
                 if(activeNoteId && notes[activeNoteId]) {
                     updateActionButtons();
                 }
             }
        }
   };

    /** Exclui a nota no backend e na UI */
    const deleteNote = async (noteIdToDelete) => {
        const noteIdStr = noteIdToDelete.toString();
        if (!noteIdStr || !notes[noteIdStr]) { console.warn(`[Delete] Nota ${noteIdStr} não encontrada.`); showStatus('Erro: Nota não encontrada.', 'error'); return; }
        const noteTitle = notes[noteIdStr].title;
        if (!confirm(`Tem certeza que deseja excluir permanentemente a nota "${escapeHtml(noteTitle)}"?\n\nEsta ação não pode ser desfeita.`)) { console.log(`[Delete] Exclusão cancelada para ${noteIdStr}.`); return; }

        if (noteIdStr.startsWith('new-')) { console.log(`[Delete] Descartando nota nova ${noteIdStr}.`); closeNoteUI(noteIdStr); showStatus('Nota não salva descartada.', 'info'); return; }

        console.log(`[Delete] Iniciando exclusão de ${noteIdStr} no backend.`);
        showStatus('Excluindo...', 'saving');
        if(deleteNoteBtn) deleteNoteBtn.disabled = true; if(saveNoteBtn) saveNoteBtn.disabled = true; // Desabilita ambos

         try {
            // !!! CONFIRME O CAMINHO DA API !!!
            const response = await fetch('api/notes_handler.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', note_id: noteIdStr }) });
            if (!response.ok) { let errorMsg = `Erro rede: ${response.status}`; try{const d=await response.json(); errorMsg=d.message||errorMsg;}catch(e){} throw new Error(errorMsg); }
            const data = await response.json();
            console.log('[Delete] Resposta:', data);
            if (data.success) {
                console.log(`[Delete] Nota ${noteIdStr} excluída com sucesso.`);
                closeNoteUI(noteIdStr); // Fecha UI APÓS sucesso
                setTimeout(() => showStatus('Nota excluída!', 'success', 2500), 50);
            } else { throw new Error(data.message || 'Erro desconhecido ao excluir.'); }
        } catch (error) {
            console.error('[Delete] Erro detalhado:', error);
            showStatus(`Erro ao excluir: ${error.message}`, 'error', 5000);
            // REABILITA botões da nota ativa atual se a exclusão falhou
            updateActionButtons();
        }
    };

    /** Carrega as notas do usuário do backend, respeitando a ordem salva */
    const loadNotes = async () => {
        if (!notesTabNav || !notesContentArea || !placeholder || !addNoteTabBtn) { console.error("[Load] Elementos UI ausentes."); showStatus("Erro crítico: Interface de notas.", "error", 0); notesLoaded = true; return; }
        if (notesLoaded) { console.log("[Load] Chamada ignorada, notas já carregadas ou em carregamento."); return; }
        console.log("[Load] Iniciando carregamento...");
        notesLoaded = true; showStatus('Carregando suas notas...', 'info');

        notesTabNav.querySelectorAll('.note-tab-button[data-note-id]').forEach(btn => btn.remove());
        notesContentArea.querySelectorAll('.note-editor').forEach(editor => editor.remove());
        notes = {}; activeNoteId = null; updateActionButtons(); // Limpa estado e UI

         try {
             // 1. Busca notas
             const response = await fetch('api/notes_handler.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'load' }) });
             if (!response.ok) throw new Error(`Erro rede: ${response.status}`);
             const data = await response.json();
             if (!data.success || !Array.isArray(data.notes)) throw new Error(data.message || 'Resposta inválida.');
             console.log("[Load] Resposta backend:", data);

             // 2. Carrega preferências
             let savedOrder = []; let lastActiveId = null;
             try {
                 savedOrder = JSON.parse(localStorage.getItem('mednotesTabOrder') || '[]');
                 lastActiveId = localStorage.getItem('mednotesLastActiveId');
                 console.log("[Load] Ordem salva:", savedOrder, "Último ativo:", lastActiveId);
             } catch (e) { console.error("[Load] Erro localStorage:", e); }

             // 3. Mapeia notas buscadas
             const fetchedNotesMap = new Map();
             data.notes.forEach(note => { if (note?.id) fetchedNotesMap.set(note.id.toString(), note); });
             console.log(`[Load] ${fetchedNotesMap.size} notas válidas no fetch.`);

             // 4. Cria abas na ordem salva + restantes
             const createdNoteIds = new Set();
             const finalTabOrder = []; // Guarda a ordem final para decidir qual ativar

             // Processa a ordem salva
             if (Array.isArray(savedOrder)) {
                 savedOrder.forEach(noteId => {
                     const noteIdStr = noteId.toString();
                     if (fetchedNotesMap.has(noteIdStr)) {
                         const noteData = fetchedNotesMap.get(noteIdStr);
                         addNewNote(noteData); // Cria objeto local e aba
                         createdNoteIds.add(noteIdStr);
                         finalTabOrder.push(noteIdStr); // Adiciona à ordem final
                         fetchedNotesMap.delete(noteIdStr); // Remove do map
                     } else {
                          console.log(`[Load] Nota ${noteIdStr} da ordem salva não encontrada no fetch.`);
                     }
                 });
             }

             // Processa notas restantes (não estavam na ordem salva)
             fetchedNotesMap.forEach(noteData => {
                 const noteIdStr = noteData.id.toString();
                 console.log(`[Load] Criando aba para ${noteIdStr} (não estava na ordem)`);
                 addNewNote(noteData);
                 createdNoteIds.add(noteIdStr);
                 finalTabOrder.push(noteIdStr); // Adiciona ao final da ordem
             });
             console.log(`[Load] Ordem final das abas montada:`, finalTabOrder);

             // 5. Decide qual aba ativar
             let idToActivate = null;
             if (lastActiveId && createdNoteIds.has(lastActiveId)) {
                 idToActivate = lastActiveId; // Tenta a última ativa
                 console.log(`[Load] Tentando reativar último ID: ${idToActivate}`);
             } else if (finalTabOrder.length > 0) {
                 idToActivate = finalTabOrder[0]; // Tenta a primeira da ordem final
                 console.log(`[Load] Ativando a primeira da ordem final: ${idToActivate}`);
             }

             // 6. Ativa a aba escolhida
             if (idToActivate) {
                  setTimeout(() => { // Delay para garantir DOM pronto
                      if(notes[idToActivate]) { // Re-verifica existência
                          console.log(`[Load] Ativando nota final: ${idToActivate}`);
                          activateNoteTab(idToActivate);
                      } else { console.error(`[Load] Nota ${idToActivate} sumiu antes de ativar!`); updateActionButtons(); }
                  }, 150);
             } else {
                 console.log("[Load] Nenhuma nota carregada ou encontrada para ativar.");
                 updateActionButtons(); // Mostra placeholder
                 saveTabOrderAndActiveState(); // Salva estado vazio
             }

              // 7. Define o status final
              showStatus(createdNoteIds.size > 0 ? `Carregadas ${createdNoteIds.size} notas.` : 'Nenhuma nota encontrada.', createdNoteIds.size > 0 ? 'success' : 'info', 3000);
               // Salva a ordem inicial montada
               if(createdNoteIds.size > 0) saveTabOrderAndActiveState();

         } catch (error) {
             console.error('[Load] Erro detalhado:', error);
             showStatus(`Erro ao carregar: ${error.message}`, 'error', 6000);
             updateActionButtons();
             notesLoaded = false; // Permite tentar de novo
         }
    };

    // =====================================================
    // --- MEDNOTES: Event Listeners dos Botões ---
    // =====================================================
    if (addNoteTabBtn) addNoteTabBtn.addEventListener('click', () => { console.log("[Click] Nova Nota"); addNewNote(); });
    else console.error("Botão 'add-note-tab-btn' não encontrado!");

    if (saveNoteBtn) saveNoteBtn.addEventListener('click', () => {
        console.log(`[Click] Salvar Nota (Ativa: ${activeNoteId})`);
        if (activeNoteId && notes[activeNoteId] && notes[activeNoteId].saved === false && !isSaving) {
            saveNote(activeNoteId, false);
        } else console.warn("[Click] Salvar: Bloqueado (sem nota ativa, salva, ou já salvando).");
    });
    else console.error("Botão 'save-current-note-btn' não encontrado!");

    if (deleteNoteBtn) deleteNoteBtn.addEventListener('click', () => {
         console.log(`[Click] Excluir Nota (Ativa: ${activeNoteId})`);
         if (activeNoteId && notes[activeNoteId] && !isSaving) { // Só permite se não estiver salvando
            deleteNote(activeNoteId);
         } else console.warn("[Click] Excluir: Bloqueado (sem nota ativa ou salvando).");
     });
    else console.error("Botão 'delete-current-note-btn' não encontrado!");

    // =====================================================
    // --- INICIALIZAÇÃO ---
    // =====================================================
    const initialActiveTabLink = document.querySelector('.tab-nav .tab-link.active');
    const mednotesTabElement = document.getElementById('mednotes');
    if (mednotesTabElement) {
        if (initialActiveTabLink && initialActiveTabLink.getAttribute('data-tab') === 'mednotes') {
            console.log("[Init] MedNotes é aba inicial. Agendando loadNotes...");
            setTimeout(loadNotes, 150); // Carrega notas se for a aba inicial
        } else {
            console.log("[Init] MedNotes não é aba inicial. Carregará ao clicar.");
        }
    } else {
        console.warn("[Init] Elemento #mednotes não encontrado. Notas desativadas.");
    }

    console.log("[Init] Script inicializado.");

}); // --- FIM DO DOMContentLoaded ---
