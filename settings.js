(function () {
  const SETTINGS_KEY = 'flegma_tabulky_settings_v1';
  const SPORT_LABELS = {
    fitko: 'Fitko',
    bike: 'Bicyklovanie',
    run: 'Beh',
    swim: 'Plavanie',
    brick: 'Brick',
    multi: 'Dua-aqua-triat',
    race: 'Sutaz'
  };

  const PRESETS = {
    weightloss: [],
    bike: ['fitko', 'bike'],
    triathlon: ['fitko', 'bike', 'run', 'swim', 'brick', 'multi', 'race']
  };

  const defaultSettings = {
    configured: false,
    sports: {
      fitko: true,
      bike: true,
      run: true,
      swim: true,
      brick: true,
      multi: true,
      race: true
    }
  };

  window.FlegmaSettings = {
    key: SETTINGS_KEY,
    labels: SPORT_LABELS,
    read: readSettings,
    save: saveSettings,
    hasAnySport,
    isSportEnabled
  };

  document.addEventListener('DOMContentLoaded', () => {
    const settings = readSettings();
    applyVisibility(settings);
    setupForms(settings);
    filterCalendarType(settings);
  });

  function readSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return cloneDefault();
      const parsed = JSON.parse(raw);
      return {
        configured: Boolean(parsed.configured),
        sports: {
          ...cloneDefault().sports,
          ...(parsed.sports || {})
        }
      };
    } catch {
      return cloneDefault();
    }
  }

  function cloneDefault() {
    return JSON.parse(JSON.stringify(defaultSettings));
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function hasAnySport(settings) {
    return Object.values(settings.sports || {}).some(Boolean);
  }

  function isSportEnabled(type, settings = readSettings()) {
    return Boolean(settings.sports && settings.sports[type]);
  }

  function applyVisibility(settings) {
    const anySport = hasAnySport(settings);
    const setupPanel = document.querySelector('[data-setup-panel]');
    if (setupPanel) {
      setupPanel.hidden = settings.configured;
    }

    if (settings.configured && isIndexPage() && !setupPanel) {
      window.location.replace('diary.html');
      return;
    }

    if (settings.configured && isIndexPage() && setupPanel.hidden) {
      window.location.replace('diary.html');
      return;
    }

    if (settings.configured && !anySport && isHiddenModulePage()) {
      window.location.replace('diary.html');
      return;
    }

    document.querySelectorAll('[href="calendar.html"], [href="fit-import.html"], [href="graphs.html"], [href="data.html"], [data-module="sports"], [data-module="analysis"]').forEach((element) => {
      element.hidden = settings.configured && !anySport;
    });

    document.querySelectorAll('[data-sport-type]').forEach((element) => {
      const sportType = element.getAttribute('data-sport-type');
      element.hidden = settings.configured && !isSportEnabled(sportType, settings);
    });

    const modeText = document.querySelector('[data-settings-summary]');
    if (modeText) {
      modeText.textContent = summarize(settings);
    }
  }

  function summarize(settings) {
    if (!settings.configured) return 'Este nie je ulozeny profil sportov.';
    const enabled = Object.entries(settings.sports)
      .filter((entry) => entry[1])
      .map((entry) => SPORT_LABELS[entry[0]]);
    return enabled.length ? enabled.join(', ') : 'Len chudnutie / strava bez sportovych modulov';
  }

  function setupForms(settings) {
    document.querySelectorAll('[data-sport-settings-form]').forEach((form) => {
      fillForm(form, settings);
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const next = readForm(form);
        saveSettings(next);
        applyVisibility(next);
        filterCalendarType(next);
        showSaved(form);
        if (form.hasAttribute('data-start-setup')) {
          window.setTimeout(() => {
            window.location.href = 'diary.html';
          }, 350);
        }
      });
    });

    document.querySelectorAll('[data-sport-preset]').forEach((button) => {
      button.addEventListener('click', () => {
        const preset = PRESETS[button.getAttribute('data-sport-preset')] || [];
        const form = button.closest('form') || document.querySelector('[data-sport-settings-form]');
        if (!form) return;
        form.querySelectorAll('[name^="sport_"]').forEach((input) => {
          const type = input.name.replace('sport_', '');
          input.checked = preset.includes(type);
        });
      });
    });
  }

  function fillForm(form, settings) {
    Object.keys(SPORT_LABELS).forEach((type) => {
      const input = form.querySelector(`[name="sport_${type}"]`);
      if (input) input.checked = Boolean(settings.sports[type]);
    });
  }

  function readForm(form) {
    const sports = {};
    Object.keys(SPORT_LABELS).forEach((type) => {
      const input = form.querySelector(`[name="sport_${type}"]`);
      sports[type] = Boolean(input && input.checked);
    });
    return {
      configured: true,
      sports
    };
  }

  function showSaved(form) {
    const notice = form.querySelector('[data-settings-saved]');
    if (!notice) return;
    notice.hidden = false;
    window.clearTimeout(showSaved.timeout);
    showSaved.timeout = window.setTimeout(() => {
      notice.hidden = true;
    }, 2400);
  }

  function isIndexPage() {
    const path = window.location.pathname.split('/').pop();
    return path === '' || path === 'index.html';
  }

  function isHiddenModulePage() {
    return ['graphs.html', 'data.html', 'calendar.html', 'fit-import.html', 'training.html'].includes(window.location.pathname.split('/').pop());
  }

  function filterCalendarType(settings) {
    const select = document.getElementById('type');
    if (!select) return;

    Array.from(select.options).forEach((option) => {
      option.hidden = settings.configured && !isSportEnabled(option.value, settings);
      option.disabled = settings.configured && !isSportEnabled(option.value, settings);
    });

    const firstEnabled = Array.from(select.options).find((option) => !option.disabled);
    if (select.selectedOptions[0] && select.selectedOptions[0].disabled && firstEnabled) {
      select.value = firstEnabled.value;
      select.dispatchEvent(new Event('change'));
    }

    const form = document.getElementById('trainingForm');
    if (!form) return;
    const noSports = settings.configured && !hasAnySport(settings);
    form.querySelectorAll('input, select, button').forEach((control) => {
      control.disabled = noSports;
    });

    let notice = document.getElementById('sportsDisabledNotice');
    if (noSports && !notice) {
      notice = document.createElement('p');
      notice.id = 'sportsDisabledNotice';
      notice.className = 'notice-text';
      notice.textContent = 'Sportove moduly su vypnute. Zapnes ich v Nastaveni.';
      form.parentElement.insertBefore(notice, form);
    }
    if (notice) notice.hidden = !noSports;
  }
})();
