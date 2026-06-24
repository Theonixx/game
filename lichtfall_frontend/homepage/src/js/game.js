document.addEventListener("DOMContentLoaded", () => {
    // Detect if running locally or on a public server
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    
    // TODO: Change this to your deployed backend API URL (e.g. "https://lichtfall-backend.onrender.com")
    const PRODUCTION_API_URL = "https://your-production-backend.onrender.com";
    
    const API_BASE_URL = isLocal 
        ? "http://127.0.0.1:8000/api/game" 
        : `${PRODUCTION_API_URL}/api/game`;
    const username = localStorage.getItem("username");

    // DOM Elements
    const storyTextContainer = document.querySelector(".content-storyline-topsection-text");
    const choicesContainer = document.querySelector(".content-storyline-bottomsection-buttons");
    const storylineUI = document.querySelector(".content-storyline");
    const combatUI = document.querySelector(".content-combat");
    
    // Combat DOM Elements
    const combatHeader = document.querySelector(".content-combat-topsection-header span");
    const combatText = document.querySelector(".content-combat-topsection-text span");
    const combatActionHeader = document.querySelector(".content-combat-bottomsection-header span");
    const combatButtonsContainer = document.querySelector(".content-combat-bottomsection-buttons");
    
    // Combat State Variables
    let currentEnemy = null;
    let combatChoiceId = null;
    let playerCombatHp = 100;
    let playerCombatOverheat = 0;
    let playerStatusAilments = [];
    let enemyStatusAilments = [];
    let hasRevivedThisBattle = false;
    let playerCombatMp = 100;
    let manalithMp = 0;
    let manalithMaxMp = 40; // Fixed capacity for Manalith fuel
    let combatTurnCount = 0;
    let combatConsumedItems = [];
    
    // New Combat Skills State
    let reversiCooldown = 0;
    let godhandActive = false;
    let godhandTurns = 0;
    let combatTotalDamageDealt = 0;
    let combatStrengthBuff = 0;
    let combatSpeedBuff = 0;
    
    // Equipment State Variables
    let selectedItemId = null;
    let selectedSlotName = null;
    let selectedCoreId = null;
    
    // Save System State Variables
    let latestGameState = null;
    let autoSaveEnabled = true;
    const saveSlots = [1, 2, 3];
    
    // Crafting State Variables
    let craftIng1 = null;
    let craftIng2 = null;
    let craftedItemName = null;
    const craftBoxes = document.querySelectorAll(".craft-box");

    // --- Inject Settings UI dynamically to ensure it exists and matches ---
    const settingsTab = document.getElementById("tab-settings");
    if (settingsTab) {
        settingsTab.innerHTML = `
            <div class="settings-panel">
                <div class="panel-title"><h3 style="color:#00ffcc;">GAME SETTINGS</h3></div>
                <div class="settings-controls">
                    <div class="settings-control-group">
                        <div class="settings-label">
                            <span>Master Volume</span>
                            <span id="sound-volume-value">50%</span>
                        </div>
                        <input type="range" id="sound-volume-slider" class="settings-slider" min="0" max="100" value="50">
                    </div>
                    <div class="settings-control-group" style="margin-top: 15px;">
                        <div class="settings-label">
                            <span>Music Volume</span>
                            <span id="music-volume-value">50%</span>
                        </div>
                        <input type="range" id="music-volume-slider" class="settings-slider" min="0" max="100" value="50">
                    </div>
                    <div class="settings-control-group" style="margin-top: 15px;">
                        <div class="settings-label">
                            <span>SFX Volume</span>
                            <span id="sfx-volume-value">50%</span>
                        </div>
                        <input type="range" id="sfx-volume-slider" class="settings-slider" min="0" max="100" value="50">
                    </div>
                    <div class="settings-control-group" style="margin-top: 15px;">
                        <div class="settings-label">
                            <span>Text Speed</span>
                            <span id="text-speed-value">50%</span>
                        </div>
                        <input type="range" id="text-speed-slider" class="settings-slider" min="0" max="100" value="50">
                    </div>
                    <div class="settings-control-group" style="margin-top: 25px; align-items: center;">
                        <button id="auto-save-toggle" class="action-btn" style="width: 60%;">Auto-Save: ON</button>
                    </div>
                </div>
            </div>
        `;
    }

    // --- Custom Tooltip Setup ---
    const tooltip = document.createElement("div");
    tooltip.id = "global-tooltip";
    document.body.appendChild(tooltip);

    function showTooltip(e, item, extraTip = "") {
        let statsHtml = "";
        let descHtml = item.description || "No description available.";

        if (item.item_name === "Manalith") {
            descHtml += "<br><br><span style='color:#00ffcc;'>Combat Effect:</span> <i>Fully restores 40 Fuel at the start of battle to power mech-limbs. When empty, actions will strain your own Mana.</i>";
            statsHtml += `<div class="tooltip-stat-item"><span>FUEL:</span> <span style="color:#ffcc00;">40 MAX</span></div>`;
        }

        if (item.equippable_slot) statsHtml += `<div class="tooltip-stat-item"><span>Slot:</span> <span>${item.equippable_slot}</span></div>`;
        if (item.strength_boost) statsHtml += `<div class="tooltip-stat-item"><span>STR:</span> <span style="color:#00ffcc;">+${item.strength_boost}</span></div>`;
        if (item.mana_boost) statsHtml += `<div class="tooltip-stat-item"><span>MANA:</span> <span style="color:#00ffcc;">+${item.mana_boost}</span></div>`;
        if (item.defense_boost) statsHtml += `<div class="tooltip-stat-item"><span>DEF:</span> <span style="color:#00ffcc;">+${item.defense_boost}</span></div>`;
        if (item.weight) statsHtml += `<div class="tooltip-stat-item"><span>Weight:</span> <span>${item.weight}</span></div>`;

        let tipHtml = extraTip ? `<div class="tooltip-tip">${extraTip}</div>` : "";

        tooltip.innerHTML = `
            <div class="tooltip-title">${item.item_name}</div>
            <div class="tooltip-desc">${descHtml}</div>
            ${statsHtml ? `<div class="tooltip-stats">${statsHtml}</div>` : ""}
            ${tipHtml}
        `;
        tooltip.style.display = "flex";
        moveTooltip(e);
    }

    function moveTooltip(e) {
        let x = e.clientX + 15;
        let y = e.clientY + 15;
        const rect = tooltip.getBoundingClientRect();
        
        if (x + rect.width > window.innerWidth) x = e.clientX - rect.width - 15;
        if (y + rect.height > window.innerHeight) y = e.clientY - rect.height - 15;
        
        tooltip.style.left = x + "px";
        tooltip.style.top = y + "px";
    }

    function hideTooltip() {
        tooltip.style.display = "none";
    }

    function showSkillTooltip(e, skill) {
        tooltip.innerHTML = `
            <div class="tooltip-title">${skill.item_name}</div>
            <div class="tooltip-desc">${skill.description}</div>
            <div class="tooltip-stats">
                <div class="tooltip-stat-item" style="color:#00ffcc; display:block; text-align:left; line-height: 1.4;">
                    ${skill.stats}
                </div>
            </div>
        `;
        tooltip.style.display = "flex";
        moveTooltip(e);
    }

    function renderCraftSelection() {
        if (!craftBoxes || craftBoxes.length === 0) return;

        [craftIng1, craftIng2].forEach((item, index) => {
            const box = craftBoxes[index];
            if (!box) return;
            if (item) {
                box.innerHTML = `<span style="font-size: 0.7rem; text-align: center; word-break: break-word; line-height: 1.1;">${item.item_name}</span>`;
                box.style.cursor = "pointer";
                box.onmouseenter = (e) => showTooltip(e, item, "Click to remove this ingredient");
                box.onmousemove = moveTooltip;
                box.onmouseleave = hideTooltip;
            } else {
                box.innerHTML = "";
                box.style.cursor = "default";
                box.onmouseenter = null;
                box.onmousemove = null;
                box.onmouseleave = null;
                hideTooltip(); // clear active tooltips if an item was removed
            }
        });

        if (craftBoxes[2]) {
            if (craftedItemName) {
                craftBoxes[2].innerHTML = `<span style="font-size: 0.7rem; text-align: center; color:#ffcc00; word-break: break-word; line-height: 1.1;">${craftedItemName}</span>`;
                craftBoxes[2].style.cursor = "pointer";
                craftBoxes[2].onmouseenter = (e) => {
                    tooltip.innerHTML = `
                        <div class="tooltip-title" style="color:#ffcc00;">${craftedItemName}</div>
                        <div class="tooltip-tip">Click to move crafted item to inventory</div>
                    `;
                    tooltip.style.display = "flex";
                    moveTooltip(e);
                };
                craftBoxes[2].onmousemove = moveTooltip;
                craftBoxes[2].onmouseleave = hideTooltip;
            } else {
                craftBoxes[2].innerHTML = "";
                craftBoxes[2].style.cursor = "default";
                craftBoxes[2].onmouseenter = null;
                craftBoxes[2].onmousemove = null;
                craftBoxes[2].onmouseleave = null;
                hideTooltip();
            }
        }
    }

    function formatTimestamp(iso) {
        if (!iso) return "Never";
        const date = new Date(iso);
        return date.toLocaleString();
    }

    async function fetchSaveMeta() {
        try {
            const res = await fetch(`${API_BASE_URL}/saves/?username=${username}`);
            if (!res.ok) return [];
            return (await res.json()).saves || [];
        } catch (e) {
            console.error("Fetch saves fail:", e);
            return [];
        }
    }

    async function saveSlotDB(slotName, saveName, state, isAuto = false) {
        try {
            const res = await fetch(`${API_BASE_URL}/save/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, slot_name: slotName, save_name: saveName, state, is_autosave: isAuto })
            });
            if (!res.ok) {
                const err = await res.json();
                console.error("Save error:", err);
                return false;
            }
            return true;
        } catch (e) {
            console.error("Save request error:", e);
            return false;
        }
    }

    function updateSaveStatus(message) {
        const status = document.getElementById("save-system-status");
        if (status) {
            status.textContent = message;
        }
    }

    async function refreshSaveUI() {
        const container = document.getElementById("save-slot-list");
        if (!container) return;

        const saves = await fetchSaveMeta();
        container.innerHTML = '';

        // 1. Generate the Special Auto Save Slot
        const autoEntry = saves.find(s => s.slot_name === 'autosave');
        container.insertAdjacentHTML('beforeend', `
            <div class="save-slot-card" style="border-color: #00ffcc;">
                <h5 style="color: #00ffcc;">Auto Save</h5>
                <p><strong>Name:</strong> ${autoEntry?.save_name || 'Empty'}</p>
                <p><strong>Last saved:</strong> ${formatTimestamp(autoEntry?.saved_at)}</p>
                <div class="save-slot-actions">
                    <button class="action-btn save-slot-btn" data-slot="autosave" data-action="load" ${!autoEntry ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>Load</button>
                </div>
            </div>
        `);

        // 2. Generate the Manual Save Slots
        for (const slotId of saveSlots) {
            const entry = saves.find(s => s.slot_name === `slot${slotId}`);
            container.insertAdjacentHTML('beforeend', `
                <div class="save-slot-card">
                    <h5>Save Slot ${slotId}</h5>
                    <p><strong>Name:</strong> ${entry?.save_name || 'Empty'}</p>
                    <p><strong>Last saved:</strong> ${formatTimestamp(entry?.saved_at)}</p>
                    <div class="save-slot-actions">
                        <button class="action-btn save-slot-btn" data-slot="${slotId}" data-action="save">Save</button>
                        <button class="action-btn save-slot-btn" data-slot="${slotId}" data-action="load" ${!entry ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>Load</button>
                        <button class="action-btn save-slot-btn" data-slot="${slotId}" data-action="delete" ${!entry ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>Delete</button>
                    </div>
                </div>
            `);
        }
    }

    async function saveGameSlot(slotId, isAuto = false) {
        if (!username) {
            updateSaveStatus("Not logged in. Cannot save.");
            console.error("Username not set");
            return;
        }
        if (!latestGameState) {
            updateSaveStatus("No game state to save.");
            return;
        }

        const saveName = isAuto ? 'Auto Save' : prompt(`Name slot ${slotId}:`, `Slot ${slotId}`) || `Slot ${slotId}`;
        const ok = await saveSlotDB(`slot${slotId}`, saveName, latestGameState, isAuto);
        updateSaveStatus(ok ? `Saved ${saveName}` : `Save fail slot ${slotId}`);
        await refreshSaveUI();
    }

    async function loadGameSlot(slotId) {
        const slotName = slotId === 'autosave' ? 'autosave' : `slot${slotId}`;
        try {
            const res = await fetch(`${API_BASE_URL}/load/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, slot_name: slotName })
            });
            if (!res.ok) {
                const err = await res.json();
                updateSaveStatus(err.error || `Load fail slot ${slotId}`);
                return;
            }
            updateUI((await res.json()).state);
            updateSaveStatus(`Loaded slot ${slotId}`);
            
            // Close the settings/save overlay so the player sees the loaded game
            const overlay = document.getElementById("game-overlay");
            if (overlay && !overlay.classList.contains("hidden")) {
                overlay.classList.add("hidden");
            }
        } catch (e) {
            console.error(e);
            updateSaveStatus(`Load err slot ${slotId}`);
        }
    }

    async function deleteGameSlot(slotId) {
        const slotName = slotId === 'autosave' ? 'autosave' : `slot${slotId}`;
        try {
            const res = await fetch(`${API_BASE_URL}/delete_save/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, slot_name: slotName })
            });
            updateSaveStatus(res.ok ? `Deleted slot ${slotId}` : `Delete fail`);
            await refreshSaveUI();
        } catch (e) {
            updateSaveStatus(`Delete err: ${e.message}`);
        }
    }

    async function syncGameState() {
        if (!username) return;
        try {
            const res = await fetch(`${API_BASE_URL}/state/?username=${username}`);
            if (res.ok) {
                const data = await res.json();
                if (data.state) {
                    latestGameState = data.state;
                    console.log("Game state synced on page load");
                }
            }
        } catch (e) {
            console.error("Failed to sync game state:", e);
        }
    }

    async function autoSaveGame() {
        if (!autoSaveEnabled || !latestGameState) return;
        await saveSlotDB('autosave', 'Auto Save', latestGameState, true);
        updateSaveStatus('Auto-saved');
        const overlay = document.getElementById("game-overlay");
        if (overlay && !overlay.classList.contains("hidden")) {
            refreshSaveUI(); // Real-time UI refresh if looking at saves while an autosave triggers
        }
    }

    function refreshRightSideStats(gameState) {
        const stats = gameState?.stats || {};
        const playerSpans = document.querySelectorAll('.statistics-charStats ul li span');

        if (playerSpans.length >= 4) {
            playerSpans[0].textContent = `${stats.health ?? 100} / ${stats.max_health ?? 100}`;
            playerSpans[1].textContent = `${stats.mana ?? 100} / ${stats.max_mana ?? 100}`;
            playerSpans[2].textContent = stats.strength ?? 0;
            playerSpans[3].textContent = stats.intelligence ?? 0;
        }

        const sanitySpan = document.querySelector('.statistics-charSanity ul li span');
        if (sanitySpan) {
            sanitySpan.textContent = `${stats.sanity ?? 0}%`;
        }

        const enemySpans = document.querySelectorAll('.statistics-enemyStats ul li span');
        if (enemySpans.length >= 5) {
            enemySpans[0].textContent = currentEnemy?.name || '[Name]';
            enemySpans[1].textContent = currentEnemy?.hp != null ? `${currentEnemy.hp} / ${currentEnemy.maxHp}` : '[HP]';
            enemySpans[2].textContent = currentEnemy?.mp ?? 'N/A';
            enemySpans[3].textContent = currentEnemy?.strength ?? 'N/A';
            enemySpans[4].textContent = currentEnemy?.intelligence ?? 'N/A';
        }
    }

    // Inn functionality setup
    const innBtn = document.getElementById("inn-btn");
    if (innBtn) {
        innBtn.addEventListener("click", async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/inn/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: username })
                });
                if (response.ok) {
                    const data = await response.json();
                    updateUI(data.state);
                } else {
                    const err = await response.json();
                    alert(err.error || "Could not rest.");
                }
            } catch(e) {
                console.error("Inn error:", e);
            }
        });
    }

    document.addEventListener('click', async (event) => {
        const target = event.target;
        if (!target.matches('.save-slot-btn')) return;
        const slotRaw = target.dataset.slot;
        const slotId = slotRaw === 'autosave' ? 'autosave' : parseInt(slotRaw, 10);
        const action = target.dataset.action;
        if (action === 'save') {
            await saveGameSlot(slotId);
        } else if (action === 'load') {
            await loadGameSlot(slotId);
        } else if (action === 'delete') {
            await deleteGameSlot(slotId);
        }
    });

    const autoSaveToggle = document.getElementById('auto-save-toggle');
    if (autoSaveToggle) {
        autoSaveToggle.textContent = `Auto-Save: ${autoSaveEnabled ? 'ON' : 'OFF'}`;
        autoSaveToggle.style.backgroundColor = autoSaveEnabled ? 'white' : 'transparent';
        autoSaveToggle.style.color = autoSaveEnabled ? 'black' : 'white';

        autoSaveToggle.addEventListener('click', () => {
            autoSaveEnabled = !autoSaveEnabled;
            autoSaveToggle.textContent = `Auto-Save: ${autoSaveEnabled ? 'ON' : 'OFF'}`;
            autoSaveToggle.style.backgroundColor = autoSaveEnabled ? 'white' : 'transparent';
            autoSaveToggle.style.color = autoSaveEnabled ? 'black' : 'white';
            updateSaveStatus(`Auto-save ${autoSaveEnabled ? 'enabled' : 'disabled'}.`);
            if (typeof updateBackendSettings === 'function') updateBackendSettings('auto_save', autoSaveEnabled);
            if (typeof playMenuTransitionSound === 'function') playMenuTransitionSound();
        });
    }

    const refreshSaveListBtn = document.getElementById('refresh-save-list');
    if (refreshSaveListBtn) {
        refreshSaveListBtn.addEventListener('click', refreshSaveUI);
    }

    window.refreshSaveUI = refreshSaveUI;

    // Debug Function: Check save readiness
    window.debugSave = async function() {
        console.log("=== Save Debug ===");
        console.log("Username:", username);
        console.log("Latest Game State:", latestGameState);
        console.log("API Base:", API_BASE_URL);
        if (username && latestGameState) {
            console.log("✓ Ready to save!");
        } else {
            console.error("✗ Cannot save - missing:", !username ? "username" : !latestGameState ? "game_state" : "unknown");
        }
    };

    const textSpeedSlider = document.getElementById('text-speed-slider');
    const textSpeedValue = document.getElementById('text-speed-value');
    const soundVolumeSlider = document.getElementById('sound-volume-slider');
    const soundVolumeValue = document.getElementById('sound-volume-value');
    const musicVolumeSlider = document.getElementById('music-volume-slider');
    const musicVolumeValue = document.getElementById('music-volume-value');
    const sfxVolumeSlider = document.getElementById('sfx-volume-slider');
    const sfxVolumeValue = document.getElementById('sfx-volume-value');

    // Load custom values from localStorage for Music and SFX if available
    if (musicVolumeSlider) {
        const savedMusicVol = localStorage.getItem('musicVol');
        if (savedMusicVol !== null) {
            musicVolumeSlider.value = savedMusicVol;
            if (musicVolumeValue) musicVolumeValue.textContent = `${savedMusicVol}%`;
        }
    }
    if (sfxVolumeSlider) {
        const savedSfxVol = localStorage.getItem('sfxVol');
        if (savedSfxVol !== null) {
            sfxVolumeSlider.value = savedSfxVol;
            if (sfxVolumeValue) sfxVolumeValue.textContent = `${savedSfxVol}%`;
        }
    }

    function applySoundVolume() {
        const master = (soundVolumeSlider ? Number(soundVolumeSlider.value) : 50) / 100;
        const music = (musicVolumeSlider ? Number(musicVolumeSlider.value) : 50) / 100;
        const sfx = (sfxVolumeSlider ? Number(sfxVolumeSlider.value) : 50) / 100;

        const masterMusic = master * music;
        const masterSfx = master * sfx;

        if (menuTransitionSound) menuTransitionSound.volume = masterSfx * 0.35;
        if (startJourneySound) startJourneySound.volume = masterSfx * 0.35;
        if (typeSound) typeSound.volume = masterSfx;
        if (gotHitSound) gotHitSound.volume = masterSfx * 0.5;
        
        if (fightingMusic) fightingMusic.volume = masterMusic * 0.35;
        if (fightingMusic2) fightingMusic2.volume = masterMusic * 0.35;
        if (fightingMusic3) fightingMusic3.volume = masterMusic * 0.35;
        if (fightingMusic4) fightingMusic4.volume = masterMusic * 0.35;
        if (openingMusic && currentBGM === openingMusic) openingMusic.volume = masterMusic * 0.35;
        if (einsCityMusic && currentBGM === einsCityMusic) einsCityMusic.volume = masterMusic * 0.35;
        if (helheimMusic && currentBGM === helheimMusic) helheimMusic.volume = masterMusic * 0.35;
        if (alfheimMusic && currentBGM === alfheimMusic) alfheimMusic.volume = masterMusic * 0.35;
        if (holyForgeMusic && currentBGM === holyForgeMusic) holyForgeMusic.volume = masterMusic * 0.35;
        if (currentFightingMusic) currentFightingMusic.volume = masterMusic * 0.35;
    }

    window.updateBackendSettings = async function(key, value) {
        try {
            await fetch(`${API_BASE_URL}/settings/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: username, [key]: value })
            });
        } catch(e) {
            console.error("Failed to save setting:", e);
        }
    };

    if (soundVolumeSlider && soundVolumeValue) {
        soundVolumeSlider.addEventListener('change', () => {
            updateBackendSettings('sound_volume', soundVolumeSlider.value);
            if (typeof playMenuTransitionSound === 'function') playMenuTransitionSound();
        });
        soundVolumeSlider.addEventListener('input', () => {
            soundVolumeValue.textContent = `${soundVolumeSlider.value}%`;
            applySoundVolume();
        });
    }

    if (musicVolumeSlider && musicVolumeValue) {
        musicVolumeSlider.addEventListener('change', () => {
            localStorage.setItem('musicVol', musicVolumeSlider.value);
            if (typeof playMenuTransitionSound === 'function') playMenuTransitionSound();
        });
        musicVolumeSlider.addEventListener('input', () => {
            musicVolumeValue.textContent = `${musicVolumeSlider.value}%`;
            applySoundVolume();
        });
    }

    if (sfxVolumeSlider && sfxVolumeValue) {
        sfxVolumeSlider.addEventListener('change', () => {
            localStorage.setItem('sfxVol', sfxVolumeSlider.value);
            if (typeof playMenuTransitionSound === 'function') playMenuTransitionSound();
        });
        sfxVolumeSlider.addEventListener('input', () => {
            sfxVolumeValue.textContent = `${sfxVolumeSlider.value}%`;
            applySoundVolume();
        });
    }

    if (textSpeedSlider && textSpeedValue) {
        textSpeedSlider.addEventListener('change', () => {
            updateBackendSettings('text_speed', textSpeedSlider.value);
            if (typeof playMenuTransitionSound === 'function') playMenuTransitionSound();
        });
        textSpeedSlider.addEventListener('input', () => {
            textSpeedValue.textContent = `${textSpeedSlider.value}%`;
        });
    }

    const settingsBtn = document.querySelector(".settings-btn");
    if (settingsBtn) {
        settingsBtn.addEventListener("click", () => {
            const overlay = document.getElementById("game-overlay");
            const tabContents = document.querySelectorAll("#game-overlay .tab-content");
            const settingsTab = document.getElementById("tab-settings");
            if (!overlay || !settingsTab) {
                alert("Settings menu not ready yet.");
                return;
            }
            overlay.classList.remove("hidden");
            overlay.classList.add("settings-open");
            playMenuTransitionSound();
            document.getElementById("overlay-title").textContent = "SETTINGS";
            tabContents.forEach(tab => tab.classList.remove("active"));
            settingsTab.classList.add("active");
        });
    }

    function clearCraftSlot(index) {
        if (index === 0) {
            craftIng1 = null;
        }
        if (index === 1) {
            craftIng2 = null;
        }
        if (craftBoxes[2]) {
            craftBoxes[2].innerHTML = "";
        }
        renderCraftSelection();
    }

    if (craftBoxes && craftBoxes.length >= 2) {
        craftBoxes.forEach((box, index) => {
            if (index >= 2) return;
            
            // Drag and drop for crafting slots
            box.addEventListener("dragover", (e) => {
                e.preventDefault();
                box.style.borderColor = "#00ffcc";
            });
            box.addEventListener("dragleave", (e) => {
                box.style.borderColor = "";
            });
            box.addEventListener("drop", (e) => {
                e.preventDefault();
                box.style.borderColor = "";
                try {
                    const dataStr = e.dataTransfer.getData('text/plain');
                    if (!dataStr) return;
                    const data = JSON.parse(dataStr);
                    if (data.type === 'inventory' && data.item) {
                        const invItem = latestGameState.inventory.find(i => i.item.id === data.item.id);
                        if (!invItem) return;
                        
                        if (index === 0) {
                            craftIng1 = invItem.item;
                        } else if (index === 1) {
                            if (craftIng1 && craftIng1.id === invItem.item.id && invItem.quantity < 2) {
                                alert("You need at least 2 of this item to use it twice.");
                                return;
                            }
                            craftIng2 = invItem.item;
                        }
                        if (craftBoxes[2]) {
                            craftBoxes[2].innerHTML = "";
                        }
                        renderCraftSelection();
                    }
                } catch (err) {
                    console.error("Craft drop error:", err);
                }
            });

            box.addEventListener("click", () => {
                if ((index === 0 && craftIng1) || (index === 1 && craftIng2)) {
                    clearCraftSlot(index);
                }
            });
        });
    }

    if (craftBoxes && craftBoxes.length >= 3) {
        const resultBox = craftBoxes[2];
        resultBox.addEventListener("click", () => {
            if (craftedItemName) {
                craftedItemName = null;
                resultBox.innerHTML = "";
                resultBox.style.cursor = "default";
                resultBox.title = "";
            }
        });
    }

    // Drag and Drop for Equipment
    const initEquipSlots = document.querySelectorAll(".equip-item .limb-slot");
    initEquipSlots.forEach(slot => {
        const slotName = slot.nextElementSibling.textContent.trim();
        slot.addEventListener("dragover", (e) => {
            e.preventDefault();
            slot.style.borderColor = "#00ffcc";
        });
        slot.addEventListener("dragleave", (e) => {
            slot.style.borderColor = (selectedSlotName === slotName) ? "#ffcc00" : "white";
        });
        slot.addEventListener("drop", async (e) => {
            e.preventDefault();
            slot.style.borderColor = (selectedSlotName === slotName) ? "#ffcc00" : "white";
            try {
                const dataStr = e.dataTransfer.getData('text/plain');
                if (!dataStr) return;
                const data = JSON.parse(dataStr);
                if (data.type === 'inventory') {
                    const response = await fetch(`${API_BASE_URL}/equip/`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ username: username, item_id: data.itemId, slot: slotName })
                    });
                    if (response.ok) {
                        const resData = await response.json();
                        updateUI(resData.state); // Instant refresh
                    } else {
                        const err = await response.json();
                        alert(err.error || "Failed to equip item.");
                    }
                }
            } catch(err) {
                console.error("Drop equip error:", err);
            }
        });
    });

    // Drag and Drop for Unequipping (Drop on inventory grid in Mech Limbs tab)
    const mechLimbsGrid = document.querySelector("#tab-mech-limbs .scrollable-grid");
    if (mechLimbsGrid) {
        mechLimbsGrid.addEventListener("dragover", (e) => {
            e.preventDefault();
        });
        mechLimbsGrid.addEventListener("drop", async (e) => {
            e.preventDefault();
            try {
                const dataStr = e.dataTransfer.getData('text/plain');
                if (!dataStr) return;
                const data = JSON.parse(dataStr);
                if (data.type === 'equipment') {
                    const response = await fetch(`${API_BASE_URL}/unequip/`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ username: username, slot: data.slotName })
                    });
                    if (response.ok) {
                        const resData = await response.json();
                        updateUI(resData.state); // Instant refresh
                    } else {
                        const err = await response.json();
                        alert(err.error || "Failed to unequip item.");
                    }
                }
            } catch(err) {
                console.error("Drop unequip error:", err);
            }
        });
    }

    // Typewriter State Variables
    let typewriterTimeout = null;
    let autoTimeout = null;
    let isTyping = false;
    let storyLines = [];
    let currentLineIndex = 0;
    let currentLineElement = null;
    let autoAdvance = true;
    const typeSound = new Audio("src/audio/typewriter.mp3");
    typeSound.loop = true;
    const menuTransitionSound = new Audio("src/audio/button-hover.mp3");
    menuTransitionSound.preload = "auto";
    menuTransitionSound.volume = 0.35;
    menuTransitionSound.load();
    menuTransitionSound.onerror = () => {
        console.warn('Menu transition sound failed to load, falling back to typewriter sound.');
        menuTransitionSound.src = "src/audio/typewriter.mp3";
        menuTransitionSound.load();
    };
    const startJourneySound = new Audio("src/audio/start jouney btn.mp3");
    startJourneySound.preload = "auto";
    startJourneySound.volume = 0.35;
    startJourneySound.loop = true;
    startJourneySound.load();

    const fightingMusic = new Audio("src/audio/fighting_msc.mp3");
    fightingMusic.preload = "auto";
    fightingMusic.volume = 0.35;
    fightingMusic.loop = true;
    fightingMusic.load();

    const fightingMusic2 = new Audio("src/audio/fighting_msc2.mp3");
    fightingMusic2.preload = "auto";
    fightingMusic2.volume = 0.35;
    fightingMusic2.loop = true;
    fightingMusic2.load();

    const fightingMusic3 = new Audio("src/audio/fighting_msc3.mp3");
    fightingMusic3.preload = "auto";
    fightingMusic3.volume = 0.35;
    fightingMusic3.loop = true;
    fightingMusic3.load();

    const fightingMusic4 = new Audio("src/audio/fighting_msc4.mp3");
    fightingMusic4.preload = "auto";
    fightingMusic4.volume = 0.35;
    fightingMusic4.loop = true;
    fightingMusic4.load();

    const fightingTracks = [fightingMusic, fightingMusic2, fightingMusic3, fightingMusic4];
    let currentFightingTrackIndex = 0;

    const openingMusic = new Audio("src/audio/opening.mp3");
    openingMusic.preload = "auto";
    openingMusic.volume = 0;
    openingMusic.loop = true;
    openingMusic.load();

    const einsCityMusic = new Audio("src/audio/eins city.mp3");
    einsCityMusic.preload = "auto";
    einsCityMusic.volume = 0;
    einsCityMusic.loop = true;
    einsCityMusic.load();

    const helheimMusic = new Audio("src/audio/helheim sanctuary.mp3");
    helheimMusic.preload = "auto";
    helheimMusic.volume = 0;
    helheimMusic.loop = true;
    helheimMusic.load();

    const alfheimMusic = new Audio("src/audio/alfheim.mp3");
    alfheimMusic.preload = "auto";
    alfheimMusic.volume = 0;
    alfheimMusic.loop = true;
    alfheimMusic.load();

    const holyForgeMusic = new Audio("src/audio/holy forge gate.mp3");
    holyForgeMusic.preload = "auto";
    holyForgeMusic.volume = 0;
    holyForgeMusic.loop = true;
    holyForgeMusic.load();

    const gotHitSound = new Audio("src/audio/gothit1.mp3");
    gotHitSound.preload = "auto";
    gotHitSound.volume = 0.5;
    gotHitSound.load();

    let journeyBgPlaying = false;
    let fightingBgPlaying = false;
    let currentFightingMusic = null;
    let currentBGM = null;

    function playGotHitSound() {
        gotHitSound.currentTime = 0;
        gotHitSound.play().catch(e => console.warn("got hit sound failed", e));
    }

    function crossfadeBGM(newBGM) {
        if (currentBGM === newBGM) {
            if (currentBGM && currentBGM.paused) {
                currentBGM.play().catch(e => console.warn("BGM play failed", e));
            }
            return;
        }
        
        let master = soundVolumeSlider ? (Number(soundVolumeSlider.value) / 100) : 0.5;
        let music = musicVolumeSlider ? (Number(musicVolumeSlider.value) / 100) : 0.5;
        const targetVol = master * music * 0.35;
        
        if (currentBGM) {
            let oldBGM = currentBGM;
            if (oldBGM.fadeInInterval) clearInterval(oldBGM.fadeInInterval);
            if (oldBGM.fadeOutInterval) clearInterval(oldBGM.fadeOutInterval);
            let fadeStep = oldBGM.volume / 20;
            oldBGM.fadeOutInterval = setInterval(() => {
                if (oldBGM.volume > fadeStep && fadeStep > 0) {
                    oldBGM.volume -= fadeStep;
                } else {
                    oldBGM.volume = 0;
                    clearInterval(oldBGM.fadeOutInterval);
                    oldBGM.pause();
                    oldBGM.currentTime = 0;
                }
            }, 100);
        }
        
        currentBGM = newBGM;
        
        if (currentBGM) {
            if (currentBGM.fadeOutInterval) clearInterval(currentBGM.fadeOutInterval);
            if (currentBGM.fadeInInterval) clearInterval(currentBGM.fadeInInterval);
            currentBGM.volume = 0;
            currentBGM.play().catch(e => console.warn("BGM play failed", e));
            let fadeStep = targetVol / 20;
            currentBGM.fadeInInterval = setInterval(() => {
                if (currentBGM.volume + fadeStep < targetVol && fadeStep > 0) {
                    currentBGM.volume += fadeStep;
                } else {
                    currentBGM.volume = targetVol;
                    clearInterval(currentBGM.fadeInInterval);
                }
            }, 100);
        }
    }

    window.playMenuTransitionSound = function playMenuTransitionSound() {
        menuTransitionSound.currentTime = 0;
        menuTransitionSound.play().catch((error) => {
            console.warn('Menu transition sound playback failed:', error);
        });
    };

    function playStartJourneyBgSound() {
        if (journeyBgPlaying) return;
        journeyBgPlaying = true;
        startJourneySound.currentTime = 0;
        startJourneySound.play().catch((error) => {
            journeyBgPlaying = false;
            console.warn('Journey background sound playback failed:', error);
        });
    }

    function stopStartJourneyBgSound() {
        if (!journeyBgPlaying) return;
        startJourneySound.pause();
        startJourneySound.currentTime = 0;
        journeyBgPlaying = false;
    }

    let fightingFadeOutInterval = null;

    function playFightingMusic() {
        if (fightingBgPlaying) return;
        fightingBgPlaying = true;
        currentFightingMusic = Math.random() < 0.5 ? fightingMusic : fightingMusic2;
        
        if (fightingFadeOutInterval) {
            clearInterval(fightingFadeOutInterval);
            fightingFadeOutInterval = null;
            if (currentFightingMusic) {
                currentFightingMusic.pause();
                currentFightingMusic.currentTime = 0;
            }
        }
        
        currentFightingMusic = fightingTracks[currentFightingTrackIndex];
        currentFightingTrackIndex = (currentFightingTrackIndex + 1) % fightingTracks.length;
        
        let master = soundVolumeSlider ? Number(soundVolumeSlider.value) : 50;
        let music = musicVolumeSlider ? Number(musicVolumeSlider.value) : 50;
        currentFightingMusic.volume = (master / 100) * (music / 100) * 0.35;
        
        currentFightingMusic.currentTime = 0;
        currentFightingMusic.play().catch((error) => {
            fightingBgPlaying = false;
            console.warn('Fighting music playback failed:', error);
        });
    }

    function fadeOutFightingMusic() {
        if (!fightingBgPlaying || !currentFightingMusic) return;
        fightingBgPlaying = false; // Prevent overlapping fadeouts
        
        if (fightingFadeOutInterval) clearInterval(fightingFadeOutInterval);
        
        let fadeStep = currentFightingMusic.volume / 20;
        fightingFadeOutInterval = setInterval(() => {
            if (currentFightingMusic.volume > fadeStep && fadeStep > 0) {
                currentFightingMusic.volume -= fadeStep;
            } else {
                currentFightingMusic.volume = 0;
                clearInterval(fightingFadeOutInterval);
                fightingFadeOutInterval = null;
                currentFightingMusic.pause();
                currentFightingMusic.currentTime = 0;
                let master = soundVolumeSlider ? Number(soundVolumeSlider.value) : 50;
                let music = musicVolumeSlider ? Number(musicVolumeSlider.value) : 50;
                currentFightingMusic.volume = (master / 100) * (music / 100) * 0.35; // Re-apply current setting after fade
            }
        }, 100);
    }

    // Ensure combat UI is hidden on initial load
    if (combatUI) combatUI.style.display = "none";
    
    // --- Story Text Click Listener (Line-by-Line Progression) ---
    storyTextContainer.style.cursor = "pointer";
    storyTextContainer.addEventListener("click", () => {
        if (isTyping) {
            // Instantly finish typing the current line
            isTyping = false;
            clearTimeout(typewriterTimeout);
            if (currentLineElement && storyLines[currentLineIndex]) {
                currentLineElement.innerHTML = storyLines[currentLineIndex];
            }
            typeSound.pause();
            typeSound.currentTime = 0;
            onLineFinished();
        } else {
            // Advance to the next line if the current one is done
            if (currentLineIndex < storyLines.length - 1) {
                clearTimeout(autoTimeout);
                currentLineIndex++;
                playNextLine();
            } else if (currentLineIndex === storyLines.length - 1 && choicesContainer.style.visibility === "hidden") {
                clearTimeout(autoTimeout);
                currentLineIndex++;
                playNextLine(); // Triggers the choices to show
            }
        }
    });

    // --- Auto Button Listener ---
    const autoBtn = document.getElementById("auto-btn");
    if (autoBtn) {
        // Initialize UI for default true
        autoBtn.textContent = `Auto: ON`;
        autoBtn.style.background = '#00ffcc';
        autoBtn.style.color = '#000';

        autoBtn.addEventListener("click", () => {
            autoAdvance = !autoAdvance;
            autoBtn.textContent = `Auto: ${autoAdvance ? 'ON' : 'OFF'}`;
            autoBtn.style.background = autoAdvance ? '#00ffcc' : 'transparent';
            autoBtn.style.color = autoAdvance ? '#000' : '#00ffcc';
            
            // If turned on while idle, instantly start the next line
            if (autoAdvance && !isTyping && currentLineIndex < storyLines.length - 1) {
                clearTimeout(autoTimeout);
                currentLineIndex++;
                playNextLine();
            } else if (autoAdvance && !isTyping && currentLineIndex === storyLines.length - 1 && choicesContainer.style.visibility === "hidden") {
                clearTimeout(autoTimeout);
                currentLineIndex++;
                playNextLine();
            }
        });
    }

    // If no user is logged in, boot them back to login
    if (!username) {
        window.location.href = "../user-auth/login.html";
        return;
    }

    // Set Player Alias in the top-left Header
    const aliasSpan = document.getElementById("header-alias");
    if (aliasSpan) aliasSpan.textContent = username;

    // Stat Allocation Handlers
    document.querySelectorAll(".stat-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const stat = btn.getAttribute("data-stat");
            try {
                const response = await fetch(`${API_BASE_URL}/allocate_stat/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: username, stat: stat })
                });
                if (response.ok) {
                    const data = await response.json();
                    updateUI(data.state);
                } else {
                    const err = await response.json();
                    console.error("Stat allocation failed:", err);
                    // Mute the alert, as this endpoint might not exist yet until Phase 4
                }
            } catch (e) {
                console.error("Stat allocation error:", e);
            }
        });
    });

    // --- 1. Fetch Current Game State ---
    async function fetchGameState() {
        try {
            if (!username) {
                console.warn("Username not set. User not logged in.");
                return;
            }
            const response = await fetch(`${API_BASE_URL}/state/?username=${username}`);
            
            if (response.status === 404) {
                console.log("No active session. Starting new game.");
                // No active session found, start a new game!
                startNewGame();
            } else if (response.ok) {
                const data = await response.json();
                console.log("Game state fetched:", data);
                updateUI(data);
            } else {
                console.error("Failed to fetch game state. Status:", response.status);
                storyTextContainer.innerHTML = `<p style='color:red; text-align:center;'><br><b>Server Error (${response.status})</b><br><br>The backend crashed while loading your save.<br>Make sure you ran: <i>python manage.py migrate</i></p>`;
            }
        } catch (error) {
            console.error("Network error:", error);
            storyTextContainer.innerHTML = "<p style='color:red;'>Failed to connect to the server.</p>";
        }
    }

    // --- 2. Start a New Game ---
    async function startNewGame() {
        try {
            const response = await fetch(`${API_BASE_URL}/start/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: username })
            });

            if (response.status === 201) {
                const data = await response.json();
                updateUI(data);
            }
        } catch (error) {
            console.error("Failed to start new game:", error);
        }
    }

    // --- 3. Make a Choice ---
    async function makeChoice(choiceId, hp = null, mp = null, lootItems = [], consumedItems = [], expReward = 0, scrapReward = 0) {
        try {
            const payload = { 
                username: username,
                choice_id: choiceId,
                loot_items: lootItems,
                consumed_items: consumedItems,
                exp_reward: expReward,
                scrap_reward: scrapReward
            };
            if (hp !== null) payload.player_hp = hp;
            if (mp !== null) payload.player_mp = mp;

            const response = await fetch(`${API_BASE_URL}/choice/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                updateUI(data.state); // Refresh the UI with the next node
            }
        } catch (error) {
            console.error("Failed to process choice:", error);
        }
    }

    // --- 4c. Tab Unlocking System (Tutorial Progression) ---
    function updateTabLocks(nodeId) {
        const navBtns = document.querySelectorAll(".navigation-btns-action");
        navBtns.forEach(btn => {
            const text = btn.textContent.toLowerCase();
            let isUnlocked = false;
            let lockReason = "Locked. Progress the story to unlock.";

            // Define unlocking milestones based on Story Node IDs
            if (text.includes("character") || text.includes("settings")) {
                isUnlocked = true; // Always available
            } else if (text.includes("quest")) {
                isUnlocked = nodeId >= 4; // Unlocks when arriving at Eins City
            } else if (text.includes("inventory") || text.includes("mech limb")) {
                isUnlocked = nodeId >= 6; // Unlocks after getting the Manalith
            } else if (text.includes("workshop")) {
                isUnlocked = nodeId >= 10; // Unlocks when Merlin talks about crafting
            } else if (text.includes("world map") || text.includes("map")) {
                const hasMechArmEquipped = latestGameState?.equipment?.some(eq => eq.item.item_name === "Mech Arm Prototype");
                const hasColossusCore = latestGameState?.equipment?.some(eq => eq.slot === "Soul Core" && eq.item.item_name.includes("Colossus Core"));
                const hasMartyrCore = latestGameState?.equipment?.some(eq => eq.slot === "Soul Core" && eq.item.item_name.includes("Martyr's Retribution"));
                const hasTrueLimbs = latestGameState?.equipment?.some(eq => eq.item.item_name === "True Mech Limbs");

                isUnlocked = (nodeId >= 11);
                
                if (nodeId === 11 && !hasMechArmEquipped) {
                    isUnlocked = false;
                    lockReason = "Locked. You must craft and equip the Mech Arm Prototype first.";
                } else if (nodeId === 23 && !hasColossusCore) {
                    isUnlocked = false;
                    lockReason = "Locked. You must bind the Colossus Core first.";
                } else if (nodeId === 41 && !hasMartyrCore) {
                    isUnlocked = false;
                    lockReason = "Locked. You must bind Martyr's Retribution first.";
                } else if (nodeId === 44 && !hasTrueLimbs) {
                    isUnlocked = false;
                    lockReason = "Locked. You must equip the True Mech Limbs first.";
                }
            } else if (text.includes("soul core")) {
                isUnlocked = nodeId >= 22; // Unlocks after defeating Vibarian
            } else {
                isUnlocked = true; // Fallback for any unknown tabs
            }

            if (!isUnlocked) {
                btn.style.opacity = "0.3";
                btn.style.cursor = "not-allowed";
                // We can't strictly disable 'li' or 'div' elements with .disabled easily, so we use pointer-events
                btn.style.pointerEvents = "none"; 
                btn.title = lockReason;
            } else {
                btn.style.opacity = "1";
                btn.style.cursor = "pointer";
                btn.style.pointerEvents = "auto";
                btn.title = "";
            }
        });
    }

    // --- 4. Update the User Interface ---
    function updateUI(gameState) {
        if (!gameState.current_node) return;
        latestGameState = gameState;

        // Ensure we are out of combat view if we loaded a save
        if (storylineUI && combatUI) {
            storylineUI.style.display = "flex";
            storylineUI.style.flexDirection = "column";
            combatUI.style.display = "none";
        }
        if (fightingBgPlaying) {
            fadeOutFightingMusic();
        }
        
        let nextBGM = null;
        if (gameState.current_node) {
            const loc = gameState.current_node.location_name;
            if (loc === "The Void" || loc === "Unknown") {
                nextBGM = openingMusic;
            } else if (loc === "Eins City") {
                nextBGM = einsCityMusic;
            } else if (loc && loc.includes("Helheim")) {
                nextBGM = helheimMusic;
            } else if (loc && (loc.includes("Forge") || loc.includes("Luminis"))) {
                nextBGM = holyForgeMusic;
            } else if (loc && (loc.includes("Alfheim") || loc.includes("Cathedral"))) {
                nextBGM = alfheimMusic;
            } else {
                nextBGM = openingMusic; // Fallback
            }
        }
        crossfadeBGM(nextBGM);

        const node = gameState.current_node;
        const stats = gameState.stats;

        // Update Panel Headers
        const headerTitle = document.querySelector(".content-storyline-topsection-header span");
        if (headerTitle) headerTitle.textContent = node.title || "Story Phase";
        const choiceHeader = document.querySelector(".content-storyline-bottomsection-header span");
        if (choiceHeader) choiceHeader.textContent = "What will you do?";

        // Hide choices while typing
        choicesContainer.style.visibility = "hidden";

        // Update Footer Location
        const locationSpan = document.querySelector("footer p span");
        if (locationSpan) locationSpan.textContent = node.location_name || "Unknown";

        refreshRightSideStats(gameState);

        // Clear old buttons
        choicesContainer.innerHTML = "";

        // Generate new choice buttons
        if (node.choices && node.choices.length > 0) {
            node.choices.forEach(choice => {
                const btn = document.createElement("button");
                btn.textContent = choice.choice_text;
                
                // BUG FIX: Block progression on Node 7 until Manalith is equipped
                if (node.id === 7) {
                    const hasManalithEquipped = latestGameState.equipment && latestGameState.equipment.some(eq => eq.item.item_name === "Manalith" && eq.slot === "Torso");
                    if (!hasManalithEquipped) {
                        btn.disabled = true;
                        btn.style.opacity = "0.3";
                        btn.style.cursor = "not-allowed";
                        btn.title = "Open your Inventory/Mech Limbs and equip the Manalith to your Torso to proceed.";
                        btn.innerHTML += "<br><span style='font-size: 0.65em; color: #ff5555;'>(Requires Manalith Equipped in Torso)</span>";
                    }
                }

                // UI Blocker for Node 36: Craft & Equip Anti-Magic Plating
                if (node.id === 36 && choice.choice_text.includes("Head to the Festival")) {
                    const hasPlating = latestGameState.equipment && latestGameState.equipment.some(eq => eq.item.item_name === "Anti-Magic Plating");
                    if (!hasPlating) {
                        btn.disabled = true;
                        btn.style.opacity = "0.3";
                        btn.style.cursor = "not-allowed";
                        btn.title = "Craft the Anti-Magic Plating in the Workshop and equip it as an Accessory to proceed.";
                        btn.innerHTML += "<br><span style='font-size: 0.65em; color: #ff5555;'>(Requires Anti-Magic Plating Equipped)</span>";
                    }
                }

                // UI Blocker for Node 45: Equip Colossus Core (to use Overclock)
                if (node.id === 45 && choice.choice_text.includes("Fight Carlossus")) {
                    const hasColossusCore = latestGameState.equipment && latestGameState.equipment.some(eq => eq.item.item_name.includes("Colossus Core") && eq.slot === "Soul Core");
                    if (!hasColossusCore) {
                        btn.disabled = true;
                        btn.style.opacity = "0.3";
                        btn.style.cursor = "not-allowed";
                        btn.title = "Open your Soul Cores tab and bind the Colossus Core to proceed. You will need Overclock to break Carlossus' armor!";
                        btn.innerHTML += "<br><span style='font-size: 0.65em; color: #ff5555;'>(Requires Colossus Core Equipped)</span>";
                    }
                }

                btn.addEventListener("click", () => {
                    if (btn.disabled) return;
                    if (choice.choice_text.toLowerCase().includes('begin the journey')) {
                        stopStartJourneyBgSound();
                    }

                    // Check if this choice triggers combat
                    if (choice.choice_text.includes("[COMBAT]")) {
                        crossfadeBGM(null);
                        autoSaveGame(); // Auto-save right before the combat starts
                        storylineUI.style.display = "none";
                        combatUI.style.display = "flex"; 
                        combatUI.style.flexDirection = "column"; // Stack elements vertically
                        
                        // Dynamically pull the enemy name from the button text
                        let enemyName = choice.choice_text.replace("[COMBAT]", "").replace("Fight", "").trim();
                        let enemyHP = enemyName.includes("Beast") ? 80 : 150; // Weaker HP for random encounters
                        
                        startCombat(enemyName, enemyHP, choice.id, stats);
                    } else {
                        makeChoice(choice.id);
                    }
                });
                choicesContainer.appendChild(btn);
                if (choice.choice_text.toLowerCase().includes('begin the journey')) {
                    playStartJourneyBgSound();
                }
            });
        } else {
            // Provide a hint on what to do if there are no choices
            const hintText = document.createElement("p");
            hintText.style.color = "#ffcc00";
            hintText.style.textAlign = "center";
            hintText.style.marginTop = "15px";
            
            if (node.id === 11) {
                const hasMechArmEquipped = latestGameState?.equipment?.some(eq => eq.item.item_name === "Mech Arm Prototype");
                if (!hasMechArmEquipped) {
                    hintText.innerHTML = "<b>Hint:</b> Open the <b>Workshop</b> tab and craft the <b>Mech Arm Prototype</b>.<br>Then open the <b>Mech Limbs</b> tab and equip it to your Right Arm to unlock Map Travel.";
                } else {
                    hintText.innerHTML = "<b>Hint:</b> Open the <b>World Map</b> tab to travel to Helheim's Sanctuary.";
                }
                choicesContainer.appendChild(hintText);
            } else if (node.id === 23) {
                const hasColossusCore = latestGameState?.equipment?.some(eq => eq.slot === "Soul Core" && eq.item.item_name.includes("Colossus Core"));
                if (!hasColossusCore) {
                    hintText.innerHTML = "<b>Hint:</b> Open your <b>Soul Cores</b> tab and bind the <b>Colossus Core</b> to unlock Map Travel.";
                } else {
                    hintText.innerHTML = "<b>Hint:</b> Open the <b>World Map</b> tab to travel to Alfheim Border.";
                }
                choicesContainer.appendChild(hintText);
            } else if (node.id === 41) {
                const hasMartyrCore = latestGameState?.equipment?.some(eq => eq.slot === "Soul Core" && eq.item.item_name.includes("Martyr's Retribution"));
                if (!hasMartyrCore) {
                    hintText.innerHTML = "<b>Hint:</b> Open your <b>Soul Cores</b> tab and bind <b>Martyr's Retribution</b> to unlock Map Travel.";
                } else {
                    hintText.innerHTML = "<b>Hint:</b> Open the <b>World Map</b> tab to travel back to Eins City.";
                }
                choicesContainer.appendChild(hintText);
            } else if (node.id === 44) {
                const hasTrueLimbs = latestGameState?.equipment?.some(eq => eq.item.item_name === "True Mech Limbs");
                if (!hasTrueLimbs) {
                    hintText.innerHTML = "<b>Hint:</b> Open your <b>Mech Limbs</b> tab and equip the <b>True Mech Limbs</b> to unlock Map Travel.";
                } else {
                    hintText.innerHTML = "<b>Hint:</b> Open the <b>World Map</b> tab to travel to The Wastelands.";
                }
                choicesContainer.appendChild(hintText);
            } else {
                hintText.innerHTML = "[ End of current content ]<br>Thank you for playing!";
                const restartBtn = document.createElement("button");
                restartBtn.textContent = "Restart Game";
                restartBtn.style.marginTop = "20px";
                restartBtn.style.borderColor = "#ff5555";
                restartBtn.style.color = "#ff5555";
                restartBtn.addEventListener("click", () => {
                    if (confirm("Are you sure you want to restart your journey from the beginning?")) {
                        startNewGame();
                    }
                });
                choicesContainer.appendChild(hintText);
                choicesContainer.appendChild(restartBtn);
            }
        }

        // Start Line-by-Line Story
        startStoryNode(node);
        
        // Populate overlay tabs with real data
        populateOverlays(gameState);
        
        // Update Tab Locks based on story progress
        updateTabLocks(node.id);
        
        // Apply Database Settings
        if (gameState.settings) {
            autoSaveEnabled = gameState.settings.auto_save;
            const autoSaveToggle = document.getElementById('auto-save-toggle');
            if (autoSaveToggle) {
                autoSaveToggle.textContent = `Auto-Save: ${autoSaveEnabled ? 'ON' : 'OFF'}`;
                autoSaveToggle.style.backgroundColor = autoSaveEnabled ? 'white' : 'transparent';
                autoSaveToggle.style.color = autoSaveEnabled ? 'black' : 'white';
            }
            
            if (soundVolumeSlider && soundVolumeValue) {
                soundVolumeSlider.value = gameState.settings.sound_volume;
                soundVolumeValue.textContent = `${gameState.settings.sound_volume}%`;
                applySoundVolume();
            }
            if (textSpeedSlider && textSpeedValue) {
                textSpeedSlider.value = gameState.settings.text_speed;
                textSpeedValue.textContent = `${gameState.settings.text_speed}%`;
            }
        }

        autoSaveGame();
    }

    // --- 4b. Populate Navigation Overlays ---
    function populateOverlays(gameState) {
        // 0. Update World Map
        const mapLocText = document.getElementById("current-map-location");
        if (mapLocText && gameState.current_node) {
            mapLocText.textContent = `Current Location: ${gameState.current_node.location_name || "Unknown"}`;
        }
        
        // Setup Inn Button Visibility
        const safeLocations = ["Eins City", "Helheim Market", "Luminis Sewers"];
        if (innBtn && gameState.current_node) {
            innBtn.style.display = safeLocations.includes(gameState.current_node.location_name) ? "inline-block" : "none";
        }
        
        const mapContainer = document.getElementById("map-locations");
        if (mapContainer && gameState.available_locations) {
            mapContainer.innerHTML = "";
            gameState.available_locations.forEach(loc => {
                const btn = document.createElement("button");
                btn.className = "action-btn";
                btn.textContent = `Travel to ${loc}`;
                btn.style.width = "100%";
                
                if (gameState.current_node && gameState.current_node.location_name === loc) {
                    btn.disabled = true;
                    btn.style.opacity = "0.5";
                    btn.textContent = `Currently at ${loc}`;
                } else {
                    const nodeId = gameState.current_node.id;
                    let isAllowed = false;
                    if (nodeId === 11 && loc === "Helheim's Sanctuary") isAllowed = true;
                    if (nodeId === 23 && loc === "Alfheim Border") isAllowed = true;
                    if (nodeId === 41 && loc === "Eins City") isAllowed = true;
                    if (nodeId === 44 && loc === "The Wastelands") isAllowed = true;
                    
                    if (!isAllowed) {
                        btn.style.opacity = "0.5";
                        btn.title = "You cannot travel here right now.";
                    } else {
                        btn.style.borderColor = "#00ffcc";
                        btn.style.color = "#00ffcc";
                    }
                    
                    btn.addEventListener("click", () => {
                        if (!isAllowed) {
                            alert("You cannot travel here right now. Follow the story objectives.");
                        } else {
                            handleTravel(loc);
                        }
                    });
                }
                mapContainer.appendChild(btn);
            });
        }

        const inventoryGrids = [
            document.querySelector("#tab-inventory .main-inventory-grid"),
            document.querySelector("#tab-mech-limbs .scrollable-grid"),
            document.querySelector("#tab-workshop .scrollable-grid")
        ];

        inventoryGrids.forEach(grid => {
            if (grid && gameState.inventory) {
                grid.innerHTML = ""; // Clear hardcoded placeholders
                
                if (gameState.inventory.length === 0) {
                    grid.innerHTML = "<div style='color:#777; padding: 10px; width: 100%; text-align: center; grid-column: 1 / -1;'>Inventory is empty.</div>";
                } else {
                    gameState.inventory.forEach(inv => {
                        const itemSpan = document.createElement("div");
                        itemSpan.className = grid.classList.contains("main-inventory-grid") ? "inv-item" : "inv-grid-item";
                        
                        // Drag and drop logic
                        itemSpan.draggable = true;
                        itemSpan.addEventListener('dragstart', (e) => {
                            hideTooltip();
                            e.dataTransfer.setData('text/plain', JSON.stringify({
                                type: 'inventory',
                                itemId: inv.item.id,
                                item: inv.item
                            }));
                        });

                        // Custom tooltip logic
                        const extraTip = (grid.closest("#tab-inventory") && inv.item.is_consumable) ? "Click to consume" : "";
                        itemSpan.addEventListener("mouseenter", (e) => showTooltip(e, inv.item, extraTip));
                        itemSpan.addEventListener("mousemove", moveTooltip);
                        itemSpan.addEventListener("mouseleave", hideTooltip);
                        
                        itemSpan.innerHTML = `
                            <span class="item-name">${inv.item.item_name}</span>
                            <span class="item-quantity">x${inv.quantity}</span>
                        `;
                        
                        // Consume logic for Main Inventory tab
                        if (grid.closest("#tab-inventory") && inv.item.is_consumable) {
                            itemSpan.addEventListener("click", async () => {
                                hideTooltip();
                                try {
                                    const response = await fetch(`${API_BASE_URL}/equip/`, {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ username: username, item_id: inv.item.id, slot: "consume" })
                                    });
                                    if (response.ok) {
                                        const resData = await response.json();
                                        updateUI(resData.state); // Instant refresh
                                    } else {
                                        const err = await response.json();
                                        alert(err.error || "Failed to consume item.");
                                    }
                                } catch(err) {
                                    console.error("Consume error:", err);
                                }
                            });
                        }

                        // Selection logic for the Mech Limbs tab
                        if (grid.closest("#tab-mech-limbs")) {
                            itemSpan.addEventListener("click", (e) => {
                                document.querySelectorAll("#tab-mech-limbs .inv-grid-item").forEach(el => el.style.borderColor = "");
                                e.currentTarget.style.borderColor = "#ffcc00"; // Highlight selected
                                selectedItemId = inv.item.id;
                                showItemDetails(inv.item);
                            });
                        }
                        
                        // Selection logic for the Workshop tab
                        if (grid.closest("#tab-workshop")) {
                            itemSpan.addEventListener("click", () => {
                                if (!craftIng1) {
                                    craftIng1 = inv.item;
                                } else if (!craftIng2) {
                                    if (craftIng1.id === inv.item.id && inv.quantity < 2) {
                                        alert("You need at least 2 of this item to use it twice.");
                                        return;
                                    }
                                    craftIng2 = inv.item;
                                } else {
                                    if (craftIng1.id === inv.item.id && craftIng2.id === inv.item.id) {
                                        alert("Both crafting slots are already filled with this item. Remove one first.");
                                        return;
                                    }
                                    craftIng1 = inv.item;
                                    craftIng2 = null;
                                }
                                if (craftBoxes[2]) {
                                    craftBoxes[2].innerHTML = "";
                                }
                                renderCraftSelection();
                            });
                        }
                        
                        grid.appendChild(itemSpan);
                    });
                }
            }
        });

        // 2. Update Character Tab Stats
        const level = gameState.stats?.level ?? 1;
        const exp = gameState.stats?.exp ?? 0;
        const statPoints = gameState.stats?.stat_points ?? 0;
        
        const baseStr = gameState.stats?.base_strength ?? 10;
        const baseInt = gameState.stats?.base_intelligence ?? 10;
        const baseDex = gameState.stats?.base_dexterity ?? 10;

        const equipStr = gameState.stats?.equip_strength ?? (gameState.stats?.strength || 0) - baseStr;
        const equipInt = gameState.stats?.equip_intelligence ?? 0;
        const equipDex = gameState.stats?.equip_dexterity ?? 0;

        const totalStr = baseStr + equipStr;
        const totalInt = baseInt + equipInt;
        const totalDex = baseDex + equipDex;

        const charLevelEl = document.getElementById("char-level");
        const charExpEl = document.getElementById("char-exp");
        const charStatPointsEl = document.getElementById("char-stat-points");
        
        if (charLevelEl) charLevelEl.textContent = level;
        if (charExpEl) charExpEl.textContent = exp;
        if (charStatPointsEl) charStatPointsEl.textContent = statPoints;

        const charStrEl = document.getElementById("char-str");
        const charIntEl = document.getElementById("char-int");
        const charDexEl = document.getElementById("char-dex");

        if (charStrEl) charStrEl.textContent = `${baseStr} (+${equipStr} Mech Bonus) = ${totalStr} Total`;
        if (charIntEl) charIntEl.textContent = `${baseInt} (+${equipInt} Mech Bonus) = ${totalInt} Total`;
        if (charDexEl) charDexEl.textContent = `${baseDex} (+${equipDex} Mech Bonus) = ${totalDex} Total`;

        const charHpEl = document.getElementById("char-hp");
        const charMpEl = document.getElementById("char-mp");
        const charSpeedEl = document.getElementById("char-speed");
        const charEvasionEl = document.getElementById("char-evasion");
        const charCritEl = document.getElementById("char-crit");
        const charSanityEl = document.getElementById("char-sanity");

        if (charHpEl) charHpEl.textContent = gameState.stats?.max_health ?? 100;
        if (charMpEl) charMpEl.textContent = gameState.stats?.max_mana ?? 100;
        if (charSpeedEl) charSpeedEl.textContent = gameState.stats?.speed ?? 15;
        if (charEvasionEl) charEvasionEl.textContent = `${gameState.stats?.evasion ?? 10}%`;
        if (charCritEl) charCritEl.textContent = `${gameState.stats?.crit_chance ?? 15}%`;
        if (charSanityEl) charSanityEl.textContent = `${gameState.stats?.sanity ?? 100}%`;

        // Update Stat Point Buttons
        document.querySelectorAll(".stat-btn").forEach(btn => {
            btn.disabled = statPoints <= 0;
        });

        // Connect Top-Left Header
        const headerAlias = document.getElementById("header-alias");
        const headerLevel = document.getElementById("header-level");
        const headerScrap = document.getElementById("header-scrap");

        if (headerAlias) headerAlias.textContent = username;
        if (headerLevel) headerLevel.textContent = level;
        if (headerScrap) headerScrap.textContent = gameState.stats?.scrap ?? 0;


        // 3. Update Equipped Items
        const equipSlots = document.querySelectorAll(".equip-item .limb-slot");
        
        // Setup initial slots and attach click listeners to show item details
        equipSlots.forEach(slot => {
            const slotName = slot.nextElementSibling.textContent.trim();
            slot.innerHTML = ""; // Clear slot
            slot.style.cursor = "pointer";
            
            // Find equipped item in the new state
            const eqItem = gameState.equipment?.find(eq => eq.slot === slotName);
            
            slot.onclick = () => {
                equipSlots.forEach(el => el.style.borderColor = "white"); // Reset borders
                slot.style.borderColor = "#ffcc00"; // Highlight selected slot
                selectedSlotName = slotName;
                
                if (eqItem) {
                    showItemDetails(eqItem.item);
                } else {
                    showItemDetails(null, slotName);
                }
            };
            
            // Render equipped item text
            if (eqItem) {
                const itemEl = document.createElement("div");
                itemEl.style.width = "100%";
                itemEl.style.height = "100%";
                itemEl.draggable = true;
                itemEl.style.display = "flex";
                itemEl.style.justifyContent = "center";
                itemEl.style.alignItems = "center";
                itemEl.innerHTML = `<span style="font-size: 0.7rem; text-align: center; word-break: break-word; line-height: 1.1;">${eqItem.item.item_name}</span>`;
                
                itemEl.addEventListener('dragstart', (e) => {
                    hideTooltip();
                    e.dataTransfer.setData('text/plain', JSON.stringify({
                        type: 'equipment',
                        slotName: slotName
                    }));
                });

                itemEl.onmouseenter = (e) => showTooltip(e, eqItem.item);
                itemEl.onmousemove = moveTooltip;
                itemEl.onmouseleave = hideTooltip;
                
                slot.appendChild(itemEl);
            } else {
                slot.onmouseenter = null;
                slot.onmousemove = null;
                slot.onmouseleave = null;
            }
        });
        
        // 3.5. Update Soul Cores UI
        const soulCoreGrid = document.getElementById("soul-cores-inventory-grid");
        if (soulCoreGrid && gameState.inventory) {
            soulCoreGrid.innerHTML = "";
            const coreItems = gameState.inventory.filter(inv => inv.item.equippable_slot === "Soul Core");
            if (coreItems.length === 0) {
                soulCoreGrid.innerHTML = "<div class='soul-core-card' style='color:#777; width:100%; border:none; background:transparent; box-shadow:none;'>No Soul Cores owned.</div>";
            } else {
                coreItems.forEach(inv => {
                    const itemDiv = document.createElement("div");
                    itemDiv.className = "soul-core-card";
                    itemDiv.innerHTML = `<div class="soul-core-title" style="margin-bottom:0;">${inv.item.item_name}</div>`;
                    itemDiv.title = inv.item.description;
                    itemDiv.addEventListener("click", (e) => {
                        document.querySelectorAll("#soul-cores-inventory-grid .soul-core-card").forEach(el => {
                            el.style.borderColor = "#444";
                            el.style.boxShadow = "none";
                        });
                        itemDiv.style.borderColor = "#ffcc00";
                        itemDiv.style.boxShadow = "0px 0px 15px rgba(255, 204, 0, 0.3)";
                        selectedCoreId = inv.item.id;
                        showCoreDetails(inv.item);
                    });
                    soulCoreGrid.appendChild(itemDiv);
                });
            }
        }
        
        const coreSlot = document.getElementById("soul-core-slot");
        if (coreSlot) {
            const eqCore = gameState.equipment?.find(eq => eq.slot === "Soul Core");
            coreSlot.innerHTML = "";
            coreSlot.style.cursor = "pointer";
            coreSlot.onclick = () => {
                coreSlot.style.borderColor = "#ffcc00";
                coreSlot.style.boxShadow = "0px 0px 15px rgba(255, 204, 0, 0.4)";
                if (eqCore) showCoreDetails(eqCore.item);
                else showCoreDetails(null, "Soul Core");
            };
            if (eqCore) {
                coreSlot.innerHTML = `<span style="font-size: 0.7rem; text-align: center; color:#ffcc00; font-weight:bold; text-shadow: 0 0 5px #ffcc00; word-break: break-word; line-height: 1.1;">${eqCore.item.item_name}</span>`;
            } else {
                coreSlot.style.borderColor = "#444";
                coreSlot.style.boxShadow = "none";
            }
        }

        // 4. Update Recipes in Workshop
        const recipeListUl = document.getElementById("recipe-list-ul");
        if (recipeListUl && gameState.recipes) {
            recipeListUl.innerHTML = "";
            gameState.recipes.forEach(r => {
                const li = document.createElement("li");
                li.textContent = `${r.ing1} + ${r.ing2} = ${r.result}`;
                recipeListUl.appendChild(li);
            });
        }
        
        // 5. Update Quests UI dynamically
        const questListContainer = document.getElementById("quest-list-container");
        if (questListContainer && gameState.quests) {
            questListContainer.innerHTML = "";
            gameState.quests.forEach((q, index) => {
                const li = document.createElement("li");
                li.className = "quest-item";
                if (index === 0) li.classList.add("active-quest");
                li.dataset.quest = q.key;
                
                let statusText = q.status === "completed" ? "<span style='color:#00ffcc;'>[DONE]</span> " : "";
                li.innerHTML = `${statusText}${q.title}`;
                
                li.addEventListener("click", () => {
                    document.querySelectorAll('.quest-item').forEach(el => el.classList.remove('active-quest'));
                    li.classList.add('active-quest');
                    
                    document.getElementById('quest-detail-title').textContent = q.title;
                    document.getElementById('quest-detail-description').textContent = q.description;
                    document.getElementById('quest-detail-reward').textContent = q.reward;
                    document.getElementById('quest-detail-note').textContent = q.note;
                });
                
                questListContainer.appendChild(li);
                
                if (index === 0) li.click(); // Trigger click to load details
            });
        }

        renderCraftSelection();
    }

    // --- 4c. Show Item Details Helper ---
    function showItemDetails(item, emptySlotName = null) {
        const nameEl = document.getElementById("mech-item-name");
        const descEl = document.getElementById("mech-item-desc");
        const statsEl = document.getElementById("mech-item-stats");
        
        if (!nameEl || !descEl || !statsEl) return;
        
        if (!item) {
            nameEl.textContent = emptySlotName ? `Empty Slot: ${emptySlotName}` : "Select an item";
            nameEl.style.color = "#888";
            descEl.textContent = emptySlotName ? "No item equipped in this slot." : "";
            statsEl.innerHTML = "";
            return;
        }

        nameEl.textContent = item.item_name;
        nameEl.style.color = "#ffcc00";
        
        let descHtml = item.description || "No description available.";
        statsEl.innerHTML = "";
        
        if (item.item_name === "Manalith") {
            descHtml += "<br><br><span style='color:#00ffcc;'>Combat Effect:</span> <i>Fully restores 40 Fuel at the start of battle to power mech-limbs. When empty, actions will strain your own Mana.</i>";
            statsEl.innerHTML += `<li>FUEL: <span style="color:#ffcc00;">40 MAX</span></li>`;
        }
        
        descEl.innerHTML = descHtml;

        if (item.strength_boost) statsEl.innerHTML += `<li>STR: +${item.strength_boost}</li>`;
        if (item.mana_boost) statsEl.innerHTML += `<li>MANA: +${item.mana_boost}</li>`;
        if (item.defense_boost) statsEl.innerHTML += `<li>DEF: +${item.defense_boost}</li>`;
        if (item.weight) statsEl.innerHTML += `<li>WEIGHT: ${item.weight} <span style="color:#aaa; font-size:0.8em;">(-Speed/Evasion)</span></li>`;
    }
    
    function showCoreDetails(item, emptySlotName = null) {
        const nameEl = document.getElementById("core-item-name");
        const descEl = document.getElementById("core-item-desc");
        const statsEl = document.getElementById("core-item-stats");
        if (!nameEl || !descEl || !statsEl) return;
        
        if (!item) {
            nameEl.textContent = emptySlotName ? `Empty Slot: ${emptySlotName}` : "Select a Core";
            nameEl.style.color = "#888";
                nameEl.style.textShadow = "none";
            descEl.textContent = "No Soul Core Bound.";
            statsEl.innerHTML = "";
            return;
        }
        nameEl.textContent = item.item_name;
            nameEl.style.color = "#ffcc00";
            nameEl.style.textShadow = "0 0 8px rgba(255, 204, 0, 0.4)";
            descEl.innerHTML = item.description || "";
        statsEl.innerHTML = "";
            if (item.strength_boost) statsEl.innerHTML += `<li>STR: <span style="color:#00ffcc;">+${item.strength_boost}</span></li>`;
            if (item.mana_boost) statsEl.innerHTML += `<li>MANA: <span style="color:#00ffcc;">+${item.mana_boost}</span></li>`;
    }

    function triggerDamageGlitch() {
        document.body.classList.remove("damage-glitch");
        void document.body.offsetWidth; // Trigger reflow to restart animation
        document.body.classList.add("damage-glitch");
        setTimeout(() => {
            document.body.classList.remove("damage-glitch");
        }, 300);
    }

    // --- 5a. Combat Status Ailments Helper ---
    function applyStatusEffects(isPlayer) {
        let statusLog = "";
        let ailments = isPlayer ? playerStatusAilments : enemyStatusAilments;
        
        for (let i = ailments.length - 1; i >= 0; i--) {
            let ailment = ailments[i];
            let dmg = 0;
            
            if (ailment.name === 'Bleeding') dmg = 10;
            else if (ailment.name === 'Poison') dmg = 15;
            else if (ailment.name === 'Burn') dmg = 25;
            else if (ailment.name === 'Sanity Bleed') dmg = 20; // High toll for reviving
            
            if (dmg > 0) {
                if (isPlayer) {
                    playerCombatHp -= dmg;
                    triggerDamageGlitch();
                    playGotHitSound();
                } else {
                    currentEnemy.hp -= dmg;
                }
                statusLog += `<br><span style="color:#ffcc00;">[Status]</span> ${isPlayer ? 'You take' : currentEnemy.name + ' takes'} ${dmg} damage from ${ailment.name}.`;
            }
            
            ailment.duration--;
            if (ailment.duration <= 0) {
                ailments.splice(i, 1);
                statusLog += `<br><span style="color:#00ffcc;">[Status]</span> ${ailment.name} has worn off ${isPlayer ? 'you' : currentEnemy.name}.`;
            }
        }
        return statusLog;
    }

    function checkStun(isPlayer) {
        let ailments = isPlayer ? playerStatusAilments : enemyStatusAilments;
        return ailments.some(a => a.name === 'Stun' || a.name === 'Freeze');
    }

    function inflictAilment(name, duration, targetIsPlayer) {
        let ailments = targetIsPlayer ? playerStatusAilments : enemyStatusAilments;
        // Prevent duplicates for now, just refresh duration
        let existing = ailments.find(a => a.name === name);
        if (existing) {
            existing.duration = duration;
        } else {
            ailments.push({ name, duration });
        }
    }

    function coolDownOverheat() {
        if (playerCombatOverheat > 0) {
            playerCombatOverheat = Math.max(0, playerCombatOverheat - 15);
            if (playerCombatOverheat === 0) {
                // Remove damaged status if Overheat returns to 0
                playerStatusAilments = playerStatusAilments.filter(a => a.name !== 'Damaged');
            }
        }
    }

    // --- 5. Combat System Logic ---
    function startCombat(enemyName, enemyHP, nextChoiceId, playerStats) {
        let maxHp = enemyHP;
        let mp = 50;
        let str = 10;
        let int = 10;
        let spd = 10;
        let expReward = 50;
        let scrapReward = 20;
        
        if (enemyName.toLowerCase().includes('beast')) {
            maxHp = 150; mp = 30; str = 18; int = 6; spd = 8;
            expReward = 50; scrapReward = 20;
        } else if (enemyName.toLowerCase().includes('oser')) {
            maxHp = 250; mp = 150; str = 18; int = 25; spd = 12;
            expReward = 500; scrapReward = 100;
        } else if (enemyName.toLowerCase().includes('assassins')) {
            maxHp = 200; mp = 60; str = 18; int = 10; spd = 25;
            expReward = 150; scrapReward = 50;
        } else if (enemyName.toLowerCase().includes('grom')) {
            maxHp = 350; mp = 20; str = 35; int = 4; spd = 4;
            expReward = 150; scrapReward = 50;
        } else if (enemyName.toLowerCase().includes('enforcer')) {
            maxHp = 280; mp = 80; str = 25; int = 15; spd = 18;
            expReward = 200; scrapReward = 70;
        } else if (enemyName.toLowerCase().includes('vibarian')) {
            maxHp = 400; mp = 200; str = 45; int = 20; spd = 20;
            expReward = 500; scrapReward = 200;
        } else if (enemyName.toLowerCase().includes('guardian')) {
            maxHp = 300; mp = 50; str = 35; int = 10; spd = 5; // Slow, high HP/STR
            expReward = 300; scrapReward = 100;
        } else if (enemyName.toLowerCase().includes('knights')) {
            maxHp = 350; mp = 100; str = 32; int = 20; spd = 15;
            expReward = 400; scrapReward = 150;
        } else if (enemyName.toLowerCase().includes('elysia')) {
            maxHp = 500; mp = 800; str = 15; int = 60; spd = 18; // High INT magic caster
            expReward = 500; scrapReward = 300;
        } else if (enemyName.toLowerCase().includes('satan')) {
            maxHp = 900; mp = 1000; str = 60; int = 80; spd = 25; // Brutal Phase 2 Stats
            expReward = 1000; scrapReward = 500;
        } else if (enemyName.toLowerCase().includes('carlossus')) {
            maxHp = 1500; mp = 0; str = 80; int = 0; spd = 5; // Colossal Golem
            expReward = 800; scrapReward = 400;
        } else if (enemyName.toLowerCase().includes('theonnix')) {
            maxHp = 600; mp = 1200; str = 10; int = 90; spd = 22; // Master Mage
            expReward = 600; scrapReward = 300;
        }

        currentEnemy = {
            name: enemyName,
            hp: maxHp,
            maxHp: maxHp,
            mp: mp,
            strength: str,
            intelligence: int,
            speed: spd,
            isArmored: enemyName.toLowerCase().includes('carlossus'),
            expReward: expReward,
            scrapReward: scrapReward
        };
        combatChoiceId = nextChoiceId; // The choice ID to trigger upon victory
        playerCombatHp = playerStats ? playerStats.health : 100;
        playerCombatOverheat = playerStats ? playerStats.overheat || 0 : 0;
        playerStatusAilments = [];
        enemyStatusAilments = [];
        hasRevivedThisBattle = false;
        playerCombatMp = playerStats ? (playerStats.mana || 100) : 100;
        combatTurnCount = 0;
        combatConsumedItems = [];

        reversiCooldown = 0;
        godhandActive = false;
        godhandTurns = 0;
        combatTotalDamageDealt = 0;
        combatStrengthBuff = 0;
        combatSpeedBuff = 0;

        // Manalith Check
        const hasManalithEquipped = latestGameState?.equipment?.some(eq => eq.item.item_name === "Manalith");
        manalithMp = hasManalithEquipped ? manalithMaxMp : 0;

        // Setup the UI text
        combatHeader.textContent = `VS. ${currentEnemy.name}`;
        combatText.textContent = `Prepare yourself!`;
        if (combatActionHeader) combatActionHeader.textContent = "Choose your action:";
        
        refreshRightSideStats(latestGameState);
        updateCombatStatsUI();
        renderCombatButtons();
        
        // Play fighting music
        playFightingMusic();
    }

    function updateCombatStatsUI() {
        // Update Enemy stats
        const enemyStats = document.querySelectorAll(".statistics-enemyStats ul li");
        if (enemyStats.length >= 6 && currentEnemy) {
            const enemyHpUI = enemyStats[2].querySelector("span");
            if (enemyHpUI) enemyHpUI.textContent = `${currentEnemy.hp} / ${currentEnemy.maxHp}`;
            const enemyMpUI = enemyStats[3].querySelector("span");
            if (enemyMpUI) enemyMpUI.textContent = currentEnemy.mp;
            const enemyStrUI = enemyStats[4].querySelector("span");
            if (enemyStrUI) enemyStrUI.textContent = currentEnemy.strength;
            const enemyIntUI = enemyStats[5].querySelector("span");
            if (enemyIntUI) enemyIntUI.textContent = currentEnemy.intelligence;
        }

        // Update Player HP, MP, STR, INT
        const playerStats = document.querySelectorAll(".statistics-charStats ul li");
        if (playerStats.length >= 6) {
            const playerHpUI = playerStats[1].querySelector("span");
            const maxHp = latestGameState?.stats?.max_health || 100;
            if (playerHpUI) playerHpUI.textContent = `${playerCombatHp} / ${maxHp}`;
            
            const playerMpUI = playerStats[2].querySelector("span");
            const maxMp = latestGameState?.stats?.max_mana || 100;
            if (playerMpUI) {
                if (manalithMp > 0) {
                    playerMpUI.innerHTML = `${playerCombatMp} / ${maxMp} <span style="color:#00ffcc; font-size:0.7em;">(+${manalithMp} Manalith)</span>`;
                } else {
                    playerMpUI.textContent = `${playerCombatMp} / ${maxMp}`;
                }
            }
            const playerStrUI = playerStats[3].querySelector("span");
            if (playerStrUI) playerStrUI.innerHTML = (latestGameState?.stats?.strength ?? 0) + (combatStrengthBuff > 0 ? ` <span style="color:#00ffcc;">(+${combatStrengthBuff})</span>` : "");
            const playerIntUI = playerStats[4].querySelector("span");
            if (playerIntUI) playerIntUI.textContent = latestGameState?.stats?.intelligence ?? 0;
        }
        
        const overheatUI = document.getElementById("player-overheat-ui");
        if (overheatUI) {
            overheatUI.textContent = playerCombatOverheat;
            if (playerCombatOverheat >= 100) overheatUI.style.color = "#ff5555";
            else if (playerCombatOverheat >= 75) overheatUI.style.color = "#ffcc00";
            else overheatUI.style.color = "white";
        }
        
        const playerStatusUI = document.getElementById("player-status-ui");
        if (playerStatusUI) playerStatusUI.textContent = playerStatusAilments.length > 0 ? playerStatusAilments.map(a => `${a.name} (${a.duration})`).join(", ") : "None";
        
        const enemyStatusUI = document.getElementById("enemy-status-ui");
        if (enemyStatusUI) enemyStatusUI.textContent = enemyStatusAilments.length > 0 ? enemyStatusAilments.map(a => `${a.name} (${a.duration})`).join(", ") : "None";
    }

    function renderCombatButtons() {
        combatButtonsContainer.innerHTML = "";
        
        // Action 1: Strike (2 Hits)
        const attackBtn = document.createElement("button");
        attackBtn.innerHTML = "<span>Strike (2 Hits)</span>";
        attackBtn.style.borderColor = "#ff5555";
        attackBtn.style.boxShadow = "inset 0 0 8px rgba(255, 85, 85, 0.15)";
        attackBtn.addEventListener("click", () => executeTurn("attack", 20, 35, 25)); // Roughly 40-70 total dmg
        
        const attackStats = {
            item_name: "Strike",
            description: "Approaches the enemy and lands two rapid punches.",
            stats: "Damage: 20-35 (x2)<br>Cost: 10 MP"
        };
        attackBtn.addEventListener("mouseenter", (e) => showSkillTooltip(e, attackStats));
        attackBtn.addEventListener("mousemove", moveTooltip);
        attackBtn.addEventListener("mouseleave", hideTooltip);
        
        // Action 2: Crescent Light (4 Hits)
        const magicBtn = document.createElement("button");
        magicBtn.innerHTML = "<span>Crescent Light (4 Hits)</span>";
        magicBtn.style.borderColor = "#00ffcc";
        magicBtn.style.boxShadow = "inset 0 0 8px rgba(0, 255, 204, 0.15)";
        magicBtn.addEventListener("click", () => executeTurn("magic", 20, 35));

        const magicStats = {
            item_name: "Crescent Light",
            description: "Uses mana to generate a rapid 4-hit mana-slash.",
            stats: "Damage: 15-25 (x4)<br>Cost: 25 MP"
        };
        magicBtn.addEventListener("mouseenter", (e) => showSkillTooltip(e, magicStats));
        magicBtn.addEventListener("mousemove", moveTooltip);
        magicBtn.addEventListener("mouseleave", hideTooltip);
        
        // Action 3: Reversi
        const reversiBtn = document.createElement("button");
        if (reversiCooldown > 0) {
            reversiBtn.innerHTML = `<span style='color:#888;'>Reversi (${reversiCooldown}T)</span>`;
            reversiBtn.disabled = true;
            reversiBtn.style.cursor = "not-allowed";
            reversiBtn.style.borderColor = "#444444";
        } else {
            reversiBtn.innerHTML = "<span style='color:#00ffcc;'>Reversi</span>";
            reversiBtn.style.borderColor = "#55ff55";
            reversiBtn.style.boxShadow = "inset 0 0 8px rgba(85, 255, 85, 0.15)";
            reversiBtn.addEventListener("click", () => executeTurn("reversi", 0, 0));
        }
        
        const reversiStats = {
            item_name: "Reversi",
            description: "Heals your body using restorative mana. Will not be available for 3 turns.",
            stats: "Heals 50% Max HP<br>Cost: 30 MP"
        };
        reversiBtn.addEventListener("mouseenter", (e) => showSkillTooltip(e, reversiStats));
        reversiBtn.addEventListener("mousemove", moveTooltip);
        reversiBtn.addEventListener("mouseleave", hideTooltip);
        
        // Action 4: Godhand Invocation
        const godhandBtn = document.createElement("button");
        if (godhandActive) {
            if (godhandTurns < 3) {
                godhandBtn.innerHTML = `<span style='color:#888;'>Gathering Godhand (${godhandTurns}/3)</span>`;
                godhandBtn.style.borderColor = "#444";
                godhandBtn.disabled = true;
                godhandBtn.style.cursor = "not-allowed";
                const godhandGathStats = {
                    item_name: "Gathering Godhand",
                    description: "Mana is gathering. You must wait 3 turns to release it.",
                    stats: "Cost: 0 MP"
                };
                godhandBtn.addEventListener("mouseenter", (e) => showSkillTooltip(e, godhandGathStats));
            } else {
                godhandBtn.innerHTML = `<span style='color:#ffcc00; text-shadow: 0 0 5px #ffcc00;'>Release Godhand (Ready!)</span>`;
                godhandBtn.style.borderColor = "#ffcc00";
                godhandBtn.style.boxShadow = "inset 0 0 10px rgba(255, 204, 0, 0.3)";
                godhandBtn.addEventListener("click", () => executeTurn("godhand_release", 60, 90));
                const godhandRelStats = {
                    item_name: "Release Godhand",
                    description: "Unleash the gathered mana. Deals base damage plus 10% of all damage you've dealt in this battle.",
                    stats: "Damage: Massive<br>Cost: 0 MP"
                };
                godhandBtn.addEventListener("mouseenter", (e) => showSkillTooltip(e, godhandRelStats));
            }
        } else {
            godhandBtn.innerHTML = "<span style='color:#ffcc00;'>Godhand Invocation</span>";
            godhandBtn.style.borderColor = "#ccaa00";
            godhandBtn.style.boxShadow = "inset 0 0 8px rgba(204, 170, 0, 0.15)";
            godhandBtn.addEventListener("click", () => executeTurn("godhand_activate", 0, 0));
            const godhandStats = {
                item_name: "Godhand Invocation",
                description: "Gather mana in your dominant hand for 3 turns. Your other attacks deal half damage while gathering.",
                stats: "Enhances Next Attack<br>Cost: 20 MP"
            };
            godhandBtn.addEventListener("mouseenter", (e) => showSkillTooltip(e, godhandStats));
        }
        godhandBtn.addEventListener("mousemove", moveTooltip);
        godhandBtn.addEventListener("mouseleave", hideTooltip);

        combatButtonsContainer.appendChild(attackBtn);
        combatButtonsContainer.appendChild(magicBtn);
        combatButtonsContainer.appendChild(reversiBtn);
        combatButtonsContainer.appendChild(godhandBtn);
        
        // Action 5: Overclock (If Colossus Core is equipped)
        const hasColossus = latestGameState?.equipment?.some(eq => eq.slot === "Soul Core" && eq.item.item_name.includes("Colossus Core"));
        if (hasColossus) {
            const overclockBtn = document.createElement("button");
            overclockBtn.innerHTML = "<span style='color:#ffcc00; text-shadow: 0 0 5px #ffcc00;'>Overclock Core</span>";
            overclockBtn.style.borderColor = "#ff5555";
            overclockBtn.style.boxShadow = "inset 0 0 10px rgba(255, 85, 85, 0.3)";
            overclockBtn.addEventListener("click", () => executeTurn("overclock", 150, 220, 45)); // Massive damage, High Overheat cost!
            
            const overclockStats = {
                item_name: "Overclock Core",
                description: "Unleash the full 40% physical boost of the Colossus Core. Shatters armor but rapidly overheats limbs.",
                stats: "Damage: 150-220<br>Cost: 45 MP<br>+45 Overheat"
            };
            overclockBtn.addEventListener("mouseenter", (e) => showSkillTooltip(e, overclockStats));
            overclockBtn.addEventListener("mousemove", moveTooltip);
            overclockBtn.addEventListener("mouseleave", hideTooltip);
            
            combatButtonsContainer.appendChild(overclockBtn);
        }
        
        // Action 4: Use Item
        const itemBtn = document.createElement("button");
        itemBtn.innerHTML = "<span>Use Item</span>";
        itemBtn.style.borderColor = "#aaaaaa";
        itemBtn.addEventListener("click", showCombatItems);
        combatButtonsContainer.appendChild(itemBtn);
    }

    function showCombatItems() {
        combatButtonsContainer.innerHTML = "";
        const consumables = latestGameState.inventory.filter(inv => inv.item.is_consumable && inv.quantity > 0);
        
        if (consumables.length === 0) {
            const noItemsBtn = document.createElement("button");
            noItemsBtn.innerHTML = "<span style='color:#888;'>No Consumables</span>";
            noItemsBtn.disabled = true;
            combatButtonsContainer.appendChild(noItemsBtn);
        } else {
            consumables.forEach(inv => {
                const itemBtn = document.createElement("button");
                itemBtn.innerHTML = `<span style="color:#00ffcc;">${inv.item.item_name} (x${inv.quantity})</span>`;
                itemBtn.style.borderColor = "#00ffcc";
                itemBtn.style.boxShadow = "inset 0 0 8px rgba(0, 255, 204, 0.15)";
                itemBtn.addEventListener("click", () => useCombatItem(inv));
                
                const itemStats = {
                    item_name: inv.item.item_name,
                    description: inv.item.description,
                    stats: "Consumable"
                };
                itemBtn.addEventListener("mouseenter", (e) => showSkillTooltip(e, itemStats));
                itemBtn.addEventListener("mousemove", moveTooltip);
                itemBtn.addEventListener("mouseleave", hideTooltip);
                
                combatButtonsContainer.appendChild(itemBtn);
            });
        }
        
        const backBtn = document.createElement("button");
        backBtn.innerHTML = "<span>Back</span>";
        backBtn.style.borderColor = "#ff5555";
        backBtn.addEventListener("click", renderCombatButtons);
        combatButtonsContainer.appendChild(backBtn);
    }

    function useCombatItem(inv) {
        hideTooltip();
        let healHp = 0;
        let healMp = 0;
        let strBuff = 0;
        let spdBuff = 0;
        if (inv.item.item_name.includes("Health")) healHp = 50;
        if (inv.item.item_name.includes("Mana")) healMp = 50;
        if (inv.item.item_name.includes("Strength")) strBuff = 15;
        if (inv.item.item_name.includes("Speed")) spdBuff = 15;
        
        // Return to normal combat menu
        renderCombatButtons();
        
        // Execute Turn logic
        executeTurn("item", 0, 0, 0, { name: inv.item.item_name, hp: healHp, mp: healMp, strBuff: strBuff, spdBuff: spdBuff, invRef: inv });
    }

    function executeTurn(actionType, minDmg, maxDmg, overheatCost = 0, itemDetails = null) {
        let logText = "";
        let actionCost = 0;
        
        if (actionType !== 'item' && combatStrengthBuff > 0) {
            minDmg += combatStrengthBuff;
            maxDmg += combatStrengthBuff;
        }
        
        if (actionType === 'magic') actionCost = 25;
        else if (actionType === 'overclock') actionCost = 45;
        else if (actionType === 'attack') actionCost = 10;
        else if (actionType === 'reversi') actionCost = 30;
        else if (actionType === 'godhand_activate') actionCost = 20;
        
        // 1. Manalith & Mana System
        if (actionType !== 'item') {
            if (manalithMp >= actionCost) {
                manalithMp -= actionCost;
                logText += `<span style="color:#00ffcc; font-size: 0.8em;">[Manalith fuels your mech-limbs (-${actionCost} charge)]</span><br><br>`;
            } else {
                let remainder = actionCost - manalithMp;
                if (manalithMp > 0) {
                    logText += `<span style="color:#ffcc00; font-size: 0.8em;">[Manalith depleted! Draining ${remainder} of your own mana.]</span><br><br>`;
                    manalithMp = 0;
                } else {
                    logText += `<span style="color:#ff5555; font-size: 0.8em;">[Manalith is empty! Draining ${remainder} of your own mana!]</span><br><br>`;
                }
                playerCombatMp -= remainder;
                if (playerCombatMp < 0) {
                    let hpPenalty = Math.abs(playerCombatMp);
                    playerCombatMp = 0;
                    playerCombatHp -= hpPenalty;
                    triggerDamageGlitch();
                    playGotHitSound();
                    logText += `<span style="color:red; font-size: 0.8em;">[Out of Mana! The strain damages your body for ${hpPenalty} HP!]</span><br><br>`;
                }
            }
        }
        
        // --- PLAYER TURN ---
        if (godhandActive && actionType !== 'godhand_activate' && actionType !== 'godhand_release') {
            godhandTurns = Math.min(3, godhandTurns + 1);
        }

        if (checkStun(true)) {
            logText += "<span style='color:#ffcc00;'>You are stunned and cannot move this turn!</span>";
            if (godhandActive) logText += `<br><span style="color:#ffcc00;">[Godhand Gathering: Turn ${godhandTurns}] Mana continues to gather.</span>`;
        } else {
            if (actionType === 'item') {
                itemDetails.invRef.quantity -= 1;
                combatConsumedItems.push(itemDetails.name);
                
                if (itemDetails.hp > 0) {
                    playerCombatHp = Math.min(latestGameState?.stats?.max_health || 100, playerCombatHp + itemDetails.hp);
                    logText += `You consumed a <span style="color:#00ffcc;">${itemDetails.name}</span>! Recovered ${itemDetails.hp} HP.`;
                } else if (itemDetails.mp > 0) {
                    playerCombatMp = Math.min(latestGameState?.stats?.max_mana || 100, playerCombatMp + itemDetails.mp);
                    logText += `You consumed a <span style="color:#00ffcc;">${itemDetails.name}</span>! Recovered ${itemDetails.mp} MP.`;
                } else if (itemDetails.strBuff > 0) {
                    combatStrengthBuff += itemDetails.strBuff;
                    logText += `You consumed a <span style="color:#00ffcc;">${itemDetails.name}</span>! Your strength surges <span style="color:#00ffcc;">(+${itemDetails.strBuff} STR)</span>.`;
                } else if (itemDetails.spdBuff > 0) {
                    combatSpeedBuff += itemDetails.spdBuff;
                    logText += `You consumed a <span style="color:#00ffcc;">${itemDetails.name}</span>! Your reflexes quicken <span style="color:#00ffcc;">(+${itemDetails.spdBuff} SPD)</span>.`;
                } else {
                    logText += `You consumed a <span style="color:#00ffcc;">${itemDetails.name}</span>!`;
                }
                if (godhandActive) logText += `<br><span style="color:#ffcc00;">[Godhand Gathering: Turn ${godhandTurns}] Mana continues to gather.</span>`;
                coolDownOverheat(); // Using an item cools limbs down
            } else {
                // Calculate Overheat Penalties
                if (actionType === 'attack' || actionType === 'overclock') {
                    playerCombatOverheat = Math.min(100, playerCombatOverheat + overheatCost);
                    if (playerCombatOverheat >= 100 && !playerStatusAilments.some(a => a.name === 'Damaged')) {
                        inflictAilment('Damaged', 99, true); // Permanent until cooled down
                        logText += "<br><span style='color:#ff5555; font-weight:bold;'>OVERHEAT! Your limbs are damaged! Your physical strength is severely reduced!</span><br>";
                    }
                } else if (actionType === 'magic' || actionType === 'reversi' || actionType === 'godhand_activate') {
                    coolDownOverheat(); // Using magic gives limbs time to cool down
                }
    
                // Apply STR penalty if damaged
                let dmgMult = 1.0;
                if (actionType === 'attack' && playerStatusAilments.some(a => a.name === 'Damaged')) {
                    dmgMult = 0.5; // 50% damage penalty
                }
    
                // Godhand Half-Damage Penalty
                if (godhandActive && actionType !== 'godhand_activate' && actionType !== 'godhand_release') {
                    if (actionType !== 'reversi') {
                        dmgMult *= 0.5;
                        logText += `<span style="color:#ffcc00;">[Godhand Gathering: Turn ${godhandTurns}] All damage dealt is halved!</span><br>`;
                    } else {
                        logText += `<span style="color:#ffcc00;">[Godhand Gathering: Turn ${godhandTurns}] Mana continues to gather.</span><br>`;
                    }
                }

                // Elysia Martyr's Retribution Check
                let isReflected = false;
                if (currentEnemy.name.includes("Elysia")) {
                    const hasPlating = latestGameState?.equipment?.some(eq => eq.item.item_name === "Anti-Magic Plating");
                    if (!hasPlating) {
                        isReflected = true;
                        dmgMult *= 0.1; // 90% damage reduction
                    }
                }

                // Carlossus Armor Check
                let hitArmor = false;
                if (currentEnemy.name.toLowerCase().includes("carlossus") && currentEnemy.isArmored && actionType !== 'overclock') {
                    hitArmor = true;
                    dmgMult *= 0.05; // 95% damage reduction against non-Overclock attacks
                }

                // Check Crit Stats!
                let critChance = ((latestGameState?.stats?.crit_chance || 15) + combatSpeedBuff) / 100;
    
                let totalDmg = 0;
                let anyCrit = false;

                if (actionType === 'attack') {
                    let hitsLog = [];
                    for(let i=0; i<2; i++) {
                        let hitCrit = Math.random() < critChance;
                        if (hitCrit) anyCrit = true;
                        let hitMult = dmgMult * (hitCrit ? 2.0 : 1.0);
                        let hitDmg = Math.floor((Math.random() * (maxDmg - minDmg + 1) + minDmg) * hitMult);
                        totalDmg += hitDmg;
                        hitsLog.push(hitCrit ? `<span style="color:#00ffcc; font-weight:bold;">${hitDmg}</span>` : hitDmg);
                    }
                    currentEnemy.hp -= totalDmg;
                    combatTotalDamageDealt += totalDmg;
                    logText += `You used Strike, hitting 2 times (${hitsLog.join(", ")})${anyCrit ? ' <span style="color:#00ffcc;">(CRITICAL!)</span>' : ''} for ${totalDmg} damage!`;
                    if (isReflected) {
                        let recoil = totalDmg * 10;
                        playerCombatHp -= recoil;
                        triggerDamageGlitch();
                        logText += `<br><span style="color:#ff5555; font-weight:bold;">Martyr's Retribution reflects the holy energy! You take ${recoil} recoil damage!</span>`;
                    }
                    if (hitArmor) {
                        logText += `<br><span style="color:#ff5555; font-weight:bold;">Carlossus's thick hull absorbs the impact! You must use Overclock to shatter its armor!</span>`;
                    }
                } else if (actionType === 'magic') {
                    let hitsLog = [];
                    for(let i=0; i<4; i++) {
                        let hitCrit = Math.random() < critChance;
                        if (hitCrit) anyCrit = true;
                        let hitMult = dmgMult * (hitCrit ? 2.0 : 1.0);
                        let hitDmg = Math.floor((Math.random() * (maxDmg - minDmg + 1) + minDmg) * hitMult);
                        totalDmg += hitDmg;
                        hitsLog.push(hitCrit ? `<span style="color:#00ffcc; font-weight:bold;">${hitDmg}</span>` : hitDmg);
                    }
                    currentEnemy.hp -= totalDmg;
                    combatTotalDamageDealt += totalDmg;
                    logText += `You used Crescent Light, hitting 4 times (${hitsLog.join(", ")})${anyCrit ? ' <span style="color:#00ffcc;">(CRITICAL!)</span>' : ''} for ${totalDmg} damage!`;
                    if (isReflected) {
                        let recoil = totalDmg * 10;
                        playerCombatHp -= recoil;
                        triggerDamageGlitch();
                        logText += `<br><span style="color:#ff5555; font-weight:bold;">Martyr's Retribution reflects the holy energy! You take ${recoil} recoil damage!</span>`;
                    }
                    if (hitArmor) {
                        logText += `<br><span style="color:#ff5555; font-weight:bold;">Carlossus's thick hull absorbs the impact! You must use Overclock to shatter its armor!</span>`;
                    }
                } else if (actionType === 'reversi') {
                    let maxHp = latestGameState?.stats?.max_health || 100;
                    let healAmt = Math.floor(maxHp * 0.5); 
                    playerCombatHp = Math.min(maxHp, playerCombatHp + healAmt);
                    logText += `You cast <span style="color:#00ffcc;">Reversi</span>, recovering ${healAmt} HP!`;
                } else if (actionType === 'godhand_activate') {
                    godhandActive = true;
                    godhandTurns = 0;
                    logText += `<span style="color:#ffcc00; font-weight:bold;">You invoke Godhand! Mana gathers in your dominant hand. (Your attacks are halved while gathering)</span>`;
                } else if (actionType === 'godhand_release') {
                    let hitCrit = true; // Godhand always crits
                    let hitMult = dmgMult * (hitCrit ? 2.0 : 1.0);
                    let bonus = Math.floor(combatTotalDamageDealt * 0.1);
                    let baseDmg = Math.floor((Math.random() * (maxDmg - minDmg + 1) + minDmg) * hitMult);
                    totalDmg = baseDmg + bonus;
                    currentEnemy.hp -= totalDmg;
                    combatTotalDamageDealt += totalDmg;
                    godhandActive = false;
                    godhandTurns = 0;
                    logText += `<span style="color:#ffcc00; font-weight:bold;">You release Godhand!</span>${hitCrit ? ' <span style="color:#00ffcc;">(CRITICAL!)</span>' : ''} You deal ${baseDmg} + <span style="color:#ff5555;">${bonus}</span> (10% of past damage) = <b>${totalDmg}</b> damage!`;
                    if (isReflected) {
                        let recoil = totalDmg * 10;
                        playerCombatHp -= recoil;
                        triggerDamageGlitch();
                        logText += `<br><span style="color:#ff5555; font-weight:bold;">Martyr's Retribution reflects the holy energy! You take ${recoil} recoil damage!</span>`;
                    }
                    if (hitArmor) {
                        logText += `<br><span style="color:#ff5555; font-weight:bold;">Carlossus's thick hull absorbs the impact! You must use Overclock to shatter its armor!</span>`;
                    }
                } else if (actionType === 'overclock') {
                    let hitCrit = Math.random() < critChance;
                    let hitMult = dmgMult * (hitCrit ? 2.0 : 1.0);
                    totalDmg = Math.floor((Math.random() * (maxDmg - minDmg + 1) + minDmg) * hitMult);
                    currentEnemy.hp -= totalDmg;
                    combatTotalDamageDealt += totalDmg;
                    if (currentEnemy.isArmored) {
                        currentEnemy.isArmored = false;
                        logText += `<span style="color:#ffcc00; font-weight:bold;">Your Overclocked strike shatters Carlossus's outer armor, exposing its internal structure!</span><br>`;
                    }
                    logText += `You used Overclock${hitCrit ? ' <span style="color:#00ffcc;">(CRITICAL HIT!)</span>' : ''}, dealing ${totalDmg} damage!`;
                    if (isReflected) {
                        let recoil = totalDmg * 10;
                        playerCombatHp -= recoil;
                        triggerDamageGlitch();
                        logText += `<br><span style="color:#ff5555; font-weight:bold;">Martyr's Retribution reflects the holy energy! You take ${recoil} recoil damage!</span>`;
                    }
                }
            }
        }
        
        // Handle Reversi Cooldown 
        if (reversiCooldown > 0 && actionType !== 'reversi') {
            reversiCooldown--;
        } else if (actionType === 'reversi') {
            reversiCooldown = 3;
        }
        
        // Process Player DoT Effects
        const playerStatusLog = applyStatusEffects(true);
        if (playerStatusLog) logText += playerStatusLog;

        // --- CHECK PLAYER DEATH (From Mana Strain or DoT) ---
        if (playerCombatHp <= 0) {
            const hasVowRing = latestGameState?.equipment?.some(eq => eq.item.item_name === "Vow of The Bleeding Heart" && eq.slot === "Accessory");
            if (hasVowRing && !hasRevivedThisBattle) {
                playerCombatHp = Math.floor((latestGameState?.stats?.health || 100) * 0.3);
                hasRevivedThisBattle = true;
                logText += `<br><br><span style="color:#ff5555; font-weight:bold; font-size:1.1em;">[VOW OF THE BLEEDING HEART]</span><br><span style="color:white;">You defy death! Revived with 30% HP, but your sanity is bleeding...</span>`;
                inflictAilment('Sanity Bleed', 99, true);
            } else {
                playerCombatHp = 0;
                combatText.innerHTML = logText + `<br><br><span style="color:#ff5555; font-weight:bold;">You have fallen in battle...</span>`;
                combatButtonsContainer.innerHTML = "";
                hideTooltip();
                
                const reloadBtn = document.createElement("button");
                reloadBtn.innerHTML = "<span>Load Last Autosave</span>";
                reloadBtn.style.borderColor = "#ff5555";
                reloadBtn.style.color = "#ff5555";
                reloadBtn.style.boxShadow = "inset 0 0 10px rgba(255, 85, 85, 0.3)";
                reloadBtn.style.marginTop = "15px";
                reloadBtn.addEventListener("click", () => {
                    loadGameSlot("autosave");
                });
                combatButtonsContainer.appendChild(reloadBtn);
                updateCombatStatsUI();
                return; // Stop execution, player is dead
            }
        }

        // --- CHECK ENEMY DEATH ---
        if (currentEnemy.hp <= 0) {
            currentEnemy.hp = 0;
            updateCombatStatsUI();
            
            let lootHtml = "";
            let lootItems = [];
            let droppedItemsHtml = [];
            
            let currentHealthPots = 0;
            let currentManaPots = 0;
            if (latestGameState && latestGameState.inventory) {
                const hpInv = latestGameState.inventory.find(inv => inv.item.item_name === "Health Potion");
                if (hpInv) currentHealthPots = hpInv.quantity;
                const mpInv = latestGameState.inventory.find(inv => inv.item.item_name === "Mana Potion");
                if (mpInv) currentManaPots = mpInv.quantity;
            }
            
            // 75% chance to drop Health and Mana potions
            if (Math.random() < 0.75) {
                let healthCount = Math.floor(Math.random() * 3) + 1; // 1 to 3
                let manaCount = Math.floor(Math.random() * 3) + 1; // 1 to 3
                
                if (currentHealthPots + healthCount > 9) healthCount = Math.max(0, 9 - currentHealthPots);
                if (currentManaPots + manaCount > 9) manaCount = Math.max(0, 9 - currentManaPots);
                
                if (healthCount > 0) {
                    for (let i = 0; i < healthCount; i++) lootItems.push("Health Potion");
                    droppedItemsHtml.push(`${healthCount}x Health Potion`);
                }
                if (manaCount > 0) {
                    for (let i = 0; i < manaCount; i++) lootItems.push("Mana Potion");
                    droppedItemsHtml.push(`${manaCount}x Mana Potion`);
                }
            }
            
            // 65% chance to get a Strength or Speed potion
            if (Math.random() < 0.65) {
                const specialPot = Math.random() < 0.5 ? "Strength Potion" : "Speed Potion";
                lootItems.push(specialPot);
                droppedItemsHtml.push(`1x ${specialPot}`);
            }
            
            if (lootItems.length > 0) {
                lootHtml = `<br><br><span style="color:#00ffcc;"><b>Loot Drop:</b><br>- ${droppedItemsHtml.join("<br>- ")}</span>`;
            }
            
            combatText.innerHTML = `${logText}<br><br><b>${currentEnemy.name} defeated!</b>${lootHtml}`;
            combatButtonsContainer.innerHTML = ""; // Remove buttons
            hideTooltip(); // Force the tooltip to hide since the hovered buttons were just destroyed
            
            // Add a 'Continue' button instead of a forced timeout
            const continueBtn = document.createElement("button");
            continueBtn.innerHTML = "<span>Continue</span>";
            continueBtn.style.borderColor = "#444444";
            continueBtn.style.color = "#888";
            continueBtn.style.cursor = "not-allowed";
            continueBtn.disabled = true;
            
            // 1.2 second delay to prevent accidentally spam-clicking past the victory screen
            setTimeout(() => {
                continueBtn.style.borderColor = "#00ffcc";
                continueBtn.style.color = "white";
                continueBtn.style.cursor = "pointer";
                continueBtn.disabled = false;
            }, 1200);

            continueBtn.addEventListener("click", () => {
                fadeOutFightingMusic();
                combatUI.style.display = "none";
                storylineUI.style.display = "flex";
                storylineUI.style.flexDirection = "column"; // Ensure story stacks vertically too
                makeChoice(combatChoiceId, playerCombatHp, playerCombatMp, lootItems, combatConsumedItems, currentEnemy.expReward, currentEnemy.scrapReward);
            });
            combatButtonsContainer.appendChild(continueBtn);
            return;
        }

        // Increase Turn Counter
        combatTurnCount++;

        // --- ENEMY TURN ---
        if (currentEnemy.hp > 0) {
            if (checkStun(false)) {
                logText += `<br><br><span style="color:#ffcc00;">${currentEnemy.name} is stunned and cannot move!</span>`;
            } else {
                let isSmartAttack = false;
                const playerDef = latestGameState?.stats?.defense || 0;
                
                // SMART BOSS AI: VIBARIAN
                if (currentEnemy.name.includes('Vibarian')) {
                    isSmartAttack = true;
                    if (combatTurnCount % 4 === 1) {
                        currentEnemy.strength += 10;
                        logText += `<br><br><span style="color:#ffcc00;">${currentEnemy.name} activates <b>Stolen Boost</b>! His physical strength surges!</span>`;
                    } else if (combatTurnCount % 4 === 2) {
                        let enemyDmg = Math.floor(Math.random() * 15) + currentEnemy.strength;
                        enemyDmg = Math.max(1, enemyDmg - playerDef);
                        playerCombatHp -= enemyDmg;
                        if (enemyDmg > 0) {
                            triggerDamageGlitch();
                            playGotHitSound();
                        }
                        logText += `<br><br><span style="color:#ff5555;">${currentEnemy.name} unleashes a <b>Devastating Blow</b> for ${enemyDmg} damage!</span>`;
                    } else if (combatTurnCount % 4 === 3) {
                        logText += `<br><br><span style="color:#00ffcc;">${currentEnemy.name} is overheated from his heavy attack. He is vulnerable!</span>`;
                    } else {
                        let enemyDmg = Math.floor(Math.random() * 10) + Math.floor(currentEnemy.strength / 2);
                        enemyDmg = Math.max(1, enemyDmg - playerDef);
                        playerCombatHp -= enemyDmg;
                        if (enemyDmg > 0) {
                            triggerDamageGlitch();
                            playGotHitSound();
                        }
                        logText += `<br><br><span style="color:#ff5555;">${currentEnemy.name} strikes rapidly for ${enemyDmg} damage!</span>`;
                    }
                }
                // SMART BOSS AI: OSER
                else if (currentEnemy.name.includes('Oser')) {
                    isSmartAttack = true;
                    if (combatTurnCount % 3 === 2) {
                        logText += `<br><br><span style="color:#00ffcc; font-weight:bold;">${currentEnemy.name} is gathering immense frost mana... A Blizzard is coming!</span>`;
                    } else if (combatTurnCount % 3 === 0) {
                        let enemyDmg = Math.floor(Math.random() * 20) + 15;
                        enemyDmg = Math.max(1, enemyDmg - playerDef);
                        playerCombatHp -= enemyDmg;
                        if (enemyDmg > 0) {
                            triggerDamageGlitch();
                            playGotHitSound();
                        }
                        logText += `<br><br><span style="color:#ff5555;">${currentEnemy.name} casts <b>Grand Blizzard</b> for ${enemyDmg} damage!</span>`;
                        inflictAilment('Freeze', 1, true);
                    } else {
                        let enemyDmg = Math.floor(Math.random() * 10) + 5;
                        enemyDmg = Math.max(1, enemyDmg - playerDef);
                        playerCombatHp -= enemyDmg;
                        if (enemyDmg > 0) {
                            triggerDamageGlitch();
                            playGotHitSound();
                        }
                        logText += `<br><br><span style="color:#ff5555;">${currentEnemy.name} fires ice shards for ${enemyDmg} damage!</span>`;
                    }
                }

                // FALLBACK RNG AI
                if (!isSmartAttack) {
                    const playerEvasion = ((latestGameState?.stats?.evasion || 10) + combatSpeedBuff) / 100;
                    if (Math.random() < playerEvasion) {
                        logText += `<br><br><span style="color:#00ffcc;">You evaded ${currentEnemy.name}'s attack!</span>`;
                    } else {
                        let enemyDmg = Math.floor(Math.random() * 15) + 5;
                        enemyDmg = Math.max(1, enemyDmg - playerDef); // Mitigate damage based on defense
                        playerCombatHp -= enemyDmg;
                        if (enemyDmg > 0) {
                            triggerDamageGlitch();
                            playGotHitSound();
                        }
                        logText += `<br><br><span style="color:#ff5555;">${currentEnemy.name} attacks you for ${enemyDmg} damage!</span>`;
                        
                        // Demo Ailment Application
                        if (Math.random() < 0.25) {
                            if (currentEnemy.name.includes("Oser")) inflictAilment('Freeze', 1, true);
                            else if (currentEnemy.name.includes("Assassins")) inflictAilment('Poison', 3, true);
                            else inflictAilment('Bleeding', 3, true);
                        }
                    }
                }
            }
            
            // Process Enemy DoT Effects
            const enemyStatusLog = applyStatusEffects(false);
            if (enemyStatusLog) logText += enemyStatusLog;
        }

        // Update UI for next turn
        combatText.innerHTML = logText;
        if (playerCombatHp <= 0) {
            const hasVowRing = latestGameState?.equipment?.some(eq => eq.item.item_name === "Vow of The Bleeding Heart" && eq.slot === "Accessory");
            if (hasVowRing && !hasRevivedThisBattle) {
                playerCombatHp = Math.floor((latestGameState?.stats?.health || 100) * 0.3);
                hasRevivedThisBattle = true;
                combatText.innerHTML += `<br><br><span style="color:#ff5555; font-weight:bold; font-size:1.1em;">[VOW OF THE BLEEDING HEART]</span><br><span style="color:white;">You defy death! Revived with 30% HP, but your sanity is bleeding...</span>`;
                inflictAilment('Sanity Bleed', 99, true);
            } else {
                playerCombatHp = 0;
                combatText.innerHTML += `<br><br><span style="color:#ff5555; font-weight:bold;">You have fallen in battle...</span>`;
                combatButtonsContainer.innerHTML = "";
                hideTooltip();
                
                // Provide a quick reload button upon death
                const reloadBtn = document.createElement("button");
                reloadBtn.innerHTML = "<span>Load Last Autosave</span>";
                reloadBtn.style.borderColor = "#ff5555";
                reloadBtn.style.color = "#ff5555";
                reloadBtn.style.marginTop = "15px";
                reloadBtn.addEventListener("click", () => {
                    loadGameSlot("autosave");
                });
                combatButtonsContainer.appendChild(reloadBtn);
            }
        }
        updateCombatStatsUI();
        if (playerCombatHp > 0 && currentEnemy.hp > 0) {
            renderCombatButtons(); // Refresh button visuals for cooldowns/stances
        }
    }

    // --- 6. Helper: Line-by-Line & Typewriter Effect ---
    function startStoryNode(node) {
        clearTimeout(autoTimeout);
        clearTimeout(typewriterTimeout);
        isTyping = false;
        typeSound.pause();
        
        storyTextContainer.innerHTML = "";
        // Split text by newlines, trim, and filter out empty arrays
        storyLines = node.narrative_text.split(/\n+/).map(l => l.trim()).filter(l => l !== "");
        currentLineIndex = 0;
        
        playNextLine();
    }

    function playNextLine() {
        if (currentLineIndex >= storyLines.length) {
            choicesContainer.style.visibility = "visible";
            choicesContainer.scrollIntoView({ behavior: "smooth" });
            return;
        }

        const lineText = storyLines[currentLineIndex];
        currentLineElement = document.createElement("p");
        currentLineElement.style.marginBottom = "1.5em";
        storyTextContainer.appendChild(currentLineElement);
        
        // Fetch real-time text speed setting. Range: 0% -> 50ms, 100% -> 5ms
        const speedVal = textSpeedSlider ? Number(textSpeedSlider.value) : 50;
        const typingSpeed = Math.max(5, 50 - (speedVal / 100) * 45); 
        
        typeWriterLine(lineText, currentLineElement, typingSpeed, onLineFinished);
    }

    function onLineFinished() {
        if (autoAdvance) {
            if (currentLineIndex < storyLines.length - 1) {
                autoTimeout = setTimeout(() => {
                    currentLineIndex++;
                    playNextLine();
                }, 1500); // Wait 1.5 seconds before typing the next line
            } else if (currentLineIndex === storyLines.length - 1) {
                autoTimeout = setTimeout(() => {
                    currentLineIndex++;
                    playNextLine(); // Triggers the choices to show
                }, 1000);
            }
        } else {
            // Add a visual indicator to prompt a click if Auto is OFF
            if (currentLineElement) {
                currentLineElement.innerHTML += "<span style='color:#00ffcc; font-size: 0.8em;'> ▼</span>";
            }
        }
    }

    function typeWriterLine(text, element, speed, callback) {
        if (isTyping) clearTimeout(typewriterTimeout);
        
        let currentContent = "";
        element.innerHTML = "";
        let i = 0;
        let isTag = false;
        isTyping = true;
        
        // Start looping sound (Browsers may block this if user hasn't interacted with page yet)
        typeSound.play().catch(e => console.log("Audio autoplay prevented by browser:", e));

        function type() {
            if (!isTyping) return; // Aborted by skip click

            if (i < text.length) {
                let char = text.charAt(i);
                if (char === '<') isTag = true;
                currentContent += char;
                if (char === '>') isTag = false;
                i++;

                if (isTag) {
                    type(); // Instant render for HTML tags to prevent layout breaking
                } else {
                    element.innerHTML = currentContent;
                    
                    // Auto-scroll to keep the latest text in view
                    element.scrollTop = element.scrollHeight;
                    if (element.parentElement) {
                        element.parentElement.scrollTop = element.parentElement.scrollHeight;
                    }
                    
                    typewriterTimeout = setTimeout(type, speed);
                }
            } else {
                isTyping = false;
                typeSound.pause();
                typeSound.currentTime = 0;
                if (callback) callback();
            }
        }
        type();
    }

    // --- 7. Footer Buttons ---
    window.logout = function() {
        localStorage.removeItem("username");
        window.location.href = "../user-auth/login.html";
    };

    // --- 8. Equip Logic ---
    const equipBtn = document.querySelector(".equip-btn");
    if (equipBtn) {
        equipBtn.addEventListener("click", async () => {
            if (!selectedItemId || !selectedSlotName) {
                alert("Please select both an item from your inventory and a limb slot.");
                return;
            }
            try {
                const response = await fetch(`${API_BASE_URL}/equip/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: username, item_id: selectedItemId, slot: selectedSlotName })
                });
                if (response.ok) {
                    const data = await response.json();
                    selectedItemId = null;
                    selectedSlotName = null;
                    updateUI(data.state); // Instant refresh
                } else {
                    const err = await response.json();
                    alert(err.error || "Failed to equip item.");
                }
            } catch(e) {
                console.error("Equip error:", e);
            }
        });
    }

    // --- 8.5. Unequip Logic ---
    const unequipBtn = document.querySelector(".unequip-btn");
    if (unequipBtn) {
        unequipBtn.addEventListener("click", async () => {
            if (!selectedSlotName) {
                alert("Please select a limb slot to unequip.");
                return;
            }
            try {
                const response = await fetch(`${API_BASE_URL}/unequip/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: username, slot: selectedSlotName })
                });
                if (response.ok) {
                    const data = await response.json();
                    selectedSlotName = null;
                    updateUI(data.state); // Instant refresh
                } else {
                    const err = await response.json();
                    alert(err.error || "Failed to unequip item.");
                }
            } catch(e) {
                console.error("Unequip error:", e);
            }
        });
    }
    
    // --- 8.6 Equip/Unequip Soul Cores ---
    const equipCoreBtn = document.querySelector(".equip-btn-core");
    if (equipCoreBtn) {
        equipCoreBtn.addEventListener("click", async () => {
            if (!selectedCoreId) {
                alert("Please select a Soul Core from your available list.");
                return;
            }
            try {
                const response = await fetch(`${API_BASE_URL}/equip/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: username, item_id: selectedCoreId, slot: "Soul Core" })
                });
                if (response.ok) {
                    const data = await response.json();
                    selectedCoreId = null;
                    showCoreDetails(null, "Soul Core");
                    updateUI(data.state);
                } else {
                    const err = await response.json();
                    alert(err.error || "Failed to equip Core.");
                }
            } catch(e) {
                console.error("Equip error:", e);
            }
        });
    }

    const unequipCoreBtn = document.querySelector(".unequip-btn-core");
    if (unequipCoreBtn) {
        unequipCoreBtn.addEventListener("click", async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/unequip/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: username, slot: "Soul Core" })
                });
                if (response.ok) {
                    const data = await response.json();
                    showCoreDetails(null, "Soul Core");
                    updateUI(data.state);
                } else {
                    const err = await response.json();
                    alert(err.error || "No Core currently bound.");
                }
            } catch(e) {
                console.error("Unequip error:", e);
            }
        });
    }

    // --- 9. Craft Logic ---
    const craftBtn = document.querySelector(".craft-btn");
    if (craftBtn) {
        craftBtn.addEventListener("click", async () => {
            if (!craftIng1 || !craftIng2) {
                alert("Please select two ingredients from the inventory grid.");
                return;
            }
            try {
                const response = await fetch(`${API_BASE_URL}/craft/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: username, item1_id: craftIng1.id, item2_id: craftIng2.id })
                });
                if (response.ok) {
                    const data = await response.json();
                    craftedItemName = data.crafted_item;
                    document.querySelectorAll(".craft-box")[2].innerHTML = `<span style="font-size: 0.7rem; text-align: center; color:#ffcc00; word-break: break-word; line-height: 1.1;">${craftedItemName}</span>`;
                    craftIng1 = null;
                    craftIng2 = null;
                    updateUI(data.state); // Instant refresh of inventory
                } else {
                    const err = await response.json();
                    alert(err.error || "Failed to craft item.");
                }
            } catch(e) {
                console.error("Craft error:", e);
            }
        });
    }

    // --- 10. Travel Logic ---
    async function handleTravel(locationName) {
        try {
            const response = await fetch(`${API_BASE_URL}/travel/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: username, destination: locationName })
            });
            if (response.ok) {
                const data = await response.json();
                document.getElementById("game-overlay").classList.add("hidden"); // Close map overlay
                playMenuTransitionSound();
                updateUI(data.state); // Instant refresh story node
            } else {
                const err = await response.json();
                alert(err.error || "Cannot travel there right now.");
            }
        } catch(e) {
            console.error("Travel error:", e);
        }
    }

    // Initialize the game loop on load
    fetchGameState();
});