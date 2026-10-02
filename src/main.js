/* Entry point: build the game, start the loop, expose a console handle. */
import { Game } from './core/Game.js';

const game = new Game();
game.init();
game.start();

window.LANTERNMOSS = game.debugHandle();
