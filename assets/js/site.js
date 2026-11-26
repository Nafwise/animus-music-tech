/* ==========================================================================
   Animus Music Tech - what every page shares: the menu, the year, the banner placeholder, the download buttons.
   ========================================================================== */
(function () {
  "use strict";

  // ---- the menu, on a phone -------------------------------------------------------------------------------------
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // ---- the banner placeholder: a spectrum, like the app's NOW PLAYING bars ------------------------------------------
  document.querySelectorAll(".spectrum").forEach(function (box) {
    var n = parseInt(box.getAttribute("data-bars") || "48", 10);
    for (var i = 0; i < n; i++) {
      var bar = document.createElement("span");
      var x = i / (n - 1);
      var shape = 0.35 + 0.55 * Math.pow(Math.sin(Math.PI * (0.15 + 0.7 * x)), 1.6);   // fuller in the middle, like a mix
      bar.style.setProperty("--h", Math.round((shape * (0.7 + Math.random() * 0.3)) * 100) + "%");
      bar.style.setProperty("--d", (0.9 + Math.random() * 1.1).toFixed(2) + "s");
      bar.style.setProperty("--o", (-Math.random() * 2).toFixed(2) + "s");
      box.appendChild(bar);
    }
  });

  // ---- from GitHub's releases: the download buttons, the Legends count and the authenticity check -------------------------
  // Asked of GitHub's public API - GitHub hosts this site too, so no one new learns of the visit. Nothing is kept in the
  // browser (storing anything there that isn't strictly needed would need consent under German law). If GitHub can't be
  // reached, the buttons keep their link to the releases page, which always works, the Legends count stays hidden, and the
  // check says it can't check. What's read from the releases is AnimusReleases' (releases.js).
  var buttons = document.querySelectorAll("[data-download]");
  var metas = document.querySelectorAll("[data-release-meta]");
  var verifiers = document.querySelectorAll("[data-verify]");
  var legendBoxes = document.querySelectorAll("[data-legends]");
  var R = window.AnimusReleases;
  if (!R || (!buttons.length && !metas.length && !legendBoxes.length && !verifiers.length)) return;

  var settings = window.ANIMUS || {};
  var repo = settings.releasesRepo || "Nafwise/Animus-Releases";

  function showLegends(n) {
    var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    legendBoxes.forEach(function (box) {
      var num = box.querySelector("[data-legends-count]"), label = box.querySelector("[data-legends-label]");
      label.textContent = n === 0 ? "legends so far - be the first!"
                        : n === 1 ? "legend who's downloaded Engine Pro" : "legends who've downloaded Engine Pro";
      box.hidden = false;
      if (calm || n < 2) { num.textContent = n.toLocaleString("en-GB"); return; }
      var t0 = performance.now();                                      // count up to it, quickly
      (function step(now) {
        var k = Math.min(1, (now - t0) / 900);
        num.textContent = Math.round(n * (1 - Math.pow(1 - k, 3))).toLocaleString("en-GB");
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    });
  }

  function show(found) {
    if (!found) return;
    var gb = (found.size / 1e9).toFixed(2);
    buttons.forEach(function (b) {
      b.href = found.url;
      var label = b.querySelector("[data-download-label]");
      if (label) label.textContent = "Download " + found.version;
      var size = b.querySelector("[data-download-size]");
      if (size) size.textContent = gb + " GB";
    });
    metas.forEach(function (m) {
      var date = new Date(found.published).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
      m.innerHTML = "";
      m.appendChild(document.createTextNode(found.version + " · " + gb + " GB · released " + date + " · "));
      var a = document.createElement("a");
      a.href = found.page;
      a.textContent = "release notes";
      m.appendChild(a);
    });
    // The PowerShell line names the newest installer (found.name passed INSTALLER: only letters, digits, dots and dashes).
    verifiers.forEach(function (box) {
      box.querySelector("[data-verify-command]").textContent =
        '(Get-FileHash "$env:USERPROFILE\\Downloads\\' + found.name + '").Hash | Set-Clipboard';
    });
  }

  // ---- the authenticity check ----------------------------------------------------------------------------------------------
  // The visitor pastes their download's SHA-256 and it's compared here, in the browser, with the fingerprints GitHub measured
  // of every published installer (AnimusReleases.checkFingerprint). Those are never shown, and what's pasted is never sent or
  // kept. Until GitHub answers - or if it can't be reached - it says so, and never calls a file fake.
  var known = null;                          // the releases, once GitHub answers
  var unreachable = false;                   // GitHub couldn't be asked

  function say(box, kind, title, text, link) {
    var out = box.querySelector("[data-verify-result]");
    out.textContent = "";
    if (!title) return;
    var p = document.createElement("p");
    p.className = "notice" + (kind ? " " + kind : "");
    var b = document.createElement("b");
    b.textContent = title;
    p.appendChild(b);
    p.appendChild(document.createTextNode(" " + text));
    if (link) {
      var a = document.createElement("a");
      a.href = link.href;
      a.textContent = link.text;
      p.appendChild(a);
      p.appendChild(document.createTextNode("."));
    }
    out.appendChild(p);
  }

  // quietly: as it's typed or pasted - an answer only once there's a whole fingerprint, nothing while it's half there.
  function check(box, quietly) {
    var r = R.checkFingerprint(known || [], box.querySelector("[data-verify-input]").value);
    if (r.state === "match" && r.newest) {
      say(box, "good", "Authentic.", "This is the real Animus Engine Pro " + r.version + " installer, exactly as it was published." +
          " Go ahead and run it.");
    } else if (r.state === "match") {
      say(box, "good", "Authentic,", "the real " + r.version + " installer - but there's a newer one. Download " + r.latest +
          " with the button at the top of this page.");
    } else if (r.state === "nomatch") {
      say(box, "bad", "Not a match - don't run it.", "This file isn't a published Animus installer. Delete it and download Animus" +
          " again with the button at the top of this page. (A download that was cut short won't match either.)");
    } else if (r.state === "unknown" && !known && !unreachable) {
      say(box, "", "Still asking GitHub for the fingerprints...", "the answer will appear here in a moment.");
    } else if (r.state === "unknown") {
      say(box, "", "This can't check just now:", "GitHub's fingerprints didn't arrive. Try again later, or compare yours with the" +
          " sha256 GitHub shows beside the installer on ", { href: "https://github.com/" + repo + "/releases", text: "its releases page" });
    } else if (quietly) {
      say(box);
    } else if (r.state === "invalid") {
      say(box, "", "That isn't a fingerprint.", "A SHA-256 fingerprint is 64 letters and numbers (0-9 and A-F). Step 2 copies" +
          " it for you - paste it straight in.");
    } else {
      say(box, "", "Nothing to check yet.", "Paste the fingerprint step 2 copied. If PowerShell printed red text instead, it" +
          " couldn't find the installer - the tip under step 2 shows how to point it at yours.");
    }
  }

  verifiers.forEach(function (box) {
    var input = box.querySelector("[data-verify-input]");
    box.querySelector("[data-verify-form]").addEventListener("submit", function (e) { e.preventDefault(); check(box, false); });
    input.addEventListener("input", function () { check(box, true); });
    // A field drops a paste's line breaks, which could join the fingerprint to the next line's text (certutil's): spaces instead.
    input.addEventListener("paste", function (e) {
      var text = e.clipboardData && e.clipboardData.getData("text");
      if (!text || !/[\r\n]/.test(text) || !input.setRangeText) return;
      e.preventDefault();
      input.setRangeText(text.replace(/\s+/g, " ").trim(), input.selectionStart, input.selectionEnd, "end");
      check(box, true);
    });

    // Copy: exactly the line shown. If the browser won't, the line is selected for Ctrl+C.
    var copy = box.querySelector("[data-verify-copy]"), cmd = box.querySelector("[data-verify-command]"), back = 0;
    function copied(label) {
      copy.textContent = label;
      clearTimeout(back);
      back = setTimeout(function () { copy.textContent = "Copy"; }, 2500);
    }
    function selectIt() {
      var range = document.createRange(), sel = window.getSelection();
      range.selectNodeContents(cmd);
      sel.removeAllRanges();
      sel.addRange(range);
      copied("Press Ctrl+C");
    }
    copy.addEventListener("click", function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cmd.textContent).then(function () { copied("Copied"); }, selectIt);
      } else selectIt();
    });
  });

  // Every release (up to 100 - years away), so the Legends count and the check include every installer.
  fetch("https://api.github.com/repos/" + repo + "/releases?per_page=100", { headers: { Accept: "application/vnd.github+json" } })
    .then(function (r) { if (!r.ok) throw new Error("GitHub said " + r.status); return r.json(); })
    .then(function (releases) {
      if (!Array.isArray(releases)) throw new Error("GitHub's answer isn't a list of releases");
      known = releases;
      show(R.newestInstaller(releases));
      if (legendBoxes.length) showLegends(R.legends(releases, settings.legends));
    })
    .catch(function () { unreachable = true; /* offline or rate-limited: the static link stands, the count stays hidden */ })
    .then(function () { verifiers.forEach(function (box) { check(box, true); }); });   // anything pasted while it waited
})();
