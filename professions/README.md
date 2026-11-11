# Professions (Scarred Lands crafting)

Crafting and downtime for players, separate from the town crafting of Crystal Forge.
Page: `professions.html` (players) and `professions.html?gm` (DM tab).

## Files

- `rules.js` — DCs, roll mode, weekly progress. Pure, tested.
- `recipes.js` — professions (tool, facilities, default skill) and the recipe catalogue. SRD names only.
- `model.js` — Firestore document shapes and validation. Pure, tested.
- `gathering.js` — herbalism, mining, fishing, skinning, archaeology, relics, disenchanting. Pure, tested.
- `store.js` — Firestore reads/writes, same Firebase project as the realm.
- `app.js`, `professions.css` — the page.
- `firestore.rules` — full rule set (realm + crafting).

## Setup (once)

1. Firebase → Firestore → Rules: paste `firestore.rules`, replace `YOUR_GM_UID_HERE` with the uid shown at the bottom of `professions.html?gm` (same uid as the realm publisher if you use the same browser).
2. Open `professions.html?gm`, create the characters, and press **Κωδικός παίκτη** for each one. Give each player their code.
3. Players open `professions.html` and enter the code.

## A downtime

1. DM: **Άνοιγμα downtime** with N weeks.
2. Players propose projects; DM approves them.
3. Each week: player rolls in the app or types the d20 from the table. DM approves or rejects.
4. DM can add NPC crafters to any project and roll for them.

## Gathering

- DM sets region levels (1–20 or endgame) in the DM tab. DC and resource values follow the book table.
- Players record a travel stage, a skinning, a dig, a relic assembly or a disenchant. Empty d20 field = roll in the app.
- Every result is pending; on approval it is added to the character (resources in GP, fragments, relics).
- Crafting checks the book's minimum Proficiency Bonus per rarity (Common +2 … Legendary +6).

## Tests

```
node --test professions/rules.test.js professions/model.test.js professions/gathering.test.js
```
