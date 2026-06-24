# Lichtfall - Story Specification

## 1. Overview
This document outlines the entire narrative flow of *Lichtfall*, currently implemented up to Node 14. The story follows Licht the Hero, who was betrayed 34 years after defeating the First King of Helheim, Satan. Resurrected by a Goddess and equipped with mechanical limbs by Merlin Ironwright, Licht seeks revenge against his former party members, starting with Vibarian.

---

## 2. Locations
*   **The Void:** A metaphysical space where the Goddess of Life speaks with Licht, and where his 34-year gap/betrayal exposition occurs.
*   **Eins City:** The starting city where Licht registers at the Adventurer's Guild and prepares for his journey.
*   **Helheim's Sanctuary:** The destination of Act 1, where a martial arts tournament is taking place and Vibarian is suspected to be.

---

## 3. Story Nodes & Flow

### Prologue
**Node 1: Prologue: The End and The Beginning**
*   **Location:** The Void
*   **Narrative:** Introduces Licht Miller, who died from a lightning strike. The Goddess of Life offers him a chance to save the world and defeat Satan in exchange for a joyful life with his mother.
*   **Choices:**
    *   *Accept the Goddess's offer* → Proceeds to Node 2

**Node 2: 34 Years Later: The Betrayal**
*   **Location:** The Void
*   **Narrative:** 34 years later, Licht's party defeated Satan but betrayed him. They extracted his powers and the Royal Family executed him. He awakens to a mechanical worker.
*   **Choices:**
    *   *Explain your plan* → Proceeds to Node 3
    *   *Say nothing and brood* → Proceeds to Node 3

**Node 3: Merlin Ironwright**
*   **Location:** The Void
*   **Narrative:** Licht declares his plan for revenge. The worker introduces herself as Merlin Ironwright, leader of a Hero's Fanatic organization. She spent 4 years building limbs suitable for his massive Mana and Strength.
*   **Choices:**
    *   *Begin the journey* → Proceeds to Node 4

---

### Act 1: Eins City
**Node 4: Act 1: Eins City**
*   **Location:** Eins City
*   **Narrative:** 4 years have passed. A war rages between 4 countries. Licht travels to Eins City under a fake 18-year-old identity to get a licensed adventurer ID. He meets Sherry at the guild.
*   **Choices:**
    *   *Enter the Guild* → Proceeds to Node 5

**Node 5: Grandmaster Oser**
*   **Location:** Eins City
*   **Narrative:** Licht meets Grandmaster Oser, an immortal Ice Mage and Doom Threat from a planet similar to Earth. Oser wants to test Licht's strength.
*   **Choices:**
    *   *[COMBAT] Fight Grandmaster Oser* → Triggers Combat. Victory proceeds to Node 6.

**Node 6: The Manalith**
*   **Location:** Eins City
*   **Narrative:** Oser notes Licht is still strong despite lacking limbs. Oser gives Licht a 3-Star Artifact: [Manalith], capable of storing 2 months of mana. Licht is promoted to Rank B.
*   **Choices:**
    *   *Equip the Manalith...* → Proceeds to Node 7 (Grants item: Manalith)

**Node 7: The Next Destination**
*   **Location:** Eins City
*   **Narrative:** Merlin states the next destination is Helheim's Sanctuary for an annual martial arts tournament. Registration lasts 6 days. They investigate Vibarian's agenda.
*   **Choices:**
    *   *Listen to Merlin* → Proceeds to Node 8

**Node 8: Vibarian's Crimes**
*   **Location:** Eins City
*   **Narrative:** Merlin lists Vibarian's crimes (murder, kidnapping, slave-trading, drugs). The authorities ignore it due to his power. Merlin wonders what power Vibarian stole from Licht.
*   **Choices:**
    *   *Explain the Stolen Spell* → Proceeds to Node 9

**Node 9: The 40% Boost**
*   **Location:** Eins City
*   **Narrative:** Licht explains it's a body strengthening spell that gives a 40% boost to every physical aspect, scaling with mana output.
*   **Choices:**
    *   *Make a request* → Proceeds to Node 10

**Node 10: A Tall Order**
*   **Location:** Eins City
*   **Narrative:** Licht asks Merlin to craft three different mech-limbs for his right arm and legs in 3 days. Merlin is in disbelief.
*   **Choices:**
    *   *Wait for the limbs...* → Proceeds to Node 11 (Grants items: Iron Scrap x1, Mana Crystal Shard x1)

**Node 11: Preparing for the Journey**
*   **Location:** Eins City
*   **Narrative:** The limbs are crafted. The player is instructed to open the 'World Map' to travel to Helheim's Sanctuary.
*   **Choices:**
    *   *None.* (Player must use the Map Navigation UI to travel, which updates the backend session current node to Node 12).

---

### Act 1: The Road to Helheim
**Node 12: On the Road to Helheim**
*   **Location:** Helheim's Sanctuary (En Route)
*   **Narrative:** Leaving Eins City behind. While crossing the Varkrath borders, Licht is ambushed.
*   **Choices:**
    *   *[COMBAT] Fight Mechanical Beast* → Triggers Combat. Victory proceeds to Node 13.

**Node 13: Victory over the Beast**
*   **Location:** Helheim's Sanctuary (En Route)
*   **Narrative:** The beast is defeated. Licht gathers scraps. The destination is on the horizon.
*   **Choices:**
    *   *Continue the journey* → Proceeds to Node 14 (Grants item: Iron Scrap x1)

**Node 14: Helheim's Sanctuary**
*   **Location:** Helheim's Sanctuary
*   **Narrative:** Licht arrives. The tournament is underway. It is time to find Vibarian. [End of Current Demo]
*   **Choices:**
    *   *None.* (End of current content).

---

## 4. Encounters & Combat
*   **Grandmaster Oser:** (Node 5 → Node 6). 150 HP. Magic/Ice attacker.
*   **Mechanical Beast:** (Node 12 → Node 13). 80 HP. Physical attacker.

---

## 5. Items & Consequences
*   **Node 6 (Equip the Manalith):** Grants `Manalith` (Torso Equipment, +20 Mana Boost).
*   **Node 10 (Wait for the limbs):** Grants `Iron Scrap` and `Mana Crystal Shard`. These are intended to be used in the workshop to craft the `Mech Arm Prototype`.
*   **Node 13 (Continue the journey):** Grants `Iron Scrap` upon defeating the beast.

---

## 6. Resolved Design Decisions
*   **Narrative Structure:** The story will remain strictly linear for now to complete the main plotline. Multiple endings are planned for a later phase.
*   **Travel System:** Map travel blocking progression is confirmed. Players *must* use the World Map UI to travel to specific locations to advance the story nodes.
*   **Side Quests:** Side quests will be optional but rewarding. They will be integrated via manual map navigation (exploring sub-areas) rather than strictly linear story nodes.
*   **Crafting Tutorial:** The crafting bottleneck at Node 10 is an intentional "Forced Craft" tutorial to ensure the player understands the workshop system before proceeding.
*   **UI Progression (Tab Unlocking):** Navigation tabs (Inventory, Map, Quests, etc.) will be disabled at the start of the game and unlock progressively as the player reaches specific story milestones.
*   **Combat Flow:** Combat will be a mix of Turn-based and RNG (e.g., speed dictates initiative, evasion, critical hits, and status ailment chances).
*   **Combat RNG Stats Visibility:** Speed, Critical Hit Chance, and Evasion will be fully visible to the player in the Character Tab UI.
*   **Soul Cores (Stolen Powers):** The "Infinity Stone" mechanic will be tracked in a new UI tab called "Soul Cores". Players can use multiple at once, but doing so invokes a massive, potentially lethal penalty (e.g., Soul Fracture / Overload).

---

## 7. Act 1: The Tournament (Nodes 15 - 23)
Based on your feedback to make the tournament longer and more dramatic, here is the updated narrative flow up to Act 2:

**Node 15: Helheim Market (Free Roam Hub)**
*   **Narrative:** Before heading to the arena, Licht detours through the bustling Helheim Market. It serves as an introduction to free-roam zones where side quests and item gathering can occur.
*   **Choices:** *Head to the Arena*

**Node 16: The Qualifiers**
*   **Narrative:** Licht enters the arena under his alias. He effortlessly clears the battle royale qualifiers. The crowd dubs him the "Rookie Cyborg".
*   **Choices:** *Enter the Bracket*

**Node 17: Quarter-Finals - Tavian Cross**
*   **Narrative:** Licht faces Tavian Cross, a warrior whose flawless execution and reaction speed give him a 70% evasion rate. After being defeated, Tavian reminisces that Licht fights similarly to the Hero who once saved his hometown.
*   **Choices:** *[COMBAT] Fight Tavian Cross*

**Node 18: Intermission & Gathering**
*   **Narrative:** While waiting for the semi-finals, Licht gathers materials for his next limb upgrade. He watches Vibarian brutally defeat a warrior named Rook Halberd by a thread.
*   **Choices:** *Prepare for Semi-Finals*

**Node 19: Semi-Finals - Lyra Voss**
*   **Narrative:** Licht faces Lyra Voss, an assassin from Lysandria. Through telepathy, she reveals she is an old ally of the Hero Party who worked in the shadows. She throws the match to make her own assassination job easier.
*   **Choices:** *[COMBAT] Fight Lyra Voss*

**Node 20: The Final Match - Vibarian**
*   **Narrative:** The finals. Vibarian steps into the ring, arrogant. He activates the stolen 40% boost spell. Licht realizes Vibarian blackmailed Rook Halberd by taking his wife and brother hostage. Licht swears to kill him.
*   **Choices:** *Taunt Vibarian*

**Node 21: The Fatal Flaw**
*   **Narrative:** Licht reveals his identity. He explains the flaw: The spell scales with mana output, but if forced beyond a certain limit without a Hero's natural mana circuits, it overloads and destroys the user's body from the inside. Licht goads Vibarian into using 100% of his power.
*   **Choices:** *[COMBAT] Defeat Vibarian*

**Node 22: Reclaiming the Power**
*   **Narrative:** Vibarian's body breaks down during the fight. Licht stands over him, enacting his revenge, and reclaims the "40% Boost Spell".
*   **Consequence:** Licht gains a permanent passive strength/health boost. 
*   **Choices:** *Leave the Arena*

**Node 23: Act 2 - The Holy Kingdom**
*   **Location:** Alfheim
*   **Narrative:** Merlin contacts Licht. The next target is identified: **Elysia the Saintess**. She stole Licht's "Aura of Restoration" (Healing Magic) and used it to trick the Holy Kingdom of Alfheim into worshipping her as a living miracle. Licht sets his sights on Alfheim's capital, Luminis.
*   **Choices:** *Prepare for travel*

### Act 2: The Holy Kingdom of Alfheim
**Node 24: The Road to Alfheim**
*   **Location:** Alfheim (En Route)
*   **Narrative:** Traveling to the Holy Kingdom. Merlin briefs Licht on the Paladin forces and Elysia's absolute authority over the kingdom's religion. She warns him that his mechanical augmentations will be viewed as "heresy."
*   **Choices:** *Approach the Border*

**Node 25: The Border Checkpoint**
*   **Location:** Alfheim Border
*   **Narrative:** The border is heavily guarded by the Paladin Vanguard. They demand exorbitant entry fees and sneer at Licht's mechanical limbs.
*   **Choices:** *[COMBAT] Fight Paladin Vanguard*

**Node 26: The City of Light, Luminis**
*   **Location:** Luminis
*   **Narrative:** Entering the grand capital. The streets are pristine, but there is an eerie, cult-like devotion to the Saintess among the citizens.
*   **Choices:** *Head to the Grand Cathedral*

**Node 27: The Grand Cathedral**
*   **Location:** Luminis
*   **Narrative:** Licht arrives at the cathedral square just as Elysia is making a public appearance.
*   **Choices:** *Observe the Sermon*

**Node 28: A False Miracle**
*   **Location:** Luminis
*   **Narrative:** Elysia uses Licht's stolen "Aura of Restoration" to heal a line of sick citizens. The crowd weeps in adoration. Licht grips his mechanical fist in disgust as he watches his power being used to build a cult.
*   **Choices:** *Retreat and Plan*

**Node 29: The Underground**
*   **Location:** Luminis Slums
*   **Narrative:** Licht is intercepted by a cloaked figure who recognizes he doesn't blindly worship the Saintess. They offer him a path to the Resistance.
*   **Choices:** *Follow the Figure*

**Node 30: The Resistance Hideout**
*   **Location:** Luminis Sewers
*   **Narrative:** Licht meets the local resistance, led by a disgraced former Paladin. They share a common goal: dethroning the false Saintess.
*   **Choices:** *Speak with the Leader*

**Node 31: Kaelen the Oathbreaker**
*   **Location:** Luminis Sewers
*   **Narrative:** The leader introduces himself as Kaelen. He explains that Elysia is practically invulnerable due to her 'Martyr's Retribution' ability, which reflects all damage back as radiant energy. Punching her directly would be suicide.
*   **Choices:** *Explore the Camp*

**Node 32: Resistance Base Camp**
*   **Location:** Luminis Sewers
*   **Narrative:** The underground camp is a safe haven. Kaelen suggests raiding the Holy Forge nearby to get materials capable of piercing Elysia's barrier and upgrading Licht's limbs.
*   **Choices:** *Raid the Holy Forge*

**Node 33: Infiltrating the Holy Forge**
*   **Location:** Holy Forge
*   **Narrative:** Licht sneaks into the Paladin's armory. The heat from the glowing white-hot forges contrasts with the pristine coldness of the city above.
*   **Choices:** *Approach the Anvil*

**Node 34: The Forge Guardian**
*   **Location:** Holy Forge
*   **Narrative:** As Licht reaches the central anvil, a massive animated suit of Paladin armor blocks his path. Its eyes glow with righteous fury.
*   **Choices:** *[COMBAT] Fight Forge Guardian*

**Node 35: The Radiant Upgrade**
*   **Location:** Holy Forge
*   **Narrative:** The guardian crumbles into molten slag. Licht extracts a 'Radiant Ingot' from the forge. This should be enough to reinforce his limbs against holy magic.
*   **Choices:** *Return to Camp*

**Node 36: The Grand Festival**
*   **Location:** Luminis Capital
*   **Narrative:** The day of Elysia's grand sermon arrives. The Resistance causes explosions on the city outskirts. A desperate father begs Licht to save his daughter from Elysia's "miracles". Licht breaches the gate and is confronted by two Integrity Knights.
*   **Choices:** *[COMBAT] Fight Integrity Knights*

**Node 37: Confronting Ambrosia**
*   **Location:** Grand Cathedral
*   **Narrative:** Licht confronts Elysia (Ambrosia). She tries to justify her tyrannical actions as righteous. Licht erupts in fury, declaring even demons have greater reasoning. 
*   **Choices:** *[COMBAT] Phase 1: Fight Elysia*

**Node 38: The Black Smoke of Satan**
*   **Location:** Grand Cathedral
*   **Narrative:** Elysia is defeated, but black smoke billows from her body. Licht realizes the truth: Satan wasn't fully killed 34 years ago. The First King of Helheim manifests through her!
*   **Choices:** *[COMBAT] Phase 2: Fight Satan's Manifestation*

**Node 39: A Tragic End**
*   **Location:** Grand Cathedral
*   **Narrative:** The manifestation is destroyed. A dying Elysia regains her true self, thanking Licht for saving her. She gifts him the "Vow of The Bleeding Heart" ring before her body disintegrates, triggering massive explosions that level the Cathedral. [ACT 2 END]
*   **Choices:** *Escape the Ruins*

### Act 3: Shadows of the Past
**Node 40: The Traitors' Council**
*   **Location:** Unknown
*   **Narrative:** The remaining traitors discuss Elysia's death. Satan's spirit reveals he survived by contracting with a mage named Theonnix. They note Licht's mechanical limbs are draining his mana rapidly. Their next move involves someone named Carlossus.
*   **Choices:** *[End of Current Demo]*

---

## 8. Act 2 & Act 3 World Building
*   **Elysia the Saintess:** Confirmed as the Act 2 villain. Her use of stolen holy healing magic creates an excellent dynamic where Licht must fight a villain who is beloved and seemingly untouchable by the public.
*   **Satan's Survival:** The ultimate twist. Satan survived the Hero Party's attack 34 years ago by making a contract with Theonnix, manipulating the traitors from the shadows.
*   **Free Roam Zones:** Established! Locations like the "Helheim Market" will act as hubs where the player can choose to engage in side quests, visit merchants, or continue the main storyline.

---

## 9. Combat Mechanics & Status Ailments Design
Adding status ailments is an excellent idea to increase combat depth! Here is a breakdown of your proposed ailments and a few additional mechanics that would fit *Lichtfall* perfectly:

### Standard Ailments (Approved)
*   **Bleeding:** Deals minor physical damage over time (DoT). Stacks up to 3 times.
*   **Freeze / Chill:** Chill reduces enemy speed/evasion. Freeze causes them to skip a turn entirely. (Oser the Ice Mage could definitely inflict this).
*   **Poison:** Deals magic damage over time. Heals less effective while active.
*   **Burn:** High damage over time for a short duration.

### Heroic Class Items (Late Game)
*   **Cinderband of The Berserker:** +40% Physical Attributes, continuously reduces Mana.
*   **Vow of The Bleeding Heart:** +20% Healing received, survives one fatal blow, reduces passive healing and drains Sanity during Boss fights.

### Recommended Additions (Thematic to Lichtfall)
*   **Stun / Paralysis:** Similar to Freeze, but physical/electric based. Good for mechanical enemies.
*   **Overheat (Mech Specific):** A unique mechanic for Licht. If he uses too many high-power physical skills in a row, his mechanical limbs *Overheat*. This could deal self-damage or lock him out of certain skills for a turn, forcing the player to balance their aggression.
*   **Elemental Resistances:** Since we have Ice, Poison, and Burn, giving enemies specific weaknesses (e.g., Mechanical Beasts are weak to Lightning/Overload but immune to Poison) will make the player utilize different items and skills!

Recommended Additions Answer: I WANT ALL THESE ADDED!

---

## 10. The Stolen Powers System (The "Infinity Stone" Mechanic)
To accommodate the "Infinity Stone" style progression, we will introduce a **Stolen Powers System**. 
Every time Licht defeats a former traitor, he reclaims a core piece of his original soul/power. These are not just simple stat buffs, but game-changing combat mechanics:
*   **UI Placement:** The "Soul Cores" management tab will be located in the main navigation menu, specifically positioned below "Mech Limbs" and above "Workshop".

*   **Power 1 (From Vibarian - The Brute): The Colossus Core (40% Body Boost)**
    *   *Effect:* Grants a unique combat command called **"Overclock"**. When activated, Licht's physical attacks deal massive damage and shatter enemy armor for 3 turns, but his **Overheat** meter fills twice as fast. If he overheats while Overclocked, he suffers a self-inflicted Stun.
*   **Power 2 (From Elysia - The Saintess): Martyr’s Retribution (Aura of Restoration)**
    *   *Effect:* Absorbs all damage taken during a turn, converting that pain into a massive blast of blinding dark-radiant energy. True healing requires suffering.

---

## 11. Development Activity List & Roadmap

### Phase 1: Core Narrative & Basic UI (Completed)
- [x] Establish backend models (StoryNode, Choice, Consequence, Inventory, Equipment).
- [x] Implement linear narrative up to Act 1 (Node 14).
- [x] Create base UI with Typewriter effect, Map Navigation, and basic Inventory/Equipment.
- [x] Implement save/load system (Cloud & Local).

### Phase 2: The Tournament & Act 1 Conclusion (Completed)
- [x] Expand Act 1 story nodes to Node 23 (Vibarian boss fight & Act 2 setup).
- [x] Introduce "Free Roam" concept (Helheim Market).
- [x] Add progressive Tab Unlocking system based on story nodes.

### Phase 3: Advanced Combat & Mechanics (In Progress)
- [ ] Refactor Python Combat Models to support Turn-Based flow and RNG stats (Evasion, Speed, Crit).
- [ ] Implement Status Ailments (Bleeding, Freeze, Poison, Burn, Stun, Overheat).
- [ ] Add HTML/CSS for the new "Soul Cores" tab in the frontend.
- [ ] Connect "Colossus Core (Overclock)" logic to the combat UI.

### Phase 4: Act 2 Content (Planned)
- [x] Write Act 2 Narrative Nodes (Journey to Alfheim, encounters, infiltration).
- [ ] Implement Free Roam side quests with actual backend progression/rewards.
- [ ] Boss Fight: Elysia the Saintess and "Martyr's Retribution" mechanic.

---

## 12. New Questions & Clarifications

1. **Mech Limb "Weight" Mechanic:** Since we are making Speed and Evasion visible stats, should we introduce a "Weight" stat to equipment? (e.g., Equipping a heavy, high-damage Mech Arm lowers Licht's Speed and Evasion, forcing players to choose between being a fast rogue or a slow bruiser).
ANSWER: YES!

2. **Soul Core Activation Cost:** In combat, activating a Soul Core command (like *Overclock* or *Martyr's Retribution*) should feel like a heavy decision. Should using a Soul Core cost a massive amount of MP, or should it be "free" but instantly max out his Overheat/Sanity gauges as a penalty?
ANSWER: YES!

BUG LIST: System is not forcing Player to Open Inventory, then Mech Limbs, equip the Manalith in Torso.
CHANGE SUGGESTION: Also, items should have stats, and shows a description on what they are and what they do! In Mech Limbs, there should be a Stat List and Description of Bonuses on equipped items.

3. **Soul Core Activation Cost Specifics:** You confirmed activating a Soul Core should be a heavy decision. Which of these options do you prefer?
    *   **A)** A high, one-time MP cost to activate.
    *   **B)** A "free" cast that has a severe side-effect, like instantly maxing out the **Overheat** gauge or causing a large **Sanity** drop.
    *   **C)** A combination of both (e.g., a moderate MP cost *and* it fills the Overheat gauge).
ANSWER: [C]

4. **Overheat Penalty:** For the new "Overheat" mechanic, what should the specific penalty be when the gauge is maxed out?
    *   **A)** A single turn of **Stun**, where Licht cannot act.
    *   **B)** A "Damaged" status that temporarily reduces Licht's STR stat for a few turns.
    *   **C)** A "Cooldown" period where all physical mech skills are disabled until the gauge resets.
ANSWER: [B]

SUGGESTION: After defeating the mechanical beast, add a dialouge revolving around making a temporary mech limb while he waits for the New Limbs.

5. **Act 3 Target - Carlossus:** Node 40 mentions the traitors are watching Licht and their next move involves "Carlossus." Is Carlossus a location, a person, or a monster? What should his/its combat gimmick be?
ANSWER: **Carlossus is a Colossal Moving Fortress/Golem.** It is a superweapon from the ancient war, piloted by Theonnix. The traitors plan to march it across the Wastelands to wipe out Eins City and Merlin's faction. 
*Combat Gimmick:* Multi-stage Boss. Carlossus has near-infinite defense. Licht must target and destroy its individual weapons (arms/cannons) before the Core opens. The "Overclock" mechanic from the Colossus Core will be vital here to burst down armor plating.

6. **Vow of The Bleeding Heart Revive Mechanic:** This ring lets the user survive one fatal blow. Should this be implemented as an auto-trigger in combat (e.g., if HP reaches 0 while equipped, it instantly heals Licht for 30% of his max HP, once per battle)?
ANSWER: **Yes. Auto-Trigger in Combat.** If Licht's HP hits 0 while the ring is equipped, he instantly revives with 30% of his Max HP. However, the ring will inflict a permanent "Sanity Bleed" status effect for the remainder of the battle, dealing damage every turn as a toll for cheating death.

### Act 3: Shadows of the Past (Upcoming)
- **Node 41:** Return to Eins City to warn Merlin.
- **Node 42:** Upgrading the Mech Limbs to handle "Soul Core" output.
- **Node 43:** The March of Carlossus (Wasteland Intercept).