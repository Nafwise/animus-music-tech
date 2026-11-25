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

  // ---- from GitHub's releases: the download buttons and the Legends count -----------------------------------------------
  // Asked of GitHub's public API - GitHub hosts this site too, so no one new learns of the visit. Nothing is kept in the
  // browser (storing anything there that isn't strictly needed would need consent under German law). If GitHub can't be
  // reached, the buttons keep their link to the releases page, which always works, and the Legends count stays hidden.
  // What's read from the releases is AnimusReleases' (releases.js).
  var buttons = document.querySelectorAll("[data-download]");
  var metas = document.querySelectorAll("[data-release-meta]");
  var legendBoxes = document.querySelectorAll("[data-legends]");
  var R = window.AnimusReleases;
  if (!R || (!buttons.length && !metas.length && !legendBoxes.length)) return;

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
  }

  // Every release (up to 100 - years away), so the Legends count includes every installer.
  fetch("https://api.github.com/repos/" + repo + "/releases?per_page=100", { headers: { Accept: "application/vnd.github+json" } })
    .then(function (r) { if (!r.ok) throw new Error("GitHub said " + r.status); return r.json(); })
    .then(function (releases) {
      show(R.newestInstaller(releases));
      if (legendBoxes.length) showLegends(R.legends(releases, settings.legends));
    })
    .catch(function () { /* offline or rate-limited: the static link stands, the count stays hidden */ });
})();
