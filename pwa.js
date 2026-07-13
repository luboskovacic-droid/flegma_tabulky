(function () {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js').catch(function () {
      // App still works as a normal static site when service workers are blocked.
    });
    runWellnessNotifications();
  });

  function runWellnessNotifications() {
    if (window.FlegmaWellness) {
      window.FlegmaWellness.notifyDueMessages();
      return;
    }
    if (!window.FlegmaPersonalization) {
      const personalization = document.createElement('script');
      personalization.src = './personalization.js';
      personalization.onload = loadWellnessScript;
      personalization.onerror = loadWellnessScript;
      document.head.appendChild(personalization);
      return;
    }
    loadWellnessScript();
  }

  function loadWellnessScript() {
    const script = document.createElement('script');
    script.src = './wellness.js';
    script.onload = function () {
      if (window.FlegmaWellness) window.FlegmaWellness.notifyDueMessages();
    };
    document.head.appendChild(script);
  }
})();
