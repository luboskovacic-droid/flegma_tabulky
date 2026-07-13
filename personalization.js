(function () {
  const KEY = 'flegma_tabulky_personalization_v1';

  window.FlegmaPersonalization = {
    key: KEY,
    read,
    save,
    summary,
    reset,
    adaptHydrationTarget,
    adaptMacroTargets,
    observeCheckin,
    observeDiaryDay
  };

  function defaults() {
    return {
      enabled: true,
      hydrationMultiplier: 1,
      carbMultiplier: 1,
      kcalBias: 0,
      restMultiplier: 1,
      observedDays: {},
      checkinDays: {},
      updatedAt: null
    };
  }

  function read() {
    try {
      return { ...defaults(), ...(JSON.parse(localStorage.getItem(KEY)) || {}) };
    } catch {
      return defaults();
    }
  }

  function save(state) {
    const next = {
      ...defaults(),
      ...state,
      hydrationMultiplier: clamp(Number(state.hydrationMultiplier) || 1, 0.92, 1.15),
      carbMultiplier: clamp(Number(state.carbMultiplier) || 1, 0.9, 1.12),
      kcalBias: clamp(Number(state.kcalBias) || 0, -180, 180),
      restMultiplier: clamp(Number(state.restMultiplier) || 1, 0.9, 1.15),
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  }

  function reset() {
    localStorage.removeItem(KEY);
    return read();
  }

  function adaptHydrationTarget(targetMl) {
    const state = read();
    if (!state.enabled) return targetMl;
    return roundTo(Math.max(1500, targetMl * state.hydrationMultiplier), 50);
  }

  function adaptMacroTargets(targets, context = {}) {
    const state = read();
    if (!state.enabled) return targets;
    const isCarbload = Boolean(context.isCarbload);
    return {
      ...targets,
      kcal: Math.max(1200, targets.kcal + state.kcalBias),
      carbs: isCarbload ? targets.carbs : Math.max(50, targets.carbs * state.carbMultiplier)
    };
  }

  function observeCheckin(date, checkin = {}, targetWater = 0) {
    if (!date || !targetWater) return read();
    const state = read();
    if (!state.enabled) return state;

    const signature = [
      Math.round(Number(checkin.waterMl) || 0),
      Math.round(Number(checkin.sleepHours) || 0),
      Math.round(Number(checkin.fatigue) || 0),
      Math.round(Number(checkin.soreness) || 0)
    ].join('|');
    if (state.checkinDays?.[date] === signature) return state;

    const water = Number(checkin.waterMl) || 0;
    const fatigue = Number(checkin.fatigue) || 0;
    const soreness = Number(checkin.soreness) || 0;
    const sleep = Number(checkin.sleepHours) || 0;

    if (water && water < targetWater * 0.7) state.hydrationMultiplier += 0.01;
    if (water > targetWater * 1.35) state.hydrationMultiplier -= 0.005;
    if ((fatigue >= 4 || soreness >= 4 || (sleep && sleep < 6.5)) && water < targetWater) {
      state.restMultiplier += 0.01;
    }
    if (fatigue <= 2 && soreness <= 2 && sleep >= 7.5) {
      state.restMultiplier -= 0.005;
    }

    state.checkinDays = { ...(state.checkinDays || {}), [date]: signature };
    trimMap(state.checkinDays, 45);
    return save(state);
  }

  function observeDiaryDay(date, totals = {}, targets = {}, context = {}) {
    if (!date || !targets.kcal) return read();
    const state = read();
    if (!state.enabled) return state;

    const signature = [
      Math.round(Number(totals.kcal) || 0),
      Math.round(Number(totals.carbs) || 0),
      Math.round(Number(totals.protein) || 0),
      Math.round(Number(targets.kcal) || 0),
      Math.round(Number(targets.carbs) || 0)
    ].join('|');
    if (state.observedDays?.[date] === signature) return state;

    const kcal = Number(totals.kcal) || 0;
    const carbs = Number(totals.carbs) || 0;
    const protein = Number(totals.protein) || 0;
    const targetKcal = Number(targets.kcal) || 0;
    const targetCarbs = Number(targets.carbs) || 0;
    const targetProtein = Number(targets.protein) || 0;
    const hasTraining = Boolean(context.training);
    const goal = context.profile?.goal || 'fit';

    if (kcal > targetKcal * 1.12 && ['lose', 'waist'].includes(goal)) state.kcalBias -= 20;
    if (kcal && kcal < targetKcal * 0.82 && hasTraining) state.kcalBias += 20;
    if (hasTraining && carbs < targetCarbs * 0.75) state.carbMultiplier += 0.008;
    if (!hasTraining && carbs > targetCarbs * 1.25 && ['lose', 'waist'].includes(goal)) state.carbMultiplier -= 0.006;
    if (protein && targetProtein && protein < targetProtein * 0.75) state.kcalBias += 5;

    state.observedDays = { ...(state.observedDays || {}), [date]: signature };
    trimMap(state.observedDays, 45);
    return save(state);
  }

  function summary() {
    const state = read();
    return {
      enabled: state.enabled,
      hydration: percent(state.hydrationMultiplier),
      carbs: percent(state.carbMultiplier),
      kcalBias: Math.round(state.kcalBias),
      rest: percent(state.restMultiplier),
      updatedAt: state.updatedAt
    };
  }

  function percent(value) {
    return `${Math.round(Number(value || 1) * 100)}%`;
  }

  function roundTo(value, step) {
    return Math.round(value / step) * step;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function trimMap(map, limit) {
    const keys = Object.keys(map).sort();
    while (keys.length > limit) {
      delete map[keys.shift()];
    }
  }
})();
