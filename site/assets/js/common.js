/* Shared page chrome: the UTC clock in the top bar. */
(function () {
  var clocks = document.querySelectorAll("[data-clock]");
  if (!clocks.length) return;
  function tick() {
    var s = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
    for (var i = 0; i < clocks.length; i++) clocks[i].textContent = s;
  }
  tick();
  setInterval(tick, 1000);
})();
