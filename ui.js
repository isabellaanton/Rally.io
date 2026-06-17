// ============================================================
//  Rally.io — UI Controller (Versão Completa + Multilíngue)
//  Depende de: players.js, game.js, court.js, translations.js
// ============================================================

let engine              = null;
let playerName          = '';
let selectedPlayerCfg   = null;
let selectedOpponentCfg = null;
let selectedSurface     = 'hard';
let gamePaused          = false;

// Language System
// currentLang, t() e updateAllTexts() já vêm de translations.js (carregado antes deste arquivo no <head>).
// Aqui só expomos window.setLanguage, que é o que o HTML chama via onchange/onclick.
window.setLanguage = function(lang) {
  if (TRANSLATIONS && TRANSLATIONS[lang]) {
    currentLang = lang;
    localStorage.setItem('tennisRPG_lang', lang);
    updateAllTexts();

    // Atualiza o seletor de idioma do HTML
    const langSelect = document.getElementById('lang-select');
    if (langSelect) langSelect.value = lang;
  }
};

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

  updateAllTexts();   // ← Importante

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
      serve: 65, return: 65, forehand: 65, backhand: 65,
      volley: 60, speed: 70, stamina: 70, mental: 65,
      aiWeights: {}
    };
    localStorage.setItem('tennisRPG_myPlayer', JSON.stringify(myPlayerConfig));
  } else {
    myPlayerConfig.name = playerName;
    myPlayerConfig.fullName = playerName;
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

// ─── PLAYER / OPPONENT GRID ───────────────────────────────────
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
  
  const logContainer = document.getElementById('match-log');
  if (logContainer) logContainer.innerHTML = '';
  addLog(`Partida iniciada! ${p1.name} vs ${p2.name}`, 'system');
  
  updateUI();
  resetTokens();
  redrawCourt();
  engine.save();

  const human = engine.players[engine.humanIndex];
  if (engine.server === human) showCards();
  else triggerAITurn();
}

function updateAIThinkingLabel() {
  const opp = engine.players[1 - engine.humanIndex];
  const lbl = document.getElementById('ai-thinking-label');
  if (lbl) lbl.textContent = `${opp.name} pensando...`;
}

// ─── GAMEPLAY + ANIMAÇÃO DA BOLA ──────────────────────────────
function handlePlayerShot(shotId) {
  if (!engine || engine.matchOver || gamePaused) return;
  hideCards();
  spawnHitEffect('token-p1');
  styleBallForShot(shotId);

  animateBall('token-p1', 'token-p2', () => {
    const result = engine.executeShot(shotId);
    if (result) styleBallForOutcome(result.outcome);
    updateUI();
    redrawCourt();

    if (!engine.matchOver && engine.phase !== 'point_end' && engine.phase !== 'serve') {
      triggerAITurn();
    }
  });
}

function triggerAITurn() {
  if (!engine || engine.matchOver) return;
  document.getElementById('ai-thinking-box')?.classList.remove('hidden');
  
  setTimeout(() => {
    document.getElementById('ai-thinking-box')?.classList.add('hidden');
    const aiShotId = engine.aiPickShot();
    spawnHitEffect('token-p2');
    styleBallForShot(aiShotId);

    animateBall('token-p2', 'token-p1', () => {
      const result = engine.executeShot(aiShotId);
      if (result) styleBallForOutcome(result.outcome);
      updateUI();
      redrawCourt();
      if (!engine.matchOver && engine.phase !== 'point_end' && engine.phase !== 'serve') {
        showCards();
      }
    });
  }, 900);
}

document.getElementById('btn-continue')?.addEventListener('click', () => {
  if (!engine) return;
  if (engine.matchOver) {
    MatchEngine.clearSave();
    skipToPlayerSelect();
    return;
  }
  document.getElementById('btn-continue').classList.add('hidden');
  resetTokens();
  updateUI();
  redrawCourt();

  const human = engine.players[engine.humanIndex];
  if (engine.server === human) showCards();
  else triggerAITurn();
});

// ─── COURT & TOKENS ───────────────────────────────────────────
function redrawCourt() {
  const canvas = document.getElementById('court-3d-canvas');
  if (!canvas || !engine) return;
  const isDark = document.body.classList.contains('dark');
  CourtRenderer.draw(canvas, selectedSurface, isDark);

  const wrap = document.getElementById('court-3d-wrap');
  const human = engine.players[engine.humanIndex];
  const ai = engine.players[1 - engine.humanIndex];

  const p1NormZ = human.position === 'net' ? 0.6 : 0.95;
  const p2NormZ = ai.position === 'net' ? 0.4 : 0.05;

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
}

function resetTokens() {
  const wrap = document.getElementById('court-3d-wrap');
  const human = engine.players[engine.humanIndex];
  const isHumanServe = engine.server === human;
  const p1NormZ = human.position === 'net' ? 0.6 : 0.95;
  const servePx = CourtRenderer.courtToPixel(0.5, isHumanServe ? p1NormZ : 0.05);
  const ball = document.getElementById('token-ball');
  if (ball) {
    ball.style.transition = 'none';
    applyTokenCSS('token-ball', servePx, wrap, 5.5, servePx.scale);
    setTimeout(() => ball.style.transition = 'all .25s ease-out', 50);
  }
}

function animateBall(fromId, toId, callback) {
  const ball = document.getElementById('token-ball');
  const toEl = document.getElementById(toId);
  if (!ball || !toEl) { if(callback) callback(); return; }

  ball.style.left = toEl.style.left;
  ball.style.top = toEl.style.top;
  ball.style.width = toEl.style.width; 
  ball.style.height = toEl.style.height;

  setTimeout(() => {
    if (callback) callback();
  }, 320);
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

// Ball styling
const BALL_SHOT_CLASSES = ['shot-power-low', 'shot-power-medium', 'shot-power-high', 'shot-power-max', 'shot-touch'];
const BALL_OUTCOME_CLASSES = ['outcome-ace', 'outcome-winner', 'outcome-net', 'outcome-out'];

function styleBallForShot(shotId) {
  const ball = document.getElementById('token-ball');
  if (!ball) return;
  ball.classList.remove(...BALL_SHOT_CLASSES, ...BALL_OUTCOME_CLASSES);
  const shot = SHOTS[shotId];
  if (!shot) return;
  if (shot.id === 'net_dropshot') ball.classList.add('shot-touch');
  else if (shot.power >= 95) ball.classList.add('shot-power-max');
  else if (shot.power >= 80) ball.classList.add('shot-power-high');
  else if (shot.power >= 60) ball.classList.add('shot-power-medium');
  else ball.classList.add('shot-power-low');
}

function styleBallForOutcome(outcome) {
  const ball = document.getElementById('token-ball');
  if (!ball) return;
  ball.classList.remove(...BALL_OUTCOME_CLASSES);
  const map = { ace: 'outcome-ace', winner: 'outcome-winner', net: 'outcome-net', out: 'outcome-out' };
  if (map[outcome]) ball.classList.add(map[outcome]);
}

// ─── UI UPDATE ────────────────────────────────────────────────
function updateUI() {
  if (!engine) return;
  const human = engine.players[engine.humanIndex];
  const ai = engine.players[1 - engine.humanIndex];
  
  document.getElementById('p1-points').textContent = engine.score.pointDisplay[engine.humanIndex];
  document.getElementById('p2-points').textContent = engine.score.pointDisplay[1 - engine.humanIndex];
  document.getElementById('p1-games').textContent = engine.score.games[engine.humanIndex];
  document.getElementById('p2-games').textContent = engine.score.games[1 - engine.humanIndex];

  document.getElementById('p1-name').textContent = human.name;
  document.getElementById('p2-name').textContent = ai.name;

  const phaseBadge = document.getElementById('phase-badge');
  if (phaseBadge) {
    phaseBadge.textContent = engine.phase.replace('_', ' ').toUpperCase();
  }

  document.getElementById('serve-dot-1').style.visibility = (engine.server === human) ? 'visible' : 'hidden';
  document.getElementById('serve-dot-2').style.visibility = (engine.server === ai) ? 'visible' : 'hidden';

  updateBar('p1-energy', human.energy);
  updateBar('p2-energy', ai.energy);
  updateBar('p1-conf', human.confidence);
  updateBar('p2-conf', ai.confidence);

  const logContainer = document.getElementById('match-log');
  logContainer.innerHTML = '';
  engine.currentPointLog.forEach(msg => addLog(msg));

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
    if (s.canAfford) btn.addEventListener('click', () => handlePlayerShot(s.id));
    container.appendChild(btn);
  });
}

function addLog(msg, type = 'system') {
  const logContainer = document.getElementById('match-log');
  if (!logContainer) return;
  const div = document.createElement('div');
  div.className = `log-line log-${type}`;
  div.textContent = msg;
  logContainer.appendChild(div);
  logContainer.scrollTop = logContainer.scrollHeight;
}

// Chama atualização de textos ao carregar
document.addEventListener('DOMContentLoaded', () => { updateAllTexts(); });