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

  // ---- the download buttons: the newest release that carries an installer ------------------------------------------
  // Asked of GitHub's public API - GitHub hosts this site too, so no one new learns of the visit. Nothing is kept in the
  // browser (storing anything there that isn't strictly needed would need consent under German law). If GitHub can't be
  // reached, the buttons keep their link to the releases page, which always works.
  var buttons = document.querySelectorAll("[data-download]");
  var metas = document.querySelectorAll("[data-release-meta]");
  if (!buttons.length && !metas.length) return;

  var repo = (window.ANIMUS && window.ANIMUS.releasesRepo) || "Nafwise/Animus-Releases";

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

  fetch("https://api.github.com/repos/" + repo + "/releases?per_page=30", { headers: { Accept: "application/vnd.github+json" } })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (releases) {
      var found = null;
      for (var i = 0; i < releases.length && !found; i++) {
        var rel = releases[i];
        if (rel.draft) continue;
        (rel.assets || []).forEach(function (a) {
          var m = /^AnimusPro-Setup-(\d+)\.(\d+)\.(\d+)\.exe$/.exec(a.name);
          if (m && !found) {
            found = { url: a.browser_download_url, size: a.size, version: "V" + m[1] + "." + m[2] + "." + m[3],
                      published: rel.published_at, page: rel.html_url };
          }
        });
      }
      show(found);
    })
    .catch(function () { /* offline or rate-limited: the static link stands */ });
})();
