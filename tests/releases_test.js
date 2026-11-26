// Tests for assets/js/releases.js - the newest installer for the download buttons, and the Legends count.
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
  // The fingerprint is GitHub's own digest of the installer, lower-case, or "" when GitHub gives none.
  var withDigest = JSON.parse(JSON.stringify(releases));
  withDigest[0].assets[1].digest = "sha256:0E1D72BAB8A549A757A08516F30859602281C153F18A161CBF919B1FD06BBD4D";
  assert.strictEqual(R.newestInstaller(withDigest).sha256, "0e1d72bab8a549a757a08516f30859602281c153f18a161cbf919b1fd06bbd4d");
  assert.strictEqual(R.newestInstaller(withDigest).name, "AnimusPro-Setup-0.2.016.exe");
  assert.strictEqual(found.sha256, "");
  withDigest[0].assets[1].digest = "md5:abc";
  assert.strictEqual(R.newestInstaller(withDigest).sha256, "");
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

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
