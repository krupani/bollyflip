'use strict';

/* ============================================================
   BollyBash — app.js
   State · Router · Screens · Modals · Tutorial · Keyboard · Init
   ============================================================ */

const MAX_PLAYERS = 12;
const BG_COUNT = 6;
const LS_KEY = 'bollybash-v1';
const SAMPLE_PLAYER_NAMES = ['Aarav', 'Diya', 'Kabir', 'Meera'];

const state = {
    screen: 'home',          // home | selection | game | results
    players: [],             // { id, name, score }
    scoringEnabled: true,
    pendingName: '',
    nextPlayerId: 1,

    // Active game
    gameId: null,            // 'flip' | 'twist' | 'jumble'
    deck: [],
    index: 0,
    phase: 'question',       // 'question' | 'revealed'
    hintShown: false,
    selection: null,         // playerId | 'none'
    history: [],             // { cardId, movie, winnerId, points, hintUsed }

    // Tutorial modal
    tutorial: null,

    // Modal
    modal: null
};

function createAuthorFooter() {
    const footer = el('div', { class: 'author-footer' });
    footer.innerHTML = 'Made with <span class="heart">&hearts;</span> by '
        + '<a href="https://linkedin.com/in/kushrupani" target="_blank" rel="noopener noreferrer">Kaushal Rupani</a>';
    return footer;
}

/* ---------------- DOM helper ---------------- */
function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'checked' || k === 'disabled' || k === 'selected') node[k] = !!v;
        else node.setAttribute(k, v);
    }
    for (const c of children) {
        if (c === null || c === undefined || c === false) continue;
        if (Array.isArray(c)) node.append(...c.filter(x => x !== null && x !== undefined && x !== false));
        else node.append(c);
    }
    return node;
}

/* ---------------- Utilities ---------------- */
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function saveState() {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify({
            players: state.players,
            scoringEnabled: state.scoringEnabled,
            nextPlayerId: state.nextPlayerId,
            screen: state.screen === 'game' ? 'game' : (state.screen === 'results' ? 'results' : 'home'),
            gameId: state.gameId,
            deck: state.deck,
            index: state.index,
            phase: state.phase,
            hintShown: state.hintShown,
            history: state.history
        }));
    } catch (e) { /* ignore */ }
}

function loadState() {
    let raw;
    try { raw = localStorage.getItem(LS_KEY); } catch (e) { return; }
    if (!raw) return;
    let s;
    try { s = JSON.parse(raw); } catch (e) { return; }

    if (Array.isArray(s.players)) {
        state.players = s.players
            .filter(p => p && typeof p.name === 'string')
            .map(p => ({ id: p.id, name: p.name, score: Number(p.score) || 0 }));
    }
    if (typeof s.scoringEnabled === 'boolean') state.scoringEnabled = s.scoringEnabled;
    if (typeof s.nextPlayerId === 'number') state.nextPlayerId = s.nextPlayerId;

    if (s.screen === 'game'
        && s.gameId
        && window.BOLLYBASH_GAMES[s.gameId]
        && Array.isArray(s.deck) && s.deck.length > 0
        && typeof s.index === 'number' && s.index < s.deck.length) {
        state.screen = 'game';
        state.gameId = s.gameId;
        state.deck = s.deck;
        state.index = s.index;
        state.phase = s.phase === 'revealed' ? 'revealed' : 'question';
        state.hintShown = !!s.hintShown;
        state.history = Array.isArray(s.history) ? s.history : [];
        state.selection = null;
    } else if (s.screen === 'results') {
        state.screen = 'results';
        state.gameId = s.gameId || null;
    }
}

/* ---------------- Toasts ---------------- */
function showToast(message, type = 'info') {
    const toast = el('div', { class: `toast toast-${type}`, text: message });
    document.body.append(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 420);
    }, 1900);
}

/* ---------------- Confetti ---------------- */
let confettiRaf = null;
function launchConfetti(duration = 3600) {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.display = 'block';

    const colors = ['#ffd60a', '#ff2e63', '#00d9ff', '#a855f7', '#f5efe6', '#ffe45c'];
    const particles = [];
    const start = performance.now();
    const count = Math.min(180, Math.floor(window.innerWidth / 8));

    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: -20 - Math.random() * canvas.height * 0.6,
            vx: (Math.random() - 0.5) * 3,
            vy: Math.random() * 3 + 2,
            w: Math.random() * 10 + 6,
            h: Math.random() * 6 + 4,
            rot: Math.random() * Math.PI,
            vr: (Math.random() - 0.5) * 0.22,
            color: colors[Math.floor(Math.random() * colors.length)],
            sway: Math.random() * 2
        });
    }

    if (confettiRaf) cancelAnimationFrame(confettiRaf);

    function frame(now) {
        const t = now - start;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const p of particles) {
            p.x += p.vx + Math.sin(now / 380 + p.sway) * 0.9;
            p.y += p.vy;
            p.rot += p.vr;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        }
        if (t < duration) {
            confettiRaf = requestAnimationFrame(frame);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.style.display = 'none';
            confettiRaf = null;
        }
    }
    confettiRaf = requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
    const c = document.getElementById('confetti-canvas');
    if (c && c.style.display === 'block') {
        c.width = window.innerWidth;
        c.height = window.innerHeight;
    }
    if (state.screen === 'game') fitClueText();
});

/* ---------------- Fit long clue text ---------------- */
function fitClueText() {
    requestAnimationFrame(() => {
        const center = document.querySelector('.game-center');
        if (!center) return;
        const clue = center.querySelector('.clue-text, .jumble-clue');
        if (!clue) return;
        const reveal = center.querySelector('.movie-reveal');
        const hint = center.querySelector('.hint-card');
        const used = (reveal ? reveal.offsetHeight + 30 : 0) + (hint ? hint.offsetHeight + 26 : 0);
        const avail = center.clientHeight - used - 36;
        let size = parseFloat(getComputedStyle(clue).fontSize);
        let guard = 0;
        while (clue.scrollHeight > avail && size > 16 && guard < 90) {
            size -= 2;
            clue.style.fontSize = size + 'px';
            guard++;
        }
    });
}

/* ---------------- Dense-rank helper ---------------- */
function buildRankMap(ranked) {
    const unique = [...new Set(ranked.map(p => p.score))].sort((a, b) => b - a);
    const map = new Map();
    unique.forEach((s, i) => map.set(s, i + 1));
    return map;
}

/* ---------------- Deck prep ---------------- */
function prepareDeck(gameId) {
    const game = window.BOLLYBASH_GAMES[gameId];
    if (!game) return [];
    const raw = game.getData();
    const cards = [];
    for (const c of raw) {
        const prep = game.prepareCard(c);
        if (prep) cards.push(prep);
    }
    return cards;
}

/* ---------------- Scramble Reveal Animation ---------------- */
function scrambleText(element, finalText, duration = 900) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*';
    const start = performance.now();

    function frame(now) {
        const progress = (now - start) / duration;
        if (progress < 1) {
            let current = '';
            for (let i = 0; i < finalText.length; i++) {
                if (finalText[i] === ' ') {
                    current += ' ';
                } else if (Math.random() < progress) {
                    current += finalText[i];
                } else {
                    current += chars[Math.floor(Math.random() * chars.length)];
                }
            }
            element.textContent = current;
            requestAnimationFrame(frame);
        } else {
            element.textContent = finalText;
            // Transition to gold gradient
            element.style.background = 'linear-gradient(90deg, #ffe45c, #ffd60a, #f59e0b)';
            element.style.webkitBackgroundClip = 'text';
            element.style.backgroundClip = 'text';
            element.style.color = 'transparent';
            element.style.filter = 'drop-shadow(0 2px 18px rgba(255,214,10,0.4))';
        }
    }
    requestAnimationFrame(frame);
}

/* ============================================================
   ROUTER
   ============================================================ */
function render() {
    if (state.screen === 'home') renderHome();
    else if (state.screen === 'selection') renderSelection();
    else if (state.screen === 'game') renderGame();
    else if (state.screen === 'results') renderResults();
    renderModal();
}

/* ============================================================
   HOME
   ============================================================ */
function canProceedFromHome() {
    if (!state.scoringEnabled) return true;
    return state.players.length >= 2;
}

function renderHome() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    const screen = el('div', { class: 'screen home-screen' });

    // Header
    screen.append(el('header', { class: 'home-header' },
        el('div', { class: 'home-eyebrow' }, 'Bollywood Night'),
        el('h1', { class: 'title-xl' },
            'Bollywood ',
            el('span', { class: 'accent' }, 'Bash')
        ),
        el('p', { class: 'home-subtitle' }, 'Three games. One screen. Zero mercy.')
    ));

    // Player card
    const playerCard = el('section', { class: 'card-glass' });

    const inputRow = el('div', { class: 'input-row' + (state.scoringEnabled ? '' : ' disabled-zone') });
    const input = el('input', {
        type: 'text',
        class: 'name-input',
        placeholder: state.scoringEnabled ? 'Enter player name' : 'Scoring disabled',
        maxlength: '20',
        disabled: !state.scoringEnabled || state.players.length >= MAX_PLAYERS
    });
    input.value = state.pendingName;
    input.addEventListener('input', e => { state.pendingName = e.target.value; });
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); addPlayer(); }
    });

    const addBtn = el('button', {
        class: 'btn btn-primary',
        type: 'button',
        disabled: !state.scoringEnabled || state.players.length >= MAX_PLAYERS
    }, 'Add');
    addBtn.addEventListener('click', addPlayer);
    inputRow.append(input, addBtn);
    playerCard.append(inputRow);

    // Chips
    const chipList = el('div', { class: 'chip-list' + (state.scoringEnabled ? '' : ' disabled-zone') });
    if (state.players.length === 0) {
        chipList.append(el('p', { class: 'empty-hint' },
            'Add at least 2 players to start — or tick “Skip Score” for a no-score game.'
        ));
    } else {
        for (const p of state.players) {
            const chip = el('span', { class: 'chip' },
                el('span', { text: p.name }),
                el('button', { class: 'chip-x', type: 'button', title: 'Remove' }, '✕')
            );
            chip.querySelector('.chip-x').addEventListener('click', () => removePlayer(p.id));
            chipList.append(chip);
        }
    }
    playerCard.append(chipList);

    // Skip score
    const skipWrap = el('label', { class: 'checkbox-row home-skip' });
    const skipBox = el('input', { type: 'checkbox' });
    skipBox.checked = !state.scoringEnabled;
    skipBox.addEventListener('change', (e) => {
        state.scoringEnabled = !e.target.checked;
        if (!state.scoringEnabled) state.pendingName = '';
        saveState();
        renderHome();
    });
    skipWrap.append(
        skipBox,
        el('span', { class: 'checkbox-custom' }),
        el('span', { text: 'Skip Score (no points, just for fun)' })
    );
    playerCard.append(skipWrap);
    screen.append(playerCard);

    // Actions
    const actions = el('div', { class: 'home-actions' });
    const nextBtn = el('button', {
        class: 'btn btn-primary btn-large',
        type: 'button',
        disabled: !canProceedFromHome()
    }, 'Next · Choose Game →');
    nextBtn.addEventListener('click', () => {
        if (!canProceedFromHome()) return;
        state.screen = 'selection';
        saveState();
        render();
    });
    actions.append(nextBtn);

    if (!canProceedFromHome()) {
        actions.append(el('p', { class: 'home-hint' }, 'Need at least 2 players (or enable Skip Score).'));
    }
    screen.append(actions);

    screen.append(el('p', { class: 'home-footer' }, `${state.players.length} / ${MAX_PLAYERS} players`));

    screen.append(createAuthorFooter());

    app.append(screen);

    if (state.scoringEnabled && state.players.length < MAX_PLAYERS) {
        requestAnimationFrame(() => input.focus());
    }
}

function addPlayer() {
    if (!state.scoringEnabled || state.players.length >= MAX_PLAYERS) return;
    const name = state.pendingName.trim();
    if (!name) return;
    if (state.players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        showToast('That name is already taken!', 'error');
        return;
    }
    state.players.push({ id: state.nextPlayerId++, name, score: 0 });
    state.pendingName = '';
    saveState();
    renderHome();
}

function removePlayer(id) {
    state.players = state.players.filter(p => p.id !== id);
    saveState();
    renderHome();
}

/* ============================================================
   SELECTION
   ============================================================ */
function renderSelection() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    const screen = el('div', { class: 'screen bg-0 selection-screen' });

    const back = el('button', { class: 'back-btn', type: 'button', title: 'Back to players' }, '←');
    back.addEventListener('click', () => {
        state.screen = 'home';
        saveState();
        render();
    });
    screen.append(back);

    screen.append(el('div', { class: 'selection-header' },
        el('h2', { class: 'selection-title' }, 'Pick Your Poison'),
        el('p', { class: 'selection-subtitle' }, 'Tap a card to play. Tap ', el('b', {}, 'ⓘ'), ' for rules.')
    ));

    const grid = el('div', { class: 'games-grid' });

    for (const gameId of ['flip', 'twist', 'jumble']) {
        const game = window.BOLLYBASH_GAMES[gameId];
        if (!game) continue;

        const card = el('div', { class: `game-card accent-${game.accent}` });
        card.addEventListener('click', () => startGame(gameId));

        const infoBtn = el('button', {
            class: 'game-info-btn',
            type: 'button',
            title: 'How to play',
            'aria-label': 'How to play ' + game.name
        }, 'i');
        infoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openTutorial(gameId);
        });
        card.append(infoBtn);

        card.append(el('div', { class: 'game-icon' }, game.emoji));
        card.append(el('div', { class: 'game-info' },
            el('div', { class: 'game-name' }, game.name),
            el('div', { class: 'game-tagline' }, game.tagline)
        ));
        card.append(el('div', { class: 'game-go' }, 'Let\'s Go ', el('span', {}, '→')));

        grid.append(card);
    }

    screen.append(grid);
    screen.append(createAuthorFooter());
    app.append(screen);
}

function startGame(gameId) {
    const game = window.BOLLYBASH_GAMES[gameId];
    if (!game) return;
    const deck = prepareDeck(gameId);
    if (deck.length === 0) {
        showToast('No cards for this game. Check the data file.', 'error');
        return;
    }

    state.gameId = gameId;
    state.deck = shuffle(deck);
    state.index = 0;
    state.phase = 'question';
    state.hintShown = false;
    state.selection = null;
    state.history = [];
    state.players.forEach(p => { p.score = 0; });
    state.screen = 'game';

    saveState();
    render();
}

/* ============================================================
   GAMEPLAY
   ============================================================ */
function renderGame() {
    const app = document.getElementById('app');
    app.innerHTML = '';

    if (!state.gameId || state.index >= state.deck.length) {
        state.screen = 'results';
        render();
        return;
    }

    const game = window.BOLLYBASH_GAMES[state.gameId];
    const card = state.deck[state.index];
    const bg = state.index % BG_COUNT;
    const screen = el('div', { class: `screen game-screen bg-${bg}` });

    // Topbar
    const topbar = el('div', { class: 'game-topbar' });
    topbar.append(el('div', { class: 'game-id-block' },
        el('span', { class: 'game-id-label' }, 'Movie'),
        el('span', { class: 'game-id' }, '#' + card.id),
        el('span', { class: 'game-progress' }, `${state.index + 1} / ${state.deck.length}`)
    ));

    if (state.scoringEnabled) {
        topbar.append(renderMiniLeaderboard());
    } else {
        topbar.append(el('span'));
    }

    const closeBtn = el('button', { class: 'close-btn', type: 'button', title: 'Quit game' }, '✕');
    closeBtn.addEventListener('click', requestExit);
    topbar.append(closeBtn);
    screen.append(topbar);

    // Center
    const center = el('div', { class: 'game-center' });
    const clue = el('div', { class: game.displayClass }, game.getDisplayText(card));

    if (state.phase === 'revealed') {
        // Show the original clue large and bright, just slightly scaled down
        center.append(el('div', {
            class: game.displayClass + ' clue-revealed'
        }, game.getDisplayText(card)));

        const titleEl = el('span', { class: 'movie-reveal-title' }, '...');

        center.append(el('div', { class: 'movie-reveal' },
            el('span', { class: 'movie-reveal-label' }, 'The movie was'),
            titleEl
        ));

        // Trigger the scramble animation
        requestAnimationFrame(() => scrambleText(titleEl, game.getAnswer(card)));

    } else {
        center.append(clue);
    }

    if (state.hintShown) {
        const hint = game.getHint(card);
        if (hint) {
            center.append(el('div', { class: 'hint-card' },
                el('span', { class: 'hint-icon' }, '💡'),
                el('span', { class: 'hint-text' }, hint)
            ));
        }
    }

    screen.append(center);

    // Bottom
    const bottom = el('div', { class: 'game-bottom' });

    if (state.phase === 'revealed' && state.scoringEnabled) {
        bottom.append(renderScoringPanel('game'));
    }

    const actions = el('div', { class: 'game-actions' });

    if (state.phase === 'question') {
        const hasHint = !!game.getHint(card);

        if (hasHint && !state.hintShown) {
            const wrap = el('div', { class: 'btn-hint-wrap' });
            const hintBtn = el('button', { class: 'btn-hint', type: 'button' }, '💡 Show Hint');
            hintBtn.addEventListener('click', showHint);
            wrap.append(hintBtn, el('span', { class: 'hint-cost' }, '−1 pt'));
            actions.append(wrap);
        } else if (hasHint && state.hintShown) {
            const wrap = el('div', { class: 'btn-hint-wrap' });
            const hintBtn = el('button', { class: 'btn-hint disabled', type: 'button', disabled: true }, '💡 Hint Used');
            wrap.append(hintBtn, el('span', { class: 'hint-cost' }, '1 pt round'));
            actions.append(wrap);
        }

        const revealBtn = el('button', { class: 'btn btn-primary btn-reveal', type: 'button' }, 'Reveal Answer');
        revealBtn.addEventListener('click', revealAnswer);
        actions.append(revealBtn);
    } else {
        const isLast = state.index + 1 >= state.deck.length;
        const nextBtn = el('button', {
            class: 'btn btn-primary btn-next',
            type: 'button',
            disabled: state.scoringEnabled && state.selection === null
        }, isLast ? 'Finish Game 🏁' : 'Next Movie →');
        nextBtn.addEventListener('click', nextMovie);
        actions.append(nextBtn);
    }

    bottom.append(actions);

    if (state.phase === 'question') {
        const skipLink = el('button', { class: 'link-btn', type: 'button' }, 'Skip this movie');
        skipLink.addEventListener('click', skipMovie);
        bottom.append(skipLink);
    }

    screen.append(bottom);
    screen.append(createAuthorFooter());
    app.append(screen);

    fitClueText();
}

function renderMiniLeaderboard() {
    const ranked = [...state.players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    const rankMap = buildRankMap(ranked);
    const top = ranked.slice(0, 3);
    const rest = ranked.length - top.length;

    const btn = el('button', { class: 'mini-leaderboard', type: 'button', title: 'View full leaderboard' });
    btn.append(el('span', {}, '🏆'));
    top.forEach((p) => {
        const rank = rankMap.get(p.score);
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '·';
        btn.append(el('span', { class: 'ml-entry' }, `${medal} ${p.name} `, el('b', {}, String(p.score))));
    });
    if (rest > 0) btn.append(el('span', { class: 'ml-more' }, `+${rest}`));
    btn.addEventListener('click', () => {
        state.modal = { type: 'leaderboard' };
        renderModal();
    });
    return btn;
}

function renderScoringPanel(mode) {
    const isGame = mode === 'game';
    const selection = isGame ? state.selection : state.tutorial.selection;
    const points = (isGame ? state.hintShown : state.tutorial.hintShown) ? 1 : 2;
    const players = isGame
        ? state.players
        : SAMPLE_PLAYER_NAMES.map((name, i) => ({ id: 'sample-' + i, name }));

    const panel = el('div', { class: 'scoring-panel' });
    const labelText = points === 1
        ? 'Who got it? — 1 pt (hint used)'
        : 'Who got it? — 2 pts';
    const label = el('div', { class: 'scoring-label' });
    // Highlight the points
    const [before, after] = labelText.split(/(\d pts?)/);
    label.append(document.createTextNode(before));
    if (after) label.append(el('b', {}, after.replace('pts', 'pts').trim()));
    if (labelText.includes('(hint used)')) label.append(document.createTextNode(' (hint used)'));
    // Simpler: rebuild label with b tag inside
    panel.append(el('div', {
        class: 'scoring-label', html:
            points === 1
                ? 'Who got it? — <b>1 pt</b> (hint used)'
                : 'Who got it? — <b>2 pts</b>'
    }));

    const grid = el('div', { class: 'radio-grid' });

    const makePill = (id, text, extraClass) => {
        const isSel = String(selection) === String(id);
        const pill = el('label', {
            class: 'radio-pill' + (extraClass ? ' ' + extraClass : '') + (isSel ? ' selected' : ''),
            'data-player-id': String(id)
        });
        const radio = el('input', { type: 'radio', name: 'winner-' + mode });
        radio.checked = isSel;
        radio.addEventListener('change', () => {
            if (isGame) state.selection = id;
            else state.tutorial.selection = id;
            updateScoringUI(mode);
        });
        pill.append(radio, el('span', {}, text));
        return pill;
    };

    players.forEach(p => grid.append(makePill(p.id, p.name)));
    grid.append(makePill('none', 'Nobody / Pass', 'nobody'));
    panel.append(grid);
    return panel;
}

function updateScoringUI(mode) {
    const selection = mode === 'game' ? state.selection : state.tutorial.selection;
    document.querySelectorAll('.radio-pill').forEach(label => {
        const id = label.getAttribute('data-player-id');
        const isSel = String(selection) === String(id);
        label.classList.toggle('selected', isSel);
        const input = label.querySelector('input');
        if (input) input.checked = isSel;
    });
    const nextBtn = document.querySelector('.btn-next');
    if (nextBtn) nextBtn.disabled = selection === null;
}

function showHint() {
    const game = window.BOLLYBASH_GAMES[state.gameId];
    const card = state.deck[state.index];
    if (!game.getHint(card)) return;
    state.hintShown = true;
    saveState();
    render();
}

function revealAnswer() {
    state.phase = 'revealed';
    state.selection = null;
    saveState();
    render();
}

function nextMovie() {
    if (state.scoringEnabled && state.selection === null) return;

    const game = window.BOLLYBASH_GAMES[state.gameId];
    const card = state.deck[state.index];
    let winnerName = null;
    let points = 0;

    if (state.scoringEnabled) {
        const winnerId = state.selection;
        if (winnerId !== 'none') {
            points = state.hintShown ? 1 : 2;
            const winner = state.players.find(p => p.id === winnerId);
            if (winner) {
                winner.score += points;
                winnerName = winner.name;
            }
        }
        state.history.push({
            cardId: card.id,
            movie: game.getAnswer(card),
            winnerId: winnerId === 'none' ? null : winnerId,
            points,
            hintUsed: state.hintShown
        });
    }

    state.index += 1;
    state.phase = 'question';
    state.hintShown = false;
    state.selection = null;

    if (state.index >= state.deck.length) {
        state.screen = 'results';
        saveState();
        render();
        return;
    }

    saveState();
    render();

    if (winnerName && points > 0) {
        showToast(points === 2 ? `+2 ${winnerName}` : `+1 ${winnerName} (hint)`, points === 2 ? 'success' : 'hint');
    }
}

function skipMovie() {
    state.index += 1;
    state.phase = 'question';
    state.hintShown = false;
    state.selection = null;

    if (state.index >= state.deck.length) {
        state.screen = 'results';
        saveState();
        render();
        return;
    }
    saveState();
    render();
}

/* ============================================================
   EXIT
   ============================================================ */
function requestExit() {
    if (state.scoringEnabled) {
        const maxScore = state.players.reduce((m, p) => Math.max(m, p.score), 0);
        let message;
        if (maxScore === 0) {
            message = 'Are you sure you want to quit? No one has scored yet.';
        } else {
            const leaders = state.players.filter(p => p.score === maxScore);
            if (leaders.length === 1) {
                message = `Are you sure? ${leaders[0].name} is leading with ${maxScore} point${maxScore === 1 ? '' : 's'} and will win.`;
            } else if (leaders.length <= 3) {
                message = `Are you sure? It's a tie between ${leaders.map(p => p.name).join(' & ')} with ${maxScore} points each.`;
            } else {
                message = `Are you sure? ${leaders.slice(0, 3).map(p => p.name).join(', ')} and ${leaders.length - 3} others are tied at ${maxScore} points.`;
            }
        }
        state.modal = { type: 'confirmExit', message };
    } else {
        state.modal = { type: 'confirmExit', message: 'Are you sure you want to quit?' };
    }
    renderModal();
}

function confirmExit() {
    const hadScores = state.scoringEnabled && state.players.some(p => p.score > 0);
    state.modal = null;

    if (hadScores) {
        state.screen = 'results';
    } else {
        state.screen = 'selection';
        state.gameId = null;
        state.deck = [];
        state.index = 0;
        state.phase = 'question';
        state.hintShown = false;
        state.selection = null;
    }
    saveState();
    render();
}

/* ============================================================
   RESULTS
   ============================================================ */
function renderResults() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    const screen = el('div', { class: 'screen results-screen' });

    if (!state.scoringEnabled) {
        screen.append(el('div', { class: 'results-header' },
            el('div', { class: 'trophy' }, '🎉'),
            el('h1', { class: 'results-title' }, 'Game Complete!'),
            el('p', { class: 'winner-score' }, 'Hope everyone had fun!')
        ));
    } else {
        const ranked = [...state.players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
        const rankMap = buildRankMap(ranked);
        const maxScore = ranked.length ? ranked[0].score : 0;
        const top = ranked.filter(p => p.score === maxScore);

        screen.append(el('div', { class: 'results-header' },
            el('div', { class: 'trophy' }, '🏆'),
            el('h1', { class: 'results-title' }, top.length > 1 ? "It's a Tie!" : 'Winner!'),
            el('div', { class: 'winner-name' }, top.map(p => p.name).join(' & ')),
            el('div', { class: 'winner-score' }, `${maxScore} point${maxScore === 1 ? '' : 's'}`)
        ));

        const rankList = el('div', { class: 'final-ranking' });
        ranked.forEach(p => {
            const rank = rankMap.get(p.score);
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
            rankList.append(el('div', { class: 'rank-row' + (rank <= 3 ? ' top' : '') },
                el('span', { class: 'rank-medal' }, medal),
                el('span', { class: 'rank-name' }, p.name),
                el('span', { class: 'rank-score' }, String(p.score))
            ));
        });
        screen.append(rankList);
    }

    const actions = el('div', { class: 'results-actions' });

    const playAgain = el('button', { class: 'btn btn-primary btn-large', type: 'button' }, 'Play Again');
    playAgain.addEventListener('click', () => {
        if (state.gameId) startGame(state.gameId);
    });

    const chooseGame = el('button', { class: 'btn btn-ghost btn-large', type: 'button' }, 'Choose Another Game');
    chooseGame.addEventListener('click', () => {
        state.screen = 'selection';
        state.gameId = null;
        state.deck = [];
        state.index = 0;
        state.phase = 'question';
        state.hintShown = false;
        state.selection = null;
        saveState();
        render();
    });

    const homeBtn = el('button', { class: 'btn btn-ghost btn-large', type: 'button' }, 'Home');
    homeBtn.addEventListener('click', () => {
        state.screen = 'home';
        state.gameId = null;
        state.deck = [];
        state.index = 0;
        state.phase = 'question';
        state.hintShown = false;
        state.selection = null;
        state.history = [];
        state.players.forEach(p => { p.score = 0; });
        saveState();
        render();
    });

    actions.append(playAgain, chooseGame, homeBtn);
    screen.append(actions);
    screen.append(createAuthorFooter());
    app.append(screen);

    if (state.scoringEnabled) setTimeout(() => launchConfetti(3600), 120);
}

/* ============================================================
   MODALS
   ============================================================ */
function renderModal() {
    const existing = document.querySelector('.modal-backdrop');
    if (existing) existing.remove();
    if (!state.modal) return;

    const backdrop = el('div', { class: 'modal-backdrop' });
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeModal();
    });

    if (state.modal.type === 'leaderboard') {
        backdrop.append(renderLeaderboardModal());
    } else if (state.modal.type === 'confirmExit') {
        backdrop.append(renderConfirmModal());
    } else if (state.modal.type === 'tutorial') {
        backdrop.append(renderTutorialModal());
    }

    document.body.append(backdrop);
}

function renderLeaderboardModal() {
    const modal = el('div', { class: 'modal' });
    modal.append(el('h2', { class: 'modal-title' }, 'Leaderboard'));

    const ranked = [...state.players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    const rankMap = buildRankMap(ranked);

    const list = el('div', { class: 'lb-list' });
    if (ranked.length === 0) {
        list.append(el('p', { class: 'lb-empty' }, 'No players yet.'));
    }
    ranked.forEach(p => {
        const rank = rankMap.get(p.score);
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
        list.append(el('div', { class: 'lb-row' + (rank === 1 ? ' top' : '') },
            el('span', { class: 'lb-medal' }, medal),
            el('span', { class: 'lb-name' }, p.name),
            el('span', { class: 'lb-score' }, String(p.score))
        ));
    });
    modal.append(list);

    const actions = el('div', { class: 'modal-actions' });
    const undoBtn = el('button', { class: 'btn btn-ghost', type: 'button' }, '↶ Undo last round');
    undoBtn.disabled = state.history.length === 0;
    undoBtn.addEventListener('click', undoLastRound);
    const closeBtn = el('button', { class: 'btn btn-primary', type: 'button' }, 'Close');
    closeBtn.addEventListener('click', closeModal);
    actions.append(undoBtn, closeBtn);
    modal.append(actions);

    return modal;
}

function renderConfirmModal() {
    const modal = el('div', { class: 'modal' });
    modal.append(el('h2', { class: 'modal-title' }, 'Quit Game?'));
    modal.append(el('p', { class: 'modal-message' }, state.modal.message));

    const actions = el('div', { class: 'modal-actions' });
    const cancelBtn = el('button', { class: 'btn btn-ghost', type: 'button' }, 'Keep Playing');
    cancelBtn.addEventListener('click', closeModal);
    const exitBtn = el('button', { class: 'btn btn-danger', type: 'button' }, 'Quit');
    exitBtn.addEventListener('click', confirmExit);
    actions.append(cancelBtn, exitBtn);
    modal.append(actions);

    return modal;
}

function undoLastRound() {
    if (state.history.length === 0) return;
    const last = state.history.pop();
    if (last.winnerId != null) {
        const p = state.players.find(p => p.id === last.winnerId);
        if (p && p.score >= last.points) p.score -= last.points;
    }
    saveState();
    showToast('Last round undone', 'info');

    const old = document.querySelector('.mini-leaderboard');
    if (old) old.replaceWith(renderMiniLeaderboard());

    renderModal();
}

function closeModal() {
    state.modal = null;
    state.tutorial = null;
    const m = document.querySelector('.modal-backdrop');
    if (m) m.remove();
}

/* ============================================================
   TUTORIAL
   ============================================================ */
function openTutorial(gameId) {
    const game = window.BOLLYBASH_GAMES[gameId];
    if (!game) return;

    const rawSamples = (window.SAMPLE_DATA && window.SAMPLE_DATA[gameId]) || [];
    let cards = [];
    for (const c of rawSamples) {
        const prep = game.prepareCard(c);
        if (prep) cards.push(prep);
    }
    if (cards.length === 0) {
        const rawReal = game.getData().slice(0, 3);
        for (const c of rawReal) {
            const prep = game.prepareCard(c);
            if (prep) cards.push(prep);
        }
    }
    if (cards.length === 0) {
        showToast('No sample data available for this game.', 'error');
        return;
    }

    state.tutorial = {
        gameId,
        sampleCards: cards,
        sampleIndex: 0,
        phase: 'question',
        hintShown: false,
        selection: null
    };
    state.modal = { type: 'tutorial' };
    renderModal();
}

function renderTutorialModal() {
    const tut = state.tutorial;
    const game = window.BOLLYBASH_GAMES[tut.gameId];
    const card = tut.sampleCards[tut.sampleIndex];

    const accentVar = game.accent === 'pink'
        ? '--tut-accent: #ff2e63; --tut-accent-glow: rgba(255,46,99,0.5);'
        : game.accent === 'cyan'
            ? '--tut-accent: #00d9ff; --tut-accent-glow: rgba(0,217,255,0.5);'
            : '--tut-accent: #ffd60a; --tut-accent-glow: rgba(255,214,10,0.5);';

    const modal = el('div', { class: 'modal tutorial-modal', style: accentVar });

    const closeBtn = el('button', { class: 'tutorial-close', type: 'button', title: 'Close' }, '✕');
    closeBtn.addEventListener('click', closeModal);
    modal.append(closeBtn);

    modal.append(el('div', { class: 'tutorial-header' },
        el('div', { class: 'tutorial-icon' }, game.emoji),
        el('div', {},
            el('div', { class: 'tutorial-name' }, game.name),
            el('div', { class: 'tutorial-tagline' }, game.tagline)
        )
    ));

    const rulesList = el('ul', { class: 'tutorial-rules' });
    game.rules.forEach(r => rulesList.append(el('li', {}, r)));
    modal.append(rulesList);

    // Sample stage
    const stage = el('div', { class: 'sample-stage' });
    stage.append(el('span', { class: 'sample-badge-corner' }, 'Sample'));
    stage.append(el('span', { class: 'sample-counter' }, `${tut.sampleIndex + 1} / ${tut.sampleCards.length}`));

    if (tut.phase === 'question') {
        stage.append(el('div', { class: game.displayClass }, game.getDisplayText(card)));
        if (tut.hintShown) {
            const hint = game.getHint(card);
            if (hint) stage.append(el('div', { class: 'hint-card' },
                el('span', { class: 'hint-icon' }, '💡'),
                el('span', { class: 'hint-text' }, hint)
            ));
        }
    } else {
        stage.append(el('div', {
            class: 'clue-text clue-text--medium',
            style: 'opacity:0.75; margin-bottom: 8px;'
        }, game.getDisplayText(card)));

        stage.append(el('div', { class: 'movie-reveal' },
            el('span', { class: 'movie-reveal-label' }, 'The movie was'),
            el('span', { class: 'movie-reveal-title' }, game.getAnswer(card))
        ));
    }

    modal.append(stage);

    // Scoring (revealed phase)
    if (tut.phase === 'revealed') {
        const panel = renderScoringPanel('tutorial');
        modal.append(panel);
    }

    // Actions
    const actions = el('div', { class: 'tutorial-actions' });

    if (tut.phase === 'question') {
        const hasHint = !!game.getHint(card);
        if (hasHint && !tut.hintShown) {
            const wrap = el('div', { class: 'btn-hint-wrap' });
            const hintBtn = el('button', { class: 'btn-hint', type: 'button' }, '💡 Show Hint');
            hintBtn.addEventListener('click', tutorialHint);
            wrap.append(hintBtn, el('span', { class: 'hint-cost' }, '−1 pt'));
            actions.append(wrap);
        } else if (hasHint && tut.hintShown) {
            const wrap = el('div', { class: 'btn-hint-wrap' });
            wrap.append(el('button', { class: 'btn-hint disabled', type: 'button', disabled: true }, '💡 Hint Used'));
            actions.append(wrap);
        }

        const revealBtn = el('button', { class: 'btn btn-primary btn-reveal', type: 'button' }, 'Reveal Answer');
        revealBtn.addEventListener('click', tutorialReveal);
        actions.append(revealBtn);
    } else {
        const nextBtn = el('button', {
            class: 'btn btn-primary btn-next',
            type: 'button',
            disabled: tut.selection === null
        }, 'Next Sample →');
        nextBtn.addEventListener('click', tutorialNext);
        actions.append(nextBtn);
    }

    modal.append(actions);
    return modal;
}

function tutorialHint() {
    if (!state.tutorial) return;
    const game = window.BOLLYBASH_GAMES[state.tutorial.gameId];
    const card = state.tutorial.sampleCards[state.tutorial.sampleIndex];
    if (!game.getHint(card)) return;
    state.tutorial.hintShown = true;
    renderModal();
}

function tutorialReveal() {
    if (!state.tutorial) return;
    state.tutorial.phase = 'revealed';
    state.tutorial.selection = null;
    renderModal();
}

function tutorialNext() {
    if (!state.tutorial) return;
    if (state.tutorial.selection === null) return;
    state.tutorial.sampleIndex = (state.tutorial.sampleIndex + 1) % state.tutorial.sampleCards.length;
    state.tutorial.phase = 'question';
    state.tutorial.hintShown = false;
    state.tutorial.selection = null;
    renderModal();
}

/* ============================================================
   KEYBOARD
   ============================================================ */
document.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;

    // Modal open
    if (state.modal) {
        if (state.modal.type === 'tutorial') {
            if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
            if (e.key === ' ' || e.key === 'Spacebar') {
                if (state.tutorial && state.tutorial.phase === 'question') {
                    e.preventDefault(); tutorialReveal();
                }
                return;
            }
            if (e.key === 'Enter' || e.key === 'ArrowRight') {
                if (state.tutorial && state.tutorial.phase === 'revealed' && state.tutorial.selection !== null) {
                    e.preventDefault(); tutorialNext();
                }
                return;
            }
            return;
        }
        if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
        return;
    }

    if (state.screen !== 'game') return;

    const btnFocused = active && active.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter');

    if (e.key === ' ' || e.key === 'Spacebar') {
        if (btnFocused) return;
        if (state.phase === 'question') { e.preventDefault(); revealAnswer(); }
    } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
        if (btnFocused) return;
        if (state.phase === 'revealed') {
            const needSel = state.scoringEnabled;
            if (!needSel || state.selection !== null) {
                e.preventDefault();
                nextMovie();
            }
        }
    } else if (e.key === 'Escape') {
        e.preventDefault();
        requestExit();
    }
});

/* ============================================================
   INIT
   ============================================================ */
function init() {
    const app = document.getElementById('app');

    // Failsafe check for games.js
    if (!window.BOLLYBASH_GAMES) {
        app.innerHTML = '';
        app.append(el('div', { class: 'screen bg-0 home-screen' },
            el('div', { class: 'error-box' },
                el('h2', {}, 'Missing Game Registry'),
                el('p', {}, 'The file scripts/games.js could not be found or failed to load.'),
                el('p', {}, 'Check your folder structure and ensure <script src="scripts/games.js"></script> is in index.html.'),
                el('button', {
                    class: 'btn btn-primary',
                    style: 'margin-top:16px;',
                    onclick: () => location.reload(),
                }, 'Reload')
            )
        ));
        console.error('[BollyBash] scripts/games.js is missing!');
        return;
    }

    loadState();
    render();
}

init();