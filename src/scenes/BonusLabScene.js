import { CHARACTERS } from '../characters.js';
import { OpponentsLabScene } from './OpponentsLabScene.js';

// The Opponents lab's bench for the riders who aren't on the ladder (BONUS OPP. on the Labs
// screen, or ?lab=bonusopp): Jeff, the password riders, and anyone added to characters.js
// without a ladderId.
export class BonusLabScene extends OpponentsLabScene {
  constructor() {
    super('BonusLab', { title: 'BONUS OPP. LAB', riders: CHARACTERS.filter((c) => !c.ladderId) });
  }
}
