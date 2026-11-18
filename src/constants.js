// Centralised constants for the game
export const BOARD_SIZE = 7;
export const SYMBOLS = ['🎵', '🎹', '🎻', '🎷', '🎺', '🥁'];
export const INITIAL_LIVES = 5;
export const MOVE_BONUS = 20; // points per move left when a level is won
export const TIME_BONUS = 2; // points per second left when a level is won

export const SYMBOL_TO_CLASS = {
  '🎻': 'cell-violin',
  '🎹': 'cell-piano',
  '🎺': 'cell-trumpet',
  '🥁': 'cell-drum',
  '🎷': 'cell-saxophone',
  '🎵': 'cell-musicalnote'
};
