/* ==========================================================================
   The feedback page: its ratings, a controller capture carried over from the capture page, and the email itself - written by
   AnimusFeedback (feedback-mail.js) and opened in the visitor's own email app, so nothing is sent from the page.
   ========================================================================== */
(function () {
  "use strict";
  var F = window.AnimusFeedback;
  function $(id) { return document.getElementById(id); }

  var form = $("feedback"), status = $("form-status"), after = $("after-send");
  var sendBtn = $("send"), downloadAgain = $("download-file");
  var address = $("feedback-address").getAttribute("href").replace(/^mailto:/, "");
  var lastFull = "", lastFileJson = "", lastFileName = "";

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

  // ---- a capture from the capture page (kept in this tab's session storage until the tab closes or it's removed) -----
  var capture = null;
  try { capture = JSON.parse(sessionStorage.getItem("animus-capture") || "null"); } catch (e) { capture = null; }

  function showCapture() {
    var has = !!capture;
    $("capture-attached").hidden = !has;
    $("capture-none").hidden = has;
    sendBtn.textContent = has ? "Download .json & open email" : "Email my feedback";
    if (!has) return;
    var c = capture.controller || {};
    var name = (c.input && c.input.name) || "your controller";
    $("capture-summary").textContent = "Controller capture loaded: " + name + " - " + F.count((capture.controls || []).length, "control") +
      ", " + F.count((capture.events || []).length, "message") + (c.answeredInquiry ? ", and it said who it is." : ".") +
      " Clicking below will save a file starting with animus-feedback to your Downloads folder for you to attach.";
  }
  showCapture();
  $("capture-remove").addEventListener("click", function () {
    capture = null;
    try { sessionStorage.removeItem("animus-capture"); } catch (e) { /* fine */ }
    showCapture();
  });

  // ---- the email ----------------------------------------------------------------------------------------------------
  form.addEventListener("submit", function (e) { e.preventDefault(); });      // nothing to submit to: the button emails

  function answers() {
    var out = {}, multi = {};
    new FormData(form).forEach(function (v, k) { if (typeof v === "string" && v.trim()) out[k] = v.trim(); });
    form.querySelectorAll("input[data-multi]:checked").forEach(function (b) {
      var k = b.getAttribute("data-multi");
      (multi[k] = multi[k] || []).push(b.value);
    });
    Object.keys(multi).forEach(function (k) { out[k] = multi[k].join(", "); });
    return out;
  }

  function follow(href, download) {                // a link, clicked - the way both the file and the email are opened
    var a = document.createElement("a");
    a.href = href;
    if (download) a.download = download;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function triggerDownload(jsonText, fileName) {
    var url = URL.createObjectURL(new Blob([jsonText], { type: "application/json" }));
    follow(url, fileName);
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  }

  sendBtn.addEventListener("click", function () {
    var a = answers();
    var now = new Date().toISOString();
    var fileName = "animus-feedback-" + now.slice(0, 10) + ".json";
    var mail = F.compose(a, { capture: capture, address: address, fileName: fileName });
    lastFull = mail.full;
    if (mail.needsFile) {
      lastFileJson = F.fileFor(a, capture, now);
      lastFileName = fileName;
      triggerDownload(lastFileJson, lastFileName);
    } else {
      lastFileJson = "";
      lastFileName = "";
    }
    if (downloadAgain) downloadAgain.hidden = !mail.needsFile;
    $("after-text").textContent = mail.needsFile
      ? "Almost done! 1) " + fileName + " has been saved to your Downloads folder. " +
        "2) In the email that just opened, remember to attach the file starting with \"animus-feedback\" before pressing Send."
      : "Your email app should now be open with your answers in it. Check them, then press Send.";
    $("open-again").href = mail.url;
    after.hidden = false;
    status.textContent = "";
    setTimeout(function () { follow(mail.url); }, mail.needsFile ? 600 : 0);   // let the file download start before mail steals focus
  });

  if (downloadAgain) {
    downloadAgain.addEventListener("click", function () {
      if (lastFileJson && lastFileName) triggerDownload(lastFileJson, lastFileName);
    });
  }

  $("copy-answers").addEventListener("click", function () {
    function done() { status.textContent = "Copied - paste them into an email to " + address + "."; status.className = "status ok"; }
    function fallback() {
      var box = document.createElement("textarea");
      box.value = lastFull;
      box.setAttribute("readonly", "");
      box.style.position = "fixed"; box.style.opacity = "0";
      document.body.appendChild(box);
      box.select();
      try { document.execCommand("copy"); done(); }
      catch (e) { status.textContent = "Couldn't copy - select your answers in the email instead."; status.className = "status bad"; }
      box.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(lastFull).then(done, fallback);
    else fallback();
  });
})();
