// ============================================
// SISTEMA DE ARMAZENAMENTO PERSISTENTE
// ============================================
// NOTA IMPORTANTE: Em ambiente sandbox sem 'allow-same-origin',
// localStorage/sessionStorage estão bloqueados por segurança.
// Este código usa armazenamento em memória como única opção disponível.
// Os dados serão mantidos durante a sessão do navegador, mas serão
// perdidos ao fechar completamente o navegador.
// ============================================

// Storage em memória (necessário devido a restrições do sandbox)
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
    console.log('🗑️ Removendo de memória:', key);
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

console.warn('⚠️ Usando armazenamento em memória');
console.warn('⚠️ Dados serão mantidos durante a sessão, mas perdidos ao fechar o navegador');
console.warn('⚠️ Isso ocorre devido às restrições de segurança do ambiente sandbox');

// Estado Global da Aplicação
let globalState = {
  usuarios: [], // Lista de todos os usuários registrados
  usuarioLogado: null, // Usuário atualmente logado
  dadosUsuarios: {} // Dados de cada usuário (tarefas, preferências, etc.)
};

// Estado da sessão atual
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

// ============================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('=== INICIALIZANDO APLICAÇÃO ===');
  inicializarApp();
});

// Função principal de inicialização
function inicializarApp() {
  console.log('🚀 Iniciando carregamento de dados...');
  
  // Carregar dados globais (lista de usuários)
  carregarDadosGlobais();
  
  // Verificar se há sessão ativa
  const sessaoAtiva = verificarSessao();
  
  if (!sessaoAtiva) {
    console.log('ℹ️ Nenhuma sessão ativa - mostrando tela de login');
  }
  
  // Mostrar status do localStorage
  if (!isLocalStorageAvailable) {
    console.warn('⚠️ ATENÇÃO: Dados não serão persistidos ao fechar o navegador');
    console.warn('⚠️ Isso ocorre porque o ambiente está em sandbox');
  }
  
  console.log('✅ Inicialização completa');
  
  // Verificar novamente se funções de aba estão disponíveis
  console.log('\n🔍 Verificação final das funções de aba:');
  console.log('  - window.abrirAbaLogin:', typeof window.abrirAbaLogin);
  console.log('  - window.abrirAbaRegistro:', typeof window.abrirAbaRegistro);
  console.log('  - window.abrirAbaImportar:', typeof window.abrirAbaImportar);
  
  if (typeof window.abrirAbaLogin !== 'function') {
    console.error('❌ PROBLEMA DETECTADO: Funções de aba não estão disponíveis!');
  }
}

// Carregar dados do storage
function carregarDadosGlobais() {
  console.log('📂 Carregando dados globais...');
  
  try {
    // Carregar lista de usuários
    const usuariosStr = storage.getItem('app_usuarios');
    
    if (usuariosStr) {
      globalState.usuarios = JSON.parse(usuariosStr);
      console.log('✅ Usuários carregados:', globalState.usuarios.length);
      console.log('📋 Usuários:', globalState.usuarios.map(u => u.email).join(', '));
    } else {
      console.log('ℹ️ Nenhum usuário registrado ainda');
      globalState.usuarios = [];
    }
  } catch (error) {
    console.error('❌ Erro ao carregar dados globais:', error);
    globalState.usuarios = [];
  }
}

// Verificar se há sessão ativa
function verificarSessao() {
  console.log('🔍 Verificando sessão ativa...');
  
  try {
    const usuarioLogadoStr = storage.getItem('app_usuarioLogado');
    
    if (usuarioLogadoStr) {
      const usuario = JSON.parse(usuarioLogadoStr);
      globalState.usuarioLogado = usuario;
      console.log('✅ Sessão encontrada:', usuario.nome, '(' + usuario.email + ')');
      console.log('🆔 ID do usuário:', usuario.id);
      
      // Carregar dados do usuário
      carregarDadosUsuario();
      
      // Setup e mostrar app
      setupAuthListeners();
      showMainApp();
      return true;
    } else {
      console.log('ℹ️ Nenhuma sessão ativa (chave app_usuarioLogado não encontrada)');
    }
  } catch (error) {
    console.error('❌ Erro ao verificar sessão:', error);
    try {
      storage.removeItem('app_usuarioLogado');
    } catch (e) {
      console.error('Erro ao limpar sessão inválida:', e);
    }
  }
  
  setupAuthListeners();
  showAuthScreen();
  return false;
}

// ============================================================================
// FUNÇÕES DE NAVEGAÇÃO DE ABAS - SISTEMA ROBUSTO
// ============================================================================

// IMPORTANTE: Definir funções ANTES de atribuir ao window

function removerTodasAsAbas() {
  console.log('🧹 Removendo todas as abas ativas...');
  
  // Remover classe active de todos os botões
  document.querySelectorAll('.auth-tab').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Ocultar todos os conteúdos
  const conteudos = ['abaLoginConteudo', 'abaRegistroConteudo', 'abaImportarConteudo'];
  conteudos.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.classList.remove('active');
      elemento.style.display = 'none';
    }
  });
  
  // Limpar mensagens de erro
  const erros = ['loginError', 'registerError', 'importError'];
  erros.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) elemento.style.display = 'none';
  });
  
  const sucessos = ['registerSuccess', 'importSuccess'];
  sucessos.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) elemento.style.display = 'none';
  });
}

function abrirAbaLogin() {
  console.log('=== ABRINDO ABA LOGIN ===');
  console.log('1. Procurando elementos...');
  
  removerTodasAsAbas();
  
  const botao = document.getElementById('tabLogin');
  const conteudo = document.getElementById('abaLoginConteudo');
  
  console.log('Botão Login:', botao ? '✅ Encontrado' : '❌ Não encontrado');
  console.log('Conteúdo Login:', conteudo ? '✅ Encontrado' : '❌ Não encontrado');
  
  if (botao) {
    botao.classList.add('active');
    console.log('2. Classe "active" adicionada ao botão');
  } else {
    console.error('❌ ERRO: Botão Login não encontrado!');
  }
  
  if (conteudo) {
    conteudo.classList.add('active');
    conteudo.style.display = 'block';
    console.log('3. Conteúdo Login exibido');
  } else {
    console.error('❌ ERRO: Conteúdo Login não encontrado!');
  }
  
  console.log('✓ Aba Login aberta com sucesso');
  
  // Auto-focus no campo de email
  setTimeout(() => {
    const emailInput = document.getElementById('loginEmail');
    if (emailInput) emailInput.focus();
  }, 100);
}

function abrirAbaRegistro() {
  console.log('=== ABRINDO ABA REGISTRO ===');
  console.log('1. Procurando elementos...');
  
  removerTodasAsAbas();
  
  const botao = document.getElementById('tabRegistro');
  const conteudo = document.getElementById('abaRegistroConteudo');
  
  console.log('Botão Registro:', botao ? '✅ Encontrado' : '❌ Não encontrado');
  console.log('Conteúdo Registro:', conteudo ? '✅ Encontrado' : '❌ Não encontrado');
  
  if (botao) {
    botao.classList.add('active');
    console.log('2. Classe "active" adicionada ao botão');
  } else {
    console.error('❌ ERRO: Botão Registro não encontrado!');
  }
  
  if (conteudo) {
    conteudo.classList.add('active');
    conteudo.style.display = 'block';
    console.log('3. Conteúdo Registro exibido');
  } else {
    console.error('❌ ERRO: Conteúdo Registro não encontrado!');
  }
  
  console.log('✓ Aba Registro aberta com sucesso');
  
  // Auto-focus no campo de nome
  setTimeout(() => {
    const nomeInput = document.getElementById('registerNome');
    if (nomeInput) nomeInput.focus();
  }, 100);
}

function abrirAbaImportar() {
  console.log('=== ABRINDO ABA IMPORTAR ===');
  console.log('1. Procurando elementos...');
  
  removerTodasAsAbas();
  
  const botao = document.getElementById('tabImportar');
  const conteudo = document.getElementById('abaImportarConteudo');
  
  console.log('Botão Importar:', botao ? '✅ Encontrado' : '❌ Não encontrado');
  console.log('Conteúdo Importar:', conteudo ? '✅ Encontrado' : '❌ Não encontrado');
  
  if (botao) {
    botao.classList.add('active');
    console.log('2. Classe "active" adicionada ao botão');
  } else {
    console.error('❌ ERRO: Botão Importar não encontrado!');
  }
  
  if (conteudo) {
    conteudo.classList.add('active');
    conteudo.style.display = 'block';
    console.log('3. Conteúdo Importar exibido');
  } else {
    console.error('❌ ERRO: Conteúdo Importar não encontrado!');
  }
  
  console.log('✓ Aba Importar aberta com sucesso');
}

// ============================================================================
// SETUP DE AUTENTICAÇÃO (SIMPLIFICADO)
// ============================================================================

// Flag para evitar adicionar listeners múltiplas vezes
let authListenersAdicionados = false;

function setupAuthListeners() {
  if (authListenersAdicionados) {
    console.log('⚠️ Auth listeners já foram adicionados, pulando...');
    return;
  }
  
  console.log('=== INICIALIZANDO LISTENERS DE AUTENTICAÇÃO ===');
  console.log('✅ Sistema de abas usando onclick - não precisa de listeners');
  
  // Garantir que a aba de login está ativa ao iniciar
  setTimeout(() => {
    abrirAbaLogin();
  }, 100);
  
  // Login button
  document.getElementById('loginBtn').addEventListener('click', handleLogin);
  document.getElementById('loginEmail').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('loginSenha').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  
  // Register button
  document.getElementById('registerBtn').addEventListener('click', handleRegister);
  document.getElementById('registerConfirmSenha').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleRegister();
  });
  
  // Import on login screen
  setupLoginImport();
  
  authListenersAdicionados = true;
  console.log('✅ Auth listeners adicionados com sucesso');
  console.log('=== SISTEMA DE ABAS INICIALIZADO ===\n');
}

function showAuthScreen() {
  document.getElementById('authContainer').style.display = 'flex';
  document.getElementById('appContainer').style.display = 'none';
  
  // Garantir que aba de login está ativa
  setTimeout(() => {
    abrirAbaLogin();
  }, 150);
}

function showMainApp() {
  document.getElementById('authContainer').style.display = 'none';
  document.getElementById('appContainer').style.display = 'flex';
  
  // Mostrar aviso de sandbox se necessário
  if (!isLocalStorageAvailable) {
    document.getElementById('sandboxWarning').style.display = 'block';
  }
  
  // Carregar dados do usuário
  carregarDadosUsuario();
  
  // Atualizar saudação
  const greeting = document.getElementById('userGreeting');
  greeting.textContent = `Olá, ${globalState.usuarioLogado.nome.split(' ')[0]}!`;
  
  // Inicializar app
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
  setupLogout();
  setupExportImport();
  
  renderTasks();
  renderRecurringTasks();
  renderCalendar();
  updateInsights();
  updateOverdueBadge();
}

function setupLogout() {
  document.getElementById('logoutBtn').addEventListener('click', fazerLogout);
}

function setupExportImport() {
  // Botão de exportação
  document.getElementById('exportDataBtn').addEventListener('click', exportarDados);
  
  // Botão de importação
  document.getElementById('importDataBtn').addEventListener('click', () => {
    document.getElementById('importFileInput').click();
  });
  
  // Input de arquivo
  document.getElementById('importFileInput').addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      importarDados(e.target.files[0]);
      e.target.value = ''; // Limpar input
    }
  });
}

// FUNÇÕES DE AUTENTICAÇÃO

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
  
  // Validações
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
  
  // Buscar usuário
  const usuario = globalState.usuarios.find(u => u.email === email && u.senha === senha);
  
  if (!usuario) {
    errorDiv.textContent = 'Email ou senha incorretos';
    errorDiv.style.display = 'block';
    return;
  }
  
  // Login bem-sucedido
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
  
  // Validações
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
  
  // Verificar se email já existe
  if (globalState.usuarios.find(u => u.email === email)) {
    errorDiv.textContent = 'Este email já está registrado';
    errorDiv.style.display = 'block';
    return;
  }
  
  // Registrar usuário
  registrarUsuario(nome, email, senha);
  
  // Mostrar mensagem de sucesso
  successDiv.textContent = 'Registro realizado com sucesso! Faça login.';
  successDiv.style.display = 'block';
  
  // Limpar formulário
  document.getElementById('registerNome').value = '';
  document.getElementById('registerEmail').value = '';
  document.getElementById('registerSenha').value = '';
  document.getElementById('registerConfirmSenha').value = '';
  
  // Mudar para aba de login após 2 segundos
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
    senha: senha, // NOTA: Em produção, usar hash de senha
    dataCadastro: Date.now(),
    ativo: true
  };
  
  console.log('🆔 ID gerado:', novoUsuario.id);
  
  // Adicionar à lista de usuários
  globalState.usuarios.push(novoUsuario);
  console.log('📊 Total de usuários:', globalState.usuarios.length);
  
  // Salvar lista de usuários no storage
  try {
    const usuariosJson = JSON.stringify(globalState.usuarios);
    storage.setItem('app_usuarios', usuariosJson);
    console.log('✅ Lista de usuários salva com sucesso');
    console.log('💾 Chave: app_usuarios');
    console.log('💾 Dados:', usuariosJson.substring(0, 100) + '...');
    
    // Verificar se salvou
    const verificacao = storage.getItem('app_usuarios');
    if (verificacao) {
      console.log('✅ Verificação: dados salvos com sucesso');
    } else {
      console.error('❌ Verificação: dados NÃO foram salvos!');
    }
  } catch (error) {
    console.error('❌ ERRO ao salvar usuário:', error);
    alert('Erro ao salvar usuário. Os dados podem não ser persistidos.');
  }
  
  // Inicializar dados do usuário
  const dadosUsuario = {
    usuarioId: novoUsuario.id,
    tarefas: [],
    tarefasFixas: [],
    preferencias: {},
    historicoChat: [],
    ultimoSalvo: new Date().toISOString()
  };
  
  // Salvar dados iniciais do usuário
  try {
    const chave = 'app_dadosUsuario_' + novoUsuario.id;
    const dadosJson = JSON.stringify(dadosUsuario);
    storage.setItem(chave, dadosJson);
    console.log('✅ Dados iniciais do usuário salvos');
    console.log('💾 Chave:', chave);
  } catch (error) {
    console.error('❌ ERRO ao salvar dados iniciais do usuário:', error);
  }
  
  console.log('✅ Usuário registrado com sucesso:', novoUsuario.email);
  return novoUsuario;
}

function fazerLogin(usuario) {
  console.log('=== FAZENDO LOGIN ===');
  console.log('👤 Usuário:', usuario.nome);
  console.log('📧 Email:', usuario.email);
  console.log('🆔 ID:', usuario.id);
  
  const usuarioLogado = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email
  };
  
  globalState.usuarioLogado = usuarioLogado;
  
  // Salvar sessão no storage
  try {
    const chave = 'app_usuarioLogado';
    const usuarioJson = JSON.stringify(usuarioLogado);
    storage.setItem(chave, usuarioJson);
    console.log('✅ Sessão salva com sucesso');
    console.log('💾 Chave:', chave);
    console.log('💾 Dados:', usuarioJson);
    
    // Verificar se salvou
    const verificacao = storage.getItem(chave);
    if (verificacao) {
      console.log('✅ Verificação: sessão salva com sucesso');
    } else {
      console.error('❌ Verificação: sessão NÃO foi salva!');
    }
  } catch (error) {
    console.error('❌ ERRO ao salvar sessão:', error);
    alert('Erro ao fazer login. A sessão pode não ser mantida.');
  }
  
  // Carregar dados do usuário
  carregarDadosUsuario();
  
  // Limpar campos de login
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginSenha').value = '';
  document.getElementById('loginError').style.display = 'none';
  
  console.log('✅ Login completo - mostrando app principal');
  showMainApp();
}

function fazerLogout() {
  if (confirm('Deseja realmente sair?')) {
    console.log('=== FAZENDO LOGOUT ===');
    
    // Salvar dados do usuário antes de sair
    if (globalState.usuarioLogado) {
      console.log('💾 Salvando dados antes do logout...');
      salvarDadosUsuario();
    }
    
    // Remover sessão do storage (mas manter dados do usuário)
    try {
      storage.removeItem('app_usuarioLogado');
      console.log('✅ Sessão removida do storage');
      
      // Verificar se removeu
      const verificacao = storage.getItem('app_usuarioLogado');
      if (!verificacao) {
        console.log('✅ Verificação: sessão removida com sucesso');
      } else {
        console.error('❌ Verificação: sessão ainda existe!');
      }
    } catch (error) {
      console.error('❌ Erro ao remover sessão:', error);
    }
    
    // Limpar sessão em memória
    globalState.usuarioLogado = null;
    console.log('🧹 Sessão em memória limpa');
    
    // Limpar estado da aplicação
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
    console.log('🧹 Estado da aplicação limpo');
    
    console.log('✅ Logout completo - mostrando tela de login');
    showAuthScreen();
  }
}

function carregarDadosUsuario() {
  if (!globalState.usuarioLogado) {
    console.warn('⚠️ Tentativa de carregar dados sem usuário logado');
    return;
  }
  
  console.log('📂 Carregando dados do usuário:', globalState.usuarioLogado.id);
  
  try {
    const chave = 'app_dadosUsuario_' + globalState.usuarioLogado.id;
    const dadosStr = storage.getItem(chave);
    
    if (dadosStr) {
      console.log('📦 Dados encontrados, parseando...');
      const dadosUsuario = JSON.parse(dadosStr);
      
      appState.tasks = dadosUsuario.tarefas || [];
      appState.recurringTasks = dadosUsuario.tarefasFixas || [];
      appState.userPreferences = dadosUsuario.preferencias || {};
      appState.chatHistory = dadosUsuario.historicoChat || [];
      
      console.log('✅ Dados do usuário carregados:');
      console.log('  📋 Tarefas:', appState.tasks.length);
      console.log('  🔄 Tarefas Fixas:', appState.recurringTasks.length);
      console.log('  💬 Histórico Chat:', appState.chatHistory.length);
      console.log('  ⚙️ Preferências:', Object.keys(appState.userPreferences).length, 'itens');
      
      // Restaurar histórico do chat se existir
      if (appState.chatHistory.length > 0) {
        const chat = document.getElementById('aiChat');
        if (chat) {
          chat.innerHTML = appState.chatHistory.map(msg => `
            <div class="ai-message ${msg.tipo}">
              <div class="ai-message-label">${msg.tipo === 'user' ? 'Você' : 'Assistente IA'}</div>
              <div class="ai-message-content">${msg.conteudo}</div>
            </div>
          `).join('');
          console.log('💬 Histórico do chat restaurado');
        }
      }
    } else {
      // Criar dados iniciais se não existirem
      console.log('ℹ️ Nenhum dado encontrado - criando dados iniciais');
      appState.tasks = [];
      appState.recurringTasks = [];
      appState.userPreferences = {};
      appState.chatHistory = [];
      salvarDadosUsuario();
    }
  } catch (error) {
    console.error('❌ Erro ao carregar dados do usuário:', error);
    // Inicializar com dados vazios em caso de erro
    appState.tasks = [];
    appState.recurringTasks = [];
    appState.userPreferences = {};
    appState.chatHistory = [];
  }
}

function salvarDadosUsuario() {
  if (!globalState.usuarioLogado || !globalState.usuarioLogado.id) {
    console.warn('⚠️ Tentativa de salvar dados sem usuário logado');
    return;
  }
  
  console.log('💾 Salvando dados do usuário:', globalState.usuarioLogado.id);
  
  const dadosUsuario = {
    usuarioId: globalState.usuarioLogado.id,
    tarefas: appState.tasks,
    tarefasFixas: appState.recurringTasks,
    preferencias: appState.userPreferences,
    historicoChat: appState.chatHistory,
    ultimaAtualizacao: Date.now(),
    ultimoSalvo: new Date().toISOString()
  };
  
  try {
    const chave = 'app_dadosUsuario_' + globalState.usuarioLogado.id;
    const dadosJson = JSON.stringify(dadosUsuario);
    storage.setItem(chave, dadosJson);
    
    console.log('✅ Dados do usuário salvos com sucesso');
    console.log('💾 Chave:', chave);
    console.log('📊 Conteúdo salvado:');
    console.log('  📋 Tarefas:', dadosUsuario.tarefas.length);
    console.log('  🔄 Tarefas Fixas:', dadosUsuario.tarefasFixas.length);
    console.log('  💬 Histórico Chat:', dadosUsuario.historicoChat.length);
    console.log('  ⚙️ Preferências:', Object.keys(dadosUsuario.preferencias).length, 'itens');
    console.log('  🕐 Último salvo:', dadosUsuario.ultimoSalvo);
    
    // Verificar se salvou
    const verificacao = storage.getItem(chave);
    if (verificacao) {
      console.log('✅ Verificação: dados salvos com sucesso');
    } else {
      console.error('❌ Verificação: dados NÃO foram salvos!');
    }
  } catch (error) {
    console.error('❌ ERRO CRÍTICO ao salvar dados do usuário:', error);
    console.error('Stack trace:', error.stack);
    alert('Erro ao salvar dados. Suas alterações podem não ser persistidas.');
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

// NAVEGAÇÃO ENTRE ABAS
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
      }
    });
  });
}

// MODAL DE TAREFAS
// Flag para evitar adicionar listeners múltiplas vezes
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
    if (e.target === modal) {
      modal.classList.remove('active');
    }
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
  document.getElementById('taskPrazo').value = '';
  document.getElementById('taskPrioridade').value = 'media';
  document.getElementById('taskStatus').value = 'nao_iniciado';
  document.getElementById('parsedSummary').style.display = 'none';
}

function saveTask() {
  console.log('=== SALVANDO TAREFA ===');
  
  // VALIDAR CONFLITOS ANTES DE SALVAR
  const titulo = document.getElementById('taskTitulo').value.trim();
  const data = document.getElementById('taskData').value;
  const horario = document.getElementById('taskHorario').value;
  
  if (!appState.editingTaskId && titulo && data && horario) {
    const conflitos = validarConflitoDatas({ titulo, data, horario });
    if (conflitos.length > 0) {
      if (!avisarConflito(conflitos)) {
        console.log('❌ Criação cancelada - conflito detectado');
        return;
      }
    }
  }
  
  const titulo = document.getElementById('taskTitulo').value.trim();
  const descricao = document.getElementById('taskDescricao').value.trim();
  const data = document.getElementById('taskData').value;
  const horario = document.getElementById('taskHorario').value;
  const prazo = document.getElementById('taskPrazo').value;
  const prioridade = document.getElementById('taskPrioridade').value;
  const status = document.getElementById('taskStatus').value;
  
  console.log('📝 Dados do formulário:', { titulo, data, horario, prioridade, status });
  
  if (!titulo || !data) {
    console.warn('⚠️ Validação falhou: título ou data vazios');
    alert('Por favor, preencha pelo menos o título e a data da tarefa.');
    return;
  }
  
  // VERIFICAR DUPLICAÇÃO: Se não está editando, verificar se tarefa similar já existe
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
  
  // CRÍTICO: Salvar dados do usuário automaticamente
  console.log('💾 Salvando alterações no storage...');
  salvarDadosUsuario();
  
  // Fechar modal e limpar
  document.getElementById('taskModal').classList.remove('active');
  appState.editingTaskId = null;
  console.log('🧹 Modal fechado e editingTaskId limpo');
  
  // Atualizar interface
  console.log('🔄 Atualizando interface...');
  renderTasks();
  updateInsights();
  updateOverdueBadge();
  renderCalendar();
  
  console.log('✅ Tarefa salva e interface atualizada');
  console.log('=== FIM SALVAR TAREFA ===\n');
}

// INTERPRETAÇÃO DE LINGUAGEM NATURAL
function parseNaturalLanguage() {
  const input = document.getElementById('naturalLanguageInput').value.trim().toLowerCase();
  
  if (!input) {
    alert('Por favor, digite uma descrição da tarefa.');
    return;
  }
  
  const parsed = {
    titulo: '',
    descricao: '',
    data: '',
    horario: '',
    prazo: '',
    tipo: 'unica'
  };
  
  // Extrair título (primeira parte da frase)
  const words = input.split(' ');
  let titleWords = [];
  for (let i = 0; i < words.length && i < 5; i++) {
    if (!['amanhã', 'hoje', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'às', 'até'].includes(words[i])) {
      titleWords.push(words[i]);
    } else {
      break;
    }
  }
  parsed.titulo = titleWords.join(' ');
  
  // Extrair data
  const hoje = new Date();
  if (input.includes('hoje')) {
    parsed.data = formatDate(hoje);
  } else if (input.includes('amanhã') || input.includes('amanha')) {
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    parsed.data = formatDate(amanha);
  } else if (input.includes('segunda')) {
    parsed.data = getNextWeekday(1);
  } else if (input.includes('terça') || input.includes('terca')) {
    parsed.data = getNextWeekday(2);
  } else if (input.includes('quarta')) {
    parsed.data = getNextWeekday(3);
  } else if (input.includes('quinta')) {
    parsed.data = getNextWeekday(4);
  } else if (input.includes('sexta')) {
    parsed.data = getNextWeekday(5);
  } else if (input.includes('sábado') || input.includes('sabado')) {
    parsed.data = getNextWeekday(6);
  } else {
    // Tentar extrair data numérica
    const dateMatch = input.match(/\d{1,2}\/\d{1,2}/);
    if (dateMatch) {
      const [day, month] = dateMatch[0].split('/');
      const year = hoje.getFullYear();
      parsed.data = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  // Extrair horário
  const timeMatch = input.match(/(\d{1,2})h|(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    if (timeMatch[1]) {
      parsed.horario = `${timeMatch[1].padStart(2, '0')}:00`;
    } else if (timeMatch[2] && timeMatch[3]) {
      parsed.horario = `${timeMatch[2].padStart(2, '0')}:${timeMatch[3]}`;
    }
  }
  
  // Detectar tarefas recorrentes
  if (input.includes('segunda a sexta') || input.includes('todo dia') || input.includes('diariamente')) {
    parsed.tipo = 'fixa';
  }
  
  // Extrair prazo
  if (input.includes('prazo')) {
    const prazoMatch = input.match(/prazo.*?(amanhã|hoje|\d{1,2}\/\d{1,2})/i);
    if (prazoMatch && prazoMatch[1]) {
      if (prazoMatch[1] === 'hoje') {
        parsed.prazo = formatDate(hoje);
      } else if (prazoMatch[1] === 'amanhã' || prazoMatch[1] === 'amanha') {
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);
        parsed.prazo = formatDate(amanha);
      }
    }
  }
  
  // Preencher campos
  if (parsed.titulo) document.getElementById('taskTitulo').value = capitalizeFirst(parsed.titulo);
  if (parsed.data) document.getElementById('taskData').value = parsed.data;
  if (parsed.horario) document.getElementById('taskHorario').value = parsed.horario;
  if (parsed.prazo) document.getElementById('taskPrazo').value = parsed.prazo;
  
  // Mostrar resumo
  const summary = document.getElementById('parsedSummary');
  summary.innerHTML = `
    <h4>✓ Tarefa Interpretada</h4>
    <p><strong>Título:</strong> ${capitalizeFirst(parsed.titulo) || 'Não detectado'}</p>
    <p><strong>Data:</strong> ${parsed.data ? formatDateBR(parsed.data) : 'Não detectada'}</p>
    <p><strong>Horário:</strong> ${parsed.horario || 'Não detectado'}</p>
    <p><strong>Tipo:</strong> ${parsed.tipo === 'fixa' ? 'Tarefa Fixa (Recorrente)' : 'Tarefa Única'}</p>
    <p style="margin-top: 8px; color: var(--color-text-secondary);">Revise os campos abaixo e ajuste se necessário.</p>
  `;
  summary.style.display = 'block';
}

// MODAL DE TAREFAS FIXAS
// Flag para evitar adicionar listeners múltiplas vezes
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
    if (e.target === modal) {
      modal.classList.remove('active');
    }
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
  document.querySelectorAll('.recurring-day').forEach(checkbox => {
    checkbox.checked = false;
  });
}

function saveRecurringTask() {
  console.log('=== SALVANDO TAREFA FIXA ===');
  
  const titulo = document.getElementById('recurringTitulo').value.trim();
  const descricao = document.getElementById('recurringDescricao').value.trim();
  const horaInicio = document.getElementById('recurringHoraInicio').value;
  const horaConclusao = document.getElementById('recurringHoraConclusao').value;
  const prioridade = document.getElementById('recurringPrioridade').value;
  
  const dias = Array.from(document.querySelectorAll('.recurring-day:checked')).map(cb => cb.value);
  
  console.log('📝 Dados do formulário:', { titulo, dias, horaInicio, prioridade });
  
  if (!titulo || dias.length === 0) {
    console.warn('⚠️ Validação falhou: título vazio ou nenhum dia selecionado');
    alert('Por favor, preencha o título e selecione pelo menos um dia da semana.');
    return;
  }
  
  // VERIFICAR DUPLICAÇÃO: Se não está editando, verificar se tarefa similar já existe
  if (!appState.editingRecurringId) {
    const tarefaDuplicada = appState.recurringTasks.find(t => 
      t.titulo === titulo && 
      JSON.stringify(t.dias.sort()) === JSON.stringify(dias.sort())
    );
    
    if (tarefaDuplicada) {
      console.warn('⚠️ DUPLICAÇÃO DETECTADA:', tarefaDuplicada);
      if (!confirm('Uma tarefa fixa similar já existe. Deseja criar mesmo assim?')) {
        console.log('❌ Criação cancelada pelo usuário');
        return;
      }
    }
  }
  
  const task = {
    id: appState.editingRecurringId || generateId(),
    titulo,
    descricao,
    dias,
    horaInicio,
    horaConclusao,
    prioridade,
    status: appState.editingRecurringId ? appState.recurringTasks.find(t => t.id === appState.editingRecurringId).status : 'nao_iniciado'
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
  
  // CRÍTICO: Salvar dados
  console.log('💾 Salvando alterações no storage...');
  salvarDadosUsuario();
  
  // Fechar modal e limpar
  document.getElementById('recurringTaskModal').classList.remove('active');
  appState.editingRecurringId = null;
  console.log('🧹 Modal fechado e editingRecurringId limpo');
  
  // Atualizar interface
  console.log('🔄 Atualizando interface...');
  renderRecurringTasks();
  renderCalendar();
  
  console.log('✅ Tarefa fixa salva e interface atualizada');
  console.log('=== FIM SALVAR TAREFA FIXA ===\n');
}

// RENDERIZAÇÃO DE TAREFAS
function renderTasks() {
  const taskList = document.getElementById('taskList');
  const periodo = document.getElementById('filterPeriodo').value;
  const status = document.getElementById('filterStatus').value;
  const prioridade = document.getElementById('filterPrioridade').value;
  
  let filteredTasks = [...appState.tasks];
  
  // Filtrar por período
  if (periodo === 'hoje') {
    const hoje = formatDate(new Date());
    filteredTasks = filteredTasks.filter(t => t.data === hoje);
  } else if (periodo === 'semana') {
    const weekDates = getWeekDates(0);
    filteredTasks = filteredTasks.filter(t => weekDates.includes(t.data));
  }
  
  // Filtrar por status
  if (status !== 'todos') {
    filteredTasks = filteredTasks.filter(t => t.status === status);
  }
  
  // Filtrar por prioridade
  if (prioridade !== 'todas') {
    filteredTasks = filteredTasks.filter(t => t.prioridade === prioridade);
  }
  
  // Ordenar por data e horário
  filteredTasks.sort((a, b) => {
    if (a.data !== b.data) {
      return a.data.localeCompare(b.data);
    }
    return (a.horario || '').localeCompare(b.horario || '');
  });
  
  if (filteredTasks.length === 0) {
    taskList.innerHTML = '<p class="empty-state">Nenhuma tarefa encontrada com os filtros selecionados.</p>';
    return;
  }
  
  taskList.innerHTML = filteredTasks.map(task => {
    const isOverdue = isTaskOverdue(task);
    return `
      <div class="task-item ${isOverdue ? 'overdue' : ''}" data-task-id="${task.id}">
        <input type="checkbox" class="task-checkbox" ${task.status === 'concluido' ? 'checked' : ''} onchange="toggleTaskComplete('${task.id}')">
        <div class="task-content">
          <div class="task-header">
            <h3 class="task-title">${task.titulo}</h3>
            <span class="task-priority ${task.prioridade}">${task.prioridade.toUpperCase()}</span>
          </div>
          ${task.descricao ? `<p class="task-description">${task.descricao}</p>` : ''}
          <div class="task-meta">
            <span>📅 ${formatDateBR(task.data)}</span>
            ${task.horario ? `<span>🕐 ${task.horario}</span>` : ''}
            ${task.prazo ? `<span>⏰ Prazo: ${formatDateBR(task.prazo)}</span>` : ''}
          </div>
          <div style="display: flex; gap: 12px; align-items: center;">
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
  
  const dayNames = {
    'seg': 'Seg',
    'ter': 'Ter',
    'qua': 'Qua',
    'qui': 'Qui',
    'sex': 'Sex',
    'sab': 'Sáb'
  };
  
  list.innerHTML = appState.recurringTasks.map(task => `
    <div class="recurring-task-item">
      <div class="recurring-task-header">
        <h3 class="recurring-task-title">${task.titulo}</h3>
        <span class="task-priority ${task.prioridade}">${task.prioridade.toUpperCase()}</span>
      </div>
      ${task.descricao ? `<p class="task-description">${task.descricao}</p>` : ''}
      <div class="recurring-task-days">
        ${task.dias.map(day => `<span class="day-badge">${dayNames[day]}</span>`).join('')}
      </div>
      <div class="task-meta">
        ${task.horaInicio ? `<span>🕐 ${task.horaInicio}` : ''}
        ${task.horaConclusao ? ` - ${task.horaConclusao}</span>` : ''}
      </div>
      <div style="margin-top: 12px;">
        <label style="font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);">Status:</label>
        <select class="task-status-selector" onchange="updateRecurringTaskStatus('${task.id}', this.value)" style="margin-left: 8px;">
          <option value="nao_iniciado" ${(task.status || 'nao_iniciado') === 'nao_iniciado' ? 'selected' : ''}>Não Iniciado</option>
          <option value="em_andamento" ${task.status === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
          <option value="concluido" ${task.status === 'concluido' ? 'selected' : ''}>Concluído</option>
        </select>
      </div>
      <div class="task-actions" style="margin-top: 12px;">
        <button class="btn btn--secondary" onclick="openRecurringTaskModal('${task.id}')">Editar</button>
        <button class="btn btn--secondary" onclick="deleteRecurringTask('${task.id}')">Excluir</button>
      </div>
    </div>
  `).join('');
}

// FUNÇÕES DE TAREFAS
function toggleTaskComplete(taskId) {
  const task = appState.tasks.find(t => t.id === taskId);
  const novoStatus = task.status === 'concluido' ? 'nao_iniciado' : 'concluido';
  task.status = novoStatus;
  task.atualizadoEm = Date.now();
  
  console.log('✓ Status alterado:', task.titulo, '->', novoStatus);
  
  // CRÍTICO: Salvar dados
  salvarDadosUsuario();
  
  renderTasks();
  updateInsights();
  updateOverdueBadge();
  renderCalendar();
}

function updateTaskStatus(taskId, newStatus) {
  const task = appState.tasks.find(t => t.id === taskId);
  task.status = newStatus;
  task.atualizadoEm = Date.now();
  
  console.log('📊 Status atualizado:', task.titulo, '->', newStatus);
  
  // CRÍTICO: Salvar dados
  salvarDadosUsuario();
  
  renderTasks();
  updateInsights();
  updateOverdueBadge();
  renderCalendar();
}

function deleteTask(taskId) {
  if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
    const task = appState.tasks.find(t => t.id === taskId);
    appState.tasks = appState.tasks.filter(t => t.id !== taskId);
    
    console.log('🗑️ Tarefa excluída:', task?.titulo || taskId);
    console.log('📊 Tarefas restantes:', appState.tasks.length);
    
    // CRÍTICO: Salvar dados
    salvarDadosUsuario();
    
    renderTasks();
    updateInsights();
    updateOverdueBadge();
    renderCalendar();
  }
}

function deleteRecurringTask(taskId) {
  if (confirm('Tem certeza que deseja excluir esta tarefa fixa?')) {
    const task = appState.recurringTasks.find(t => t.id === taskId);
    appState.recurringTasks = appState.recurringTasks.filter(t => t.id !== taskId);
    
    console.log('🗑️ Tarefa fixa excluída:', task?.titulo || taskId);
    console.log('🔄 Tarefas fixas restantes:', appState.recurringTasks.length);
    
    // CRÍTICO: Salvar dados
    salvarDadosUsuario();
    
    renderRecurringTasks();
    renderCalendar();
  }
}

// FILTROS
function setupFilters() {
  document.getElementById('filterPeriodo').addEventListener('change', renderTasks);
  document.getElementById('filterStatus').addEventListener('change', renderTasks);
  document.getElementById('filterPrioridade').addEventListener('change', renderTasks);
}

// INSIGHTS DE PRODUTIVIDADE
function updateInsights() {
  const insightsContent = document.getElementById('insightsContent');
  const hoje = formatDate(new Date());
  
  const tarefasHoje = appState.tasks.filter(t => t.data === hoje);
  const tarefasAtrasadas = appState.tasks.filter(isTaskOverdue);
  const tarefasAltaPrioridade = appState.tasks.filter(t => t.prioridade === 'alta' && t.status !== 'concluido');
  const tarefasEmAndamento = appState.tasks.filter(t => t.status === 'em_andamento');
  
  const weekDates = getWeekDates(0);
  const tarefasSemana = appState.tasks.filter(t => weekDates.includes(t.data));
  const tarefasManha = tarefasSemana.filter(t => {
    if (!t.horario) return false;
    const hora = parseInt(t.horario.split(':')[0]);
    return hora < 12;
  });
  
  let insights = [];
  
  if (tarefasAtrasadas.length > 0) {
    insights.push(`⚠️ Você tem <strong>${tarefasAtrasadas.length}</strong> tarefa${tarefasAtrasadas.length > 1 ? 's' : ''} atrasada${tarefasAtrasadas.length > 1 ? 's' : ''}.`);
  }
  
  if (tarefasHoje.length > 0) {
    const concluidas = tarefasHoje.filter(t => t.status === 'concluido').length;
    insights.push(`📋 Você tem <strong>${tarefasHoje.length}</strong> tarefa${tarefasHoje.length > 1 ? 's' : ''} para hoje${concluidas > 0 ? `, ${concluidas} já concluída${concluidas > 1 ? 's' : ''}` : ''}.`);
  }
  
  if (tarefasAltaPrioridade.length > 0) {
    insights.push(`🔴 <strong>${tarefasAltaPrioridade.length}</strong> tarefa${tarefasAltaPrioridade.length > 1 ? 's' : ''} de alta prioridade pendente${tarefasAltaPrioridade.length > 1 ? 's' : ''}.`);
  }
  
  if (tarefasEmAndamento.length > 0) {
    insights.push(`⏳ <strong>${tarefasEmAndamento.length}</strong> tarefa${tarefasEmAndamento.length > 1 ? 's' : ''} em andamento.`);
  }
  
  if (tarefasManha.length > 0) {
    insights.push(`☀️ Você concentrou <strong>${tarefasManha.length}</strong> tarefa${tarefasManha.length > 1 ? 's' : ''} no período da manhã esta semana.`);
  }
  
  if (insights.length === 0) {
    insights.push('✅ Parabéns! Você está em dia com suas tarefas.');
  }
  
  insightsContent.innerHTML = insights.map(i => `<p>${i}</p>`).join('');
}

// TAREFAS ATRASADAS
function setupOverdueModal() {
  const badge = document.getElementById('notificationBadge');
  const modal = document.getElementById('overdueModal');
  const closeModal = document.getElementById('closeOverdueModal');
  const closeBtn = document.getElementById('closeOverdueBtn');
  
  badge.addEventListener('click', () => {
    showOverdueTasks();
  });
  
  closeModal.addEventListener('click', () => {
    modal.classList.remove('active');
  });
  
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('active');
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
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
          <div class="task-header">
            <h3 class="task-title">${task.titulo}</h3>
            <span class="task-priority ${task.prioridade}">${task.prioridade.toUpperCase()}</span>
          </div>
          <div class="task-meta">
            <span>📅 ${formatDateBR(task.data)}</span>
            ${task.prazo ? `<span>⏰ Prazo: ${formatDateBR(task.prazo)}</span>` : ''}
          </div>
          <div class="task-actions" style="margin-top: 12px;">
            <button class="btn btn--secondary" onclick="openTaskModal('${task.id}')">Editar</button>
            <button class="btn btn--primary" onclick="updateTaskStatus('${task.id}', 'concluido'); closeOverdueModal();">Marcar Concluída</button>
          </div>
        </div>
      </div>
    `).join('');
  }
  
  modal.classList.add('active');
}

function closeOverdueModal() {
  document.getElementById('overdueModal').classList.remove('active');
  updateOverdueBadge();
}

// VALIDAÇÃO DE CONFLITOS
function converterDataParaDiaSemana(dataStr) {
  const data = new Date(dataStr + 'T00:00:00');
  const dia = data.getDay();
  const diasSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  return diasSemana[dia];
}

function validarConflitoDatas(novaTarefa) {
  const conflitos = [];
  const diaSemana = converterDataParaDiaSemana(novaTarefa.data);
  
  // Verificar conflitos com tarefas fixas
  const tarefasFixasConflito = appState.recurringTasks.filter(tf => {
    if (!tf.dias.includes(diaSemana)) return false;
    if (!tf.horaInicio || !novaTarefa.horario) return false;
    
    try {
      const horaInicioFixa = tf.horaInicio.split(':').map(Number);
      const horaFimFixa = tf.horaConclusao ? tf.horaConclusao.split(':').map(Number) : [horaInicioFixa[0] + 1, horaInicioFixa[1]];
      const horaNova = novaTarefa.horario.split(':').map(Number);
      
      const inicioFixaMin = horaInicioFixa[0] * 60 + horaInicioFixa[1];
      const fimFixaMin = horaFimFixa[0] * 60 + horaFimFixa[1];
      const novaMin = horaNova[0] * 60 + horaNova[1];
      const novaFimMin = novaMin + 60;
      
      return (novaMin < fimFixaMin && novaFimMin > inicioFixaMin);
    } catch (e) {
      return false;
    }
  });
  
  if (tarefasFixasConflito.length > 0) {
    conflitos.push({
      tipo: 'tarefa_fixa',
      tarefas: tarefasFixasConflito
    });
  }
  
  // Verificar conflitos com tarefas novas
  const tarefasNovasConflito = appState.tasks.filter(tarefa => {
    if (tarefa.data !== novaTarefa.data) return false;
    if (!tarefa.horario || !novaTarefa.horario) return false;
    
    try {
      const hora1 = tarefa.horario.split(':').map(Number);
      const hora2 = novaTarefa.horario.split(':').map(Number);
      const min1 = hora1[0] * 60 + hora1[1];
      const min2 = hora2[0] * 60 + hora2[1];
      return Math.abs(min1 - min2) < 60;
    } catch (e) {
      return false;
    }
  });
  
  if (tarefasNovasConflito.length > 0) {
    conflitos.push({
      tipo: 'tarefa_nova',
      tarefas: tarefasNovasConflito
    });
  }
  
  return conflitos;
}

function avisarConflito(conflitos) {
  let mensagem = '⚠️ CONFLITO DE HORÁRIO DETECTADO!\n\n';
  
  conflitos.forEach(conf => {
    if (conf.tipo === 'tarefa_fixa') {
      mensagem += 'Tarefa Fixa em conflito:\n';
      conf.tarefas.forEach(t => {
        mensagem += `- ${t.titulo} (${t.horaInicio}${t.horaConclusao ? ' - ' + t.horaConclusao : ''})\n`;
      });
    } else {
      mensagem += 'Tarefa Nova em conflito:\n';
      conf.tarefas.forEach(t => {
        mensagem += `- ${t.titulo} (${t.horario})\n`;
      });
    }
    mensagem += '\n';
  });
  
  mensagem += 'Deseja continuar mesmo assim?';
  
  return confirm(mensagem);
}

// CALENDÁRIO
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
  
  const startDate = new Date(weekDates[0]);
  const endDate = new Date(weekDates[weekDates.length - 1]);
  weekLabel.textContent = `${formatDateBR(weekDates[0])} - ${formatDateBR(weekDates[6])}`;
  
  const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const dayAbbrev = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
  
  grid.innerHTML = weekDates.map((date, index) => {
    const dayTasks = appState.tasks.filter(t => t.data === date);
    const recurringTasks = appState.recurringTasks.filter(t => t.dias.includes(dayAbbrev[index]));
    
    // Detectar conflitos
    const temConflitos = detectarConflitosNoDia(dayTasks, recurringTasks, dayAbbrev[index]);
    
    return `
      <div class="calendar-day">
        <div class="calendar-day-header">
          ${dayNames[index]}<br>
          <small>${formatDateBR(date)}</small>
          ${temConflitos ? '<span style="color: var(--color-error); font-size: 18px;" title="Conflitos detectados">⚠️</span>' : ''}
        </div>
        ${dayTasks.sort((a, b) => (a.horario || '').localeCompare(b.horario || '')).map(task => `
          <div class="calendar-task tipo-nova status-${task.status}" onclick="openTaskModal('${task.id}')" title="Clique para editar">
            ${task.horario ? `<div class="calendar-task-time">${task.horario}</div>` : ''}
            <div class="calendar-task-title">● ${task.titulo}</div>
          </div>
        `).join('')}
        ${recurringTasks.sort((a, b) => (a.horaInicio || '').localeCompare(b.horaInicio || '')).map(task => `
          <div class="calendar-task tipo-fixa status-${task.status || 'nao_iniciado'}" onclick="abrirModalEditarTarefaFixaStatus('${task.id}')" title="Clique para editar status">
            ${task.horaInicio ? `<div class="calendar-task-time">${task.horaInicio}${task.horaConclusao ? ' - ' + task.horaConclusao : ''}</div>` : ''}
            <div class="calendar-task-title">◆ ${task.titulo}</div>
            <div class="calendar-task-status">${getStatusLabel(task.status || 'nao_iniciado')}</div>
          </div>
        `).join('')}
      </div>
    `;
  }).join('');
}

function detectarConflitosNoDia(tarefasNovas, tarefasFixas, diaSemana) {
  for (let nova of tarefasNovas) {
    if (!nova.horario) continue;
    for (let fixa of tarefasFixas) {
      if (!fixa.horaInicio) continue;
      try {
        const horaNova = nova.horario.split(':').map(Number);
        const horaInicioFixa = fixa.horaInicio.split(':').map(Number);
        const horaFimFixa = fixa.horaConclusao ? fixa.horaConclusao.split(':').map(Number) : [horaInicioFixa[0] + 1, horaInicioFixa[1]];
        
        const novaMin = horaNova[0] * 60 + horaNova[1];
        const inicioFixaMin = horaInicioFixa[0] * 60 + horaInicioFixa[1];
        const fimFixaMin = horaFimFixa[0] * 60 + horaFimFixa[1];
        
        if (novaMin >= inicioFixaMin && novaMin < fimFixaMin) return true;
      } catch (e) {}
    }
  }
  return false;
}

function getStatusLabel(status) {
  const labels = {
    'nao_iniciado': 'Não Iniciado',
    'em_andamento': 'Em Andamento',
    'concluido': 'Concluído'
  };
  return labels[status] || 'Não Iniciado';
}

function abrirModalEditarTarefaFixaStatus(taskId) {
  const task = appState.recurringTasks.find(t => t.id === taskId);
  if (!task) return;
  
  const novoStatus = prompt(
    `Editar status de: ${task.titulo}\n\n` +
    `Status atual: ${getStatusLabel(task.status || 'nao_iniciado')}\n\n` +
    `Digite o novo status:\n` +
    `1 - Não Iniciado\n` +
    `2 - Em Andamento\n` +
    `3 - Concluído\n\n` +
    `Digite o número (1, 2 ou 3):`,
    task.status === 'em_andamento' ? '2' : task.status === 'concluido' ? '3' : '1'
  );
  
  if (novoStatus === null) return;
  
  const statusMap = {
    '1': 'nao_iniciado',
    '2': 'em_andamento',
    '3': 'concluido'
  };
  
  const novoStatusValor = statusMap[novoStatus.trim()];
  
  if (!novoStatusValor) {
    alert('Status inválido. Use 1, 2 ou 3.');
    return;
  }
  
  task.status = novoStatusValor;
  console.log('✓ Status da tarefa fixa alterado:', task.titulo, '->', novoStatusValor);
  
  salvarDadosUsuario();
  renderCalendar();
  renderRecurringTasks();
  
  alert(`✓ Status atualizado para: ${getStatusLabel(novoStatusValor)}`);
}

// WIZARD "QUERO TE CONHECER"
function setupWizard() {
  const questions = [
    {
      question: 'Qual horário você trabalha?',
      type: 'time-range',
      key: 'horarioTrabalho'
    },
    {
      question: 'Você se sente mais focado de manhã ou à tarde?',
      type: 'radio',
      key: 'periodoPico',
      options: ['Manhã', 'Tarde', 'Indiferente']
    },
    {
      question: 'Quantas horas por dia você consegue dedicar a tarefas que exigem muita concentração?',
      type: 'slider',
      key: 'horasFoco',
      min: 1,
      max: 8
    },
    {
      question: 'Você prefere blocos longos de foco ou tarefas curtas e rápidas?',
      type: 'radio',
      key: 'tipoTarefa',
      options: ['Blocos longos', 'Tarefas curtas', 'Misturado']
    }
  ];
  
  function renderQuestion() {
    const step = appState.wizardStep;
    const q = questions[step];
    
    document.getElementById('wizardQuestion').textContent = q.question;
    const input = document.getElementById('wizardInput');
    
    if (q.type === 'time-range') {
      input.innerHTML = `
        <div style="display: flex; gap: 16px; align-items: center;">
          <div>
            <label style="display: block; margin-bottom: 8px;">Início:</label>
            <input type="time" id="wizardTimeStart" class="form-control" value="${appState.wizardAnswers[q.key]?.inicio || '09:00'}">
          </div>
          <div>
            <label style="display: block; margin-bottom: 8px;">Fim:</label>
            <input type="time" id="wizardTimeEnd" class="form-control" value="${appState.wizardAnswers[q.key]?.fim || '18:00'}">
          </div>
        </div>
      `;
    } else if (q.type === 'radio') {
      input.innerHTML = `
        <div class="radio-group">
          ${q.options.map(opt => `
            <label>
              <input type="radio" name="wizard-radio" value="${opt}" ${appState.wizardAnswers[q.key] === opt ? 'checked' : ''}>
              <span>${opt}</span>
            </label>
          `).join('')}
        </div>
      `;
    } else if (q.type === 'slider') {
      const value = appState.wizardAnswers[q.key] || 4;
      input.innerHTML = `
        <input type="range" id="wizardSlider" min="${q.min}" max="${q.max}" value="${value}" style="width: 100%;">
        <div style="text-align: center; margin-top: 8px;">
          <span class="slider-value" id="sliderValue">${value} hora${value > 1 ? 's' : ''}</span>
        </div>
      `;
      
      setTimeout(() => {
        document.getElementById('wizardSlider').addEventListener('input', (e) => {
          const val = e.target.value;
          document.getElementById('sliderValue').textContent = `${val} hora${val > 1 ? 's' : ''}`;
        });
      }, 0);
    }
    
    document.getElementById('wizardPrev').style.display = step > 0 ? 'inline-flex' : 'none';
    document.getElementById('wizardNext').textContent = step === questions.length - 1 ? 'Finalizar' : 'Próxima →';
  }
  
  function saveAnswer() {
    const step = appState.wizardStep;
    const q = questions[step];
    
    if (q.type === 'time-range') {
      const inicio = document.getElementById('wizardTimeStart').value;
      const fim = document.getElementById('wizardTimeEnd').value;
      appState.wizardAnswers[q.key] = { inicio, fim };
    } else if (q.type === 'radio') {
      const selected = document.querySelector('input[name="wizard-radio"]:checked');
      if (selected) {
        appState.wizardAnswers[q.key] = selected.value;
      }
    } else if (q.type === 'slider') {
      appState.wizardAnswers[q.key] = parseInt(document.getElementById('wizardSlider').value);
    }
  }
  
  document.getElementById('wizardNext').addEventListener('click', () => {
    saveAnswer();
    
    if (appState.wizardStep < questions.length - 1) {
      appState.wizardStep++;
      renderQuestion();
    } else {
      finishWizard();
    }
  });
  
  document.getElementById('wizardPrev').addEventListener('click', () => {
    saveAnswer();
    if (appState.wizardStep > 0) {
      appState.wizardStep--;
      renderQuestion();
    }
  });
  
  document.getElementById('restartWizard').addEventListener('click', () => {
    appState.wizardStep = 0;
    appState.wizardAnswers = {};
    document.getElementById('wizardStep').style.display = 'block';
    document.getElementById('wizardResults').style.display = 'none';
    renderQuestion();
  });
  
  function finishWizard() {
    appState.userPreferences = appState.wizardAnswers;
    
    console.log('✅ Questionário finalizado');
    console.log('⚙️ Preferências salvas:', appState.userPreferences);
    
    // CRÍTICO: Salvar preferências
    salvarDadosUsuario();
    
    document.getElementById('wizardStep').style.display = 'none';
    document.getElementById('wizardResults').style.display = 'block';
    
    const prefDisplay = document.getElementById('preferencesDisplay');
    prefDisplay.innerHTML = `
      <p><strong>Horário de Trabalho:</strong> ${appState.userPreferences.horarioTrabalho?.inicio || 'N/A'} às ${appState.userPreferences.horarioTrabalho?.fim || 'N/A'}</p>
      <p><strong>Período de Maior Foco:</strong> ${appState.userPreferences.periodoPico || 'N/A'}</p>
      <p><strong>Horas de Concentração:</strong> ${appState.userPreferences.horasFoco || 'N/A'} hora${appState.userPreferences.horasFoco > 1 ? 's' : ''}</p>
      <p><strong>Preferência de Tarefas:</strong> ${appState.userPreferences.tipoTarefa || 'N/A'}</p>
    `;
    
    const suggestions = generateTaskSuggestions(appState.userPreferences);
    document.getElementById('suggestionsDisplay').innerHTML = suggestions.map(s => `<p>💡 ${s}</p>`).join('');
  }
  
  renderQuestion();
}

function generateTaskSuggestions(preferences) {
  const suggestions = [];
  
  if (preferences.periodoPico === 'Manhã') {
    suggestions.push('Agende tarefas de alta prioridade e que exigem concentração no período da manhã.');
    suggestions.push('Reserve as tardes para tarefas administrativas e reuniões.');
  } else if (preferences.periodoPico === 'Tarde') {
    suggestions.push('Utilize o período da tarde para tarefas complexas que exigem foco profundo.');
    suggestions.push('Use as manhãs para planejamento e tarefas mais leves.');
  }
  
  if (preferences.horasFoco && preferences.horasFoco <= 3) {
    suggestions.push('Considere dividir seu trabalho em blocos de 1-2 horas com pausas entre eles.');
    suggestions.push('Priorize as tarefas mais importantes nos períodos de maior concentração.');
  } else if (preferences.horasFoco && preferences.horasFoco >= 5) {
    suggestions.push('Você tem boa capacidade de foco! Aproveite para agendar blocos longos de trabalho profundo.');
  }
  
  if (preferences.tipoTarefa === 'Blocos longos') {
    suggestions.push('Agrupe tarefas similares em blocos de 2-3 horas para manter o fluxo.');
    suggestions.push('Evite interrupções durante seus blocos de foco.');
  } else if (preferences.tipoTarefa === 'Tarefas curtas') {
    suggestions.push('Use a técnica Pomodoro: 25 minutos de foco + 5 minutos de pausa.');
    suggestions.push('Mantenha uma lista de tarefas rápidas para preencher intervalos.');
  } else {
    suggestions.push('Alterne entre tarefas longas e curtas para manter a variedade e o engajamento.');
  }
  
  suggestions.push('Revise suas tarefas no início de cada dia e ajuste prioridades conforme necessário.');
  suggestions.push('Reserve um tempo semanal para planejamento e revisão de objetivos.');
  
  return suggestions;
}

// CENTRAL DE IA
function setupAIChat() {
  const input = document.getElementById('aiInput');
  const sendBtn = document.getElementById('aiSendBtn');
  
  sendBtn.addEventListener('click', () => {
    sendAIMessage();
  });
  
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendAIMessage();
    }
  });
}

function sendAIMessage() {
  const input = document.getElementById('aiInput');
  const question = input.value.trim();
  
  if (!question) return;
  
  const chat = document.getElementById('aiChat');
  
  // Adicionar mensagem do usuário
  chat.innerHTML += `
    <div class="ai-message user">
      <div class="ai-message-label">Você</div>
      <div class="ai-message-content">${question}</div>
    </div>
  `;
  
  // Gerar resposta
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
  
  console.log('💬 Mensagem adicionada ao histórico');
  console.log('📊 Total de mensagens:', appState.chatHistory.length);
  
  // CRÍTICO: Salvar histórico do chat
  salvarDadosUsuario();
}

function generateAIResponse(question) {
  const q = question.toLowerCase();
  const hoje = formatDate(new Date());
  
  // Tarefas de hoje
  if (q.includes('hoje') || q.includes('dia')) {
    const tarefasHoje = appState.tasks.filter(t => t.data === hoje);
    if (tarefasHoje.length === 0) {
      return 'Você não tem tarefas agendadas para hoje. Aproveite para planejar os próximos dias! 📅';
    }
    
    const pendentes = tarefasHoje.filter(t => t.status !== 'concluido');
    let resp = `Você tem <strong>${tarefasHoje.length}</strong> tarefa${tarefasHoje.length > 1 ? 's' : ''} para hoje:<br><br>`;
    
    tarefasHoje.forEach(t => {
      const statusEmoji = t.status === 'concluido' ? '✅' : t.status === 'em_andamento' ? '🔄' : '⏸️';
      resp += `${statusEmoji} <strong>${t.titulo}</strong> ${t.horario ? `às ${t.horario}` : ''} (${t.prioridade})<br>`;
    });
    
    if (pendentes.length > 0) {
      resp += `<br>💡 Você ainda tem <strong>${pendentes.length}</strong> tarefa${pendentes.length > 1 ? 's' : ''} pendente${pendentes.length > 1 ? 's' : ''} hoje.`;
    }
    
    return resp;
  }
  
  // Focar primeiro
  if (q.includes('focar') || q.includes('prioridade') || q.includes('primeiro')) {
    const tarefasHoje = appState.tasks.filter(t => t.data === hoje && t.status !== 'concluido');
    const altaPrioridade = tarefasHoje.filter(t => t.prioridade === 'alta');
    
    if (altaPrioridade.length > 0) {
      return `Foque primeiro nas tarefas de alta prioridade:<br><br>${altaPrioridade.map(t => `🔴 <strong>${t.titulo}</strong> ${t.horario ? `(${t.horario})` : ''}`).join('<br>')}<br><br>💡 Sugestão: Reserve as primeiras horas do dia para essas tarefas importantes.`;
    }
    
    if (tarefasHoje.length > 0) {
      const maisProxima = tarefasHoje.sort((a, b) => (a.horario || '').localeCompare(b.horario || ''))[0];
      return `Comece com: <strong>${maisProxima.titulo}</strong>${maisProxima.horario ? ` às ${maisProxima.horario}` : ''}.`;
    }
    
    return 'Você está em dia! Que tal planejar tarefas para os próximos dias? 🎯';
  }
  
  // Perto do prazo
  if (q.includes('prazo')) {
    const comPrazo = appState.tasks.filter(t => t.prazo && t.status !== 'concluido').sort((a, b) => a.prazo.localeCompare(b.prazo));
    
    if (comPrazo.length === 0) {
      return 'Nenhuma tarefa com prazo definido no momento.';
    }
    
    const proximas = comPrazo.slice(0, 5);
    let resp = 'Tarefas mais próximas do prazo:<br><br>';
    proximas.forEach(t => {
      resp += `⏰ <strong>${t.titulo}</strong> - Prazo: ${formatDateBR(t.prazo)}<br>`;
    });
    
    return resp;
  }
  
  // Semana
  if (q.includes('semana')) {
    const weekDates = getWeekDates(0);
    const tarefasSemana = appState.tasks.filter(t => weekDates.includes(t.data));
    
    if (tarefasSemana.length === 0) {
      return 'Você não tem tarefas agendadas para esta semana.';
    }
    
    const concluidas = tarefasSemana.filter(t => t.status === 'concluido').length;
    return `Você tem <strong>${tarefasSemana.length}</strong> tarefa${tarefasSemana.length > 1 ? 's' : ''} esta semana.<br>${concluidas} já concluída${concluidas > 1 ? 's' : ''} ✅<br><br>💡 Continue assim! Você está progredindo bem.`;
  }
  
  // Atrasadas
  if (q.includes('atrasada')) {
    const atrasadas = appState.tasks.filter(isTaskOverdue);
    
    if (atrasadas.length === 0) {
      return '🎉 Parabéns! Você não tem tarefas atrasadas.';
    }
    
    let resp = `Você tem <strong>${atrasadas.length}</strong> tarefa${atrasadas.length > 1 ? 's' : ''} atrasada${atrasadas.length > 1 ? 's' : ''}:<br><br>`;
    atrasadas.forEach(t => {
      resp += `⚠️ <strong>${t.titulo}</strong> - ${formatDateBR(t.data)}<br>`;
    });
    
    resp += '<br>💡 Sugestão: Revise essas tarefas e atualize os prazos ou marque como concluídas.';
    return resp;
  }
  
  // Resposta padrão
  return `Entendi sua pergunta. Aqui estão algumas informações úteis:<br><br>
    📊 Total de tarefas: <strong>${appState.tasks.length}</strong><br>
    ✅ Concluídas: <strong>${appState.tasks.filter(t => t.status === 'concluido').length}</strong><br>
    🔄 Em andamento: <strong>${appState.tasks.filter(t => t.status === 'em_andamento').length}</strong><br>
    ⏸️ Não iniciadas: <strong>${appState.tasks.filter(t => t.status === 'nao_iniciado').length}</strong><br><br>
    💡 Dica: Tente perguntas como "Quais tarefas tenho hoje?" ou "Em que devo focar primeiro?"`;
}

// FUNÇÕES UTILITÁRIAS
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

function getNextWeekday(targetDay) {
  const hoje = new Date();
  const currentDay = hoje.getDay();
  const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
  const targetDate = new Date(hoje);
  targetDate.setDate(hoje.getDate() + daysUntilTarget);
  return formatDate(targetDate);
}

function getWeekDates(weekOffset = 0) {
  const hoje = new Date();
  const currentDay = hoje.getDay();
  const monday = new Date(hoje);
  
  // Ajustar para segunda-feira
  const daysFromMonday = currentDay === 0 ? -6 : 1 - currentDay;
  monday.setDate(hoje.getDate() + daysFromMonday + (weekOffset * 7));
  
  const dates = [];
  for (let i = 0; i < 6; i++) {
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
  
  let compareDate;
  if (task.prazo) {
    compareDate = new Date(task.prazo + 'T00:00:00');
  } else {
    compareDate = new Date(task.data + 'T00:00:00');
  }
  
  return compareDate < hoje;
}

// ============================================
// FUNÇÕES DE DEBUG E DIAGNÓSTICO
// ============================================

// Função para verificar o status do localStorage
function verificarLocalStorage() {
  console.log('=== STATUS DO LOCALSTORAGE ===');
  console.log('📁 LocalStorage disponível:', isLocalStorageAvailable);
  
  if (!isLocalStorageAvailable) {
    console.warn('⚠️ ATENÇÃO: localStorage não está disponível!');
    console.warn('⚠️ Dados em memória serão perdidos ao fechar o navegador');
    console.log('\nDados atuais em memória:');
    console.log('Total de chaves:', Object.keys(storage.data).length);
    Object.keys(storage.data).forEach(key => {
      console.log('  -', key, ':', storage.data[key].substring(0, 100) + '...');
    });
    return;
  }
  
  console.log('\n📊 Usuários registrados:');
  const usuarios = storage.getItem('app_usuarios');
  if (usuarios) {
    const usuariosObj = JSON.parse(usuarios);
    console.log('  Total:', usuariosObj.length);
    usuariosObj.forEach(u => {
      console.log('  -', u.nome, '(' + u.email + ')');
    });
  } else {
    console.log('  Nenhum usuário registrado');
  }
  
  console.log('\n👤 Usuário logado:');
  const usuarioLogado = storage.getItem('app_usuarioLogado');
  if (usuarioLogado) {
    const usuario = JSON.parse(usuarioLogado);
    console.log('  Nome:', usuario.nome);
    console.log('  Email:', usuario.email);
    console.log('  ID:', usuario.id);
  } else {
    console.log('  Nenhum usuário logado');
  }
  
  console.log('\n💾 Todas as chaves no storage:');
  const todasChaves = [];
  for (let i = 0; i < storage.length; i++) {
    const chave = storage.key(i);
    if (chave && chave.startsWith('app_')) {
      todasChaves.push(chave);
    }
  }
  
  if (todasChaves.length === 0) {
    console.log('  Nenhuma chave encontrada');
  } else {
    todasChaves.forEach(chave => {
      const valor = storage.getItem(chave);
      console.log('  -', chave, '(' + (valor ? valor.length : 0) + ' caracteres)');
    });
  }
  
  console.log('\n=== FIM DO STATUS ===');
}

// ============================================
// FUNÇÕES DE EXPORTAÇÃO E IMPORTAÇÃO DE DADOS
// ============================================

function exportarDados() {
  if (!globalState.usuarioLogado) {
    alert('❌ Você precisa estar logado para exportar dados.');
    return;
  }
  
  console.log('=== EXPORTANDO DADOS ===');
  console.log('👤 Usuário:', globalState.usuarioLogado.nome);
  
  try {
    // Preparar dados para exportação
    const dadosExportacao = {
      versao: '2.0',
      dataExportacao: new Date().toISOString(),
      usuarioLogado: {
        id: globalState.usuarioLogado.id,
        nome: globalState.usuarioLogado.nome,
        email: globalState.usuarioLogado.email
      },
      tarefas: appState.tasks,
      tarefasFixas: appState.recurringTasks,
      preferencias: appState.userPreferences,
      historicoChat: appState.chatHistory
    };
    
    console.log('📊 Dados preparados:');
    console.log('  📋 Tarefas:', dadosExportacao.tarefas.length);
    console.log('  🔄 Tarefas Fixas:', dadosExportacao.tarefasFixas.length);
    console.log('  💬 Histórico Chat:', dadosExportacao.historicoChat.length);
    console.log('  ⚙️ Preferências:', Object.keys(dadosExportacao.preferencias).length, 'itens');
    
    // Converter para JSON
    const json = JSON.stringify(dadosExportacao, null, 2);
    const tamanhoKB = (json.length / 1024).toFixed(2);
    console.log('💾 Tamanho do arquivo:', tamanhoKB, 'KB');
    
    // Criar blob e download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Nome do arquivo: backup-tarefas-NomeUsuario-YYYY-MM-DD.json
    const dataFormatada = new Date().toISOString().split('T')[0];
    const nomeUsuario = globalState.usuarioLogado.nome.replace(/\s+/g, '-').toLowerCase();
    link.download = `backup-tarefas-${nomeUsuario}-${dataFormatada}.json`;
    
    console.log('📄 Nome do arquivo:', link.download);
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('✅ Exportação concluída com sucesso!');
    
    // Notificar usuário
    alert(`✅ Dados exportados com sucesso!\n\n📊 Exportados:\n• ${dadosExportacao.tarefas.length} tarefas\n• ${dadosExportacao.tarefasFixas.length} tarefas fixas\n• ${dadosExportacao.historicoChat.length} mensagens de chat\n\n💾 Tamanho: ${tamanhoKB} KB\n📁 Arquivo: ${link.download}\n\n💡 Guarde este arquivo em local seguro para restaurar seus dados depois!`);
    
  } catch (error) {
    console.error('❌ ERRO ao exportar dados:', error);
    console.error('Stack:', error.stack);
    alert('❌ Erro ao exportar dados: ' + error.message);
  }
}

function importarDados(arquivo) {
  console.log('=== IMPORTANDO DADOS ===');
  console.log('📁 Arquivo:', arquivo.name);
  console.log('📏 Tamanho:', (arquivo.size / 1024).toFixed(2), 'KB');
  
  const reader = new FileReader();
  
  reader.onerror = function() {
    console.error('❌ Erro ao ler arquivo');
    alert('❌ Erro ao ler o arquivo. Tente novamente.');
  };
  
  reader.onload = function(e) {
    try {
      console.log('📖 Lendo conteúdo do arquivo...');
      const conteudo = e.target.result;
      const dados = JSON.parse(conteudo);
      
      console.log('✅ JSON parseado com sucesso');
      console.log('📊 Versão:', dados.versao);
      console.log('📅 Data exportação:', dados.dataExportacao);
      
      // Validar estrutura básica
      if (!dados.usuarioLogado || !dados.usuarioLogado.id) {
        throw new Error('Arquivo inválido: dados de usuário não encontrados');
      }
      
      if (!Array.isArray(dados.tarefas)) {
        throw new Error('Arquivo inválido: lista de tarefas não encontrada');
      }
      
      console.log('✅ Estrutura do arquivo validada');
      
      // Perguntar ao usuário se deseja substituir ou mesclar
      const substituir = confirm(
        `📦 Importar dados de: ${dados.usuarioLogado.nome}\n\n` +
        `📊 Arquivo contém:\n` +
        `• ${dados.tarefas.length} tarefas\n` +
        `• ${dados.tarefasFixas?.length || 0} tarefas fixas\n` +
        `• ${dados.historicoChat?.length || 0} mensagens de chat\n\n` +
        `⚠️ Clique OK para SUBSTITUIR todos os dados atuais\n` +
        `ou CANCELAR para mesclar com dados existentes.`
      );
      
      if (substituir) {
        console.log('🔄 Modo: SUBSTITUIR dados');
        
        // Substituir usuário logado
        globalState.usuarioLogado = dados.usuarioLogado;
        
        // Substituir todos os dados
        appState.tasks = dados.tarefas || [];
        appState.recurringTasks = dados.tarefasFixas || [];
        appState.userPreferences = dados.preferencias || {};
        appState.chatHistory = dados.historicoChat || [];
        
      } else {
        console.log('🔄 Modo: MESCLAR dados');
        
        // Mesclar tarefas (evitar duplicatas por ID)
        const idsExistentes = new Set(appState.tasks.map(t => t.id));
        const novasTarefas = (dados.tarefas || []).filter(t => !idsExistentes.has(t.id));
        appState.tasks = [...appState.tasks, ...novasTarefas];
        
        // Mesclar tarefas fixas
        const idsFixasExistentes = new Set(appState.recurringTasks.map(t => t.id));
        const novasTarefasFixas = (dados.tarefasFixas || []).filter(t => !idsFixasExistentes.has(t.id));
        appState.recurringTasks = [...appState.recurringTasks, ...novasTarefasFixas];
        
        // Mesclar preferências (novo sobrescreve antigo)
        appState.userPreferences = { ...appState.userPreferences, ...(dados.preferencias || {}) };
        
        // Mesclar histórico de chat
        appState.chatHistory = [...appState.chatHistory, ...(dados.historicoChat || [])];
        
        console.log('✅ Dados mesclados');
        console.log('  📋 Novas tarefas:', novasTarefas.length);
        console.log('  🔄 Novas tarefas fixas:', novasTarefasFixas.length);
      }
      
      console.log('📊 Estado final:');
      console.log('  📋 Total tarefas:', appState.tasks.length);
      console.log('  🔄 Total tarefas fixas:', appState.recurringTasks.length);
      console.log('  💬 Total mensagens:', appState.chatHistory.length);
      
      // Salvar no storage
      console.log('💾 Salvando dados importados...');
      salvarDadosUsuario();
      
      // Se não estava logado, fazer login
      if (!document.getElementById('appContainer').style.display || 
          document.getElementById('appContainer').style.display === 'none') {
        console.log('🔐 Fazendo login automático...');
        showMainApp();
      }
      
      // Atualizar interface
      console.log('🔄 Atualizando interface...');
      renderTasks();
      renderRecurringTasks();
      renderCalendar();
      updateInsights();
      updateOverdueBadge();
      
      // Restaurar chat se houver
      if (appState.chatHistory.length > 0) {
        const chat = document.getElementById('aiChat');
        if (chat) {
          chat.innerHTML = appState.chatHistory.map(msg => `
            <div class="ai-message ${msg.tipo}">
              <div class="ai-message-label">${msg.tipo === 'user' ? 'Você' : 'Assistente IA'}</div>
              <div class="ai-message-content">${msg.conteudo}</div>
            </div>
          `).join('');
          chat.scrollTop = chat.scrollHeight;
        }
      }
      
      console.log('✅ Importação concluída com sucesso!');
      
      // Notificar usuário
      alert(
        `✅ Dados importados com sucesso!\n\n` +
        `📊 Importados:\n` +
        `• ${dados.tarefas.length} tarefas\n` +
        `• ${dados.tarefasFixas?.length || 0} tarefas fixas\n` +
        `• ${dados.historicoChat?.length || 0} mensagens de chat\n\n` +
        `💡 Seus dados foram restaurados e salvos em memória.\n` +
        `Não esqueça de exportar novamente antes de fechar o navegador!`
      );
      
    } catch (error) {
      console.error('❌ ERRO ao importar dados:', error);
      console.error('Stack:', error.stack);
      alert(
        `❌ Erro ao importar dados:\n\n` +
        `${error.message}\n\n` +
        `Verifique se o arquivo está corrompido ou é um backup válido.`
      );
    }
  };
  
  reader.readAsText(arquivo);
}

// ============================================
// FUNCIONALIDADE DE IMPORTAÇÃO NO LOGIN
// ============================================

function setupLoginImport() {
  console.log('📤 Configurando importação no login...');
  
  const selectFileBtn = document.getElementById('selectImportFileBtn');
  const importBtn = document.getElementById('importLoginBtn');
  const fileInput = document.getElementById('loginImportFileInput');
  const fileNameDisplay = document.getElementById('selectedFileName');
  const errorDiv = document.getElementById('importError');
  const successDiv = document.getElementById('importSuccess');
  
  if (!selectFileBtn || !importBtn || !fileInput) {
    console.warn('⚠️ Elementos de importação no login não encontrados');
    return;
  }
  
  let arquivoSelecionado = null;
  
  // Botão selecionar arquivo
  selectFileBtn.addEventListener('click', () => {
    console.log('🔘 Selecionando arquivo para importar...');
    fileInput.click();
  });
  
  // Quando arquivo é selecionado
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      arquivoSelecionado = e.target.files[0];
      console.log('📁 Arquivo selecionado:', arquivoSelecionado.name);
      
      fileNameDisplay.innerHTML = `
        <strong>Arquivo selecionado:</strong><br>
        📄 ${arquivoSelecionado.name}<br>
        💾 Tamanho: ${(arquivoSelecionado.size / 1024).toFixed(2)} KB
      `;
      fileNameDisplay.style.display = 'block';
      importBtn.style.display = 'block';
      
      errorDiv.style.display = 'none';
      successDiv.style.display = 'none';
    }
  });
  
  // Botão importar
  importBtn.addEventListener('click', () => {
    console.log('=== IMPORTANDO NO LOGIN ===');
    
    if (!arquivoSelecionado) {
      errorDiv.textContent = 'Por favor, selecione um arquivo primeiro.';
      errorDiv.style.display = 'block';
      return;
    }
    
    const reader = new FileReader();
    
    reader.onerror = function() {
      console.error('❌ Erro ao ler arquivo');
      errorDiv.textContent = 'Erro ao ler o arquivo. Tente novamente.';
      errorDiv.style.display = 'block';
    };
    
    reader.onload = function(e) {
      try {
        console.log('📖 Lendo arquivo...');
        const conteudo = e.target.result;
        const dados = JSON.parse(conteudo);
        
        console.log('✅ JSON parseado');
        console.log('📊 Dados:', { 
          tarefas: dados.tarefas?.length,
          tarefasFixas: dados.tarefasFixas?.length,
          usuario: dados.usuarioLogado?.nome
        });
        
        // Validar estrutura
        if (!dados.usuarioLogado || !dados.usuarioLogado.id) {
          throw new Error('Arquivo inválido: dados de usuário não encontrados');
        }
        
        if (!Array.isArray(dados.tarefas)) {
          throw new Error('Arquivo inválido: lista de tarefas não encontrada');
        }
        
        console.log('✅ Estrutura validada');
        
        // Importar dados
        globalState.usuarioLogado = dados.usuarioLogado;
        appState.tasks = dados.tarefas || [];
        appState.recurringTasks = dados.tarefasFixas || [];
        appState.userPreferences = dados.preferencias || {};
        appState.chatHistory = dados.historicoChat || [];
        
        console.log('✅ Dados importados para memória');
        console.log('📊 Total tarefas:', appState.tasks.length);
        console.log('🔄 Total tarefas fixas:', appState.recurringTasks.length);
        
        // Salvar no storage
        console.log('💾 Salvando no storage...');
        
        // Salvar sessão
        storage.setItem('app_usuarioLogado', JSON.stringify(globalState.usuarioLogado));
        
        // Salvar dados do usuário
        salvarDadosUsuario();
        
        console.log('✅ Dados salvos no storage');
        
        // Mostrar mensagem de sucesso
        successDiv.innerHTML = `
          ✅ <strong>Importação bem-sucedida!</strong><br>
          📊 ${dados.tarefas.length} tarefas importadas<br>
          🔄 ${dados.tarefasFixas?.length || 0} tarefas fixas importadas<br>
          👤 Entrando como: ${dados.usuarioLogado.nome}
        `;
        successDiv.style.display = 'block';
        errorDiv.style.display = 'none';
        
        // Aguardar 1 segundo e fazer login automático
        setTimeout(() => {
          console.log('🔐 Fazendo login automático...');
          showMainApp();
        }, 1500);
        
      } catch (error) {
        console.error('❌ Erro ao importar:', error);
        errorDiv.textContent = 'Erro ao importar: ' + error.message;
        errorDiv.style.display = 'block';
        successDiv.style.display = 'none';
      }
    };
    
    reader.readAsText(arquivoSelecionado);
  });
  
  console.log('✅ Importação no login configurada');
}

// Tornar função disponível no console
window.verificarLocalStorage = verificarLocalStorage;
window.debugStorage = verificarLocalStorage;
window.exportarDados = exportarDados;

console.log('\n👉 Para verificar o status do armazenamento, digite no console:');
console.log('   verificarLocalStorage()');
console.log('   ou');
console.log('   debugStorage()\n');

function updateRecurringTaskStatus(taskId, newStatus) {
  const task = appState.recurringTasks.find(t => t.id === taskId);
  if (!task) return;
  
  task.status = newStatus;
  console.log('📊 Status da tarefa fixa atualizado:', task.titulo, '->', newStatus);
  
  salvarDadosUsuario();
  renderRecurringTasks();
  renderCalendar();
}

// Fazer funções globais para uso em onclick
window.openTaskModal = openTaskModal;
window.toggleTaskComplete = toggleTaskComplete;
window.updateTaskStatus = updateTaskStatus;
window.deleteTask = deleteTask;
window.openRecurringTaskModal = openRecurringTaskModal;
window.deleteRecurringTask = deleteRecurringTask;
window.closeOverdueModal = closeOverdueModal;
window.togglePassword = togglePassword;
window.updateRecurringTaskStatus = updateRecurringTaskStatus;
window.abrirModalEditarTarefaFixaStatus = abrirModalEditarTarefaFixaStatus;