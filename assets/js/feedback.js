/* ==========================================================================
   The feedback form: sent through the relay set in config.js (FormSubmit), with a controller capture carried over from the capture
   page. Until the relay is set the form still works - the answers can be saved as a file.
   ========================================================================== */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }

  var form = $("feedback"), status = $("form-status"), submit = $("submit"), saveBtn = $("save-answers");
  var action = (window.ANIMUS && window.ANIMUS.feedbackAction) || "";
  var MAX_FILES = 9.5 * 1024 * 1024;           // FormSubmit takes 10 MB of files in all, per message

  // ---- the ratings: four questions, 1 to 5 ------------------------------------------------------------------------
  var ratings = $("ratings");
  [["stability", "Stability"], ["sound", "Sound"], ["ease", "Ease of use"], ["features", "Features"]].forEach(function (q) {
    var label = document.createElement("span");
    label.className = "label";
    label.textContent = q[1];
    label.id = "rate-" + q[0];
    var choices = document.createElement("div");
    choices.className = "choices";
    choices.setAttribute("role", "radiogroup");
    choices.setAttribute("aria-labelledby", label.id);
    for (var n = 1; n <= 5; n++) {
      var l = document.createElement("label"), i = document.createElement("input"), s = document.createElement("span");
      l.className = "choice";
      i.type = "radio"; i.name = "rating_" + q[0]; i.value = String(n);
      s.textContent = String(n);
      l.appendChild(i); l.appendChild(s);
      choices.appendChild(l);
    }
    ratings.appendChild(label);
    ratings.appendChild(choices);
  });

  // ---- back from the relay: thank you ------------------------------------------------------------------------------
  if (/[?&]sent=1\b/.test(location.search)) {
    $("sent").hidden = false;
    try { sessionStorage.removeItem("animus-capture"); } catch (e) { /* fine */ }
  }

  // ---- a capture from the capture page ------------------------------------------------------------------------------
  var capture = null;
  try { capture = JSON.parse(sessionStorage.getItem("animus-capture") || "null"); } catch (e) { capture = null; }

  function showCapture() {
    var has = !!capture;
    $("capture-attached").hidden = !has;
    $("capture-none").hidden = has;
    if (!has) return;
    var c = capture.controller || {};
    var name = (c.input && c.input.name) || "your controller";
    $("capture-summary").textContent = "Controller capture attached: " + name + " - " + (capture.controls || []).length + " controls, " +
      (capture.events || []).length + " messages" + (c.answeredInquiry ? ", and it said who it is." : ".");
  }
  showCapture();
  $("capture-remove").addEventListener("click", function () {
    capture = null;
    try { sessionStorage.removeItem("animus-capture"); } catch (e) { /* fine */ }
    showCapture();
  });

  function captureName() {
    var id = (capture.suggestedProfile && capture.suggestedProfile.id) || "controller";
    return "animus-capture-" + id + "-" + String(capture.captured || "").slice(0, 10) + ".json";
  }

  // The capture goes as a .json attachment - the same file the capture page saves. True when it's attached.
  function attachCapture() {
    var box = $("capture-file");
    try {
      var dt = new DataTransfer();
      if (capture) dt.items.add(new File([JSON.stringify(capture, null, 1)], captureName(), { type: "application/json" }));
      box.files = dt.files;
      return !!capture && box.files.length === 1;
    } catch (e) {
      return false;
    }
  }

  // The email's own text gets the summary: who the controller is and every control it sent. The raw messages are in the
  // attachment - or, if it couldn't be made, the first 1,500 of them are here instead.
  function captureText(attached) {
    if (!capture) return "";
    var copy = JSON.parse(JSON.stringify(capture));
    var n = (copy.events || []).length;
    if (attached) { delete copy.events; copy.eventsNote = "All " + n + " messages are in the attached " + captureName(); }
    else if (n > 1500) { copy.events = copy.events.slice(0, 1500); copy.truncated = true; }
    return JSON.stringify(copy);
  }

  function joinMulti(group, target) {
    var picked = [];
    form.querySelectorAll('input[data-multi="' + group + '"]').forEach(function (b) { if (b.checked) picked.push(b.value); });
    $(target).value = picked.join(", ");
  }

  function prepare() {
    joinMulti("used_for", "used-for");
    joinMulti("test_apps", "test-apps");
    $("capture-field").value = captureText(attachCapture());
    $("next-url").value = location.href.split("#")[0].split("?")[0] + "?sent=1";
  }

  // ---- not connected yet: save the answers instead ------------------------------------------------------------------
  if (!action) {
    $("not-connected").hidden = false;
    $("send-note").hidden = true;
    // Hidden isn't enough: Enter in a text box still "clicks" the form's first submit button and would post it to nowhere.
    submit.hidden = true;
    submit.disabled = true;
    form.addEventListener("submit", function (e) { e.preventDefault(); });
    saveBtn.hidden = false;
    saveBtn.addEventListener("click", function () {
      prepare();
      var answers = {};
      new FormData(form).forEach(function (v, k) {
        if (k.charAt(0) === "_" || k === "controller_capture" || v instanceof File) return;
        if (v !== "") answers[k] = v;
      });
      if (capture) answers.controller_capture = capture;
      var blob = new Blob([JSON.stringify(answers, null, 1)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "animus-feedback-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      var own = $("f-files").files[0];
      status.textContent = own ? "Saved. " + own.name + " isn't inside it - keep the two together." : "Saved. Thank you!";
      status.className = "status ok";
    });
    return;
  }

  form.action = action;

  form.addEventListener("submit", function (e) {
    var email = $("f-email").value.trim();
    if (($("f-test").checked || $("f-consent").checked) && !email) {
      e.preventDefault();
      status.textContent = "Leave an email address so I can reach you about testing.";
      status.className = "status bad";
      $("f-email").focus();
      return;
    }
    prepare();
    var own = $("f-files").files[0], made = $("capture-file").files[0];
    if ((own ? own.size : 0) + (made ? made.size : 0) > MAX_FILES) {
      e.preventDefault();
      status.textContent = "Your file is too big to send - the limit is 10 MB in all. Zip it, or leave it out and mention it in your message.";
      status.className = "status bad";
      return;
    }
    submit.disabled = true;
    status.textContent = "Sending...";
    status.className = "status";
  });

  // Back on this page from the browser's history: the button works again.
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) { submit.disabled = false; status.textContent = ""; status.className = "status"; }
  });
})();
