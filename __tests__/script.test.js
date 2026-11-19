// script.test.js - Tests for the entry point, src/script.js (#163)
//
// Loads the real index.html body, mocks gameController.js, then starts
// script.js the way the browser does (DOMContentLoaded) and checks that
// every menu and modal button is wired to the right controller function
// or shows and hides the right modal.

import fs from 'fs';
import path from 'path';

jest.mock('../src/gameController.js', () => ({
  showMenu: jest.fn(),
  hideGameOver: jest.fn(),
  startGame: jest.fn(),
  continueGame: jest.fn(),
  restartLevel: jest.fn(),
  nextLevel: jest.fn(),
  goHome: jest.fn(),
  restartGameFromBeginning: jest.fn(),
  handleSavedGameChangedElsewhere: jest.fn(),
  setTimerMode: jest.fn(),
  useThisTab: jest.fn(),
  leaveForOtherTab: jest.fn(),
}));

let gc;

function loadRealPage() {
  const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
  const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
  document.body.innerHTML = body;
}

function byId(id) {
  return document.getElementById(id);
}

function isHidden(id) {
  return byId(id).classList.contains('hidden');
}

function storageEvent(key) {
  const event = new Event('storage');
  event.key = key;
  return event;
}

describe('script.js entry point', () => {
  const initCalls = {};

  beforeAll(async () => {
    loadRealPage();
    gc = await import('../src/gameController.js');
    await import('../src/script.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    initCalls.showMenu = gc.showMenu.mock.calls.length;
    initCalls.setTimerModeArgs = gc.setTimerMode.mock.calls.map((call) => call[0]);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('init shows the menu and applies the stored timer mode', () => {
    expect(initCalls.showMenu).toBe(1);
    expect(initCalls.setTimerModeArgs).toEqual(['normal']);
    expect(byId('timerModeSelect').value).toBe('normal');
  });

  test('Play starts a game and Continue continues one', () => {
    byId('playBtn').click();
    expect(gc.startGame).toHaveBeenCalledTimes(1);
    byId('continueBtn').click();
    expect(gc.continueGame).toHaveBeenCalledTimes(1);
  });

  test('Restart Game goes back to the beginning', () => {
    byId('restartGameBtn').click();
    expect(gc.restartGameFromBeginning).toHaveBeenCalledTimes(1);
  });

  test('How to Play opens its modal and the close button hides it', () => {
    byId('howToPlayBtn').click();
    expect(isHidden('howToPlayModal')).toBe(false);
    byId('closeHowToPlay').click();
    expect(isHidden('howToPlayModal')).toBe(true);
  });

  test('restart modal buttons restart the level or hide the modal', () => {
    byId('confirmRestartBtn').click();
    expect(gc.restartLevel).toHaveBeenCalledTimes(1);

    byId('restartLevelModal').classList.remove('hidden');
    byId('cancelRestartBtn').click();
    expect(isHidden('restartLevelModal')).toBe(true);

    byId('restartLevelModal').classList.remove('hidden');
    byId('closeRestartModal').click();
    expect(isHidden('restartLevelModal')).toBe(true);
  });

  test('next level modal buttons move on or hide the modal', () => {
    byId('confirmNextLevelBtn').click();
    expect(gc.nextLevel).toHaveBeenCalledTimes(1);

    byId('nextLevelModal').classList.remove('hidden');
    byId('cancelNextLevelBtn').click();
    expect(isHidden('nextLevelModal')).toBe(true);

    byId('nextLevelModal').classList.remove('hidden');
    byId('closeNextLevelModal').click();
    expect(isHidden('nextLevelModal')).toBe(true);
  });

  test('game over modal buttons play again or go to the menu', () => {
    byId('gameOverPlayAgainBtn').click();
    expect(gc.hideGameOver).toHaveBeenCalledTimes(1);
    expect(gc.startGame).toHaveBeenCalledTimes(1);

    byId('gameOverHomeBtn').click();
    expect(gc.hideGameOver).toHaveBeenCalledTimes(2);
    expect(gc.showMenu).toHaveBeenCalledTimes(1);
  });

  test('congratulations modal buttons play again or go to the menu', () => {
    byId('congratsModal').classList.remove('hidden');
    byId('congratsPlayAgainBtn').click();
    expect(isHidden('congratsModal')).toBe(true);
    expect(gc.startGame).toHaveBeenCalledTimes(1);

    byId('congratsHomeBtn').click();
    expect(isHidden('congratsModal')).toBe(true);
    expect(gc.showMenu).toHaveBeenCalledTimes(1);
  });

  test('other tab modal buttons pick a tab', () => {
    byId('otherTabUseThisBtn').click();
    expect(gc.useThisTab).toHaveBeenCalledTimes(1);
    byId('otherTabGoHomeBtn').click();
    expect(gc.leaveForOtherTab).toHaveBeenCalledTimes(1);
  });

  test('changing the timer setting applies the new mode', () => {
    const select = byId('timerModeSelect');
    select.value = 'extra';
    select.dispatchEvent(new Event('change'));
    expect(gc.setTimerMode).toHaveBeenCalledWith('extra');
  });

  test('Home goes straight home when the board is not showing', () => {
    byId('homeBtn').click();
    expect(gc.goHome).toHaveBeenCalledTimes(1);
    expect(isHidden('confirmHomeModal')).toBe(true);
  });

  test('Home asks first while a game is showing, and Cancel backs out', () => {
    byId('game-board-container').classList.remove('hidden');
    byId('homeBtn').click();
    expect(isHidden('confirmHomeModal')).toBe(false);
    expect(gc.goHome).not.toHaveBeenCalled();

    byId('cancelHomeBtn').click();
    expect(isHidden('confirmHomeModal')).toBe(true);
    expect(gc.goHome).not.toHaveBeenCalled();
    byId('game-board-container').classList.add('hidden');
  });

  test('confirming the Home modal goes home', () => {
    byId('game-board-container').classList.remove('hidden');
    byId('homeBtn').click();
    byId('confirmHomeBtn').click();
    expect(gc.goHome).toHaveBeenCalledTimes(1);
    expect(isHidden('confirmHomeModal')).toBe(true);
    byId('game-board-container').classList.add('hidden');
  });

  test('a saved game changed in another tab is handled', () => {
    window.dispatchEvent(storageEvent('musicalMatchSaga'));
    expect(gc.handleSavedGameChangedElsewhere).toHaveBeenCalledTimes(1);

    window.dispatchEvent(storageEvent('someOtherKey'));
    expect(gc.handleSavedGameChangedElsewhere).toHaveBeenCalledTimes(1);

    window.dispatchEvent(storageEvent(null));
    expect(gc.handleSavedGameChangedElsewhere).toHaveBeenCalledTimes(2);
  });
});
