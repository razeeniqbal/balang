# BALANG — Product Requirements Document

**Version:** 1.1  
**Status:** Product Direction Locked for Prototype  
**Product:** BALANG  
**Tagline:** *Agak. Risiko. Menang.*  
**Platform:** Responsive Web Application / PWA  
**Primary Experience:** Social multiplayer prediction party game

---

## 1. Product Overview

BALANG is a fast, social Malaysian probability and prediction game built around a shared virtual **balang** filled with familiar Malaysian food tokens.

Players know the starting contents of the balang. As tokens are drawn, they must continuously reassess probability, keep or discard increasingly unlikely predictions, lock their final choices, and optionally activate **KAW-KAW** to increase both risk and reward.

BALANG should feel like a modern Malaysian tabletop game brought into a polished digital party-game experience.

The product is built around one unified BALANG identity rather than separate selectable themes or festival collections.

---

## 2. Product Principles

BALANG must be:

- Easy to understand within the first round.
- Strategic without requiring advanced mathematics.
- Social and entertaining when played with friends.
- Visually Malaysian without belonging to only one ethnicity, state, festival, or celebration.
- Fast enough to encourage repeated games.
- Clear enough to play comfortably on mobile.
- Driven by probability, observation, risk management, and player decisions.
- Visually premium rather than childish or hyper-casual.

### Core Design Rule

> The balang is the game.

Players should always understand:

1. What was originally inside the balang.
2. What has already been drawn.
3. What is likely to remain.
4. What they predicted.
5. What they stand to gain or lose.

---

## 3. Product Direction Change — v1.1

### Removed: Selectable Balang Themes / Collections

BALANG v1.1 does **not** include a gameplay feature for selecting different themed balang collections.

The following concepts are removed from the core product:

- Theme selection screen.
- `Pilih Koleksi Balang` as a required pre-game step.
- Malaysia Mix / Kopitiam / Mamak / Pasar Malam as separate gameplay modes.
- Festival-specific Raya, CNY, or Deepavali game collections.
- Theme-specific probability rules.
- Theme-specific token distributions.
- Unlocking new gameplay themes.
- Separate jars that alter game mechanics.

Previously generated collection-selection artwork remains useful as visual exploration but is **not a required implementation screen**.

### New Direction: One BALANG Universe

BALANG uses one expanding Malaysian food-token library.

Individual matches dynamically select a subset of eligible food tokens from this shared library.

This keeps every match visually varied without forcing players to choose a theme before playing.

---

## 4. Target Experience

A player should be able to:

1. Open BALANG.
2. Create or join a room.
3. See who is playing.
4. Start the match.
5. See the foods selected for the round and the initial balang composition.
6. Receive prediction cards.
7. Watch tokens leave the balang.
8. Update their reasoning as probabilities change.
9. Discard predictions at required decision points.
10. Reach their final predictions.
11. Decide whether to use KAW-KAW.
12. See the round resolution immediately.
13. React to other players' results.
14. Continue through three rounds.
15. View the final leaderboard and personal statistics.
16. Play again or share the result.

---

# 5. Core Game Model

## 5.1 Match Structure

A standard BALANG match contains:

- **2–6 players**
- **3 rounds**
- **25 starting tokens per round**
- **5 active food types per round**
- **15 draws per round**
- **10 tokens remaining after all draws**

Exact balancing values should remain configurable in the game engine rather than hard-coded into UI components.

---

## 5.2 Food Pool

BALANG maintains a canonical Malaysian food-token library.

Examples may include:

- Kuih lapis
- Kuih bahulu
- Onde-onde / klepon-style token where culturally appropriate to naming
- Chocolate kuih/cake cube
- Kuih cincin
- Waffle/biscuit-style token
- Traditional biscuits
- Other clearly distinguishable Malaysian snacks and kuih

### Food Token Requirements

Every food token must have:

- Unique ID.
- Canonical display name.
- Distinct silhouette.
- Distinct primary colour/value profile.
- Production-ready transparent asset.
- Small-size readable version.
- Accessible text label where needed.

Similar orange kuih must not rely on shape subtleties alone. They must remain distinguishable at mobile-card size.

---

## 5.3 Round Generation

At the beginning of each round, the game engine:

1. Selects 5 eligible food types from the global food pool.
2. Generates a valid 25-token distribution.
3. Shows the starting composition to all players.
4. Generates the predetermined/randomized draw sequence according to the game rules.
5. Generates prediction options.

The server/game authority must own the actual token sequence to prevent clients from knowing future draws.

---

# 6. Prediction System

Prediction cards represent possible outcomes or remaining-token conditions.

Each prediction card contains:

- Food token.
- Prediction condition.
- Potential reward.
- Potential penalty.
- Selected/unselected state.
- Locked state when applicable.

Example visual reward levels established by the concept assets include values such as:

- +100
- +250
- +500
- +750
- +1,000

Penalties increase alongside potential reward.

Final values must be controlled through balancing configuration.

---

## 6.1 Prediction Reduction Flow

The intended decision funnel is:

**6 → 4 → 3 → 2 final prediction cards**

(Changed from 6 → 5 → 3 → 2 on 2026-09-27: the biggest cut now comes first, when players know the least.)

At defined draw milestones, players must discard prediction cards they believe are becoming less likely.

This creates the core tension:

> The player receives more information over time, but simultaneously loses the ability to keep every possible outcome.

---

## 6.2 Discard Action

Malay UI terminology:

**BUANG KAD**

The player selects the required number of prediction cards to discard.

The UI must clearly show:

- How many cards must be discarded.
- Which card is selected.
- Remaining card count.
- Confirmation action.
- Current balang composition.

Discarding is irreversible after confirmation unless a specific casual-game undo rule is introduced later.

---

## 6.3 Lock Action

At the appropriate stage, players lock their remaining predictions.

Malay UI terminology:

**KUNCI PILIHAN** or a final terminology chosen during copy lock.

After locking:

- Prediction cards cannot be changed.
- The interface visually indicates the locked state.
- The player waits for remaining draws/resolution.

---

# 7. KAW-KAW

KAW-KAW is BALANG's signature risk mechanic.

It allows a player to increase the reward associated with a final prediction while also increasing the corresponding loss if the prediction fails.

Conceptually:

> **Gandakan risiko, gandakan ganjaran.**

KAW-KAW must feel exciting but optional.

It must never be necessary simply to remain competitive.

### KAW-KAW UI

The interaction should clearly communicate:

- Current potential reward.
- Current potential penalty.
- Modified reward after KAW-KAW.
- Modified penalty after KAW-KAW.
- Confirmation state.

No ambiguous gambling-style monetary representation should be used. BALANG scores are game points, not real-world currency.

---

# 8. Draw System

The balang is the primary visual focus of gameplay.

Players trigger or observe draws through a tactile interaction such as:

**KACAU — Untuk Ambil Token**

The draw sequence should include:

1. Anticipation state.
2. Balang interaction/animation.
3. Token reveal.
4. Token exits the balang.
5. Remaining composition updates.
6. Draw counter updates.
7. Probability implications become visible through the changed state.

The game should avoid excessive animation duration. Repeated draws must remain satisfying without slowing the match.

---

# 9. Information Model During Gameplay

The gameplay screen must expose the following information without overwhelming the player:

### Match

- Round number.
- Draws completed.
- Tokens remaining.

### Players

- Avatar.
- Name.
- Rank/current score where appropriate.
- Reaction/status.

### Balang

- Current visible jar.
- Current token composition.
- Counts for each food type.

### Player Decision Area

- Prediction cards.
- Selected card state.
- Discard action.
- Lock state.
- KAW-KAW action.

The balang and current composition are more important than decorative environmental elements.

---

# 10. Round Resolution

At the end of a round, predictions resolve individually.

Each prediction should clearly show:

- Predicted food.
- Correct / incorrect result.
- Base score change.
- KAW-KAW effect where applicable.
- Total round score.

Example states:

- **BETUL** — positive result.
- **SALAH** — negative result.

The result must be understandable without requiring the player to reconstruct the previous round mentally.

---

# 11. Social Reactions

BALANG is intended to feel like people playing around the same table.

Players may send lightweight reactions during safe gameplay moments.

Examples:

- KAW-KAW!
- Wahh!
- Alamak...
- Hmm...
- Wehhh!
- Nice!

Reactions must not obstruct prediction information or important controls.

---

# 12. Final Results

After Round 3, show the final leaderboard.

Required information:

- Final ranking.
- Player avatar.
- Player name.
- Final score.
- Winner presentation.

The winning player receives a stronger celebratory treatment including crown/laurel/celebration states.

### Personal Match Statistics

Potential statistics include:

- Prediction accuracy.
- Best prediction.
- Biggest miss.
- KAW-KAW success.
- Longest streak.

These statistics should be derived from actual gameplay events rather than decorative/random values.

---

# 13. Share Result

Players can generate a shareable BALANG result card after a completed match.

The card may contain:

- BALANG logo.
- Player avatar.
- Player name.
- Final position.
- Final score.
- Prediction accuracy.
- Best prediction.
- KAW-KAW statistic.
- Longest streak.
- Selected decorative BALANG food elements.

The social card must not require the entire gameplay UI to be captured as a screenshot.

It should be rendered from structured match data using a dedicated share-card layout.

---

# 14. Lobby

The lobby is intentionally simplified in v1.1.

## Required

- BALANG identity.
- Room code/invite mechanism.
- Player list.
- Host indicator.
- Ready/join state if required.
- Player capacity.
- Start Game action for host.
- Basic game configuration if exposed.

## Removed

There is no mandatory theme/collection selection.

Players should not need to browse jars before starting a match.

### Desired Flow

**Create/Join Room → Players Join → Start Game**

The round itself determines the food combination.

---

# 15. Game Modes

## MVP

### Classic

The canonical 3-round BALANG experience.

### Quick Play

Optional if development capacity allows. Uses a shorter configuration while retaining the same fundamental rules.

## Post-MVP Possibilities

- Private custom rules.
- Tournament mode.
- Team mode.
- Daily challenge.
- Local pass-and-play.

These are not required for the first production prototype.

---

# 16. Progression

BALANG should not depend on collection/theme unlocking for progression.

Potential future progression systems may include:

- Player level.
- Achievements.
- Match history.
- Statistical milestones.
- Avatar cosmetics.
- Profile frames.
- Titles.
- Non-gameplay jar cosmetics.

Cosmetics must not alter probability or provide competitive advantages.

---

# 17. Visual Identity

## Brand

**BALANG**  
**Agak. Risiko. Menang.**

### Visual Characteristics

- Premium illustrated Malaysian board-game aesthetic.
- Contemporary Malaysian food illustration.
- Soft 2D / 2.5D dimensionality.
- Deep green structural UI.
- Warm cream information surfaces.
- Yellow/gold primary actions and rewards.
- Red used for risk, discard, penalties, and the iconic balang lid.
- Warm wooden/shared-table environmental context.
- Botanical accents used selectively.

### Avoid

- Generic mobile-game visual language.
- Excessive gradients/glow.
- Casino presentation.
- Cyberpunk aesthetics.
- Festival-exclusive identity.
- Childish/kawaii treatment.
- Photorealistic food mixed with illustrated UI.
- Excessive environmental clutter behind critical information.

---

# 18. Canonical BALANG Object

The transparent glass balang with the distinctive red lid is the primary product object.

It should remain recognizable across:

- Logo.
- Gameplay.
- Loading states.
- Marketing.
- App icon/symbol system.
- Share cards.

Different gameplay themes do not replace the canonical jar.

Future cosmetic jars may alter appearance only and must preserve readability of the contents.

---

# 19. Logo System

The established logo family includes:

1. Primary BALANG wordmark.
2. BALANG + `Agak. Risiko. Menang.` lockup.
3. Standalone balang/B symbol.
4. Application icon.
5. Monochrome logo.
6. Favicon/small symbol.

Final production logos should be recreated as clean vector assets rather than relying directly on raster concept-board output.

---

# 20. Production Asset Strategy

Generated concept screens are **visual references**, not final application screenshots to embed into the product.

UI must be constructed from reusable application components.

## Required Production Asset Families

### Food Tokens

- Transparent isolated PNG/WebP/SVG where appropriate.
- Consistent viewing angle.
- Consistent lighting.
- Consistent scale.

### Balang

- Empty jar.
- Lid.
- Filled/partial states where technically useful.
- Interaction states.

### Prediction Cards

Use component backgrounds rather than cards containing baked-in numbers or labels.

Required states:

- Default.
- Hover/focus.
- Selected.
- Discard candidate.
- Locked.
- Correct.
- Incorrect.
- KAW-KAW.
- Disabled.

### UI Components

- Primary button.
- Secondary button.
- Danger button.
- Disabled button.
- Panels.
- Counters.
- Progress bars.
- Player chips.
- Score badges.
- Rank badges.
- Tooltips.
- Dialogs.

### Player Assets

- Avatar frames.
- Crown/rank indicators.
- Reaction bubbles.
- Status indicators.

### Effects

- Confetti.
- Correct-result particles.
- Incorrect-result particles.
- KAW-KAW flame treatment.
- Selection feedback.

### Environments

Backgrounds should be produced independently from UI so the interface remains responsive and editable.

---

# 21. Dynamic Text Rule

Do **not** bake dynamic application information into image assets.

The following must be rendered by the application:

- Player names.
- Scores.
- Token counts.
- Round numbers.
- Draw numbers.
- Prediction values.
- Penalties.
- Buttons labels where practical.
- Statistics.
- Leaderboards.
- Progress bars.

This ensures localization, responsiveness, accessibility, balancing changes, and dynamic gameplay remain possible.

---

# 22. Language Strategy

BALANG's personality should primarily use natural Malaysian Malay terminology, while avoiding inconsistent switching between English and Malay within the same hierarchy.

A final terminology dictionary must be locked before production.

Candidate canonical terminology:

| Concept | Preferred UI |
|---|---|
| Start Game | Mula Game |
| Round | Pusingan / Round — final copy decision required |
| Draw | Cabutan |
| Tokens Remaining | Token Tinggal |
| Discard Card | Buang Kad |
| Lock Choice | Kunci Pilihan |
| Correct | Betul |
| Incorrect | Salah |
| Play Again | Main Lagi |
| Final Results | Keputusan Akhir |
| Leaderboard | Kedudukan |

Natural Malaysian usage is more important than literal translation.

---

# 23. Responsive Design

## Mobile

Mobile is a first-class gameplay target.

Priority order:

1. Round/draw state.
2. Balang.
3. Remaining composition.
4. Prediction cards.
5. Decision actions.
6. Player status.
7. Decorative environment.

The application should avoid simply shrinking the desktop layout.

## Desktop / Tablet

Larger displays may expose:

- More simultaneous player information.
- Larger balang visualization.
- Persistent composition panel.
- Expanded reactions.
- Richer environment.

Game state and rules must remain identical across screen sizes.

---

# 24. Multiplayer Requirements

For online multiplayer, the authoritative game state should include:

- Room ID.
- Match ID.
- Host.
- Players.
- Round.
- Starting token distribution.
- Draw sequence.
- Draw index.
- Current remaining composition.
- Player prediction cards.
- Discard history.
- Locked predictions.
- KAW-KAW state.
- Score events.
- Total scores.
- Reactions.
- Match completion state.

Sensitive future draw information must not be exposed prematurely to clients.

---

# 25. State Model

Suggested high-level state machine:

```text
HOME
  ↓
LOBBY
  ↓
ROUND_SETUP
  ↓
ROUND_REVEAL
  ↓
DRAW_PHASE
  ↓
DECISION_PHASE
  ↕
DRAW_PHASE
  ↓
FINAL_PREDICTION
  ↓
LOCKED
  ↓
ROUND_RESOLUTION
  ↓
NEXT_ROUND
  ↓
FINAL_RESULTS
  ↓
PLAY_AGAIN / EXIT
```

KAW-KAW is a controlled sub-state of the final prediction/lock sequence rather than an independent game mode.

---

# 26. Accessibility

BALANG must not communicate game state through colour alone.

Use combinations of:

- Icon.
- Text.
- Shape.
- Border treatment.
- Colour.

Minimum considerations:

- Keyboard navigation for web.
- Visible focus states.
- Appropriate semantic labels.
- Reduced-motion option.
- Sufficient text contrast.
- Food names available as text even when represented by illustrations.
- Screen-reader labels for important game actions.

---

# 27. Audio

Optional but recommended for the polished release.

Potential sound families:

- Balang shake.
- Token draw.
- Card selection.
- Card discard.
- Lock confirmation.
- Correct prediction.
- Incorrect prediction.
- KAW-KAW activation.
- Round complete.
- Winner celebration.

Audio should support feedback rather than become essential to understanding the game.

---

# 28. Analytics

Useful events include:

```text
room_created
room_joined
match_started
round_started
token_drawn
prediction_discarded
prediction_locked
kawkaw_activated
prediction_resolved
round_completed
match_completed
play_again_clicked
share_result_clicked
match_abandoned
```

Potential balancing analytics:

- Prediction selection frequency.
- Prediction success rate.
- KAW-KAW usage rate.
- KAW-KAW success rate.
- Average round duration.
- Average decision duration.
- Drop-off by game state.
- Score distribution.

---

# 29. MVP Scope

## P0 — Required

- BALANG brand implementation.
- Responsive lobby.
- 2–6 player room model.
- Canonical balang gameplay.
- 5-food round generation.
- 25-token starting composition.
- 15-draw round.
- Prediction cards.
- Prediction reduction/discard flow.
- Final lock.
- KAW-KAW.
- Scoring.
- 3-round match.
- Round results.
- Final leaderboard.
- Play again.
- Mobile responsive gameplay.

## P1 — Strongly Desired

- Player reactions.
- Personal match statistics.
- Share-result card.
- Match history.
- Sound effects.
- Basic achievements.

## P2 — Later

- Cosmetics.
- Additional food-token library.
- Custom rooms/rules.
- Tournament mode.
- Daily challenges.
- Advanced progression.

---

# 30. Explicitly Out of Scope for MVP

- Selectable gameplay themes.
- Theme collection marketplace.
- Raya/CNY/Deepavali-specific game modes.
- Real-money wagering.
- Cash rewards.
- Pay-to-win mechanics.
- Complex player inventory.
- Large cosmetic economy.
- AI-generated food assets at runtime.
- Public competitive ranking system unless separately designed.

---

# 31. Visual References Already Established

The current BALANG concept asset set establishes reference direction for:

- Brand/logo system.
- Canonical jar.
- Food-token illustration style.
- Prediction cards.
- KAW-KAW card/action.
- Gameplay composition.
- Mobile gameplay.
- Round results.
- Final leaderboard.
- Social share result card.
- Master visual/component validation.

The previously created theme/collection-selection screen should be retained only as historical visual exploration and should **not** drive product architecture.

---

# 32. Recommended Build Order

```text
01  Lock game rules and balancing configuration
02  Lock canonical food-token names
03  Produce isolated production food assets
04  Rebuild BALANG logo as production vector assets
05  Define design tokens and typography
06  Build reusable UI component library
07  Implement deterministic local game engine
08  Implement lobby and multiplayer state
09  Implement main draw loop
10  Implement prediction/discard/lock system
11  Implement KAW-KAW
12  Implement round resolution and scoring
13  Implement final leaderboard
14  Implement responsive/mobile treatment
15  Add reactions, sound and share result
16  Playtest and rebalance
```

---

# 33. Success Criteria

BALANG succeeds when a new player can understand the objective during their first match and starts making meaningful probability-based decisions without needing to calculate formal probabilities.

The game should consistently create moments such as:

- "That token already came out too many times."
- "I don't think this prediction is safe anymore."
- "Should I throw this card away?"
- "I think this one is still inside."
- "KAW-KAW or play safe?"
- "Alamak, I should've kept that one."

Those conversations are the core BALANG experience.

---

# 34. Product Summary

BALANG v1.1 is a **single, unified Malaysian prediction party game**.

It is not a collection of separate themed mini-games.

The variety comes from:

- Different food combinations.
- Different starting distributions.
- Different draw sequences.
- Different prediction cards.
- Different player decisions.
- Different risk appetite through KAW-KAW.
- Social interaction between players.

The central loop remains:

> **Observe → Agak → Buang → Kunci → Risiko → Reveal → Menang**

And the product promise remains:

# BALANG
## Agak. Risiko. Menang.
