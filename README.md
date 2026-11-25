# Animus Music Tech - the website

Live at **https://nafwise.github.io/animus-music-tech/**. Every push to `main` publishes the site.

It has these pages:

- what Animus Music Tech is about;
- Animus Engine Pro and its download;
- placeholders for Animus Music Mastering and Animus DAW;
- the feedback and tester questionnaire;
- the controller capture, which runs in the browser;
- the privacy policy and the legal notice (Impressum).

The site is plain HTML, CSS and JavaScript. It has no build step and no framework, and there is nothing to install.

## The files

| File | What it is |
|---|---|
| `index.html` | The landing page: what Animus Music Tech is, the vision, equality, the apps, the founder, the socials |
| `pro.html` | Animus Engine Pro: what it does, the download button, requirements, FAQ |
| `mastering.html`, `daw.html` | Placeholders for Animus Music Mastering and Animus DAW, both in development |
| `feedback.html` | The feedback and tester questionnaire. It opens an email in the visitor's own email app |
| `capture.html` | The controller capture. It records what a controller sends (with Web MIDI) and hands it to the feedback page |
| `privacy.html`, `legal.html` | The privacy policy and the legal notice (Impressum) |
| `404.html` | What GitHub Pages shows for a missing page |
| `assets/css/site.css` | All the styling. The colours are the variables at the top, in `:root`; the fonts are declared above them |
| `assets/fonts/` | Inter and Orbitron, served from the site, with their licences (SIL Open Font License) |
| `assets/js/config.js` | The one setting: the releases repository |
| `assets/js/site.js` | Used on every page: the menu, the year, the spectrum bars and the download buttons |
| `assets/js/feedback-mail.js`, `assets/js/feedback.js` | The feedback email (`feedback-mail.js`), and the page around it (`feedback.js`) |
| `assets/js/midi.js`, `assets/js/capture.js` | The controller capture: `midi.js` is the MIDI logic, `capture.js` is the page around it |
| `tools/serve.py` | A preview server, for this computer only |
| `tests/` | Tests for `midi.js` and `feedback-mail.js` |

## Preview it

```
python tools/serve.py
```

Open http://127.0.0.1:8765/animus-music-tech/, the same path as the live site (http://127.0.0.1:8765 forwards there). Only this computer can see it, and Ctrl+C stops it. Use the server: the download buttons and the controller capture don't work when a page is opened straight from the folder.

## Test it

```
node tests/midi_test.js
node tests/feedback_test.js
```

## How feedback reaches you

Nothing on the site sends anything. "Email my feedback" opens an email to animusmusictech@gmail.com in the visitor's own email app, with their answers written in. They check it and press Send.

A mailto link can't carry a file, and some mail apps cut a long one off. So when there's a controller capture, or the answers are long, the page also saves one file to the visitor's Downloads folder: `animus-feedback-<date>.json`, with every answer and the full capture. The email asks them to attach it.

The address is written in three pages: `feedback.html` (the page reads it from its `feedback-address` link), `legal.html` and `privacy.html`. Change all three together.

## Keeping it right under German and UK law

The site follows the stricter German rules, because some of the people interested in it are in Germany:

- **Legal notice (Impressum, § 5 DDG and § 18 MStV):** `legal.html` has the provider's name, a postal address where post can be delivered (not a PO box), and the contact details. It's linked from every page's footer.
  - When the address changes, update `legal.html` and `privacy.html`.
  - The old address stays in this repository's history unless the history is rewritten.
- **Privacy policy (GDPR and UK GDPR):** `privacy.html`. Update it before adding anything that handles data differently.
- **No outside requests:** the fonts are served from the site, so no visitor is sent to Google for them. The only outside requests go to GitHub, which hosts the site; they are the pages themselves and the download button's release lookup.
- **No cookies, and nothing stored in the browser:** the only exception is the controller capture's hand-over to the feedback page, which is strictly necessary (§ 25 TDDDG). Storing anything else, such as analytics, a "remember me" or a cache, would need a consent banner.
- **Never add without a consent step and a privacy-policy update:**
  - analytics;
  - embedded videos, posts or maps (YouTube, Instagram, Twitch, Google Maps);
  - fonts or scripts from other sites.

  Plain links are fine.

## Publishing

The site is published by GitHub Pages from the `main` branch, folder `/`, of `Nafwise/animus-music-tech`. Push to `main`, and it's live a minute or two later.

- **The path:** this is a project site, so it lives under `/animus-music-tech/`, the repository's name. Every page uses relative links, so they don't care. The exceptions are `404.html`'s `<base href="/animus-music-tech/">` and `BASE` in `tools/serve.py`: if the repository is renamed, change both.
- **Your own domain:** add it under Settings > Pages > Custom domain. Then the site is at the domain's root, so set `404.html`'s base to `"/"` and `BASE` in `serve.py` to `"/"`.
- **`.nojekyll`** tells GitHub to serve the files exactly as they are.
- **https:** GitHub Pages serves over https, which the controller capture needs, because browsers only allow Web MIDI on secure pages.

## When the logo and banner arrive

- **Logo:** every page's header has `<span class="mark-ring" aria-hidden="true"></span>`, the gradient ring. Replace it with `<img class="mark-img" src="assets/img/logo.svg" alt="">` (a note in `site.css` marks the spot). The browser tab's icon is `assets/img/favicon.svg`.
- **Banner:** the landing page's hero has a comment marking the spot, above `<div class="spectrum" ...>` (the moving bars). Replace that element with `<img class="banner-img" src="assets/img/banner.png" alt="Animus Music Tech">`. The `banner-img` style is already in `site.css`.
- **Link previews:** add `<meta property="og:image" content="https://nafwise.github.io/animus-music-tech/assets/img/banner.png">` to each page's head. Links shared on Instagram, Discord and similar apps then show the banner. `index.html` and `pro.html` already have `og:title` and `og:description`.
- **Colours:** the palette is the variables at the top of `site.css` (`--purple`, `--fuchsia`, `--cyan` and the rest). Change them there and the whole site follows.

## Fonts

Inter (weights 400-800) and Orbitron (600-800) are Google Fonts' Latin and Latin Extended cuts, served from `assets/fonts/`. Each file is one variable font that covers all its weights.

Both fonts are under the SIL Open Font License. Its text, with each font's copyright line, is in `assets/fonts/*-OFL.txt`, and must stay next to the font files.
