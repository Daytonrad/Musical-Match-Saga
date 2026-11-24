// boardController.trySwap.test.js - Covers trySwap's actual swap/match/
// resolve flow, which boardController.test.js's guard-clause tests don't
// reach. game.js (swapCellContents, scoreForMatch), ui.js, and gameState.js
// are left real so the score/objective bookkeeping is genuinely exercised;
// board.js, levels.js, events.js, boardEventHandlers.js, gameController.js,
// and levelOutcomes.js are mocked to isolate boardController's own
// orchestration from the rest of the board mechanics.

jest.mock('../src/board.js', () => ({
  findMatches: jest.fn(),
  dropAndRefill: jest.fn(),
  hasPossibleMoves: jest.fn(() => true),
  getSafeSymbol: jest.fn(),
  reshuffleBoard: jest.fn(),
  updateCellClass: jest.fn(),
}));

jest.mock('../src/levels.js', () => ({
  getLevelConfig: jest.fn(),
}));

jest.mock('../src/events.js', () => ({
  wireUpCellEvents: jest.fn(),
}));

jest.mock('../src/boardEventHandlers.js', () => ({
  boardEventHandlers: {
    onDragStart: jest.fn(),
    onDrop: jest.fn(),
    onTouchStart: jest.fn(),
    onTouchEnd: jest.fn(),
    onActivate: jest.fn(),
  },
}));

jest.mock('../src/gameController.js', () => ({
  autoSaveProgress: jest.fn(),
}));

jest.mock('../src/levelOutcomes.js', () => ({
  handleLevelWin: jest.fn(),
  handleLevelLose: jest.fn(),
}));

import * as boardMock from '../src/board.js';
import * as levelsMock from '../src/levels.js';
import * as levelOutcomesMock from '../src/levelOutcomes.js';
import { autoSaveProgress } from '../src/gameController.js';
import { trySwap, setBoardControllerDeps } from '../src/boardController.js';
import { gameState, setSelectedCell } from '../src/gameState.js';
import { startTimer, stopTimer } from '../src/timer.js';

const LEVEL_CONFIG = {
  objectives: [{ symbol: '🎻', label: 'violin', count: 5 }],
};

function makeCell(symbol) {
  const cell = document.createElement('div');
  cell.classList.add('cell');
  cell.textContent = symbol;
  return cell;
}

describe('trySwap', () => {
  let gameBoard, sourceCell, targetCell;

  beforeEach(() => {
    jest.clearAllMocks();
    boardMock.findMatches.mockReset();
    boardMock.hasPossibleMoves.mockReturnValue(true);
    levelsMock.getLevelConfig.mockReturnValue(LEVEL_CONFIG);

    gameBoard = document.createElement('div');
    sourceCell = makeCell('🎵');
    targetCell = makeCell('🎻');
    gameBoard.append(sourceCell, targetCell);

    setBoardControllerDeps({
      gameBoard,
      movesDisplay: document.createElement('div'),
      scoreDisplay: document.createElement('div'),
      totalScoreDisplay: document.createElement('div'),
    });

    Object.assign(gameState, {
      isResolving: false,
      levelComplete: false,
      timerActive: true,
      timerMode: 'normal',
      movesLeft: 5,
      timer: 30,
      level: 1,
      score: 0,
      totalScore: 0,
    });
    delete gameState.violinLeft;
  });

  test.each([0, -1])('does not swap or score when movesLeft is %i', async moves => {
    gameState.movesLeft = moves;
    const group = [sourceCell, targetCell, makeCell('🎻')];
    boardMock.findMatches.mockReturnValueOnce([group]).mockReturnValueOnce([group]).mockReturnValueOnce([]);

    await trySwap(sourceCell, targetCell);

    expect(sourceCell.textContent).toBe('🎵');
    expect(targetCell.textContent).toBe('🎻');
    expect(boardMock.findMatches).not.toHaveBeenCalled();
    expect(gameState.score).toBe(0);
    expect(gameState.totalScore).toBe(0);
    expect(gameState.movesLeft).toBe(moves);
    expect(autoSaveProgress).not.toHaveBeenCalled();
    expect(levelOutcomesMock.handleLevelWin).not.toHaveBeenCalled();
    expect(levelOutcomesMock.handleLevelLose).not.toHaveBeenCalled();
    expect(gameState.isResolving).toBe(false);
  });

  test('clears the selected tile, including a stale copy, when a swap starts', async () => {
    const staleCopy = makeCell('🎶');
    staleCopy.classList.add('selected');
    gameBoard.append(staleCopy);
    setSelectedCell(sourceCell);
    sourceCell.classList.add('selected');
    boardMock.findMatches.mockReturnValueOnce([]);

    await trySwap(sourceCell, targetCell);

    expect(gameState.selectedCell).toBeNull();
    expect(gameBoard.querySelectorAll('.selected').length).toBe(0);
  });

  test('reverts the swap and does nothing else when it creates no match', async () => {
    boardMock.findMatches.mockReturnValueOnce([]); // swapAndCheckMatch's check

    await trySwap(sourceCell, targetCell);

    expect(sourceCell.textContent).toBe('🎵');
    expect(targetCell.textContent).toBe('🎻');
    expect(gameState.movesLeft).toBe(5);
    expect(gameState.isResolving).toBe(false);
    expect(autoSaveProgress).not.toHaveBeenCalled();
  });

  test('resolves a match: scores it, updates objectives, saves, and clears isResolving', async () => {
    // 1st call: swapAndCheckMatch's post-swap check (must include source/target).
    // 2nd call: resolveAllMatchesAndDrop's initial read of the same matched state.
    // 3rd call: the re-check after the match is cleared and the board refilled.
    const group = [sourceCell, targetCell, makeCell('🎻')];
    boardMock.findMatches
      .mockReturnValueOnce([group])
      .mockReturnValueOnce([group])
      .mockReturnValueOnce([]);

    await trySwap(sourceCell, targetCell);

    // One valid move spent on the swap itself.
    expect(gameState.movesLeft).toBe(4);
    // 3-cell match = 10 points (game.js scoreForMatch), no combo (single wave, single group).
    expect(gameState.score).toBe(10);
    expect(gameState.totalScore).toBe(10);
    // Only 2 of the 3 matched cells actually carry the objective's symbol
    // ('🎻'); sourceCell was swapped to '🎻' as part of the match itself.
    expect(gameState.violinLeft).toBe(3);
    expect(boardMock.dropAndRefill).toHaveBeenCalled();
    expect(boardMock.hasPossibleMoves).toHaveBeenCalled();
    expect(autoSaveProgress).toHaveBeenCalled();
    expect(levelOutcomesMock.handleLevelWin).not.toHaveBeenCalled();
    expect(gameState.isResolving).toBe(false);
  });

  test('does nothing when already resolving, level complete, or the timer is inactive', async () => {
    gameState.isResolving = true;
    await trySwap(sourceCell, targetCell);
    expect(boardMock.findMatches).not.toHaveBeenCalled();

    gameState.isResolving = false;
    gameState.levelComplete = true;
    await trySwap(sourceCell, targetCell);
    expect(boardMock.findMatches).not.toHaveBeenCalled();

    gameState.levelComplete = false;
    gameState.timerActive = false;
    await trySwap(sourceCell, targetCell);
    expect(boardMock.findMatches).not.toHaveBeenCalled();
  });

  test('with no timer, running out of moves still loses the level', async () => {
    gameState.timerMode = 'off';
    gameState.timer = 0;
    gameState.movesLeft = 1;
    const group = [sourceCell, targetCell, makeCell('🎻')];
    boardMock.findMatches
      .mockReturnValueOnce([group])
      .mockReturnValueOnce([group])
      .mockReturnValueOnce([]);

    await trySwap(sourceCell, targetCell);

    expect(gameState.movesLeft).toBe(0);
    expect(levelOutcomesMock.handleLevelLose).toHaveBeenCalled();
  });

  test('calls handleLevelWin when all objectives reach zero', async () => {
    levelsMock.getLevelConfig.mockReturnValue({
      objectives: [{ symbol: '🎻', label: 'violin', count: 1 }],
    });

    const group = [sourceCell, targetCell, makeCell('🎹')];
    boardMock.findMatches
      .mockReturnValueOnce([group])
      .mockReturnValueOnce([group])
      .mockReturnValueOnce([]);

    await trySwap(sourceCell, targetCell);
    await Promise.resolve();

    expect(levelOutcomesMock.handleLevelWin).toHaveBeenCalled();
    expect(levelOutcomesMock.handleLevelLose).not.toHaveBeenCalled();
    expect(gameState.isResolving).toBe(false);
  });

  test('calls handleLevelLose when moves reach zero without a win', async () => {
    document.body.innerHTML = `
      <div id="restartLevelModal"></div>
      <button id="confirmRestartBtn"></button>
      <button id="confirmNextLevelBtn"></button>
    `;

    Object.assign(gameState, {
      movesLeft: 1,
      timer: 30,
    });

    levelsMock.getLevelConfig.mockReturnValue({
      objectives: [{ symbol: '🎻', label: 'violin', count: 10 }],
    });

    const group = [sourceCell, targetCell, makeCell('🎹')];
    boardMock.findMatches
      .mockReturnValueOnce([group])
      .mockReturnValueOnce([group])
      .mockReturnValueOnce([]);

    await trySwap(sourceCell, targetCell);

    expect(gameState.movesLeft).toBe(0);
    expect(levelOutcomesMock.handleLevelLose).toHaveBeenCalled();
    expect(levelOutcomesMock.handleLevelWin).not.toHaveBeenCalled();
    expect(gameState.isResolving).toBe(false);
  });

  test('reshuffles when no possible moves remain after refill', async () => {
    boardMock.hasPossibleMoves.mockReturnValue(false);

    levelsMock.getLevelConfig.mockReturnValue({
      objectives: [{ symbol: '🎻', label: 'violin', count: 10 }],
    });

    const group = [sourceCell, targetCell, makeCell('🎹')];
    boardMock.findMatches
      .mockReturnValueOnce([group])
      .mockReturnValueOnce([group])
      .mockReturnValueOnce([]);

    await trySwap(sourceCell, targetCell);

    expect(boardMock.reshuffleBoard).toHaveBeenCalled();
    expect(gameState.isResolving).toBe(false);
  });

  describe('a move started before the deadline', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      boardMock.findMatches.mockReset();
      boardMock.hasPossibleMoves.mockReturnValue(true);
      gameState.timer = 1;
      gameState.lives = 3;
      levelOutcomesMock.handleLevelWin.mockImplementation(() => {
        gameState.levelComplete = true;
        gameState.timerActive = false;
        stopTimer(gameState);
      });
      levelOutcomesMock.handleLevelLose.mockImplementation(() => {
        gameState.levelComplete = true;
        gameState.timerActive = false;
        gameState.lives--;
        stopTimer(gameState);
      });
    });

    afterEach(() => {
      stopTimer(gameState);
      levelOutcomesMock.handleLevelWin.mockReset();
      levelOutcomesMock.handleLevelLose.mockReset();
      jest.useRealTimers();
    });

    function queueMatch(count) {
      levelsMock.getLevelConfig.mockReturnValue({
        objectives: [{ symbol: '🎻', label: 'violin', count }],
      });
      const group = [sourceCell, targetCell, makeCell('🎻')];
      boardMock.findMatches
        .mockReturnValueOnce([group])
        .mockReturnValueOnce([group])
        .mockReturnValueOnce([]);
    }

    test.each([
      ['swap validation', 850],
      ['match clearing', 780],
      ['the win animation', 550],
    ])('wins exactly once when time expires during %s', async (_phase, delay) => {
      queueMatch(1);
      startTimer(gameState, null, levelOutcomesMock.handleLevelLose);
      await jest.advanceTimersByTimeAsync(delay);

      const move = trySwap(sourceCell, targetCell);
      await jest.advanceTimersByTimeAsync(1000 - delay);
      expect(gameState.timer).toBe(0);
      expect(levelOutcomesMock.handleLevelLose).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(1000);
      await move;

      expect(levelOutcomesMock.handleLevelWin).toHaveBeenCalledTimes(1);
      expect(levelOutcomesMock.handleLevelLose).not.toHaveBeenCalled();
      expect(gameState.lives).toBe(3);
      expect(gameState.isResolving).toBe(false);
    });

    test.each([
      [5, 850], [5, 780], [1, 850], [1, 780],
    ])('loses exactly once with %i initial moves and a %ims start delay', async (moves, delay) => {
      queueMatch(10);
      gameState.movesLeft = moves;
      startTimer(gameState, null, levelOutcomesMock.handleLevelLose);
      await jest.advanceTimersByTimeAsync(delay);

      const move = trySwap(sourceCell, targetCell);
      await jest.advanceTimersByTimeAsync(1000 - delay);
      expect(levelOutcomesMock.handleLevelLose).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(1000);
      await move;
      await jest.advanceTimersByTimeAsync(3000);

      expect(levelOutcomesMock.handleLevelLose).toHaveBeenCalledTimes(1);
      expect(levelOutcomesMock.handleLevelWin).not.toHaveBeenCalled();
      expect(gameState.lives).toBe(2);
      expect(gameState.levelComplete).toBe(true);
      expect(gameState.isResolving).toBe(false);
    });

    test('reverts an invalid swap before applying the deferred timeout loss', async () => {
      boardMock.findMatches.mockReturnValueOnce([]);
      startTimer(gameState, null, levelOutcomesMock.handleLevelLose);
      await jest.advanceTimersByTimeAsync(850);
      const move = trySwap(sourceCell, targetCell);
      await jest.advanceTimersByTimeAsync(150);
      expect(levelOutcomesMock.handleLevelLose).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(100);
      await move;

      expect(sourceCell.textContent).toBe('🎵');
      expect(targetCell.textContent).toBe('🎻');
      expect(gameState.movesLeft).toBe(5);
      expect(levelOutcomesMock.handleLevelLose).toHaveBeenCalledTimes(1);
      expect(levelOutcomesMock.handleLevelWin).not.toHaveBeenCalled();
      expect(gameState.isResolving).toBe(false);
    });

    test.each([100, 200, 300])('stops pending work if the level ends externally after %ims', async delay => {
      queueMatch(1);
      const move = trySwap(sourceCell, targetCell);
      await jest.advanceTimersByTimeAsync(delay);
      gameState.levelComplete = true;
      await jest.advanceTimersByTimeAsync(1000);
      await move;

      expect(levelOutcomesMock.handleLevelWin).not.toHaveBeenCalled();
      expect(levelOutcomesMock.handleLevelLose).not.toHaveBeenCalled();
      expect(gameState.isResolving).toBe(false);
      if (delay < 260) {
        expect(gameState.score).toBe(0);
        expect(autoSaveProgress).not.toHaveBeenCalled();
        expect(boardMock.dropAndRefill).not.toHaveBeenCalled();
      }
    });
  });
});
