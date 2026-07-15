const FOOD_STORAGE_KEY = 'flegma_tabulky_foods_v1';
const DIARY_STORAGE_KEY = 'flegma_tabulky_diary_v1';
const PROFILE_STORAGE_KEY = 'flegma_tabulky_profile_v1';
const TRAINING_STORAGE_KEY = 'flegma_tabulky_trainings_v1';
const RECOMMENDATION_STORAGE_KEY = 'flegma_tabulky_recommendations_v1';
const DEFAULT_FOODS = [
  { id: 'seed-kuracie-prsia', name: 'Kuracie prsia', kcal: 110, protein: 23, carbs: 0, fat: 2, sugar: 0, fiber: 0 },
  { id: 'seed-vajce', name: 'Vajce', kcal: 143, protein: 13, carbs: 1.1, fat: 9.5, sugar: 1.1, fiber: 0 },
  { id: 'seed-ryza-varena', name: 'Ryza varena', kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, sugar: 0.1, fiber: 0.4 },
  { id: 'seed-zemiaky-varene', name: 'Zemiaky varene', kcal: 87, protein: 1.9, carbs: 20, fat: 0.1, sugar: 0.9, fiber: 1.8 },
  { id: 'seed-cestoviny-varene', name: 'Cestoviny varene', kcal: 158, protein: 5.8, carbs: 31, fat: 0.9, sugar: 0.6, fiber: 1.8 },
  { id: 'seed-ovsene-vlocky', name: 'Ovsene vlocky', kcal: 372, protein: 13.5, carbs: 58.7, fat: 7, sugar: 1, fiber: 10 },
  { id: 'seed-banany', name: 'Banan', kcal: 89, protein: 1.1, carbs: 22.8, fat: 0.3, sugar: 12.2, fiber: 2.6 },
  { id: 'seed-jablko', name: 'Jablko', kcal: 52, protein: 0.3, carbs: 13.8, fat: 0.2, sugar: 10.4, fiber: 2.4 },
  { id: 'seed-tvaroh', name: 'Tvaroh jemny nizkotucny', kcal: 68, protein: 12, carbs: 3.8, fat: 0.5, sugar: 3.8, fiber: 0 },
  { id: 'seed-grecky-jogurt', name: 'Grecky jogurt biely', kcal: 97, protein: 9, carbs: 3.6, fat: 5, sugar: 3.6, fiber: 0 },
  { id: 'seed-chlieb', name: 'Chlieb celozrnny', kcal: 247, protein: 8.8, carbs: 41, fat: 3.5, sugar: 4.8, fiber: 7 },
  { id: 'seed-sunka', name: 'Sunka bravcova', kcal: 145, protein: 20, carbs: 1.5, fat: 6, sugar: 1, fiber: 0 },
  { id: 'seed-syr-eidam', name: 'Syr Eidam 30%', kcal: 263, protein: 27, carbs: 1.5, fat: 16, sugar: 1.5, fiber: 0 },
  { id: 'seed-losos', name: 'Losos', kcal: 208, protein: 20, carbs: 0, fat: 13, sugar: 0, fiber: 0 },
  { id: 'seed-olivovy-olej', name: 'Olivovy olej', kcal: 884, protein: 0, carbs: 0, fat: 100, sugar: 0, fiber: 0 }
];
const ALL_DEFAULT_FOODS = [...DEFAULT_FOODS, ...(window.FLEGMA_SLOVAK_FOODS || [])];
const meals = [
  { id: 'ranajky', label: 'Ranajky' },
  { id: 'desiata', label: 'Desiata' },
  { id: 'obed', label: 'Obed' },
  { id: 'olovrant', label: 'Olovrant' },
  { id: 'vecera', label: 'Vecera' },
  { id: 'snack', label: 'Snack' }
];

const state = {
  foods: loadFoods(),
  entries: loadEntries(),
  trainings: loadTrainings(),
  recommendations: loadRecommendations(),
  date: today(),
  activeMeal: 'ranajky'
};

const dateInput = document.getElementById('dateInput');
const entryForm = document.getElementById('entryForm');
const foodInput = document.getElementById('foodInput');
const foodOptions = document.getElementById('foodOptions');
const gramsInput = document.getElementById('gramsInput');
const timeInput = document.getElementById('timeInput');
const mealInput = document.getElementById('mealInput');
const summary = document.getElementById('summary');
const macroCheckPanel = document.getElementById('macroCheckPanel');
const hydrationPanel = document.getElementById('hydrationPanel');
const watchPanel = document.getElementById('watchPanel');
const fastingPanel = document.getElementById('fastingPanel');
const coachPanel = document.getElementById('coachPanel');
const mealTabs = document.getElementById('mealTabs');
const entryList = document.getElementById('entryList');
const emptyState = document.getElementById('emptyState');
const foodWarning = document.getElementById('foodWarning');
const notice = document.getElementById('notice');

if (dateInput) dateInput.value = state.date;
if (mealInput) mealInput.value = state.activeMeal;
if (timeInput) timeInput.value = currentTimeValue();

dateInput?.addEventListener('change', () => {
  state.date = dateInput.value || today();
  render();
});

mealInput?.addEventListener('change', () => {
  state.activeMeal = mealInput.value;
  render();
});

entryForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  addEntry();
});

render();

function addEntry() {
  const food = findFood(foodInput?.value || '');
  const grams = readNumber(gramsInput?.value || 0);

  if (!food) {
    showNotice('Vyber jedlo z databazy.');
    return;
  }

  if (grams <= 0) {
    showNotice('Zadaj gramaz vacsiu ako 0.');
    return;
  }

  state.entries.unshift({
    id: crypto.randomUUID(),
    date: state.date,
    meal: mealInput?.value || state.activeMeal,
    time: normalizedTime(timeInput?.value) || currentTimeValue(),
    foodId: food.id,
    name: food.name,
    grams,
    values: calculateValues(food, grams),
    createdAt: new Date().toISOString()
  });

  saveEntries();
  if (foodInput) foodInput.value = '';
  if (gramsInput) gramsInput.value = '';
  if (timeInput) timeInput.value = currentTimeValue();
  state.activeMeal = mealInput?.value || state.activeMeal;
  showNotice('Jedlo bolo zapisane.');
  render();
}

function deleteEntry(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) return;
  if (!confirm(`Vymazat zapis "${entry.name}"?`)) return;

  state.entries = state.entries.filter((item) => item.id !== id);
  saveEntries();
  showNotice('Zapis bol vymazany.');
  render();
}

function render() {
  state.trainings = loadTrainings();
  state.recommendations = loadRecommendations();
  const dayEntries = entriesForDate(state.date);
  const activeEntries = dayEntries.filter((entry) => entry.meal === state.activeMeal);
  const totals = sumEntries(dayEntries);
  const profile = loadProfile();
  const dayTraining = findTrainingForDate(state.date);
  const event = findCarbloadEvent(state.date);
  const coach = calculateCoach(profile, totals, event, dayTraining);
  const checkin = window.FlegmaWellness ? FlegmaWellness.checkinForDate(state.date) : null;
  const targetWater = window.FlegmaWellness ? FlegmaWellness.hydrationTarget(profile, dayTraining) : Math.round((profile.weight || 80) * 35);
  const waterMl = Number(checkin?.waterMl) || 0;
  const watch = watchSummary(checkin, profile);
  coach.targetKcal += watch.totalKcal;
  reconcileCoachMacros(coach, profile, dayTraining);
  coach.missingKcal = Math.max(0, coach.targetKcal - totals.kcal);
  coach.missingCarbs = Math.max(0, coach.targetCarbs - totals.carbs);
  coach.missingProtein = Math.max(0, coach.targetProtein - totals.protein);
  coach.missingFat = Math.max(0, coach.targetFat - totals.fat);
  coach.remainingSugar = Math.max(0, coach.sugarLimit - totals.sugar);
  const mealPlan = buildMealPlan(coach, dayEntries);
  observePersonalization(state.date, totals, coach, profile, dayTraining, checkin, targetWater);

  if (foodOptions) foodOptions.innerHTML = state.foods
    .map((food) => `<option value="${escapeHtml(food.name)}"></option>`)
    .join('');

  if (foodWarning) foodWarning.hidden = Boolean(state.foods.length);
  if (summary) summary.innerHTML = `
    ${macroSummaryItem('Kcal', totals.kcal, coach.targetKcal, coach.missingKcal, 'kcal', macroStatus(totals.kcal, coach.targetKcal, 'target'))}
    ${macroSummaryItem('Bielkoviny', totals.protein, coach.targetProtein, coach.missingProtein, 'g', macroStatus(totals.protein, coach.targetProtein, 'target'))}
    ${macroSummaryItem('Sacharidy', totals.carbs, coach.targetCarbs, coach.missingCarbs, 'g', macroStatus(totals.carbs, coach.targetCarbs, 'target'))}
    ${macroSummaryItem('Tuky', totals.fat, coach.targetFat, coach.missingFat, 'g', macroStatus(totals.fat, coach.targetFat, 'target'))}
    ${sugarMacroSummaryItem(totals, coach)}
    ${macroSummaryItem('Vlaknina', totals.fiber, coach.fiberTarget, coach.missingFiber, 'g', macroStatus(totals.fiber, coach.fiberTarget, 'target'))}
  `;

  if (macroCheckPanel) macroCheckPanel.innerHTML = macroCheckPanelHtml(coach);

  if (hydrationPanel) hydrationPanel.innerHTML = `
    <div class="coach-head">
      <h2>Hydratacia</h2>
      <span class="coach-badge">${formatNumber(waterMl)} / ${formatNumber(targetWater)} ml</span>
    </div>
    <div class="coach-grid">
      ${coachItem('Voda ciel', `${formatNumber(targetWater)} ml`, '')}
      ${coachItem('Voda vypita', `${formatNumber(waterMl)} ml`, hydrationStatusClass(waterMl, targetWater))}
      ${coachItem('Este doplnit', `${formatNumber(Math.max(0, targetWater - waterMl))} ml`, waterMl >= targetWater ? 'is-ok' : 'is-low')}
    </div>
    <form class="inline-water" onsubmit="saveWater(event)">
      <label>
        Dnes vypite spolu ml
        <input id="waterInput" type="number" min="0" max="10000" step="50" inputmode="numeric" value="${waterMl || ''}">
      </label>
      <label>
        Rychlo pridat
        <select id="waterAddSelect">
          <option value="1">1 ml</option>
          <option value="100">100 ml</option>
          <option value="300">300 ml</option>
          <option value="750">750 ml</option>
        </select>
      </label>
      <button type="button" class="secondary" onclick="addSelectedWater()">Pridat vybrane ml</button>
      <button type="submit">Ulozit vodu</button>
    </form>
  `;

  if (watchPanel) watchPanel.innerHTML = `
    <div class="coach-head">
      <h2>Smart watch / mimo appku</h2>
      <span class="coach-badge">+${formatNumber(watch.totalKcal)} kcal</span>
    </div>
    <div class="coach-grid">
      ${coachItem('Manual kcal', `${formatNumber(watch.manualKcal)} kcal`, watch.manualKcal ? 'is-ok' : '')}
      ${coachItem('Kroky', `${formatNumber(watch.steps)}`, watch.steps >= 8000 ? 'is-ok' : watch.steps >= 4000 ? 'is-low' : '')}
      ${coachItem('Odhad z krokov', `${formatNumber(watch.stepKcal)} kcal`, watch.stepKcal ? 'is-ok' : '')}
      ${coachItem('Novy kcal ciel', `${formatNumber(coach.targetKcal)} kcal`, '')}
    </div>
    <form class="inline-water" onsubmit="saveWatchData(event)">
      <div class="grid-2">
        <label>
          Manualne aktivne kcal
          <input id="watchKcalInput" type="number" min="0" max="10000" step="1" inputmode="numeric" value="${watch.manualKcal || ''}">
        </label>
        <label>
          Kroky
          <input id="stepsInput" type="number" min="0" max="100000" step="1" inputmode="numeric" value="${watch.steps || ''}">
        </label>
      </div>
      <button type="submit">Prepocitat den</button>
    </form>
  `;

  if (fastingPanel) fastingPanel.innerHTML = fastingPanelHtml(dayEntries);

  if (coachPanel) coachPanel.innerHTML = `
    <div class="coach-head">
      <h2>AI trener</h2>
      <span class="coach-badge">${coach.mode}</span>
    </div>
    ${beginnerCoachHtml(coach, totals, waterMl, targetWater)}
    ${sugarCoachHtml(dayEntries, totals, coach, dayTraining)}
    <p class="coach-text">${coach.message}</p>
    <div class="meal-plan">
      ${mealPlan.map((meal) => `
        <div class="meal-plan-card">
          <strong>${meal.title}</strong>
          <span class="muted">${meal.text}</span>
        </div>
      `).join('')}
    </div>
  `;

  if (mealTabs) mealTabs.innerHTML = meals.map((meal) => {
    const mealTotal = sumEntries(dayEntries.filter((entry) => entry.meal === meal.id));
    return `
      <button type="button" class="meal-tab ${meal.id === state.activeMeal ? 'is-active' : ''}" onclick="setActiveMeal('${meal.id}')">
        <span>${meal.label}</span>
        <small>${formatNumber(mealTotal.kcal)} kcal</small>
      </button>
    `;
  }).join('');

  if (entryList) entryList.innerHTML = activeEntries.map((entry) => {
    return `
      <article class="entry-card">
        <div class="entry-head">
          <div>
            <h3 class="entry-name">${escapeHtml(entry.name)}</h3>
            <div class="entry-meta">${entryTimeLabel(entry)} · ${formatNumber(entry.grams)} g</div>
          </div>
          <button type="button" class="danger" onclick="deleteEntry('${entry.id}')">Vymazat</button>
        </div>
        <div class="macro-row">
          ${macroItem('kcal', formatNumber(entry.values.kcal))}
          ${macroItem('B', `${formatNumber(entry.values.protein)} g`)}
          ${macroItem('S', `${formatNumber(entry.values.carbs)} g`)}
          ${macroItem('T', `${formatNumber(entry.values.fat)} g`)}
          ${macroItem('Cukry', `${formatNumber(entry.values.sugar)} g`)}
          ${macroItem('Glu', `${formatNumber(entry.values.glucose || 0)} g`)}
          ${macroItem('Fru', `${formatNumber(entry.values.fructose || 0)} g`)}
          ${macroItem('Vl.', `${formatNumber(entry.values.fiber)} g`)}
        </div>
      </article>
    `;
  }).join('');

  if (emptyState) emptyState.hidden = Boolean(activeEntries.length);
  if (entryList) entryList.hidden = !activeEntries.length;
}

function setActiveMeal(meal) {
  state.activeMeal = meal;
  if (mealInput) mealInput.value = meal;
  render();
}

function calculateValues(food, grams) {
  const ratio = grams / 100;
  const split = sugarSplitForFood(food);
  return {
    kcal: food.kcal * ratio,
    protein: food.protein * ratio,
    carbs: food.carbs * ratio,
    fat: food.fat * ratio,
    sugar: food.sugar * ratio,
    glucose: split.glucose * ratio,
    fructose: split.fructose * ratio,
    fiber: food.fiber * ratio
  };
}

function beginnerCoachHtml(coach, totals, waterMl, targetWater) {
  const settings = window.FlegmaSettings ? FlegmaSettings.read() : { mode: 'beginner' };
  if (window.FlegmaSettings && !FlegmaSettings.isBeginnerMode(settings)) return '';
  const steps = beginnerCoachSteps(coach, totals, waterMl, targetWater);
  return `
    <div class="beginner-card">
      <h3>Najblizsi rozumny krok</h3>
      <ol>${steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
    </div>
  `;
}

function beginnerCoachSteps(coach, totals, waterMl, targetWater) {
  const steps = [];
  if (waterMl < targetWater * 0.75) steps.push(`Dopln vodu: teraz vypi 300-500 ml, dnes ciel cca ${formatNumber(targetWater)} ml.`);
  if (totals.kcal <= 0) steps.push('Zapis prve jedlo. Nemusi byt dokonale, staci gramaz a realny nazov.');
  if (coach.missingProtein > 20) steps.push(`Dalsie jedlo nech ma protein: cielovo dopln este cca ${formatNumber(coach.missingProtein)} g bielkovin.`);
  if (coach.missingCarbs > 40) steps.push(`Chybaju sacharidy: dopln este cca ${formatNumber(coach.missingCarbs)} g, napr. ryza, zemiaky, pecivo, ovsene vlocky alebo cestoviny.`);
  if (coach.missingFat > 10 && totals.fat < coach.fatLimit) steps.push(`Chyba tuk: dopln cca ${formatNumber(coach.missingFat)} g, napr. olivovy olej, orechy, vajce alebo losos.`);
  if (coach.remainingSugar > 8 && coach.missingCarbs > 20) steps.push(`Cukry mozes este doplnit max cca ${formatNumber(coach.remainingSugar)} g; pri carbloade ich pouzi hlavne v tekutom sacharidovom napoji.`);
  if (coach.missingFiber > 6) steps.push(`Chyba vlaknina: dopln cca ${formatNumber(coach.missingFiber)} g zeleninou, ovocim, strukovinou alebo ovsenymi vlockami.`);
  if (totals.fat > coach.fatLimit) steps.push('Tuky su vysoko. Dalsie jedlo daj nizkotucne: tvaroh, jogurt, ryza, zemiaky, chude maso.');
  if (totals.sugar > coach.sugarLimit) steps.push('Cukry su nad limitom. Dalsie sacharidy daj skor skrobove, nie sladke.');
  if (!steps.length) steps.push('Dnes ides dobre. Drz vodu, neprejedaj sa vecer a zapis posledne jedlo.');
  return steps.slice(0, 5);
}

function sugarCoachHtml(dayEntries, totals, coach, training) {
  const targets = sugarSplitTargets(coach);
  const rows = sugarCoachRows(dayEntries);
  const totalSugarKcal = (totals.glucose + totals.fructose) * 4;
  const balance = sugarRatioText(totals.fructose, totals.glucose);
  const quality = sugarRatioQuality(totals, targets);
  const warning = sugarWarningHtml(rows, totals, targets);
  const timing = sugarTimingHtml(dayEntries, training, coach);
  const list = rows.length
    ? rows.map((row) => `
        <li class="${row.quality.className}">
          <strong>${escapeHtml(row.name)}</strong>
          <span>${escapeHtml(row.mealLabel)} · FR ${formatNumber(row.fructose * 4)} kcal · GLU ${formatNumber(row.glucose * 4)} kcal · pomer ${row.ratioText}</span>
          <em>${row.quality.label}</em>
        </li>
      `).join('')
    : '<li><strong>Ziadny zdroj cukrov</strong><span>Po zapise ovocia, dzusu alebo sladkeho jedla tu bude rozpis FR/GLU.</span></li>';

  return `
    <div class="sugar-coach">
      <div class="coach-head">
        <h3>Cukry v jedlach</h3>
        <span class="coach-badge">${formatNumber(totalSugarKcal)} kcal cukrov</span>
      </div>
      <div class="sugar-quality ${quality.className}">
        <strong>${quality.label}</strong>
        <span>${quality.text}</span>
      </div>
      ${warning}
      <div class="coach-grid">
        ${coachItem('Fruktoza', `${formatNumber(totals.fructose)} / ${formatNumber(targets.fructose)} g`, macroStatus(totals.fructose, targets.fructose, 'limit'))}
        ${coachItem('Glukoza', `${formatNumber(totals.glucose)} / ${formatNumber(targets.glucose)} g`, macroStatus(totals.glucose, targets.glucose, 'limit'))}
        ${coachItem('Pomer FR/GLU', balance, '')}
        ${coachItem('Cukry spolu', `${formatNumber(totals.sugar)} / ${formatNumber(coach.sugarLimit)} g`, macroStatus(totals.sugar, coach.sugarLimit, 'limit'))}
      </div>
      <ul class="sugar-food-list">${list}</ul>
      ${timing}
    </div>
  `;
}

function sugarCoachRows(dayEntries) {
  const groups = new Map();
  dayEntries.forEach((entry) => {
    const values = normalizeEntryValues(entry.values || {});
    const sugar = Number(values.sugar) || 0;
    if (sugar <= 0.05) return;
    const key = (entry.foodId || entry.name || '').toString().toLowerCase();
    const group = groups.get(key) || {
      name: entry.name || 'Jedlo',
      sugar: 0,
      glucose: 0,
      fructose: 0,
      count: 0,
      meals: new Map()
    };
    group.sugar += sugar;
    group.glucose += Number(values.glucose) || 0;
    group.fructose += Number(values.fructose) || 0;
    group.count += 1;
    const meal = entry.meal || 'snack';
    group.meals.set(meal, (group.meals.get(meal) || 0) + 1);
    groups.set(key, group);
  });

  return [...groups.values()]
    .map((group) => {
      const mostCommonMeal = [...group.meals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'snack';
      return {
        ...group,
        mealLabel: mealLabel(mostCommonMeal),
        ratioText: sugarRatioText(group.fructose, group.glucose),
        quality: sugarRatioQuality(group, { fructose: group.sugar * 0.45, glucose: group.sugar * 0.55 })
      };
    })
    .sort((a, b) => b.sugar - a.sugar)
    .slice(0, 6);
}

function sugarRatioText(fructose, glucose) {
  const total = Math.max(0, fructose + glucose);
  if (!total) return '0/0';
  const fructosePct = Math.round((fructose / total) * 100);
  return `${fructosePct}/${100 - fructosePct}`;
}

function sugarRatioQuality(values, targets) {
  const fructose = Math.max(0, Number(values.fructose) || 0);
  const glucose = Math.max(0, Number(values.glucose) || 0);
  const total = fructose + glucose;
  if (!total) return { className: 'is-ok', label: 'Ideal', text: 'Zatial bez cukrovej zataze.' };
  const fructoseShare = fructose / total;
  const fructoseOver = fructose - Math.max(0, Number(targets.fructose) || 0);
  const glucoseOver = glucose - Math.max(0, Number(targets.glucose) || 0);

  if (fructoseOver > 12 || glucoseOver > 18 || fructoseShare > 0.65 || fructoseShare < 0.25) {
    return { className: 'is-over', label: 'Cervena', text: 'Velka odchylka FR/GLU alebo prekroceny ciel.' };
  }
  if (fructoseOver > 4 || glucoseOver > 8 || fructoseShare > 0.56 || fructoseShare < 0.35) {
    return { className: 'is-low', label: 'Oranzova', text: 'Mierna odchylka, dalsie sacharidy daj skor skrobove.' };
  }
  return { className: 'is-ok', label: 'Zelena', text: 'Pomer FR/GLU je v rozumnom pasme.' };
}

function sugarWarningHtml(rows, totals, targets) {
  const fructoseOver = Math.max(0, totals.fructose - targets.fructose);
  const glucoseOver = Math.max(0, totals.glucose - targets.glucose);
  if (fructoseOver <= 0 && glucoseOver <= 0) return '';

  const source = rows.find((row) => fructoseOver >= glucoseOver ? row.fructose >= row.glucose : row.glucose > row.fructose) || rows[0];
  const sourceName = source?.name || 'sladke jedlo';
  const overText = fructoseOver >= glucoseOver
    ? `Fruktoza je o ${formatNumber(fructoseOver)} g nad cielom.`
    : `Glukoza je o ${formatNumber(glucoseOver)} g nad cielom.`;
  const replacement = replacementText(source);

  return `
    <div class="sugar-alert">
      <strong>Automaticke varovanie</strong>
      <span>Pridal si dalsie ${escapeHtml(sourceName)}. ${overText}</span>
      <span>${replacement}</span>
    </div>
  `;
}

function replacementText(source) {
  const sugar = Math.max(0, Number(source?.sugar) || 0);
  if (!source || sugar <= 0) return 'Odporucana nahrada: dalsie sacharidy dopln ryzou, zemiakmi alebo cestovinami.';
  const riceGrams = gramsForCarbs(sugar, 28);
  return `Odporucana nahrada: namiesto ${escapeHtml(source.name)} pridaj cca ${riceGrams} g varenej ryze.`;
}

function sugarTimingHtml(dayEntries, training, coach) {
  if (!training) return `
    <div class="sugar-timing">
      <h4>Pred / pocas / po vykone</h4>
      <div class="sugar-timing-row"><strong>Bez treningu</strong><span>Dnes nie je vykon v kalendari, cukry drz hlavne okolo aktivneho dna a mimo sladkych spiciek.</span></div>
    </div>
  `;

  const rows = sugarTimingRows(dayEntries, training, coach);
  return `
    <div class="sugar-timing">
      <h4>Pred / pocas / po vykone</h4>
      ${rows.map((row) => `
        <div class="sugar-timing-row ${row.status}">
          <strong>${row.label}</strong>
          <span>${formatNumber(row.sugar)} / ${formatNumber(row.target)} g cukrov · FR ${formatNumber(row.fructose * 4)} kcal · GLU ${formatNumber(row.glucose * 4)} kcal</span>
        </div>
      `).join('')}
    </div>
  `;
}

function sugarTimingRows(dayEntries, training, coach) {
  const start = minutesFromTime(training.startTime || '09:00') || (9 * 60);
  const duration = Math.max(30, effectiveTrainingMinutes(training) || Number(training.plannedMinutes) || 60);
  const end = start + duration;
  const targets = sugarTimingTargets(training, coach);
  const buckets = {
    before: { label: 'Pred vykonom', target: targets.before, sugar: 0, glucose: 0, fructose: 0 },
    during: { label: 'Pocas vykonu', target: targets.during, sugar: 0, glucose: 0, fructose: 0 },
    after: { label: 'Po vykone', target: targets.after, sugar: 0, glucose: 0, fructose: 0 }
  };

  dayEntries.forEach((entry) => {
    const minutes = entryMinutes(entry);
    if (!Number.isFinite(minutes)) return;
    const values = normalizeEntryValues(entry.values || {});
    let bucket = 'before';
    if (minutes >= start && minutes <= end) bucket = 'during';
    if (minutes > end) bucket = 'after';
    buckets[bucket].sugar += Number(values.sugar) || 0;
    buckets[bucket].glucose += Number(values.glucose) || 0;
    buckets[bucket].fructose += Number(values.fructose) || 0;
  });

  return Object.values(buckets).map((bucket) => ({
    ...bucket,
    status: macroStatus(bucket.sugar, bucket.target, 'limit')
  }));
}

function sugarTimingTargets(training, coach) {
  const hours = Math.max(0.5, (effectiveTrainingMinutes(training) || Number(training?.plannedMinutes) || 60) / 60);
  const during = Math.min(coach.sugarLimit * 0.45, Math.max(12, (Number(training?.carbsPerHour) || 45) * hours * 0.45));
  const before = Math.max(8, coach.sugarLimit * 0.25);
  const after = Math.max(8, coach.sugarLimit - before - during);
  return { before, during, after };
}

function mealLabel(mealId) {
  return meals.find((meal) => meal.id === mealId)?.label || mealId || 'Jedlo';
}

function entriesForDate(date) {
  return sortEntriesByTime(state.entries.filter((entry) => entry.date === date));
}

function sumEntries(entries) {
  return entries.reduce((sum, entry) => {
    sum.kcal += entry.values.kcal;
    sum.protein += entry.values.protein;
    sum.carbs += entry.values.carbs;
    sum.fat += entry.values.fat;
    sum.sugar += entry.values.sugar;
    sum.glucose += Number(entry.values.glucose) || 0;
    sum.fructose += Number(entry.values.fructose) || 0;
    sum.fiber += entry.values.fiber;
    return sum;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, glucose: 0, fructose: 0, fiber: 0 });
}

function sugarMacroSummaryItem(totals, coach) {
  const targets = sugarSplitTargets(coach);
  const status = macroStatus(totals.sugar, coach.sugarLimit, 'limit');
  return `
    <div class="summary-item sugar-summary is-wide ${status}">
      <span class="summary-label">Cukry</span>
      <div class="macro-combined">
        <strong class="summary-value">${formatWithUnit(totals.sugar, 'g')}</strong>
        <div class="macro-combined-row">
          <span><small>Zjedene</small>${formatWithUnit(totals.sugar, 'g')} / ${formatNumber(totals.sugar * 4)} kcal</span>
          <span><small>Ciel</small>${formatWithUnit(coach.sugarLimit, 'g')} / ${formatNumber(coach.sugarLimit * 4)} kcal</span>
          <span><small>Este max</small>${formatWithUnit(coach.remainingSugar, 'g')} / ${formatNumber(coach.remainingSugar * 4)} kcal</span>
        </div>
        <div class="sugar-split-row">
          ${sugarSplitMini('Glukoza', totals.glucose, targets.glucose)}
          ${sugarSplitMini('Fruktoza', totals.fructose, targets.fructose)}
        </div>
      </div>
    </div>
  `;
}

function sugarSplitMini(label, used, target) {
  const remaining = Math.max(0, target - used);
  const status = used > target ? 'is-over' : used >= target * 0.8 ? 'is-low' : 'is-ok';
  return `
    <span class="${status}">
      <small>${label}</small>
      <b>${formatNumber(used)} / ${formatNumber(target)} g</b>
      <em>${formatNumber(used * 4)} / ${formatNumber(target * 4)} kcal · ostava ${formatNumber(remaining)} g</em>
    </span>
  `;
}

function sugarSplitTargets(coach) {
  const limit = Math.max(0, Number(coach.sugarLimit) || 0);
  const fructose = Math.min(coach.mode === 'carbload' ? 45 : 35, limit * (coach.mode === 'carbload' ? 0.35 : 0.45));
  return {
    fructose,
    glucose: Math.max(0, limit - fructose)
  };
}

function sugarSplitForFood(food) {
  const sugar = Math.max(0, Number(food.sugar) || 0);
  const glucose = Math.max(0, Number(food.glucose) || 0);
  const fructose = Math.max(0, Number(food.fructose) || 0);
  if (glucose || fructose || !sugar) return { glucose: Math.min(sugar, glucose), fructose: Math.min(sugar, fructose) };
  return { glucose: sugar / 2, fructose: sugar / 2 };
}

function sortEntriesByTime(entries) {
  return [...entries].sort((a, b) => entryMinutes(a) - entryMinutes(b));
}

function entryTimeLabel(entry) {
  return normalizedTime(entry.time) || timeFromIso(entry.createdAt) || '--:--';
}

function entryMinutes(entry) {
  const time = entryTimeLabel(entry);
  const minutes = minutesFromTime(time);
  return Number.isFinite(minutes) ? minutes : 24 * 60;
}

function fastingPanelHtml(entries) {
  const timedEntries = sortEntriesByTime(entries).filter((entry) => Number.isFinite(entryMinutes(entry)));
  const now = new Date();
  const isSelectedToday = state.date === today();
  const endOfWindow = isSelectedToday ? (now.getHours() * 60) + now.getMinutes() : 24 * 60;

  if (!timedEntries.length) {
    const fastMinutes = isSelectedToday ? endOfWindow : 24 * 60;
    return `
      <div class="coach-head">
        <h2>Postne okno</h2>
        <span class="coach-badge">${formatDuration(fastMinutes)}</span>
      </div>
      <div class="fasting-list">
        <div class="fasting-row"><strong>Bez jedla</strong><span>${isSelectedToday ? 'od polnoci do teraz' : 'cely den bez zapisu jedla'}</span></div>
      </div>
    `;
  }

  const lastEntry = timedEntries[timedEntries.length - 1];
  const lastMinutes = entryMinutes(lastEntry);
  const currentFast = Math.max(0, endOfWindow - lastMinutes);
  const gaps = timedEntries.slice(1).map((entry, index) => {
    const previous = timedEntries[index];
    return {
      from: previous,
      to: entry,
      minutes: Math.max(0, entryMinutes(entry) - entryMinutes(previous))
    };
  });
  const longestGap = gaps.reduce((max, gap) => Math.max(max, gap.minutes), currentFast);
  const gapRows = gaps.length
    ? gaps.map((gap) => `<div class="fasting-row"><strong>${formatDuration(gap.minutes)}</strong><span>${entryTimeLabel(gap.from)} ${escapeHtml(gap.from.name)} -> ${entryTimeLabel(gap.to)} ${escapeHtml(gap.to.name)}</span></div>`).join('')
    : '<div class="fasting-row"><strong>Zatial len 1 jedlo</strong><span>Dalsi zapis ukaze pauzu medzi jedlami.</span></div>';

  return `
    <div class="coach-head">
      <h2>Postne okno</h2>
      <span class="coach-badge">${formatDuration(currentFast)}</span>
    </div>
    <div class="coach-grid">
      ${coachItem('Aktualne bez jedla', formatDuration(currentFast), fastingStatusClass(currentFast))}
      ${coachItem('Posledne jedlo', `${entryTimeLabel(lastEntry)} ${escapeHtml(lastEntry.name)}`, '')}
      ${coachItem('Najdlhsie dnes', formatDuration(longestGap), fastingStatusClass(longestGap))}
      ${coachItem('Pocet jedal', `${timedEntries.length}`, '')}
    </div>
    <div class="fasting-list">${gapRows}</div>
  `;
}

function fastingStatusClass(minutes) {
  if (minutes >= 14 * 60) return 'is-ok';
  if (minutes >= 10 * 60) return 'is-low';
  return '';
}

function formatDuration(minutes) {
  const safeMinutes = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(safeMinutes / 60);
  const rest = safeMinutes % 60;
  if (!hours) return `${rest} min`;
  return `${hours} h ${String(rest).padStart(2, '0')} min`;
}

function summaryItem(label, value, status = '') {
  return `
    <div class="summary-item ${status}">
      <span class="summary-label">${label}</span>
      <strong class="summary-value">${value}</strong>
    </div>
  `;
}

function macroSummaryItem(label, eaten, target, remaining, unit, status = '', remainingLabel = 'ostava') {
  const suffix = unit === 'kcal' ? 'kcal' : unit;
  return `
    <div class="summary-item ${status}">
      <span class="summary-label">${label}</span>
      <div class="macro-combined">
        <strong class="summary-value">${formatWithUnit(eaten, suffix)}</strong>
        <div class="macro-combined-row">
          <span><small>Zjedene</small>${formatWithUnit(eaten, suffix)}</span>
          <span><small>Ciel</small>${formatWithUnit(target, suffix)}</span>
          <span><small>${remainingLabel}</small>${formatWithUnit(remaining, suffix)}</span>
        </div>
      </div>
    </div>
  `;
}

function macroItem(label, value) {
  return `
    <div class="macro">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function coachItem(label, value, status = '') {
  return `
    <div class="coach-card ${status}">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function macroCheckPanelHtml(coach) {
  const macroKcal = macroTargetKcal(coach);
  const diff = coach.targetKcal - macroKcal;
  const status = Math.abs(diff) <= 25 ? 'is-ok' : Math.abs(diff) <= 80 ? 'is-low' : 'is-over';
  return `
    <div class="coach-head">
      <h2>Interna kontrola ciela</h2>
      <span class="coach-badge">${Math.abs(Math.round(diff))} kcal rozdiel</span>
    </div>
    <div class="coach-grid">
      ${coachItem('Ciel kcal', `${formatNumber(coach.targetKcal)} kcal`, '')}
      ${coachItem('Makra kcal', `${formatNumber(macroKcal)} kcal`, status)}
      ${coachItem('Rozdiel', `${diff >= 0 ? '+' : ''}${formatNumber(diff)} kcal`, status)}
      ${coachItem('Dorovnanie', coach.macroAudit?.adjustment || 'OK', status)}
    </div>
  `;
}

function saveWater(event) {
  event.preventDefault();
  if (!window.FlegmaWellness) return;
  const water = clampNumber(readNumber(document.getElementById('waterInput').value), 0, 15000);
  FlegmaWellness.upsertCheckin(state.date, { waterMl: water });
  if (window.FlegmaPersonalization) {
    window.FlegmaPersonalization.observeCheckin(state.date, { ...(FlegmaWellness.checkinForDate(state.date) || {}), waterMl: water }, targetWaterForDate(state.date));
  }
  showNotice('Hydratacia ulozena.');
  render();
}

function addWater(amount) {
  if (!window.FlegmaWellness) return;
  const checkin = FlegmaWellness.checkinForDate(state.date) || {};
  const current = Number(checkin.waterMl) || 0;
  const next = clampNumber(current + amount, 0, 15000);
  FlegmaWellness.upsertCheckin(state.date, { waterMl: next });
  if (window.FlegmaPersonalization) {
    window.FlegmaPersonalization.observeCheckin(state.date, { ...(FlegmaWellness.checkinForDate(state.date) || {}), waterMl: next }, targetWaterForDate(state.date));
  }
  showNotice(`Voda +${formatNumber(amount)} ml.`);
  render();
}

function addSelectedWater() {
  const amount = readNumber(document.getElementById('waterAddSelect')?.value || 0);
  addWater(amount);
}

function saveWatchData(event) {
  event.preventDefault();
  if (!window.FlegmaWellness) return;
  const manualKcal = clampNumber(readNumber(document.getElementById('watchKcalInput')?.value), 0, 10000);
  const steps = clampNumber(readNumber(document.getElementById('stepsInput')?.value), 0, 100000);
  FlegmaWellness.upsertCheckin(state.date, { watchKcal: manualKcal, steps });
  showNotice('Smart watch kcal a kroky boli prepocitane.');
  render();
}

function watchSummary(checkin, profile) {
  const manualKcal = Math.max(0, Number(checkin?.watchKcal) || 0);
  const steps = Math.max(0, Number(checkin?.steps) || 0);
  const weight = Number(profile.weight) || 80;
  const stepKcal = Math.round(steps * weight * 0.0005);
  return {
    manualKcal,
    steps,
    stepKcal,
    totalKcal: manualKcal + stepKcal
  };
}

function reconcileCoachMacros(coach, profile, training) {
  const before = macroTargetKcal(coach);
  const diff = coach.targetKcal - before;
  coach.macroAudit = { before, after: before, diff, adjustment: 'OK' };
  if (Math.abs(diff) <= 25) return coach;

  if (diff > 0) {
    const carbShare = coach.mode === 'carbload' ? 0.85 : training ? 0.70 : 0.55;
    const addedCarbs = (diff * carbShare) / 4;
    const addedFat = (diff * (1 - carbShare)) / 9;
    coach.targetCarbs += addedCarbs;
    coach.targetFat += addedFat;
    coach.sugarLimit += Math.max(0, addedCarbs * (coach.mode === 'carbload' ? 0.22 : 0.18));
    coach.macroAudit.adjustment = `+${formatNumber(addedCarbs)} g S, +${formatNumber(addedFat)} g T`;
  } else {
    const kcalToRemove = Math.abs(diff);
    const removableCarbs = Math.max(0, coach.targetCarbs - minimumDisplayCarbs(profile, training));
    const carbKcal = Math.min(kcalToRemove * 0.75, removableCarbs * 4);
    coach.targetCarbs -= carbKcal / 4;
    const remaining = kcalToRemove - carbKcal;
    const removableFat = Math.max(0, coach.targetFat - minimumDisplayFat(profile));
    const fatKcal = Math.min(remaining, removableFat * 9);
    coach.targetFat -= fatKcal / 9;
    coach.macroAudit.adjustment = `-${formatNumber(carbKcal / 4)} g S, -${formatNumber(fatKcal / 9)} g T`;
  }

  coach.targetCarbs = Math.max(0, coach.targetCarbs);
  coach.targetFat = Math.max(0, coach.targetFat);
  coach.sugarLimit = Math.max(20, coach.sugarLimit);
  coach.fatLimit = coach.mode === 'carbload' ? coach.targetFat : coach.targetFat * 1.15;
  coach.macroAudit.after = macroTargetKcal(coach);
  coach.macroAudit.diff = coach.targetKcal - coach.macroAudit.after;
  return coach;
}

function macroTargetKcal(coach) {
  return (Number(coach.targetProtein) || 0) * 4
    + (Number(coach.targetCarbs) || 0) * 4
    + (Number(coach.targetFat) || 0) * 9;
}

function minimumDisplayCarbs(profile, training) {
  const weight = Number(profile.weight) || 80;
  if (training) return weight * 2.5;
  if (isWaistReduction(profile) || profile.goal === 'lose') return weight * 1.8;
  return weight * 2.2;
}

function minimumDisplayFat(profile) {
  const weight = Number(profile.weight) || 80;
  return Math.max(35, weight * 0.45);
}

function hydrationStatusClass(water, target) {
  if (!target) return '';
  if (water >= target) return 'is-ok';
  if (water >= target * 0.75) return 'is-low';
  return 'is-low';
}

function calculateCoach(profile, totals, event, dayTraining) {
  const weight = profile.weight || 80;
  const isCarbload = Boolean(event);
  const dayMode = resolveDayMode(dayTraining, isCarbload);
  const carbload = calculateCarbloadTarget(profile, event);
  const temperament = temperamentSettings(profile);
  const macroTargets = calculateMacroTargets(profile, dayTraining, carbload, isCarbload, temperament);
  const targetCarbs = macroTargets.carbs;
  const targetProtein = macroTargets.protein;
  const targetFat = macroTargets.fat;
  const targetKcal = macroTargets.kcal;
  const sugarLimit = macroTargets.sugar;
  const fiberTarget = macroTargets.fiber;
  const fatLimit = isCarbload ? targetFat : targetFat * 1.15;
  const fiberLimit = isCarbload ? fiberTarget : fiberTarget * 1.25;
  const missingCarbs = Math.max(0, targetCarbs - totals.carbs);
  const missingProtein = Math.max(0, targetProtein - totals.protein);
  const missingFat = Math.max(0, targetFat - totals.fat);
  const missingFiber = Math.max(0, fiberTarget - totals.fiber);
  const missingKcal = Math.max(0, targetKcal - totals.kcal);
  const remainingSugar = Math.max(0, sugarLimit - totals.sugar);
  const overFat = Math.max(0, totals.fat - fatLimit);
  const overFiber = Math.max(0, totals.fiber - fiberLimit);
  const carbFood = suggestCarbFood(missingCarbs);
  let message = `${dayMode.label}: zjedz cca ${formatNumber(targetProtein)} g B, ${formatNumber(targetCarbs)} g S, ${formatNumber(targetFat)} g T, cukry max ${formatNumber(sugarLimit)} g, vlaknina cca ${formatNumber(fiberTarget)} g.`;

  if (isCarbload) {
    message += ` Carbload ${carbload.label}: ${carbload.percent}% z 3-dnoveho planu, model ${formatNumber(carbload.gramsPerKg)} g/kg podla vykonu/casu/intenzity/prevysenia/hmotnosti/ciela. ${temperamentText(temperament)} Ciel je doplnit energiu bez hladovania: hlavne jedla vysoko sacharidove, tuky a vlakninu kontrolovane.`;
  } else if (profile.goal === 'carbload') {
    message += ` V profile mas carbload, ale v kalendari nie je trening/sutaz v 3-dnovom okne, preto nepocitam vysoky carbload ciel.`;
  }

  if (!isCarbload && isWaistReduction(profile)) {
    const waistDelta = profile.waist && profile.targetWaist ? profile.waist - profile.targetWaist : 0;
    message += ` Redukcia pasa: ciel je zhodit cca ${formatNumber(Math.max(0, waistDelta))} cm z pasa. Drz mierny deficit, protein vysoko, sladke a tuky vecer neprestreluj.`;
  }

  if (missingCarbs > 0) {
    message += ` Dopln este priblizne ${formatNumber(missingCarbs)} g sacharidov, napr. ${carbFood}.`;
  } else {
    message += ` Sacharidovy ciel je splneny.`;
  }

  if (overFat > 0) message += ` Tuky su nad limitom o ${formatNumber(overFat)} g, dalsie jedla drz skor nizkotucne.`;
  if (overFiber > 0) message += ` Vlaknina je nad limitom o ${formatNumber(overFiber)} g, pri pretekoch uz vol lahko travitelne sacharidy.`;
  if (!profile.weight) message += ` Pre presnejsi vypocet dopln v bio profile vahu.`;

  return {
    mode: isCarbload ? 'carbload' : 'bezny den',
    targetCarbs,
    targetProtein,
    targetFat,
    targetKcal,
    sugarLimit,
    fiberTarget,
    missingCarbs,
    missingProtein,
    missingFat,
    missingFiber,
    missingKcal,
    remainingSugar,
    fatLimit,
    fiberLimit,
    message,
    carbload,
    dayMode,
    temperament
  };
}

function resolveDayMode(training, isCarbload) {
  if (isCarbload) return { id: 'carbload', label: 'Carbload den' };
  if (!training) return { id: 'rest', label: 'Volno / regeneracia' };
  if (training.type === 'fitko') return { id: 'gym', label: training.gymMode === 'winter' ? 'Fitko zimny silovy rezim' : 'Fitko letny cyklo rezim' };
  if (training.type === 'race') return { id: 'race', label: 'Sutazny den' };
  if (training.type === 'brick' || training.type === 'multi') return { id: 'multi', label: 'Brick / multi trening' };
  if (training.intensity === 'hard' || training.intensity === 'race') return { id: 'hard', label: 'Tazky trening' };
  return { id: 'training', label: 'Treningovy den' };
}

function calculateMacroTargets(profile, training, carbload, isCarbload, temperament) {
  const weight = profile.weight || 80;
  const mode = resolveDayMode(training, isCarbload).id;
  const multipliers = {
    rest: { protein: 1.8, carbs: 2.5, fat: 0.9, sugar: 0.55, fiber: 0.35 },
    gym: { protein: 2.0, carbs: 3.0, fat: 0.9, sugar: 0.6, fiber: 0.35 },
    training: { protein: 1.7, carbs: 4.5, fat: 0.85, sugar: 0.8, fiber: 0.32 },
    hard: { protein: 1.8, carbs: 6.0, fat: 0.8, sugar: 1.0, fiber: 0.30 },
    multi: { protein: 1.8, carbs: 6.5, fat: 0.75, sugar: 1.1, fiber: 0.28 },
    race: { protein: 1.6, carbs: 7.0, fat: 0.65, sugar: 0.9, fiber: 0.25 },
    carbload: { protein: 1.6, carbs: 0, fat: 0.65, sugar: 0, fiber: 0.22 }
  }[mode];

  let carbs = isCarbload ? carbload.targetCarbs * temperament.carbloadFactor : weight * multipliers.carbs;
  if (training && !isCarbload) {
    carbs += (Number(training.carbsPerHour || 0) * (Number(training.plannedMinutes || 0) / 60)) * 0.5;
  }

  if (isWaistReduction(profile) && !isCarbload) carbs *= training ? 0.9 : 0.78;
  if (profile.goal === 'lose' && !isCarbload) carbs *= 0.85;
  if (profile.goal === 'gain' && !isCarbload) carbs *= 1.15;

  const protein = weight * (isWaistReduction(profile) && !isCarbload ? Math.max(multipliers.protein, 2.1) : multipliers.protein);
  const fat = weight * (isWaistReduction(profile) && !isCarbload ? Math.min(multipliers.fat, 0.75) : multipliers.fat);
  const kcal = estimateTargetKcal(profile, carbs, protein, fat);
  if (!isCarbload) {
    const kcalCarbs = (kcal - (protein * 4) - (fat * 9)) / 4;
    const bounds = carbBounds(profile, mode, training);
    const trainingFloor = training ? minimumTrainingCarbs(profile, training, mode) : 0;
    carbs = clampNumber(Math.max(carbs, kcalCarbs, trainingFloor), bounds.min, bounds.max);
  }
  const sugar = isCarbload
    ? carbloadSugarLimit(weight, carbload, training)
    : Math.max(25, weight * (isWaistReduction(profile) ? Math.min(multipliers.sugar, 0.55) : multipliers.sugar));
  const fiber = Math.max(isCarbload ? 16 : 22, Math.min(isCarbload ? 25 : 40, weight * multipliers.fiber));

  const targets = { kcal, protein, carbs, fat, sugar, fiber };
  const adaptedTargets = window.FlegmaPersonalization
    ? window.FlegmaPersonalization.adaptMacroTargets(targets, { profile, training, isCarbload })
    : targets;
  if (training && !isCarbload) {
    const bounds = carbBounds(profile, mode, training);
    adaptedTargets.carbs = clampNumber(
      Math.max(adaptedTargets.carbs, minimumTrainingCarbs(profile, training, mode)),
      bounds.min,
      bounds.max
    );
  }
  return adaptedTargets;
}

function carbBounds(profile, mode, training) {
  const weight = profile.weight || 80;
  const hours = Number(profile.trainingHours) || 0;
  const sportFloor = hours >= 8 ? 2.8 : hours >= 4 ? 2.4 : 2.0;
  const goalFloor = isWaistReduction(profile) || profile.goal === 'lose' ? sportFloor : 2.5;
  const modeMin = {
    rest: goalFloor,
    gym: Math.max(goalFloor, 2.6),
    training: 3.2,
    hard: 4.2,
    multi: 4.8,
    race: 5.2
  }[mode] || goalFloor;
  const modeMax = {
    rest: hours >= 4 ? 4.0 : 3.4,
    gym: 4.2,
    training: 6.0,
    hard: 7.5,
    multi: 8.5,
    race: 9.5
  }[mode] || 4.0;
  const trainingBonus = training ? Math.min(1.2, (Number(training.plannedMinutes) || 0) / 180) : 0;
  return {
    min: weight * modeMin,
    max: weight * (modeMax + trainingBonus)
  };
}

function minimumTrainingCarbs(profile, training, mode) {
  const weight = Number(profile.weight) || 80;
  const minutes = effectiveTrainingMinutes(training);
  const hours = minutes / 60;
  const during = Math.max(0, Number(training.carbsPerHour) || 0) * hours;
  const baseByMode = {
    gym: 2.8,
    training: 3.4,
    hard: 4.3,
    multi: 4.8,
    race: 5.2
  }[mode] || 3.0;
  const typeAdd = { swim: 0.25, run: 0.35, bike: 0.45, brick: 0.75, multi: 0.85, race: 1.0, fitko: 0.1 }[training?.type] || 0.3;
  const intensityAdd = { easy: 0, steady: 0.25, hard: 0.75, race: 1.1 }[training?.intensity] || 0.25;
  const durationAdd = minutes >= 240 ? 1.2 : minutes >= 150 ? 0.8 : minutes >= 90 ? 0.45 : minutes >= 45 ? 0.2 : 0;
  const goalFactor = isWaistReduction(profile) || profile.goal === 'lose' ? 0.9 : profile.goal === 'gain' ? 1.08 : 1;
  return Math.max(weight * baseByMode, ((weight * (2.7 + typeAdd + intensityAdd + durationAdd)) + (during * 0.5)) * goalFactor);
}

function observePersonalization(date, totals, coach, profile, training, checkin, targetWater) {
  if (!window.FlegmaPersonalization) return;
  window.FlegmaPersonalization.observeDiaryDay(date, totals, {
    kcal: coach.targetKcal,
    carbs: coach.targetCarbs,
    protein: coach.targetProtein
  }, { profile, training });
  if (checkin) window.FlegmaPersonalization.observeCheckin(date, checkin, targetWater);
}

function targetWaterForDate(date) {
  const profile = loadProfile();
  const training = findTrainingForDate(date);
  return window.FlegmaWellness ? FlegmaWellness.hydrationTarget(profile, training) : Math.round((profile.weight || 80) * 35);
}

function temperamentSettings(profile) {
  const temperament = profile.temperament || {};
  const flegma = Number(temperament.flegma ?? profile.temperFlegma ?? 37);
  const melan = Number(temperament.melan ?? profile.temperMelan ?? 32);
  const cholerik = Number(temperament.cholerik ?? profile.temperCholerik ?? 22);
  const sangvinik = Number(temperament.sangvinik ?? profile.temperSangvinik ?? 9);
  const stable = (flegma + melan) / 100;
  const action = (cholerik + sangvinik) / 100;
  return {
    flegma,
    melan,
    cholerik,
    sangvinik,
    carbloadFactor: clampNumber(1 - (stable * 0.08) + (action * 0.03), 0.92, 1),
    mealStability: clampNumber(stable, 0.25, 0.9),
    variation: clampNumber(action, 0.1, 0.9)
  };
}

function temperamentText(temperament) {
  if (temperament.variation > temperament.mealStability) {
    return 'Temperament: viac akcie a variability, ale stale kontrolovane porcie bez prestrelenia.';
  }
  return 'Temperament: male stabilne zasahy, rovnake jedla, ziadne nahle dohananie.';
}

function carbloadSugarLimit(weight, carbload, training) {
  if (carbload.percent === 25) return clampNumber(weight * 0.55, 35, 55);
  if (carbload.percent === 60) return clampNumber(weight * 0.75, 45, 70);
  if (carbload.percent === 15) {
    const duringExercise = training ? Number(training.carbsPerHour || 0) * (Number(training.plannedMinutes || 0) / 60) * 0.5 : 0;
    return clampNumber((weight * 0.55) + duringExercise, 40, 90);
  }
  return clampNumber(weight * 0.65, 40, 65);
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function calculateCarbloadTarget(profile, event) {
  const weight = profile.weight || 80;
  if (!event) {
    const model = calculateCarbloadModel({ weight, goal: profile.goal });
    return { targetCarbs: model.totalCarbs, percent: 100, label: 'bez udalosti', intensity: 'manual', gramsPerKg: model.gramsPerKg, model };
  }

  const model = calculateCarbloadModel({
    power: event.training?.actual?.avgPower || 0,
    minutes: event.training?.gpx?.estimatedMinutes || event.training?.actual?.durationMinutes || event.training?.plannedMinutes || 60,
    intensity: event.training?.intensity,
    elevationGain: event.training?.gpx?.elevationGain || 0,
    weight,
    goal: profile.goal,
    type: event.training?.type
  });
  const total = model.totalCarbs;
  const percentage = carbloadDayPercent(event.daysToEvent, model);
  return {
    targetCarbs: total * percentage,
    totalCarbs: total,
    gramsPerKg: model.gramsPerKg,
    model,
    percent: Math.round(percentage * 100),
    label: event.daysToEvent === 0 ? 'den vykonu' : `${event.daysToEvent + 1}. den pred vykonom`,
    intensity: event.training.intensity || 'steady',
    eventTitle: event.training.title
  };
}

function calculateCarbloadModel({ power = 0, minutes = 60, intensity = 'steady', elevationGain = 0, weight = 80, goal = 'fit', type = 'bike' } = {}) {
  const hours = Math.max(0.25, Number(minutes || 0) / 60);
  const elevation = Math.max(0, Number(elevationGain) || 0);
  const bodyWeight = Math.max(35, Number(weight) || 80);
  const intensityBonus = { easy: 0, steady: 0.8, hard: 1.5, race: 2.2 }[intensity] ?? 0.8;
  const typeBonus = { race: 0.8, brick: 0.5, multi: 0.8, bike: 0.3, run: 0.2, swim: -0.3, fitko: -1 }[type] || 0;
  const goalFactor = { carbload: 1.08, fit: 1, lose: 0.95, waist: 0.95, gain: 1.05 }[goal] || 1;
  const durationBonus = hours >= 5 ? 2.4 : hours >= 3 ? 1.7 : hours >= 1.5 ? 1.0 : hours >= 0.75 ? 0.45 : 0.1;
  const routeGkg = 3.2 + durationBonus + (elevation / 700) + intensityBonus + typeBonus;
  const powerKcal = power ? (Number(power) * hours * 3600) / 4184 : 0;
  const powerGkg = powerKcal ? ((powerKcal * 0.65) / 4) / bodyWeight : 0;
  const gramsPerKg = clampNumber(Math.max(routeGkg, powerGkg * 1.35) * goalFactor, 3.5, 12);
  return {
    totalCarbs: bodyWeight * gramsPerKg,
    gramsPerKg,
    hours,
    elevationGain: elevation,
    powerKcal,
    goalFactor
  };
}

function carbloadDayPercent(daysToEvent, model) {
  if (daysToEvent === 2) return model.hours >= 3 ? 0.25 : 0.18;
  if (daysToEvent === 1) return model.hours >= 3 ? 0.55 : 0.42;
  if (daysToEvent === 0) return model.hours >= 3 ? 0.25 : 0.40;
  return 0;
}

function findCarbloadEvent(date) {
  const current = new Date(`${date}T00:00:00`);
  return state.trainings
    .map((training) => {
      const eventDate = new Date(`${training.date}T00:00:00`);
      const daysToEvent = Math.round((eventDate - current) / 86400000);
      return { training, daysToEvent };
    })
    .filter((item) => item.daysToEvent >= 0 && item.daysToEvent <= 2 && shouldUseCarbload(item.training))
    .sort((a, b) => {
      if (a.daysToEvent !== b.daysToEvent) return a.daysToEvent - b.daysToEvent;
      return eventPriority(b.training) - eventPriority(a.training);
    })[0] || null;
}

function findTrainingForDate(date) {
  return state.trainings
    .filter((training) => training.date === date)
    .sort((a, b) => eventPriority(b) - eventPriority(a))[0] || null;
}

function eventPriority(training) {
  if (training.type === 'race') return 4;
  if (training.type === 'multi' || training.type === 'brick') return 3;
  if (training.intensity === 'race' || training.intensity === 'hard') return 2;
  return 1;
}

function shouldUseCarbload(training) {
  if (!training) return false;
  if (training.carbloadMode === 'on') return true;
  if (training.carbloadMode === 'off') return false;
  const minutes = effectiveTrainingMinutes(training);
  if (training.type === 'race' || training.intensity === 'race') return true;
  if (training.planningMode === 'adhoc') return false;
  if (training.type === 'multi' || training.type === 'brick') return minutes >= 90;
  return minutes >= 150 && (training.intensity === 'hard' || training.intensity === 'race');
}

function effectiveTrainingMinutes(training) {
  return Number(training?.gpx?.estimatedMinutes) || Number(training?.actual?.durationMinutes) || Number(training?.plannedMinutes) || 0;
}

function estimateTargetKcal(profile, targetCarbs, targetProtein, targetFat = null) {
  const weight = profile.weight || 80;
  const age = profile.birthYear ? new Date().getFullYear() - profile.birthYear : 35;
  const height = profile.height || 180;
  const base = (10 * weight) + (6.25 * height) - (5 * age) + (profile.sex === 'female' ? -161 : 5);
  const tdee = base * (profile.activity || 1.55);
  const macroKcal = targetFat === null ? 0 : (targetCarbs * 4) + (targetProtein * 4) + (targetFat * 9);
  if (isWaistReduction(profile)) return Math.max(1500, tdee - 300);
  if (profile.goal === 'lose') return tdee - 400;
  if (profile.goal === 'gain') return tdee + 300;
  return Math.max(tdee, macroKcal);
}

function isWaistReduction(profile) {
  return profile.goal === 'waist' || Boolean(profile.waist && profile.targetWaist && profile.targetWaist < profile.waist);
}

function proteinMultiplier(goal) {
  if (goal === 'waist') return 2.1;
  if (goal === 'lose') return 2;
  if (goal === 'gain') return 1.8;
  return 1.6;
}

function macroStatus(value, target, mode) {
  if (!target) return '';
  if (mode === 'limit') return value > target ? 'is-over' : 'is-ok';
  if (value > target * 1.1) return 'is-over';
  if (value >= target * 0.9) return 'is-ok';
  return 'is-low';
}

function buildMealPlan(coach, dayEntries) {
  const split = coach.mode === 'carbload'
    ? {
        ranajky: { title: 'Ranajky', ratio: 0.24, sugarRatio: 0.10 },
        desiata: { title: 'Desiata - tekute sacharidy', ratio: 0.14, sugarRatio: 0.35, liquid: true },
        obed: { title: 'Obed', ratio: 0.28, sugarRatio: 0.10 },
        olovrant: { title: 'Olovrant - tekute sacharidy', ratio: 0.14, sugarRatio: 0.35, liquid: true },
        vecera: { title: 'Vecera', ratio: 0.20, sugarRatio: 0.10 }
      }
    : {
        ranajky: { title: 'Ranajky', ratio: 0.25 },
        obed: { title: 'Obed', ratio: 0.35 },
        snack: { title: 'Snack', ratio: 0.15 },
        vecera: { title: 'Vecera', ratio: 0.25 }
      };

  return Object.entries(split).map(([mealId, config]) => {
    const eaten = sumEntries(dayEntries.filter((entry) => entry.meal === mealId));
    const sugarShare = config.sugarRatio || config.ratio;
    const target = {
      kcal: coach.targetKcal * config.ratio,
      protein: coach.targetProtein * config.ratio,
      carbs: coach.targetCarbs * config.ratio,
      fat: coach.targetFat * config.ratio,
      sugar: coach.sugarLimit * sugarShare,
      fiber: coach.fiberTarget * config.ratio
    };
    const left = {
      kcal: Math.max(0, target.kcal - eaten.kcal),
      protein: Math.max(0, target.protein - eaten.protein),
      carbs: Math.max(0, target.carbs - eaten.carbs),
      fat: Math.max(0, target.fat - eaten.fat),
      sugar: Math.max(0, target.sugar - eaten.sugar),
      fiber: Math.max(0, target.fiber - eaten.fiber)
    };

    return {
      title: `${config.title} - odporucane ${formatNumber(target.kcal)} kcal`,
      text: mealText(mealId, coach, target, left, eaten, config)
    };
  });
}

function mealText(mealId, coach, target, left, eaten, config = {}) {
  if (eaten.kcal >= target.kcal * 0.85) {
    return `Uz zapisane ${formatNumber(eaten.kcal)} kcal. Zostava len cca ${formatNumber(left.kcal)} kcal, ${formatNumber(left.protein)} g B, ${formatNumber(left.carbs)} g S, ${formatNumber(left.fat)} g T.`;
  }

  const grams = mealGrams(mealId, coach, left, config);
  const restText = `Zostava: ${formatNumber(left.kcal)} kcal, ${formatNumber(left.protein)} g B, ${formatNumber(left.carbs)} g S, ${formatNumber(left.fat)} g T, cukry max ${formatNumber(left.sugar)} g.`;
  return `${grams} ${restText}`;
}

function mealGrams(mealId, coach, left, config = {}) {
  const personal = personalMealTemplate(mealId, coach);
  if (personal) return personal;

  if (coach.mode === 'carbload') {
    if (config.liquid) return carbloadLiquidSnackText(left, mealId);
    if (mealId === 'ranajky') return `Navys sacharidy: ryza varena ${gramsForCarbs(left.carbs * 0.52, 28)} g + ovsene vlocky ${gramsForCarbs(left.carbs * 0.20, 58.7)} g + grecky jogurt ${gramsForProtein(left.protein * 0.55, 9)} g. Tuky drz nizko.`;
    if (mealId === 'obed') return `Navys sacharidy: cestoviny varene ${gramsForCarbs(left.carbs * 0.62, 31)} g + kuracie prsia ${gramsForProtein(left.protein * 0.65, 23)} g + pecivo alebo ryza na zvysok sacharidov. Tuky nizko.`;
    return `Navys sacharidy: zemiaky varene ${gramsForCarbs(left.carbs * 0.62, 20)} g + tvaroh ${gramsForProtein(left.protein * 0.60, 12)} g + pecivo ${gramsForCarbs(left.carbs * 0.18, 41)} g.`;
  }

  if (mealId === 'ranajky') return `Ovsene vlocky ${gramsForCarbs(left.carbs * 0.45, 58.7)} g + grecky jogurt ${gramsForProtein(left.protein * 0.70, 9)} g + jablko ${gramsForCarbs(left.carbs * 0.15, 13.8)} g.`;
  if (mealId === 'obed') return `Kuracie prsia ${gramsForProtein(left.protein * 0.75, 23)} g + ryza varena ${gramsForCarbs(left.carbs * 0.65, 28)} g + olivovy olej ${gramsForFat(left.fat * 0.45, 100)} g.`;
  if (mealId === 'snack') return `Tvaroh ${gramsForProtein(left.protein * 0.70, 12)} g + banan ${gramsForCarbs(left.carbs * 0.45, 22.8)} g.`;
  return `Losos ${gramsForProtein(left.protein * 0.65, 20)} g + zemiaky varene ${gramsForCarbs(left.carbs * 0.65, 20)} g.`;
}

function carbloadLiquidSnackText(left, mealId) {
  const targetDrinkCarbs = Math.max(20, left.carbs * 0.70);
  const sugarCap = Math.max(15, left.sugar);
  const maltodextrin = gramsForCarbs(targetDrinkCarbs * 0.65, 95);
  const juice = gramsForCarbs(Math.min(sugarCap, targetDrinkCarbs * 0.35), 10);
  const label = mealId === 'desiata' ? 'Desiata' : 'Olovrant';
  return `${label}: tekute sacharidy - maltodextrin/iontak cca ${maltodextrin} g sacharidov + dzus ${juice} ml alebo sportovy napoj. Ciel je doplnit cukry aj sacharidy bez tuku a bez vlakniny.`;
}

function personalMealTemplate(mealId, coach) {
  const wantedModes = [coach.dayMode?.id, coach.mode, 'any'].filter(Boolean);
  const template = state.recommendations.find((item) => {
    return item.meal === mealId && wantedModes.includes(item.mode);
  });
  if (!template) return '';

  const totals = template.items.reduce((sum, item) => {
    const food = state.foods.find((entry) => entry.id === item.foodId || entry.name === item.name);
    if (!food) return sum;
    const split = sugarSplitForFood(food);
    const ratio = item.grams / 100;
    sum.kcal += food.kcal * ratio;
    sum.protein += food.protein * ratio;
    sum.carbs += food.carbs * ratio;
    sum.fat += food.fat * ratio;
    sum.sugar += food.sugar * ratio;
    sum.glucose += split.glucose * ratio;
    sum.fructose += split.fructose * ratio;
    sum.fiber += food.fiber * ratio;
    return sum;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, glucose: 0, fructose: 0, fiber: 0 });

  const items = template.items.map((item) => `${item.name} ${formatNumber(item.grams)} g`).join(' + ');
  return `Tvoje odporucanie: ${items}. Spolu cca ${formatNumber(totals.kcal)} kcal, B ${formatNumber(totals.protein)} g, S ${formatNumber(totals.carbs)} g, T ${formatNumber(totals.fat)} g, glukoza ${formatNumber(totals.glucose)} g, fruktoza ${formatNumber(totals.fructose)} g.`;
}

function gramsForCarbs(targetCarbs, carbsPer100) {
  return clampMealGrams((targetCarbs / carbsPer100) * 100, 30, 450);
}

function gramsForProtein(targetProtein, proteinPer100) {
  return clampMealGrams((targetProtein / proteinPer100) * 100, 40, 350);
}

function gramsForFat(targetFat, fatPer100) {
  return clampMealGrams((targetFat / fatPer100) * 100, 3, 30);
}

function clampMealGrams(value, min, max) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(Math.min(max, Math.max(min, value)) / 5) * 5;
}

function dailyCarbTarget(profile) {
  const weight = profile.weight || 80;
  if (isWaistReduction(profile)) return weight * 2.4;
  if (profile.goal === 'lose') return weight * 2.5;
  if (profile.goal === 'gain') return weight * 5;
  return weight * 4;
}

function suggestCarbFood(missingCarbs) {
  if (missingCarbs <= 30) return '1 banan alebo mensia porcia ryze';
  if (missingCarbs <= 80) return '250-300 g varenej ryze alebo cestovin';
  return 'ryza/cestoviny rozdelene do 2 porcii plus iontovy napoj';
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadTrainings() {
  try {
    const raw = localStorage.getItem(TRAINING_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadRecommendations() {
  try {
    const raw = localStorage.getItem(RECOMMENDATION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function findFood(name) {
  const normalized = name.trim().toLowerCase();
  return state.foods.find((food) => food.name.toLowerCase() === normalized);
}

function loadFoods() {
  try {
    const raw = localStorage.getItem(FOOD_STORAGE_KEY);
    const foods = raw ? JSON.parse(raw) : [];
    const mergedFoods = mergeDefaultFoods(foods).map(normalizeFoodSugarSplit);
    localStorage.setItem(FOOD_STORAGE_KEY, JSON.stringify(mergedFoods));
    return mergedFoods;
  } catch {
    return ALL_DEFAULT_FOODS.map(normalizeFoodSugarSplit);
  }
}

function mergeDefaultFoods(foods) {
  const existingNames = new Set(foods.map((food) => food.name.toLowerCase()));
  const missingDefaults = ALL_DEFAULT_FOODS.filter((food) => !existingNames.has(food.name.toLowerCase()));
  return [...foods, ...missingDefaults];
}

function normalizeFoodSugarSplit(food) {
  const sugar = Math.max(0, Number(food.sugar) || 0);
  const glucose = Math.max(0, Number(food.glucose) || 0);
  const fructose = Math.max(0, Number(food.fructose) || 0);
  if (glucose || fructose || !sugar) return { ...food, sugar, glucose: Math.min(sugar, glucose), fructose: Math.min(sugar, fructose) };
  return { ...food, sugar, glucose: sugar / 2, fructose: sugar / 2 };
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(DIARY_STORAGE_KEY);
    const entries = raw ? JSON.parse(raw) : [];
    return Array.isArray(entries) ? entries.map(normalizeEntry) : [];
  } catch {
    return [];
  }
}

function normalizeEntry(entry) {
  const values = normalizeEntryValues(entry.values || {});
  return {
    ...entry,
    values,
    time: normalizedTime(entry.time) || timeFromIso(entry.createdAt) || ''
  };
}

function normalizeEntryValues(values) {
  const sugar = Math.max(0, Number(values.sugar) || 0);
  const glucose = Math.max(0, Number(values.glucose) || 0);
  const fructose = Math.max(0, Number(values.fructose) || 0);
  if (glucose || fructose || !sugar) return { ...values, sugar, glucose: Math.min(sugar, glucose), fructose: Math.min(sugar, fructose) };
  return { ...values, sugar, glucose: sugar / 2, fructose: sugar / 2 };
}

function saveEntries() {
  localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(state.entries));
}

function readNumber(value) {
  const number = Number.parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(number) ? number : 0;
}

function today() {
  return formatLocalDate(new Date());
}

function currentTimeValue() {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function normalizedTime(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '';
  const hours = Math.max(0, Math.min(23, Number(match[1]) || 0));
  const minutes = Math.max(0, Math.min(59, Number(match[2]) || 0));
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function timeFromIso(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function minutesFromTime(value) {
  const time = normalizedTime(value);
  if (!time) return Number.NaN;
  const [hours, minutes] = time.split(':').map(Number);
  return (hours * 60) + minutes;
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatNumber(value) {
  return Number(value).toLocaleString('sk-SK', {
    maximumFractionDigits: 1
  });
}

function formatWithUnit(value, unit) {
  return `${formatNumber(value)} ${unit}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showNotice(message) {
  if (!notice) return;
  notice.textContent = message;
  notice.classList.add('is-visible');
  window.clearTimeout(showNotice.timeout);
  showNotice.timeout = window.setTimeout(() => {
    notice.classList.remove('is-visible');
  }, 2500);
}
