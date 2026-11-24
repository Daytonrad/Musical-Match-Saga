// levelOutcomes.test.js - Unit tests for levelOutcomes.js
// Add your tests here
import { gameState, resetGameState } from '../src/gameState.js';
import { handleLevelWin, handleLevelLose } from '../src/levelOutcomes.js';
import { LEVELS } from '../src/levels.js';
import { getHighScore, getHighestLevel, loadGameProgress, saveGameProgress, saveHighScore, saveHighestLevel, isValidSaveExceptBoard } from '../src/storage.js';
import { BOARD_SIZE, SYMBOLS, TIMER_MODES, MOVE_BONUS, TIME_BONUS } from '../src/constants.js';

describe('levelOutcomes', () => {
  beforeEach(() => {
    // Reset gameState before each test
    gameState.levelComplete = false;
    gameState.timerActive = false;
    gameState.timerInterval = null;
    gameState.lives = 3; // Assuming INITIAL_LIVES is 3
    gameState.level = 1;
    gameState.score = 0;
    gameState.totalScore = 0;
    gameState.movesLeft = 0;
    gameState.timer = 0;
    gameState.timerMode = 'normal';
    document.body.innerHTML = '';
    localStorage.clear();
  });

  test('handleLevelWin updates gameState and shows next level modal', () => {
    // Simulate the next level modal in the DOM
    const nextLevelModal = document.createElement('div');
    nextLevelModal.id = 'nextLevelModal';
    nextLevelModal.classList.add('modal', 'hidden');
    document.body.appendChild(nextLevelModal);

    handleLevelWin();

    expect(gameState.levelComplete).toBe(true);
    expect(gameState.timerActive).toBe(false);
    expect(nextLevelModal.classList.contains('hidden')).toBe(false);

    // Clean up
    document.body.removeChild(nextLevelModal);
  });

  test.each([1, LEVELS.length - 1].flatMap(level =>
    Object.keys(TIMER_MODES).map(timerMode => [level, timerMode])
  ))('winning level %i saves the next level immediately with timer mode %s', (level, timerMode) => {
    gameState.timerMode = timerMode;
    resetGameState(LEVELS[level - 1]);
    Object.assign(gameState, {
      level, lives: 2, score: 100, totalScore: 300, movesLeft: 4, timer: 23
    });
    LEVELS[level - 1].objectives.forEach(({ label }) => {
      gameState[label + 'Left'] = 0;
    });
    const oldBoard = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(SYMBOLS[0]));
    saveHighScore(600);
    saveGameProgress(gameState, oldBoard);

    handleLevelWin();

    const bonus = 4 * MOVE_BONUS + (timerMode === 'off' ? 0 : 23 * TIME_BONUS);
    const nextConfig = LEVELS[level];
    const progress = loadGameProgress();
    expect(progress).toEqual({
      level: level + 1,
      lives: 2,
      score: 0,
      totalScore: 300 + bonus,
      movesLeft: nextConfig.moves,
      timer: nextConfig.timer * TIMER_MODES[timerMode].factor,
      boardState: [],
      objectives: Object.fromEntries(nextConfig.objectives.map(({ label, count }) => [label + 'Left', count])),
      timestamp: expect.any(Number)
    });
    expect(isValidSaveExceptBoard(progress)).toBe(true);
    expect(getHighestLevel()).toBe(level);
    expect(getHighScore()).toBe(600);
    // Keep the completed level and its bonus visible until Next Level is pressed.
    expect(gameState.level).toBe(level);
    expect(gameState.levelComplete).toBe(true);
    expect(gameState.score).toBe(100 + bonus);
    expect(gameState.totalScore).toBe(300 + bonus);
  });

  test.each([1, LEVELS.length - 1].flatMap(level =>
    Object.keys(TIMER_MODES).map(timerMode => [level, timerMode])
  ))('losing level %i saves a fresh attempt with fewer lives in timer mode %s', (level, timerMode) => {
    gameState.timerMode = timerMode;
    resetGameState(LEVELS[level - 1]);
    Object.assign(gameState, { level, lives: 3, score: 100, totalScore: 300, movesLeft: 0, timer: 0 });
    const oldBoard = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(SYMBOLS[0]));
    saveHighScore(900);
    saveHighestLevel(LEVELS.length);
    saveGameProgress(gameState, oldBoard);

    handleLevelLose(null, null, null);

    const config = LEVELS[level - 1];
    expect(loadGameProgress()).toEqual({
      level, lives: 2, score: 0, totalScore: 200,
      movesLeft: config.moves,
      timer: config.timer * TIMER_MODES[timerMode].factor,
      boardState: [],
      objectives: Object.fromEntries(config.objectives.map(({ label, count }) => [label + 'Left', count])),
      timestamp: expect.any(Number)
    });
    expect(isValidSaveExceptBoard(loadGameProgress())).toBe(true);
    expect(gameState.totalScore).toBe(200);
    expect(gameState.score).toBe(0);
    expect(gameState.levelComplete).toBe(true);
    expect(gameState.timerActive).toBe(false);
    expect(getHighScore()).toBe(900);
    expect(getHighestLevel()).toBe(LEVELS.length);
  });

  test('repeated failed attempts do not add points to the level-start total', () => {
    Object.assign(gameState, { lives: 3, score: 100, totalScore: 300 });
    handleLevelLose(null, null, null);
    resetGameState(LEVELS[0]); // The retry starts the same level.
    gameState.score += 40;
    gameState.totalScore += 40;
    handleLevelLose(null, null, null);

    expect(loadGameProgress()).toEqual(expect.objectContaining({ lives: 1, score: 0, totalScore: 200 }));
    expect(gameState.totalScore).toBe(200);
  });

  test('a loss does not save a negative total from inconsistent historical scores', () => {
    Object.assign(gameState, { lives: 3, score: 100, totalScore: 50 });
    handleLevelLose(null, null, null);
    expect(loadGameProgress()).toEqual(expect.objectContaining({ score: 0, totalScore: 0 }));
  });

  test('the final lost life still records the existing Game Over score and clears progress', () => {
    Object.assign(gameState, { lives: 1, score: 100, totalScore: 300 });
    saveGameProgress(gameState, []);
    handleLevelLose(null, null, null);
    expect(gameState.lives).toBe(0);
    expect(getHighScore()).toBe(300);
    expect(gameState.totalScore).toBe(300);
    expect(loadGameProgress()).toBeNull();
  });

  test('handleLevelWin adds a bonus once for moves and time left', () => {
    document.body.innerHTML = '<div id="nextLevelModal" class="hidden"></div><p id="levelBonus"></p>';
    gameState.movesLeft = 4;
    gameState.timer = 23;
    gameState.score = 100;
    gameState.totalScore = 300;

    handleLevelWin();

    // 4 x 20 + 23 x 2 = 126
    expect(gameState.score).toBe(226);
    expect(gameState.totalScore).toBe(426);
    expect(document.getElementById('levelBonus').textContent).toContain('Moves left: 4 × 20 = +80');
    expect(document.getElementById('levelBonus').textContent).toContain('Time left: 23s × 2 = +46');
  });

  test('handleLevelWin gives no time bonus when the timer is off', () => {
    document.body.innerHTML = '<div id="nextLevelModal" class="hidden"></div><p id="levelBonus"></p>';
    gameState.timerMode = 'off';
    gameState.movesLeft = 4;
    gameState.timer = 23; // should be ignored
    gameState.score = 100;
    gameState.totalScore = 300;

    handleLevelWin();
    gameState.timerMode = 'normal';

    expect(gameState.score).toBe(180);
    expect(gameState.totalScore).toBe(380);
    expect(document.getElementById('levelBonus').textContent).toContain('Moves left: 4 × 20 = +80');
    expect(document.getElementById('levelBonus').textContent).not.toContain('Time left');
  });

  test('handleLevelWin shows congratulations modal on the final level', () => {
    gameState.level = LEVELS.length;
    // totalScore is kept live in sync with score during play, so it already
    // includes the level's score by the time handleLevelWin() runs.
    gameState.score = 125;
    gameState.totalScore = 400;

    const congratsModal = document.createElement('div');
    congratsModal.id = 'congratsModal';
    congratsModal.classList.add('modal', 'hidden');
    document.body.appendChild(congratsModal);

    const congratsFinalScore = document.createElement('div');
    congratsFinalScore.id = 'congratsFinalScore';
    document.body.appendChild(congratsFinalScore);

    const nextLevelModal = document.createElement('div');
    nextLevelModal.id = 'nextLevelModal';
    nextLevelModal.classList.add('modal', 'hidden');
    document.body.appendChild(nextLevelModal);

    localStorage.setItem('musicalMatchSaga', JSON.stringify({
      savedProgress: { level: LEVELS.length, score: 400 }
    }));

    handleLevelWin();

    expect(gameState.levelComplete).toBe(true);
    expect(gameState.timerActive).toBe(false);
    expect(congratsModal.classList.contains('hidden')).toBe(false);
    expect(nextLevelModal.classList.contains('hidden')).toBe(true);
    expect(gameState.totalScore).toBe(400);
    expect(gameState.score).toBe(0);
    expect(congratsFinalScore.textContent).toBe('Total Score: 400');
    expect(getHighScore()).toBe(400);
    expect(getHighestLevel()).toBe(LEVELS.length);
    expect(loadGameProgress()).toBeNull();
  });

  test('handleLevelLose updates gameState and UI elements correctly', () => {
    const restartContainer = document.createElement('div');
    const restartBtn = document.createElement('button');
    const nextLevelBtn = document.createElement('button');
    restartContainer.classList.add('hidden');
    restartBtn.classList.add('hidden');
    nextLevelBtn.classList.remove('hidden');

    handleLevelLose(restartContainer, restartBtn, nextLevelBtn);

    expect(gameState.levelComplete).toBe(true);
    expect(gameState.timerActive).toBe(false);
    expect(gameState.lives).toBe(2); // Assuming it decrements from 3
    expect(restartContainer.classList.contains('hidden')).toBe(false);
    expect(restartBtn.classList.contains('hidden')).toBe(false);
    expect(nextLevelBtn.classList.contains('hidden')).toBe(true);
  });

  test('HandleLevelWin does nothing if the modal is missing from the DOM', () => {
    // Ensure the modal is not in the DOM
    const existingModal = document.getElementById('nextLevelModal');
    if (existingModal) {
      document.body.removeChild(existingModal);
    }

    // Call handleLevelWin and ensure no errors are thrown
    expect(() => handleLevelWin()).not.toThrow();
  });
  
  test("lives do not go below 0 if gamrState.lives is already 0", () => {
    gameState.lives = 0; // Set lives to 0 before calling handleLevelLose
    // totalScore is kept live in sync with score during play, so it already
    // includes the level's score by the time handleLevelLose() runs.
    gameState.score = 75;
    gameState.totalScore = 200;

    const restartContainer = document.createElement('div');
    const restartBtn = document.createElement('button');
    const nextLevelBtn = document.createElement('button');
    restartContainer.classList.add('hidden');
    restartBtn.classList.add('hidden');
    nextLevelBtn.classList.remove('hidden');

    const gameOverModal = document.createElement('div');
    gameOverModal.id = 'gameOverModal';
    gameOverModal.classList.add('hidden');
    document.body.appendChild(gameOverModal);

    const gameOverFinalScore = document.createElement('div');
    gameOverFinalScore.id = 'gameOverFinalScore';
    document.body.appendChild(gameOverFinalScore);

    handleLevelLose(restartContainer, restartBtn, nextLevelBtn);

    expect(gameState.lives).toBe(0); // Lives should not go below 0
    expect(gameState.totalScore).toBe(200);
    expect(gameState.score).toBe(0);
    expect(gameOverModal.classList.contains('hidden')).toBe(false);
    expect(gameOverFinalScore.textContent).toBe('Total Score: 200');
    expect(getHighScore()).toBe(200);
  });

  test('livesDisplay is updated if present in the DOM when handleLevelLose is called', () => {
    gameState.lives = 2; // Set lives to 2 before calling handleLevelLose

    const livesDisplay = document.createElement('div');
    livesDisplay.id = 'livesDisplay';
    document.body.appendChild(livesDisplay);

    const restartContainer = document.createElement('div');
    const restartBtn = document.createElement('button');
    const nextLevelBtn = document.createElement('button');
    restartContainer.classList.add('hidden');
    restartBtn.classList.add('hidden');
    nextLevelBtn.classList.remove('hidden');

    handleLevelLose(restartContainer, restartBtn, nextLevelBtn);

    expect(livesDisplay.textContent).toBe(`❤️ Lives: ${gameState.lives}`);

    // Clean up
    document.body.removeChild(livesDisplay);
  });

  test('should not throw if nextLevelModal is not in the DOM', () => {
    // Ensure the modal is not in the DOM
    const existingModal = document.getElementById('nextLevelModal');
    if (existingModal) {
      document.body.removeChild(existingModal);
    }

    // Call handleLevelWin and ensure no errors are thrown
    expect(() => handleLevelWin()).not.toThrow();
  });

  test('final level win shows congratulations modal and not next level modal', () => {
    gameState.level = LEVELS.length; // Set to final level

    const congratsModal = document.createElement('div');
    congratsModal.id = 'congratsModal';
    congratsModal.classList.add('modal', 'hidden');
    document.body.appendChild(congratsModal);

    const nextLevelModal = document.createElement('div');
    nextLevelModal.id = 'nextLevelModal';
    nextLevelModal.classList.add('modal', 'hidden');
    document.body.appendChild(nextLevelModal);

    handleLevelWin();

    expect(congratsModal.classList.contains('hidden')).toBe(false);
    expect(nextLevelModal.classList.contains('hidden')).toBe(true);

    // Clean up
    document.body.removeChild(congratsModal);
    document.body.removeChild(nextLevelModal);  
  });
  
  test('non-final level shows next level modal and not congratulations modal', () => {
    gameState.level = 1; // Set to non-final level

    const congratsModal = document.createElement('div');
    congratsModal.id = 'congratsModal';
    congratsModal.classList.add('modal', 'hidden');
    document.body.appendChild(congratsModal);

    const nextLevelModal = document.createElement('div');
    nextLevelModal.id = 'nextLevelModal';
    nextLevelModal.classList.add('modal', 'hidden');
    document.body.appendChild(nextLevelModal);

    handleLevelWin();

    expect(congratsModal.classList.contains('hidden')).toBe(true);
    expect(nextLevelModal.classList.contains('hidden')).toBe(false);

    // Clean up
    document.body.removeChild(congratsModal);
    document.body.removeChild(nextLevelModal);
  });

  test('confirm next level button stays hidden for final level path', () => {
    gameState.level = LEVELS.length; // Set to final level

    const confirmNextLevelBtn = document.createElement('button');
    confirmNextLevelBtn.id = 'confirmNextLevelBtn';
    confirmNextLevelBtn.classList.add('hidden');
    document.body.appendChild(confirmNextLevelBtn);

    handleLevelWin();

    expect(confirmNextLevelBtn.classList.contains('hidden')).toBe(true);

    // Clean up
    document.body.removeChild(confirmNextLevelBtn); 
  });

  test('handelLevelLose shows game over modal when lives reach 0', () => {
    gameState.lives = 1; // Set lives to 1 before calling handleLevelLose

    const gameOverModal = document.createElement('div');
    gameOverModal.id = 'gameOverModal';
    gameOverModal.classList.add('hidden');
    document.body.appendChild(gameOverModal);

    const restartContainer = document.createElement('div');
    const restartBtn = document.createElement('button');
    const nextLevelBtn = document.createElement('button');
    restartContainer.classList.add('hidden');
    restartBtn.classList.add('hidden');
    nextLevelBtn.classList.remove('hidden');

    handleLevelLose(restartContainer, restartBtn, nextLevelBtn);

    expect(gameOverModal.classList.contains('hidden')).toBe(false);

    // Clean up
    document.body.removeChild(gameOverModal);
  });

  test('handelLevelWin updates total score and resets current score', () => {
    gameState.level = LEVELS.length; // Set to final level
    // totalScore is kept live in sync with score during play, so it already
    // includes the level's score by the time handleLevelWin() runs.
    gameState.score = 150;
    gameState.totalScore = 350;

    const congratsModal = document.createElement('div');
    congratsModal.id = 'congratsModal';
    congratsModal.classList.add('modal', 'hidden');
    document.body.appendChild(congratsModal);

    const congratsFinalScore = document.createElement('div');
    congratsFinalScore.id = 'congratsFinalScore';
    document.body.appendChild(congratsFinalScore);

    handleLevelWin();

    expect(gameState.totalScore).toBe(350);
    expect(gameState.score).toBe(0);
    expect(congratsFinalScore.textContent).toBe('Total Score: 350');

    // Clean up
    document.body.removeChild(congratsModal);
    document.body.removeChild(congratsFinalScore);
  });
  describe('new best score', () => {
    const setUpResultModals = () => {
      document.body.innerHTML = `
        <div id="sr-announcer"></div>
        <div id="gameOverModal" class="modal hidden">
          <p id="gameOverFinalScore"></p>
          <p id="gameOverNewBest" class="new-best hidden">New best score!</p>
        </div>
        <div id="congratsModal" class="modal hidden">
          <p id="congratsFinalScore"></p>
          <p id="congratsNewBest" class="new-best hidden">New best score!</p>
        </div>`;
    };
    const announced = () => {
      jest.advanceTimersByTime(60);
      return document.getElementById('sr-announcer').textContent;
    };
    const isHidden = (id) => document.getElementById(id).classList.contains('hidden');

    beforeEach(() => {
      jest.useFakeTimers();
      setUpResultModals();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('game over shows and announces a new best score', () => {
      gameState.lives = 1;
      gameState.totalScore = 1240;

      handleLevelLose(null, null, null);

      expect(isHidden('gameOverNewBest')).toBe(false);
      expect(announced()).toBe(`Game over. New best score: 1,240!`);
    });

    test('game over hides the new best line when the score does not beat the best', () => {
      localStorage.setItem('musicalMatchSaga', JSON.stringify({ highScore: 2000 }));
      gameState.lives = 1;
      gameState.totalScore = 1240;

      handleLevelLose(null, null, null);

      expect(isHidden('gameOverNewBest')).toBe(true);
      expect(announced()).toBe(`Game over. You've run out of lives. Total score: 1,240.`);
    });

    test('game over hides the line again when an earlier result had shown it', () => {
      gameState.lives = 1;
      gameState.totalScore = 1240;
      handleLevelLose(null, null, null);
      expect(isHidden('gameOverNewBest')).toBe(false);

      gameState.levelComplete = false;
      gameState.lives = 1;
      gameState.totalScore = 300;
      handleLevelLose(null, null, null);

      expect(isHidden('gameOverNewBest')).toBe(true);
    });

    test('a score of zero is never a new best', () => {
      gameState.lives = 1;
      gameState.totalScore = 0;

      handleLevelLose(null, null, null);

      expect(isHidden('gameOverNewBest')).toBe(true);
    });

    test('finishing the last level shows and announces a new best score', () => {
      gameState.level = LEVELS.length;
      gameState.totalScore = 5400;

      handleLevelWin();

      expect(isHidden('congratsNewBest')).toBe(false);
      expect(announced()).toBe(`Congratulations! You completed all levels. New best score: 5,400!`);
    });

    test('finishing the last level hides the new best line when the score does not beat the best', () => {
      localStorage.setItem('musicalMatchSaga', JSON.stringify({ highScore: 9000 }));
      gameState.level = LEVELS.length;
      gameState.totalScore = 5400;

      handleLevelWin();

      expect(isHidden('congratsNewBest')).toBe(true);
      expect(announced()).toBe(`Congratulations! You completed all levels with a total score of 5,400.`);
    });

    test('a level that is not the last never shows the new best line', () => {
      document.body.insertAdjacentHTML('beforeend', '<div id="nextLevelModal" class="modal hidden"></div>');
      gameState.level = 1;
      gameState.totalScore = 800;

      handleLevelWin();

      expect(isHidden('congratsNewBest')).toBe(true);
      expect(isHidden('gameOverNewBest')).toBe(true);
    });
  });
});
