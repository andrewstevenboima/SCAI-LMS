/*
 * sca-tracker.js: tells the Career website which lesson a student has open
 * and, when a quiz ends, the score, so it can save their progress.
 *
 * scripts/inject-tracker.mjs adds this to every course's start page when the
 * library is published (the exports in courses/ stay untouched):
 *   <script src="…/sca-tracker.js" data-slug="<course folder>" defer></script>
 *
 * It only talks to the page that embeds the course, and only if that page is
 * the Career website. It sends lesson ids and a score, never anything the
 * student typed.
 */
(function () {
  "use strict";
  var CAREER_ORIGIN = "https://career.studentcompanionai.rw";
  if (window.parent === window) return; // opened on its own: nothing to tell

  var script = document.currentScript;
  var slug = script && script.getAttribute("data-slug");
  if (!slug || !/^[a-z0-9][a-z0-9-]{0,80}$/.test(slug)) return;

  function send(message) {
    message.slug = slug;
    try { window.parent.postMessage(message, CAREER_ORIGIN); } catch (e) { /* not the Career website */ }
  }

  // Rise routes lessons as #/lessons/<lesson id>.
  var lastLesson = null;
  function onRoute() {
    var m = /^#\/lessons\/([A-Za-z0-9_-]{1,64})/.exec(location.hash);
    if (!m || m[1] === lastLesson) return;
    lastLesson = m[1];
    send({ type: "sca-course:lesson", lessonId: m[1] });
  }
  window.addEventListener("hashchange", onRoute);
  setInterval(onRoute, 1000); // Rise can change lessons without a hashchange event

  // A finished quiz shows its results panel; the score is in its
  // screen-reader description ("Your score: 80%").
  var lastScore = null;
  function checkQuiz() {
    var panel = document.querySelector('[data-testid="quiz-results"][class*="--active"]');
    if (!panel) { lastScore = null; return; }
    var desc = panel.querySelector('[id^="quiz-results-desc-"]');
    var line = desc && desc.children[1];
    var m = line && /(\d{1,3})\s*%/.exec(line.textContent || "");
    if (!m) return;
    var score = Math.min(100, parseInt(m[1], 10));
    var key = lastLesson + ":" + score;
    if (key === lastScore) return;
    lastScore = key;
    send({ type: "sca-course:quiz", lessonId: lastLesson, score: score });
  }

  var pending = false;
  function start() {
    onRoute();
    send({ type: "sca-course:open" });
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      setTimeout(function () { pending = false; onRoute(); checkQuiz(); }, 400);
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
