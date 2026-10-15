import { SCORE, LADDER_ORDER, MATCH, DIFFICULTIES, PICKUPS } from '../config.js';
import { formatScore as pts, rungMultiplier } from '../score.js';
import { PagesScene } from './PagesScene.js';

const years = Object.values(DIFFICULTIES).map((d) => d.year);
const { small: { amount: small }, big: { amount: big } } = PICKUPS.kinds;

const PAGES = [
  [
    {
      title: 'YOUR SCORE',
      lines: [
        '1 Player only. Each run up the ladder builds one score, shown at the top of the screen.',
        `Higher rungs pay more: everything you score is x1 against the first rider, x${rungMultiplier(1)} against the second, and so on up to x${rungMultiplier(LADDER_ORDER.length - 1)} against the boss.`,
      ],
    },
    {
      title: 'HITS & DEFENSE',
      lines: [
        `HI punch ${pts(SCORE.hit.high)}    MID kick ${pts(SCORE.hit.mid)}    LOW kick ${pts(SCORE.hit.low)}`,
        `LOOSE GRIP (a LOW kick while they punch) ${pts(SCORE.hit.looseGrip)}`,
        `DUCK under a punch ${pts(SCORE.duck)}    DODGE ${pts(SCORE.dodge)}    STOMP ${pts(SCORE.stomp)}`,
      ],
    },
  ],
  [
    {
      title: 'ON THE RIVER',
      lines: [
        `AIR ${pts(SCORE.air)}    BIG AIR ${pts(SCORE.bigAir)}`,
        `Health kits: ${pts(SCORE.kitPerPoint)} for each point they give back (${pts(small * SCORE.kitPerPoint)} for a +${small} kit, ${pts(big * SCORE.kitPerPoint)} for a +${big}).`,
      ],
    },
    {
      title: 'WINNING',
      lines: [
        `Round win ${pts(SCORE.roundWin)}, plus up to ${pts(SCORE.leftover)} more for the balance and tube air you have left.`,
        `Match win ${pts(SCORE.matchWin)}, and ${pts(SCORE.sweep)} more for a ${MATCH.roundsToWin}-0 sweep.`,
        `Beat the boss to become champion: ${pts(SCORE.champion)}.`,
      ],
    },
  ],
  [
    {
      title: 'LOSING',
      lines: [
        'Lose a match and the run is over. Climb back on to try again from the same rung, starting from 0.',
      ],
    },
    {
      title: 'HIGH SCORES',
      lines: [
        `The top ${SCORE.tableSize} runs in ${years.join(' and ')} are saved in this browser, and kept up to date after every match, so quitting partway still counts.`,
      ],
    },
  ],
];

export class ScoringScene extends PagesScene {
  constructor() {
    super('Scoring', 'HOW SCORING WORKS', PAGES, 'HighScores');
  }
}
