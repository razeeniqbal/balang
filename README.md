# BALANG: Agak. Risiko. Menang.

Malaysian probability & prediction party game, built from `BALANG_PRD_v1.1.md`.
React 19 + Vite + TypeScript, no backend.

```bash
npm install
npm run dev      # http://localhost:5173 (also exposed on your LAN)
npm test         # engine tests
npm run build    # production build → dist/
```

## Pages

| Path | What |
|---|---|
| `/` | Landing page |
| `/main` | The game (invite links are `/main?room=MY-1234`) |
| `/docs` | Rules and card reference, generated from the engine config |

`vercel.json` rewrites every path to `index.html` so these work on refresh.

## How multiplayer works

- **Buat Bilik** makes the host's browser the game authority. It holds the secret
  draw order and every player's hand, and plays the bots.
- Friends **Sertai Bilik** with the room code, the invite link (`?room=MY-1234`) or the QR code.
  They connect peer-to-peer over WebRTC (PeerJS's public signalling server), and each
  guest only ever receives their own filtered view.
- If a guest drops mid-game, a bot plays their turns until they reconnect with the same browser.
- Friends can only open the game if it is served from a URL they can reach: a
  deployment (e.g. Vercel), or your PC's LAN address when you're on the same Wi-Fi.

## Layout

| Path | What |
|---|---|
| `src/engine/` | Pure game logic: `game.ts` (authority / state machine), `predictions.ts` (12 card types, evaluation, "already decided" logic), `probability.ts` (Monte Carlo pricing), `bots.ts`, `stats.ts`, `config.ts` (all balancing values) |
| `src/net/` | `host.ts` (host device: GameHost + bots + serving guests), `guest.ts`, `protocol.ts` |
| `src/ui/` | Screens, components, styles, synthesised sound, share-card renderer |
| `public/assets/` | Sprites sliced from the concept sheets. Regenerate with `npm run assets` |
| `tools/slice_assets.py` | The slicer (Python + Pillow + SciPy) |

## Balancing

Card rewards are priced from their probability at deal time (`config.ts → rewardTiers`).
Run the balance report with near-optimal bots:

```bash
BALANCE=1 npx vitest run balance --silent=false
```
