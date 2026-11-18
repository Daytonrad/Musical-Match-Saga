// timer.js - Handles timer logic for the game
import { updateTimerDisplay } from './ui.js';

export function startTimer(gameState, timerDisplay, handleLevelLose) {
    clearInterval(gameState.timerInterval);

    gameState.timerInterval = setInterval(() => {
        if (!gameState.timerActive) return;

        gameState.timer = Math.max(0, gameState.timer - 1);
        updateTimerDisplay(timerDisplay, gameState.timer);

        if (gameState.timer === 0) {
            clearInterval(gameState.timerInterval);
            gameState.timerActive = false;

            // Only trigger lose if moves are still above 0 and level not complete

            if (gameState.movesLeft > 0 && !gameState.levelComplete && typeof handleLevelLose === 'function') {
                handleLevelLose();
            }
        }
    }, 1000);
}

export function stopTimer(gameState) {
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = null;
}

// Pauses the countdown while a modal is open. Returns whether it was running.
export function pauseTimerForModal(gameState) {
    const wasRunning = !gameState.levelComplete && gameState.timerActive;
    if (wasRunning) gameState.timerActive = false;
    return wasRunning;
}

export function resumeTimerAfterModal(gameState, wasRunning) {
    if (wasRunning && !gameState.levelComplete) gameState.timerActive = true;
}
