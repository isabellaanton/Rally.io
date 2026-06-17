const TRANSLATIONS = {
  pt: { pause: "PAUSA", resume: "Retomar Partida", newGame: "Nova Partida", changeName: "Mudar nome", understood: "Entendido — Jogar", continue: "CONTINUAR — PRÓXIMO PONTO", playAgain: "JOGAR NOVAMENTE", liveNarration: "Narração ao vivo", opponentThinking: "Oponente calculando..." },
  en: { pause: "PAUSE", resume: "Resume Match", newGame: "New Match", changeName: "Change Name", understood: "Got it — Play", continue: "CONTINUE — NEXT POINT", playAgain: "PLAY AGAIN", liveNarration: "Live Narration", opponentThinking: "Opponent thinking..." },
  fr: { pause: "PAUSE", resume: "Reprendre le Match", newGame: "Nouveau Match", changeName: "Changer le nom", understood: "Compris — Jouer", continue: "CONTINUER — POINT SUIVANT", playAgain: "REJOUER", liveNarration: "Narration en direct", opponentThinking: "Adversaire réfléchit..." }
};

let currentLang = localStorage.getItem('tennisRPG_lang') || 'pt';

function t(key) {
  return TRANSLATIONS[currentLang]?.[key] || TRANSLATIONS.pt[key] || key;
}

function setLanguage(lang) {
  if (TRANSLATIONS[lang]) {
    currentLang = lang;
    localStorage.setItem('tennisRPG_lang', lang);
    updateAllTexts();
  }
}

function updateAllTexts() {
  document.getElementById('pause-title') && (document.getElementById('pause-title').textContent = t('pause'));
  document.getElementById('btn-resume') && (document.getElementById('btn-resume').textContent = t('resume'));
  document.getElementById('btn-new-game') && (document.getElementById('btn-new-game').textContent = t('newGame'));
  document.getElementById('btn-change-name') && (document.getElementById('btn-change-name').textContent = t('changeName'));
  document.getElementById('btn-close-tutorial') && (document.getElementById('btn-close-tutorial').textContent = t('understood'));
  document.getElementById('btn-continue') && (document.getElementById('btn-continue').textContent = t('continue'));
  document.getElementById('btn-play-again') && (document.getElementById('btn-play-again').textContent = t('playAgain'));
}