// Tests for assets/js/midi.js - how the controller capture names MIDI messages, reads a controller's identity reply and writes
// the file a tester sends in.        node tests/midi_test.js
"use strict";
var assert = require("assert");
var path = require("path");
var M = require(path.join(__dirname, "..", "assets", "js", "midi.js"));

var passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("  ok    " + name); }
  catch (e) { failed++; console.log("  FAIL  " + name + "\n        " + (e && e.message)); }
}

// Identity replies laid out as the MIDI spec has them: F0 7E <device> 06 02 <maker ID> <family 2> <model 2> <revision 4> F7.
var oneByteId = [0xF0, 0x7E, 0x00, 0x06, 0x02, 0x47, 0x25, 0x00, 0x19, 0x00, 0x01, 0x02, 0x03, 0x04, 0xF7];
var threeByteId = [0xF0, 0x7E, 0x7F, 0x06, 0x02, 0x00, 0x20, 0x7F, 0x7F, 0x01, 0x02, 0x00, 0x00, 0x00, 0x01, 0x00, 0xF7];

test("hex: upper case, two digits, space-separated", function () {
  assert.strictEqual(M.hex([0, 15, 16, 127, 255]), "00 0F 10 7F FF");
  assert.strictEqual(M.hex([]), "");
});

test("the question asked is the Universal Device Inquiry", function () {
  assert.strictEqual(M.hex(M.IDENTITY_REQUEST), "F0 7E 7F 06 01 F7");
});

test("describe: notes - and a note-on at velocity 0 is a release", function () {
  var on = M.describe([0x91, 60, 100]);
  assert.deepStrictEqual([on.kind, on.channel, on.number, on.value], ["note", 2, 60, 100]);
  assert.strictEqual(M.describe([0x91, 60, 0]).value, 0);
  assert.ok(/Note off/.test(M.describe([0x91, 60, 0]).text));
  assert.ok(/Note off/.test(M.describe([0x81, 60, 64]).text));
});

test("describe: CC, pitch bend (14-bit, low byte first), program, pressure", function () {
  var cc = M.describe([0xB0, 7, 127]);
  assert.deepStrictEqual([cc.kind, cc.channel, cc.number, cc.value], ["cc", 1, 7, 127]);
  assert.strictEqual(M.describe([0xE0, 0x00, 0x40]).value, 8192);
  assert.strictEqual(M.describe([0xE0, 0x7F, 0x7F]).value, 16383);
  assert.deepStrictEqual([M.describe([0xCF, 5]).kind, M.describe([0xCF, 5]).channel], ["program", 16]);
  assert.strictEqual(M.describe([0xD3, 90]).value, 90);
});

test("describe: SysEx and real-time messages", function () {
  assert.strictEqual(M.describe(M.IDENTITY_REQUEST).kind, "sysex");
  assert.strictEqual(M.describe([0xF8]).text, "Clock");
  assert.strictEqual(M.describe([0xFE]).kind, "realtime");
});

test("controlKey: a note's press and release are one control, channels apart", function () {
  assert.strictEqual(M.controlKey([0x90, 11, 127]), M.controlKey([0x80, 11, 0]));
  assert.strictEqual(M.controlKey([0x90, 11, 127]), M.controlKey([0x90, 11, 0]));
  assert.notStrictEqual(M.controlKey([0x90, 11, 127]), M.controlKey([0x91, 11, 127]));
  assert.strictEqual(M.controlKey([0xB2, 33, 65]), "cc:3:33");
});

test("parseIdentity: a one-byte maker ID", function () {
  var id = M.parseIdentity(oneByteId);
  assert.strictEqual(id.manufacturer, "47");
  assert.deepStrictEqual([id.family, id.familyNumber], ["25 00", 0x25]);
  assert.deepStrictEqual([id.member, id.memberNumber], ["19 00", 0x19]);
  assert.strictEqual(id.revision, "01 02 03 04");
  assert.strictEqual(id.device, 0);
  assert.strictEqual(id.raw, M.hex(oneByteId));
});

test("parseIdentity: a three-byte maker ID, written as the controller database writes it", function () {
  var id = M.parseIdentity(threeByteId);
  assert.strictEqual(id.manufacturer, "00 20 7F");
  assert.strictEqual(id.familyNumber, 0x7F | (0x01 << 7));
  assert.strictEqual(id.member, "02 00");
  assert.strictEqual(id.revision, "00 00 01 00");
});

test("parseIdentity: anything that isn't a whole reply is turned away", function () {
  assert.strictEqual(M.parseIdentity(M.IDENTITY_REQUEST), null);                       // the question, not an answer
  assert.strictEqual(M.parseIdentity(null), null);
  assert.strictEqual(M.parseIdentity([0x90, 1, 2]), null);
  assert.strictEqual(M.parseIdentity(oneByteId.slice(0, -1)), null);                   // cut short
  var noEnd = oneByteId.slice(); noEnd[noEnd.length - 1] = 0x00;
  assert.strictEqual(M.parseIdentity(noEnd), null);                                    // no F7
  var inquiry = oneByteId.slice(); inquiry[4] = 0x01;
  assert.strictEqual(M.parseIdentity(inquiry), null);                                  // 06 01 is the inquiry itself
  assert.strictEqual(M.parseIdentity(threeByteId.slice(0, 15).concat([0xF7])), null);  // a three-byte ID, too short for the rest
});

test("summarise: by control, with its labels, value range and count; clock ignored", function () {
  var s = M.summarise([
    { t: 0, label: "Left PLAY", bytes: [0x90, 11, 127] },
    { t: 5, label: "Left PLAY", bytes: [0x90, 11, 0] },
    { t: 6, label: "", bytes: [0xF8] },
    { t: 9, label: "Left volume", bytes: [0xB0, 19, 0] },
    { t: 10, label: "Left volume", bytes: [0xB0, 19, 127] },
    { t: 11, label: "Left PLAY again", bytes: [0x90, 11, 127] },
    { t: 12, label: "", bytes: [0xF0, 0x00, 0x20, 0x7F, 0x01, 0xF7] }
  ]);
  assert.deepStrictEqual(s.map(function (c) { return c.control; }), ["note:1:11", "cc:1:19", "sysex"]);
  assert.strictEqual(s[0].count, 3);
  assert.deepStrictEqual(s[0].labels, ["Left PLAY", "Left PLAY again"]);
  assert.deepStrictEqual([s[0].min, s[0].max, s[0].status, s[0].first], [0, 127, "90", "90 0B 7F"]);
  assert.strictEqual(s[1].status, "B0");
  assert.strictEqual(s[2].status, "F0");
});

test("suggestProfile: the controller database's shape, the port name tidied", function () {
  var p = M.suggestProfile("DDJ-400 MIDI 1", "Pioneer DJ", M.parseIdentity(threeByteId), "2026-11-25T12:00:00.000Z");
  assert.deepStrictEqual([p.id, p.name, p.vendor, p.confidence], ["ddj-400", "DDJ-400", "Pioneer DJ", "probable"]);
  assert.deepStrictEqual(p.match.namePatterns, ["ddj-400"]);
  assert.strictEqual(p.match.sysexManufacturer, "00 20 7F");
  assert.strictEqual(M.suggestProfile("Numark NS4FX", "", null, "x").id, "numark-ns4fx");    // the database's own id for it
  assert.strictEqual(M.suggestProfile("Numark NS4FX", "", null, "x").match.sysexManufacturer, null);
  assert.strictEqual(M.suggestProfile("", "", null, "x").name, "Unknown controller");
});

test("buildCapture: the file a tester sends in", function () {
  var events = [];
  for (var k = 0; k < 5003; k++) events.push({ t: k * 1.4, label: "Left jog", bytes: [0xB0, 6, k % 2 ? 1 : 127] });
  for (var j = 0; j < 60; j++) events.push({ t: 8000 + j, label: "", bytes: [0xF0, 0x7E, 0x00, j, 0xF7] });
  var port = { name: "DDJ-400 MIDI 1", manufacturer: "Pioneer DJ", version: "" };
  var c = M.buildCapture({ when: "2026-11-25T12:00:00.000Z", userAgent: "test", input: port, output: port,
                           identityBytes: threeByteId, events: events });
  assert.deepStrictEqual([c.format, c.version, c.captured], ["animus-controller-capture", 1, "2026-11-25T12:00:00.000Z"]);
  assert.strictEqual(c.controller.answeredInquiry, true);
  assert.strictEqual(c.controller.identityRaw, M.hex(threeByteId));
  assert.strictEqual(c.controller.input.name, "DDJ-400 MIDI 1");          // what the feedback page shows
  assert.strictEqual(c.events.length, 5000);
  assert.strictEqual(c.truncated, true);
  assert.deepStrictEqual(c.events[1], { t: 1, label: "Left jog", bytes: "B0 06 01" });   // whole milliseconds, hex bytes
  assert.strictEqual(c.sysexSeen.length, 50);
  assert.strictEqual(c.controls[0].count, 5003);                           // the summary counts all of it, past the cap
  assert.strictEqual(c.suggestedProfile.id, "ddj-400");

  var empty = M.buildCapture({ when: "x", userAgent: "", input: null, output: null, identityBytes: null, events: [] });
  assert.deepStrictEqual([empty.controller.answeredInquiry, empty.truncated, empty.sysexSeen.length, empty.controls.length],
                         [false, false, 0, 0]);
  assert.strictEqual(empty.suggestedProfile.name, "Unknown controller");
});

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
