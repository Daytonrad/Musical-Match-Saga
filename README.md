# Musical Match Saga

Musical Match Saga is a browser-based match-3 puzzle game with a musical twist. Instead of sweets, you swap and match musical symbols to clear the board, complete level objectives, and progress through timed challenges with limited moves and lives.

### ▶ [Play Musical Match Saga live](https://hannahro15.github.io/Musical-Match-Saga/)


![Screenshot home](images/home-screen.jpg)
![Screenshot continue](images/home-continue-screen.jpg)
![Screenshot game](images/game-screen.jpg)

---

## Table of Contents
1. [How to Play](#how-to-play)
2. [Features](#features)
3. [Getting Started](#getting-started)
4. [Technologies Used](#technologies-used)
5. [Project Structure](#project-structure)
6. [Testing](#testing)
7. [Roadmap](#roadmap)
8. [Contributing](#contributing)
9. [License](#license)
10. [Credits](#credits)

---

## How to Play

1. Click **Play Game** to start Level 1.
2. Match 3 or more of the same musical symbols by swapping adjacent tiles.
3. Complete the current level objectives before you run out of moves or time.
4. Track your progress in the HUD, which shows your level, lives, objectives, moves, score and timer.
5. If you run out of moves or time, you lose a life.
6. When all lives are lost, you are returned to the menu and can restart with 5 lives.

Drag, swipe, or tap a tile then tap an adjacent one to create matches:
- Match **3** tiles → 10 points
- Match **4** tiles → 20 points
- Match **5** tiles → 40 points

---

## Features

- Musical-themed match-3 gameplay across multiple levels, each with its own objectives
- **Continue Game** picks up where you left off, and your high score is saved
- Responsive layout for desktop and mobile
- Accessible UI: visible focus styles, ARIA roles, keyboard navigation, tap-to-select board interaction for screen readers (e.g. Android TalkBack) and keyboard users
- Pop-ups for restart, next level, game over, and congratulations

---

## Getting Started

The easiest way to play is the [live version on GitHub Pages](https://hannahro15.github.io/Musical-Match-Saga/). To run it locally instead:

1. Clone the repository:
   ```bash
   git clone https://github.com/hannahro15/Musical-Match-Saga.git
   ```
2. Start a local web server from the project folder, for example:
   ```bash
   npx serve .
   ```
   (or use the Live Server extension in VS Code)
3. Open the address it prints (e.g. `http://localhost:3000`) in your browser.

Opening `index.html` directly from your file system won't work, because the game uses JavaScript modules, which browsers block on `file://` pages.

---

## Technologies Used

- HTML5
- CSS3
- JavaScript (modular ES modules)
- [Jest](https://jestjs.io/) for unit and component testing
- [GitHub Copilot](https://github.com/features/copilot) for AI-assisted development

---

## Project Structure
```
Musical-Match-Saga/
│
├── src/                          # game code (ES modules)
│   ├── script.js                 # entry point: wires up menu buttons and starts the game
│   ├── gameController.js         # game flow: starting/continuing levels, lives, saving progress
│   ├── gameState.js              # shared game state (score, moves, objectives, selected tile)
│   ├── levels.js                 # level definitions: moves, time limits, objectives
│   ├── levelOutcomes.js          # what happens when a level is won or lost
│   ├── board.js                  # board logic: generating, finding matches, refilling, reshuffling
│   ├── boardController.js        # handles a swap: checks matches, updates score and objectives
│   ├── boardEventHandlers.js     # connects tile interactions to the board controller
│   ├── interaction.js            # drag, swipe, tap and keyboard input handling
│   ├── events.js                 # attaches input listeners to each tile
│   ├── game.js                   # core helpers: swapping tiles, adjacency, scoring
│   ├── timer.js                  # level countdown timer
│   ├── storage.js                # saves/loads high score and progress in localStorage
│   ├── ui.js                     # updates the HUD (moves, score, lives, timer, objectives)
│   ├── domElements.js            # references to page elements
│   ├── constants.js              # board size, musical symbols, starting lives
│   └── utils.js                  # show/hide helpers and screen-reader announcements
│
├── __tests__/                    # Jest tests, one or more per module in src/
│
├── styles/
│   ├── base.css                  # shared colours, fonts and layout
│   ├── home.css                  # home/menu screen
│   ├── game.css                  # game board and HUD
│   ├── modals.css                # restart, next level, game over and congratulations pop-ups
│   └── fonts/                    # self-hosted Pacifico webfont and its licence (OFL.txt)
│
├── images/                       # screenshots and app icons
├── .github/workflows/
│   ├── test.yml                  # runs the Jest tests on pushes to main and on PRs
│   └── deploy-pages.yml          # runs tests, then publishes the game to GitHub Pages
│
├── coverage/                     # generated by `npx jest --coverage`, gitignored
├── index.html                    # the game page
├── privacy.html                  # privacy policy (no data collected; progress stays on your device)
├── manifest.json                 # web app manifest (name, icons, theme colour)
├── .babelrc                      # Babel config so Jest can run ES modules
├── eslint.config.js              # linting rules
├── jest.config.js                # test configuration
├── package.json                  # dev dependencies and scripts
├── package-lock.json
├── CONTRIBUTING.md               # how to contribute
├── CODE_OF_CONDUCT.md            # community standards
├── LICENSE                       # MIT License
└── README.md
```

### How the pieces fit together

`index.html` loads `src/script.js`, which connects the menu buttons to `gameController.js`. The game controller sets up each level from `levels.js`, builds the board with `board.js`, and starts the timer. When a player swaps two tiles (through `interaction.js` and `boardEventHandlers.js`), `boardController.js` checks for matches, updates the score and objectives in `gameState.js`, and refreshes the HUD through `ui.js`. When the level ends, `levelOutcomes.js` decides what happens next, and `storage.js` saves progress so **Continue Game** can pick up where you left off.

Keeping each job in its own module makes the game easier to maintain, test and extend.

---

## Testing

This project uses [Jest](https://jestjs.io/) with `babel-jest` and the `jsdom` environment for unit and component testing. Tests live in the `__tests__` folder, one file (or more) per module.

1. Install dependencies (if not already):
   ```bash
   npm install
   ```
2. Run all tests:
   ```bash
   npx jest
   ```
3. Run with coverage:
   ```bash
   npx jest --coverage
   ```
   The HTML report is written to `coverage/lcov-report/index.html` — open it in your browser to see coverage by file and line.

As of the last full run (189 tests), project-wide statement coverage is ~97%, with the core game-flow (`gameController.js`), board-swap (`boardController.js`), and event-wiring (`boardEventHandlers.js`) modules all above 95%.

---

## Roadmap

- Improve accessibility further: a full manual/assistive-tech pass on top of the automated ARIA and contrast checks already in place.
- Continue polishing the UI with improved animation, transitions, and mobile tuning.
- Test on a wider range of real mobile devices and browsers.
- Add more levels and increase gameplay variety.
- Implement sound effects and background music.
- Gather user feedback and iterate on gameplay, feel, and usability.

---

## Contributing

Contributions are welcome, from developers, designers and players alike. Some issues, like testing the game with a screen reader or on different phones, need no coding at all.

Read the [contributing guide](CONTRIBUTING.md) to get started. By taking part, you agree to follow the [code of conduct](CODE_OF_CONDUCT.md).

---

## License

The code is licensed under the [MIT License](LICENSE).

---

## Credits

- Created and maintained by Hannah Olbrich.
- Title font: [Pacifico](https://github.com/googlefonts/Pacifico) by The Pacifico Project Authors, licensed under the [SIL Open Font License 1.1](styles/fonts/OFL.txt), not the MIT License.
- Emoji icons from [Unicode](https://unicode.org/emoji/).
- AI-assisted development with GitHub Copilot.
