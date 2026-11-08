# 🪔 Bollyflip

**Guess the Bollywood movie from its flipped-English opposite name.**

A host-run party game built for a TV / projector. Cast the screen, add your
players, and let the shouting begin.


---

## 🎬 What is this?

Bollyflip takes a Bollywood movie name, flips it into its **opposite**, and
translates it to English. Your guests have to guess the original.

> **"Not Lost Men"** → 🎯 **Laapata Ladies**   
> **"King"** → 🎯 **Queen**    
> **"Snowfall"** → 🎯 **Sholay**

The host casts the game to a TV, reads the card, and awards the point to
whoever shouts the correct answer first.

---

## ✨ Features

- 🎯 **Big, unmissable cards** — one opposite per screen, styled to be read from across the room.   
- 🎨 **6 festive gradients** that cycle round-by-round, so no two adjacent rounds look alike.   
- 🏆 **Ambient leaderboard** — a pill in the top-centre of the game screen shows the top 3 players live. Tap it any time to see the full ranking and **undo the last round**.
- 🥇 **Dense-rank medals** — tied players share the same medal. Three people on 3 points all get 🥈, not 🥈/🥉/4th.
- 🎉 **Confetti podium** at the end with a proper winner / tie screen.
- 👥 **Up to 12 players**, duplicate names blocked.
- 🎲 **Skip Score mode** for a casual, no-points game.
- ⌨️ **Keyboard shortcuts** for laptop hosts (Space, Enter, Esc).
- 💾 **Survives refresh** — names and scores persist via `localStorage`.
- 📖 **How to Play** with a fully interactive walkthrough using real sample cards.
- 🚫 **No build step, no dependencies** — pure HTML/CSS/JS, works from
  `file://` and GitHub Pages.

---

## ▶️ Where to play?

**Option A** — Locally, download & just double-click `index.html`.

That's it. Everything (fonts, data, logic) loads from the files in the
folder. No server needed.

**Option B** — Use [Github Page Link](https://krupani.github.io/bollyflip/)

---

## Customise the Deck

All movies live in a single file: **`data/bollyflip.js`**. It's one array of objects, prefixed with a global variable so it loads without a local server.

```js
window.BOLLYFLIP_DATA = [
  { "id": 1, "movie": "Laapata Ladies", "opposite": "Not Lost Men" },
  { "id": 2, "movie": "Queen",          "opposite": "King" },
  { "id": 3, "movie": "3 Idiots",       "opposite": "4 Geniuses" },
  { "id": 4, "movie": "Dangal",         "opposite": "No Wrestling" },
  { "id": 5, "movie": "Sholay",         "opposite": "Snowfall" }
];
```

Need more movies, add here or just create a new file and use locally. 

---

## Credits

Made with ❤️ for Bollwood 🎬 movies. Built for a House parties 🥳 like Diwali Party where the only rule is: first correct answer wins.

Have fun!! 🥳

