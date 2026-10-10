// What riders shout at each other at the start of every round. Add, remove or edit
// lines freely; any rider can say any line.
export const TAUNTS = [
  "This'll be over before the first wake!",
  'My little sister fights better than you!',
  'Try not to cry when I knock you off!',
  'Hope you brought a towel.',
  "You're about to drink half this river.",
  "Hold on tight. It won't help.",
  "I've seen pool noodles with more fight.",
  'Say goodbye to your tube!',
  'Hope you can swim!',
  "Last one dry wins. That's me.",
  "You're going in the drink!",
  "I'll send you back to shore the hard way.",
  'Enjoy the view from the bottom of the river.',
  'The fish are waiting for you.',
  'Is that a tube or a pool floatie?',
  "Don't worry, the boat will come back for you. Eventually.",
  'I eat wakes for breakfast.',
  'You lean like a lawn chair.',
  'Ready to taste the river?',
  "I'm gonna pop you like a balloon.",
  "Hope your life jacket's on tight.",
  "You couldn't knock a duck off a log.",
  "Wave to the shore. You're about to visit it.",
  "I've been waiting all summer for this.",
  'Nice tube. It looks better without you on it.',
];

let pile = [];

// Deals lines in shuffled order, so nothing repeats until every line has been used.
export function nextTaunt() {
  if (pile.length === 0) {
    pile = [...TAUNTS];
    for (let i = pile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pile[i], pile[j]] = [pile[j], pile[i]];
    }
  }
  return pile.pop();
}
