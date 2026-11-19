// a11y.test.js - Automated accessibility checks for the real page (#129)
//
// Loads index.html into jsdom, starts the real entry point (src/script.js)
// and runs axe over the home screen, the game screen and every modal, so a
// new accessibility error fails the test suite.

import fs from 'fs';
import path from 'path';
import { axe, toHaveNoViolations } from 'jest-axe';
import { stopTimer } from '../src/timer.js';
import { gameState } from '../src/gameState.js';

expect.extend(toHaveNoViolations);

const AXE_OPTIONS = {
  rules: {
    // jsdom cannot work out colours, so colour contrast is checked by hand.
    'color-contrast': { enabled: false },
  },
};

const MODAL_IDS = [
  'restartLevelModal',
  'nextLevelModal',
  'gameOverModal',
  'congratsModal',
  'howToPlayModal',
  'confirmHomeModal',
  'otherTabModal',
];

function loadRealPage() {
  const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
  const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
  document.body.innerHTML = body;
}

describe('accessibility checks with axe', () => {
  beforeAll(async () => {
    loadRealPage();
    await import('../src/script.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  afterAll(() => {
    stopTimer(gameState);
  });

  test('the home screen has no violations', async () => {
    expect(await axe(document.body, AXE_OPTIONS)).toHaveNoViolations();
  });

  test('the game screen after pressing Play has no violations', async () => {
    document.getElementById('playBtn').click();
    expect(document.getElementById('game-board-container').classList.contains('hidden')).toBe(false);
    expect(await axe(document.body, AXE_OPTIONS)).toHaveNoViolations();
  });

  test.each(MODAL_IDS)('the %s modal has no violations', async (modalId) => {
    const modal = document.getElementById(modalId);
    modal.classList.remove('hidden');
    try {
      expect(await axe(document.body, AXE_OPTIONS)).toHaveNoViolations();
    } finally {
      modal.classList.add('hidden');
    }
  });
});
