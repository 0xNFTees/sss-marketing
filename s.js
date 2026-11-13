/*! sss.marketing visitor counts. No cookies, nothing stored about the visitor.
 *  Counts page views, clicks on the main buttons, and confirmed bookings.
 *  Visit any page with ?notrack=1 to stop counting your own browser (?notrack=0 to undo). */
(function () {
  "use strict";
  var URL_ = "https://zikfxleqejynrwelgpbc.supabase.co/functions/v1/collect";
  try {
    var q = new URLSearchParams(location.search);
    if (q.get("notrack") === "1") localStorage.setItem("sss_notrack", "1");
    if (q.get("notrack") === "0") localStorage.removeItem("sss_notrack");
    if (localStorage.getItem("sss_notrack")) return;
  } catch (e) {}
  if (navigator.webdriver) return;

  function send(ev) {
    ev.k = "site";
    ev.h = location.hostname;
    ev.u = location.pathname;
    ev.lg = (document.documentElement.lang || "").slice(0, 2);
    var body = JSON.stringify(ev);
    try { if (navigator.sendBeacon && navigator.sendBeacon(URL_, body)) return; } catch (e) {}
    try { fetch(URL_, { method: "POST", body: body, keepalive: true, mode: "no-cors" }); } catch (e) {}
  }

  // Page view, with where the visitor came from.
  var ref = "";
  try {
    if (document.referrer) {
      var r = new URL(document.referrer);
      if (r.hostname !== location.hostname) ref = r.hostname;
    }
  } catch (e) {}
  var p = new URLSearchParams(location.search);
  send({ n: "pageview", r: ref, us: p.get("utm_source"), um: p.get("utm_medium"), uc: p.get("utm_campaign") });

  // Clicks on the buttons that lead to a booking, the calculator, pricing or email.
  var CTA = ".cta-primary, .cta-nav, .btn, .offer-btn, .hero-try, .pricing-mail, [data-track]";
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a") : null;
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (!(a.matches(CTA) || /#contact|#calculateur|^mailto:|\/tarifs/.test(href))) return;
    var label = a.getAttribute("data-track") || (a.textContent || "").replace(/\s+/g, " ").trim();
    send({ n: "cta_click", l: label.slice(0, 80) });
  }, true);

  // A booking confirmed by the booking service (dispatched by the homepage).
  window.addEventListener("sss-booked", function () { send({ n: "booked" }); });
})();
