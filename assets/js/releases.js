/* ==========================================================================
   AnimusReleases - what the site reads from Animus Engine Pro's GitHub releases, as plain functions (tests/releases_test.js
   runs them in Node): the newest installer, for the download buttons, and the Legends count on the home page.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AnimusReleases = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // The installer, as release.py names it. App updates fetch other files (manifest.txt, manifest.sig and the .bin pieces), so
  // updating never counts as a download here.
  var INSTALLER = /^AnimusPro-Setup-(\d+)\.(\d+)\.(\d+)\.exe$/;

  // The newest release with an installer (GitHub lists the newest first): { url, size, version, published, page, sha256 }, or null.
  // sha256 is GitHub's own digest of the file ("sha256:..." in the API), 64 hex digits - or "" when GitHub gives none.
  function newestInstaller(releases) {
    for (var i = 0; i < releases.length; i++) {
      var rel = releases[i];
      if (rel.draft) continue;
      var assets = rel.assets || [];
      for (var j = 0; j < assets.length; j++) {
        var m = INSTALLER.exec(assets[j].name);
        if (m) {
          var digest = /^sha256:([0-9a-f]{64})$/i.exec(assets[j].digest || "");
          return { url: assets[j].browser_download_url, size: assets[j].size, version: "V" + m[1] + "." + m[2] + "." + m[3],
                   published: rel.published_at, page: rel.html_url, sha256: digest ? digest[1].toLowerCase() : "",
                   name: assets[j].name };
        }
      }
    }
    return null;
  }

  // Every download of every installer still in the releases, as GitHub counts them.
  function installerDownloads(releases) {
    var total = 0;
    releases.forEach(function (rel) {
      if (rel.draft) return;
      (rel.assets || []).forEach(function (a) { if (INSTALLER.test(a.name)) total += a.download_count || 0; });
    });
    return total;
  }

  // The Legends count: those downloads, plus any from installers deleted since (GitHub forgets them - settings.carried), less
  // the developer's own tests from before the count started (settings.notCounted). Never below 0.
  function legends(releases, settings) {
    settings = settings || {};
    return Math.max(0, installerDownloads(releases) + (settings.carried || 0) - (settings.notCounted || 0));
  }

  return { INSTALLER: INSTALLER, newestInstaller: newestInstaller, installerDownloads: installerDownloads, legends: legends };
});
