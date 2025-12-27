import { Game } from './game';
import './style.css';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const game = new Game(canvas);

game.start();
