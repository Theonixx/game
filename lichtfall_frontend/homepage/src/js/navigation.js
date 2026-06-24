// Grab elements from the DOM
const navButtons = document.querySelectorAll('.navigation-btns-action');
const overlay = document.getElementById('game-overlay');
const closeBtn = document.getElementById('close-overlay');
const overlayTitle = document.getElementById('overlay-title');
const tabContents = document.querySelectorAll('.tab-content');

// Add click events to all navigation buttons
navButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetId = button.getAttribute('data-target');
        const titleText = button.textContent;

        // 1. Change the overlay header title
        overlayTitle.textContent = titleText.toUpperCase();

        // 2. Hide all tab content
        tabContents.forEach(tab => {
            tab.classList.remove('active');
        });

        // 3. Show the specific tab content that was clicked
        const targetTab = document.getElementById(targetId);
        if (targetTab) {
            targetTab.classList.add('active');
            if (targetId === 'tab-save' && typeof window.refreshSaveUI === 'function') {
                window.refreshSaveUI();
            }
        }

        // 4. Reveal the overlay
        overlay.classList.remove('hidden');
        if (typeof window.playMenuTransitionSound === 'function') {
            window.playMenuTransitionSound();
        }
    });
});

// Add click event to the close button
closeBtn.addEventListener('click', () => {
    overlay.classList.add('hidden');
    if (typeof window.playMenuTransitionSound === 'function') {
        window.playMenuTransitionSound();
    }
});