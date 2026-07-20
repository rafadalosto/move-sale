# Rafael's Moving Sale

Single-page static site listing items for sale ahead of a move, hosted on GitHub Pages.

## Adding, editing, or removing an item

Edit `items.json`. Each entry:

- `id` (string, required) — unique slug
- `title` (string, required)
- `price` (number, required) — EUR, e.g. `800` or `349.50`
- `image` (string, required) — path under `images/`
- `badge` (string, optional) — e.g. `"8 Mos Old"`, `"New"`
- `specs` (array of strings, optional) — short bullet points
- `description` (string, optional)
- `specsLink` (string, optional) — full URL, adds a "View Specs ↗" button
- `dealName` / `dealLink` (strings, optional, both-or-neither) — marks the item as part of a deal; shows a "🔗 Part of: {dealName}" tag linking to `dealLink`

To mark something sold, delete its entry from `items.json`.

## Adding, editing, or removing a deal

Edit `deals.json`. Each entry:

- `id`, `name`, `price`, `image` — required
- `originalPrice` (number, optional) — shown struck-through to imply savings
- `freeDelivery` (boolean, optional) — shows a "🚚 Free delivery" badge
- `items` (array of strings, optional) — display-only list of bundled item names
- `link` (string, optional) — outbound URL for the "View Deal ↗" button
- `description` (string, optional)

An item is linked to a deal only through its own `dealName`/`dealLink` fields — `deals.json` does not reference `items.json`.

## Adding photos

Drop image files into `images/` and reference the filename (e.g. `images/sofa.jpg`) from `items.json`/`deals.json`. Cards display images at a 4:3 aspect ratio (`object-fit: cover`), so a roughly 4:3 source photo looks best. If an image fails to load, the placeholder graphic in `images/placeholder.svg` is shown automatically.

## Running locally

`fetch()` of the JSON files requires the page be served over http(s), not opened directly as a `file://` URL. From this directory:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Running the logic tests

Pure formatting/rendering logic lives in `render.js` and has tests in `render.test.js`, run with Node's built-in test runner (no install needed):

```bash
node --test render.test.js
```

## Deploying to GitHub Pages

1. Push this repository to GitHub.
2. In the repo's Settings → Pages, set the source to deploy from the `main` branch, root folder.
3. GitHub will publish the site at `https://<username>.github.io/<repo>/`.

No build step is required — the site is served exactly as committed.
