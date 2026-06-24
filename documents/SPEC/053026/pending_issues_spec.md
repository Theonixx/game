# Lichtfall - Additional Mechanics & Narrative Adjustments
**Date:** 05/30/2026

## 1. EXP & Leveling System Integration
*   **Issue:** Currently, defeating enemies does not provide the player with any Experience Points (EXP). The UI and DB have the fields, but the combat resolution logic doesn't grant EXP.
*   **Solution:** 
    *   Update the backend `make_choice` combat resolution to include an `exp_reward` payload.
    *   Establish base EXP rewards for different enemies (e.g., Mechanical Beast = 50 EXP, Assassins = 100 EXP, Bosses = 500 EXP).
    *   Implement an auto-level-up check in the backend `PlayerStats`. When EXP reaches the threshold (e.g., Level * 100 EXP), increase the player's level by 1, grant 3 Stat Points, and carry over the remaining EXP.

## 2. Narrative Adjustments & Pacing
*   **Issue:** Missing dialogue on Node 11 ("Preparing for the Journey") regarding the crafting of a temporary mech limb.
*   **Solution:** Update the narrative text of Node 11. Merlin should explicitly state that the limb crafted in the Workshop is just a *Temporary Prototype* meant to allow Licht to travel and fight in the tournament without his body breaking down.
*   **Issue:** Continuation of Node 11 - When will Merlin give the *actual* Mech Limbs he crafted to Licht?
*   **Solution:** The delivery of the "True Mech Limbs" should be scheduled for Act 3 (Node 42). Yes, there will be dialogue explicitly stating that the temporary limbs are severely damaged/fried after handling the intense output of the Colossus and Martyr Cores. Merlin will then unveil the fully completed, high-output limbs.

## 3. Forced Tutorials
*   **Issue:** The game is not forcing the player into a tutorial for equipping the Soul Core of Vibarian.
*   **Solution:** Introduce a UI Blocker at Node 23 ("Act 2: The Holy Kingdom"). The choice to "Prepare for travel" should be disabled or hidden until the backend verifies that the `Colossus Core (Vibarian)` is equipped in the player's `Soul Core` slot. Add a visual hint telling the player to open the "Soul Cores" tab to bind it.

## 4. Elysia Boss Fight & Radiant Ingot
*   **Issue:** The narrative (Kaelen the Oathbreaker) states Elysia is practically invulnerable to punches due to 'Martyr's Retribution'. Additionally, the game is not properly giving/forcing the Radiant Upgrade.
*   **Solution:** 
    *   **Radiant Ingot Fix:** While Node 35 currently grants the Radiant Ingot via a `Consequence`, the player is never forced to use it.
    *   **Forced Crafting Tutorial:** Before the player can proceed past Node 36 ("The Grand Festival"), force them to open the Workshop and combine the `Radiant Ingot` with `Iron Scrap` to create `Anti-Magic Plating` (an equipable Accessory).
    *   **New Narrative Node:** Add a sub-node or dialogue immediately after crafting the `Anti-Magic Plating` explaining its specific use—how equipping it will neutralize Elysia's damage reflection.
    *   **Combat Mechanic Update:** Update the `executeTurn` combat logic in `game.js`. If the player attacks Elysia *without* the `Anti-Magic Plating` equipped, their damage should be reduced by 90%, and they should take massive recoil damage (reflect).
    *   **Anti-Magic Plating Consumption:** After the battle with Elysia, the Anti-Magic Plating will shatter due to intense holy magic. Remove it from the inventory/equipment, and add a dialogue node explicitly stating this.

---

## Activity Roadmap (Next Steps)

### Phase 5: Combat EXP & Leveling
- [ ] Define EXP values for all enemies in `game.js` `startCombat()`.
- [ ] Pass EXP value to `make_choice()` upon enemy defeat.
- [ ] Update `views.py` `make_choice()` to process EXP, level up the player, and add +3 Stat Points.

### Phase 6: Narrative & Tutorial Updates
- [ ] Update `StoryNode` 11 to include the "Temporary Prototype" dialogue.
- [ ] Add a UI blocker to `game.js` `updateUI()` for Node 23, requiring the Colossus Core to be equipped.
- [ ] Create the `Anti-Magic Plating` item and its `Recipe` in `views.py` `seed_initial_data()`.
- [ ] Add a dialogue node after crafting the Plating to explain its use.
- [ ] Add a UI blocker to `game.js` `updateUI()` for Node 36, requiring the Anti-Magic Plating to be equipped.
- [x] Implement Elysia's 'Martyr's Retribution' damage reflection logic in `game.js` `executeTurn()`.
- [ ] Implement the shattering of Anti-Magic Plating after Node 38/39 and narrative update.