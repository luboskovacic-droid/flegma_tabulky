(function () {
  const CHECKIN_KEY = 'flegma_tabulky_checkins_v1';
  const DIARY_KEY = 'flegma_tabulky_diary_v1';
  const PROFILE_KEY = 'flegma_tabulky_profile_v1';
  const TRAINING_KEY = 'flegma_tabulky_trainings_v1';
  const NOTIFY_KEY = 'flegma_tabulky_notification_state_v1';

  window.FlegmaWellness = {
    keys: { CHECKIN_KEY, DIARY_KEY, PROFILE_KEY, TRAINING_KEY, NOTIFY_KEY },
    today,
    addDays,
    loadProfile,
    loadCheckins,
    saveCheckins,
    checkinForDate,
    upsertCheckin,
    loadDiary,
    loadTrainings,
    entriesForDate,
    sumEntries,
    trainingForDate,
    nextTrainingWithin,
    carbloadEvent,
    hydrationTarget,
    hydrationStatus,
    bodyComposition,
    weeklySummary,
    alerts,
    dailyMessages,
    notifyDueMessages,
    requestNotifications
  };

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function addDays(dateText, days) {
    const date = new Date(`${dateText}T00:00:00`);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function loadProfile() {
    try {
      return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function loadCheckins() {
    try {
      return JSON.parse(localStorage.getItem(CHECKIN_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveCheckins(checkins) {
    localStorage.setItem(CHECKIN_KEY, JSON.stringify(checkins));
  }

  function checkinForDate(date = today()) {
    return loadCheckins().find((item) => item.date === date) || null;
  }

  function upsertCheckin(date, patch) {
    const checkins = loadCheckins();
    const index = checkins.findIndex((item) => item.date === date);
    const next = {
      ...(index >= 0 ? checkins[index] : { id: crypto.randomUUID(), date }),
      ...patch,
      updatedAt: new Date().toISOString()
    };
    if (index >= 0) checkins[index] = next;
    else checkins.unshift(next);
    saveCheckins(checkins);
    return next;
  }

  function loadDiary() {
    try {
      return JSON.parse(localStorage.getItem(DIARY_KEY)) || [];
    } catch {
      return [];
    }
  }

  function loadTrainings() {
    try {
      return JSON.parse(localStorage.getItem(TRAINING_KEY)) || [];
    } catch {
      return [];
    }
  }

  function entriesForDate(date, entries = loadDiary()) {
    return entries.filter((entry) => entry.date === date);
  }

  function sumEntries(entries) {
    return entries.reduce((sum, entry) => {
      const values = entry.values || {};
      ['kcal', 'protein', 'carbs', 'fat', 'sugar', 'fiber'].forEach((field) => {
        sum[field] += Number(values[field]) || 0;
      });
      return sum;
    }, { kcal: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, fiber: 0 });
  }

  function trainingForDate(date, trainings = loadTrainings()) {
    return trainings
      .filter((training) => training.date === date)
      .sort((a, b) => priority(b) - priority(a))[0] || null;
  }

  function nextTrainingWithin(minutes, now = new Date(), trainings = loadTrainings()) {
    return trainings
      .map((training) => {
        const start = new Date(`${training.date}T${training.startTime || '09:00'}`);
        return { training, diffMinutes: (start - now) / 60000 };
      })
      .filter((item) => item.diffMinutes >= 0 && item.diffMinutes <= minutes)
      .sort((a, b) => a.diffMinutes - b.diffMinutes)[0] || null;
  }

  function carbloadEvent(date = today(), trainings = loadTrainings()) {
    const current = new Date(`${date}T00:00:00`);
    return trainings
      .map((training) => {
        const eventDate = new Date(`${training.date}T00:00:00`);
        const daysToEvent = Math.round((eventDate - current) / 86400000);
        return { training, daysToEvent };
      })
      .filter((item) => item.daysToEvent >= 0 && item.daysToEvent <= 2)
      .sort((a, b) => {
        if (a.daysToEvent !== b.daysToEvent) return a.daysToEvent - b.daysToEvent;
        return priority(b.training) - priority(a.training);
      })[0] || null;
  }

  function hydrationTarget(profile = loadProfile(), training = trainingForDate(today())) {
    const weight = Number(profile.weight) || 80;
    const base = weight * 35;
    const trainingMinutes = Number(training?.plannedMinutes) || 0;
    const intensityFactor = { easy: 5, steady: 7, hard: 9, race: 10 }[training?.intensity] || 0;
    const trainingExtra = trainingMinutes * intensityFactor;
    return Math.round((base + trainingExtra) / 50) * 50;
  }

  function hydrationStatus(intakeMl, targetMl) {
    if (!targetMl) return '';
    if (intakeMl >= targetMl) return 'is-ok';
    if (intakeMl >= targetMl * 0.75) return 'is-low';
    return 'is-over';
  }

  function bodyComposition(profile = loadProfile()) {
    const height = Number(profile.height) || 0;
    const weight = Number(profile.weight) || 0;
    const waist = Number(profile.waist) || 0;
    if (!height || !weight || !waist) {
      return { bodyFat: 0, fatMass: 0, leanMass: 0, waistHeightRatio: 0, band: '-' };
    }
    const bodyFat = clamp((profile.sex === 'female' ? 76 : 64) - (20 * (height / waist)), 4, 60);
    const fatMass = weight * (bodyFat / 100);
    const leanMass = weight - fatMass;
    const waistHeightRatio = waist / height;
    return {
      bodyFat,
      fatMass,
      leanMass,
      waistHeightRatio,
      band: waistHeightRatio >= 0.6 ? 'vysoke riziko' : waistHeightRatio >= 0.5 ? 'zvysene riziko' : 'OK'
    };
  }

  function weeklySummary(endDate = today()) {
    const checkins = loadCheckins();
    const diary = loadDiary();
    const trainings = loadTrainings();
    const dates = Array.from({ length: 7 }, (_, index) => addDays(endDate, index - 6));
    const weekCheckins = checkins.filter((item) => dates.includes(item.date));
    const weights = weekCheckins.map((item) => Number(item.weight)).filter(Boolean);
    const waists = weekCheckins.map((item) => Number(item.waist)).filter(Boolean);
    const sleep = weekCheckins.map((item) => Number(item.sleepHours)).filter(Boolean);
    const kcalDays = dates.map((date) => sumEntries(entriesForDate(date, diary)).kcal).filter(Boolean);
    const weekTrainings = trainings.filter((training) => dates.includes(training.date));
    const tss = weekTrainings.reduce((sum, training) => sum + estimateTss(training), 0);
    return {
      avgWeight: average(weights),
      avgWaist: average(waists),
      avgSleep: average(sleep),
      avgKcal: average(kcalDays),
      tss,
      checkinDays: weekCheckins.length,
      trainingDays: weekTrainings.length
    };
  }

  function alerts(date = today()) {
    const profile = loadProfile();
    const checkins = loadCheckins();
    const current = checkinForDate(date);
    const summary = weeklySummary(date);
    const messages = [];
    const todayTraining = trainingForDate(date);
    const todayHydration = hydrationTarget(profile, todayTraining);

    const waistNow = Number(current?.waist) || 0;
    const before14 = checkins.find((item) => item.date === addDays(date, -14));
    if (waistNow && Number(before14?.waist) && waistNow - Number(before14.waist) >= 2) {
      messages.push({ level: 'danger', text: 'Obvod pasa stupol o 2 cm alebo viac za 14 dni. Skontroluj kcal, alkohol/sladke a regeneraciu.' });
    }

    const last7 = checkins.filter((item) => item.date >= addDays(date, -6) && item.date <= date).map((item) => Number(item.weight)).filter(Boolean);
    const prev7 = checkins.filter((item) => item.date >= addDays(date, -13) && item.date <= addDays(date, -7)).map((item) => Number(item.weight)).filter(Boolean);
    const avgLast = average(last7);
    const avgPrev = average(prev7);
    const sportsEnabled = loadTrainings().some((training) => training.date >= addDays(date, -6) && training.date <= date);
    if (avgLast && avgPrev && avgPrev - avgLast > avgPrev * 0.01 && (profile.goal !== 'lose' || sportsEnabled)) {
      messages.push({ level: 'warn', text: 'Hmotnost klesla o viac ako 1 % za tyzden. Pri treningu to moze znamenat nizky prijem energie.' });
    }

    const lowHydrationDays = [0, -1, -2].filter((offset) => {
      const day = addDays(date, offset);
      const checkin = checkins.find((item) => item.date === day);
      const target = hydrationTarget(profile, trainingForDate(day));
      return checkin && Number(checkin.waterMl) < target * 0.75;
    }).length;
    if (lowHydrationDays === 3) {
      messages.push({ level: 'warn', text: 'Tri dni po sebe nizka hydratacia. Zvys vodu a pri treningu dopln aj sodik.' });
    }

    if (summary.avgSleep && summary.avgSleep < 7) {
      messages.push({ level: 'warn', text: 'Priemerny spanok je pod 7 h. Zniz intenzitu alebo skrat tazky trening.' });
    }

    if (current && Number(current.waterMl) < todayHydration * 0.75) {
      messages.push({ level: 'warn', text: `Dnes chyba voda. Ciel je cca ${format(todayHydration)} ml.` });
    }

    return messages;
  }

  function dailyMessages(date = today()) {
    const profile = loadProfile();
    const training = trainingForDate(date);
    const carbload = carbloadEvent(date);
    const nextTraining = nextTrainingWithin(30);
    const checkin = checkinForDate(date);
    const targetWater = hydrationTarget(profile, training);
    const messages = [
      { id: 'hydration', title: 'Hydratacia', text: `Dnes ciel cca ${format(targetWater)} ml vody${training ? ' vratane treningu.' : '.'}` }
    ];

    if (carbload && carbload.daysToEvent === 1) {
      messages.push({ id: 'carbload-t1', title: 'Carbload T-1', text: 'Dnes je T-1. Zvys sacharidy, tuky a vlakninu drz nizsie.' });
    }
    if (nextTraining) {
      messages.push({ id: 'preworkout', title: 'Trening za 30 min', text: 'Zjedz male predtreningove jedlo: lahko travitelne sacharidy, malo tuku a vlakniny.' });
    }
    if (training && checkin?.trainingDone) {
      messages.push({ id: 'postworkout', title: 'Po treningu', text: 'Daj regeneracny napoj alebo rychle jedlo: sacharidy + 25-35 g proteinu.' });
    }
    messages.push({ id: 'evening-macros', title: 'Vecerna kontrola', text: 'Skontroluj makra, vodu a ci netreba doplnit bielkoviny alebo sacharidy.' });
    return messages;
  }

  async function requestNotifications() {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    return Notification.requestPermission();
  }

  function notifyDueMessages(date = today()) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const state = loadNotifyState();
    const hour = new Date().getHours();
    const due = dailyMessages(date).filter((message) => {
      if (message.id === 'hydration') return hour >= 8;
      if (message.id === 'carbload-t1') return hour >= 8;
      if (message.id === 'preworkout') return true;
      if (message.id === 'postworkout') return true;
      if (message.id === 'evening-macros') return hour >= 19;
      return false;
    });
    due.forEach((message) => {
      const key = `${date}:${message.id}`;
      if (state[key]) return;
      state[key] = new Date().toISOString();
      showNotification(message.title, message.text);
    });
    localStorage.setItem(NOTIFY_KEY, JSON.stringify(state));
  }

  function showNotification(title, body) {
    if (navigator.serviceWorker?.ready) {
      navigator.serviceWorker.ready.then((registration) => registration.showNotification(title, {
        body,
        icon: './icon.svg',
        badge: './icon.svg',
        tag: `flegma-${title}`
      }));
      return;
    }
    new Notification(title, { body, icon: './icon.svg' });
  }

  function loadNotifyState() {
    try {
      return JSON.parse(localStorage.getItem(NOTIFY_KEY)) || {};
    } catch {
      return {};
    }
  }

  function estimateTss(training) {
    const minutes = Number(training?.actualMinutes || training?.plannedMinutes) || 0;
    const factor = { easy: 0.45, steady: 0.65, hard: 0.85, race: 1.0 }[training?.intensity] || 0.6;
    return Math.round((minutes / 60) * 100 * factor);
  }

  function priority(training) {
    if (training?.type === 'race') return 4;
    if (training?.type === 'multi' || training?.type === 'brick') return 3;
    if (training?.intensity === 'race' || training?.intensity === 'hard') return 2;
    return 1;
  }

  function average(values) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function format(value) {
    return Number(value).toLocaleString('sk-SK', { maximumFractionDigits: 0 });
  }
})();
