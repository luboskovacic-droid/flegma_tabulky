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
    mode: 'beginner',
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
    isSportEnabled,
    isBeginnerMode,
    dailyFocus,
    clampNumber
  };

  document.addEventListener('DOMContentLoaded', () => {
    setupMenu();
    const settings = readSettings();
    applyVisibility(settings);
    setupForms(settings);
    setupPersonalization();
    filterCalendarType(settings);
  });

  function setupMenu() {
    const menu = document.querySelector('.side-menu');
    if (!menu || menu.dataset.normalized === 'true') return;

    const groups = [
      {
        id: 'training',
        label: 'Trening',
        pages: [
          ['calendar.html', 'Zoznam/Kalendar'],
          ['training.html', 'Detail'],
          ['fit-import.html', 'FIT import'],
          ['gym.html', 'Fitko'],
          ['checkin.html', 'Check-in'],
          ['graphs.html', 'Grafy']
        ]
      },
      {
        id: 'calories',
        label: 'Kaloricke',
        pages: [
          ['diary.html', 'Kalorie'],
          ['foods.html', 'Jedla'],
          ['recipes.html', 'Recepty'],
          ['recommendations.html', 'Odporucania']
        ]
      },
      {
        id: 'settings',
        label: 'Nastavenie',
        pages: [
          ['settings.html', 'Nastavenie'],
          ['profile.html', 'Bio'],
          ['data.html', 'Data'],
          ['notes.html', 'Poznamky'],
          ['index.html', 'Domov']
        ]
      }
    ];
    const currentPage = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

    menu.dataset.normalized = 'true';
    menu.classList.add('top-tabbar');
    menu.innerHTML = groups.map((group) => {
      const isActiveGroup = group.pages.some(([href]) => href.toLowerCase() === currentPage);
      const links = group.pages.map(([href, label]) => {
        const isCurrent = href.toLowerCase() === currentPage;
        return `<a href="${href}"${isCurrent ? ' aria-current="page"' : ''}>${label}</a>`;
      }).join('');
      return `<details class="top-menu-group"${isActiveGroup ? ' data-active-group="true"' : ''}>
        <summary>${group.label}</summary>
        <div class="top-menu-links">${links}</div>
      </details>`;
    }).join('');

    menu.querySelectorAll('details').forEach((details) => {
      details.addEventListener('toggle', () => {
        if (!details.open) return;
        menu.querySelectorAll('details').forEach((other) => {
          if (other !== details) other.open = false;
        });
      });
    });
  }

  function readSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return cloneDefault();
      const parsed = JSON.parse(raw);
      const configured = Boolean(parsed.configured);
      const parsedSports = parsed.sports || {};
      return {
        configured,
        mode: normalizeMode(parsed.mode),
        sports: readSports(parsedSports, configured)
      };
    } catch {
      return cloneDefault();
    }
  }

  function readSports(parsedSports, configured) {
    return Object.fromEntries(Object.keys(SPORT_LABELS).map((type) => {
      const hasSavedValue = Object.prototype.hasOwnProperty.call(parsedSports, type);
      if (hasSavedValue) return [type, Boolean(parsedSports[type])];
      return [type, configured ? false : Boolean(defaultSettings.sports[type])];
    }));
  }

  function normalizeMode(mode) {
    return mode === 'advanced' ? 'advanced' : 'beginner';
  }

  function cloneDefault() {
    return JSON.parse(JSON.stringify(defaultSettings));
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      configured: Boolean(settings.configured),
      mode: normalizeMode(settings.mode),
      sports: readSports(settings.sports || {}, true)
    }));
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

    document.querySelectorAll('[href="calendar.html"], [href="fit-import.html"], [href="gym.html"], [href="graphs.html"], [href="data.html"], [data-module="sports"], [data-module="analysis"]').forEach((element) => {
      element.hidden = settings.configured && !anySport;
    });

    document.querySelectorAll('[href="graphs.html"], [href="fit-import.html"], [href="data.html"], [data-module="advanced"]').forEach((element) => {
      element.hidden = element.hidden || (settings.configured && isBeginnerMode(settings));
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
    const mode = isBeginnerMode(settings) ? 'Jednoduchy rezim' : 'Pokrocily rezim';
    return `${mode}: ${enabled.length ? enabled.join(', ') : 'Len chudnutie / strava bez sportovych modulov'}`;
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
    const modeInput = form.querySelector(`[name="app_mode"][value="${settings.mode || 'beginner'}"]`);
    if (modeInput) modeInput.checked = true;
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
      mode: form.querySelector('[name="app_mode"]:checked')?.value || 'beginner',
      sports
    };
  }

  function isBeginnerMode(settings = readSettings()) {
    return (settings.mode || 'beginner') === 'beginner';
  }

  function dailyFocus({ profile = {}, checkin = {}, training = null, diaryTotals = null } = {}) {
    const weight = Number(profile.weight) || Number(checkin.weight) || 80;
    const waterTarget = hydrationTarget(profile, training, weight);
    const water = Number(checkin.waterMl) || 0;
    const sleep = Number(checkin.sleepHours) || 0;
    const fatigue = Number(checkin.fatigue) || 0;
    const soreness = Number(checkin.soreness) || 0;
    const hasFood = diaryTotals && Number(diaryTotals.kcal) > 0;
    const actions = [];

    if (!profile.weight) actions.push('Dopln v profile aktualnu vahu. Bez nej su vypocty iba orientacne.');
    if (!hasFood) actions.push('Zapis prve jedlo. Staci nazov jedla a gramaz.');
    if (water < waterTarget * 0.5) actions.push(`Vypi vodu: ciel dnes cca ${waterTarget} ml.`);
    if (training) actions.push(`Dnes mas ${trainingLabel(training.type)}. Zacni lahsie, prvych 10 minut neprepal.`);
    if (!training) actions.push('Ak dnes netrenujes, daj aspon 20-30 min chodze alebo mobilitu.');
    if (sleep && sleep < 7) actions.push('Spanok pod 7 h: dnes uber intenzitu a nechod do zlyhania.');
    if (fatigue >= 4 || soreness >= 4) actions.push('Vysoka unava/svalovica: radsej regeneracia alebo lahka zona 2.');

    return {
      title: training ? 'Dnesny treningovy fokus' : 'Dnesny jednoduchy fokus',
      waterTarget,
      actions: actions.slice(0, 4)
    };
  }

  function trainingLabel(type) {
    return {
      fitko: 'fitko',
      bike: 'bicykel',
      run: 'beh',
      swim: 'plavanie',
      brick: 'brick',
      multi: 'multi-sport',
      race: 'sutaz'
    }[type] || 'trening';
  }

  function hydrationTarget(profile = {}, training = null, fallbackWeight = 80) {
    if (window.FlegmaWellness?.hydrationTarget) return FlegmaWellness.hydrationTarget(profile, training);
    const weight = Number(profile.weight) || Number(fallbackWeight) || 80;
    const base = weight * 35;
    const minutes = Number(training?.plannedMinutes) || 0;
    const factor = { easy: 5, steady: 7, hard: 9, race: 10 }[training?.intensity] || 0;
    return Math.round((base + (minutes * factor)) / 50) * 50;
  }

  function clampNumber(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.min(max, Math.max(min, number));
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
    return ['graphs.html', 'data.html', 'calendar.html', 'fit-import.html', 'training.html', 'gym.html'].includes(window.location.pathname.split('/').pop());
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

  function setupPersonalization() {
    renderPersonalizationSummary();
    document.querySelectorAll('[data-personalization-reset]').forEach((button) => {
      button.addEventListener('click', () => {
        if (!window.FlegmaPersonalization) return;
        window.FlegmaPersonalization.reset();
        renderPersonalizationSummary();
      });
    });
  }

  function renderPersonalizationSummary() {
    const element = document.querySelector('[data-personalization-summary]');
    if (!element || !window.FlegmaPersonalization) return;
    const summary = window.FlegmaPersonalization.summary();
    element.textContent = `Voda ${summary.hydration}, sacharidy ${summary.carbs}, kcal korekcia ${summary.kcalBias > 0 ? '+' : ''}${summary.kcalBias} kcal, regeneracia ${summary.rest}. Data ostavaju len v tomto zariadeni.`;
  }
})();
