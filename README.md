# Rafael's Moving Sale

Single-page static site listing items for sale ahead of a move, hosted on GitHub Pages.

## Adding, editing, or removing an item

Edit `items.json`. Each entry:

- `id` (string, required) — unique slug
- `title` (string, required)
- `price` (number, required) — EUR, e.g. `800` or `349.50`
- `images` (array of strings, required, at least one) — paths under `images/`; the first photo shows first, and additional photos appear in a swipeable carousel with arrow buttons and dot navigation
- `badge` (string, optional) — e.g. `"8 Mos Old"`, `"New"`
- `specs` (array of strings, optional) — short bullet points
- `description` (string, optional)
- `specsLink` (string, optional) — full URL, adds a "View Specs ↗" button
- `dealName` / `dealLink` (strings, optional, both-or-neither) — marks the item as part of a deal; shows a "🔗 Part of: {dealName}" tag linking to `dealLink`

To mark something sold, delete its entry from `items.json`.

## Adding, editing, or removing a deal

Edit `deals.json`. Each entry:

- `id`, `name`, `price`, `images` — required (`images` is an array of one or more paths under `images/`, same as for items)
- `originalPrice` (number, optional) — shown struck-through to imply savings
- `freeDelivery` (boolean, optional) — shows a "🚚 Free delivery" badge
- `items` (array of strings, optional) — display-only list of bundled item names
- `link` (string, optional) — outbound URL for the "View Deal ↗" button
- `description` (string, optional)

An item is linked to a deal only through its own `dealName`/`dealLink` fields — `deals.json` does not reference `items.json`.

## Adding photos

Drop image files into `images/` and list their paths in the `images` array (e.g. `"images": ["images/sofa-1.jpg", "images/sofa-2.jpg"]`) from `items.json`/`deals.json`. Cards display each photo at a 4:3 aspect ratio (`object-fit: cover`), so roughly 4:3 source photos look best. List one path for a single photo, or two or more for a carousel with arrow buttons and dot navigation. If a photo fails to load, the placeholder graphic in `images/placeholder.svg` is shown for that photo only — the rest of the carousel is unaffected.

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
