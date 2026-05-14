import { cloudAuth } from "./auth.js";

const STORAGE_KEY = "name-chant-state";
const LEGACY_STORAGE_KEY = "naam-jap-state";

const elements = {
  count: document.querySelector("#countDisplay"),
  round: document.querySelector("#roundDisplay"),
  remaining: document.querySelector("#remainingDisplay"),
  progress: document.querySelector("#progressFill"),
  malaRing: document.querySelector("#malaRing"),
  mantraInput: document.querySelector("#mantraInput"),
  mantraPreview: document.querySelector("#mantraPreview"),
  targetInput: document.querySelector("#targetInput"),
  dailyGoalInput: document.querySelector("#dailyGoalInput"),
  themeSelect: document.querySelector("#themeSelect"),
  nameSelect: document.querySelector("#nameSelect"),
  newNameInput: document.querySelector("#newNameInput"),
  addNameButton: document.querySelector("#addNameButton"),
  japButton: document.querySelector("#japButton"),
  minusButton: document.querySelector("#minusButton"),
  resetButton: document.querySelector("#resetButton"),
  soundToggle: document.querySelector("#soundToggle"),
  lifetimeTotal: document.querySelector("#lifetimeTotal"),
  todayTotal: document.querySelector("#todayTotal"),
  bestDayTotal: document.querySelector("#bestDayTotal"),
  recordList: document.querySelector("#recordList"),
  achievementList: document.querySelector("#achievementList"),
  nextAchievement: document.querySelector("#nextAchievement"),
  dailyGoalText: document.querySelector("#dailyGoalText"),
  dailyGoalFill: document.querySelector("#dailyGoalFill"),
  streakTotal: document.querySelector("#streakTotal"),
  sessionTime: document.querySelector("#sessionTime"),
  chantSpeed: document.querySelector("#chantSpeed"),
  levelName: document.querySelector("#levelName"),
  sessionToggle: document.querySelector("#sessionToggle"),
  exportButton: document.querySelector("#exportButton"),
  csvButton: document.querySelector("#csvButton"),
  importInput: document.querySelector("#importInput"),
  beadGrid: document.querySelector("#beadGrid"),
  beadText: document.querySelector("#beadText"),
  calendarGrid: document.querySelector("#calendarGrid"),
  calendarMonth: document.querySelector("#calendarMonth"),
  noteInput: document.querySelector("#noteInput"),
  quoteText: document.querySelector("#quoteText"),
  nameTotalsList: document.querySelector("#nameTotalsList"),
  activeNameTotal: document.querySelector("#activeNameTotal"),
  reminderTimeInput: document.querySelector("#reminderTimeInput"),
  reminderToggle: document.querySelector("#reminderToggle"),
  reminderStatus: document.querySelector("#reminderStatus"),
  volumeInput: document.querySelector("#volumeInput"),
  ambientToggle: document.querySelector("#ambientToggle"),
  achievementToast: document.querySelector("#achievementToast"),
  authEmail: document.querySelector("#authEmail"),
  authPassword: document.querySelector("#authPassword"),
  signInButton: document.querySelector("#signInButton"),
  signUpButton: document.querySelector("#signUpButton"),
  signOutButton: document.querySelector("#signOutButton"),
  authStatus: document.querySelector("#authStatus"),
  authHelp: document.querySelector("#authHelp"),
};

let state = {
  count: 0,
  target: 108,
  dailyGoal: 108,
  mantra: "Ram",
  names: ["Ram", "Krishna", "Radha", "Shiva", "Durga"],
  activeName: "Ram",
  nameTotals: {},
  theme: "calm",
  sound: true,
  volume: 70,
  ambient: false,
  totalChants: 0,
  records: {},
  notes: {},
  unlockedAchievements: [],
  reminder: {
    enabled: false,
    time: "",
    lastShown: "",
  },
  session: {
    startedAt: Date.now(),
    elapsed: 0,
    chants: 0,
    running: true,
  },
};

const achievements = [
  { at: 100, name: "It's Century" },
  { at: 500, name: "Five Hundred Focus" },
  { at: 1000, name: "Thousand Steps" },
  { at: 5000, name: "Deep Practice" },
  { at: 10000, name: "Ten Thousand Glow" },
  { at: 25000, name: "Devotion Builder" },
  { at: 50000, name: "Sacred Rhythm" },
  { at: 100000, name: "One Lakh Legend" },
  { at: 250000, name: "Quarter Million Calm" },
  { at: 500000, name: "Half Million Harmony" },
  { at: 1000000, name: "Million Chant Master" },
  { at: 2500000, name: "2.5 Million Milestone" },
  { at: 5000000, name: "Five Million Flame" },
  { at: 10000000, name: "Ten Million Triumph" },
];

const levels = [
  { at: 0, name: "Beginner" },
  { at: 500, name: "Seeker" },
  { at: 5000, name: "Devotee" },
  { at: 50000, name: "Dedicated" },
  { at: 500000, name: "Master" },
  { at: 1000000, name: "Legend" },
  { at: 10000000, name: "Eternal" },
];

const quotes = [
  "Small daily chants become a strong inner rhythm.",
  "One focused chant is already a return to peace.",
  "Consistency is devotion made visible.",
  "Let the count rise, but keep the heart soft.",
  "A calm breath makes every name brighter.",
];

let toastTimer;
let ambientContext;
let ambientOscillator;
let ambientGain;
let cloudSyncReady = false;
let cloudSaveTimer;

const save = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  queueCloudSave();
};

const queueCloudSave = () => {
  if (!cloudSyncReady || !cloudAuth.user()) return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(async () => {
    try {
      await cloudAuth.saveState(state);
      elements.authStatus.textContent = `Synced: ${cloudAuth.user().email}`;
    } catch (error) {
      elements.authStatus.textContent = "Sync failed";
      elements.authHelp.textContent = error.message || "Cloud sync failed.";
    }
  }, 700);
};

const todayKey = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const formatNumber = (value) => new Intl.NumberFormat("en-IN").format(value || 0);

const formatDate = (dateKey) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const secondsToClock = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
};

const cleanName = (value) => value.replace(/[^a-zA-Z0-9 .-]/g, "").trim().slice(0, 32);

const freshSession = () => ({
  startedAt: Date.now(),
  elapsed: 0,
  chants: 0,
  running: true,
});

const getSessionSeconds = () => {
  const live = state.session.running ? Math.floor((Date.now() - state.session.startedAt) / 1000) : 0;
  return state.session.elapsed + live;
};

const ensureStateShape = () => {
  if (!Array.isArray(state.names) || !state.names.length) state.names = ["Ram"];
  state.names = state.names.map((name) => cleanName(String(name))).filter(Boolean);
  if (!state.names.length) state.names = ["Ram"];
  state.activeName = cleanName(String(state.activeName || state.mantra || state.names[0])) || state.names[0];
  if (!state.names.includes(state.activeName)) state.names.unshift(state.activeName);
  if (!state.nameTotals || typeof state.nameTotals !== "object") state.nameTotals = {};
  if (!state.records || typeof state.records !== "object") state.records = {};
  if (!state.notes || typeof state.notes !== "object") state.notes = {};
  if (!Array.isArray(state.unlockedAchievements)) state.unlockedAchievements = [];
  if (!state.dailyGoal) state.dailyGoal = 108;
  if (!state.volume && state.volume !== 0) state.volume = 70;
  if (!state.reminder || typeof state.reminder !== "object") {
    state.reminder = { enabled: false, time: "", lastShown: "" };
  }
  if (!state.session || typeof state.session !== "object") {
    state.session = { startedAt: Date.now(), elapsed: 0, chants: 0, running: true };
  }
  if (!state.totalChants && state.count > 0) state.totalChants = state.count;
  if (!state.nameTotals[state.activeName]) state.nameTotals[state.activeName] = 0;
  state.mantra = state.activeName;
};

const applyCloudState = (cloudState) => {
  if (!cloudState || typeof cloudState !== "object") return;
  state = { ...state, ...cloudState };
  ensureStateShape();
  state.session = freshSession();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
};

const setAuthUi = (user) => {
  const signedIn = Boolean(user);
  elements.authEmail.parentElement.hidden = signedIn;
  elements.authPassword.parentElement.hidden = signedIn;
  elements.signInButton.hidden = signedIn;
  elements.signUpButton.hidden = signedIn;
  elements.signOutButton.hidden = !signedIn;
  elements.authStatus.textContent = signedIn ? `Signed in: ${user.email}` : "Not signed in";
  elements.authHelp.textContent = signedIn
    ? "Your records sync to your account."
    : "Sign in to keep records across devices.";
};

const setupAuth = async () => {
  const result = await cloudAuth.init(async (user) => {
    cloudSyncReady = Boolean(user);
    setAuthUi(user);

    if (!user) return;

    try {
      const cloudState = await cloudAuth.loadState();
      if (cloudState) {
        applyCloudState(cloudState);
        showToast("Account records loaded");
      } else {
        await cloudAuth.saveState(state);
        showToast("Local records saved to account");
      }
    } catch (error) {
      elements.authStatus.textContent = "Cloud load failed";
      elements.authHelp.textContent = error.message || "Could not load account records.";
    }
  });

  if (!result.enabled) {
    elements.authStatus.textContent = "Local mode";
    elements.authHelp.textContent = result.message;
    elements.signInButton.disabled = true;
    elements.signUpButton.disabled = true;
  }
};

const load = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY));
    if (saved) state = { ...state, ...saved };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  ensureStateShape();
  state.session = freshSession();
};

const playBell = () => {
  if (!state.sound) return;

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const volume = Math.max(state.volume, 0) / 100;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(660, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(440, context.currentTime + 0.32);
  gain.gain.setValueAtTime(0.001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.22 * volume, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.42);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.45);
};

const updateAmbient = () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  if (state.ambient && !ambientContext) {
    ambientContext = new AudioContext();
    ambientOscillator = ambientContext.createOscillator();
    ambientGain = ambientContext.createGain();
    ambientOscillator.type = "sine";
    ambientOscillator.frequency.value = 136.1;
    ambientGain.gain.value = 0.018 * (state.volume / 100);
    ambientOscillator.connect(ambientGain);
    ambientGain.connect(ambientContext.destination);
    ambientOscillator.start();
  }

  if (ambientGain) ambientGain.gain.value = state.ambient ? 0.018 * (state.volume / 100) : 0;
};

const normalizedTarget = () => {
  const value = Number.parseInt(elements.targetInput.value, 10);
  return Number.isFinite(value) ? Math.min(Math.max(value, 1), 1008) : 108;
};

const normalizedDailyGoal = () => {
  const value = Number.parseInt(elements.dailyGoalInput.value, 10);
  return Number.isFinite(value) ? Math.min(Math.max(value, 1), 1000000) : 108;
};

const recordEntries = () =>
  Object.entries(state.records)
    .filter(([, total]) => total > 0)
    .sort(([firstDate], [secondDate]) => secondDate.localeCompare(firstDate));

const calculateStreak = () => {
  let streak = 0;
  const cursor = new Date();

  while (true) {
    const key = new Date(cursor.getTime() - cursor.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    if (!state.records[key]) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

const currentLevel = () =>
  levels.reduce((current, level) => (state.totalChants >= level.at ? level : current), levels[0]);

const showToast = (message) => {
  elements.achievementToast.textContent = message;
  elements.achievementToast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.achievementToast.classList.remove("is-visible"), 4200);
};

const checkAchievements = () => {
  achievements.forEach((achievement) => {
    if (state.totalChants >= achievement.at && !state.unlockedAchievements.includes(achievement.at)) {
      state.unlockedAchievements.push(achievement.at);
      showToast(`Achievement unlocked: ${achievement.name}`);
    }
  });
};

const renderNames = () => {
  elements.nameSelect.innerHTML = state.names
    .map((name) => `<option value="${name}">${name}</option>`)
    .join("");
  elements.nameSelect.value = state.activeName;
};

const renderCalendar = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const maxDay = Math.max(...Object.entries(state.records)
    .filter(([date]) => date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`))
    .map(([, total]) => total), 1);
  const blanks = Array.from({ length: first.getDay() }, () => `<span class="calendar-day is-empty"></span>`);
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const total = state.records[key] || 0;
    const strength = total ? Math.max(0.18, total / maxDay) : 0;
    return `
      <span class="calendar-day" title="${formatDate(key)}: ${formatNumber(total)} chants" style="--strength:${strength}">
        <b>${day}</b>
        <small>${total ? formatNumber(total) : ""}</small>
      </span>
    `;
  });

  elements.calendarMonth.textContent = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  elements.calendarGrid.innerHTML = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    .map((day) => `<span class="calendar-label">${day}</span>`)
    .concat(blanks, days)
    .join("");
};

const renderBeads = (shownCycleCount, target) => {
  const beadCount = Math.min(target, 108);
  elements.beadText.textContent = `${formatNumber(shownCycleCount)} / ${formatNumber(target)}`;
  elements.beadGrid.innerHTML = Array.from({ length: beadCount }, (_, index) => {
    const lit = index < Math.min(shownCycleCount, beadCount);
    return `<span class="bead ${lit ? "is-lit" : ""}"></span>`;
  }).join("");
};

const renderReminder = () => {
  elements.reminderTimeInput.value = state.reminder.time || "";
  elements.reminderToggle.textContent = state.reminder.enabled ? "Disable reminder" : "Enable reminder";
  elements.reminderStatus.textContent = state.reminder.enabled && state.reminder.time
    ? `Reminder at ${state.reminder.time}`
    : "Reminder off";
};

const render = () => {
  ensureStateShape();

  const target = Math.max(state.target, 1);
  const today = todayKey();
  const todayTotal = state.records[today] || 0;
  const cycleCount = state.count % target;
  const shownCycleCount = cycleCount === 0 && state.count > 0 ? target : cycleCount;
  const progressPercent = (shownCycleCount / target) * 100;
  const dailyPercent = Math.min((todayTotal / state.dailyGoal) * 100, 100);
  const round = Math.floor(state.count / target) + 1;
  const remaining = target - shownCycleCount;
  const entries = recordEntries();
  const bestDay = entries.reduce((best, [, total]) => Math.max(best, total), 0);
  const nextAchievement = achievements.find((achievement) => state.totalChants < achievement.at);
  const seconds = getSessionSeconds();
  const speed = seconds > 0 ? Math.round((state.session.chants / seconds) * 60) : 0;

  renderNames();
  renderBeads(shownCycleCount, target);
  renderCalendar();
  renderReminder();

  elements.count.textContent = formatNumber(state.count);
  elements.round.textContent = `Round ${formatNumber(round)}`;
  elements.remaining.textContent = remaining === 0 ? 0 : formatNumber(remaining);
  elements.progress.style.width = `${progressPercent}%`;
  elements.malaRing.style.setProperty("--progress", `${progressPercent * 3.6}deg`);
  elements.mantraPreview.textContent = state.mantra.trim() || "Name";
  elements.mantraInput.value = state.mantra;
  elements.targetInput.value = target;
  elements.dailyGoalInput.value = state.dailyGoal;
  elements.themeSelect.value = state.theme;
  elements.soundToggle.setAttribute("aria-pressed", String(state.sound));
  elements.soundToggle.setAttribute("aria-label", state.sound ? "Sound on" : "Sound off");
  elements.volumeInput.value = state.volume;
  elements.ambientToggle.checked = state.ambient;
  elements.lifetimeTotal.textContent = formatNumber(state.totalChants);
  elements.todayTotal.textContent = `Today: ${formatNumber(todayTotal)}`;
  elements.bestDayTotal.textContent = formatNumber(bestDay);
  elements.dailyGoalText.textContent = `${formatNumber(todayTotal)} / ${formatNumber(state.dailyGoal)}`;
  elements.dailyGoalFill.style.width = `${dailyPercent}%`;
  elements.streakTotal.textContent = formatNumber(calculateStreak());
  elements.sessionTime.textContent = secondsToClock(seconds);
  elements.chantSpeed.textContent = formatNumber(speed);
  elements.levelName.textContent = currentLevel().name;
  elements.sessionToggle.textContent = state.session.running ? "Pause timer" : "Resume timer";
  elements.nextAchievement.textContent = nextAchievement ? `Next: ${formatNumber(nextAchievement.at)}` : "All unlocked";
  elements.noteInput.value = state.notes[today] || "";
  elements.quoteText.textContent = quotes[new Date().getDate() % quotes.length];
  elements.activeNameTotal.textContent = `${state.activeName}: ${formatNumber(state.nameTotals[state.activeName] || 0)}`;
  document.body.dataset.theme = state.theme;

  elements.recordList.innerHTML = entries.length
    ? entries.slice(0, 30).map(([date, total]) => `
        <div class="record-item">
          <span>${formatDate(date)}</span>
          <strong>${formatNumber(total)}</strong>
        </div>
      `).join("")
    : `<p class="empty-state">No daily records yet.</p>`;

  elements.nameTotalsList.innerHTML = state.names
    .map((name) => `
      <div class="record-item">
        <span>${name}</span>
        <strong>${formatNumber(state.nameTotals[name] || 0)}</strong>
      </div>
    `).join("");

  elements.achievementList.innerHTML = achievements
    .map((achievement) => {
      const unlocked = state.totalChants >= achievement.at;
      const progress = Math.min((state.totalChants / achievement.at) * 100, 100);

      return `
        <div class="achievement-item ${unlocked ? "is-unlocked" : ""}">
          <div>
            <strong>${achievement.name}</strong>
            <span>${formatNumber(achievement.at)} lifetime chants</span>
          </div>
          <span class="achievement-badge">${unlocked ? "Unlocked" : `${Math.floor(progress)}%`}</span>
        </div>
      `;
    })
    .join("");
};

const increment = () => {
  const today = todayKey();

  state.count += 1;
  state.totalChants += 1;
  state.session.chants += 1;
  state.records[today] = (state.records[today] || 0) + 1;
  state.nameTotals[state.activeName] = (state.nameTotals[state.activeName] || 0) + 1;
  checkAchievements();
  playBell();
  render();
  save();
};

const removeOne = () => {
  const today = todayKey();

  state.count = Math.max(0, state.count - 1);
  if (state.totalChants > 0 && (state.records[today] || 0) > 0) {
    state.totalChants -= 1;
    state.records[today] -= 1;
    state.session.chants = Math.max(0, state.session.chants - 1);
    state.nameTotals[state.activeName] = Math.max(0, (state.nameTotals[state.activeName] || 0) - 1);
  }
  render();
  save();
};

const exportData = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `chant-tracker-backup-${todayKey()}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

const exportCsv = () => {
  const rows = [["Date", "Chants", "Note"]];
  recordEntries().reverse().forEach(([date, total]) => {
    rows.push([date, total, state.notes[date] || ""]);
  });
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `chant-records-${todayKey()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const importData = (file) => {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      state = { ...state, ...imported };
      ensureStateShape();
      state.session = freshSession();
      render();
      save();
      showToast("Backup imported successfully");
    } catch {
      showToast("Import failed: invalid backup file");
    }
  };
  reader.readAsText(file);
};

const requestReminderPermission = async () => {
  if (!("Notification" in window)) {
    showToast("Browser notifications are not supported here");
    return false;
  }

  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") {
    showToast("Notifications are blocked in this browser");
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
};

const checkReminder = () => {
  if (!state.reminder.enabled || !state.reminder.time) return;

  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const today = todayKey();
  if (time === state.reminder.time && state.reminder.lastShown !== today) {
    state.reminder.lastShown = today;
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Time to chant", { body: `Continue your ${state.activeName} practice.` });
    } else {
      showToast("Reminder: time to chant");
    }
    save();
  }
};

elements.japButton.addEventListener("click", increment);
elements.minusButton.addEventListener("click", removeOne);

elements.resetButton.addEventListener("click", () => {
  state.count = 0;
  render();
  save();
});

elements.mantraInput.addEventListener("change", (event) => {
  const value = cleanName(event.target.value) || "Name";
  state.activeName = value;
  state.mantra = value;
  if (!state.names.includes(value)) state.names.push(value);
  if (!state.nameTotals[value]) state.nameTotals[value] = 0;
  render();
  save();
});

elements.nameSelect.addEventListener("change", (event) => {
  state.activeName = event.target.value;
  state.mantra = state.activeName;
  render();
  save();
});

elements.addNameButton.addEventListener("click", () => {
  const value = cleanName(elements.newNameInput.value);
  if (!value) return;
  if (!state.names.includes(value)) state.names.push(value);
  state.activeName = value;
  state.mantra = value;
  state.nameTotals[value] = state.nameTotals[value] || 0;
  elements.newNameInput.value = "";
  render();
  save();
});

elements.targetInput.addEventListener("change", () => {
  state.target = normalizedTarget();
  render();
  save();
});

elements.dailyGoalInput.addEventListener("change", () => {
  state.dailyGoal = normalizedDailyGoal();
  render();
  save();
});

elements.themeSelect.addEventListener("change", (event) => {
  state.theme = event.target.value;
  render();
  save();
});

elements.soundToggle.addEventListener("click", () => {
  state.sound = !state.sound;
  render();
  save();
});

elements.sessionToggle.addEventListener("click", () => {
  if (state.session.running) {
    state.session.elapsed = getSessionSeconds();
    state.session.running = false;
  } else {
    state.session.startedAt = Date.now();
    state.session.running = true;
  }
  render();
  save();
});

elements.exportButton.addEventListener("click", exportData);
elements.csvButton.addEventListener("click", exportCsv);
elements.importInput.addEventListener("change", (event) => importData(event.target.files[0]));

elements.noteInput.addEventListener("input", (event) => {
  state.notes[todayKey()] = event.target.value;
  save();
});

elements.volumeInput.addEventListener("input", (event) => {
  state.volume = Number.parseInt(event.target.value, 10);
  updateAmbient();
  save();
});

elements.ambientToggle.addEventListener("change", (event) => {
  state.ambient = event.target.checked;
  updateAmbient();
  save();
});

elements.reminderTimeInput.addEventListener("change", (event) => {
  state.reminder.time = event.target.value;
  render();
  save();
});

elements.reminderToggle.addEventListener("click", async () => {
  if (!state.reminder.enabled) {
    const allowed = await requestReminderPermission();
    if (!allowed) return;
    state.reminder.enabled = true;
  } else {
    state.reminder.enabled = false;
  }
  render();
  save();
});

elements.signInButton.addEventListener("click", async () => {
  try {
    elements.authStatus.textContent = "Signing in...";
    await cloudAuth.signIn(elements.authEmail.value.trim(), elements.authPassword.value);
  } catch (error) {
    elements.authStatus.textContent = "Sign in failed";
    elements.authHelp.textContent = error.message || "Could not sign in.";
  }
});

elements.signUpButton.addEventListener("click", async () => {
  try {
    elements.authStatus.textContent = "Creating account...";
    await cloudAuth.signUp(elements.authEmail.value.trim(), elements.authPassword.value);
  } catch (error) {
    elements.authStatus.textContent = "Sign up failed";
    elements.authHelp.textContent = error.message || "Could not create account.";
  }
});

elements.signOutButton.addEventListener("click", async () => {
  try {
    await cloudAuth.signOut();
    cloudSyncReady = false;
    showToast("Signed out");
  } catch (error) {
    elements.authStatus.textContent = "Sign out failed";
    elements.authHelp.textContent = error.message || "Could not sign out.";
  }
});

document.addEventListener("keydown", (event) => {
  const isTyping = ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName);
  if (isTyping) return;

  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    increment();
  }
});

load();
render();
setupAuth();
setInterval(() => {
  if (state.session.running) render();
  checkReminder();
}, 1000);
