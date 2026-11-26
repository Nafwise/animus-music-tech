/* ==========================================================================
   AnimusReleases - what the site reads from Animus Engine Pro's GitHub releases, as plain functions (tests/releases_test.js
   runs them in Node): the newest installer, for the download buttons, the Legends count on the home page, and the
   authenticity check on the Engine Pro page.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AnimusReleases = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // The installer, as release.py names it. App updates fetch other files (manifest.txt, manifest.sig and the .bin pieces), so
  // updating never counts as a download here.
  var INSTALLER = /^AnimusPro-Setup-(\d+)\.(\d+)\.(\d+)\.exe$/;

  // The newest release with an installer (GitHub lists the newest first): { url, size, version, published, page, name }, or
  // null. name passed INSTALLER, so it is only letters, digits, dots and dashes - safe inside the PowerShell line the page shows.
  function newestInstaller(releases) {
    for (var i = 0; i < releases.length; i++) {
      var rel = releases[i];
      if (rel.draft) continue;
      var assets = rel.assets || [];
      for (var j = 0; j < assets.length; j++) {
        var m = INSTALLER.exec(assets[j].name);
        if (m) {
          return { url: assets[j].browser_download_url, size: assets[j].size, version: "V" + m[1] + "." + m[2] + "." + m[3],
                   published: rel.published_at, page: rel.html_url, name: assets[j].name };
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

  // ---- the authenticity check ------------------------------------------------------------------------------------------
  // Every installer still in the releases that GitHub gives a fingerprint for, newest first: [{ version, sha256 }]. GitHub
  // measures every file uploaded to a release itself (the asset's digest), so these are the published files, not anyone's word.
  function installerDigests(releases) {
    var out = [];
    releases.forEach(function (rel) {
      if (rel.draft) return;
      (rel.assets || []).forEach(function (a) {
        var m = INSTALLER.exec(a.name), d = /^sha256:([0-9a-f]{64})$/i.exec(a.digest || "");
        if (m && d) out.push({ version: "V" + m[1] + "." + m[2] + "." + m[3], sha256: d[1].toLowerCase() });
      });
    });
    return out;
  }

  // The fingerprint in what was pasted, lower-case, or "". PowerShell gives the Hash on its own in capitals; a whole
  // Get-FileHash table has it between spaces; certutil may space out its pairs. So: 64 hex digits with none either side -
  // never a slice of a longer run - or else the whole text, once spaces, colons and dashes are taken out, if that is 64.
  function fingerprintIn(text) {
    text = String(text || "");
    var alone = /(?:^|[^0-9a-f])([0-9a-f]{64})(?![0-9a-f])/i.exec(text);
    if (alone) return alone[1].toLowerCase();
    var joined = text.replace(/[\s:-]+/g, "");
    return /^[0-9a-f]{64}$/i.test(joined) ? joined.toLowerCase() : "";
  }

  // Is the pasted fingerprint a real Animus Engine Pro installer's? One of:
  //   { state: "empty" }                               nothing pasted
  //   { state: "invalid" }                             something, but no fingerprint in it
  //   { state: "unknown" }                             GitHub gave no fingerprints to check against - never say "no"
  //   { state: "match", version, newest, latest }      that version's installer, exactly as published (newest: is it the
  //                                                    newest installer? latest: the newest installer's version)
  //   { state: "nomatch" }                             a fingerprint, but no published installer's
  function checkFingerprint(releases, text) {
    if (!String(text || "").trim()) return { state: "empty" };
    var mine = fingerprintIn(text);
    if (!mine) return { state: "invalid" };
    var known = installerDigests(releases || []);
    if (!known.length) return { state: "unknown" };
    for (var i = 0; i < known.length; i++) {
      if (known[i].sha256 === mine) return { state: "match", version: known[i].version, newest: i === 0, latest: known[0].version };
    }
    return { state: "nomatch" };
  }

  return { INSTALLER: INSTALLER, newestInstaller: newestInstaller, installerDownloads: installerDownloads, legends: legends,
           installerDigests: installerDigests, fingerprintIn: fingerprintIn, checkFingerprint: checkFingerprint };
});
