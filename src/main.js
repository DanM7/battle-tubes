import Phaser from 'phaser';
import { WIDTH, HEIGHT } from './config.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { LadderScene } from './scenes/LadderScene.js';
import { ControlsScene } from './scenes/ControlsScene.js';
import { DifficultyScene } from './scenes/DifficultyScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#0b1d2a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 4 },
  scene: [MenuScene, GameScene, LadderScene, ControlsScene, DifficultyScene],
});