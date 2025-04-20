<?php
// Inclui o verificador de autenticação - ESSENCIAL
require_once "includes/check_auth.php";
// Inclui conexão com DB se precisar carregar algo inicialmente (como notas)
require_once "includes/db_connect.php";

// Pega o nome do usuário da sessão para exibir
$username = isset($_SESSION["username"]) ? htmlspecialchars($_SESSION["username"]) : 'Usuário'; // Previne XSS e define um padrão
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - MedNotes</title>
    <link rel="stylesheet" href="css/style.css">
    <!-- Pode adicionar ícones (ex: Font Awesome) -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body>
    <header class="main-header">
        <h1>Sinapsídeo</h1>
        <div class="user-info">
            <span><i class="fas fa-user-circle"></i> Bem-vindo, <?php echo $username; ?>!</span>
            <a href="logout.php" class="btn-logout"><i class="fas fa-sign-out-alt"></i> Sair</a>
        </div>
    </header>

    <div class="tab-container">
        <div class="tab-nav">
            <button class="tab-link active" data-tab="mednotes"><i class="fas fa-notes-medical"></i> MedNotes</button>
            <button class="tab-link" data-tab="calculators"><i class="fas fa-calculator"></i> Calculadoras</button>
            <button class="tab-link" data-tab="evolutions"><i class="fas fa-file-medical-alt"></i> Evoluções</button>
            <button class="tab-link" data-tab="bulary"><i class="fas fa-pills"></i> Bulário</button>
        </div>

        <div class="tab-content-wrapper">
            <!-- Aba MedNotes -->
            <div id="mednotes" class="tab-content active">
                <h2><i class="fas fa-notes-medical"></i> MedNotes - Suas Anotações</h2>
                <div class="mednotes-interface">
                    <div class="notes-tab-nav">
                        <!-- Abas das notas serão adicionadas dinamicamente aqui -->
                        <button id="add-note-tab-btn" title="Criar nova nota"><i class="fas fa-plus"></i> Nova Nota</button>
                    </div>
                    <div class="notes-content-area">
                        <!-- Conteúdo das notas (textareas) será adicionado aqui -->
                        <div class="note-editor-placeholder">
                             <p>Clique em "Nova Nota" ou selecione uma nota existente.</p>
                             <i class="fas fa-file-alt fa-3x" style="color: #ccc; margin-top: 20px;"></i>
                        </div>
                    </div>
                     <div class="note-actions">
                         <button id="save-current-note-btn" disabled><i class="fas fa-save"></i> Salvar Nota Atual</button>
                         <button id="delete-current-note-btn" disabled><i class="fas fa-trash-alt"></i> Excluir Nota Atual</button>
                         <span id="note-status" class="status-message"></span>
                     </div>
                </div>
            </div>

            <!-- Aba Calculadoras (Estrutura OK) -->
            <div id="calculators" class="tab-content">
                <h2><i class="fas fa-calculator"></i> Calculadoras Médicas</h2>
                <div class="calculator-grid">
                    <!-- Card Calculadora de IMC -->
                    <div class="calculator-card">
                        <h3><i class="fas fa-weight"></i> Calculadora de IMC</h3>
                        <div class="form-group">
                            <label for="peso">Peso (kg):</label>
                            <input type="number" id="peso" placeholder="Ex: 70" step="0.1">
                        </div>
                        <div class="form-group">
                            <label for="altura">Altura (m):</label>
                            <input type="number" id="altura" step="0.01" placeholder="Ex: 1.75">
                        </div>
                        <button onclick="calcularIMC()"><i class="fas fa-check"></i> Calcular</button>
                        <p class="result-output">Resultado (IMC): <strong id="resultadoIMC">--</strong></p>
                    </div>
                    <!-- Fim Card IMC -->

                    <!-- Card Calculadora de Clearance de Creatinina (Cockcroft-Gault) -->
                    <div class="calculator-card">
                        <h3><i class="fas fa-tint"></i> Clearance de Creatinina</h3>
                        <p class="card-subtitle">(Cockcroft-Gault)</p>
                        <div class="form-group">
                            <label for="idade">Idade (anos):</label>
                            <input type="number" id="idade" placeholder="Ex: 60">
                        </div>
                        <div class="form-group">
                            <label for="peso_cg">Peso (kg):</label>
                            <input type="number" id="peso_cg" placeholder="Ex: 70" step="0.1">
                        </div>
                        <div class="form-group">
                            <label for="creatinina_serica">Creatinina Sérica (mg/dL):</label>
                            <input type="number" step="0.01" id="creatinina_serica" placeholder="Ex: 1.2">
                        </div>
                         <div class="form-group">
                           <label for="sexo_cg">Sexo:</label>
                           <select id="sexo_cg">
                               <option value="masculino">Masculino</option>
                               <option value="feminino">Feminino</option>
                           </select>
                       </div>
                       <button onclick="calcularCockcroftGault()"><i class="fas fa-check"></i> Calcular</button>
                       <p class="result-output">Resultado (Clearance): <strong id="resultadoCG">--</strong> ml/min</p>
                   </div>
                   <!-- Fim Card Clearance -->

                   <!-- Card Calculadora de Superfície Corporal (Mosteller) -->
                   <div class="calculator-card">
                        <h3><i class="fas fa-ruler-combined"></i> Superfície Corporal</h3>
                         <p class="card-subtitle">(Fórmula de Mosteller)</p>
                        <div class="form-group">
                            <label for="peso_sc">Peso (kg):</label>
                            <input type="number" id="peso_sc" placeholder="Ex: 70" step="0.1">
                        </div>
                        <div class="form-group">
                            <label for="altura_sc">Altura (cm):</label>
                            <input type="number" id="altura_sc" step="1" placeholder="Ex: 175">
                        </div>
                        <button onclick="calcularSC()"><i class="fas fa-check"></i> Calcular</button>
                        <p class="result-output">Resultado (SC): <strong id="resultadoSC">--</strong> m²</p>
                    </div>
                   <!-- Fim Card Superfície Corporal -->
                </div> <!-- Fim calculator-grid -->
            </div>
            <!-- Fim Aba Calculadoras -->

            <!-- Aba Evoluções (Estrutura OK) -->
            <div id="evolutions" class="tab-content">
                 <h2><i class="fas fa-file-medical-alt"></i> Modelos de Evolução</h2>
                <div class="tool-section">
                    <h3>Modelo SOAP</h3>
                    <textarea readonly class="template-textarea">
S (Subjetivo): Queixa do paciente, história...
O (Objetivo): Exame físico, sinais vitais, resultados de exames...
A (Avaliação/Assessment): Diagnósticos diferenciais, problema principal...
P (Plano): Conduta, exames a solicitar, medicações, orientações...
                    </textarea>
                    <button onclick="copyTemplate(this)" data-original-text="Copiar Modelo"><i class="fas fa-copy"></i> Copiar Modelo</button>
                </div>
                 <div class="tool-section">
                    <h3>Modelo de Admissão Hospitalar</h3>
                    <textarea readonly class="template-textarea">
IDENTIFICAÇÃO: Nome, idade, sexo, registro...
QUEIXA PRINCIPAL:
HISTÓRIA DA DOENÇA ATUAL (HDA):
HISTÓRIA PATOLÓGICA PREGRESSA (HPP): Comorbidades, cirurgias prévias, alergias...
HISTÓRIA FAMILIAR:
HÁBITOS DE VIDA / HISTÓRIA SOCIAL: Tabagismo, etilismo, drogas, ocupação...
EXAME FÍSICO: Geral, cabeça/pescoço, tórax, abdome, membros, neurológico...
HIPÓTESES DIAGNÓSTICAS:
PLANO INICIAL: Dieta, hidratação, medicações, exames complementares, monitorização...
                    </textarea>
                     <button onclick="copyTemplate(this)" data-original-text="Copiar Modelo"><i class="fas fa-copy"></i> Copiar Modelo</button>
                </div>
                <!-- Adicionar mais modelos -->
            </div>

            <!-- Aba Bulário (Estrutura OK) -->
            <div id="bulary" class="tab-content">
                <h2><i class="fas fa-pills"></i> Bulário - Consulta de Medicamentos</h2>
                <div class="search-container">
                    <input type="text" id="med-search-input" placeholder="Digite o nome do medicamento...">
                    <button id="med-search-btn"><i class="fas fa-search"></i> Buscar</button>
                </div>
                <div id="med-results-area">
                    <p>Digite o nome de um medicamento para buscar informações.</p>
                </div>
            </div>
        </div>
    </div>

    <footer>
        MedNotes - Ferramentas Médicas © <?php echo date("Y"); ?>
    </footer>

    <!-- Inclui o JavaScript no final -->
    <script src="js/script.js"></script>
</body>
</html>