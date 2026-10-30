// What all the mini-games share: the top bar and the end-of-game sheet.
import { audio } from '../audio.js';
import { celebrate, fadeTo, game, save } from '../game.js';
import { haptic } from '../platform.js';
import { played } from '../state.js';

export function gameBar(score = '0') {
  document.getElementById('layer').innerHTML = `
    <div class="gamebar">
      <button class="round" data-action="home" aria-label="Back home">✕</button>
      <span class="score" id="gameScore">${score}</span>
      <span class="spacer"></span>
      <span class="score" id="gameSide" style="color:var(--ink)"></span>
    </div>
    <div class="hint" id="gameHint"></div>`;
}

export const setScore = (text) => {
  const el = document.getElementById('gameScore');
  if (el) el.textContent = text;
};

export const setSide = (text) => {
  const el = document.getElementById('gameSide');
  if (el) el.textContent = text;
};

export const setHint = (text) => {
  const el = document.getElementById('gameHint');
  if (!el) return;
  el.textContent = text;
  el.style.opacity = text ? 1 : 0;
};

/** Ends a game: pays out, shows the sheet, and offers another go. */
export function endGame(gameId, title, score, line, again, home) {
  const result = played(game.state, gameId, score, game.now());
  save();
  audio.fanfare();
  haptic('success');
  const c = game.pet?.anchors.center;
  if (c) game.fx.confetti(c[0], c[1] - 100, 50, game.view.w * 0.4);
  game.ui.sheet(`${game.ui.head(title)}
    <div class="stats" style="grid-template-columns:repeat(2,1fr)">
      <div class="stat"><b>${score}</b><span>${result.record ? 'new best!' : 'score'}</span></div>
      <div class="stat"><b>+${result.berries}</b><span>berries</span></div>
    </div>
    <p>${line}</p>
    <div style="height:8px"></div>
    <button class="btn" id="gameAgain">Play again</button>
    <button class="btn alt" id="gameHome">Back home</button>`);
  document.getElementById('gameAgain').addEventListener('click', () => {
    game.ui.hideSheet();
    celebrate(result);
    fadeTo(again);
  });
  document.getElementById('gameHome').addEventListener('click', () => {
    game.ui.hideSheet();
    fadeTo(home);
    setTimeout(() => celebrate(result), 600);
  });
}
