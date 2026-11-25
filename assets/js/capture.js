/* ==========================================================================
   The controller capture - Web MIDI, in the tester's own browser.

   Asks the controller who it is (the Universal Device Inquiry), records every message it sends while the tester names each
   control they touch, and hands back a .json - saved to disk, or attached to the feedback form. Nothing leaves the browser until
   the tester chooses to send it. The naming and the file are AnimusMidi's (midi.js); this is the page around them.
   ========================================================================== */
(function () {
  "use strict";
  var M = window.AnimusMidi;
  function $(id) { return document.getElementById(id); }

  var support = $("support"), connectBtn = $("connect"), portSelect = $("port"), connectStatus = $("connect-status");
  var askBtn = $("ask"), idStatus = $("identity-status"), idList = $("identity");
  var recordBtn = $("record"), stopBtn = $("stop"), clearBtn = $("clear"), labelBox = $("label"), nextBtn = $("next");
  var logBox = $("log"), counts = $("counts"), saveBtn = $("save"), attachBtn = $("attach"), sendStatus = $("send-status");

  var access = null, input = null, output = null;
  var recording = false, t0 = 0, events = [], identityBytes = null, waitingForIdentity = false, label = "", lastLoggedLabel = null;
  var MAX_EVENTS = 20000, MAX_ROWS = 400;

  function setStatus(el, text, kind) {
    el.textContent = text;
    el.className = "status" + (kind ? " " + kind : "");
  }
  function enable(list, on) { list.forEach(function (b) { b.disabled = !on; }); }

  // ---- can this browser do it? ----------------------------------------------------------------------------------
  if (!navigator.requestMIDIAccess) {
    support.hidden = false;
    support.className = "notice bad";
    support.textContent = "This browser can't talk to MIDI devices. Open this page in Chrome, Edge or Opera on a computer " +
                          "(Firefox and Safari don't support Web MIDI).";
    enable([connectBtn], false);
    return;
  }
  if (!window.isSecureContext) {
    support.hidden = false;
    support.className = "notice bad";
    support.textContent = "MIDI only works on a secure (https) page. Open this page from the Animus Music Tech website.";
    enable([connectBtn], false);
    return;
  }

  // ---- 2. connect -----------------------------------------------------------------------------------------------
  connectBtn.addEventListener("click", function () {
    setStatus(connectStatus, "Asking your browser for MIDI access - allow it, including system exclusive messages.");
    navigator.requestMIDIAccess({ sysex: true }).then(function (a) { onAccess(a, true); }, function () {
      // SysEx refused: the controls can still be recorded, only the "who are you?" question needs it.
      navigator.requestMIDIAccess().then(function (a) { onAccess(a, false); }, function () {
        setStatus(connectStatus, "MIDI access was refused. Allow it in the address bar's site settings and try again.", "bad");
      });
    });
  });

  function onAccess(a, sysex) {
    access = a;
    access.onstatechange = fillPorts;
    fillPorts();
    if (!sysex) setStatus(connectStatus, "Connected without system exclusive access - recording works, asking the controller who it is won't.", "bad");
  }

  function fillPorts() {
    var keep = portSelect.value;
    portSelect.innerHTML = "";
    var found = 0;
    access.inputs.forEach(function (port) {
      var opt = document.createElement("option");
      opt.value = port.id;
      opt.textContent = port.name + (port.manufacturer ? "  (" + port.manufacturer + ")" : "");
      portSelect.appendChild(opt);
      found++;
    });
    portSelect.disabled = !found;
    if (!found) {
      setStatus(connectStatus, "No MIDI devices found. Plug the controller in (and close any DJ software using it) - it appears here by itself.", "bad");
      return;
    }
    if (keep && access.inputs.get(keep)) portSelect.value = keep;
    choose();
  }

  portSelect.addEventListener("change", choose);

  function choose() {
    if (input) input.onmidimessage = null;
    input = access.inputs.get(portSelect.value);
    output = null;
    if (!input) return;
    // The output with the same name is the same controller (that is how Windows lists them).
    access.outputs.forEach(function (port) {
      if (!output && port.name === input.name) output = port;
    });
    if (!output) access.outputs.forEach(function (port) {
      if (!output && (port.name.indexOf(input.name) >= 0 || input.name.indexOf(port.name) >= 0)) output = port;
    });
    input.onmidimessage = onMessage;
    input.open().then(function () {
      setStatus(connectStatus, "Listening to " + input.name + ". Touch a control - you should see it in the log once you start recording.", "ok");
      enable([recordBtn, askBtn], true);
      askBtn.disabled = !output;
    }, function () {
      setStatus(connectStatus, input.name + " is busy - close Serato, rekordbox, Animus or any other program using it, then choose it again.", "bad");
    });
  }

  // ---- 3. who are you? ------------------------------------------------------------------------------------------
  askBtn.addEventListener("click", function () {
    if (!output) return;
    output.open().then(function () {
      identityBytes = null;
      waitingForIdentity = true;
      idList.hidden = true;
      setStatus(idStatus, "Asking...");
      output.send(M.IDENTITY_REQUEST);
      setTimeout(function () {
        if (!waitingForIdentity) return;
        waitingForIdentity = false;
        setStatus(idStatus, "No answer. That's fine - plenty of controllers don't reply. Its name and the recording still help.", "");
      }, 2000);
    }, function () {
      setStatus(idStatus, "Couldn't send to the controller - is another program holding it?", "bad");
    });
  });

  function showIdentity() {
    var id = M.parseIdentity(identityBytes);
    waitingForIdentity = false;
    setStatus(idStatus, "It answered.", "ok");
    idList.innerHTML = "";
    [["Manufacturer ID", id.manufacturer], ["Family", id.family + "  (" + id.familyNumber + ")"],
     ["Model", id.member + "  (" + id.memberNumber + ")"], ["Firmware", id.revision], ["Full reply", id.raw]].forEach(function (kv) {
      var dt = document.createElement("dt"), dd = document.createElement("dd");
      dt.textContent = kv[0];
      dd.textContent = kv[1];
      idList.appendChild(dt);
      idList.appendChild(dd);
    });
    idList.hidden = false;
    refreshSend();
  }

  // ---- 4. record ------------------------------------------------------------------------------------------------
  function onMessage(e) {
    var bytes = Array.prototype.slice.call(e.data);
    if (bytes[0] === 0xF8 || bytes[0] === 0xFE) return;           // clock and active sensing: noise, not a control
    if (bytes[0] === 0xF0 && waitingForIdentity && M.parseIdentity(bytes)) {
      identityBytes = bytes;
      showIdentity();
      return;
    }
    if (!recording || events.length >= MAX_EVENTS) return;
    var ev = { t: performance.now() - t0, label: label, bytes: bytes };
    events.push(ev);
    row(ev);
    updateCounts();
  }

  function row(ev) {
    if (ev.label !== lastLoggedLabel) {
      lastLoggedLabel = ev.label;
      var head = document.createElement("div");
      head.className = "label-row";
      head.textContent = ev.label ? "▸ " + ev.label : "▸ (no label)";
      logBox.appendChild(head);
    }
    var d = M.describe(ev.bytes);
    var r = document.createElement("div");
    r.className = "row" + (d.kind === "sysex" ? " sysex" : "");
    var t = document.createElement("span"), b = document.createElement("span"), x = document.createElement("span");
    t.className = "t"; t.textContent = (ev.t / 1000).toFixed(2) + " s";
    b.className = "b"; b.textContent = M.hex(ev.bytes.slice(0, 12)) + (ev.bytes.length > 12 ? " ..." : "");
    x.textContent = d.text;
    r.appendChild(t); r.appendChild(b); r.appendChild(x);
    logBox.appendChild(r);
    while (logBox.childNodes.length > MAX_ROWS) logBox.removeChild(logBox.firstChild);
    logBox.scrollTop = logBox.scrollHeight;
  }

  function updateCounts() {
    var controls = M.summarise(events).length;
    counts.textContent = events.length + " message" + (events.length === 1 ? "" : "s") + " from " + controls + " control" +
                         (controls === 1 ? "" : "s") + (events.length >= MAX_EVENTS ? " (the most one recording keeps)" : "");
  }

  recordBtn.addEventListener("click", function () {
    if (!events.length) t0 = performance.now();
    recording = true;
    enable([stopBtn, nextBtn, labelBox], true);
    recordBtn.disabled = true;
    labelBox.focus();
  });
  stopBtn.addEventListener("click", function () {
    recording = false;
    stopBtn.disabled = true;
    recordBtn.disabled = false;
    recordBtn.textContent = "Carry on recording";
    refreshSend();
  });
  clearBtn.addEventListener("click", function () {
    events = [];
    lastLoggedLabel = null;
    logBox.innerHTML = "";
    counts.textContent = "Nothing recorded yet.";
    recordBtn.textContent = "Start recording";
    refreshSend();
  });
  labelBox.addEventListener("input", function () { label = labelBox.value.trim(); });
  labelBox.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); next(); } });
  nextBtn.addEventListener("click", next);
  function next() {
    labelBox.value = "";
    label = "";
    labelBox.focus();
  }

  // ---- 5. send --------------------------------------------------------------------------------------------------
  function portInfo(p) { return p ? { name: p.name, manufacturer: p.manufacturer || "", version: p.version || "" } : null; }

  function capture() {
    return M.buildCapture({ when: new Date().toISOString(), userAgent: navigator.userAgent, input: portInfo(input), output: portInfo(output),
                            identityBytes: identityBytes, events: events });
  }

  function refreshSend() { enable([saveBtn, attachBtn], !!(events.length || identityBytes)); }

  saveBtn.addEventListener("click", function () {
    var c = capture();
    var name = "animus-capture-" + (c.suggestedProfile.id || "controller") + "-" + c.captured.slice(0, 10) + ".json";
    var blob = new Blob([JSON.stringify(c, null, 1)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    setStatus(sendStatus, "Saved as " + name + " - attach it on the feedback page, or keep it.", "ok");
  });

  attachBtn.addEventListener("click", function () {
    try {
      sessionStorage.setItem("animus-capture", JSON.stringify(capture()));
      location.href = "feedback.html#controller";
    } catch (e) {
      setStatus(sendStatus, "This recording is too big to carry over - use Save the file, then attach it on the feedback page.", "bad");
    }
  });
})();
