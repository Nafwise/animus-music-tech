// Tests for assets/js/feedback-mail.js - the feedback page's email: what it says, when a file has to go with it, and that its
// mailto: link stays short enough for every mail app.        node tests/feedback_test.js
"use strict";
var assert = require("assert");
var path = require("path");
var F = require(path.join(__dirname, "..", "assets", "js", "feedback-mail.js"));
var M = require(path.join(__dirname, "..", "assets", "js", "midi.js"));

var passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("  ok    " + name); }
  catch (e) { failed++; console.log("  FAIL  " + name + "\n        " + (e && e.message)); }
}

var ADDRESS = "animusmusictech@gmail.com", FILE = "animus-feedback-2026-11-25.json";
function open(url) {                                   // a mailto: link, as a mail app reads it
  var m = /^mailto:([^?]+)\?subject=([^&]*)&body=(.*)$/.exec(url);
  return { to: m[1], subject: decodeURIComponent(m[2]), body: decodeURIComponent(m[3]) };
}

test("short answers: all of them in the email, in order, and no file", function () {
  var mail = F.compose({ name: "Echo", app: "Engine Pro", rating_sound: "5", used_for: "Practice, Gigs", works_well: "The platter." },
                       { address: ADDRESS, fileName: FILE });
  var m = open(mail.url);
  assert.strictEqual(mail.needsFile, false);
  assert.deepStrictEqual([m.to, m.subject], [ADDRESS, "Animus feedback"]);
  assert.ok(m.body.indexOf("Name or handle: Echo\r\nApp: Engine Pro\r\nSound (1-5): 5\r\nI use it for: Practice, Gigs") > 0, m.body);
  assert.ok(m.body.indexOf("What works well?\r\nThe platter.") > 0);
  assert.ok(m.body.indexOf("Attached:") < 0);
  assert.strictEqual(mail.full, mail.body);
});

test("line breaks travel as CRLF; accents and symbols survive", function () {
  var m = open(F.compose({ went_wrong: "Zeile eins\nÜmlaut ß ✓ – ok" }, { address: ADDRESS, fileName: FILE }).url);
  assert.ok(m.body.indexOf("Zeile eins\r\nÜmlaut ß ✓ – ok") > 0);
  assert.ok(!/[^\r]\n/.test(m.body), "a bare line feed");
});

test("a controller capture: summed up in the email, and the file needed", function () {
  var cap = M.buildCapture({ when: "2026-11-25T12:00:00.000Z", userAgent: "test", output: null, identityBytes: null,
                             input: { name: "DDJ-400 MIDI 1", manufacturer: "", version: "" },
                             events: [{ t: 0, label: "PLAY", bytes: [0x90, 11, 127] }, { t: 5, label: "PLAY", bytes: [0x90, 11, 0] }] });
  var mail = F.compose({ controller: "DDJ-400" }, { address: ADDRESS, fileName: FILE, capture: cap });
  var body = open(mail.url).body;
  assert.strictEqual(mail.needsFile, true);
  assert.ok(body.indexOf("Controller capture: DDJ-400 MIDI 1 - 1 control, 2 messages.") > 0, body);
  assert.ok(body.indexOf("Attached: " + FILE + " (all of this in full, and the controller capture)") > 0);
});

test("long answers: shortened to fit the link, whole in the copy and the file", function () {
  var long = new Array(400).join("The jog wheel drifts when I scratch. ");
  var mail = F.compose({ name: "Tester", works_well: long, went_wrong: long, wishlist: "Short." }, { address: ADDRESS, fileName: FILE });
  var body = open(mail.url).body;
  assert.strictEqual(mail.needsFile, true);
  assert.ok(mail.url.length <= F.MAX_URL, "too long: " + mail.url.length);
  assert.ok(mail.url.length > F.MAX_URL - 300, "room left unused: " + mail.url.length);
  assert.ok(body.indexOf("Name or handle: Tester") > 0);
  assert.ok(body.indexOf(" [...]") > 0);
  assert.ok(body.indexOf("What would you love next?\r\nShort.") > 0);        // short answers stay whole
  assert.ok(body.indexOf("Attached: " + FILE + " (all of this in full)") > 0);
  assert.ok(mail.full.indexOf(long.trim()) > 0);
});

test("when even the short answers won't fit, the link still opens and points at the file", function () {
  var huge = new Array(2600).join("x");
  var mail = F.compose({ name: huge, controller: huge }, { address: ADDRESS, fileName: FILE });
  assert.strictEqual(mail.needsFile, true);
  assert.ok(mail.url.length <= F.MAX_URL);
  assert.ok(open(mail.url).body.indexOf("Attached: " + FILE) > 0);
});

test("an empty form still makes an email", function () {
  var mail = F.compose({}, { address: ADDRESS, fileName: FILE });
  assert.strictEqual(mail.needsFile, false);
  assert.strictEqual(open(mail.url).body, "Animus feedback\r\n");
});

test("the file: every answer, and the capture as it was made", function () {
  var cap = { format: "animus-controller-capture", events: [] };
  var data = JSON.parse(F.fileFor({ name: "Echo", ok_to_email: "Yes" }, cap, "2026-11-25T12:00:00.000Z"));
  assert.deepStrictEqual([data.format, data.version, data.written], ["animus-feedback", 1, "2026-11-25T12:00:00.000Z"]);
  assert.deepStrictEqual(data.answers, { name: "Echo", ok_to_email: "Yes" });
  assert.deepStrictEqual(data.controllerCapture, cap);
  assert.ok(!("controllerCapture" in JSON.parse(F.fileFor({}, null, "x"))));
});

test("count: one control, two controls", function () {
  assert.deepStrictEqual([F.count(1, "control"), F.count(2, "control"), F.count(0, "message")], ["1 control", "2 controls", "0 messages"]);
});

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
