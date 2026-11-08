'use strict';

/* ============================================================
   BollyFlip — app.js
   ============================================================ */

const MAX_PLAYERS = 16;
const BG_COUNT = 6;
const LS_KEY = 'diwali-bollywood-opposite-v1';
const SAMPLE_PLAYER_NAMES = ['Aarav', 'Diya', 'Kabir', 'Meera'];

let GAME_DATA = [];
let SAMPLE_DATA = [];

const state = {
    screen: 'home',
    players: [],
    scoringEnabled: true,
    pendingName: '',
    nextPlayerId: 1,
    deck: [],
    index: 0,
    phase: 'question',
    selection: null,
    history: [],
    howtoStep: 'instructions',
    howtoIndex: 0,
    howtoPhase: 'question',
    howtoSelection: null,
    howtoId: null,
    modal: null,
};

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

function randomSampleId() {
    return Math.floor(Math.random() * 90) + 10;
}

function saveState() {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify({
            players: state.players,
            scoringEnabled: state.scoringEnabled,
            nextPlayerId: state.nextPlayerId,
            screen: state.screen,
            deck: state.deck,
            index: state.index,
            history: state.history,
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
        && Array.isArray(s.deck) && s.deck.length > 0
        && typeof s.index === 'number' && s.index < s.deck.length) {
        state.deck = s.deck;
        state.index = s.index;
        state.history = Array.isArray(s.history) ? s.history : [];
        state.screen = 'game';
        state.phase = 'question';
        state.selection = null;
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
    }, 1800);
}

/* ---------------- Confetti ---------------- */
let confettiRaf = null;
function launchConfetti(duration = 3400) {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.display = 'block';

    const colors = ['#fbbf24', '#f97316', '#ec4899', '#a855f7', '#22d3ee', '#fde68a', '#f43f5e'];
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
            sway: Math.random() * 2,
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
});

/* ---------------- Fit long opposite text ---------------- */
function fitOppositeText() {
    requestAnimationFrame(() => {
        const opp = document.querySelector('.opposite-text');
        if (!opp) return;
        const center = opp.closest('.game-center');
        if (!center) return;
        const reveal = center.querySelector('.movie-reveal');
        const avail = center.clientHeight - (reveal ? reveal.offsetHeight + 34 : 26);
        let size = parseFloat(getComputedStyle(opp).fontSize);
        let guard = 0;
        while (opp.scrollHeight > avail && size > 18 && guard < 80) {
            size -= 2;
            opp.style.fontSize = size + 'px';
            guard++;
        }
    });
}

/* ============================================================
   RENDER ROUTER
   ============================================================ */
function render() {
    if (state.screen === 'home') renderHome();
    else if (state.screen === 'game') renderGame();
    else if (state.screen === 'howto') renderHowto();
    else if (state.screen === 'results') renderResults();
    renderModal();
}

/* ============================================================
   HOME
   ============================================================ */
function canStart() {
    if (!state.scoringEnabled) return true;
    return state.players.length >= 2;
}

function renderHome() {
    const app = document.getElementById('app');
    app.innerHTML = '';

    const screen = el('div', { class: 'screen home-screen' });

    // sparkles
    const deco = el('div', { class: 'home-deco' });
    for (let i = 0; i < 18; i++) {
        const s = el('span', { class: 'sparkle' });
        s.style.left = (Math.random() * 100).toFixed(2) + '%';
        s.style.top = (Math.random() * 100).toFixed(2) + '%';
        s.style.animationDelay = (Math.random() * 5).toFixed(2) + 's';
        s.style.animationDuration = (4 + Math.random() * 4).toFixed(2) + 's';
        deco.append(s);
    }
    screen.append(deco);

    // header
    screen.append(el('header', { class: 'home-header' },
        el('div', { class: 'diya-icon' }, '🪔'),
        el('h1', { class: 'game-title' },
            el('span', { class: 'accent' }, 'Bolly'),
            'Flip'
        ),
        el('p', { class: 'subtitle' }, 'Guess the movie from its opposite name!')
    ));

    // player card
    const playerCard = el('section', { class: 'card player-card' });

    const inputRow = el('div', { class: 'input-row' + (state.scoringEnabled ? '' : ' disabled-zone') });

    const input = el('input', {
        type: 'text',
        class: 'name-input',
        placeholder: state.scoringEnabled ? 'Enter player name' : 'Scoring disabled',
        maxlength: '20',
        disabled: !state.scoringEnabled || state.players.length >= MAX_PLAYERS,
    });
    input.value = state.pendingName;
    input.addEventListener('input', (e) => { state.pendingName = e.target.value; });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); addPlayer(); }
    });

    const addBtn = el('button', { class: 'btn btn-primary', type: 'button' }, 'Add');
    addBtn.disabled = !state.scoringEnabled || state.players.length >= MAX_PLAYERS;
    addBtn.addEventListener('click', addPlayer);

    inputRow.append(input, addBtn);
    playerCard.append(inputRow);

    // chips
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

    // skip score checkbox
    const skipWrap = el('label', { class: 'checkbox-row' });
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

    // actions
    const actions = el('div', { class: 'home-actions' });
    const startBtn = el('button', { class: 'btn btn-primary btn-large', type: 'button' }, 'Start Game');
    startBtn.disabled = !canStart();
    startBtn.addEventListener('click', startGame);
    actions.append(startBtn);

    if (!canStart()) {
        actions.append(el('p', { class: 'home-hint' }, 'Need at least 2 players (or enable Skip Score).'));
    }

    const howBtn = el('button', { class: 'btn btn-ghost', type: 'button' }, 'How to Play');
    howBtn.addEventListener('click', enterHowto);
    actions.append(howBtn);

    screen.append(actions);
    screen.append(el('p', { class: 'home-footer' },
        `${state.players.length} / ${MAX_PLAYERS} players`
    ));

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
   GAME
   ============================================================ */
function startGame() {
    if (!canStart()) return;
    state.deck = shuffle(GAME_DATA);
    state.index = 0;
    state.phase = 'question';
    state.selection = null;
    state.history = [];
    state.players.forEach(p => { p.score = 0; });
    state.screen = 'game';
    saveState();
    render();
}

function renderGame() {
    const app = document.getElementById('app');
    app.innerHTML = '';

    if (state.index >= state.deck.length) {
        state.screen = 'results';
        render();
        return;
    }

    const movie = state.deck[state.index];
    const bg = state.index % BG_COUNT;
    const screen = el('div', { class: `screen game-screen bg-${bg}` });

    // ---- topbar ----
    const topbar = el('div', { class: 'game-topbar' });

    topbar.append(el('div', { class: 'game-id-block' },
        el('span', { class: 'game-id-label', text: 'Movie' }),
        el('span', { class: 'game-id', text: '#' + movie.id }),
        el('span', { class: 'game-progress', text: `${state.index + 1} / ${state.deck.length}` })
    ));

    if (state.scoringEnabled) {
        topbar.append(renderMiniScoreboard());
    } else {
        topbar.append(el('span'));
    }

    const closeBtn = el('button', { class: 'close-btn', title: 'Quit game' }, '✕');
    closeBtn.addEventListener('click', requestExit);
    topbar.append(closeBtn);

    screen.append(topbar);

    // ---- center ----
    const center = el('div', { class: 'game-center' });
    center.append(el('div', { class: 'opposite-text', text: movie.opposite }));

    if (state.phase === 'revealed') {
        center.append(el('div', { class: 'movie-reveal' },
            el('span', { class: 'movie-reveal-label', text: 'The movie was' }),
            el('span', { class: 'movie-reveal-title', text: movie.movie })
        ));
    }
    screen.append(center);

    // ---- bottom ----
    const bottom = el('div', { class: 'game-bottom' });

    if (state.phase === 'revealed' && state.scoringEnabled) {
        bottom.append(renderScoringPanel('game'));
    }

    const actions = el('div', { class: 'game-actions' });
    if (state.phase === 'question') {
        const revealBtn = el('button', { class: 'btn btn-primary btn-reveal' }, 'Reveal Answer');
        revealBtn.addEventListener('click', revealAnswer);
        actions.append(revealBtn);
    } else {
        const isLast = state.index + 1 >= state.deck.length;
        const nextBtn = el('button', { class: 'btn btn-primary btn-next' },
            isLast ? 'Finish Game 🏁' : 'Next Movie →');
        nextBtn.disabled = state.scoringEnabled && state.selection === null;
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
    app.append(screen);

    fitOppositeText();
}

function renderMiniScoreboard() {
    const ranked = [...state.players].sort(
        (a, b) => b.score - a.score || a.name.localeCompare(b.name)
    );
    const top = ranked.slice(0, 3);
    const rest = ranked.length - top.length;

    const uniqueScores = [...new Set(ranked.map(p => p.score))].sort((a, b) => b - a);
    const rankByScore = new Map(uniqueScores.map((s, i) => [s, i + 1]));

    const btn = el('button', { class: 'mini-scoreboard', title: 'View full leaderboard' });
    btn.append(el('span', { class: 'ms-icon' }, '🏆'));
    top.forEach((p) => {
        const rank = rankByScore.get(p.score);
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '·';
        btn.append(el('span', { class: 'ms-entry' },
            `${medal} ${p.name} `,
            el('b', {}, String(p.score))
        ));
    });
    if (rest > 0) btn.append(el('span', { class: 'ms-more' }, `+${rest}`));
    btn.addEventListener('click', () => {
        state.modal = { type: 'leaderboard' };
        renderModal();
    });
    return btn;
}

function renderScoringPanel(mode) {
    const isGame = mode === 'game';
    const selection = isGame ? state.selection : state.howtoSelection;
    const players = isGame
        ? state.players
        : SAMPLE_PLAYER_NAMES.map((name, i) => ({ id: 'sample-' + i, name }));

    const panel = el('div', { class: 'scoring-panel' });
    panel.append(el('div', { class: 'scoring-label', text: 'Who got it?' }));

    const grid = el('div', { class: 'radio-grid' });

    const makePill = (id, label, extraClass) => {
        const isSel = String(selection) === String(id);
        const pill = el('label', {
            class: 'radio-pill' + (extraClass ? ' ' + extraClass : '') + (isSel ? ' selected' : ''),
        });
        pill.dataset.playerId = String(id);
        const radio = el('input', { type: 'radio', name: 'winner-' + mode });
        radio.checked = isSel;
        radio.addEventListener('change', () => {
            if (isGame) state.selection = id;
            else state.howtoSelection = id;
            updateScoringUI(mode);
        });
        pill.append(radio, el('span', { text: label }));
        return pill;
    };

    players.forEach(p => grid.append(makePill(p.id, p.name)));
    grid.append(makePill('none', 'Nobody / Pass', 'nobody'));

    panel.append(grid);
    return panel;
}

function updateScoringUI(mode) {
    const selection = mode === 'game' ? state.selection : state.howtoSelection;
    document.querySelectorAll('.radio-pill').forEach(label => {
        const id = label.dataset.playerId;
        const isSel = String(selection) === String(id);
        label.classList.toggle('selected', isSel);
        const input = label.querySelector('input');
        if (input) input.checked = isSel;
    });
    const nextBtn = document.querySelector('.btn-next');
    if (nextBtn) nextBtn.disabled = selection === null;
}

function revealAnswer() {
    state.phase = 'revealed';
    state.selection = null;
    render();
}

function nextMovie() {
    if (state.scoringEnabled && state.selection === null) return;

    const movie = state.deck[state.index];
    let winnerName = null;

    if (state.scoringEnabled) {
        const winnerId = state.selection;
        if (winnerId !== 'none') {
            const winner = state.players.find(p => p.id === winnerId);
            if (winner) { winner.score += 1; winnerName = winner.name; }
        }
        state.history.push({
            movieId: movie.id,
            movie: movie.movie,
            winnerId: winnerId === 'none' ? null : winnerId,
        });
    }

    state.index += 1;
    state.phase = 'question';
    state.selection = null;

    if (state.index >= state.deck.length) {
        state.screen = 'results';
        saveState();
        render();
        return;
    }

    saveState();
    render();

    if (winnerName) showToast(`+1 ${winnerName}`, 'success');
}

function skipMovie() {
    state.index += 1;
    state.phase = 'question';
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
   EXIT + CONFIRM
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
            } else {
                message = `Are you sure? It's a tie between ${leaders.map(p => p.name).join(' & ')} with ${maxScore} points each.`;
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
    state.screen = (state.scoringEnabled && hadScores) ? 'results' : 'home';
    state.phase = 'question';
    state.selection = null;
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
        const ranked = [...state.players].sort(
            (a, b) => b.score - a.score || a.name.localeCompare(b.name)
        );
        const maxScore = ranked.length ? ranked[0].score : 0;
        const goldWinners = ranked.filter(p => p.score === maxScore);

        screen.append(el('div', { class: 'results-header' },
            el('div', { class: 'trophy' }, '🏆'),
            el('h1', { class: 'results-title' }, goldWinners.length > 1 ? "It's a Tie!" : 'Winner!'),
            el('div', { class: 'winner-name' }, goldWinners.map(p => p.name).join(' & ')),
            el('div', { class: 'winner-score' },
                `${maxScore} point${maxScore === 1 ? '' : 's'}`)
        ));

        // Dense ranking: everyone with the same score shares the same medal.
        // e.g. scores 4,4,3,3,3,2,2,2,2,2  →  🥇🥇 🥈🥈🥈 🥉🥉🥉🥉🥉
        const uniqueScores = [...new Set(ranked.map(p => p.score))].sort((a, b) => b - a);
        const rankByScore = new Map(uniqueScores.map((s, i) => [s, i + 1]));

        const rankList = el('div', { class: 'final-ranking' });
        ranked.forEach((p) => {
            const rank = rankByScore.get(p.score);
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
            rankList.append(el('div', { class: 'rank-row' + (rank <= 3 ? ' top' : '') },
                el('span', { class: 'rank-medal', text: medal }),
                el('span', { class: 'rank-name', text: p.name }),
                el('span', { class: 'rank-score', text: String(p.score) })
            ));
        });
        screen.append(rankList);
    }

    const actions = el('div', { class: 'results-actions' });
    const playAgain = el('button', { class: 'btn btn-primary btn-large' }, 'Play Again');
    playAgain.addEventListener('click', startGame);
    const homeBtn = el('button', { class: 'btn btn-ghost btn-large' }, 'Home');
    homeBtn.addEventListener('click', () => {
        state.screen = 'home';
        state.deck = [];
        state.index = 0;
        state.history = [];
        state.phase = 'question';
        state.selection = null;
        state.players.forEach(p => { p.score = 0; });
        saveState();
        render();
    });
    actions.append(playAgain, homeBtn);
    screen.append(actions);

    app.append(screen);

    if (state.scoringEnabled) setTimeout(() => launchConfetti(3600), 120);
}

/* ============================================================
   HOW TO PLAY
   ============================================================ */
function enterHowto() {
    state.howtoStep = 'instructions';
    state.howtoIndex = 0;
    state.howtoPhase = 'question';
    state.howtoSelection = null;
    state.howtoId = randomSampleId();
    state.screen = 'howto';
    render();
}

function exitHowto() {
    state.screen = 'home';
    state.howtoStep = 'instructions';
    state.howtoPhase = 'question';
    state.howtoSelection = null;
    render();
}

function renderHowto() {
    if (state.howtoStep === 'instructions') renderHowtoInstructions();
    else renderHowtoSample();
}

function renderHowtoInstructions() {
    const app = document.getElementById('app');
    app.innerHTML = '';

    const screen = el('div', { class: 'screen howto-screen' });

    const closeBtn = el('button', { class: 'close-btn howto-close', title: 'Back to home' }, '✕');
    closeBtn.addEventListener('click', exitHowto);
    screen.append(closeBtn);

    screen.append(el('div', { class: 'howto-content' },
        el('div', { class: 'howto-badge' }, 'How to Play'),
        el('h1', { class: 'howto-title' }, 'BollyFlip'),
        el('ol', { class: 'instructions-list' },
            el('li', {},
                el('span', { class: 'step-num' }, '1'),
                el('span', {}, 'A movie name is flipped into its ', el('b', {}, 'opposite'), ' and shown on screen.')
            ),
            el('li', {},
                el('span', { class: 'step-num' }, '2'),
                el('span', {}, 'Play however you want, either by taking turns elegantly, getting divided into teams or by chaotic shouting & prompting!')
            ),
            el('li', {},
                el('span', { class: 'step-num' }, '3'),
                el('span', {}, 'Host clicks ', el('b', {}, 'Reveal Answer'), ' to confirm, then picks who got it.')
            ),
            el('li', {},
                el('span', { class: 'step-num' }, '4'),
                el('span', {}, 'Click ', el('b', {}, 'Next Movie'), ' and keep going. Highest score at the end wins! 🏆')
            ),
            el('li', {},
                el('span', { class: 'step-num' }, '5'),
                el('span', {}, 'No one got it? Pick ', el('b', {}, 'Nobody / Pass'), ' — no points, next round.')
            )
        ),
        el('p', { class: 'howto-note' }, 'Tip: Cast this screen to your TV — the host runs the controls.')
    ));

    const actions = el('div', { class: 'howto-actions' });
    const nextBtn = el('button', { class: 'btn btn-primary btn-large' }, 'See an example →');
    nextBtn.addEventListener('click', () => {
        state.howtoStep = 'round';
        state.howtoIndex = 0;
        state.howtoPhase = 'question';
        state.howtoSelection = null;
        state.howtoId = randomSampleId();
        render();
    });
    actions.append(nextBtn);
    screen.append(actions);

    app.append(screen);
}

function renderHowtoSample() {
    const app = document.getElementById('app');
    app.innerHTML = '';

    const sample = SAMPLE_DATA[state.howtoIndex % SAMPLE_DATA.length];
    const bg = state.howtoIndex % BG_COUNT;
    const screen = el('div', { class: `screen game-screen howto-sample bg-${bg}` });

    const topbar = el('div', { class: 'game-topbar' });
    topbar.append(el('div', { class: 'game-id-block' },
        el('span', { class: 'game-id-label', text: 'Movie' }),
        el('span', { class: 'game-id', text: '#' + state.howtoId })
    ));
    topbar.append(el('div', { class: 'sample-badge' }, 'SAMPLE'));
    const closeBtn = el('button', { class: 'close-btn', title: 'Exit tutorial' }, '✕');
    closeBtn.addEventListener('click', exitHowto);
    topbar.append(closeBtn);
    screen.append(topbar);

    const center = el('div', { class: 'game-center' });
    center.append(el('div', { class: 'opposite-text', text: sample.opposite }));
    if (state.howtoPhase === 'revealed') {
        center.append(el('div', { class: 'movie-reveal' },
            el('span', { class: 'movie-reveal-label', text: 'The movie was' }),
            el('span', { class: 'movie-reveal-title', text: sample.movie })
        ));
    }
    screen.append(center);

    const bottom = el('div', { class: 'game-bottom' });

    if (state.howtoPhase === 'revealed') {
        bottom.append(renderScoringPanel('howto'));
    }

    const actions = el('div', { class: 'game-actions' });
    if (state.howtoPhase === 'question') {
        const revealBtn = el('button', { class: 'btn btn-primary btn-reveal' }, 'Reveal Answer');
        revealBtn.addEventListener('click', revealHowto);
        actions.append(revealBtn);
    } else {
        const nextBtn = el('button', { class: 'btn btn-primary btn-next' }, 'Next Sample →');
        nextBtn.disabled = state.howtoSelection === null;
        nextBtn.addEventListener('click', advanceHowtoSample);
        actions.append(nextBtn);
    }
    bottom.append(actions);
    screen.append(bottom);

    app.append(screen);
    fitOppositeText();
}

function revealHowto() {
    state.howtoPhase = 'revealed';
    state.howtoSelection = null;
    render();
}

function advanceHowtoSample() {
    state.howtoIndex = (state.howtoIndex + 1) % SAMPLE_DATA.length;
    state.howtoPhase = 'question';
    state.howtoSelection = null;
    state.howtoId = randomSampleId();
    render();
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
        const modal = el('div', { class: 'modal leaderboard-modal' });
        modal.append(el('h2', { class: 'modal-title' }, 'Leaderboard'));

        const ranked = [...state.players].sort(
            (a, b) => b.score - a.score || a.name.localeCompare(b.name)
        );

        const uniqueScores = [...new Set(ranked.map(p => p.score))].sort((a, b) => b - a);
        const rankByScore = new Map(uniqueScores.map((s, i) => [s, i + 1]));

        const list = el('div', { class: 'lb-list' });
        if (ranked.length === 0) {
            list.append(el('p', { class: 'lb-empty' }, 'No players yet.'));
        }
        ranked.forEach((p) => {
            const rank = rankByScore.get(p.score);
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
            list.append(el('div', { class: 'lb-row' + (rank === 1 ? ' top' : '') },
                el('span', { class: 'lb-medal', text: medal }),
                el('span', { class: 'lb-name', text: p.name }),
                el('span', { class: 'lb-score', text: String(p.score) })
            ));
        });
        modal.append(list);
    } else if (state.modal.type === 'confirmExit') {
        const modal = el('div', { class: 'modal confirm-modal' });
        modal.append(el('h2', { class: 'modal-title' }, 'Quit Game?'));
        modal.append(el('p', { class: 'modal-message' }, state.modal.message));

        const actions = el('div', { class: 'modal-actions' });
        const cancelBtn = el('button', { class: 'btn btn-ghost' }, 'Keep Playing');
        cancelBtn.addEventListener('click', closeModal);
        const exitBtn = el('button', { class: 'btn btn-danger' }, 'Quit');
        exitBtn.addEventListener('click', confirmExit);
        actions.append(cancelBtn, exitBtn);
        modal.append(actions);

        backdrop.append(modal);
    }

    document.body.append(backdrop);
}

function closeModal() {
    state.modal = null;
    const m = document.querySelector('.modal-backdrop');
    if (m) m.remove();
}

function undoLastRound() {
    if (state.history.length === 0) return;
    const last = state.history.pop();
    if (last.winnerId != null) {
        const p = state.players.find(p => p.id === last.winnerId);
        if (p && p.score > 0) p.score -= 1;
    }
    saveState();
    showToast('Last round undone', 'info');

    // update mini-scoreboard in place
    const old = document.querySelector('.mini-scoreboard');
    if (old) old.replaceWith(renderMiniScoreboard());

    renderModal();
}

/* ============================================================
   KEYBOARD
   ============================================================ */
document.addEventListener('keydown', (e) => {
    if (state.screen !== 'game' && state.screen !== 'howto') return;
    if (state.modal) return;

    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
    if (active && active.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;

    const isGame = state.screen === 'game';
    const phase = isGame ? state.phase : state.howtoPhase;

    if (e.key === ' ' || e.key === 'Spacebar') {
        if (phase === 'question') {
            e.preventDefault();
            if (isGame) revealAnswer();
            else revealHowto();
        }
    } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
        if (phase === 'revealed') {
            const sel = isGame ? state.selection : state.howtoSelection;
            const needSel = isGame ? state.scoringEnabled : true;
            if (!needSel || sel !== null) {
                e.preventDefault();
                if (isGame) nextMovie();
                else advanceHowtoSample();
            }
        }
    } else if (e.key === 'Escape') {
        e.preventDefault();
        if (isGame) requestExit();
        else exitHowto();
    }
});

/* ============================================================
   INIT
   ============================================================ */
function init() {
    const app = document.getElementById('app');

    const gameRaw = window.BOLLYFLIP_DATA;
    const sampleRaw = window.SAMPLE_DATA;

    GAME_DATA = Array.isArray(gameRaw)
        ? gameRaw.filter(m => m && m.opposite != null && m.movie != null)
        : [];

    SAMPLE_DATA = Array.isArray(sampleRaw) && sampleRaw.length
        ? sampleRaw.filter(m => m && m.opposite != null && m.movie != null)
        : GAME_DATA.slice(0, 3);

    if (!GAME_DATA.length) {
        app.innerHTML = '';
        app.append(el('div', { class: 'screen home-screen' },
            el('div', { class: 'error-box' },
                el('h2', {}, 'Movie data not found'),
                el('p', {}, 'Make sure data/bollyflip.js loads before scripts/bollyflip.js.'),
                el('p', {}, 'Your data file should start with: ', el('code', {}, 'window.BOLLYFLIP_DATA = [ … ]'))
            )
        ));
        return;
    }

    loadState();
    render();
}

init();