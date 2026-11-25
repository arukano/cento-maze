# Cento Maze

A poetry game built for the SF Non-Slop Hackathon.

You start with one word. The game builds a maze out of real public-domain poems that contain it, and you walk a path through their words to write a **cento**, a new poem made entirely of fragments of old ones. At every step you can keep reading the current poem, turn into another poem that shares the word, or write a word of your own. Punctuation and line breaks are yours to choose.

When you exit, you see:

- **Your poem.** Each word is colored by its source. Hover over a word to see the line it came from.
- **The machine's route.** It walks the same maze from the same first word, but always takes the most common next word.
- **A pure AI poem.** Claude writes it from scratch, starting with your word.
- **Pangram AI-detection scores** for all three (local version only).

The question it asks: when every word is human, what makes a poem *yours*?

## Run it locally (full version, with Pangram)

Needs Node 18+. No packages to install.

```bash
export PANGRAM_API_KEY="your-pangram-key"
export CLAUDE_CODE_OAUTH_TOKEN="your-claude-token"   # from `claude setup-token`, for the pure-AI poem
node server.js
```

Then open http://localhost:3000.

The server keeps both keys off the browser. It proxies Pangram's API (`/api/score`) and runs the `claude` CLI to write the AI poem (`/api/poem`).

## Published version

`python3 build.py` writes `dist/` for publishing as a Claude Artifact. There, the AI poem uses the viewer's own Claude account, and Pangram scoring is turned off because the page can't hold a secret key.

## Files

- `public/index.html` – the whole game (maze, reveal, machine route)
- `public/poems.json` – 2,806 public-domain poems (4–150 lines each) from [PoetryDB](https://poetrydb.org)
- `server.js` – static server plus the Pangram and Claude endpoints
- `build.py` – builds the publishable page

## Credits

Poems are public domain, via PoetryDB. AI detection by [Pangram Labs](https://www.pangram.com).
