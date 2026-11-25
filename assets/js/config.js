/* ==========================================================================
   The site's settings.
   ========================================================================== */
window.ANIMUS = {
  // Where Animus Engine Pro's installers and updates are published (GitHub Releases).
  releasesRepo: "Nafwise/Animus-Releases",

  // The Legends count on the home page: downloads of the Animus Engine Pro installer (every AnimusPro-Setup-*.exe in the
  // releases), as GitHub counts them. App updates fetch other files, so they never count.
  legends: {
    // Downloads before the count started on 25 November 2026 - the developer's own tests - so it began at 0. To leave out
    // another test download of your own, add 1.
    notCounted: 1,
    // GitHub forgets an installer's downloads when it's deleted from a release. Before deleting one, add its download count
    // here (gh api repos/Nafwise/Animus-Releases/releases), or the count drops.
    carried: 0
  }
};
// The feedback address is in the pages themselves (feedback.html, legal.html, privacy.html), not here: the feedback page reads
// it from its own mailto link.
