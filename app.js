const STORAGE_PREFIX = "pulseplan-week-state-v1";
const USERS_KEY = "pulseplan-users-v1";
const ACTIVE_USER_KEY = "pulseplan-active-user-v1";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const NUTRITION_CHECKS = [
  { id: "proteinMeals", label: "Protein with 3+ meals/snacks" },
  { id: "fruitVeg", label: "Fruits/veggies at 2+ meals" },
  { id: "wholeGrain", label: "Whole grain or starchy veg" },
  { id: "waterHit", label: "Hit water goal" },
  { id: "sleep", label: "7+ hours sleep" }
];

const WORKOUTS = [
  {
    id: "day1",
    title: "Day 1: Chest + Arms",
    note: "Warm-up 5 min. Rest 45-75 sec. Tempo slow and controlled.",
    exercises: [
      ["Push-ups (knees/incline)", "3 x 8-12"],
      ["DB Chest Press (floor)", "3 x 12-15"],
      ["DB Chest Fly (controlled)", "3 x 10-12"],
      ["Bicep Curls", "3 x 12-15"],
      ["Overhead Tricep Extension", "3 x 10-12"],
      ["Plank", "3 x 30-45s"]
    ]
  },
  {
    id: "day2",
    title: "Day 2: Legs + Glutes",
    note: "Pause 1 sec at bottom of squats; squeeze glutes at top of bridges.",
    exercises: [
      ["Goblet Squat", "3 x 12-15"],
      ["Reverse Lunges", "3 x 8-10/leg"],
      ["Glute Bridges", "3 x 15"],
      ["Step-ups", "3 x 8/leg"],
      ["Standing Calf Raises", "3 x 20"],
      ["Dead Bugs / Leg Raises", "3 x 12"]
    ]
  },
  {
    id: "day3",
    title: "Day 3: Upper + Core",
    note: "Keep ribs down on presses; squeeze shoulder blades on rows.",
    exercises: [
      ["Shoulder Press", "3 x 12"],
      ["Bent-over Rows", "3 x 12-15"],
      ["Hammer Curls", "3 x 12"],
      ["Tricep Kickbacks", "3 x 12-15"],
      ["Bicycle Crunch", "2-3 x 16"],
      ["Russian Twists", "2-3 x 20"],
      ["Plank Shoulder Taps", "2-3 x 10/side"]
    ]
  },
  {
    id: "day4",
    title: "Day 4: Optional Legs + Core",
    note: "Choose quality reps; keep knees tracking over toes.",
    exercises: [
      ["Sumo Squats", "3 x 12-15"],
      ["Single-leg Glute Bridges", "3 x 10/leg"],
      ["Wall Sit", "3 x 30-60s"],
      ["Side Lunges", "3 x 8/side"],
      ["Mountain Climbers", "3 x 30s"],
      ["Side Plank", "2 x 30s/side"]
    ]
  }
];

const defaultState = () => ({
  profile: {
    name: "",
    weekOf: "",
    weeklyGoal: "3",
    weeklyNotes: ""
  },
  habits: DAYS.reduce((acc, day) => {
    acc[day] = false;
    return acc;
  }, {}),
  workouts: WORKOUTS.reduce((acc, day) => {
    acc[day.id] = day.exercises.map(() => ({
      wt: "",
      done: false,
      actual: "",
      notes: ""
    }));
    return acc;
  }, {}),
  nutrition: {
    bodyWeight: "",
    proteinGoal: "",
    waterGoal: "",
    checks: NUTRITION_CHECKS.reduce((acc, item) => {
      acc[item.id] = false;
      return acc;
    }, {}),
    mealBreakfast: "",
    mealLunch: "",
    mealDinner: "",
    mealSnacks: ""
  }
});

let activeUserId = "";
let state = defaultState();

function loadState() {
  if (!activeUserId) {
    return defaultState();
  }

  try {
    const raw = localStorage.getItem(storageKeyForUser(activeUserId));
    if (!raw) {
      return defaultState();
    }
    const parsed = JSON.parse(raw);
    return mergeWithDefaults(parsed);
  } catch {
    return defaultState();
  }
}

function storageKeyForUser(userId) {
  return `${STORAGE_PREFIX}:${userId}`;
}

function normalizeUserId(name) {
  return name.trim().toLowerCase();
}

function sanitizeDisplayName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function getUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((entry) => typeof entry?.id === "string" && typeof entry?.display === "string");
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function upsertUser(displayName) {
  const id = normalizeUserId(displayName);
  const display = sanitizeDisplayName(displayName);
  if (!id || !display) {
    return null;
  }

  const users = getUsers();
  const existing = users.find((user) => user.id === id);
  if (!existing) {
    users.push({ id, display });
    saveUsers(users);
    return { id, display };
  }

  if (existing.display !== display) {
    existing.display = display;
    saveUsers(users);
  }
  return existing;
}

function getDisplayNameForUserId(id) {
  const match = getUsers().find((user) => user.id === id);
  return match ? match.display : id;
}

function mergeWithDefaults(parsed) {
  const base = defaultState();
  return {
    profile: { ...base.profile, ...(parsed.profile || {}) },
    habits: { ...base.habits, ...(parsed.habits || {}) },
    workouts: WORKOUTS.reduce((acc, day) => {
      const rows = parsed.workouts?.[day.id] || [];
      acc[day.id] = day.exercises.map((_, idx) => ({ ...base.workouts[day.id][idx], ...(rows[idx] || {}) }));
      return acc;
    }, {}),
    nutrition: {
      ...base.nutrition,
      ...(parsed.nutrition || {}),
      checks: { ...base.nutrition.checks, ...(parsed.nutrition?.checks || {}) }
    }
  };
}

function saveState() {
  if (!activeUserId) {
    return;
  }

  localStorage.setItem(storageKeyForUser(activeUserId), JSON.stringify(state));
  const saveStatus = document.getElementById("saveStatus");
  saveStatus.textContent = `Saved ${new Date().toLocaleTimeString()}`;
  renderAnalytics();
}

function setByPath(path, value) {
  const keys = path.split(".");
  let current = state;
  for (let i = 0; i < keys.length - 1; i += 1) {
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
  saveState();
}

function bindField(id, path, checkbox = false) {
  const el = document.getElementById(id);
  if (!el) {
    return;
  }
  const initial = path.split(".").reduce((acc, key) => acc[key], state);
  if (checkbox) {
    el.checked = Boolean(initial);
    el.addEventListener("change", () => setByPath(path, el.checked));
  } else {
    el.value = initial ?? "";
    el.addEventListener("input", () => setByPath(path, el.value));
  }
}

function renderHabits() {
  const host = document.getElementById("habitGrid");
  host.innerHTML = DAYS.map((day) => `
    <label class="habit-cell">
      <input type="checkbox" data-habit="${day}" ${state.habits[day] ? "checked" : ""}>
      ${day}
    </label>
  `).join("");

  host.querySelectorAll("[data-habit]").forEach((el) => {
    el.addEventListener("change", () => {
      state.habits[el.dataset.habit] = el.checked;
      saveState();
    });
  });
}

function renderWorkoutTables() {
  const tabList = document.getElementById("tabList");
  const panels = document.getElementById("workoutPanels");

  tabList.innerHTML = WORKOUTS.map((day, idx) => `
    <button class="tab-btn ${idx === 0 ? "active" : ""}" data-tab="${day.id}">${day.title}</button>
  `).join("");

  panels.innerHTML = WORKOUTS.map((day, idx) => `
    <section class="workout-panel ${idx === 0 ? "active" : ""}" id="${day.id}">
      <p>${day.note}</p>
      <table class="exercise-table">
        <thead>
          <tr>
            <th>Exercise</th>
            <th>Weight</th>
            <th>Done</th>
            <th>Actual</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${day.exercises.map(([name, planned], rowIdx) => {
            const row = state.workouts[day.id][rowIdx];
            return `
              <tr>
                <td>
                  <div class="exercise-name">${name}</div>
                  <div class="exercise-plan">Planned: ${planned}</div>
                </td>
                <td><input type="text" data-w="${day.id}.${rowIdx}.wt" value="${escapeValue(row.wt)}" placeholder="lb"></td>
                <td class="done-cell"><input type="checkbox" data-w="${day.id}.${rowIdx}.done" ${row.done ? "checked" : ""}></td>
                <td><input type="text" data-w="${day.id}.${rowIdx}.actual" value="${escapeValue(row.actual)}" placeholder="What you did"></td>
                <td><input type="text" data-w="${day.id}.${rowIdx}.notes" value="${escapeValue(row.notes)}" placeholder="How it felt"></td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </section>
  `).join("");

  tabList.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      tabList.querySelectorAll(".tab-btn").forEach((other) => other.classList.toggle("active", other === btn));
      panels.querySelectorAll(".workout-panel").forEach((panel) => panel.classList.toggle("active", panel.id === tab));
    });
  });

  panels.querySelectorAll("[data-w]").forEach((input) => {
    const key = input.dataset.w;
    const [dayId, rowIdxRaw, field] = key.split(".");
    const rowIdx = Number(rowIdxRaw);
    const isCheck = field === "done";
    input.addEventListener(isCheck ? "change" : "input", () => {
      state.workouts[dayId][rowIdx][field] = isCheck ? input.checked : input.value;
      saveState();
    });
  });
}

function renderNutritionChecks() {
  const host = document.getElementById("nutritionChecks");
  host.innerHTML = NUTRITION_CHECKS.map((item) => `
    <label class="nutrition-check">
      <input type="checkbox" data-ncheck="${item.id}" ${state.nutrition.checks[item.id] ? "checked" : ""}>
      ${item.label}
    </label>
  `).join("");

  host.querySelectorAll("[data-ncheck]").forEach((input) => {
    input.addEventListener("change", () => {
      state.nutrition.checks[input.dataset.ncheck] = input.checked;
      saveState();
    });
  });
}

function toPct(done, total) {
  if (!total) {
    return 0;
  }
  return Math.round((done / total) * 100);
}

function computeWorkoutStats() {
  let doneRows = 0;
  let totalRows = 0;
  let completedDays = 0;
  const byDay = [];

  WORKOUTS.forEach((day) => {
    const rows = state.workouts[day.id];
    const dayDone = rows.filter((row) => row.done).length;
    const dayTotal = rows.length;
    const dayPct = toPct(dayDone, dayTotal);
    doneRows += dayDone;
    totalRows += dayTotal;
    if (dayDone === dayTotal) {
      completedDays += 1;
    }
    byDay.push({
      label: day.title.split(":")[0],
      pct: dayPct,
      done: dayDone,
      total: dayTotal
    });
  });

  return {
    pct: toPct(doneRows, totalRows),
    completedDays,
    byDay
  };
}

function computeHabitStats() {
  const values = DAYS.map((day) => Boolean(state.habits[day]));
  const checked = values.filter(Boolean).length;

  let streak = 0;
  for (let i = 0; i < values.length; i += 1) {
    if (values[i]) {
      streak += 1;
    } else {
      streak = 0;
    }
  }

  return {
    pct: toPct(checked, values.length),
    streak
  };
}

function computeNutritionStats() {
  const values = NUTRITION_CHECKS.map((item) => Boolean(state.nutrition.checks[item.id]));
  const checked = values.filter(Boolean).length;
  return {
    pct: toPct(checked, values.length)
  };
}

function renderAnalytics() {
  const ring = document.getElementById("overallRing");
  if (!ring) {
    return;
  }

  const workout = computeWorkoutStats();
  const habits = computeHabitStats();
  const nutrition = computeNutritionStats();
  const weeklyGoal = Number(state.profile.weeklyGoal || 3);
  const goalDaysPct = toPct(Math.min(workout.completedDays, weeklyGoal), weeklyGoal);
  const overallPct = Math.round((goalDaysPct + habits.pct + nutrition.pct) / 3);

  ring.style.setProperty("--pct", `${overallPct}%`);
  document.getElementById("overallPct").textContent = `${overallPct}%`;
  document.getElementById("overallText").textContent = overallPct >= 80
    ? "Excellent consistency this week. Keep your momentum."
    : "Build consistency with one small win each day.";
  document.getElementById("daysCompleted").textContent = String(workout.completedDays);
  document.getElementById("daysGoal").textContent = String(weeklyGoal);
  document.getElementById("habitStreak").textContent = String(habits.streak);

  const bars = [
    ["Workout goal", goalDaysPct],
    ["Daily habits", habits.pct],
    ["Nutrition checks", nutrition.pct]
  ];

  document.getElementById("analyticsBars").innerHTML = bars.map(([label, pct]) => `
    <div class="bar-row">
      <span class="bar-label">${label}</span>
      <div class="bar-track"><div class="bar-fill" style="width: ${pct}%"></div></div>
      <span class="bar-value">${pct}%</span>
    </div>
  `).join("");

  document.getElementById("workoutDayBars").innerHTML = workout.byDay.map((day) => `
    <div class="bar-row">
      <span class="bar-label">${day.label} (${day.done}/${day.total})</span>
      <div class="bar-track"><div class="bar-fill" style="width: ${day.pct}%"></div></div>
      <span class="bar-value">${day.pct}%</span>
    </div>
  `).join("");
}

function escapeValue(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function bindBaseFields() {
  bindField("name", "profile.name");
  bindField("weekOf", "profile.weekOf");
  bindField("weeklyGoal", "profile.weeklyGoal");
  bindField("weeklyNotes", "profile.weeklyNotes");

  bindField("bodyWeight", "nutrition.bodyWeight");
  bindField("proteinGoal", "nutrition.proteinGoal");
  bindField("waterGoal", "nutrition.waterGoal");
  bindField("mealBreakfast", "nutrition.mealBreakfast");
  bindField("mealLunch", "nutrition.mealLunch");
  bindField("mealDinner", "nutrition.mealDinner");
  bindField("mealSnacks", "nutrition.mealSnacks");
}

function setupReset() {
  document.getElementById("resetBtn").addEventListener("click", () => {
    const ok = window.confirm("Reset this week's tracker? This cannot be undone.");
    if (!ok) {
      return;
    }
    state = defaultState();
    saveState();
    window.location.reload();
  });
}

function setupSwitchUser() {
  document.getElementById("switchUserBtn").addEventListener("click", () => {
    localStorage.removeItem(ACTIVE_USER_KEY);
    window.location.reload();
  });
}

function renderKnownUsers() {
  const host = document.getElementById("userPills");
  const users = getUsers();
  if (!users.length) {
    host.innerHTML = "";
    return;
  }

  host.innerHTML = users.map((user) => `<button class="user-pill" type="button" data-user-id="${escapeValue(user.id)}">${escapeValue(user.display)}</button>`).join("");
  host.querySelectorAll("[data-user-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const userId = button.dataset.userId;
      localStorage.setItem(ACTIVE_USER_KEY, userId);
      window.location.reload();
    });
  });
}

function setupAuth() {
  const gate = document.getElementById("authGate");
  const tracker = document.getElementById("trackerApp");
  const remembered = normalizeUserId(localStorage.getItem(ACTIVE_USER_KEY) || "");

  renderKnownUsers();

  document.getElementById("loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const usernameInput = document.getElementById("usernameInput");
    const status = document.getElementById("authStatus");
    const username = sanitizeDisplayName(usernameInput.value);
    const user = upsertUser(username);
    if (!user) {
      status.textContent = "Enter a valid username.";
      return;
    }

    localStorage.setItem(ACTIVE_USER_KEY, user.id);
    window.location.reload();
  });

  if (!remembered) {
    gate.classList.remove("hidden");
    tracker.classList.add("hidden");
    return;
  }

  activeUserId = remembered;
  state = loadState();
  if (!state.profile.name) {
    state.profile.name = getDisplayNameForUserId(activeUserId);
  }

  document.getElementById("activeUserLabel").textContent = getDisplayNameForUserId(activeUserId);
  gate.classList.add("hidden");
  tracker.classList.remove("hidden");
}

function initTracker() {
  bindBaseFields();
  renderHabits();
  renderWorkoutTables();
  renderNutritionChecks();
  renderAnalytics();
  setupReset();
  setupSwitchUser();
}

function init() {
  setupAuth();
  if (!activeUserId) {
    return;
  }
  initTracker();
}

init();
