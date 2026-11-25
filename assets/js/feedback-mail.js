/* ==========================================================================
   AnimusFeedback - the feedback page's email, as plain functions (no browser needed: tests/feedback_test.js runs them in Node).

   The page sends nothing itself. It opens an email in the visitor's own email app (a mailto: link) with their answers written
   in, so no outside service ever handles them. A mailto: link has a length limit, and can't carry a file, so when there's a
   controller capture - or the answers are too long - the page also saves one .json with everything, for the visitor to attach.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AnimusFeedback = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Some mail apps on Windows cut a mailto: link off at about 2,000 characters - stay under that.
  var MAX_URL = 1900;

  // The short answers, in the email's order: [field, label].
  var LINES = [
    ["name", "Name or handle"], ["found_via", "How I found Animus"], ["app", "App"], ["version", "Version"],
    ["windows", "Windows"], ["cpu", "Processor"], ["ram", "Memory"], ["gpu", "Graphics card"], ["audio", "Audio"],
    ["controller", "Controller"], ["controller_worked", "Worked when Animus started"],
    ["send_midi", "Would send MIDI and SysEx data"], ["rating_stability", "Stability (1-5)"], ["rating_sound", "Sound (1-5)"],
    ["rating_ease", "Ease of use (1-5)"], ["rating_features", "Features (1-5)"], ["used_for", "I use it for"],
    ["wants_to_test", "I'd like to test"], ["test_apps", "Apps to test"], ["ok_to_email", "OK to email me about testing"]
  ];
  // The long answers: [field, question].
  var TEXTS = [["works_well", "What works well?"], ["went_wrong", "What went wrong?"], ["wishlist", "What would you love next?"]];

  function count(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }

  function captureLine(capture) {
    var c = capture.controller || {};
    var name = (c.input && c.input.name) || "a controller";
    return "Controller capture: " + name + " - " + count((capture.controls || []).length, "control") + ", " +
           count((capture.events || []).length, "message") + (c.answeredInquiry ? ", and it said who it is" : "") + ".";
  }

  // At most max characters, ended at a word.
  function cut(text, max) {
    if (text.length <= max) return text;
    return text.slice(0, max).replace(/\s+\S*$/, "") + " [...]";
  }

  // The email's text. textMax: how much of each long answer goes in. fileName: the file to attach, or "" for none.
  function bodyText(answers, capture, fileName, textMax) {
    var out = ["Animus feedback", ""];
    LINES.forEach(function (l) { if (answers[l[0]]) out.push(l[1] + ": " + answers[l[0]]); });
    TEXTS.forEach(function (t) { if (answers[t[0]]) out.push("", t[1], cut(answers[t[0]], textMax)); });
    if (capture) out.push("", captureLine(capture));
    if (fileName) out.push("", "Attached: " + fileName + " (all of this in full" + (capture ? ", and the controller capture" : "") + ")");
    return out.join("\n");
  }

  function mailto(address, subject, body) {
    return "mailto:" + address + "?subject=" + encodeURIComponent(subject) +
           "&body=" + encodeURIComponent(body.replace(/\r?\n/g, "\r\n"));
  }

  // The email to open: { url, body (what the link carries), full (the whole text, for copying), needsFile }.
  function compose(answers, opts) {
    var capture = opts.capture || null, subject = opts.subject || "Animus feedback", max = opts.maxUrl || MAX_URL;
    var withCapture = bodyText(answers, capture, capture ? opts.fileName : "", Infinity);
    if (mailto(opts.address, subject, withCapture).length <= max) {
      return { url: mailto(opts.address, subject, withCapture), body: withCapture, full: withCapture, needsFile: !!capture };
    }
    // Too long for the link: the long answers are shortened in the email - the file has them whole.
    var lo = 0, hi = 0, best = null;
    TEXTS.forEach(function (t) { hi = Math.max(hi, (answers[t[0]] || "").length); });
    while (lo <= hi) {
      var mid = (lo + hi) >> 1, body = bodyText(answers, capture, opts.fileName, mid);
      if (mailto(opts.address, subject, body).length <= max) { best = body; lo = mid + 1; } else hi = mid - 1;
    }
    if (best === null) best = "Animus feedback\n\nAttached: " + opts.fileName + " (all my answers)";   // even the short answers won't fit
    return { url: mailto(opts.address, subject, best), body: best, full: bodyText(answers, capture, opts.fileName, Infinity),
             needsFile: true };
  }

  // The file that goes with it: every answer, and the capture as the capture page made it.
  function fileFor(answers, capture, when) {
    var data = { format: "animus-feedback", version: 1, written: when, answers: answers };
    if (capture) data.controllerCapture = capture;
    return JSON.stringify(data, null, 1);
  }

  return { MAX_URL: MAX_URL, count: count, bodyText: bodyText, mailto: mailto, compose: compose, fileFor: fileFor };
});
