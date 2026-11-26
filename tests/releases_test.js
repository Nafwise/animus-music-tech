// Tests for assets/js/releases.js - the newest installer for the download buttons, the Legends count, and the authenticity
// check.
//   node tests/releases_test.js
"use strict";
var assert = require("assert");
var path = require("path");
var R = require(path.join(__dirname, "..", "assets", "js", "releases.js"));

var passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("  ok    " + name); }
  catch (e) { failed++; console.log("  FAIL  " + name + "\n        " + (e && e.message)); }
}

function asset(name, count) {
  return { name: name, download_count: count, size: 1980361534, browser_download_url: "https://example.test/" + name };
}
// Shaped like GitHub's answer on 25 November 2026, newest first: 0.2.016 carries the installer and an update, 0.2.015 is an
// update only, and 0.2.014's installer has been deleted.
var releases = [
  { tag_name: "v0.2.016", draft: false, published_at: "2026-11-25T16:43:33Z", html_url: "https://example.test/v0.2.016",
    assets: [asset("261b73be.bin", 2), asset("AnimusPro-Setup-0.2.016.exe", 1), asset("manifest.sig", 5), asset("manifest.txt", 5)] },
  { tag_name: "v0.2.015", draft: false, published_at: "2026-11-25T15:03:31Z", html_url: "https://example.test/v0.2.015",
    assets: [asset("56d5d02e.bin", 2), asset("manifest.sig", 3), asset("manifest.txt", 3)] },
  { tag_name: "v0.2.014", draft: false, published_at: "2026-11-25T14:44:20Z", html_url: "https://example.test/v0.2.014",
    assets: [asset("manifest.sig", 5), asset("manifest.txt", 5)] }
];

test("the newest installer, for the download buttons", function () {
  var found = R.newestInstaller(releases);
  assert.deepStrictEqual([found.version, found.url, found.page], ["V0.2.016", "https://example.test/AnimusPro-Setup-0.2.016.exe",
                                                                  "https://example.test/v0.2.016"]);
  assert.strictEqual(found.name, "AnimusPro-Setup-0.2.016.exe");                  // for the PowerShell line
  assert.strictEqual(found.sha256, undefined);                                   // the page never shows a fingerprint
});

test("an update-only release on top doesn't hide the installer below it; a draft is skipped", function () {
  var withUpdate = [{ tag_name: "v0.2.017", draft: false, assets: [asset("manifest.txt", 0)] }].concat(releases);
  assert.strictEqual(R.newestInstaller(withUpdate).version, "V0.2.016");
  var withDraft = [{ tag_name: "v0.3.000", draft: true, assets: [asset("AnimusPro-Setup-0.3.000.exe", 0)] }].concat(releases);
  assert.strictEqual(R.newestInstaller(withDraft).version, "V0.2.016");
  assert.strictEqual(R.newestInstaller([]), null);
});

test("only installer downloads count - updates, manifests and the update pieces don't", function () {
  assert.strictEqual(R.installerDownloads(releases), 1);
});

test("the Legends count starts at 0: the test download isn't counted", function () {
  assert.strictEqual(R.legends(releases, { notCounted: 1, carried: 0 }), 0);
});

test("every installer download after that is a legend, across every release", function () {
  var later = JSON.parse(JSON.stringify(releases));
  later[0].assets[1].download_count = 43;                                        // 0.2.016: 42 real downloads
  later.unshift({ tag_name: "v0.2.017", draft: false, assets: [asset("AnimusPro-Setup-0.2.017.exe", 8), asset("manifest.txt", 90)] });
  assert.strictEqual(R.legends(later, { notCounted: 1, carried: 0 }), 50);
});

test("a deleted installer's downloads are kept by carrying them", function () {
  var after = [releases[1], releases[2]];                                        // 0.2.016's installer deleted (its 43 forgotten)
  assert.strictEqual(R.legends(after, { notCounted: 1, carried: 43 }), 42);
});

test("never below 0, and settings are optional", function () {
  assert.strictEqual(R.legends(releases, { notCounted: 4 }), 0);
  assert.strictEqual(R.legends(releases), 1);
  assert.strictEqual(R.legends([], {}), 0);
});

// ---- the authenticity check ------------------------------------------------------------------------------------------
// Two installers with GitHub's digests (V0.2.020's as GitHub gives it, upper-case here to show it's lower-cased), newest
// first; an update-only release, a draft with its own installer, and the releases above, which have no digests.
var REAL = "c6c91e88727406abbd973cca7049b08c8c0b400a37ed127910eae5b6a31e5ccd";
var OLDER = "0e1d72bab8a549a757a08516f30859602281c153f18a161cbf919b1fd06bbd4d";
var DRAFT = "1111111111111111111111111111111111111111111111111111111111111111";
function installer(version, sha) {
  var a = asset("AnimusPro-Setup-" + version + ".exe", 0);
  a.digest = "sha256:" + sha;
  return a;
}
var checked = [
  { tag_name: "v0.3.000", draft: true, assets: [installer("0.3.000", DRAFT)] },
  { tag_name: "v0.2.021", draft: false, assets: [asset("manifest.txt", 0), asset("manifest.sig", 0)] },
  { tag_name: "v0.2.020", draft: false, assets: [installer("0.2.020", REAL.toUpperCase()), asset("manifest.txt", 0)] },
  { tag_name: "v0.2.017", draft: false, assets: [installer("0.2.017", OLDER)] }
].concat(releases);

test("the fingerprints to check against: every published installer GitHub measured, newest first", function () {
  assert.deepStrictEqual(R.installerDigests(checked), [{ version: "V0.2.020", sha256: REAL }, { version: "V0.2.017", sha256: OLDER }]);
  var odd = [{ draft: false, assets: [{ name: "AnimusPro-Setup-0.2.022.exe", digest: "md5:abc" }, { name: "x.exe", digest: "sha256:" + REAL }] }];
  assert.deepStrictEqual(R.installerDigests(odd), []);                           // not sha256, not an installer
  assert.deepStrictEqual(R.installerDigests(releases), []);                      // no digests at all
});

test("the fingerprint is found in whatever PowerShell or certutil gave", function () {
  assert.strictEqual(R.fingerprintIn(REAL.toUpperCase()), REAL);                 // (Get-FileHash ...).Hash | Set-Clipboard
  assert.strictEqual(R.fingerprintIn("  " + REAL.toUpperCase() + "\r\n"), REAL);
  var table = "\r\nAlgorithm       Hash                                                                   Path\r\n" +
              "---------       ----                                                                   ----\r\n" +
              "SHA256          " + REAL.toUpperCase() + "       C:\\Users\\dj\\Downloads\\AnimusPro-Setup-0.2.020.exe\r\n\r\n";
  assert.strictEqual(R.fingerprintIn(table), REAL);                              // the whole Get-FileHash table
  assert.strictEqual(R.fingerprintIn("SHA256 hash of AnimusPro-Setup-0.2.020.exe: " + REAL + " CertUtil: done"), REAL);
  assert.strictEqual(R.fingerprintIn(REAL.match(/../g).join(" ")), REAL);       // certutil's pairs on older Windows
  assert.strictEqual(R.fingerprintIn(REAL.match(/../g).join(":")), REAL);
});

test("never a slice of a longer run, and nothing else is a fingerprint", function () {
  assert.strictEqual(R.fingerprintIn(REAL + "a"), "");                           // 65 digits
  assert.strictEqual(R.fingerprintIn("f" + REAL), "");
  assert.strictEqual(R.fingerprintIn(REAL.slice(1)), "");                        // 63
  assert.strictEqual(R.fingerprintIn(REAL.slice(0, 63) + "g"), "");
  assert.strictEqual(R.fingerprintIn("Get-FileHash : Cannot find path"), "");
  assert.strictEqual(R.fingerprintIn(""), "");
  assert.strictEqual(R.fingerprintIn(null), "");
});

test("a real installer is authentic, and says if there's a newer one", function () {
  assert.deepStrictEqual(R.checkFingerprint(checked, REAL.toUpperCase()),
                         { state: "match", version: "V0.2.020", newest: true, latest: "V0.2.020" });
  assert.deepStrictEqual(R.checkFingerprint(checked, "SHA256   " + OLDER + "   C:\\x.exe"),
                         { state: "match", version: "V0.2.017", newest: false, latest: "V0.2.020" });
});

test("anything else isn't: another file, a draft's, empty or not a fingerprint at all", function () {
  assert.deepStrictEqual(R.checkFingerprint(checked, "a".repeat(64)), { state: "nomatch" });
  assert.deepStrictEqual(R.checkFingerprint(checked, DRAFT), { state: "nomatch" });     // a draft was never published
  assert.deepStrictEqual(R.checkFingerprint(checked, REAL.slice(0, 40)), { state: "invalid" });
  assert.deepStrictEqual(R.checkFingerprint(checked, "   \r\n"), { state: "empty" });
  assert.deepStrictEqual(R.checkFingerprint(checked, undefined), { state: "empty" });
});

test("with no fingerprints from GitHub it never says a file is fake", function () {
  assert.deepStrictEqual(R.checkFingerprint(releases, REAL), { state: "unknown" });
  assert.deepStrictEqual(R.checkFingerprint(null, REAL), { state: "unknown" });
  assert.deepStrictEqual(R.checkFingerprint([], "nope"), { state: "invalid" });
});

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
