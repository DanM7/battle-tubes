import Phaser from 'phaser';
import { WIDTH, HEIGHT } from './config.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { LadderScene } from './scenes/LadderScene.js';
import { ControlsScene } from './scenes/ControlsScene.js';
import { HighScoresScene } from './scenes/HighScoresScene.js';
import { ScoringScene } from './scenes/ScoringScene.js';
import { AboutScene } from './scenes/AboutScene.js';
import { DifficultyScene } from './scenes/DifficultyScene.js';
import { PlayerSelectScene } from './scenes/PlayerSelectScene.js';
import { PasswordScene } from './scenes/PasswordScene.js';
import { LabsScene } from './scenes/LabsScene.js';
import { TubeLabScene } from './scenes/TubeLabScene.js';
import { SizeLabScene } from './scenes/SizeLabScene.js';
import { AttackLabScene } from './scenes/AttackLabScene.js';
import { CreateLabScene } from './scenes/CreateLabScene.js';
import { OpponentsLabScene } from './scenes/OpponentsLabScene.js';
import { BonusLabScene } from './scenes/BonusLabScene.js';
import { MusicLabScene } from './scenes/MusicLabScene.js';
import { SfxLabScene } from './scenes/SfxLabScene.js';
import { PasswordLabScene } from './scenes/PasswordLabScene.js';
import { CharImportLabScene } from './scenes/CharImportLabScene.js';
import { installAudioUnlockListeners } from './audio.js';

// Imported only after loadGameData() so module-level constants (VIEW, RIDER, …) see filled data.
export function startGame() {
  installAudioUnlockListeners();
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: '#0b1d2a',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      // The whole page container, not just the canvas, so DOM elements (the rider name box) stay visible.
      fullscreenTarget: 'game',
    },
    input: { activePointers: 4 },
    dom: { createContainer: true }, // the rider name box on the rider select screen
    scene: [
      MenuScene,
      GameScene,
      LadderScene,
      ControlsScene,
      HighScoresScene,
      ScoringScene,
      AboutScene,
      DifficultyScene,
      PlayerSelectScene,
      PasswordScene,
      LabsScene,
      TubeLabScene,
      SizeLabScene,
      AttackLabScene,
      CreateLabScene,
      OpponentsLabScene,
      BonusLabScene,
      MusicLabScene,
      SfxLabScene,
      PasswordLabScene,
      CharImportLabScene,
    ],
  });
}
