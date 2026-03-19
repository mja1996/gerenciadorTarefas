// ============================================================================
// GESTOR DE TAREFAS COM IA - ARQUIVO JAVASCRIPT ÚNICO
// ============================================================================

// VARIÁVEIS GLOBAIS
let usuarioLogado = null;
let usuarios = [];
let tarefas = [];
let tarefasFixas = [];
let preferencias = {};
let historicoChat = [];
let arquivoSelecionado = null;

// FLAGS DE PROTEÇÃO CONTRA DUPLICAÇÃO
let criandoTarefa = false;
let criandoTarefaFixa = false;
let appInicializado = false;

// DADOS DAS PERGUNTAS - QUERO TE CONHECER
const perguntas = [
  {
    id: 1,
    pergunta: 'Qual horário você trabalha?',
    tipo: 'texto',
    placeholder: 'Ex: 8h às 17h',
    resposta: '',
    chave: 'horarioTrabalho'
  },
  {
    id: 2,
    pergunta: 'Você se sente mais focado de manhã ou à tarde?',
    tipo: 'radio',
    opcoes: ['Manhã', 'Tarde', 'Indiferente'],
    resposta: '',
    chave: 'periodoPico'
  },
  {
    id: 3,
    pergunta: 'Quantas horas por dia você consegue dedicar a tarefas de concentração?',
    tipo: 'slider',
    min: 1,
    max: 8,
    resposta: 4,
    chave: 'horasFoco'
  },
  {
    id: 4,
    pergunta: 'Você prefere blocos longos de foco ou tarefas curtas?',
    tipo: 'radio',
    opcoes: ['Blocos Longos (2-4h)', 'Tarefas Curtas (15-30min)', 'Misturado'],
    resposta: '',
    chave: 'tipoTarefa'
  }
];

let perguntaAtual = 0;

// Estado da aplicação
let appState = {
  tasks: [],
  recurringTasks: [],
  userPreferences: {},
  chatHistory: [],
  currentWeekOffset: 0,
  wizardStep: 0,
  wizardAnswers: {},
  editingTaskId: null,
  editingRecurringId: null
};

// Storage em memória (sandbox não permite localStorage)
const storage = {
  data: {},
  getItem: function(key) {
    return this.data[key] || null;
  },
  setItem: function(key, value) {
    this.data[key] = value;
    console.log('💾 Salvando em memória:', key);
  },
  removeItem: function(key) {
    delete this.data[key];
  },
  clear: function() {
    this.data = {};
  },
  get length() {
    return Object.keys(this.data).length;
  },
  key: function(index) {
    return Object.keys(this.data)[index];
  }
};

const isLocalStorageAvailable = false;

// ============================================================================
// FUNÇÕES DE NAVEGAÇÃO DE ABAS - SISTEMA DE LOGIN
// ============================================================================

function abrirAbaLogin() {
  console.log('=== ABRINDO ABA LOGIN ===');
  
  // Remover todas as abas ativas
  document.querySelectorAll('.auth-tab').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
  
  // Ativar Login
  const btnLogin = document.getElementById('tabLogin');
  const abaLogin = document.getElementById('abaLoginConteudo');
  
  if (btnLogin) btnLogin.classList.add('active');
  if (abaLogin) abaLogin.classList.add('active');
  
  // Limpar erros
  const erros = ['loginError', 'registerError', 'importError'];
  erros.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  
  console.log('✓ Aba Login aberta');
}

function abrirAbaRegistro() {
  console.log('=== ABRINDO ABA REGISTRO ===');
  
  // Remover todas as abas ativas
  document.querySelectorAll('.auth-tab').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
  
  // Ativar Registro
  const btnRegistro = document.getElementById('tabRegistro');
  const abaRegistro = document.getElementById('abaRegistroConteudo');
  
  if (btnRegistro) btnRegistro.classList.add('active');
  if (abaRegistro) abaRegistro.classList.add('active');
  
  // Limpar erros
  const erros = ['loginError', 'registerError', 'importError'];
  erros.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  
  console.log('✓ Aba Registro aberta');
}

function abrirAbaImportar() {
  console.log('=== ABRINDO ABA IMPORTAR ===');
  
  // Remover todas as abas ativas
  document.querySelectorAll('.auth-tab').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
  
  // Ativar Importar
  const btnImportar = document.getElementById('tabImportar');
  const abaImportar = document.getElementById('abaImportarConteudo');
  
  if (btnImportar) btnImportar.classList.add('active');
  if (abaImportar) abaImportar.classList.add('active');
  
  // Limpar erros
  const erros = ['loginError', 'registerError', 'importError'];
  erros.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  
  console.log('✓ Aba Importar aberta');
}

// Tornar funções disponíveis globalmente
window.abrirAbaLogin = abrirAbaLogin;
window.abrirAbaRegistro = abrirAbaRegistro;
window.abrirAbaImportar = abrirAbaImportar;

// ============================================================================
// FUNÇÕES DE LOGIN E REGISTRO
// ============================================================================

function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function gerarIdUnico() {
  return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const senha = document.getElementById('loginSenha').value;
  const errorDiv = document.getElementById('loginError');
  
  if (!email || !senha) {
    errorDiv.textContent = 'Por favor, preencha todos os campos';
    errorDiv.style.display = 'block';
    return;
  }
  
  if (!validarEmail(email)) {
    errorDiv.textContent = 'Email inválido';
    errorDiv.style.display = 'block';
    return;
  }
  
  const usuario = usuarios.find(u => u.email === email && u.senha === senha);
  
  if (!usuario) {
    errorDiv.textContent = 'Email ou senha incorretos';
    errorDiv.style.display = 'block';
    return;
  }

  fazerLogin(usuario);
}

function handleRegister() {
  const nome = document.getElementById('registerNome').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const senha = document.getElementById('registerSenha').value;
  const confirmSenha = document.getElementById('registerConfirmSenha').value;
  const errorDiv = document.getElementById('registerError');
  const successDiv = document.getElementById('registerSuccess');
  
  errorDiv.style.display = 'none';
  successDiv.style.display = 'none';
  
  if (!nome || !email || !senha || !confirmSenha) {
    errorDiv.textContent = 'Por favor, preencha todos os campos';
    errorDiv.style.display = 'block';
    return;
  }
  
  if (!validarEmail(email)) {
    errorDiv.textContent = 'Email inválido';
    errorDiv.style.display = 'block';
    return;
  }
  
  if (senha.length < 6) {
    errorDiv.textContent = 'Senha deve ter no mínimo 6 caracteres';
    errorDiv.style.display = 'block';
    return;
  }
  
  if (senha !== confirmSenha) {
    errorDiv.textContent = 'As senhas não correspondem';
    errorDiv.style.display = 'block';
    return;
  }
  
  if (usuarios.find(u => u.email === email)) {
    errorDiv.textContent = 'Este email já está registrado';
    errorDiv.style.display = 'block';
    return;
  }
  
  registrarUsuario(nome, email, senha);
  
  successDiv.textContent = 'Registro realizado com sucesso! Faça login.';
  successDiv.style.display = 'block';
  
  document.getElementById('registerNome').value = '';
  document.getElementById('registerEmail').value = '';
  document.getElementById('registerSenha').value = '';
  document.getElementById('registerConfirmSenha').value = '';
  
  setTimeout(() => {
    abrirAbaLogin();
    document.getElementById('loginEmail').value = email;
    setTimeout(() => {
      document.getElementById('loginSenha').focus();
    }, 100);
  }, 2000);
}

function registrarUsuario(nome, email, senha) {
  console.log('=== REGISTRANDO NOVO USUÁRIO ===');
  console.log('📝 Nome:', nome);
  console.log('📧 Email:', email);
  
  const novoUsuario = {
    id: gerarIdUnico(),
    nome: nome,
    email: email,
    senha: senha,
    dataCadastro: Date.now(),
    ativo: true
  };
  
  usuarios.push(novoUsuario);
  storage.setItem('app_usuarios', JSON.stringify(usuarios));
  
  const dadosUsuario = {
    usuarioId: novoUsuario.id,
    tarefas: [],
    tarefasFixas: [],
    preferencias: {},
    historicoChat: [],
    ultimoSalvo: new Date().toISOString()
  };
  
  const chave = 'app_dadosUsuario_' + novoUsuario.id;
  storage.setItem(chave, JSON.stringify(dadosUsuario));
  
  console.log('✅ Usuário registrado:', novoUsuario.email);
  return novoUsuario;
}

function fazerLogin(usuario) {
  console.log('=== FAZENDO LOGIN ===');
  console.log('👤 Usuário:', usuario.nome);

  usuarioLogado = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email
  };

  storage.setItem('app_usuarioLogado', JSON.stringify(usuarioLogado));
  carregarDadosUsuario();

  // 🟢 CORREÇÃO: resetar semana sempre ao entrar no app
  if (appState) {
    appState.currentWeekOffset = 0;
  }

  document.getElementById('loginEmail').value = '';
  document.getElementById('loginSenha').value = '';
  document.getElementById('loginError').style.display = 'none';

  console.log('✅ Login completo');
  showMainApp();
}


function fazerLogout() {
  if (confirm('Deseja realmente sair?')) {
    console.log('=== FAZENDO LOGOUT ===');
    
    if (usuarioLogado) {
      salvarDadosUsuario();
    }
    
    storage.removeItem('app_usuarioLogado');
    usuarioLogado = null;
    
    appState = {
      tasks: [],
      recurringTasks: [],
      userPreferences: {},
      chatHistory: [],
      currentWeekOffset: 0,
      wizardStep: 0,
      wizardAnswers: {},
      editingTaskId: null,
      editingRecurringId: null
    };
    
    console.log('✅ Logout completo');
    showAuthScreen();
  }
}

function carregarDadosUsuario() {
  if (!usuarioLogado) return;
  
  console.log('📂 Carregando dados do usuário:', usuarioLogado.id);
  
  try {
    const chave = 'app_dadosUsuario_' + usuarioLogado.id;
    const dadosStr = storage.getItem(chave);
    
    if (dadosStr) {
      const dadosUsuario = JSON.parse(dadosStr);
      appState.tasks = dadosUsuario.tarefas || [];
      appState.recurringTasks = dadosUsuario.tarefasFixas || [];
      appState.userPreferences = dadosUsuario.preferencias || {};
      appState.chatHistory = dadosUsuario.historicoChat || [];
      
      console.log('✅ Dados carregados:', appState.tasks.length, 'tarefas');
    } else {
      console.log('ℹ️ Criando dados iniciais');
      appState.tasks = [];
      appState.recurringTasks = [];
      appState.userPreferences = {};
      appState.chatHistory = [];
      salvarDadosUsuario();
    }
  } catch (error) {
    console.error('❌ Erro ao carregar dados:', error);
    appState.tasks = [];
    appState.recurringTasks = [];
    appState.userPreferences = {};
    appState.chatHistory = [];
  }
}

function salvarDadosUsuario() {
  if (!usuarioLogado || !usuarioLogado.id) {
    console.warn('⚠️ Tentativa de salvar sem usuário logado');
    return;
  }
  
  console.log('💾 Salvando dados do usuário:', usuarioLogado.id);
  
  const dadosUsuario = {
    usuarioId: usuarioLogado.id,
    tarefas: appState.tasks,
    tarefasFixas: appState.recurringTasks,
    preferencias: appState.userPreferences,
    historicoChat: appState.chatHistory,
    ultimaAtualizacao: Date.now(),
    ultimoSalvo: new Date().toISOString()
  };
  
  try {
    const chave = 'app_dadosUsuario_' + usuarioLogado.id;
    storage.setItem(chave, JSON.stringify(dadosUsuario));
    console.log('✅ Dados salvos com sucesso');
  } catch (error) {
    console.error('❌ Erro ao salvar:', error);
  }
}

function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
  } else {
    input.type = 'password';
  }
}

// ============================================================================
// FUNÇÕES AUXILIARES - OBTER TODAS AS TAREFAS (NOVAS + FIXAS)
// ============================================================================

function obterTodasAsTarefasDoHoje() {
  console.log('=== OBTENDO TAREFAS DE HOJE (NOVAS + FIXAS) ===');
  
  const hoje = new Date();
  const diaSemanaHoje = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][hoje.getDay()];
  const dataHoje = formatDate(hoje);
  
  // Tarefas novas de hoje
  const tarefasNovasHoje = appState.tasks.filter(t => t.data === dataHoje);
  console.log('📋 Tarefas novas hoje:', tarefasNovasHoje.length);
  
  // Tarefas fixas de hoje
  const tarefasFixasHoje = appState.recurringTasks.filter(tf => tf.dias.includes(diaSemanaHoje));
  console.log('📌 Tarefas fixas hoje:', tarefasFixasHoje.length);
  
  // Combinar ambas
  const todasAsTarefas = [
    ...tarefasNovasHoje.map(t => ({...t, tipo: 'Nova'})),
    ...tarefasFixasHoje.map(tf => ({...tf, tipo: 'Fixa', data: dataHoje}))
  ];
  
  console.log('✅ Total de tarefas hoje:', todasAsTarefas.length);
  return todasAsTarefas;
}

function detectarConflitosEntreTodasAsTarefas() {
  console.log('=== DETECTANDO CONFLITOS ===');
  
  const conflitos = [];
  const tarefasPorData = {};
  
  // Agrupar tarefas novas por data
  appState.tasks.forEach(t => {
    if (!tarefasPorData[t.data]) {
      tarefasPorData[t.data] = [];
    }
    tarefasPorData[t.data].push({...t, tipo: 'Nova'});
  });
  
  // Adicionar tarefas fixas para próximos 30 dias
  const hoje = new Date();
  for (let i = 0; i < 30; i++) {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() + i);
    const diaSemanaData = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][data.getDay()];
    const dataStr = formatDate(data);
    
    appState.recurringTasks.forEach(tf => {
      if (tf.dias.includes(diaSemanaData)) {
        if (!tarefasPorData[dataStr]) {
          tarefasPorData[dataStr] = [];
        }
        tarefasPorData[dataStr].push({...tf, tipo: 'Fixa'});
      }
    });
  }
  
  // Verificar conflitos em cada data
  Object.entries(tarefasPorData).forEach(([data, tarefas]) => {
    tarefas.sort((a, b) => {
      const horaA = a.horario || a.horaInicio || '00:00';
      const horaB = b.horario || b.horaInicio || '00:00';
      return horaA.localeCompare(horaB);
    });
    
    for (let i = 0; i < tarefas.length - 1; i++) {
      const tarefa1 = tarefas[i];
      const tarefa2 = tarefas[i + 1];
      
      const hora1Inicio = tarefa1.horario || tarefa1.horaInicio || '00:00';
      const hora1Fim = tarefa1.tipo === 'Fixa' && tarefa1.horaConclusao ? 
                       tarefa1.horaConclusao : 
                       (parseInt(hora1Inicio.split(':')[0]) + 1).toString().padStart(2, '0') + ':' + hora1Inicio.split(':')[1];
      
      const hora2Inicio = tarefa2.horario || tarefa2.horaInicio || '00:00';
      
      if (hora2Inicio < hora1Fim) {
        conflitos.push({
          data: data,
          tarefa1: tarefa1.titulo,
          tarefa2: tarefa2.titulo,
          tipo1: tarefa1.tipo,
          tipo2: tarefa2.tipo,
          hora1: hora1Inicio + ' - ' + hora1Fim,
          hora2: hora2Inicio
        });
      }
    }
  });
  
  console.log('✅ Conflitos detectados:', conflitos.length);
  return conflitos;
}

// ============================================================================
// FUNÇÕES DE IMPORTAÇÃO
// ============================================================================

function setupLoginImport() {
  const selectFileBtn = document.getElementById('selectImportFileBtn');
  const importBtn = document.getElementById('importLoginBtn');
  const fileInput = document.getElementById('loginImportFileInput');
  const fileNameDisplay = document.getElementById('selectedFileName');
  
  if (!selectFileBtn || !importBtn || !fileInput) return;
  
  let arquivoSelecionado = null;
  
  selectFileBtn.addEventListener('click', () => {
    fileInput.click();
  });
  
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      arquivoSelecionado = e.target.files[0];
      fileNameDisplay.innerHTML = `✓ Arquivo: ${arquivoSelecionado.name}`;
      fileNameDisplay.style.display = 'block';
      importBtn.style.display = 'block';
    }
  });
  
  importBtn.addEventListener('click', () => {
    if (!arquivoSelecionado) return;
    importarArquivoLogin(arquivoSelecionado);
  });
}

function importarArquivoLogin(arquivo) {
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const dados = JSON.parse(e.target.result);
      
      if (!dados.usuarioLogado || !dados.tarefas) {
        alert('❌ Arquivo inválido');
        return;
      }
      
      usuarioLogado = dados.usuarioLogado;
      appState.tasks = dados.tarefas || [];
      appState.recurringTasks = dados.tarefasFixas || [];
      appState.userPreferences = dados.preferencias || {};
      appState.chatHistory = dados.historicoChat || [];
      
      storage.setItem('app_usuarioLogado', JSON.stringify(usuarioLogado));
      salvarDadosUsuario();
      
      alert('✅ Dados importados! Entrando...');
      showMainApp();
    } catch (error) {
      console.error('❌ Erro:', error);
      alert('❌ Erro ao importar: ' + error.message);
    }
  };
  
  reader.readAsText(arquivo);
}

function exportarDados() {
  if (!usuarioLogado) {
    alert('❌ Você precisa estar logado');
    return;
  }
  
  const dadosExportacao = {
    versao: '2.0',
    dataExportacao: new Date().toISOString(),
    usuarioLogado: usuarioLogado,
    tarefas: appState.tasks,
    tarefasFixas: appState.recurringTasks,
    preferencias: appState.userPreferences,
    historicoChat: appState.chatHistory
  };
  
  const json = JSON.stringify(dadosExportacao, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  const dataFormatada = new Date().toISOString().split('T')[0];
  const nomeUsuario = usuarioLogado.nome.replace(/\s+/g, '-').toLowerCase();
  link.download = `backup-tarefas-${nomeUsuario}-${dataFormatada}.json`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  alert('✅ Dados exportados com sucesso!');
}

function importarDados(arquivo) {
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const dados = JSON.parse(e.target.result);
      
      if (!dados.usuarioLogado || !dados.tarefas) {
        alert('❌ Arquivo inválido');
        return;
      }
      
      const substituir = confirm('Substituir todos os dados atuais?');
      
      if (substituir) {
        appState.tasks = dados.tarefas || [];
        appState.recurringTasks = dados.tarefasFixas || [];
        appState.userPreferences = dados.preferencias || {};
        appState.chatHistory = dados.historicoChat || [];
      } else {
        const idsExistentes = new Set(appState.tasks.map(t => t.id));
        const novasTarefas = (dados.tarefas || []).filter(t => !idsExistentes.has(t.id));
        appState.tasks = [...appState.tasks, ...novasTarefas];
      }
      
      salvarDadosUsuario();
      renderTasks();
      renderRecurringTasks();
      renderCalendar();
      updateInsights();
      
      alert('✅ Dados importados com sucesso!');
    } catch (error) {
      alert('❌ Erro ao importar: ' + error.message);
    }
  };
  
  reader.readAsText(arquivo);
}

// ============================================================================
// INTERFACE DO APP
// ============================================================================

function showAuthScreen() {
  document.getElementById('authContainer').style.display = 'flex';
  document.getElementById('appContainer').style.display = 'none';
  setTimeout(() => abrirAbaLogin(), 100);
}

function showMainApp() {
  document.getElementById('authContainer').style.display = 'none';
  document.getElementById('appContainer').style.display = 'flex';
  
  if (!isLocalStorageAvailable) {
    document.getElementById('sandboxWarning').style.display = 'block';
  }
  
  const greeting = document.getElementById('userGreeting');
  greeting.textContent = `Olá, ${usuarioLogado.nome.split(' ')[0]}!`;
  
  initApp();
}

function initApp() {
  setupTabNavigation();
  setupTaskModal();
  setupRecurringTaskModal();
  setupOverdueModal();
  setupFilters();
  setupCalendar();
  setupAIChat();
  setupWizard();
  setupExportImport();
  setupInsights();
  
  renderTasks();
  renderRecurringTasks();
  renderCalendar();
  updateInsights();
  updateOverdueBadge();
}

function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.dataset.tab;
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));
      button.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
      
      if (targetTab === 'calendario') {
        renderCalendar();
      } else if (targetTab === 'minhas-tarefas') {
        renderTasks();
        updateInsights();
      } else if (targetTab === 'insights') {
        renderizarInsights();
      }
    });
  });
}

let taskModalListenersAdicionados = false;

function setupTaskModal() {
  if (taskModalListenersAdicionados) {
    console.log('⚠️ Task modal listeners já foram adicionados, pulando...');
    return;
  }
  
  console.log('✅ Adicionando task modal listeners pela primeira vez');
  
  const modal = document.getElementById('taskModal');
  const newTaskBtn = document.getElementById('newTaskBtn');
  const closeModal = document.getElementById('closeModal');
  const cancelBtn = document.getElementById('cancelTaskBtn');
  const saveBtn = document.getElementById('saveTaskBtn');
  const parseBtn = document.getElementById('parseNaturalBtn');
  
  newTaskBtn.addEventListener('click', () => {
    console.log('🔘 Botão Nova Tarefa clicado');
    openTaskModal();
  });
  closeModal.addEventListener('click', () => {
    console.log('🔘 Botão fechar modal clicado');
    modal.classList.remove('active');
  });
  cancelBtn.addEventListener('click', () => {
    console.log('🔘 Botão cancelar clicado');
    modal.classList.remove('active');
  });
  saveBtn.addEventListener('click', () => {
    console.log('🔘 Botão salvar tarefa clicado');
    saveTask();
  });
  parseBtn.addEventListener('click', () => {
    console.log('🔘 Botão interpretar linguagem natural clicado');
    parseNaturalLanguage();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });
  
  taskModalListenersAdicionados = true;
  console.log('✅ Task modal listeners adicionados com sucesso');
}

function openTaskModal(taskId = null) {
  const modal = document.getElementById('taskModal');
  const modalTitle = document.getElementById('modalTitle');
  
  if (taskId) {
    appState.editingTaskId = taskId;
    const task = appState.tasks.find(t => t.id === taskId);
    modalTitle.textContent = 'Editar Tarefa';
    
    document.getElementById('taskTitulo').value = task.titulo;
    document.getElementById('taskDescricao').value = task.descricao || '';
    document.getElementById('taskData').value = task.data;
    document.getElementById('taskHorario').value = task.horario || '';
    document.getElementById('taskHoraConclusao').value = task.horaConclusao || '';
    document.getElementById('taskPrazo').value = task.prazo || '';
    document.getElementById('taskPrioridade').value = task.prioridade;
    document.getElementById('taskStatus').value = task.status;
  } else {
    appState.editingTaskId = null;
    modalTitle.textContent = 'Nova Tarefa';
    clearTaskForm();
  }
  
  modal.classList.add('active');
}

function clearTaskForm() {
  document.getElementById('naturalLanguageInput').value = '';
  document.getElementById('taskTitulo').value = '';
  document.getElementById('taskDescricao').value = '';
  document.getElementById('taskData').value = '';
  document.getElementById('taskHorario').value = '';
  document.getElementById('taskHoraConclusao').value = '';
  document.getElementById('taskPrazo').value = '';
  document.getElementById('taskPrioridade').value = 'media';
  document.getElementById('taskStatus').value = 'nao_iniciado';
  document.getElementById('parsedSummary').style.display = 'none';
}

function saveTask() {
  console.log('=== CRIAR/EDITAR TAREFA ===');
  
  // PROTEÇÃO: Evitar múltiplas execuções simultâneas
  if (criandoTarefa) {
    console.warn('⚠️ Criação já em andamento, ignorando...');
    return;
  }
  
  criandoTarefa = true;
  
  try {
    const titulo = document.getElementById('taskTitulo').value.trim();
    const descricao = document.getElementById('taskDescricao').value.trim();
    const data = document.getElementById('taskData').value;
    const horario = document.getElementById('taskHorario').value;
    const horaConclusao = document.getElementById('taskHoraConclusao').value;
    const prazo = document.getElementById('taskPrazo').value;
    const prioridade = document.getElementById('taskPrioridade').value;
    const status = document.getElementById('taskStatus').value;
    
    console.log('📝 Dados do formulário:', {titulo, data, horario, prioridade, status});
    
    if (horario && !horaConclusao) {
      alert('Quando preenchido o horário inicial, o horário de conclusão também é obrigatório.');
      criandoTarefa = false;
      return;
    }

    if (!titulo || !data) {
      alert('Por favor, preencha pelo menos o título e a data.');
      criandoTarefa = false;
      return;
    }
    
    // VALIDAR DUPLICAÇÃO: Se não está editando, verificar se tarefa similar já existe
    if (!appState.editingTaskId) {
      const tarefaDuplicada = appState.tasks.find(t => 
        t.titulo === titulo && 
        t.data === data && 
        t.horario === horario
      );
      
      if (tarefaDuplicada) {
        console.warn('⚠️ DUPLICAÇÃO DETECTADA:', tarefaDuplicada);
        if (!confirm('Uma tarefa similar já existe. Deseja criar mesmo assim?')) {
          console.log('❌ Criação cancelada pelo usuário');
          criandoTarefa = false;
          return;
        }
      }
    }
  
    const task = {
      id: appState.editingTaskId || generateId(),
      titulo,
      descricao,
      data,
      horario,
      horaConclusao,
      prazo,
      tipo: 'unica',
      prioridade,
      status,
      criadoEm: appState.editingTaskId ? appState.tasks.find(t => t.id === appState.editingTaskId).criadoEm : Date.now(),
      atualizadoEm: Date.now()
    };
    
    const tamanhoAntes = appState.tasks.length;
    console.log('📊 Tarefas ANTES da operação:', tamanhoAntes);
    
    if (appState.editingTaskId) {
      const index = appState.tasks.findIndex(t => t.id === appState.editingTaskId);
      appState.tasks[index] = task;
      console.log('📝 Tarefa EDITADA:', task.titulo, '(índice:', index, ')');
    } else {
      appState.tasks.push(task);
      console.log('➕ Nova tarefa CRIADA:', task.titulo, '(ID:', task.id, ')');
    }
    
    const tamanhoDepois = appState.tasks.length;
    console.log('📊 Tarefas DEPOIS da operação:', tamanhoDepois);
    
    // VALIDAÇÃO ANTI-DUPLICAÇÃO
    if (!appState.editingTaskId && tamanhoDepois !== tamanhoAntes + 1) {
      console.error('❌ ERRO: Tamanho inesperado! Esperado:', tamanhoAntes + 1, 'Obtido:', tamanhoDepois);
    } else if (!appState.editingTaskId) {
      console.log('✅ VALIDAÇÃO: Tarefa adicionada corretamente (apenas 1x)');
    }
    
    console.log('💾 Salvando alterações no storage...');
    salvarDadosUsuario();
    
    document.getElementById('taskModal').classList.remove('active');
    appState.editingTaskId = null;
    console.log('🧹 Modal fechado e editingTaskId limpo');
    
    console.log('🔄 Atualizando interface...');
    renderTasks();
    updateInsights();
    updateOverdueBadge();
    renderCalendar();
    
    console.log('✅ Tarefa salva e interface atualizada');
    console.log('=== FIM CRIAR/EDITAR TAREFA ===\n');
    
  } catch(erro) {
    console.error('❌ Erro ao criar/editar tarefa:', erro);
    alert('❌ Erro ao salvar tarefa: ' + erro.message);
  } finally {
    // SEMPRE DESATIVAR FLAG
    criandoTarefa = false;
    console.log('Flag criandoTarefa resetada');
  }
}

function parseNaturalLanguage() {
  const input = document.getElementById('naturalLanguageInput').value.trim().toLowerCase();
  
  if (!input) {
    alert('Por favor, digite uma descrição.');
    return;
  }
  
  const parsed = { titulo: '', data: '', horario: '' };
  
  const words = input.split(' ');
  let titleWords = [];
  for (let i = 0; i < words.length && i < 5; i++) {
    if (!['amanhã', 'hoje', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'às'].includes(words[i])) {
      titleWords.push(words[i]);
    } else {
      break;
    }
  }
  parsed.titulo = titleWords.join(' ');
  
  const hoje = new Date();
  if (input.includes('hoje')) {
    parsed.data = formatDate(hoje);
  } else if (input.includes('amanhã') || input.includes('amanha')) {
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    parsed.data = formatDate(amanha);
  }
  
  const timeMatch = input.match(/(\d{1,2})h|(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    if (timeMatch[1]) {
      parsed.horario = `${timeMatch[1].padStart(2, '0')}:00`;
    } else if (timeMatch[2] && timeMatch[3]) {
      parsed.horario = `${timeMatch[2].padStart(2, '0')}:${timeMatch[3]}`;
    }
  }
  
  if (parsed.titulo) document.getElementById('taskTitulo').value = capitalizeFirst(parsed.titulo);
  if (parsed.data) document.getElementById('taskData').value = parsed.data;
  if (parsed.horario) document.getElementById('taskHorario').value = parsed.horario;
  
  const summary = document.getElementById('parsedSummary');
  summary.innerHTML = `<h4>✓ Tarefa Interpretada</h4><p><strong>Título:</strong> ${capitalizeFirst(parsed.titulo) || 'Não detectado'}</p>`;
  summary.style.display = 'block';
}

let recurringModalListenersAdicionados = false;

function setupRecurringTaskModal() {
  if (recurringModalListenersAdicionados) {
    console.log('⚠️ Recurring modal listeners já foram adicionados, pulando...');
    return;
  }
  
  console.log('✅ Adicionando recurring modal listeners pela primeira vez');
  
  const modal = document.getElementById('recurringTaskModal');
  const newBtn = document.getElementById('newRecurringTaskBtn');
  const closeModal = document.getElementById('closeRecurringModal');
  const cancelBtn = document.getElementById('cancelRecurringBtn');
  const saveBtn = document.getElementById('saveRecurringBtn');
  
  newBtn.addEventListener('click', () => {
    console.log('🔘 Botão Nova Tarefa Fixa clicado');
    openRecurringTaskModal();
  });
  closeModal.addEventListener('click', () => {
    console.log('🔘 Botão fechar modal recurring clicado');
    modal.classList.remove('active');
  });
  cancelBtn.addEventListener('click', () => {
    console.log('🔘 Botão cancelar recurring clicado');
    modal.classList.remove('active');
  });
  saveBtn.addEventListener('click', () => {
    console.log('🔘 Botão salvar tarefa fixa clicado');
    saveRecurringTask();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });
  
  recurringModalListenersAdicionados = true;
  console.log('✅ Recurring modal listeners adicionados com sucesso');
}

function openRecurringTaskModal(taskId = null) {
  const modal = document.getElementById('recurringTaskModal');
  const modalTitle = document.getElementById('recurringModalTitle');
  
  if (taskId) {
    appState.editingRecurringId = taskId;
    const task = appState.recurringTasks.find(t => t.id === taskId);
    modalTitle.textContent = 'Editar Tarefa Fixa';
    
    document.getElementById('recurringTitulo').value = task.titulo;
    document.getElementById('recurringDescricao').value = task.descricao || '';
    document.getElementById('recurringHoraInicio').value = task.horaInicio || '';
    document.getElementById('recurringHoraConclusao').value = task.horaConclusao || '';
    document.getElementById('recurringPrioridade').value = task.prioridade;
    
    const statusField = document.getElementById('recurringStatus');
    if (statusField) {
      statusField.value = task.status || 'nao_iniciado';
    }
    
    document.querySelectorAll('.recurring-day').forEach(checkbox => {
      checkbox.checked = task.dias.includes(checkbox.value);
    });
  } else {
    appState.editingRecurringId = null;
    modalTitle.textContent = 'Nova Tarefa Fixa';
    clearRecurringForm();
  }
  
  modal.classList.add('active');
}

function clearRecurringForm() {
  document.getElementById('recurringTitulo').value = '';
  document.getElementById('recurringDescricao').value = '';
  document.getElementById('recurringHoraInicio').value = '';
  document.getElementById('recurringHoraConclusao').value = '';
  document.getElementById('recurringPrioridade').value = 'media';
  
  const statusField = document.getElementById('recurringStatus');
  if (statusField) {
    statusField.value = 'nao_iniciado';
  }
  
  document.querySelectorAll('.recurring-day').forEach(checkbox => {
    checkbox.checked = false;
  });
}

function saveRecurringTask() {
  console.log('=== CRIAR/EDITAR TAREFA FIXA ===');
  
  // PROTEÇÃO: Evitar múltiplas execuções simultâneas
  if (criandoTarefaFixa) {
    console.warn('⚠️ Criação já em andamento, ignorando...');
    return;
  }
  
  criandoTarefaFixa = true;
  
  try {
    const titulo = document.getElementById('recurringTitulo').value.trim();
    const descricao = document.getElementById('recurringDescricao').value.trim();
    const horaInicio = document.getElementById('recurringHoraInicio').value;
    const horaConclusao = document.getElementById('recurringHoraConclusao').value;
    const prioridade = document.getElementById('recurringPrioridade').value;
    const dias = Array.from(document.querySelectorAll('.recurring-day:checked')).map(cb => cb.value);
    
    console.log('📝 Dados do formulário:', {titulo, dias, horaInicio, prioridade});
    
    if (!titulo || dias.length === 0) {
      alert('Preencha o título e selecione pelo menos um dia.');
      criandoTarefaFixa = false;
      return;
    }
    
    // VALIDAR DUPLICAÇÃO: Se não está editando, verificar se tarefa similar já existe
    if (!appState.editingRecurringId) {
      const tarefaDuplicada = appState.recurringTasks.find(t => 
        t.titulo === titulo && 
        JSON.stringify(t.dias.sort()) === JSON.stringify(dias.sort())
      );
      
      if (tarefaDuplicada) {
        console.warn('⚠️ DUPLICAÇÃO DETECTADA:', tarefaDuplicada);
        if (!confirm('Uma tarefa fixa similar já existe. Deseja criar mesmo assim?')) {
          console.log('❌ Criação cancelada pelo usuário');
          criandoTarefaFixa = false;
          return;
        }
      }
    }
  
    const statusField = document.getElementById('recurringStatus');
    const status = statusField ? statusField.value : 'nao_iniciado';
    
    const task = {
      id: appState.editingRecurringId || generateId(),
      titulo,
      descricao,
      dias,
      horaInicio,
      horaConclusao,
      prioridade,
      status: status
    };
    
    const tamanhoAntes = appState.recurringTasks.length;
    console.log('📊 Tarefas fixas ANTES da operação:', tamanhoAntes);
    
    if (appState.editingRecurringId) {
      const index = appState.recurringTasks.findIndex(t => t.id === appState.editingRecurringId);
      appState.recurringTasks[index] = task;
      console.log('📝 Tarefa fixa EDITADA:', task.titulo, '(índice:', index, ')');
    } else {
      appState.recurringTasks.push(task);
      console.log('➕ Nova tarefa fixa CRIADA:', task.titulo, '(ID:', task.id, ')');
    }
    
    const tamanhoDepois = appState.recurringTasks.length;
    console.log('📊 Tarefas fixas DEPOIS da operação:', tamanhoDepois);
    
    // VALIDAÇÃO ANTI-DUPLICAÇÃO
    if (!appState.editingRecurringId && tamanhoDepois !== tamanhoAntes + 1) {
      console.error('❌ ERRO: Tamanho inesperado! Esperado:', tamanhoAntes + 1, 'Obtido:', tamanhoDepois);
    } else if (!appState.editingRecurringId) {
      console.log('✅ VALIDAÇÃO: Tarefa fixa adicionada corretamente (apenas 1x)');
    }
    
    console.log('💾 Salvando alterações no storage...');
    salvarDadosUsuario();
    
    document.getElementById('recurringTaskModal').classList.remove('active');
    appState.editingRecurringId = null;
    console.log('🧹 Modal fechado e editingRecurringId limpo');
    
    console.log('🔄 Atualizando interface...');
    renderRecurringTasks();
    renderCalendar();
    
    console.log('✅ Tarefa fixa salva e interface atualizada');
    console.log('=== FIM CRIAR/EDITAR TAREFA FIXA ===\n');
    
  } catch(erro) {
    console.error('❌ Erro ao criar/editar tarefa fixa:', erro);
    alert('❌ Erro ao salvar tarefa fixa: ' + erro.message);
  } finally {
    // SEMPRE DESATIVAR FLAG
    criandoTarefaFixa = false;
    console.log('Flag criandoTarefaFixa resetada');
  }
}

function renderTasks() {
  const taskList = document.getElementById('taskList');
  const periodo = document.getElementById('filterPeriodo').value;
  const status = document.getElementById('filterStatus').value;
  const prioridade = document.getElementById('filterPrioridade').value;
  
  let filteredTasks = [...appState.tasks];
  
  if (periodo === 'hoje') {
    const hoje = formatDate(new Date());
    filteredTasks = filteredTasks.filter(t => t.data === hoje);
  } else if (periodo === 'semana') {
    const weekDates = getWeekDates(0);
    filteredTasks = filteredTasks.filter(t => weekDates.includes(t.data));
  }
  
  if (status !== 'todos') {
    filteredTasks = filteredTasks.filter(t => t.status === status);
  }
  
  if (prioridade !== 'todas') {
    filteredTasks = filteredTasks.filter(t => t.prioridade === prioridade);
  }
  
  filteredTasks.sort((a, b) => {
    if (a.data !== b.data) return a.data.localeCompare(b.data);
    return (a.horario || '').localeCompare(b.horario || '');
  });
  
  if (filteredTasks.length === 0) {
    taskList.innerHTML = '<p class="empty-state">Nenhuma tarefa encontrada.</p>';
    return;
  }
  
  taskList.innerHTML = filteredTasks.map(task => {
    const isOverdue = isTaskOverdue(task);
    return `
      <div class="task-item ${isOverdue ? 'overdue' : ''}">
        <input type="checkbox" class="task-checkbox" ${task.status === 'concluido' ? 'checked' : ''} onchange="toggleTaskComplete('${task.id}')">
        <div class="task-content">
          <div class="task-header">
            <h3 class="task-title">${task.titulo}</h3>
            <span class="task-priority ${task.prioridade}">${task.prioridade.toUpperCase()}</span>
          </div>
          ${task.descricao ? `<p class="task-description">${task.descricao}</p>` : ''}
          <div class="task-meta">
            <span>📅 ${formatDateBR(task.data)}</span>
            ${task.horario ? `<span>🕐 ${task.horaConclusao ? `${task.horario} - ${task.horaConclusao}` : task.horario}</span>` : ''}
          </div>
          <div style="display: flex; gap: 12px; align-items: center; margin-top: 12px;">
            <select class="task-status-selector" onchange="updateTaskStatus('${task.id}', this.value)">
              <option value="nao_iniciado" ${task.status === 'nao_iniciado' ? 'selected' : ''}>Não Iniciado</option>
              <option value="em_andamento" ${task.status === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
              <option value="concluido" ${task.status === 'concluido' ? 'selected' : ''}>Concluído</option>
            </select>
            <div class="task-actions">
              <button class="btn btn--secondary" onclick="openTaskModal('${task.id}')">Editar</button>
              <button class="btn btn--secondary" onclick="deleteTask('${task.id}')">Excluir</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderRecurringTasks() {
  const list = document.getElementById('recurringTasksList');
  
  if (appState.recurringTasks.length === 0) {
    list.innerHTML = '<p class="empty-state">Nenhuma tarefa fixa cadastrada.</p>';
    return;
  }
  
  const dayNames = { 'seg': 'Seg', 'ter': 'Ter', 'qua': 'Qua', 'qui': 'Qui', 'sex': 'Sex', 'sab': 'Sáb' };
  
  list.innerHTML = appState.recurringTasks.map(task => {
    const statusEmoji = (task.status || 'nao_iniciado') === 'nao_iniciado' ? '⚪' :
                       task.status === 'em_andamento' ? '🟡' : '🟢';
    const statusLabel = (task.status || 'nao_iniciado') === 'nao_iniciado' ? 'Não Iniciado' :
                       task.status === 'em_andamento' ? 'Em Andamento' : 'Concluído';
    
    return `
      <div class="recurring-task-item" style="${task.status === 'concluido' ? 'opacity: 0.7;' : ''}">
        <div class="recurring-task-header">
          <h3 class="recurring-task-title">${task.titulo}</h3>
          <span class="task-priority ${task.prioridade}">${task.prioridade.toUpperCase()}</span>
        </div>
        ${task.descricao ? `<p class="task-description">${task.descricao}</p>` : ''}
        <div class="recurring-task-days">
          ${task.dias.map(day => `<span class="day-badge">${dayNames[day]}</span>`).join('')}
        </div>
        <div style="margin-top: 12px; padding: 8px; background-color: var(--color-bg-3); border-radius: var(--radius-base);">
          <strong>Status:</strong> ${statusEmoji} ${statusLabel}
        </div>
        <div class="task-actions" style="margin-top: 12px;">
          <button class="btn btn--secondary" onclick="openRecurringTaskModal('${task.id}')">Editar</button>
          <button class="btn btn--secondary" onclick="deleteRecurringTask('${task.id}')">Excluir</button>
        </div>
      </div>
    `;
  }).join('');
}

function toggleTaskComplete(taskId) {
  const task = appState.tasks.find(t => t.id === taskId);
  task.status = task.status === 'concluido' ? 'nao_iniciado' : 'concluido';
  salvarDadosUsuario();
  renderTasks();
  updateInsights();
  renderCalendar();
}

function updateTaskStatus(taskId, newStatus) {
  const task = appState.tasks.find(t => t.id === taskId);
  task.status = newStatus;
  salvarDadosUsuario();
  renderTasks();
  updateInsights();
  renderCalendar();
}

function deleteTask(taskId) {
  if (confirm('Excluir esta tarefa?')) {
    appState.tasks = appState.tasks.filter(t => t.id !== taskId);
    salvarDadosUsuario();
    renderTasks();
    updateInsights();
    renderCalendar();
  }
}

function deleteRecurringTask(taskId) {
  if (confirm('Excluir esta tarefa fixa?')) {
    appState.recurringTasks = appState.recurringTasks.filter(t => t.id !== taskId);
    salvarDadosUsuario();
    renderRecurringTasks();
    renderCalendar();
  }
}

function setupFilters() {
  document.getElementById('filterPeriodo').addEventListener('change', renderTasks);
  document.getElementById('filterStatus').addEventListener('change', renderTasks);
  document.getElementById('filterPrioridade').addEventListener('change', renderTasks);
}

function updateInsights() {
  const insightsContent = document.getElementById('insightsContent');
  const hoje = formatDate(new Date());
  
  const tarefasHoje = appState.tasks.filter(t => t.data === hoje);
  const tarefasAtrasadas = appState.tasks.filter(isTaskOverdue);
  
  let insights = [];
  
  if (tarefasAtrasadas.length > 0) {
    insights.push(`⚠️ Você tem <strong>${tarefasAtrasadas.length}</strong> tarefa${tarefasAtrasadas.length > 1 ? 's' : ''} atrasada${tarefasAtrasadas.length > 1 ? 's' : ''}.`);
  }
  
  if (tarefasHoje.length > 0) {
    const concluidas = tarefasHoje.filter(t => t.status === 'concluido').length;
    insights.push(`📋 Você tem <strong>${tarefasHoje.length}</strong> tarefa${tarefasHoje.length > 1 ? 's' : ''} para hoje${concluidas > 0 ? `, ${concluidas} concluída${concluidas > 1 ? 's' : ''}` : ''}.`);
  }
  
  if (insights.length === 0) {
    insights.push('✅ Parabéns! Você está em dia.');
  }
  
  insightsContent.innerHTML = insights.map(i => `<p>${i}</p>`).join('');
}

function setupOverdueModal() {
  const badge = document.getElementById('notificationBadge');
  const modal = document.getElementById('overdueModal');
  const closeModal = document.getElementById('closeOverdueModal');
  const closeBtn = document.getElementById('closeOverdueBtn');
  
  badge.addEventListener('click', () => showOverdueTasks());
  closeModal.addEventListener('click', () => modal.classList.remove('active'));
  closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });
}

function updateOverdueBadge() {
  const overdueTasks = appState.tasks.filter(isTaskOverdue);
  const badge = document.getElementById('notificationBadge');
  const count = document.getElementById('overdueCount');
  
  if (overdueTasks.length > 0) {
    count.textContent = overdueTasks.length;
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }
}

function showOverdueTasks() {
  const modal = document.getElementById('overdueModal');
  const list = document.getElementById('overdueTasksList');
  const overdueTasks = appState.tasks.filter(isTaskOverdue);
  
  if (overdueTasks.length === 0) {
    list.innerHTML = '<p class="empty-state">Nenhuma tarefa atrasada! 🎉</p>';
  } else {
    list.innerHTML = overdueTasks.map(task => `
      <div class="task-item overdue">
        <div class="task-content">
          <h3 class="task-title">${task.titulo}</h3>
          <div class="task-meta">
            <span>📅 ${formatDateBR(task.data)}</span>
          </div>
          <div class="task-actions" style="margin-top: 12px;">
            <button class="btn btn--primary" onclick="updateTaskStatus('${task.id}', 'concluido'); document.getElementById('overdueModal').classList.remove('active'); updateOverdueBadge();">Marcar Concluída</button>
          </div>
        </div>
      </div>
    `).join('');
  }
  
  modal.classList.add('active');
}

function setupCalendar() {
  document.getElementById('prevWeek').addEventListener('click', () => {
    appState.currentWeekOffset--;
    renderCalendar();
  });
  
  document.getElementById('nextWeek').addEventListener('click', () => {
    appState.currentWeekOffset++;
    renderCalendar();
  });
}

function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const weekLabel = document.getElementById('currentWeek');
  const weekDates = getWeekDates(appState.currentWeekOffset);

  weekLabel.textContent = `${formatDateBR(weekDates[0])} - ${formatDateBR(weekDates[6])}`;

  const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const dayAbbrev = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

  grid.innerHTML = weekDates.map((date, index) => {
    // Buscar tarefas novas do dia
    const dayTasks = appState.tasks.filter(t => t.data === date);

    // Buscar tarefas fixas do dia
    const recurringTasks = appState.recurringTasks.filter(t => t.dias.includes(dayAbbrev[index]));

    // ============================================================================
    // COMBINAR TODAS AS TAREFAS (NOVAS + FIXAS) E ORDENAR POR HORÁRIO
    // ============================================================================
    const todasTarefasDoDia = [];

    // Adicionar tarefas novas com tipo e horário para ordenação
    dayTasks.forEach(task => {
      todasTarefasDoDia.push({
        ...task,
        tipo: 'nova',
        horarioOrdenacao: task.horario || '99:99'
      });
    });

    // Adicionar tarefas fixas com tipo e horário para ordenação
    recurringTasks.forEach(task => {
      todasTarefasDoDia.push({
        ...task,
        tipo: 'fixa',
        horarioOrdenacao: task.horaInicio || '99:99'
      });
    });

    // Ordenar TODAS as tarefas por horário (crescente)
    todasTarefasDoDia.sort((a, b) => a.horarioOrdenacao.localeCompare(b.horarioOrdenacao));

    return `
      <div class="calendar-day">
        <div class="calendar-day-header">
          ${dayNames[index]}<br>
          <small>${formatDateBR(date)}</small>
        </div>
        ${todasTarefasDoDia.map(task => {
          if (task.tipo === 'nova') {
            // Renderizar tarefa nova
            return `
              <div class="calendar-task tipo-nova status-${task.status}" onclick="openTaskModal('${task.id}')">
                ${task.horario ? `<div class="calendar-task-time"><strong>${task.horario}${task.horaConclusao ? ' - ' + task.horaConclusao : ''}</strong></div>` : ''}
                <div class="calendar-task-title">● ${task.titulo}</div>
              </div>
            `;
          } else {
            // Renderizar tarefa fixa
            const statusClass = task.status || 'nao_iniciado';
            return `
              <div class="calendar-task tipo-fixa status-${statusClass}" onclick="openRecurringTaskModal('${task.id}')" title="Status: ${statusClass === 'nao_iniciado' ? 'Não Iniciado' : statusClass === 'em_andamento' ? 'Em Andamento' : 'Concluído'}">
                ${task.horaInicio ? `<div class="calendar-task-time"><strong>${task.horaInicio}${task.horaConclusao ? ' - ' + task.horaConclusao : ''}</strong></div>` : ''}
                <div class="calendar-task-title">◆ ${task.titulo}</div>
              </div>
            `;
          }
        }).join('')}
      </div>
    `;
  }).join('');
}


function setupAIChat() {
  const input = document.getElementById('aiInput');
  const sendBtn = document.getElementById('aiSendBtn');
  
  sendBtn.addEventListener('click', () => sendAIMessage());
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendAIMessage();
  });
}

function sendAIMessage() {
  const input = document.getElementById('aiInput');
  const question = input.value.trim();
  
  if (!question) return;
  
  const chat = document.getElementById('aiChat');
  
  chat.innerHTML += `
    <div class="ai-message user">
      <div class="ai-message-label">Você</div>
      <div class="ai-message-content">${question}</div>
    </div>
  `;
  
  const response = generateAIResponse(question);
  
  setTimeout(() => {
    chat.innerHTML += `
      <div class="ai-message assistant">
        <div class="ai-message-label">Assistente IA</div>
        <div class="ai-message-content">${response}</div>
      </div>
    `;
    chat.scrollTop = chat.scrollHeight;
  }, 500);
  
  input.value = '';
  chat.scrollTop = chat.scrollHeight;
  
  appState.chatHistory.push(
    { tipo: 'user', conteudo: question, timestamp: Date.now() },
    { tipo: 'assistant', conteudo: response, timestamp: Date.now() }
  );
  
  salvarDadosUsuario();
}

function generateAIResponse(question) {
  const q = question.toLowerCase();
  const hoje = formatDate(new Date());
  
  // PERGUNTA: Tarefas de hoje (NOVAS + FIXAS)
  if (q.includes('hoje') || q.includes('dia')) {
    const todasTarefasHoje = obterTodasAsTarefasDoHoje();
    
    if (todasTarefasHoje.length === 0) {
      return '✅ Você não tem tarefas para hoje! Dia tranquilo. 📅';
    }
    
    let resp = `📋 Suas tarefas de hoje (${todasTarefasHoje.length} no total):<br><br>`;
    
    todasTarefasHoje.forEach((t, i) => {
      const tipo = t.tipo === 'Fixa' ? '📌 Fixa' : '✏️ Nova';
      const status = t.status || 'nao_iniciado';
      const statusEmoji = status === 'concluido' ? '✅' : status === 'em_andamento' ? '🔄' : '⏸️';
      const horario = t.horario || (t.horaInicio ? t.horaInicio + (t.horaConclusao ? ' - ' + t.horaConclusao : '') : '');
      const prioridade = t.prioridade || 'media';
      
      resp += `${i + 1}. ${tipo} - <strong>${t.titulo}</strong><br>`;
      if (horario) resp += `   ⏰ ${horario}<br>`;
      resp += `   📊 Status: ${statusEmoji}<br>`;
      resp += `   ⭐ Prioridade: ${prioridade}<br><br>`;
    });
    
    const pendentes = todasTarefasHoje.filter(t => (t.status || 'nao_iniciado') !== 'concluido').length;
    if (pendentes > 0) {
      resp += `💡 Você ainda tem <strong>${pendentes}</strong> tarefa${pendentes > 1 ? 's' : ''} pendente${pendentes > 1 ? 's' : ''} hoje.`;
    }
    
    return resp;
  }
  
  // PERGUNTA: Conflitos
  if (q.includes('conflito')) {
    const conflitos = detectarConflitosEntreTodasAsTarefas();
    
    if (conflitos.length === 0) {
      return '✅ Ótimo! Você não tem conflitos de horário detectados.';
    }
    
    let resp = `⚠️ CONFLITOS DETECTADOS (${conflitos.length}):<br><br>`;
    
    conflitos.slice(0, 5).forEach((c, i) => {
      resp += `${i + 1}. <strong>${formatDateBR(c.data)}</strong><br>`;
      resp += `   🔴 ${c.tarefa1} (${c.tipo1}) - ${c.hora1}<br>`;
      resp += `   🔴 ${c.tarefa2} (${c.tipo2}) - ${c.hora2}<br><br>`;
    });
    
    if (conflitos.length > 5) {
      resp += `<em>... e mais ${conflitos.length - 5} conflito${conflitos.length - 5 > 1 ? 's' : ''}</em>`;
    }
    
    return resp;
  }
  
  // PERGUNTA: Status
  if (q.includes('status')) {
    const todasTarefasHoje = obterTodasAsTarefasDoHoje();
    
    const naoIniciado = todasTarefasHoje.filter(t => (t.status || 'nao_iniciado') === 'nao_iniciado').length;
    const emAndamento = todasTarefasHoje.filter(t => t.status === 'em_andamento').length;
    const concluido = todasTarefasHoje.filter(t => t.status === 'concluido').length;
    
    let resp = '📊 STATUS DE HOJE:<br><br>';
    resp += `⚪ Não iniciado: ${naoIniciado} tarefa${naoIniciado !== 1 ? 's' : ''}<br>`;
    resp += `🟡 Em andamento: ${emAndamento} tarefa${emAndamento !== 1 ? 's' : ''}<br>`;
    resp += `🟢 Concluído: ${concluido} tarefa${concluido !== 1 ? 's' : ''}<br><br>`;
    resp += `<strong>Total: ${todasTarefasHoje.length} tarefas para hoje</strong>`;
    
    return resp;
  }
  
  // PERGUNTA: Atrasadas
  if (q.includes('atrasad') || q.includes('atraso')) {
    const hoje = new Date();
    const tarefasAtrasadas = appState.tasks.filter(t => {
      const dataPrazo = new Date(t.prazo || t.data);
      return dataPrazo < hoje && (t.status || 'nao_iniciado') !== 'concluido';
    });
    
    if (tarefasAtrasadas.length === 0) {
      return '✅ Nenhuma tarefa atrasada! Você está em dia.';
    }
    
    let resp = `⚠️ TAREFAS ATRASADAS (${tarefasAtrasadas.length}):<br><br>`;
    tarefasAtrasadas.slice(0, 5).forEach((t, i) => {
      const diasAtrasado = Math.floor((hoje - new Date(t.prazo || t.data)) / (1000 * 60 * 60 * 24));
      resp += `${i + 1}. <strong>${t.titulo}</strong><br>`;
      resp += `   ⏰ ${diasAtrasado} dia${diasAtrasado > 1 ? 's' : ''} atrasada<br>`;
      resp += `   ⭐ Prioridade: ${t.prioridade}<br><br>`;
    });
    
    return resp;
  }
  
  // RESPOSTA PADRÃO
  return `📊 Estatísticas gerais:<br><br>` +
         `<strong>Total:</strong> ${appState.tasks.length} tarefas novas + ${appState.recurringTasks.length} tarefas fixas<br>` +
         `✅ Concluídas: ${appState.tasks.filter(t => t.status === 'concluido').length}<br>` +
         `🔄 Em andamento: ${appState.tasks.filter(t => t.status === 'em_andamento').length}<br><br>` +
         `💡 <strong>Perguntas que posso responder:</strong><br>` +
         `• "Quais são minhas tarefas de hoje?"<br>` +
         `• "Tenho conflitos?"<br>` +
         `• "Como está meu status?"<br>` +
         `• "Quais tarefas estão atrasadas?"`;
}

function setupWizard() {
  console.log('=== CONFIGURANDO WIZARD ===');
  
  const btnProximo = document.getElementById('wizardNext');
  const btnAnterior = document.getElementById('wizardPrev');
  
  if (!btnProximo || !btnAnterior) {
    console.error('❌ Botões do wizard não encontrados');
    return;
  }
  
  // Renderizar primeira pergunta
  renderizarPerguntaAtual();
  
  btnProximo.addEventListener('click', perguntaProxima);
  btnAnterior.addEventListener('click', perguntaAnterior);
  
  console.log('✅ Wizard configurado com sucesso');
}

function renderizarPerguntaAtual() {
  console.log('=== RENDERIZANDO PERGUNTA', (perguntaAtual + 1), '===');
  
  const container = document.getElementById('wizardInput');
  if (!container) {
    console.error('❌ Container wizardInput não encontrado');
    return;
  }
  
  container.innerHTML = '';
  
  const pergunta = perguntas[perguntaAtual];
  console.log('📝 Pergunta:', pergunta.pergunta);
  
  // Atualizar título da pergunta
  const questionElement = document.getElementById('wizardQuestion');
  if (questionElement) {
    questionElement.textContent = pergunta.pergunta;
  }
  
  // Renderizar de acordo com tipo
  if (pergunta.tipo === 'texto') {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'resposta_' + pergunta.id;
    input.placeholder = pergunta.placeholder;
    input.value = pergunta.resposta;
    input.className = 'form-control';
    input.style.width = '100%';
    input.addEventListener('change', function() {
      perguntas[perguntaAtual].resposta = input.value;
      console.log('✅ Resposta salva:', input.value);
    });
    container.appendChild(input);
  }
  else if (pergunta.tipo === 'radio') {
    const divOpcoes = document.createElement('div');
    divOpcoes.className = 'radio-group';
    divOpcoes.style.display = 'flex';
    divOpcoes.style.flexDirection = 'column';
    divOpcoes.style.gap = '12px';
    
    pergunta.opcoes.forEach((opcao) => {
      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '12px';
      label.style.padding = '12px';
      label.style.border = '1px solid var(--color-border)';
      label.style.borderRadius = 'var(--radius-base)';
      label.style.cursor = 'pointer';
      label.style.transition = 'all var(--duration-fast)';
      
      label.addEventListener('mouseenter', function() {
        label.style.backgroundColor = 'var(--color-secondary)';
      });
      label.addEventListener('mouseleave', function() {
        label.style.backgroundColor = '';
      });
      
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'opcao_' + pergunta.id;
      input.value = opcao;
      input.checked = pergunta.resposta === opcao;
      input.style.width = '20px';
      input.style.height = '20px';
      input.addEventListener('change', function() {
        perguntas[perguntaAtual].resposta = opcao;
        console.log('✅ Resposta salva:', opcao);
      });
      
      const span = document.createElement('span');
      span.textContent = opcao;
      
      label.appendChild(input);
      label.appendChild(span);
      divOpcoes.appendChild(label);
    });
    
    container.appendChild(divOpcoes);
  }
  else if (pergunta.tipo === 'slider') {
    const divSlider = document.createElement('div');
    divSlider.style.display = 'flex';
    divSlider.style.flexDirection = 'column';
    divSlider.style.gap = '16px';
    
    const input = document.createElement('input');
    input.type = 'range';
    input.id = 'resposta_' + pergunta.id;
    input.min = pergunta.min;
    input.max = pergunta.max;
    input.value = pergunta.resposta;
    input.style.width = '100%';
    
    const labelValor = document.createElement('div');
    labelValor.id = 'valor_' + pergunta.id;
    labelValor.textContent = pergunta.resposta + ' horas';
    labelValor.style.textAlign = 'center';
    labelValor.style.fontSize = 'var(--font-size-xl)';
    labelValor.style.fontWeight = 'var(--font-weight-semibold)';
    labelValor.style.color = 'var(--color-primary)';
    
    input.addEventListener('input', function() {
      perguntas[perguntaAtual].resposta = parseInt(input.value);
      labelValor.textContent = input.value + ' horas';
      console.log('✅ Resposta salva:', input.value);
    });
    
    divSlider.appendChild(input);
    divSlider.appendChild(labelValor);
    container.appendChild(divSlider);
  }
  
  // Atualizar botões
  atualizarBotoesNavegacao();
  
  console.log('✓ Pergunta renderizada');
}

function perguntaProxima() {
  console.log('=== PRÓXIMA PERGUNTA ===');
  
  if (perguntaAtual < perguntas.length - 1) {
    perguntaAtual++;
    renderizarPerguntaAtual();
  } else {
    console.log('✓ Última pergunta - finalizando');
    finalizarPerguntas();
  }
}

function perguntaAnterior() {
  console.log('=== PERGUNTA ANTERIOR ===');
  
  if (perguntaAtual > 0) {
    perguntaAtual--;
    renderizarPerguntaAtual();
  }
}

function atualizarBotoesNavegacao() {
  const btnAnterior = document.getElementById('wizardPrev');
  const btnProximo = document.getElementById('wizardNext');
  
  if (!btnAnterior || !btnProximo) return;
  
  // Mostrar botão Anterior se não for primeira pergunta
  if (perguntaAtual > 0) {
    btnAnterior.style.display = 'inline-flex';
  } else {
    btnAnterior.style.display = 'none';
  }
  
  // Mudar texto do botão Próximo na última pergunta
  if (perguntaAtual === perguntas.length - 1) {
    btnProximo.textContent = 'Finalizar ✓';
  } else {
    btnProximo.textContent = 'Próxima →';
  }
}

function finalizarPerguntas() {
  console.log('=== FINALIZANDO PERGUNTAS ===');
  
  // Compilar preferências
  const novasPreferencias = {};
  perguntas.forEach(p => {
    novasPreferencias[p.chave] = p.resposta;
  });
  
  appState.userPreferences = novasPreferencias;
  console.log('✅ Preferências salvas:', appState.userPreferences);
  
  // Salvar dados
  salvarDadosUsuario();
  
  // Mostrar resultados
  document.getElementById('wizardStep').style.display = 'none';
  document.getElementById('wizardResults').style.display = 'block';
  
  const prefDisplay = document.getElementById('preferencesDisplay');
  prefDisplay.innerHTML = `
    <p><strong>Horário de Trabalho:</strong> ${appState.userPreferences.horarioTrabalho || 'Não informado'}</p>
    <p><strong>Período de Maior Foco:</strong> ${appState.userPreferences.periodoPiko || 'Não informado'}</p>
    <p><strong>Horas de Concentração:</strong> ${appState.userPreferences.horasFoco || 0} hora${appState.userPreferences.horasFoco > 1 ? 's' : ''}</p>
    <p><strong>Preferência de Tarefas:</strong> ${appState.userPreferences.tipoTarefa || 'Não informado'}</p>
  `;
  
  const suggestions = generateTaskSuggestions(appState.userPreferences);
  document.getElementById('suggestionsDisplay').innerHTML = suggestions.map(s => `<p>💡 ${s}</p>`).join('');
  
  // Configurar botão de reiniciar
  const restartBtn = document.getElementById('restartWizard');
  if (restartBtn) {
    restartBtn.onclick = function() {
      perguntaAtual = 0;
      perguntas.forEach(p => p.resposta = p.tipo === 'slider' ? 4 : '');
      document.getElementById('wizardStep').style.display = 'block';
      document.getElementById('wizardResults').style.display = 'none';
      renderizarPerguntaAtual();
    };
  }
  
  alert('✓ Preferências salvas! Suas tarefas foram personalizadas.');
}

function generateTaskSuggestions(preferences) {
  const suggestions = [];
  
  if (preferences.periodoPico === 'Manhã') {
    suggestions.push('Agende tarefas de alta prioridade no período da manhã.');
    suggestions.push('Reserve as tardes para tarefas administrativas.');
  } else if (preferences.periodoPico === 'Tarde') {
    suggestions.push('Use o período da tarde para tarefas complexas.');
    suggestions.push('Use as manhãs para planejamento.');
  }
  
  if (preferences.horasFoco && preferences.horasFoco <= 3) {
    suggestions.push('Divida seu trabalho em blocos de 1-2 horas.');
  } else if (preferences.horasFoco && preferences.horasFoco >= 5) {
    suggestions.push('Você tem boa capacidade de foco! Aproveite para blocos longos.');
  }
  
  if (preferences.tipoTarefa === 'Blocos Longos (2-4h)') {
    suggestions.push('Agrupe tarefas similares em blocos de 2-3 horas.');
  } else if (preferences.tipoTarefa === 'Tarefas Curtas (15-30min)') {
    suggestions.push('Use a técnica Pomodoro: 25 minutos de foco + 5 de pausa.');
  }
  
  suggestions.push('Revise suas tarefas no início de cada dia.');
  
  return suggestions;
}

function setupExportImport() {
  document.getElementById('exportDataBtn').addEventListener('click', exportarDados);
  document.getElementById('importDataBtn').addEventListener('click', () => {
    document.getElementById('importFileInput').click();
  });
  document.getElementById('importFileInput').addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      importarDados(e.target.files[0]);
      e.target.value = '';
    }
  });
}

// Funções utilitárias
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateBR(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getWeekDates(weekOffset = 0) {
  const hoje = new Date();
  const currentDay = hoje.getDay();
  const monday = new Date(hoje);
  const daysFromMonday = currentDay === 0 ? -6 : 1 - currentDay;
  monday.setDate(hoje.getDate() + daysFromMonday + (weekOffset * 7));
  
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(formatDate(date));
  }
  return dates;
}

function isTaskOverdue(task) {
  if (task.status === 'concluido') return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const compareDate = new Date(task.data + 'T00:00:00');
  return compareDate < hoje;
}

// ============================================================================
// INSIGHTS DE PRODUTIVIDADE
// ============================================================================

function setupInsights() {
  console.log('✅ Insights configurados');
}

function renderizarInsights() {
  console.log('=== RENDERIZANDO INSIGHTS ===');
  
  // 1. CALCULAR MÉTRICAS
  const totalTarefas = appState.tasks.length + appState.recurringTasks.length;
  const concluidas = appState.tasks.filter(t => t.status === 'concluido').length +
                     appState.recurringTasks.filter(tf => tf.status === 'concluido').length;
  
  const pendentes = appState.tasks.filter(t => t.status !== 'concluido').length +
                    appState.recurringTasks.filter(tf => (tf.status || 'nao_iniciado') !== 'concluido').length;
  
  const hoje = new Date();
  const atrasadas = appState.tasks.filter(t => {
    const dataPrazo = new Date(t.prazo || t.data);
    return dataPrazo < hoje && t.status !== 'concluido';
  }).length;
  
  // 2. ATUALIZAR CARDS
  document.getElementById('totalTarefas').textContent = totalTarefas;
  document.getElementById('tarefasConcluidas').textContent = concluidas;
  document.getElementById('tarefasPendentes').textContent = pendentes;
  document.getElementById('tarefasAtrasadas').textContent = atrasadas;
  
  // 3. GERAR RANKING
  gerarRankingTarefas();
  
  // 4. GERAR INSIGHTS
  gerarInsightsPersonalizados();
  
  console.log('✅ Insights renderizados');
}

function gerarRankingTarefas() {
  console.log('=== GERANDO RANKING ===');
  
  const hoje = new Date();
  
  // Combinar todas as tarefas
  const todasAsTarefas = [
    ...appState.tasks.map(t => ({...t, tipo: 'Nova'})),
    ...appState.recurringTasks.map(tf => ({...tf, tipo: 'Fixa', prazo: null, data: null}))
  ];
  
  // Filtrar apenas pendentes
  const pendentes = todasAsTarefas.filter(t => (t.status || 'nao_iniciado') !== 'concluido');
  
  // Ordenar por: Prioridade (alta > média > baixa) e Data
  pendentes.sort((a, b) => {
    const prioridades = {'alta': 3, 'media': 2, 'baixa': 1};
    const priA = prioridades[a.prioridade || 'media'] || 2;
    const priB = prioridades[b.prioridade || 'media'] || 2;
    
    if (priA !== priB) return priB - priA;
    
    const dataA = new Date(a.prazo || a.data || '2099-12-31');
    const dataB = new Date(b.prazo || b.data || '2099-12-31');
    
    return dataA - dataB;
  });
  
  // Renderizar ranking
  const tbody = document.getElementById('corpuTabelaRanking');
  tbody.innerHTML = '';
  
  if (pendentes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 32px;">🎉 Parabéns! Nenhuma tarefa pendente.</td></tr>';
    return;
  }
  
  pendentes.slice(0, 20).forEach((t, i) => {
    const dataPrazo = t.prazo || t.data;
    const diasRestantes = dataPrazo ? Math.ceil((new Date(dataPrazo) - hoje) / (1000 * 60 * 60 * 24)) : '—';
    
    const tr = document.createElement('tr');
    const statusEmoji = (t.status || 'nao_iniciado') === 'nao_iniciado' ? '⚪' :
                       t.status === 'em_andamento' ? '🟡' : '🟢';
    
    const prioridadeEmoji = t.prioridade === 'alta' ? '🔴' :
                           t.prioridade === 'media' ? '🟠' : '🟢';
    
    const diasCor = typeof diasRestantes === 'number' ? 
                   (diasRestantes < 0 ? 'red' : diasRestantes < 2 ? 'orange' : 'green') : 'gray';
    
    const dataExibicao = dataPrazo ? formatDateBR(dataPrazo) : 'Sem prazo';
    const diasExibicao = typeof diasRestantes === 'number' ? `${diasRestantes} dias` : '—';
    
    tr.innerHTML = `
      <td><strong>${i + 1}</strong></td>
      <td><strong>${t.titulo}</strong></td>
      <td>${t.tipo}</td>
      <td>${dataExibicao}</td>
      <td>${prioridadeEmoji} ${(t.prioridade || 'media').charAt(0).toUpperCase() + (t.prioridade || 'media').slice(1)}</td>
      <td>${statusEmoji}</td>
      <td><span style="color: ${diasCor}; font-weight: bold;">${diasExibicao}</span></td>
    `;
    
    tbody.appendChild(tr);
  });
  
  console.log('✅ Ranking gerado');
}

function gerarInsightsPersonalizados() {
  console.log('=== GERANDO INSIGHTS PERSONALIZADOS ===');
  
  const insights = [];
  const totalTarefas = appState.tasks.length + appState.recurringTasks.length;
  const concluidas = appState.tasks.filter(t => t.status === 'concluido').length +
                     appState.recurringTasks.filter(tf => tf.status === 'concluido').length;
  
  // Insight 1: Taxa de conclusão
  const taxaConclusao = totalTarefas > 0 ? Math.round((concluidas / totalTarefas) * 100) : 0;
  insights.push({
    tipo: 'taxa',
    emoji: '📈',
    titulo: 'Taxa de Conclusão',
    valor: taxaConclusao + '%',
    mensagem: taxaConclusao > 70 ? 'Excelente! Você está muito produtivo!' :
              taxaConclusao > 50 ? 'Bom progresso. Continue assim!' :
              'Há espaço para melhorar. Foque nas próximas tarefas!'
  });
  
  // Insight 2: Tarefas atrasadas
  const hoje = new Date();
  const atrasadas = appState.tasks.filter(t => {
    const dataPrazo = new Date(t.prazo || t.data);
    return dataPrazo < hoje && t.status !== 'concluido';
  });
  
  insights.push({
    tipo: 'atrasadas',
    emoji: '⚠️',
    titulo: 'Tarefas Atrasadas',
    valor: atrasadas.length,
    mensagem: atrasadas.length > 0 ? 
              `Você tem ${atrasadas.length} tarefa${atrasadas.length > 1 ? 's' : ''} atrasada${atrasadas.length > 1 ? 's' : ''}. Recomendo priorizar!` :
              'Nenhuma tarefa atrasada. Parabéns!'
  });
  
  // Insight 3: Período de pico
  const tarefasComHorario = appState.tasks.filter(t => t.horario);
  const tarefasPorPeriodo = {manha: 0, tarde: 0};
  tarefasComHorario.forEach(t => {
    const hora = parseInt(t.horario.split(':')[0]);
    if (hora < 12) tarefasPorPeriodo.manha++;
    else tarefasPorPeriodo.tarde++;
  });
  
  const periodoPico = tarefasPorPeriodo.manha > tarefasPorPeriodo.tarde ? 'Manhã' : 
                     tarefasPorPeriodo.tarde > tarefasPorPeriodo.manha ? 'Tarde' : 'Equilibrado';
  
  insights.push({
    tipo: 'pico',
    emoji: '🌡️',
    titulo: 'Período de Pico',
    valor: periodoPico,
    mensagem: periodoPico === 'Equilibrado' ? 
              'Suas tarefas estão bem distribuídas!' :
              `Reserve suas tarefas importantes para o período da ${periodoPico.toLowerCase()}!`
  });
  
  // Renderizar
  const container = document.getElementById('containerInsightsTxt');
  container.innerHTML = '';
  
  insights.forEach(i => {
    const div = document.createElement('div');
    div.className = 'insight-card';
    div.innerHTML = `
      <div class="insight-header">
        <span class="insight-emoji">${i.emoji}</span>
        <h4>${i.titulo}</h4>
        <span class="insight-valor">${i.valor}</span>
      </div>
      <p class="insight-mensagem">${i.mensagem}</p>
    `;
    container.appendChild(div);
  });
  
  console.log('✅ Insights personalizados gerados');
}

// Tornar funções disponíveis globalmente
window.toggleTaskComplete = toggleTaskComplete;
window.updateTaskStatus = updateTaskStatus;
window.deleteTask = deleteTask;
window.openTaskModal = openTaskModal;
window.openRecurringTaskModal = openRecurringTaskModal;
window.deleteRecurringTask = deleteRecurringTask;
window.togglePassword = togglePassword;

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('=== APP INICIALIZADO ===');
  console.log('✅ Arquivo único: script.js');
  
  // Prevenir múltiplas inicializações
  if (appInicializado) {
    console.warn('⚠️ App já foi inicializado');
    return;
  }
  
  appInicializado = true;
  
  // Carregar dados globais
  const usuariosStr = storage.getItem('app_usuarios');
  if (usuariosStr) {
    usuarios = JSON.parse(usuariosStr);
    console.log('📊 Usuários carregados:', usuarios.length);
  }
  
  // Verificar sessão
  const usuarioLogadoStr = storage.getItem('app_usuarioLogado');
  if (usuarioLogadoStr) {
    usuarioLogado = JSON.parse(usuarioLogadoStr);
    console.log('✅ Sessão encontrada:', usuarioLogado.nome);
    carregarDadosUsuario();
    showMainApp();
  } else {
    console.log('ℹ️ Nenhuma sessão ativa');
    showAuthScreen();
  }
  
  // Setup listeners de autenticação
  document.getElementById('loginBtn').addEventListener('click', handleLogin);
  document.getElementById('registerBtn').addEventListener('click', handleRegister);
  document.getElementById('logoutBtn').addEventListener('click', fazerLogout);
  
  // Setup importação no login
  setupLoginImport();
  
  // Enter para login
  document.getElementById('loginSenha').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  
  console.log('✅ Tudo pronto!');
  console.log('=== SISTEMA DE ABAS FUNCIONANDO ===');
  console.log('\n💡 SISTEMA DE PROTEÇÃO ATIVO:');
  console.log('  - Flag criandoTarefa: previne duplicação em tarefas novas');
  console.log('  - Flag criandoTarefaFixa: previne duplicação em tarefas fixas');
  console.log('  - Flag appInicializado: previne múltiplas inicializações');
  console.log('  - Validação de duplicatas antes de adicionar ao array');
  console.log('  - Logs detalhados em cada operação\n');
});
