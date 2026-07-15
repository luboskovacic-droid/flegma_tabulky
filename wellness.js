(function () {
  const CHECKIN_KEY = 'flegma_tabulky_checkins_v1';
  const DIARY_KEY = 'flegma_tabulky_diary_v1';
  const PROFILE_KEY = 'flegma_tabulky_profile_v1';
  const TRAINING_KEY = 'flegma_tabulky_trainings_v1';
  const NOTIFY_KEY = 'flegma_tabulky_notification_state_v1';
  const SOUND_KEY = 'flegma_tabulky_notification_sound_v1';
  const HOURLY_WATER_KEY = 'flegma_tabulky_hourly_water_notify_v1';
  let notificationAudioContext = null;
  let hourlyHydrationTimer = null;

  window.FlegmaWellness = {
    keys: { CHECKIN_KEY, DIARY_KEY, PROFILE_KEY, TRAINING_KEY, NOTIFY_KEY, SOUND_KEY, HOURLY_WATER_KEY },
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
    requestNotifications,
    enableNotificationSound,
    playNotificationSound,
    startHourlyHydrationReminders
  };

  function today() {
    return formatLocalDate(new Date());
  }

  function addDays(dateText, days) {
    const date = new Date(`${dateText}T00:00:00`);
    date.setDate(date.getDate() + days);
    return formatLocalDate(date);
  }

  function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
      .filter((item) => item.daysToEvent >= 0 && item.daysToEvent <= 2 && shouldUseCarbload(item.training))
      .sort((a, b) => {
        if (a.daysToEvent !== b.daysToEvent) return a.daysToEvent - b.daysToEvent;
        return priority(b.training) - priority(a.training);
      })[0] || null;
  }

  function shouldUseCarbload(training) {
    if (!training) return false;
    if (training.carbloadMode === 'on') return true;
    if (training.carbloadMode === 'off') return false;
    const minutes = Number(training?.gpx?.estimatedMinutes) || Number(training?.actual?.durationMinutes) || Number(training?.plannedMinutes) || 0;
    if (training.type === 'race' || training.intensity === 'race') return true;
    if (training.planningMode === 'adhoc') return false;
    if (training.type === 'multi' || training.type === 'brick') return minutes >= 90;
    return minutes >= 150 && (training.intensity === 'hard' || training.intensity === 'race');
  }

  function hydrationTarget(profile = loadProfile(), training = trainingForDate(today())) {
    const weight = Number(profile.weight) || 80;
    const base = weight * 35;
    const trainingMinutes = Number(training?.plannedMinutes) || 0;
    const intensityFactor = { easy: 5, steady: 7, hard: 9, race: 10 }[training?.intensity] || 0;
    const trainingExtra = trainingMinutes * intensityFactor;
    const target = Math.round((base + trainingExtra) / 50) * 50;
    return window.FlegmaPersonalization ? window.FlegmaPersonalization.adaptHydrationTarget(target) : target;
  }

  function hydrationStatus(intakeMl, targetMl) {
    if (!targetMl) return '';
    if (intakeMl >= targetMl) return 'is-ok';
    if (intakeMl >= targetMl * 0.75) return 'is-low';
    return 'is-low';
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
    if (avgLast && avgPrev && avgPrev - avgLast > avgPrev * 0.01 && (!['lose', 'waist'].includes(profile.goal) || sportsEnabled)) {
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
    enableNotificationSound();
    localStorage.setItem(HOURLY_WATER_KEY, '1');
    startHourlyHydrationReminders();
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
      playNotificationSound(message.id);
    });
    localStorage.setItem(NOTIFY_KEY, JSON.stringify(state));
  }

  function showNotification(title, body) {
    if (navigator.serviceWorker?.ready) {
      navigator.serviceWorker.ready.then((registration) => registration.showNotification(title, {
        body,
        icon: './icon.svg',
        badge: './icon.svg',
        silent: false,
        vibrate: [160, 80, 160],
        tag: `flegma-${title}`
      }));
      return;
    }
    new Notification(title, { body, icon: './icon.svg', silent: false, vibrate: [160, 80, 160] });
  }

  function startHourlyHydrationReminders() {
    if (hourlyHydrationTimer || localStorage.getItem(HOURLY_WATER_KEY) !== '1') return;
    checkHourlyHydrationReminder();
    hourlyHydrationTimer = window.setInterval(checkHourlyHydrationReminder, 60000);
  }

  function checkHourlyHydrationReminder() {
    if (localStorage.getItem(HOURLY_WATER_KEY) !== '1') return;
    const now = new Date();
    const hour = now.getHours();
    if (hour < 8 || hour > 22) return;

    const date = today();
    const profile = loadProfile();
    const training = trainingForDate(date);
    const checkin = checkinForDate(date) || {};
    const targetWater = hydrationTarget(profile, training);
    const water = Number(checkin.waterMl) || 0;
    if (!targetWater || water >= targetWater) return;

    const state = loadNotifyState();
    const key = `${date}:hourly-water:${hour}`;
    if (state[key]) return;
    state[key] = now.toISOString();
    localStorage.setItem(NOTIFY_KEY, JSON.stringify(state));

    const missing = Math.max(0, targetWater - water);
    const body = `Voda ${format(water)} / ${format(targetWater)} ml. Dopln cca 300-500 ml, chyba este ${format(missing)} ml.`;
    if ('Notification' in window && Notification.permission === 'granted') {
      showNotification('Voda - hodinova kontrola', body);
    }
    playNotificationSound('hydration');
  }

  function enableNotificationSound() {
    localStorage.setItem(SOUND_KEY, '1');
    primeNotificationAudio();
  }

  function primeNotificationAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      notificationAudioContext = notificationAudioContext || new AudioContext();
      if (notificationAudioContext.state === 'suspended') notificationAudioContext.resume();
    } catch {}
  }

  function playNotificationSound(kind = 'default') {
    if (localStorage.getItem(SOUND_KEY) !== '1') return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const context = notificationAudioContext || new AudioContext();
      notificationAudioContext = context;
      if (context.state === 'suspended') context.resume();
      const gain = context.createGain();
      const first = context.createOscillator();
      const second = context.createOscillator();
      const baseFrequency = kind === 'preworkout' ? 740 : kind === 'evening-macros' ? 520 : 660;
      first.type = 'sine';
      second.type = 'sine';
      first.frequency.value = baseFrequency;
      second.frequency.value = baseFrequency * 1.25;
      gain.gain.setValueAtTime(0.001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.42);
      first.connect(gain).connect(context.destination);
      second.connect(gain);
      first.start(context.currentTime);
      second.start(context.currentTime + 0.12);
      first.stop(context.currentTime + 0.28);
      second.stop(context.currentTime + 0.45);
    } catch {}
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
