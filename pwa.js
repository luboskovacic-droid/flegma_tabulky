(function () {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js').catch(function () {
      // App still works as a normal static site when service workers are blocked.
    });
  });
})();
