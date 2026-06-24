import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login as django_login
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import GameSession, PlayerStats, StoryNode, Choice, Consequence, PlayerChoice, Location, Inventory, Item, Equipment, Recipe, SaveSlot, UserSettings, Quest, PlayerQuest

User = get_user_model()

# --- Manual Serialization Helpers ---
def ensure_quests(session):
    for q in Quest.objects.all():
        if not PlayerQuest.objects.filter(session=session, quest=q).exists():
            status = 'active'
            if q.key == "main" and session.current_node and session.current_node.id >= 6:
                status = 'completed'
            PlayerQuest.objects.create(session=session, quest=q, status=status)

def serialize_game_session(session):
    ensure_quests(session)
    stats = getattr(session, 'stats', None)
    node = session.current_node
    
    choices = []
    if node:
        for choice in node.choices.all():
            choices.append({
                'id': choice.id,
                'choice_text': choice.choice_text,
                'next_node': choice.next_node_id
            })
        
    inventory_list = []
    for inv in session.inventory.all():
        inventory_list.append({
            'id': inv.id,
            'item': {
                'id': inv.item.id,
                'item_name': inv.item.item_name,
                'description': inv.item.description,
                'is_consumable': inv.item.is_consumable,
                'equippable_slot': inv.item.equippable_slot,
                'strength_boost': getattr(inv.item, 'strength_boost', 0) or 0,
                'mana_boost': getattr(inv.item, 'mana_boost', 0) or 0,
                'weight': getattr(inv.item, 'weight', 0) or 0
            },
            'quantity': inv.quantity
        })
        
    equipment_list = []
    for eq in getattr(session, 'equipment', []).all() if hasattr(session, 'equipment') else []:
        equipment_list.append({
            'slot': eq.slot,
            'item': {
                'id': eq.item.id, 
                'item_name': eq.item.item_name,
                'description': eq.item.description,
                'strength_boost': getattr(eq.item, 'strength_boost', 0) or 0,
                'mana_boost': getattr(eq.item, 'mana_boost', 0) or 0,
                'weight': getattr(eq.item, 'weight', 0) or 0
            }
        })
        
    # Calculate final stats with equipment boosts
    final_stats = { 
        'health': 0, 
        'max_health': 100,
        'sanity': 0, 
        'reputation': 0, 
        'strength': 0, 
        'intelligence': 0,
        'dexterity': 0,
        'mana': 0,
        'max_mana': 100,
        'speed': 15,
        'evasion': 10,
        'crit_chance': 15,
        'overheat': 0,
        'scrap': 0
    }

    total_strength_boost = 0
    total_mana_boost = 0
    total_weight = 0
    for eq in getattr(session, 'equipment', []).all() if hasattr(session, 'equipment') else []:
        total_strength_boost += getattr(eq.item, 'strength_boost', 0) or 0
        total_mana_boost += getattr(eq.item, 'mana_boost', 0) or 0
        total_weight += getattr(eq.item, 'weight', 0) or 0
    
    final_stats['strength'] = total_strength_boost + 10
    final_stats['max_mana'] = 100 + total_mana_boost
    
    # Calculate Speed and Evasion based on weight penalties
    final_stats['speed'] = max(1, 15 - (total_weight // 5))
    final_stats['evasion'] = max(0, 10 - (total_weight // 10))

    if stats:
        # Clamp current health and mana to their calculated maximums
        final_stats['health'] = min(stats.health if stats.health > 0 else 100, final_stats['max_health'])
        final_stats['sanity'] = stats.sanity
        final_stats['reputation'] = stats.reputation
        final_stats['overheat'] = getattr(stats, 'overheat', 0) or 0
        final_stats['mana'] = min(getattr(stats, 'mana', 100), final_stats['max_mana'])
        final_stats['base_defense'] = getattr(stats, 'defense', 0)
        
        # RPG Stats
        final_stats['level'] = getattr(stats, 'level', 1)
        final_stats['exp'] = getattr(stats, 'exp', 0)
        final_stats['stat_points'] = getattr(stats, 'stat_points', 0)
        final_stats['scrap'] = getattr(stats, 'scrap', 0)
        final_stats['base_strength'] = getattr(stats, 'base_strength', 10)
        final_stats['base_intelligence'] = getattr(stats, 'base_intelligence', 10)
        final_stats['base_dexterity'] = getattr(stats, 'base_dexterity', 10)
        
        final_stats['strength'] = total_strength_boost + final_stats['base_strength']
        final_stats['intelligence'] = final_stats['base_intelligence']
        final_stats['dexterity'] = final_stats['base_dexterity']

    recipes_list = []
    for recipe in Recipe.objects.all():
        recipes_list.append({
            'ing1': recipe.ingredient_1.item_name,
            'ing2': recipe.ingredient_2.item_name,
            'result': recipe.result_item.item_name
        })

    available_locations = ["Eins City"]
    if node:
        if node.id >= 11: available_locations.append("Helheim's Sanctuary")
        if node.id >= 15: available_locations.append("Helheim Market")
        if node.id >= 23: available_locations.append("Alfheim Border")
        if node.id >= 26: available_locations.append("Luminis Capital")
        if node.id >= 30: available_locations.append("Luminis Sewers")
        if node.id >= 33: available_locations.append("Holy Forge")
        if node.id >= 37: available_locations.append("Grand Cathedral")
        if node.id >= 44: available_locations.append("The Wastelands")

    user_settings_data = {'sound_volume': 50, 'text_speed': 50, 'auto_save': True}
    try:
        # get_or_create is safer and ensures settings exist for every user.
        # This prevents settings from resetting to default if they were never changed.
        settings, created = UserSettings.objects.get_or_create(user=session.user)
        user_settings_data = {
            'sound_volume': settings.sound_volume,
            'text_speed': settings.text_speed,
            'auto_save': settings.auto_save
        }
    except Exception:
        pass # Failsafe for scenarios where the session or user might be broken.

    quests_list = []
    for pq in session.quests.all():
        quests_list.append({
            'key': pq.quest.key,
            'title': pq.quest.title,
            'description': pq.quest.description,
            'reward': pq.quest.reward,
            'note': pq.quest.note,
            'status': pq.status
        })

    return {
        'id': session.id,
        'is_active': session.is_active,
        'last_played': session.last_played.isoformat() if session.last_played else None,
        'stats': final_stats,
        'current_node': {
            'id': node.id,
            'title': node.title,
            'narrative_text': node.narrative_text,
            'location_name': node.location.name if node.location else None,
            'choices': choices
        } if node else None,
        'inventory': inventory_list,
        'equipment': equipment_list,
        'available_locations': available_locations,
        'recipes': recipes_list,
        'settings': user_settings_data,
        'quests': quests_list
    }

def seed_initial_data():
    """Helper function to auto-seed the database if it's empty."""
    StoryNode.objects.all().delete()
    Choice.objects.all().delete()
    Item.objects.all().delete()
    Consequence.objects.all().delete()
    Recipe.objects.all().delete()
    Quest.objects.all().delete()
    
    Quest.objects.create(key="main", title="Adventurer Exam", description="Objective: Defeat Grandmaster Oser in combat to prove your worth.", reward="Reward: Official Adventurer ID, 500 Scrap.", note="\"Oser is an Ice Mage considered an Omega Threat. I shouldn't take this lightly.\"")
    Quest.objects.create(key="wrench", title="Find Merlin's Wrench", description="Objective: Locate Merlin's lost wrench in the scrapyard.", reward="Reward: 70 Scrap and access to a new mech upgrade.", note="\"Merlin would be furious if anyone else got their hands on it first.\"")
    Quest.objects.create(key="scraps", title="Gather 10 Iron Scraps", description="Objective: Collect 10 pieces of iron scrap from nearby ruins.", reward="Reward: 200 Scrap and a bonus crafting component.", note="\"The more scrap I collect, the stronger I can make my mech.\"")

    loc_prologue, _ = Location.objects.get_or_create(name="The Void")
    loc_eins, _ = Location.objects.get_or_create(name="Eins City")

    n1 = StoryNode.objects.create(
        id=1, title="Prologue: The End and The Beginning",
        narrative_text="\"Betrayal is the only truth that sticks\" - Arthur Miller.\n\nArthur Miller was an American Essayist who is a prominent figure in both Literature and Cinema... I never knew him, but my mom used to read and watch all his works. I was living my life to the fullest until a sudden bolt of lightning struck our house.\n\n\"That’s how I died... is what you’re trying to say?\" asked Licht.\n\n\"Yep!\" came from an unknown woman who proclaims herself as a Goddess of Life.\n\n\"The world is in dire need of your help, Licht Miller. Help them with all your might, and you will be granted to live a joyful life with your mother... To defeat the First King of Helheim - Satan.\"",
        location=loc_prologue
    )
    n2 = StoryNode.objects.create(
        id=2, title="34 Years Later: The Betrayal",
        narrative_text="34 Years Had Passed... The Hero Party led by Licht The Hero defeated the First King of Helheim - Satan and earned freedom for the whole world. But unexpected things happened.\n\nThe Royal Family and Messengers of Gods decided to execute their one and only blessing from heaven...\n\n\"And your party members... had partake in this betrayal and extracted your powers?\" confusely asked by a middle-aged woman mechanical worker.\n\n\"Yes.\" annoyingly confirmed by Licht The Hero.\n\n\"So what’s your plan now?\"",
        location=loc_prologue
    )
    n3 = StoryNode.objects.create(
        id=3, title="Merlin Ironwright",
        narrative_text="\"I’m going to take everything they stole from me. That’s all there is to it.\"\n\n\"I see. I am Merlin Ironwright. Nice to work for you, Licht the Hero.\"\n\nIt took 4 whole years to make limbs that are suitable for my overall capability as someone who houses large amounts of Mana and Strength. Merlin, a leader of a Hero's Fanatic organization, saw me lying in a river after I was sealed.\n\nThe Goddess gave me another chance to settle the score with those who wronged me.",
        location=loc_prologue
    )
    n4 = StoryNode.objects.create(
        id=4, title="Act 1: Eins City",
        narrative_text="Helheim’s Sanctuary.\n\n4 Years have passed. A war is going on between 4 Countries: Alfheim and Lysandria vs Varkrath and Dravenmoon.\n\nTo travel, I need a licensed adventurer ID. Merlin's organization changed my records—my name is now registered as an 18-year-old. The closest city with a guild is Eins City.\n\nUpon arriving, we meet Sherry at the guild, who informs us the Grandmaster is waiting.",
        location=loc_eins
    )
    n5 = StoryNode.objects.create(
        id=5, title="Grandmaster Oser",
        narrative_text="\"Welcome back, Hero Licht.\"\n\n\"Oser!?\"\n\n\"You’re still the same as ever, friend.\"\n\nOser is from another planet similar to Earth, an immortal Ice Mage who is considered a Doom Threat. He was waiting to test my strength in an Adventurer Exam before I set out on my revenge against Vibarian.\n\n\"The exam is simple: we will just fight it out. I will measure your power...\"",
        location=loc_eins
    )
    n6 = StoryNode.objects.create(
        id=6, title="The Manalith",
        narrative_text="\"As expected, Licht. Even though you... lack limbs, you are still as strong as I first met you.\"\n\n\"I don't feel that was the case, honestly.\"\n\nOser hands over a rare 3-Star Artifact: [Manalith]. Capable of storing 2 months' worth of mana.\n\nAfter returning to Sherry, she is shocked to see the results. You are instantly promoted to Rank B!",
        location=loc_eins
    )
    n7 = StoryNode.objects.create(
        id=7, title="The Next Destination",
        narrative_text="Merlin Ironwright wanted me to get used to these mechanical limbs before my journey.\n\n\"Next destination is 'Helheim’s Sanctuary' huh.\"\n\n\"There is an annual martial arts tournament, and we can get there in less than 2 days,\" Merlin noted. \"Registration lasts for 6 days. Until then, we investigate Vibarian’s agenda these past 2 years.\"",
        location=loc_eins
    )
    n8 = StoryNode.objects.create(
        id=8, title="Vibarian's Crimes",
        narrative_text="\"'Accidentally' killing innocent bystanders, kidnapping, suspected of being a slave-lord, and selling drugs,\" Merlin listed off. \"Even with these records, they value his power so much they turn a blind eye.\"\n\n\"He stooped so low... And here I thought he was still a decent person.\"\n\nMerlin sighed. \"I’ve always wondered what power he stole from you.\"",
        location=loc_eins
    )
    n9 = StoryNode.objects.create(
        id=9, title="The 40% Boost",
        narrative_text="\"It was a simple body strengthening spell,\" I explained. \"But that spell gives a 40% boost on every physical aspect of the human body. The mana output itself is what enhances me.\"\n\n\"Interesting... I wonder if Vibarian knows this too?\"\n\n\"It will be his biggest advantage and largest fatal disadvantage at the same time. I hope he does not know this.\"",
        location=loc_eins
    )
    n10 = StoryNode.objects.create(
        id=10, title="A Tall Order",
        narrative_text="\"Before my fight with that asshole, can you make three different mech-limbs for my right arm and both of my legs?\"\n\nMerlin stared at me in disbelief. \"...Do you really expect me to pull ALL of these in 3 days and 2 nights!??\"\n\n\"I believe in you.\"",
        location=loc_eins
    )
    n11 = StoryNode.objects.create(
        id=11, title="Preparing for the Journey",
        narrative_text="The limbs are being crafted. You rest for the night...\n\nThe next morning, Merlin hands you the new limbs. \"These are just temporary prototypes, Licht. They'll let you fight in the tournament without your body breaking down, but they won't handle your full output for long.\"\n\nYou nod, equipping them. You are ready to depart. Open your 'World Map' tab to travel to Helheim's Sanctuary.",
        location=loc_eins
    )
    loc_helheim, _ = Location.objects.get_or_create(name="Helheim's Sanctuary")
    n12 = StoryNode.objects.create(
        id=12, title="On the Road to Helheim",
        narrative_text="You leave Eins City behind. The journey will take two days.\n\nAs you cross the Varkrath borders, you are ambushed by a stray mechanical beast!",
        location=loc_helheim
    )
    n13 = StoryNode.objects.create(
        id=13, title="Victory over the Beast",
        narrative_text="The mechanical beast collapses into a heap of sparking metal. You quickly dismantle its core and gather any usable iron scrap. It's a small bounty, but every piece helps.\n\nThe destination is on the horizon. Helheim's Sanctuary awaits.",
        location=loc_helheim
    )
    n14 = StoryNode.objects.create(
        id=14, title="Helheim's Sanctuary",
        narrative_text="You have arrived at Helheim's Sanctuary.\n\nThe martial arts tournament is already underway. It's time to find Vibarian.",
        location=loc_helheim
    )
    
    loc_market, _ = Location.objects.get_or_create(name="Helheim Market")
    
    n15 = StoryNode.objects.create(
        id=15, title="Helheim Market",
        narrative_text="Before heading to the arena, you take a detour through the bustling Helheim Market. Merchants from all four countries gather here. It's a great place to gather intel or find materials, though right now your eyes are set on the tournament.",
        location=loc_market
    )
    n16 = StoryNode.objects.create(
        id=16, title="The Qualifiers",
        narrative_text="You enter the arena under your alias. The qualifiers are a free-for-all battle royale. Using your mechanical limbs, you effortlessly dispatch the competition. The crowd goes wild, dubbing you the 'Rookie Cyborg'.",
        location=loc_helheim
    )
    n17 = StoryNode.objects.create(
        id=17, title="Round of 16: The Twin Assassins",
        narrative_text="Your first real challenge in the bracket. A pair of rogue assassins from Dravenmoon try to outflank you using speed and poison.",
        location=loc_helheim
    )
    n18 = StoryNode.objects.create(
        id=18, title="Quarter-Finals: Grom the Brute",
        narrative_text="Next up is Grom, a massive 8-foot warrior wielding a giant warhammer. He's slow, but one hit could dent your new limbs.",
        location=loc_helheim
    )
    n19 = StoryNode.objects.create(
        id=19, title="Semi-Finals: The Right Hand",
        narrative_text="You've made it to the semi-finals. Your opponent is Vibarian's personal enforcer. He whispers to you, 'Lord Vibarian sends his regards.' He recognizes your fighting stance.",
        location=loc_helheim
    )
    n20 = StoryNode.objects.create(
        id=20, title="The Final Match: Vibarian",
        narrative_text="The crowd roars as Vibarian steps into the ring. He looks exactly as you remember him 34 years ago. Arrogant. He activates the stolen spell, his body glowing with a 40% physical boost.",
        location=loc_helheim
    )
    n21 = StoryNode.objects.create(
        id=21, title="The Fatal Flaw",
        narrative_text="You smirk and goad him. 'Is that all the power you stole?' Furious, Vibarian pushes the spell to 100%. What he doesn't know is without a Hero's natural mana circuits, pushing past 40% will tear his body apart from the inside.",
        location=loc_helheim
    )
    n22 = StoryNode.objects.create(
        id=22, title="Reclaiming the Power",
        narrative_text="Vibarian collapses during the fight, his mana circuits overloaded and fried. As he begs for mercy, you step on his chest and reclaim your 'Body Strengthening Spell'. One traitor down.",
        location=loc_helheim
    )
    
    loc_alfheim, _ = Location.objects.get_or_create(name="Alfheim")
    
    n23 = StoryNode.objects.create(
        id=23, title="Act 2: The Holy Kingdom",
        narrative_text="Merlin contacts you via a comms module. 'Target confirmed. Elysia the Saintess. She used your Aura of Restoration to trick Alfheim into worshipping her.'\n\nPack your bags, Licht. We're going to the Holy Kingdom.",
        location=loc_alfheim
    )
    
    loc_alfheim_border, _ = Location.objects.get_or_create(name="Alfheim Border")
    n24 = StoryNode.objects.create(
        id=24, title="The Road to Alfheim",
        narrative_text="Traveling to the Holy Kingdom. Merlin briefs you on the Paladin forces and Elysia's absolute authority over the kingdom's religion.\n\n'Be careful, Licht. They view mechanical augmentations as heresy.'",
        location=loc_alfheim_border
    )
    n25 = StoryNode.objects.create(
        id=25, title="The Border Checkpoint",
        narrative_text="The border is heavily guarded by the Paladin Vanguard. They demand exorbitant entry fees and sneer at your mechanical limbs. They draw their holy blades, intending to purge a 'heretic'.",
        location=loc_alfheim_border
    )
    
    loc_luminis, _ = Location.objects.get_or_create(name="Luminis Capital")
    n26 = StoryNode.objects.create(
        id=26, title="The City of Light, Luminis",
        narrative_text="You dispatch the guards and enter the grand capital under the cover of night. The streets are pristine, but there is an eerie, cult-like devotion to the Saintess among the citizens.",
        location=loc_luminis
    )
    n27 = StoryNode.objects.create(
        id=27, title="The Grand Cathedral",
        narrative_text="You arrive at the cathedral square just as Elysia is making a public appearance on the high balcony.",
        location=loc_luminis
    )
    n28 = StoryNode.objects.create(
        id=28, title="A False Miracle",
        narrative_text="Elysia uses your stolen 'Aura of Restoration' to heal a line of sick citizens. The crowd weeps in adoration. You grip your mechanical fist in disgust as you watch your power being used to build a cult.",
        location=loc_luminis
    )
    n29 = StoryNode.objects.create(
        id=29, title="The Underground",
        narrative_text="As you turn away, you are intercepted by a cloaked figure. 'You don't look at her with the same blind eyes the others do,' the figure whispers. 'Come with me.'",
        location=loc_luminis
    )
    n30 = StoryNode.objects.create(
        id=30, title="The Resistance Hideout",
        narrative_text="You are led into the Luminis Sewers. There, you meet the local resistance, led by a disgraced former Paladin. They share a common goal: dethroning the false Saintess.",
        location=loc_luminis
    )
    
    n31 = StoryNode.objects.create(
        id=31, title="Kaelen the Oathbreaker",
        narrative_text="The leader of the resistance introduces himself as Kaelen. He explains that Elysia is practically invulnerable due to her 'Martyr's Retribution' ability. 'She reflects all damage back as radiant energy,' he warns. 'You can't just punch your way through her without destroying yourself in the process.'",
        location=loc_luminis
    )
    n32 = StoryNode.objects.create(
        id=32, title="Resistance Base Camp",
        narrative_text="The underground camp is safe for now. Traders deal in black market goods and scrap. Kaelen suggests raiding the Holy Forge nearby to get materials capable of piercing Elysia's barrier so Merlin can upgrade your limbs.",
        location=loc_luminis
    )
    
    loc_forge, _ = Location.objects.get_or_create(name="Holy Forge")
    n33 = StoryNode.objects.create(
        id=33, title="Infiltrating the Holy Forge",
        narrative_text="You sneak into the Paladin's armory. The blistering heat from the glowing white-hot forges contrasts with the pristine coldness of the city above.",
        location=loc_forge
    )
    n34 = StoryNode.objects.create(
        id=34, title="The Forge Guardian",
        narrative_text="As you reach the central anvil, a massive animated suit of Paladin armor blocks your path. Its eyes glow with righteous fury as it swings a heavy greatsword.",
        location=loc_forge
    )
    n35 = StoryNode.objects.create(
        id=35, title="The Radiant Upgrade",
        narrative_text="The guardian crumbles into molten slag. You reach into the forge and extract a 'Radiant Ingot'. This should be enough to reinforce your limbs.",
        location=loc_forge
    )
    n36 = StoryNode.objects.create(
        id=36, title="The Grand Festival",
        narrative_text="The day of Elysia's grand sermon arrives. The Resistance causes explosions on the city outskirts, drawing the Paladin Vanguard away. A desperate father begs you to save his daughter from Elysia's 'miracles'. You breach the gate, but are confronted by two Integrity Knights.",
        location=loc_luminis
    )
    
    loc_cathedral, _ = Location.objects.get_or_create(name="Grand Cathedral")
    n37 = StoryNode.objects.create(
        id=37, title="Confronting Ambrosia",
        narrative_text="You confront Elysia (Ambrosia). She tries to justify her tyrannical actions as righteous, claiming her experiments and tortures were necessary. You erupt in fury, declaring even demons have greater reasoning.",
        location=loc_cathedral
    )
    n38 = StoryNode.objects.create(
        id=38, title="The Black Smoke of Satan",
        narrative_text="Elysia is defeated, but black smoke billows from her body. The realization hits you like a truck: Satan wasn't fully killed 34 years ago. The First King of Helheim manifests through her broken form!",
        location=loc_cathedral
    )
    n39 = StoryNode.objects.create(
        id=39, title="A Tragic End",
        narrative_text="The manifestation is destroyed. A dying Elysia regains her true self, thanking you for saving her. She gifts you a ring before her body disintegrates, triggering massive explosions that level the Cathedral.",
        location=loc_cathedral
    )
    
    loc_unknown, _ = Location.objects.get_or_create(name="Unknown")
    n40 = StoryNode.objects.create(
        id=40, title="Act 3: Shadows of the Past",
        narrative_text="Meanwhile, the remaining traitors discuss Elysia's death. Satan's spirit reveals he survived by contracting with a mage named Theonnix. They note your mechanical limbs are draining your mana rapidly. Their next move involves someone named Carlossus.",
        location=loc_unknown
    )
    
    n41 = StoryNode.objects.create(
        id=41, title="The Aftermath",
        narrative_text="The Grand Cathedral is in ruins. You stand amidst the rubble, clutching the ring Elysia gave you. With the false Saintess dead and Satan's spirit escaped, your mission here is over. It's time to open your map and return to Eins City.",
        location=loc_luminis
    )

    n42 = StoryNode.objects.create(
        id=42, title="Return to Eins City",
        narrative_text="You return to Eins City to warn Merlin. As you arrive, your temporary prototype limbs spark and seize up, severely damaged from handling the intense output of the Colossus and Martyr Cores.",
        location=loc_eins
    )
    
    n43 = StoryNode.objects.create(
        id=43, title="The True Mech Limbs",
        narrative_text="Merlin inspects the damage. 'I told you they were temporary! Good thing I just finished the real deal.' She unveils a fully completed set of high-output limbs, designed specifically to handle the Soul Cores without massive Overheat penalties.",
        location=loc_eins
    )
    
    n44 = StoryNode.objects.create(
        id=44, title="The March of Carlossus",
        narrative_text="The ground shakes. Merlin's scanners pick up a massive energy signature approaching across The Wastelands. It's Carlossus—a colossal moving fortress/golem from the ancient war, piloted by Theonnix. It's heading straight for Eins City.",
        location=loc_eins
    )
    
    loc_wasteland, _ = Location.objects.get_or_create(name="The Wastelands")

    n45 = StoryNode.objects.create(
        id=45, title="Intercepting the Behemoth",
        narrative_text="You rush out to the Wastelands to intercept it. Carlossus towers over the landscape. To stop it, you'll need to use your 'Overclock' ability to burst down its nearly infinite armor plating.",
        location=loc_wasteland
    )

    n46 = StoryNode.objects.create(
        id=46, title="Breaching the Hull",
        narrative_text="Carlossus fires massive mana cannons. The Wastelands are scorched, but your True Mech Limbs hold strong. You use 'Overclock' to shatter its outer armor plating, exposing the internal core.",
        location=loc_wasteland
    )
    n47 = StoryNode.objects.create(
        id=47, title="Theonnix's Command",
        narrative_text="Inside the core room, you find Theonnix. He sneers at you. 'You always were a brute, Licht. But magic rules this world, not fists.' He begins casting a devastating spell to incinerate you.",
        location=loc_wasteland
    )
    n48 = StoryNode.objects.create(
        id=48, title="The Mage Falls",
        narrative_text="Theonnix is defeated. He coughs up blood, realizing his magic is no match for your reclaimed strength and Merlin's engineering. 'Lord Satan... help me...' he begs.",
        location=loc_wasteland
    )
    n49 = StoryNode.objects.create(
        id=49, title="The Contract Fulfilled",
        narrative_text="A dark, oppressive aura fills the room. Satan's voice echoes. 'Your body has served its purpose, Theonnix.' Black smoke consumes the mage, transforming his body into the true, terrifying form of the First King of Helheim.",
        location=loc_wasteland
    )
    n50 = StoryNode.objects.create(
        id=50, title="The Final Battle",
        narrative_text="Satan stands before you, fully resurrected. 'I will finish what your pathetic party failed to do 34 years ago,' he roars. This is it. The fate of the world rests on your shoulders.",
        location=loc_wasteland
    )
    n51 = StoryNode.objects.create(
        id=51, title="Satan's Demise",
        narrative_text="With a final, earth-shattering blow, Satan is destroyed. The dark aura dissipates, and Carlossus powers down. The Wastelands fall silent. You have avenged your betrayal and saved the world.",
        location=loc_wasteland
    )
    n52 = StoryNode.objects.create(
        id=52, title="A Promise Kept",
        narrative_text="The Goddess of Life appears before you. 'You have done well, Licht Miller. As promised, your soul shall return to your world.' She smiles warmly.",
        location=loc_wasteland
    )
    loc_earth, _ = Location.objects.get_or_create(name="Earth")
    n53 = StoryNode.objects.create(
        id=53, title="Epilogue: A Joyful Life",
        narrative_text="You wake up in your bed. The smell of breakfast wafts from the kitchen. Your mother calls your name. You smile, knowing you finally have the chance to live the joyful life you were promised.\n\n[ THE END ]\nThank you for playing Lichtfall!",
        location=loc_earth
    )

    Choice.objects.create(node=n1, choice_text="Accept the Goddess's offer", next_node=n2)
    Choice.objects.create(node=n2, choice_text="Explain your plan", next_node=n3)
    Choice.objects.create(node=n2, choice_text="Say nothing and brood", next_node=n3)
    Choice.objects.create(node=n3, choice_text="Begin the journey", next_node=n4)
    Choice.objects.create(node=n4, choice_text="Enter the Guild", next_node=n5)
    c_fight = Choice.objects.create(node=n5, choice_text="[COMBAT] Fight Grandmaster Oser", next_node=n6)
    c_equip = Choice.objects.create(node=n6, choice_text="Equip the Manalith...", next_node=n7)
    Choice.objects.create(node=n7, choice_text="Listen to Merlin", next_node=n8)
    Choice.objects.create(node=n8, choice_text="Explain the Stolen Spell", next_node=n9)
    Choice.objects.create(node=n9, choice_text="Make a request", next_node=n10)
    c_wait = Choice.objects.create(node=n10, choice_text="Wait for the limbs...", next_node=n11)
    Choice.objects.create(node=n12, choice_text="[COMBAT] Fight Mechanical Beast", next_node=n13)
    c_beast_win = Choice.objects.create(node=n13, choice_text="Continue the journey", next_node=n14)
    
    Choice.objects.create(node=n14, choice_text="Explore the Market", next_node=n15)
    Choice.objects.create(node=n15, choice_text="Head to the Arena", next_node=n16)
    Choice.objects.create(node=n16, choice_text="Enter the Bracket", next_node=n17)
    Choice.objects.create(node=n17, choice_text="[COMBAT] Fight the Assassins", next_node=n18)
    Choice.objects.create(node=n18, choice_text="[COMBAT] Fight Grom", next_node=n19)
    Choice.objects.create(node=n19, choice_text="[COMBAT] Fight the Enforcer", next_node=n20)
    Choice.objects.create(node=n20, choice_text="Taunt Vibarian", next_node=n21)
    Choice.objects.create(node=n21, choice_text="[COMBAT] Defeat Vibarian", next_node=n22)
    c_leave_arena = Choice.objects.create(node=n22, choice_text="Leave the Arena", next_node=n23)
    Choice.objects.create(node=n24, choice_text="Approach the Border", next_node=n25)
    Choice.objects.create(node=n25, choice_text="[COMBAT] Fight Paladin Vanguard", next_node=n26)
    Choice.objects.create(node=n26, choice_text="Head to the Grand Cathedral", next_node=n27)
    Choice.objects.create(node=n27, choice_text="Observe the Sermon", next_node=n28)
    Choice.objects.create(node=n28, choice_text="Retreat and Plan", next_node=n29)
    Choice.objects.create(node=n29, choice_text="Follow the Figure", next_node=n30)
    Choice.objects.create(node=n30, choice_text="Speak with the Leader", next_node=n31)
    Choice.objects.create(node=n31, choice_text="Explore the Camp", next_node=n32)
    Choice.objects.create(node=n32, choice_text="Raid the Holy Forge", next_node=n33)
    Choice.objects.create(node=n33, choice_text="Approach the Anvil", next_node=n34)
    Choice.objects.create(node=n34, choice_text="[COMBAT] Fight Forge Guardian", next_node=n35)
    c_take_ingot = Choice.objects.create(node=n35, choice_text="Return to Camp", next_node=n36)
    c_craft_plating = Choice.objects.create(node=n36, choice_text="Head to the Festival", next_node=n37)
    Choice.objects.create(node=n37, choice_text="[COMBAT] Fight Integrity Knights", next_node=n38)
    Choice.objects.create(node=n38, choice_text="[COMBAT] Phase 1: Fight Elysia", next_node=n39)
    Choice.objects.create(node=n39, choice_text="[COMBAT] Phase 2: Fight Satan's Manifestation", next_node=n40)
    c_escape = Choice.objects.create(node=n40, choice_text="Escape the Ruins", next_node=n41)
    Choice.objects.create(node=n42, choice_text="Show Merlin the Cores", next_node=n43)
    c_true_limbs = Choice.objects.create(node=n43, choice_text="Equip the True Limbs", next_node=n44)
    Choice.objects.create(node=n45, choice_text="[COMBAT] Fight Carlossus", next_node=n46)
    Choice.objects.create(node=n46, choice_text="Enter the Core", next_node=n47)
    Choice.objects.create(node=n47, choice_text="[COMBAT] Fight Theonnix", next_node=n48)
    Choice.objects.create(node=n48, choice_text="Watch", next_node=n49)
    Choice.objects.create(node=n49, choice_text="Prepare Yourself", next_node=n50)
    Choice.objects.create(node=n50, choice_text="[COMBAT] Fight Satan (True Form)", next_node=n51)
    Choice.objects.create(node=n51, choice_text="Breathe", next_node=n52)
    Choice.objects.create(node=n52, choice_text="Accept the Reward", next_node=n53)

    health_pot = Item.objects.create(
        item_name="Health Potion", description="Restores 50 HP. A vital remedy during combat.", is_consumable=True
    )
    mana_pot = Item.objects.create(
        item_name="Mana Potion", description="Restores 50 MP. Refuels magic and mechanical limbs.", is_consumable=True
    )
    strength_pot = Item.objects.create(
        item_name="Strength Potion", description="A potent brew that surges your physical strength temporarily.", is_consumable=True
    )
    speed_pot = Item.objects.create(
        item_name="Speed Potion", description="A volatile mixture that enhances your reaction time and speed.", is_consumable=True
    )
    manalith = Item.objects.create(
        item_name="Manalith",
        description="3-Star Artifact: Capable of storing 2 months' worth of mana.",
        is_consumable=False,
        equippable_slot="Torso",
        mana_boost=20
    )
    iron_scrap = Item.objects.create(
        item_name="Iron Scrap", description="Raw material used for basic crafting.", is_consumable=False
    )
    mana_shard = Item.objects.create(
        item_name="Mana Crystal Shard", description="A tiny crystal containing residual energy.", is_consumable=False
    )
    mech_arm = Item.objects.create(
        item_name="Mech Arm Prototype", description="A basic mechanical limb forged in the workshop.", is_consumable=False,
        equippable_slot="Right Arm",
        strength_boost=10
    )
    
    colossus_core = Item.objects.create(
        item_name="Colossus Core (Vibarian)",
        description="Soul Core: The reclaimed 40% Body Boost. Massively increases STR but generates high Overheat.",
        is_consumable=False,
        equippable_slot="Soul Core",
        strength_boost=40
    )
    radiant_ingot = Item.objects.create(
        item_name="Radiant Ingot",
        description="A glowing bar of holy metal. Used to craft Anti-Magic plating.",
        is_consumable=False
    )
    vow_ring = Item.objects.create(
        item_name="Vow of The Bleeding Heart",
        description="Heroic Class Ring. Enhances healing by 20% and prevents one fatal blow per battle, but drains Sanity rapidly during Boss fights.",
        is_consumable=False,
        equippable_slot="Accessory",
        mana_boost=30
    )
    
    anti_magic_plating = Item.objects.create(
        item_name="Anti-Magic Plating",
        description="A specialized plate that neutralizes and disperses holy radiant energy. Highly effective against Martyr's Retribution.",
        is_consumable=False,
        equippable_slot="Accessory",
        defense_boost=20
    )
    
    # Create the Recipes
    Recipe.objects.create(ingredient_1=iron_scrap, ingredient_2=mana_shard, result_item=mech_arm)
    Recipe.objects.create(ingredient_1=iron_scrap, ingredient_2=radiant_ingot, result_item=anti_magic_plating)

    # Give the player the raw materials when they reach Node 11
    Consequence.objects.create(choice=c_wait, effect_type='item', effect_value=str(iron_scrap.id))
    Consequence.objects.create(choice=c_wait, effect_type='item', effect_value=str(mana_shard.id))
    Consequence.objects.create(choice=c_beast_win, effect_type='item', effect_value=str(iron_scrap.id))
    
    Consequence.objects.create(choice=c_equip, effect_type='item', effect_value=str(manalith.id))
    
    # Grant the Colossus Core after leaving the arena!
    Consequence.objects.create(choice=c_leave_arena, effect_type='item', effect_value=str(colossus_core.id))
    
    Consequence.objects.create(choice=c_take_ingot, effect_type='item', effect_value=str(radiant_ingot.id))
    
    # Grant the Vow Ring after escaping the Cathedral!
    Consequence.objects.create(choice=c_escape, effect_type='item', effect_value=str(vow_ring.id))


def ensure_story_items(session):
    """Ensures the player has key items if they've reached certain story nodes, preventing soft-locks."""
    if not session or not session.current_node:
        return
        
    # Node 7: Ensure player has Manalith to progress
    if session.current_node.id >= 7:
        manalith = Item.objects.filter(item_name="Manalith").first()
        if manalith:
            has_inv = Inventory.objects.filter(session=session, item=manalith).exists()
            has_eq = Equipment.objects.filter(session=session, item=manalith).exists()
            if not (has_inv or has_eq):
                Inventory.objects.create(session=session, item=manalith, quantity=1)

# --- Authentication Views ---
@csrf_exempt
def register_user(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            email = data.get('email')
            password = data.get('password')

            errors = {}
            if not username:
                errors['username'] = ['Username is required.']
            elif User.objects.filter(username=username).exists():
                errors['username'] = ['A user with that username already exists.']
                
            if not email:
                errors['email'] = ['Email is required.']
            elif User.objects.filter(email=email).exists():
                errors['email'] = ['A user with that email already exists.']
                
            if not password:
                errors['password'] = ['Password is required.']

            if errors:
                return JsonResponse(errors, status=400)

            user = User.objects.create_user(username=username, email=email, password=password)
            
            return JsonResponse({
                'id': user.id,
                'username': user.username,
                'email': user.email
            }, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
            
    return JsonResponse({'error': 'Invalid request method'}, status=400)

@csrf_exempt
def login_user(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')

            user = authenticate(request, username=username, password=password)
            
            if user is not None:
                django_login(request, user)
                return JsonResponse({'status': 'success', 'username': user.username})
            else:
                return JsonResponse({'error': 'Invalid username or password.'}, status=401)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
            
    return JsonResponse({'error': 'Invalid request method'}, status=400)

# --- Game Flow Views ---
@csrf_exempt
def start_game(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            user = User.objects.get(username=username)
            
            # Force auto-seed if the database is outdated (missing the new Act 3 content)
            if StoryNode.objects.count() < 40:
                seed_initial_data()
            
            # Deactivate previous active sessions for this user
            GameSession.objects.filter(user=user, is_active=True).update(is_active=False)
            
            # Assume Node ID 1 is the starting node. Fallback to 404 if db is empty.
            starting_node = get_object_or_404(StoryNode, id=1)
            
            session = GameSession.objects.create(
                user=user,
                current_node=starting_node,
                current_location=starting_node.location,
                is_active=True
            )
            
            PlayerStats.objects.create(session=session)

            return JsonResponse(serialize_game_session(session), status=201)
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found.'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
            
    return JsonResponse({'error': 'Invalid request method'}, status=400)

@csrf_exempt
def allocate_stat(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            stat = data.get('stat')

            if not stat:
                return JsonResponse({"error": "stat is required."}, status=400)

            user = User.objects.get(username=username)
            session = GameSession.objects.filter(user=user, is_active=True).first()

            if not session or not hasattr(session, 'stats'):
                return JsonResponse({"error": "No active game session found."}, status=404)

            player_stats = session.stats
            
            if getattr(player_stats, 'stat_points', 0) <= 0:
                return JsonResponse({"error": "No stat points available."}, status=400)

            if stat in ['str', 'strength', 'char-str']:
                player_stats.base_strength = getattr(player_stats, 'base_strength', 10) + 1
            elif stat in ['int', 'intelligence', 'char-int']:
                player_stats.base_intelligence = getattr(player_stats, 'base_intelligence', 10) + 1
            elif stat in ['dex', 'dexterity', 'char-dex']:
                player_stats.base_dexterity = getattr(player_stats, 'base_dexterity', 10) + 1
            else:
                return JsonResponse({"error": "Invalid stat type."}, status=400)

            player_stats.stat_points -= 1
            player_stats.save()

            return JsonResponse({
                "message": f"Stat {stat} allocated.",
                "state": serialize_game_session(session)
            }, status=200)

        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found.'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Invalid request method'}, status=400)

@csrf_exempt
def update_settings(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            user = User.objects.get(username=username)
            settings, _ = UserSettings.objects.get_or_create(user=user)
            
            if 'sound_volume' in data:
                settings.sound_volume = int(data['sound_volume'])
            if 'text_speed' in data:
                settings.text_speed = int(data['text_speed'])
            if 'auto_save' in data:
                settings.auto_save = bool(data['auto_save'])
            settings.save()
            return JsonResponse({'message': 'Settings updated successfully.'})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid request method'}, status=400)

@csrf_exempt
def equip_item(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            item_id = data.get('item_id')
            slot = data.get('slot')

            if not item_id or not slot:
                return JsonResponse({"error": "item_id and slot are required."}, status=400)

            user = User.objects.get(username=username)
            session = GameSession.objects.filter(user=user, is_active=True).first()

            if not session:
                return JsonResponse({"error": "No active game session found."}, status=404)

            # 1. Find the item in inventory
            inv_item = Inventory.objects.filter(session=session, item_id=item_id).first()
            if not inv_item or inv_item.quantity <= 0:
                return JsonResponse({"error": "Item not found in inventory."}, status=400)

            # --- CONSUME LOGIC ---
            if slot == "consume":
                if not inv_item.item.is_consumable:
                    return JsonResponse({"error": "Item is not consumable."}, status=400)

                stats = getattr(session, 'stats', None)
                if stats:
                    max_h = 100
                    max_m = 100 + sum((getattr(eq.item, 'mana_boost', 0) or 0) for eq in session.equipment.all())
                    if "Health" in inv_item.item.item_name:
                        stats.health = min((stats.health if stats.health > 0 else 100) + 50, max_h)
                    elif "Mana" in inv_item.item.item_name:
                        stats.mana = min(stats.mana + 50, max_m)
                    stats.save()

                inv_item.quantity -= 1
                if inv_item.quantity <= 0:
                    inv_item.delete()
                else:
                    inv_item.save()

                return JsonResponse({
                    "message": f"Used {inv_item.item.item_name}.",
                    "state": serialize_game_session(session)
                }, status=200)
            # -------------------------

            if inv_item.item.equippable_slot != slot:
                return JsonResponse({"error": f"This item cannot be equipped to the {slot} slot."}, status=400)

            # 2. Unequip old item (if the slot is already taken)
            old_equip = Equipment.objects.filter(session=session, slot=slot).first()
            if old_equip:
                old_inv, _ = Inventory.objects.get_or_create(session=session, item=old_equip.item, defaults={'quantity': 0})
                old_inv.quantity += 1
                old_inv.save()
                old_equip.delete()

            # 3. Equip the new item
            Equipment.objects.create(session=session, item=inv_item.item, slot=slot)

            # 4. Remove 1 from inventory
            inv_item.quantity -= 1
            if inv_item.quantity <= 0:
                inv_item.delete()
            else:
                inv_item.save()

            return JsonResponse({
                "message": "Item equipped successfully.",
                "state": serialize_game_session(session)
            }, status=200)

        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found.'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Invalid request method'}, status=400)

@csrf_exempt
def unequip_item(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            slot = data.get('slot')

            if not slot:
                return JsonResponse({"error": "slot is required."}, status=400)

            user = User.objects.get(username=username)
            session = GameSession.objects.filter(user=user, is_active=True).first()

            if not session:
                return JsonResponse({"error": "No active game session found."}, status=404)

            old_equip = Equipment.objects.filter(session=session, slot=slot).first()
            if old_equip:
                old_inv, _ = Inventory.objects.get_or_create(session=session, item=old_equip.item, defaults={'quantity': 0})
                old_inv.quantity += 1
                old_inv.save()
                old_equip.delete()
                return JsonResponse({"message": "Item unequipped successfully.", "state": serialize_game_session(session)}, status=200)
            else:
                return JsonResponse({"error": "No item equipped in this slot."}, status=400)
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found.'}, status=404)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    return JsonResponse({'error': 'Invalid request method'}, status=400)

@csrf_exempt
def craft_item(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            item1_id = data.get('item1_id')
            item2_id = data.get('item2_id')

            if not item1_id or not item2_id:
                return JsonResponse({"error": "Two ingredients are required."}, status=400)

            user = User.objects.get(username=username)
            session = GameSession.objects.filter(user=user, is_active=True).first()

            # Check if user has the items
            inv1 = Inventory.objects.filter(session=session, item_id=item1_id).first()
            inv2 = Inventory.objects.filter(session=session, item_id=item2_id).first()

            if not inv1 or inv1.quantity < 1:
                return JsonResponse({"error": "Missing first ingredient in inventory."}, status=400)
                
            if item1_id == item2_id:
                if inv1.quantity < 2:
                    return JsonResponse({"error": "Not enough quantity to use this item twice."}, status=400)
            else:
                if not inv2 or inv2.quantity < 1:
                    return JsonResponse({"error": "Missing second ingredient in inventory."}, status=400)

            # Find a matching recipe (order shouldn't matter)
            recipe = Recipe.objects.filter(ingredient_1_id=item1_id, ingredient_2_id=item2_id).first()
            if not recipe:
                recipe = Recipe.objects.filter(ingredient_1_id=item2_id, ingredient_2_id=item1_id).first()
                
            if not recipe:
                return JsonResponse({"error": "These items cannot be combined."}, status=400)

            # Consume ingredients
            if item1_id == item2_id:
                inv1.quantity -= 2
            else:
                inv1.quantity -= 1
                inv2.quantity -= 1

            if inv1.quantity > 0:
                inv1.save()
            else:
                inv1.delete()

            if item1_id != item2_id:
                if inv2.quantity > 0:
                    inv2.save()
                else:
                    inv2.delete()

            # Grant Result Item
            result_inv, _ = Inventory.objects.get_or_create(session=session, item=recipe.result_item, defaults={'quantity': 0})
            result_inv.quantity += 1
            result_inv.save()

            return JsonResponse({"message": "Crafting successful!", "state": serialize_game_session(session), "crafted_item": recipe.result_item.item_name}, status=200)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid request method'}, status=400)

@csrf_exempt
def allocate_stat(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            stat = data.get('stat')
            
            user = User.objects.get(username=username)
            session = GameSession.objects.filter(user=user, is_active=True).first()
            if not session:
                return JsonResponse({"error": "No active session."}, status=404)
                
            stats = session.stats
            if stats.stat_points > 0:
                if stat == 'str':
                    stats.base_strength += 1
                elif stat == 'int':
                    stats.base_intelligence += 1
                elif stat == 'dex':
                    stats.base_dexterity += 1
                else:
                    return JsonResponse({"error": "Invalid stat attribute."}, status=400)
                    
                stats.stat_points -= 1
                stats.save()
                return JsonResponse({"message": "Stat point allocated.", "state": serialize_game_session(session)}, status=200)
            else:
                return JsonResponse({"error": "Not enough stat points."}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid request method'}, status=400)

@csrf_exempt
def rest_at_inn(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            user = User.objects.get(username=username)
            session = GameSession.objects.filter(user=user, is_active=True).first()
            
            if not session:
                return JsonResponse({"error": "No active session."}, status=404)
            
            safe_locations = ["Eins City", "Helheim Market", "Luminis Sewers"]
            if session.current_node.location.name not in safe_locations:
                return JsonResponse({"error": "There is no Inn here."}, status=400)
                
            stats = session.stats
            if stats.scrap < 50:
                return JsonResponse({"error": "Not enough Scrap. You need 50 Scrap to rest."}, status=400)
                
            stats.scrap -= 50
            
            base_str = getattr(stats, 'base_strength', 10)
            base_int = getattr(stats, 'base_intelligence', 10)
            max_health = 100 + (base_str * 10) - 100
            total_mana_boost = sum((getattr(eq.item, 'mana_boost', 0) or 0) for eq in getattr(session, 'equipment', []).all() if hasattr(session, 'equipment'))
            max_mana = 100 + (base_int * 10) - 100 + total_mana_boost
            
            stats.health = max_health
            stats.mana = max_mana
            stats.save()
            
            return JsonResponse({"message": "Rested successfully.", "state": serialize_game_session(session)}, status=200)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid request method'}, status=400)

@csrf_exempt
def travel(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            destination = data.get('destination')
            
            user = User.objects.get(username=username)
            session = GameSession.objects.filter(user=user, is_active=True).first()
            if not session:
                return JsonResponse({"error": "No active session."}, status=404)
                
            next_node = None
            if destination == "Helheim's Sanctuary" and session.current_node.id == 11:
                next_node = StoryNode.objects.get(id=12)
            elif destination == "Alfheim Border" and session.current_node.id == 23:
                next_node = StoryNode.objects.get(id=24)
            elif destination == "Eins City" and session.current_node.id == 41:
                next_node = StoryNode.objects.get(id=42)
            elif destination == "The Wastelands" and session.current_node.id == 44:
                next_node = StoryNode.objects.get(id=45)
                
            if next_node:
                stats = session.stats
                heal_msg = ""
                if stats:
                    base_str = getattr(stats, 'base_strength', 10)
                    base_int = getattr(stats, 'base_intelligence', 10)
                    max_health = 100 + (base_str * 10) - 100
                    total_mana_boost = sum((getattr(eq.item, 'mana_boost', 0) or 0) for eq in getattr(session, 'equipment', []).all() if hasattr(session, 'equipment'))
                    max_mana = 100 + (base_int * 10) - 100 + total_mana_boost
                    heal_hp = int(max_health * 0.3)
                    heal_mp = int(max_mana * 0.3)
                    stats.health = min(max_health, (stats.health if stats.health > 0 else 100) + heal_hp)
                    stats.mana = min(max_mana, stats.mana + heal_mp)
                    stats.save()
                    heal_msg = f"\n\n<span style='color:#00ffcc;'>[ Natural Healing: Rested during travel. Recovered {heal_hp} HP and {heal_mp} MP. ]</span>"
                    
                session.current_node = next_node
                session.current_location = next_node.location
                session.save()
                
                if next_node.id == 42:
                    item_to_remove = Item.objects.filter(item_name="Mech Arm Prototype").first()
                    if item_to_remove:
                        Inventory.objects.filter(session=session, item=item_to_remove).delete()
                        Equipment.objects.filter(session=session, item=item_to_remove).delete()
                        
                ensure_story_items(session)
                state_data = serialize_game_session(session)
                if state_data.get('current_node'):
                    state_data['current_node']['narrative_text'] += heal_msg
                    
                return JsonResponse({"message": "Traveled successfully.", "state": state_data}, status=200)
                
            return JsonResponse({"error": "Destination not available."}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid request method'}, status=400)

@csrf_exempt
def get_game_state(request):
    if request.method == 'GET':
        username = request.GET.get('username')
        
        # Quick patch for Node 44 location to avoid wiping saves
        node44 = StoryNode.objects.filter(id=44).first()
        if node44 and node44.location and node44.location.name == "The Wastelands":
            loc_eins, _ = Location.objects.get_or_create(name="Eins City")
            node44.location = loc_eins
            node44.save()

        # Force reseed check so the DB is always updated on page load
        needs_reseed = not Item.objects.filter(item_name="Anti-Magic Plating").exists() or not Quest.objects.exists() or Choice.objects.filter(node_id=23).exists()
        if not StoryNode.objects.exists() or needs_reseed:
            seed_initial_data()

        try:
            user = User.objects.get(username=username)
            session = GameSession.objects.filter(user=user, is_active=True).first()
            
            if not session:
                return JsonResponse({"error": "No active game session found."}, status=404)
                
            ensure_story_items(session)
            return JsonResponse(serialize_game_session(session), status=200)
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found.'}, status=404)
            
    return JsonResponse({'error': 'Invalid request method'}, status=400)

def restore_session_from_state(session, state):
    if not state:
        return

    node_data = state.get('current_node') or {}
    node_id = node_data.get('id')
    if node_id:
        node = StoryNode.objects.filter(id=node_id).first()
        if node:
            session.current_node = node
            session.current_location = node.location or session.current_location
            session.save()

    stats = getattr(session, 'stats', None)
    if stats:
        stats.health = state.get('stats', {}).get('health', stats.health)
        stats.sanity = state.get('stats', {}).get('sanity', stats.sanity)
        stats.reputation = state.get('stats', {}).get('reputation', stats.reputation)
        stats.mana = state.get('stats', {}).get('mana', stats.mana)
        stats.defense = state.get('stats', {}).get('base_defense', stats.defense)
        stats.scrap = state.get('stats', {}).get('scrap', stats.scrap)
        stats.level = state.get('stats', {}).get('level', stats.level)
        stats.exp = state.get('stats', {}).get('exp', stats.exp)
        stats.stat_points = state.get('stats', {}).get('stat_points', stats.stat_points)
        stats.base_strength = state.get('stats', {}).get('base_strength', stats.base_strength)
        stats.base_intelligence = state.get('stats', {}).get('base_intelligence', stats.base_intelligence)
        stats.base_dexterity = state.get('stats', {}).get('base_dexterity', stats.base_dexterity)
        stats.save()

    session.inventory.all().delete()
    for inv in state.get('inventory', []):
        item_data = inv.get('item', {})
        if item_data.get('id'):
            item = Item.objects.filter(id=item_data['id']).first()
            if item and inv.get('quantity', 0) > 0:
                Inventory.objects.create(session=session, item=item, quantity=inv['quantity'])

    session.equipment.all().delete()
    for eq in state.get('equipment', []):
        item_data = eq.get('item', {})
        if item_data.get('id') and eq.get('slot'):
            item = Item.objects.filter(id=item_data['id']).first()
            if item:
                Equipment.objects.create(session=session, item=item, slot=eq['slot'])

    session.save()

@csrf_exempt
def save_game_state(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            slot_name = data.get('slot_name') or 'slot1'
            save_name = data.get('save_name') or slot_name
            is_autosave = data.get('is_autosave', False)
            state = data.get('state')

            if not username:
                return JsonResponse({'error': 'Username is required.'}, status=400)
            if not state:
                return JsonResponse({'error': 'Game state is required.'}, status=400)

            user = User.objects.get(username=username)
            session = GameSession.objects.filter(user=user, is_active=True).first()
            if not session:
                return JsonResponse({'error': 'No active game session found.'}, status=404)

            save_slot, _ = SaveSlot.objects.update_or_create(
                session=session,
                slot_name=slot_name,
                defaults={
                    'save_name': save_name,
                    'state_data': json.dumps(state),
                    'saved_node': session.current_node,
                    'is_autosave': is_autosave,
                    'saved_at': timezone.now()
                }
            )

            return JsonResponse({
                'message': 'Save successful.',
                'slot_name': save_slot.slot_name,
                'save_name': save_slot.save_name,
                'saved_at': save_slot.saved_at.isoformat()
            }, status=200)
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found.'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid request method'}, status=400)

@csrf_exempt
def load_game_state(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            slot_id = data.get('slot_id')
            slot_name = data.get('slot_name')
            state = data.get('state')

            user = User.objects.get(username=username)
            session = GameSession.objects.filter(user=user, is_active=True).first()
            if not session:
                return JsonResponse({'error': 'No active game session found.'}, status=404)

            if slot_id or slot_name:
                save_slot = None
                if slot_id:
                    save_slot = SaveSlot.objects.filter(session=session, id=slot_id).first()
                elif slot_name:
                    save_slot = SaveSlot.objects.filter(session=session, slot_name=slot_name).first()
                if not save_slot or not save_slot.state_data:
                    return JsonResponse({'error': 'Saved slot not found.'}, status=404)
                state = json.loads(save_slot.state_data)

            if not state:
                return JsonResponse({'error': 'Save state is required.'}, status=400)

            restore_session_from_state(session, state)
            ensure_story_items(session)
            return JsonResponse({'message': 'Load successful.', 'state': serialize_game_session(session)}, status=200)
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found.'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid request method'}, status=400)

@csrf_exempt
def list_save_slots(request):
    if request.method == 'GET':
        username = request.GET.get('username')
        try:
            user = User.objects.get(username=username)
            session = GameSession.objects.filter(user=user, is_active=True).first()
            if not session:
                return JsonResponse({'error': 'No active game session found.'}, status=404)

            saves = SaveSlot.objects.filter(session=session).order_by('-saved_at')
            slots = []
            for slot in saves:
                slots.append({
                    'id': slot.id,
                    'slot_name': slot.slot_name,
                    'save_name': slot.save_name,
                    'saved_at': slot.saved_at.isoformat(),
                    'is_autosave': slot.is_autosave
                })

            return JsonResponse({'saves': slots}, status=200)
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found.'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid request method'}, status=400)

@csrf_exempt
def delete_save_slot(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            slot_name = data.get('slot_name')

            if not slot_name:
                return JsonResponse({'error': 'slot_name is required.'}, status=400)

            user = User.objects.get(username=username)
            session = GameSession.objects.filter(user=user, is_active=True).first()
            if not session:
                return JsonResponse({'error': 'No active game session found.'}, status=404)

            save_slot = SaveSlot.objects.filter(session=session, slot_name=slot_name).first()
            if not save_slot:
                return JsonResponse({'error': 'Saved slot not found.'}, status=404)

            save_slot.delete()
            return JsonResponse({'message': 'Save deleted successfully.'}, status=200)
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found.'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid request method'}, status=400)

@csrf_exempt
def make_choice(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            choice_id = data.get('choice_id')
            player_hp = data.get('player_hp')
            player_mp = data.get('player_mp')
            loot_items = data.get('loot_items', [])
            exp_reward = int(data.get('exp_reward', 0))
            scrap_reward = int(data.get('scrap_reward', 0))
            
            if not choice_id:
                return JsonResponse({"error": "choice_id is required."}, status=400)
                
            user = User.objects.get(username=username)
            session = GameSession.objects.filter(user=user, is_active=True).first()
            
            if not session:
                return JsonResponse({"error": "No active game session found."}, status=404)
                
            if player_hp is not None or player_mp is not None:
                stats = getattr(session, 'stats', None)
                if stats:
                    max_h = 100
                    max_m = 100 + sum((getattr(eq.item, 'mana_boost', 0) or 0) for eq in session.equipment.all())
                    if player_hp is not None:
                        stats.health = max(0, min(int(player_hp), max_h))
                    if player_mp is not None:
                        stats.mana = max(0, min(int(player_mp), max_m))
                    stats.save()

            # Verify the choice belongs to the current node
            choice = get_object_or_404(Choice, id=choice_id, node=session.current_node)
            
            loot_text = ""
            
            # Add EXP and Level Up logic FIRST
            if exp_reward > 0 or scrap_reward > 0:
                stats = getattr(session, 'stats', None)
                if stats:
                    stats.scrap += scrap_reward
                    stats.exp += exp_reward
                    leveled_up = False
                    
                    while stats.exp >= stats.level * 100:
                        stats.exp -= stats.level * 100
                        stats.level += 1
                        stats.stat_points += 3
                        leveled_up = True
                    stats.save()
                    
                    exp_text = f"\n\n<span style='color:#ffcc00;'>[ Earned {exp_reward} EXP and {scrap_reward} Scrap ]</span>"
                    if leveled_up:
                        exp_text += f"\n<span style='color:#00ffcc; font-weight:bold;'>[ LEVEL UP! You are now Level {stats.level}! +3 Stat Points ]</span>"
                    loot_text += exp_text
            
            # Apply Consequences (modifiers to stats/inventory)
            consequences = Consequence.objects.filter(choice=choice)
            consequence_items = []
            for cons in consequences:
                if cons.effect_type in ['health', 'sanity', 'reputation']:
                    stats = getattr(session, 'stats', None)
                    if stats:
                        max_h = 100
                        if cons.effect_type == 'health':
                            stats.health = max(0, min((stats.health if stats.health > 0 else 100) + int(cons.effect_value), max_h))
                        elif cons.effect_type == 'sanity':
                            stats.sanity = max(0, min(stats.sanity + int(cons.effect_value), 100))
                        elif cons.effect_type == 'reputation':
                            stats.reputation += int(cons.effect_value)
                        stats.save()
                elif cons.effect_type == 'item':
                    item = Item.objects.filter(id=int(cons.effect_value)).first()
                    if item:
                        inv_item, _ = Inventory.objects.get_or_create(session=session, item=item, defaults={'quantity': 0})
                        inv_item.quantity += 1
                        inv_item.save()
                        consequence_items.append(item.item_name)
                        
            # Add the loot drops
            display_loot = list(loot_items) + consequence_items
            
            if display_loot:
                unique_items = set(display_loot)
                loot_strs = [f"{display_loot.count(item)}x {item}" for item in unique_items]
                loot_text += f"\n\n<span style='color:#00ffcc;'>[ Loot Collected: {', '.join(loot_strs)} ]</span>"
                
            if loot_items:
                for item_name in loot_items:
                    item = Item.objects.filter(item_name=item_name).first()
                    if item:
                        inv_item, _ = Inventory.objects.get_or_create(session=session, item=item, defaults={'quantity': 0})
                        inv_item.quantity += 1
                        inv_item.save()
                        
            # Deduct items consumed during combat
            consumed_items = data.get('consumed_items', [])
            if consumed_items:
                for item_name in consumed_items:
                    item = Item.objects.filter(item_name=item_name).first()
                    if item:
                        inv_item = Inventory.objects.filter(session=session, item=item).first()
                        if inv_item and inv_item.quantity > 0:
                            inv_item.quantity -= 1
                            if inv_item.quantity <= 0:
                                inv_item.delete()
                            else:
                                inv_item.save()
                
            # Log the player's choice
            PlayerChoice.objects.create(session=session, choice=choice)
            
            # Advance to the next node
            session.current_node = choice.next_node
            if choice.next_node.location:
                session.current_location = choice.next_node.location
            session.save()
            
            # Natural Healing logic between travel nodes
            travel_nodes = [11, 12, 14, 23, 24, 32, 42]
            if choice.next_node.id in travel_nodes:
                stats = session.stats
                if stats:
                    base_str = getattr(stats, 'base_strength', 10)
                    base_int = getattr(stats, 'base_intelligence', 10)
                    max_health = 100 + (base_str * 10) - 100
                    total_mana_boost = sum((getattr(eq.item, 'mana_boost', 0) or 0) for eq in getattr(session, 'equipment', []).all() if hasattr(session, 'equipment'))
                    max_mana = 100 + (base_int * 10) - 100 + total_mana_boost
                    
                    heal_hp = int(max_health * 0.3)
                    heal_mp = int(max_mana * 0.3)
                    stats.health = min(max_health, (stats.health if stats.health > 0 else 100) + heal_hp)
                    stats.mana = min(max_mana, stats.mana + heal_mp)
                    stats.save()
                    loot_text += f"\n\n<span style='color:#00ffcc;'>[ Natural Healing: Rested during travel. Recovered {heal_hp} HP and {heal_mp} MP. ]</span>"

            # Check Quest Completion
            if choice.next_node.id == 6:
                q = PlayerQuest.objects.filter(session=session, quest__key="main").first()
                if q and q.status != 'completed':
                    q.status = 'completed'
                    q.save()
                    stats = session.stats
                    stats.scrap += 500
                    stats.save()
                    loot_text += f"\n\n<span style='color:#00ffcc; font-weight:bold;'>[ Quest Completed: Adventurer Exam! Earned 500 Scrap. ]</span>"

            # Remove Anti-Magic Plating after Elysia fight
            if choice.next_node.id == 41:
                item_to_remove = Item.objects.filter(item_name="Anti-Magic Plating").first()
                if item_to_remove:
                    Inventory.objects.filter(session=session, item=item_to_remove).delete()
                    Equipment.objects.filter(session=session, item=item_to_remove).delete()
                    
            # Remove Mech Arm Prototype after arriving at Node 42
            if choice.next_node.id == 42:
                item_to_remove = Item.objects.filter(item_name="Mech Arm Prototype").first()
                if item_to_remove:
                    Inventory.objects.filter(session=session, item=item_to_remove).delete()
                    Equipment.objects.filter(session=session, item=item_to_remove).delete()
            
            ensure_story_items(session)
            
            state_data = serialize_game_session(session)
            if loot_text and state_data.get('current_node'):
                state_data['current_node']['narrative_text'] += loot_text
                
            return JsonResponse({
                "message": "Choice processed successfully.",
                "state": state_data
            }, status=200)
            
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found.'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
            
    return JsonResponse({'error': 'Invalid request method'}, status=400)
