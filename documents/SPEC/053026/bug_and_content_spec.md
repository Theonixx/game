# Lichtfall - Bug Fixes and Content Specification
**Date:** 05/30/2026

## 1. User Interface & Responsiveness
*   **Main Page Responsiveness:** The main game screen (`mainPage.html`) needs to adapt seamlessly to different screen sizes and resolutions. We will continue using the custom CSS layout (avoiding Bootstrap) but will implement CSS media queries, flexible units (`vw`, `vh`), and flexbox/grid tweaks to ensure panels don't break on smaller screens.
*   **Mech Limbs Tab Overflow:** If an item's description or stat list is too long, it currently overflows the container. Fix this by adding `overflow-y: auto;` to the item details container.
*   **Workshop Tab Overflow:** Similar to the Mech Limbs tab, long descriptions in the Workshop currently break the UI. Implement a scrollable container for the craft item details.
*   **Character Stat Integration:** 
    *   **Left-Side Character Tab:** Must be fully connected to the backend system. Stats should dynamically update as the player progresses and equips/unequips items.
    *   **Simplify Character Stats List:** The current UI separates "Licht's True Stats" and "Mech Limb Output", which looks disconnected from the story and isn't user-friendly. We will merge and simplify these into a single, clean list showing `Base Stat + (Equip Bonus)`.
    *   **Reputation Stat:** Temporarily hide the Reputation stat from the UI to avoid confusion until a formal system is designed for it.
    *   **Right-Side Stat List:** Many stats currently display as `0` or are missing entirely. Ensure all stats (Health, Mana, Sanity, Overheat, STR, INT, DEX, Speed, Evasion, Crit) are properly pulled from the `PlayerStats` model and calculated correctly with equipment boosts.
    *   **Header UI:** Connect the currently hardcoded `Alias`, `Level`, and `Scrap` in the top-left header to the backend `PlayerStats`.

## 2. System & Backend Bugs
*   **Duplicate Manalith:** The player is currently receiving 2x Manaliths upon acquirement. The consequence logic in the backend needs to be audited to ensure it only grants 1.
*   **Settings Database Sync:** Game settings (master volume, text speed, auto-save) must be fully bidirectional. They should properly save to the `UserSettings` database table upon change, and accurately load and apply to the UI when the player logs in or refreshes.
*   **Quest System Integration:** The "Quests" tab is currently static/hardcoded. We need to implement a Quest Model in the database, tracking Active, Completed, and Failed quests, and dynamically update the UI based on the user's progress.

## 3. Story & Dialogue Adjustments
*   **"Preparing for Journey" (Node 11):** Add more narrative dialogue discussing the newly crafted Mech Arm Prototype, giving it more weight before the player sets out.
*   **"Victory over the beast" (Node 13):** The narrative text is currently empty. Add dialogue regarding the aftermath of the fight and harvesting scraps.
*   **Elysia's Soul Core (Node 39):** The player currently defeats Elysia but does not obtain her Soul Core (Martyr's Retribution). Add narrative dialogue for extracting it and a backend `Consequence` to grant the item to the player's inventory.

## 4. Forced Tutorials & Pacing
*   **Missing Mech Limbs Tutorial:** The story implies Merlin is crafting limbs, but the player never formally receives the finished product. Introduce a Forced Tutorial where Merlin hands over the limbs, and the player is required to navigate to the "Mech Limbs" tab to equip them before the story can proceed.
*   **Radiant Ingot Upgrade Tutorial:** The player defeats the Forge Guardian but isn't actually receiving the Radiant Ingot in the system. Add the backend `Consequence` to grant the item. Furthermore, add a Forced Tutorial requiring the player to use the Workshop to upgrade their limbs with the Ingot before facing the Integrity Knights.

## 5. New Concepts
*   **The "Inn" System:** 
    *   Introduce specific resting locations (Inns) available only in safe hub areas (e.g., Eins City, Helheim Market).
    *   Inns will cost a flat fee of Scrap and will fully restore HP and MP.
    *   Inns are disabled/unavailable while in hostile locations or battlefields.
*   **Natural Healing Over Time:** 
    *   Implement a passive recovery system where the player recovers HP and MP between specific story transitions. The healing amount will be manually defined based on the node's narrative (e.g., resting overnight recovers more than a short trip).
*   **EXP & Leveling System:**
    *   Introduce an Experience (EXP) and Leveling system. Players will earn EXP alongside Scrap from combat and quest rewards.
    *   Upon leveling up, players will receive 3 "Stat Points" which they can manually distribute in the Character Tab to increase their core attributes (STR, INT, DEX).
    *   **Core Scaling:** STR increases Max HP and Physical Damage. INT increases Max MP and Magic Damage.
    *   **New Stat - Base DEX:** Introduce Base DEX to handle RNG/speed attributes. DEX will directly scale Speed, Evasion, and Crit Chance.
*   **Dedicated Scrap Currency:**
    *   Separate "Scrap" (Currency) from "Iron Scrap" (Crafting Item). The Scrap currency will be displayed in the top-left header and used for Inns and other services.

## 6. Activity List & Roadmap

### Phase 1: Critical Backend Fixes
- [x] Fix Duplicate Manalith bug in `views.py` `seed_initial_data()` or `make_choice()` consequence logic.
- [x] Add Elysia's Soul Core item and the `Consequence` drop to Node 39.
- [x] Fix Radiant Ingot not being given by the Forge Guardian (Node 35) via `Consequence`.
- [x] Audit `views.py` `update_settings()` to ensure full bidirectional DB sync with the UI.

### Phase 2: UI Overhauls & Responsiveness
- [x] Implement CSS Media Queries in `mainPage.css` to make the custom grid layout flexible for smaller screens.
- [x] Fix text overflow bugs in the Mech Limbs and Workshop tab by adding `overflow-y: auto`.
- [x] Connect Left-Side Character Tab and Right-Side Stat List to the backend `PlayerStats` dynamically.
- [x] Connect Top-Left Header (Alias, Level, Scrap) to the backend.
- [x] Simplify and redesign the Character Stats List to be more user-friendly and thematic.
- [x] Hide the Reputation stat from all UI elements.
- [x] Add "+" buttons in the Character Tab for manual Stat Point distribution.

### Phase 3: Story Additions & Forced Tutorials
- [x] Update `StoryNode` 11 to include more dialogue for the Mech Arm Prototype.
- [x] Update `StoryNode` 13 to include dialogue regarding the scrap harvest after the beast fight.
- [x] Create the Forced Tutorial for receiving and equipping the first set of Mech Limbs (Add a narrative node or UI blocker until equipped).
- [x] Create the Forced Tutorial for the Radiant Ingot upgrade at the Holy Forge before facing Integrity Knights.

### Phase 4: System Expansions
- [x] Build Quest Model in Django (`models.py`) tracking Active/Completed/Failed quests.
- [ ] Implement Quest UI fetching and updating based on the new model.
- [x] Implement "Inn" resting locations in safe hubs (Eins City, Helheim Market) allowing Scrap-to-HP/MP conversion.
- [x] Implement Natural Healing logic in `make_choice()` when traveling between safe nodes.
- [x] Implement EXP, Leveling, and dedicated Scrap reward systems in the backend `PlayerStats`.

## 7. Questions & Clarifications

1. **The "Inn" System Pricing:** 
   *Answer:* Just a flat fee. With this as well, we need to add Scrap into the Reward System.
2. **Natural Healing Rate:** 
   *Answer:* This should be depending on the Story Node. There are parts of the Story where you rest overnight, some 3 days later. You decide what best fits the story.
3. **Quest Rewards & Reputation:** 
   *Answer:* Regarding Reputation points, what purpose does it serve? I suppose adding the EXP system into the Reward system would be a nice addition that improves player stats.
4. **Forced Tutorial UI Blocker:** 
   *Answer:* Completely hide the story choices until the backend verifies the item is equipped (similar to the Node 7 Manalith blocker).
5. **Scrap Currency Implementation:**
   *Answer:* The frontend currently has "Scrap: [Scrap]" hardcoded. We will use a dedicated Currency on that spot, separate from Iron Scrap inventory items.
6. **EXP & Leveling Mechanics:**
   *Answer:* Players will receive "Stat Points" to manually distribute in the Character Tab. The Character Stats List will be simplified to be more user-friendly and thematically connected to the story.
7. **Reputation Purpose:**
   *Answer:* Temporarily hide the Reputation stat from the UI to avoid confusions.
8. **Stat Point Distribution:**
   *Answer:* 3 points per level. Instead of allowing players to upgrade any stat, let's just add a Base DEX to accommodate those specific stats.
9. **Simplified Stats Layout:**
   *Answer:* Yes, use the unified layout (e.g., `STR: 15 (+45 Mech Bonus) = 60 Total`).

10. **DEX Scaling:**
    *Answer:* DEX will scale secondary attributes. To balance it with STR and INT: 1 DEX = +1 Speed, +0.5% Evasion, and +1% Crit Chance.
11. **HP/MP Scaling:**
    *Answer:* Players will not allocate points directly to HP/MP. Instead, they allocate points to STR, INT, and DEX. 
    *   1 STR = +10 Max HP and increases Physical Damage.
    *   1 INT = +10 Max MP and increases Magic Damage.