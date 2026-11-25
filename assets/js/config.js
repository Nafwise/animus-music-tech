/* ==========================================================================
   The site's settings - the one file to edit to connect the feedback form, or to move the releases.
   ========================================================================== */
window.ANIMUS = {
  // Where Animus Engine Pro's installers and updates are published (GitHub Releases).
  releasesRepo: "Nafwise/Animus-Releases",

  // Where the feedback form is sent. GitHub Pages cannot send email itself, so a form relay forwards each submission to an
  // inbox. FormSubmit (https://formsubmit.co) is free, needs no account and takes file attachments:
  //   1. put "https://formsubmit.co/your@address" here and send one test from the feedback page;
  //   2. FormSubmit emails that address once to confirm it - confirm;
  //   3. its email also gives a random alias (https://formsubmit.co/el/...): use that here instead, so the address is not in
  //      the page for anyone to read.
  // Left empty, the feedback page says it is not connected yet and offers the answers as a file to email by hand.
  feedbackAction: "",
};
