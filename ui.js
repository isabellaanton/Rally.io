// ============================================================
//  Rally.io — UI Controller (Versão Completa 3D + Animações)
//  Depende de: players.js, game.js, court.js
// ============================================================

let engine              = null;
let playerName          = '';
let selectedPlayerCfg   = null;
let selectedOpponentCfg = null;
let selectedSurface     = 'hard';
let gamePaused          = false;

// ─── THEME ────────────────────────────────────────────────────
function applyTheme(dark) {
  document.body.classList.toggle('dark', dark);
  const btn = document.getElementById('btn-theme');
  if (btn) btn.textContent = dark ? 'Claro' : 'Escuro';
  localStorage.setItem('tennisRPG_theme', dark ? 'dark' : 'light');
}

function toggleTheme() {
  applyTheme(!document.body.classList.contains('dark'));
}

// ─── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('tennisRPG_theme');
  applyTheme(savedTheme === 'dark');

  document.getElementById('btn-theme')?.addEventListener('click', toggleTheme);

  document.getElementById('btn-pause')?.addEventListener('click', () => {
    gamePaused = true;
    showModal('modal-pause');
  });
  document.getElementById('btn-resume')?.addEventListener('click', () => {
    gamePaused = false;
    hideModal('modal-pause');
  });
  document.getElementById('btn-new-game')?.addEventListener('click', () => {
    MatchEngine.clearSave();
    gamePaused = false;
    hideModal('modal-pause');
    skipToPlayerSelect();
  });
  document.getElementById('btn-change-name')?.addEventListener('click', () => {
    hideModal('modal-pause');
    showModal('modal-register');
  });

  document.getElementById('btn-tutorial')?.addEventListener('click', () => {
    showModal('modal-tutorial');
  });
  document.getElementById('btn-close-tutorial')?.addEventListener('click', () => {
    hideModal('modal-tutorial');
  });

  const saved = MatchEngine.load();
  if (saved && !saved.matchOver) {
    const savedName = localStorage.getItem('tennisRPG_playerName') || '';
    if (savedName) {
      playerName = savedName;
      engine     = saved;
      updateAIThinkingLabel();
      setSurfaceTheme(saved.surfaceId);
      hideModal('modal-register');
      hideModal('modal-start');
      hideModal('modal-select-opponent');
      updateUI();
      redrawCourt();
      
      const human = engine.players[engine.humanIndex];
      const isHumanServe = (engine.server === human);
      resetTokens();
      
      if (engine.phase !== 'point_end') {
          if (isHumanServe) showCards();
          else triggerAITurn();
      }

      addLog(`Bem-vindo de volta, ${playerName}! Partida restaurada.`, 'system');
      return;
    }
  }

  const storedName = localStorage.getItem('tennisRPG_playerName');
  if (storedName) {
    playerName = storedName;
    skipToPlayerSelect();
  } else {
    showModal('modal-register');
  }
});

function skipToPlayerSelect() {
  prepareMyPlayer();
  hideModal('modal-register');
  renderPlayerSelectGrid();
  showModal('modal-start');
}

// ─── MODAIS ───────────────────────────────────────────────────
function showModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hideModal(id) { document.getElementById(id)?.classList.add('hidden'); }

// ─── REGISTRO & MY PLAYER ─────────────────────────────────────
document.getElementById('btn-confirm-name')?.addEventListener('click', confirmName);
document.getElementById('input-player-name')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') confirmName();
});

function prepareMyPlayer() {
  let myPlayerConfig = JSON.parse(localStorage.getItem('tennisRPG_myPlayer'));
  
  if (!myPlayerConfig) {
    myPlayerConfig = {
      id: 'myplayer_1', name: playerName, fullName: playerName,
      country: '🌎', gender: 'M', style: 'Jogador Customizado (Nível 1)',
      playstyle: 'all_court',
      level: 1, xp: 0,
      serve: 65, return: 65, forehand: 65, backhand: 65,
      volley: 60, speed: 70, stamina: 70, mental: 65,
      aiWeights: {}
    };
    localStorage.setItem('tennisRPG_myPlayer', JSON.stringify(myPlayerConfig));
  } else {
    myPlayerConfig.name = playerName;
    myPlayerConfig.fullName = playerName;
    myPlayerConfig.style = `Jogador Customizado (Nível ${myPlayerConfig.level})`;
  }

  const existingIndex = MALE_PLAYERS.findIndex(p => p.id === 'myplayer_1');
  if (existingIndex > -1) {
    MALE_PLAYERS[existingIndex] = myPlayerConfig; 
  } else {
    MALE_PLAYERS.unshift(myPlayerConfig); 
  }
}

function confirmName() {
  const input = document.getElementById('input-player-name');
  const val   = (input?.value || '').trim();
  if (!val) { input?.classList.add('border-red-500'); return; }
  playerName = val;
  localStorage.setItem('tennisRPG_playerName', playerName);
  
  prepareMyPlayer();

  const nameDisplay = document.getElementById('registered-name-display');
  if(nameDisplay) nameDisplay.textContent = playerName;

  hideModal('modal-register');
  renderPlayerSelectGrid();
  showModal('modal-start');
}

// ─── PLAYER GRID ──────────────────────────────────────────────
function renderPlayerSelectGrid() {
  const gridM = document.getElementById('player-grid-male');
  const gridF = document.getElementById('player-grid-female');
  if (!gridM || !gridF) return;
  gridM.innerHTML = '';
  gridF.innerHTML = '';
  MALE_PLAYERS.forEach(p   => gridM.appendChild(buildPlayerCard(p, 'player')));
  FEMALE_PLAYERS.forEach(p => gridF.appendChild(buildPlayerCard(p, 'player')));
}

function buildPlayerCard(p, mode) {
  const div = document.createElement('div');
  div.className   = 'player-select-card';
  div.dataset.id  = p.id;
  
  if(p.id === 'myplayer_1') {
      div.style.border = "2px solid #d97706";
      div.style.background = "rgba(217, 119, 6, 0.05)";
  }

  div.innerHTML   = `
    <div class="text-base">${p.country}</div>
    <div class="player-card-name">${p.name}</div>
    <div class="player-card-style">${p.style}</div>
    <div class="player-card-attrs">
      <span title="Saque">SV ${p.serve}</span>
      <span title="Velocidade">VL ${p.speed}</span>
      <span title="Forehand">FH ${p.forehand}</span>
      <span title="Mental">MT ${p.mental}</span>
    </div>`;
  div.addEventListener('click', () => {
    if (mode === 'player') selectHumanPlayer(p, div);
    else selectOpponent(p, div);
  });
  return div;
}

function selectHumanPlayer(cfg, el) {
  document.querySelectorAll('#modal-start .player-select-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selectedPlayerCfg = { ...cfg, isHuman: true };
  document.getElementById('btn-next-opponent')?.classList.remove('opacity-30','pointer-events-none');
}

document.getElementById('btn-next-opponent')?.addEventListener('click', () => {
  if (!selectedPlayerCfg) return;
  hideModal('modal-start');
  renderOpponentGrid();
  showModal('modal-select-opponent');
});

// ─── OPPONENT GRID ────────────────────────────────────────────
function renderOpponentGrid() {
  const gridM = document.getElementById('opp-grid-male');
  const gridF = document.getElementById('opp-grid-female');
  if (!gridM || !gridF) return;
  gridM.innerHTML = '';
  gridF.innerHTML = '';
  MALE_PLAYERS.forEach(p => {
    if (p.id !== selectedPlayerCfg.id) gridM.appendChild(buildPlayerCard(p, 'opponent'));
  });
  FEMALE_PLAYERS.forEach(p => {
    if (p.id !== selectedPlayerCfg.id) gridF.appendChild(buildPlayerCard(p, 'opponent'));
  });
}

function selectOpponent(cfg, el) {
  document.querySelectorAll('#modal-select-opponent .player-select-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selectedOpponentCfg = cfg;
  document.getElementById('btn-start-match')?.classList.remove('opacity-30','pointer-events-none');
}

document.getElementById('btn-start-match')?.addEventListener('click', () => {
  if (!selectedPlayerCfg || !selectedOpponentCfg) return;
  startMatch();
});

// ─── SUPERFÍCIE ───────────────────────────────────────────────
document.querySelectorAll('.surface-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.surface-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedSurface = btn.dataset.surface;
  });
});

function setSurfaceTheme(surf) {
  document.body.classList.remove('surface-clay', 'surface-grass', 'surface-hard');
  document.body.classList.add(`surface-${surf}`);
}

// ─── START MATCH ──────────────────────────────────────────────
function startMatch() {
  const p1 = new Player(selectedPlayerCfg);
  const p2 = new Player(selectedOpponentCfg);
  engine = new MatchEngine(p1, p2, selectedSurface);
  
  updateAIThinkingLabel();
  setSurfaceTheme(selectedSurface);
  
  hideModal('modal-select-opponent');
  
  // Limpa o log e inicia
  const logContainer = document.getElementById('match-log');
  if (logContainer) logContainer.innerHTML = '';
  addLog(`Partida iniciada! ${p1.name} vs ${p2.name} na superfície ${SURFACES[selectedSurface].name}.`, 'system');
  
  updateUI();
  resetTokens();
  redrawCourt();
  engine.save();

  const human = engine.players[engine.humanIndex];
  if (engine.server === human) {
    showCards();
  } else {
    triggerAITurn();
  }
}

function updateAIThinkingLabel() {
  const opp = engine.players[1 - engine.humanIndex];
  const lbl = document.getElementById('ai-thinking-label');
  if (lbl) lbl.textContent = `${opp.name} pensando...`;
}

// ─── GAMEPLAY LOOP E ANIMAÇÃO DA BOLA ─────────────────────────
function handlePlayerShot(shotId) {
  if (!engine || engine.matchOver || gamePaused) return;

  const human = engine.players[engine.humanIndex];
  const ai    = engine.players[1 - engine.humanIndex];
  
  const isHumanTurn = (engine.phase === 'serve') 
    ? (engine.server === human) 
    : (engine.rallyCount % 2 === (engine.server === human ? 0 : 1));

  if (!isHumanTurn) return;

  hideCards();
  spawnHitEffect('token-p1'); // Efeito de batida no jogador base
  
  // Anima a bola do seu jogador (token-p1) para o oponente (token-p2)
  animateBall('token-p1', 'token-p2', () => {
    engine.executeShot(shotId);
    updateUI();
    redrawCourt();

    if (!engine.matchOver && engine.phase !== 'serve' && engine.phase !== 'point_end') {
      const isAITurn = (engine.rallyCount % 2 === (engine.server === ai ? 0 : 1));
      if (isAITurn) triggerAITurn();
    }
  });
}

function triggerAITurn() {
  if (!engine || engine.matchOver) return;
  const ai = engine.players[1 - engine.humanIndex];
  
  document.getElementById('ai-thinking-box')?.classList.remove('hidden');
  
  setTimeout(() => {
    document.getElementById('ai-thinking-box')?.classList.add('hidden');
    
    // Corrigido para acessar o método real do motor
    const aiShotId = engine.aiPickShot(); 
    spawnHitEffect('token-p2');
    
    // Anima a bola do oponente (token-p2) para você (token-p1)
    animateBall('token-p2', 'token-p1', () => {
      engine.executeShot(aiShotId);
      updateUI();
      redrawCourt();
      
      if (!engine.matchOver && engine.phase !== 'serve' && engine.phase !== 'point_end') {
        const human = engine.players[engine.humanIndex];
        const isHumanTurnNext = (engine.rallyCount % 2 === (engine.server === human ? 0 : 1));
        if (isHumanTurnNext) showCards();
      }
    });
  }, 1000 + Math.random() * 800);
}

document.getElementById('btn-continue')?.addEventListener('click', () => {
  if (!engine) return;
  if (engine.matchOver) {
    MatchEngine.clearSave();
    skipToPlayerSelect();
    return;
  }
  
  document.getElementById('btn-continue').classList.add('hidden');
  
  const human = engine.players[engine.humanIndex];
  const isHumanServe = (engine.server === human);
  
  resetTokens();
  updateUI();
  redrawCourt();

  if (isHumanServe) {
    showCards();
  } else {
    triggerAITurn();
  }
});

// ─── LÓGICA DE RENDERIZAÇÃO DA QUADRA E TOKENS ────────────────

function redrawCourt() {
  const canvas = document.getElementById('court-3d-canvas');
  if (!canvas || !engine) return;
  
  const isDark = document.body.classList.contains('dark');
  CourtRenderer.draw(canvas, selectedSurface, isDark);
  
  const wrap = document.getElementById('court-3d-wrap');
  const human = engine.players[engine.humanIndex];
  const ai = engine.players[1 - engine.humanIndex];

  // Define a profundidade Z do modelo com base na posição
  // normZ 0 = Fundo do Oponente, 0.5 = Rede, 1 = Fundo do Jogador
  const p1NormZ = human.position === 'net' ? 0.6 : 0.95;
  const p2NormZ = ai.position === 'net' ? 0.4 : 0.05;

  // Usa CourtRenderer para traduzir do 3D para o plano 2D CSS
  const p1Px = CourtRenderer.courtToPixel(0.5, p1NormZ);
  const p2Px = CourtRenderer.courtToPixel(0.5, p2NormZ);

  applyTokenCSS('token-p1', p1Px, wrap, 11, p1Px.scale);
  applyTokenCSS('token-p2', p2Px, wrap, 10, p2Px.scale);
}

function applyTokenCSS(id, pos, wrap, baseRadius, scale) {
  const el = document.getElementById(id);
  if (!el) return;
  const css = CourtRenderer.pixelToTokenCSS(pos.x, pos.y, wrap, baseRadius, scale);
  el.style.left = css.left + 'px';
  el.style.top = css.top + 'px';
  el.style.width = css.width + 'px';
  el.style.height = css.height + 'px';
  
  // Aumenta a fonte e zIndex baseados na profundidade da câmera
  el.style.fontSize = Math.max(5, css.width * 0.3) + 'px';
  el.style.zIndex = Math.round(scale * 10);
}

function resetTokens() {
  const wrap = document.getElementById('court-3d-wrap');
  const human = engine.players[engine.humanIndex];
  const isHumanServe = engine.server === human;
  
  const p1NormZ = human.position === 'net' ? 0.6 : 0.95;
  const p2NormZ = engine.players[1 - engine.humanIndex].position === 'net' ? 0.4 : 0.05;

  const servePx = CourtRenderer.courtToPixel(0.5, isHumanServe ? p1NormZ : p2NormZ);
  const ball = document.getElementById('token-ball');
  
  if (ball) {
    // Tira a transição para reposicionar a bola sem arrastar
    ball.style.transition = 'none';
    applyTokenCSS('token-ball', servePx, wrap, 5.5, servePx.scale);
    
    // Restaura a transição para as rebatidas
    setTimeout(() => {
      ball.style.transition = 'top .25s ease-out, left .25s ease-out, width .25s, height .25s';
    }, 50);
  }
}

function animateBall(fromId, toId, callback) {
  const ball = document.getElementById('token-ball');
  const toEl = document.getElementById(toId);
  if (!ball || !toEl) { if(callback) callback(); return; }

  // Move a bola CSS para simular o golpe
  ball.style.left = toEl.style.left;
  ball.style.top = toEl.style.top;
  ball.style.width = toEl.style.width; 
  ball.style.height = toEl.style.height;

  // Tempo sincronizado com as transições CSS (.25s) + margem
  setTimeout(() => {
    if (callback) callback();
  }, 300); 
}

function spawnHitEffect(tokenId) {
  const token = document.getElementById(tokenId);
  if (!token) return;
  const flash = document.createElement('div');
  flash.className = 'hit-flash';
  flash.style.left = token.style.left;
  flash.style.top = token.style.top;
  token.parentElement.appendChild(flash);
  setTimeout(() => flash.remove(), 400);
}

// ─── FUNÇÕES DE INTERFACE DO USUÁRIO ──────────────────────────

function updateUI() {
  if (!engine) return;
  const human = engine.players[engine.humanIndex];
  const ai = engine.players[1 - engine.humanIndex];
  
  // Placar
  document.getElementById('p1-points').textContent = engine.score.pointDisplay[engine.humanIndex];
  document.getElementById('p2-points').textContent = engine.score.pointDisplay[1 - engine.humanIndex];
  document.getElementById('p1-games').textContent = engine.score.games[engine.humanIndex];
  document.getElementById('p2-games').textContent = engine.score.games[1 - engine.humanIndex];

  document.getElementById('p1-name').textContent = human.name;
  document.getElementById('p2-name').textContent = ai.name;

  const phaseBadge = document.getElementById('phase-badge');
  if (phaseBadge) {
    phaseBadge.textContent = engine.phase.replace('_', ' ').toUpperCase();
    phaseBadge.className = `font-display text-xs px-3 py-1 rounded-full border phase-${engine.phase.split('_')[0]} font-bold`;
  }

  document.getElementById('serve-dot-1').style.visibility = (engine.server === human) ? 'visible' : 'hidden';
  document.getElementById('serve-dot-2').style.visibility = (engine.server === ai) ? 'visible' : 'hidden';

  // Barras de Energia e Confiança
  updateBar('p1-energy', human.energy);
  updateBar('p2-energy', ai.energy);
  updateBar('p1-conf', human.confidence);
  updateBar('p2-conf', ai.confidence);
  
  // Re-inserir Logs (Narração)
  const logContainer = document.getElementById('match-log');
  logContainer.innerHTML = '';
  engine.currentPointLog.forEach(msg => {
    let type = 'system';
    if (msg.includes('ACE!')) type = 'ace';
    else if (msg.includes('WINNER!')) type = 'winner';
    else if (msg.includes('erro') || msg.includes('Fora') || msg.includes('NA REDE')) type = 'error';
    addLog(msg, type);
  });

  if (engine.phase === 'point_end' || engine.matchOver) {
    document.getElementById('btn-continue').classList.remove('hidden');
    hideCards();
  }
}

function updateBar(id, val) {
  const el = document.getElementById(id);
  const valEl = document.getElementById(`${id}-val`);
  if (el) el.style.width = `${Math.max(0, Math.min(100, val))}%`;
  if (valEl) valEl.textContent = Math.round(val);
}

function hideCards() {
  document.getElementById('shot-cards').innerHTML = '';
}

function showCards() {
  if (!engine || engine.matchOver) return;
  const container = document.getElementById('shot-cards');
  container.innerHTML = '';
  const shots = engine.availableShots();
  
  shots.forEach(s => {
    const btn = document.createElement('div');
    btn.className = `shot-card ${s.canAfford ? '' : 'disabled'}`;
    btn.innerHTML = `
      <div class="flex justify-between items-center mb-1">
        <span class="shot-name">${s.name}</span>
        <span class="shot-icon-text">${s.icon}</span>
      </div>
      <div class="shot-desc mb-2">${s.description}</div>
      <div class="flex justify-between items-center mt-auto">
        <span class="shot-cost">⚡ ${s.energyCost}</span>
        <span class="success-pill ${s.successChance >= 70 ? 'success-high' : s.successChance >= 45 ? 'success-mid' : 'success-low'}">${s.successChance}%</span>
      </div>
    `;
    if (s.canAfford) {
      btn.addEventListener('click', () => handlePlayerShot(s.id));
    }
    container.appendChild(btn);
  });
}

function addLog(msg, type) {
  const logContainer = document.getElementById('match-log');
  if (!logContainer) return;
  const div = document.createElement('div');
  div.className = `log-line ${type ? 'log-' + type : ''}`;
  div.textContent = msg;
  logContainer.appendChild(div);
  logContainer.scrollTop = logContainer.scrollHeight;
}