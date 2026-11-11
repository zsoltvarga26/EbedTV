// Villanásmentes témaválasztás: a React betöltése előtt fut le.
// Külön fájl, hogy a Content-Security-Policy ne igényeljen 'unsafe-inline' scriptet.
(function () {
  var t = null;
  try { t = localStorage.getItem("km-theme"); } catch (e) {}
  if (t !== "light" && t !== "dark") {
    t = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.dataset.theme = t;
})();
