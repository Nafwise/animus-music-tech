# Animus Music Tech - the website

This is the Animus Music Tech website. It has these pages:

- what Animus Music Tech is about;
- Animus Engine Pro and its download;
- placeholders for Animus Music Mastering and Animus DAW;
- the feedback and tester form;
- the controller capture, which runs in the browser.

The site is plain HTML, CSS and JavaScript. It has no build step and no framework, and there is nothing to install.

## The files

| File | What it is |
|---|---|
| `index.html` | The landing page: what Animus Music Tech is, the vision, equality, the apps, the founder, the socials |
| `pro.html` | Animus Engine Pro: what it does, the download button, requirements, FAQ |
| `mastering.html`, `daw.html` | Placeholders for Animus Music Mastering and Animus DAW, both in development |
| `feedback.html` | Feedback and the tester questionnaire, emailed through FormSubmit |
| `capture.html` | The controller capture. It records what a controller sends (with Web MIDI) and makes a file to send in |
| `404.html` | What GitHub Pages shows for a missing page |
| `assets/css/site.css` | All the styling. The colours are the variables at the top, in `:root` |
| `assets/js/config.js` | The two settings: the releases repository and the feedback form's address |
| `assets/js/site.js` | Used on every page: the menu, the year, the spectrum bars and the download buttons |
| `assets/js/feedback.js` | The feedback form |
| `assets/js/midi.js`, `assets/js/capture.js` | The controller capture: `midi.js` is the MIDI logic, `capture.js` is the page around it |
| `tools/serve.py` | A preview server, for this computer only |
| `tests/midi_test.js` | Tests for `midi.js` |

## Preview it

```
python tools/serve.py
```

Open http://127.0.0.1:8765. Only this computer can see it, and Ctrl+C stops it. Use the server: the download buttons, the form and the controller capture don't work when a page is opened straight from the folder.

## Test it

```
node tests/midi_test.js
```

To check the feedback form without sending an email:

1. Run `python tools/serve.py --echo`.
2. Fill the form in at http://127.0.0.1:8765/feedback.html and send it.
3. The server saves what arrived in `tests/out/`: the fields in `fields.json`, and each attachment beside it. It then shows the thank-you, as FormSubmit would.

`tests/out/` is never published.

## Settings: `assets/js/config.js`

- **`releasesRepo`** is the GitHub repository whose releases hold the installer: `Nafwise/Animus-Releases`. The download buttons ask GitHub for its newest release with an `AnimusPro-Setup-*.exe`. If that fails, they link to the releases page.
- **`feedbackAction`** is where the feedback form sends. While it's empty, the form says it isn't switched on yet and offers to save the answers as a file instead.

## Switching the feedback form on (FormSubmit)

[FormSubmit](https://formsubmit.co/documentation) is free and needs no account. A form posts to `https://formsubmit.co/<address>`, and FormSubmit emails the answers to that address. After you confirm, it gives you a random string to use in place of the address, so the address never appears on the site.

1. Preview the site with the form pointed at the address the feedback should go to. This lasts for this run only and changes no file:

   ```
   python tools/serve.py --relay https://formsubmit.co/THE-ADDRESS
   ```

2. Open http://127.0.0.1:8765/feedback.html and send the form once. FormSubmit emails that address a confirmation link: click it. FormSubmit holds that first submission until you confirm.
3. FormSubmit then sends a random string for the form. Put it in `config.js`, then publish:

   ```
   feedbackAction: "https://formsubmit.co/the-random-string"
   ```

   Never put a real email address in `config.js`. The site is public.
4. Send one test from the live site. The first emails may land in spam, so mark them "not spam".

Good to know:

- **Attachments** can total 10 MB per message. The form checks the size before sending.
- **Special fields:** the form sets the subject (`_subject`), lays the answers out as a table (`_template`) and has a hidden trap for bots (`_honey`). After sending, it comes back to this page with a thank-you (`_next`). FormSubmit's reCAPTCHA stays on, as FormSubmit recommends.
- **Controller captures** arrive twice: as a summary in the email itself, and as the full `.json` attached.
- **Replies:** on the first real email, check that Reply goes to the tester (the form's `email` field). If it doesn't, the tester's address is in the table.

## Publishing on GitHub Pages

1. Make a GitHub repository for the site and push this folder, with the site's files at the top level. GitHub Pages on a free account needs a public repository.
2. In the repository, go to Settings > Pages > Build and deployment:
   - Source: "Deploy from a branch".
   - Branch: `main`, folder `/ (root)`.

   The site is live a few minutes later.
3. The address depends on the repository's name:
   - A repository named `<user>.github.io` is served at `https://<user>.github.io/`.
   - Any other name is served at `https://<user>.github.io/<repo>/`. For this kind, change `<base href="/">` in `404.html` to `<base href="/<repo>/">`.
4. For a domain of your own, add it under Settings > Pages > Custom domain, and keep `404.html`'s base as `/`.

`.nojekyll` tells GitHub to serve the files as they are. GitHub Pages serves over https, which the controller capture needs: browsers only allow Web MIDI on secure pages.

## When the logo and banner arrive

- **Logo:** every page's header has `<span class="mark-ring" aria-hidden="true"></span>`, the gradient ring. Replace it with `<img class="mark-img" src="assets/img/logo.svg" alt="">` (a note in `site.css` marks the spot). The browser tab's icon is `assets/img/favicon.svg`.
- **Banner:** the landing page's hero has a comment marking the spot, above `<div class="spectrum" ...>` (the moving bars). Replace that element with `<img class="banner-img" src="assets/img/banner.png" alt="Animus Music Tech">`. The `banner-img` style is already in `site.css`.
- **Link previews:** when the banner exists, add `<meta property="og:image" content="https://<the site>/assets/img/banner.png">` to each page's head. Links shared on Instagram, Discord and similar apps then show the banner. `index.html` and `pro.html` already have `og:title` and `og:description`.
- **Colours:** the palette is the variables at the top of `site.css` (`--purple`, `--fuchsia`, `--cyan` and the rest). Change them there and the whole site follows.

## Fonts and privacy

The pages load Inter and Orbitron from Google Fonts, so every visitor's browser contacts Google. In 2022 a German court ruled that a site which loaded Google Fonts like this, without the visitor's consent, broke the GDPR.

Hosting the fonts with the site avoids the question:

1. Download the `.woff2` files into `assets/fonts/`.
2. Add `@font-face` rules for them to `site.css`.
3. Remove the three Google Fonts lines from each page's head.
