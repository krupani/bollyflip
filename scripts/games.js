'use strict';

/* ============================================================
   BollyBash — games.js
   Game registry. Each game is a small config object that the
   shared gameplay screen reads from.
   ============================================================ */

window.BOLLYBASH_GAMES = {

    flip: {
        id: 'flip',
        name: 'Bollyflip',
        emoji: '🪞',
        accent: 'gold',
        tagline: 'Guess the flipped movie title',
        rules: [
            'A Bollywood movie name is flipped into its English opposite.',
            'Shout the original movie name.',
            'Host clicks Reveal Answer to confirm.',
            'No hint = 2 pts. Hint used = 1 pt.'
        ],
        displayClass: 'clue-text clue-text--large',

        getData() {
            return Array.isArray(window.BOLLYFLIP_DATA) ? window.BOLLYFLIP_DATA : [];
        },
        prepareCard(card) {
            if (!card || !card.movie || !card.opposite) return null;
            return { ...card, hint: card.hint || null };
        },
        getDisplayText(card) { return card.opposite; },
        getAnswer(card) { return card.movie; },
        getHint(card) { return card.hint || null; }
    },

    twist: {
        id: 'twist',
        name: 'Bollytwist',
        emoji: '🌀',
        accent: 'pink',
        tagline: 'Read the chaos, guess the film',
        rules: [
            'A movie plot is described in a twisted, chaotic way.',
            'Shout the film you think it is.',
            'Host clicks Reveal Answer to confirm.',
            'No hint = 2 pts. Hint used = 1 pt.'
        ],
        displayClass: 'clue-text clue-text--medium',

        getData() {
            return Array.isArray(window.BOLLYTWIST_DATA) ? window.BOLLYTWIST_DATA : [];
        },
        prepareCard(card) {
            if (!card || !card.movie || !card.plot) return null;
            return { ...card, hint: card.hint || null };
        },
        getDisplayText(card) { return card.plot; },
        getAnswer(card) { return card.movie; },
        getHint(card) { return card.hint || null; }
    },

    jumble: {
        id: 'jumble',
        name: 'Bollyjumble',
        emoji: '🧩',
        accent: 'cyan',
        tagline: 'Unscramble the movie title',
        rules: [
            'A single-word movie title has its letters scrambled.',
            'Unscramble it and shout the movie.',
            'Host clicks Reveal Answer to confirm.',
            'No hint = 2 pts. Hint used = 1 pt.'
        ],
        displayClass: 'jumble-clue',

        getData() {
            return Array.isArray(window.BOLLYJUMBLE_DATA) ? window.BOLLYJUMBLE_DATA : [];
        },
        prepareCard(card) {
            if (!card || !card.movie) return null;
            // Single-word titles only (letters only, no spaces/punct).
            if (!/^[a-zA-Z]+$/.test(card.movie)) {
                console.warn('[BollyBash/Jumble] Skipping non-single-word title:', card.movie);
                return null;
            }
            if (card.movie.length < 3) {
                console.warn('[BollyBash/Jumble] Skipping too-short title:', card.movie);
                return null;
            }
            return { ...card, jumbled: jumbleWord(card.movie), hint: card.hint || null };
        },
        getDisplayText(card) { return card.jumbled; },
        getAnswer(card) { return card.movie; },
        getHint(card) { return card.hint || null; }
    }
};

/* Shuffle a word's letters — guaranteed different from the original. */
function jumbleWord(word) {
    const original = word.toUpperCase();
    if (original.length < 3) return original;
    const letters = original.split('');
    let attempts = 0;
    let shuffled = [...letters];
    do {
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        attempts++;
    } while (shuffled.join('') === original && attempts < 25);
    return shuffled.join('');
}