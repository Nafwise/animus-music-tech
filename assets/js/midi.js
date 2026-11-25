/* ==========================================================================
   AnimusMidi - what a controller's MIDI says, as plain functions (no browser needed: tests/midi_test.js runs them in Node)

   The capture page (capture.js) uses these to name each message, group them by the control they came from, read a controller's
   answer to the MIDI standard's "who are you?" (the Universal Device Inquiry), and write the file a tester sends in - including a
   profile in the shape of Animus Engine Pro's own controller database (Resources/backend/sysexdb.json), ready to paste in.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AnimusMidi = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // The Universal Device Inquiry: F0 7E 7F 06 01 F7 ("every device: identify yourself").
  var IDENTITY_REQUEST = [0xF0, 0x7E, 0x7F, 0x06, 0x01, 0xF7];

  function hex(bytes) {
    var out = [];
    for (var i = 0; i < bytes.length; i++) out.push((bytes[i] < 16 ? "0" : "") + bytes[i].toString(16).toUpperCase());
    return out.join(" ");
  }

  var REALTIME = { 0xF8: "Clock", 0xFA: "Start", 0xFB: "Continue", 0xFC: "Stop", 0xFE: "Active sensing", 0xFF: "Reset" };

  // One message, named: { kind, channel, number, value, text }.
  function describe(bytes) {
    var s = bytes[0];
    if (s === 0xF0) return { kind: "sysex", text: "SysEx, " + bytes.length + " bytes" };
    if (s >= 0xF8) return { kind: "realtime", text: REALTIME[s] || "System real-time " + hex([s]) };
    if (s >= 0xF0) return { kind: "system", text: "System message " + hex([s]) };
    var ch = (s & 0x0F) + 1, d1 = bytes[1], d2 = bytes[2];
    switch (s & 0xF0) {
      case 0x80: return { kind: "note", channel: ch, number: d1, value: 0, text: "Note off  ch " + ch + "  note " + d1 };
      case 0x90:
        return d2 === 0
          ? { kind: "note", channel: ch, number: d1, value: 0, text: "Note off  ch " + ch + "  note " + d1 }
          : { kind: "note", channel: ch, number: d1, value: d2, text: "Note on   ch " + ch + "  note " + d1 + "  vel " + d2 };
      case 0xA0: return { kind: "aftertouch", channel: ch, number: d1, value: d2, text: "Aftertouch ch " + ch + "  note " + d1 + "  " + d2 };
      case 0xB0: return { kind: "cc", channel: ch, number: d1, value: d2, text: "CC        ch " + ch + "  #" + d1 + "  = " + d2 };
      case 0xC0: return { kind: "program", channel: ch, number: d1, value: d1, text: "Program   ch " + ch + "  " + d1 };
      case 0xD0: return { kind: "pressure", channel: ch, value: d1, text: "Pressure  ch " + ch + "  " + d1 };
      case 0xE0: {
        var v = (d2 << 7) | d1;
        return { kind: "pitchbend", channel: ch, value: v, text: "Pitch bend ch " + ch + "  " + v };
      }
    }
    return { kind: "unknown", text: hex(bytes) };
  }

  // The control a message came from: a note's press and release are one control, a CC number another, and so on.
  function controlKey(bytes) {
    var d = describe(bytes);
    if (d.kind === "note" || d.kind === "aftertouch") return "note:" + d.channel + ":" + d.number;
    if (d.kind === "cc") return "cc:" + d.channel + ":" + d.number;
    if (d.kind === "pitchbend" || d.kind === "pressure" || d.kind === "program") return d.kind + ":" + d.channel;
    if (d.kind === "sysex") return "sysex";
    return d.kind;
  }

  // A reply to the inquiry: F0 7E <device> 06 02 <manufacturer: 1 byte, or 00 and 2 more> <family 2> <model 2> <revision 4> F7
  // (family and model are 14-bit numbers, low byte first). Hex as Animus Engine Pro writes them: upper case, space-separated.
  function parseIdentity(bytes) {
    if (!bytes || bytes.length < 13 || bytes[0] !== 0xF0 || bytes[1] !== 0x7E || bytes[3] !== 0x06 || bytes[4] !== 0x02) return null;
    var i = 5, manufacturer;
    if (bytes[i] === 0x00) { manufacturer = slice(bytes, i, 3); i += 3; }
    else { manufacturer = slice(bytes, i, 1); i += 1; }
    if (bytes.length < i + 9 || bytes[bytes.length - 1] !== 0xF7) return null;
    var family = slice(bytes, i, 2), member = slice(bytes, i + 2, 2), revision = slice(bytes, i + 4, 4);
    return {
      device: bytes[2],
      manufacturer: hex(manufacturer),
      family: hex(family), familyNumber: family[0] | (family[1] << 7),
      member: hex(member), memberNumber: member[0] | (member[1] << 7),
      revision: hex(revision),
      raw: hex(bytes)
    };
  }

  function slice(bytes, start, n) {
    var out = [];
    for (var k = 0; k < n; k++) out.push(bytes[start + k]);
    return out;
  }

  // A capture, summed up: every control seen, what it sent, how often, and under which label the tester gave it.
  // events: [{ t: ms since start, label: "..." or "", bytes: [..] }]
  function summarise(events) {
    var controls = {}, order = [];
    events.forEach(function (e) {
      var key = controlKey(e.bytes);
      if (key === "realtime" || key === "system") return;
      var d = describe(e.bytes);
      var c = controls[key];
      if (!c) {
        c = controls[key] = { control: key, kind: d.kind, channel: d.channel, number: d.number, status: hex([e.bytes[0] & 0xF0 | 0]),
                              labels: [], count: 0, min: null, max: null, first: hex(e.bytes) };
        if (d.kind === "sysex") c.status = "F0";
        order.push(key);
      }
      c.count++;
      if (typeof d.value === "number") {
        c.min = c.min === null ? d.value : Math.min(c.min, d.value);
        c.max = c.max === null ? d.value : Math.max(c.max, d.value);
      }
      if (e.label && c.labels.indexOf(e.label) < 0) c.labels.push(e.label);
    });
    return order.map(function (k) { return controls[k]; });
  }

  // A starting point for Animus Engine Pro's controller database (sysexdb.json): what the app matches a controller by - the
  // manufacturer in its identity reply, and its port name. "probable" until the developer has checked it with the hardware.
  function suggestProfile(portName, portManufacturer, identity, when) {
    var name = (portName || "").replace(/\s*(midi|usb|audio)\s*\d*$/i, "").trim() || "Unknown controller";
    var id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return {
      id: id,
      name: name,
      vendor: portManufacturer || "",
      confidence: "probable",
      notes: "Captured by a tester with the Animus Music Tech controller capture, " + when + ". Check with the hardware, then mark verified.",
      match: {
        namePatterns: [name.toLowerCase()],
        sysexManufacturer: identity ? identity.manufacturer : null
      },
      identity: identity ? { family: identity.family, member: identity.member, revision: identity.revision } : null
    };
  }

  // The file a tester sends in.
  function buildCapture(info) {
    var identity = info.identityBytes ? parseIdentity(info.identityBytes) : null;
    return {
      format: "animus-controller-capture",
      version: 1,
      captured: info.when,
      browser: info.userAgent,
      controller: {
        input: info.input || null,
        output: info.output || null,
        identityReply: identity,
        identityRaw: info.identityBytes ? hex(info.identityBytes) : null,
        answeredInquiry: !!identity
      },
      suggestedProfile: suggestProfile(info.input && info.input.name, info.input && info.input.manufacturer, identity, info.when),
      controls: summarise(info.events),
      sysexSeen: info.events.filter(function (e) { return e.bytes[0] === 0xF0; }).map(function (e) { return hex(e.bytes); }).slice(0, 50),
      events: info.events.slice(0, 5000).map(function (e) { return { t: Math.round(e.t), label: e.label || "", bytes: hex(e.bytes) }; }),
      truncated: info.events.length > 5000
    };
  }

  return { IDENTITY_REQUEST: IDENTITY_REQUEST, hex: hex, describe: describe, controlKey: controlKey, parseIdentity: parseIdentity,
           summarise: summarise, suggestProfile: suggestProfile, buildCapture: buildCapture };
});
