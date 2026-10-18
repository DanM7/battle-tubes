# Battle Tubes

A 2-player (and 1-player ladder) tube-fighting game on the river behind Q house.

## Game data (no redeploy for balance / roster edits)

Tunable data lives in a sibling repo: [battle-tubes-data](https://github.com/DanM7/battle-tubes-data) (`../battle-tubes-data/game.json`).

- **Dev:** `npm run dev` serves that file at `/game.json`. Edit and reload.
- **Live:** the built site fetches `raw.githubusercontent.com/DanM7/battle-tubes-data/main/game.json`, so pushing data changes updates the live game without a Netlify deploy.

See that repo’s README for the file layout. Canvas size and engine code stay here; art under `public/` stays here too.

## Scripts

```bash
npm run dev         # local play (needs battle-tubes-data next to this repo)
npm run build
npm run preview
npm test            # unit + integration tests (vitest)
npm run test:watch  # vitest in watch mode
```

