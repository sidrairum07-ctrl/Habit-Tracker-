/**
 * Aesthetic Habit Tracker & Daily To-Do Planner
 * Includes Features:
 *  1. PWA Service Worker
 *  2. Mini-Notes (Right-click cell or tap ✎)
 *  3. Twilight Night Mode Theme
 *  5. This Week vs Full Month Scope
 */

(function () {
  'use strict';

  // --- 1. REARRANGED 21 HABITS ---
  const HABITS = [
    { id: 'fajr', name: 'Fajr' },
    { id: 'morning_duas', name: 'Morning Duas' },
    { id: 'quran_tilawah', name: 'Quran Tilawah' },
    { id: 'daily_dhikr', name: 'Daily Dhikr' },
    { id: 'exercise', name: 'Exercise (15-20mins)' },
    { id: 'zuhur', name: 'Zuhur' },
    { id: 'evening_duas', name: 'Evening Duas' },
    { id: 'asr', name: 'Asr' },
    { id: 'dsa', name: 'DSA' },
    { id: 'roadmap', name: 'Roadmap' },
    { id: 'maghrib', name: 'Maghrib' },
    { id: 'academics', name: 'Academics' },
    { id: 'clean_tidy', name: 'Clean/Tidy Something' },
    { id: 'isha', name: 'Isha' },
    { id: 'no_junk_food', name: 'No Junk Food' },
    { id: 'no_music', name: 'No Music' },
    { id: 'limit_screentime', name: 'Limit Screentime' },
    { id: 'read_10mins', name: 'Read - 10 mins' },
    { id: 'write_journal', name: 'Write Journal Basic' },
    { id: 'skincare', name: 'Skincare' },
    { id: 'sleep', name: 'Sleep (6-7 hrs)' }
  ];

  const MONTH_NAMES = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // --- 2. STATE ---
  const today = new Date();
  let currentYear = today.getFullYear();
  let currentMonth = today.getMonth(); // 0-indexed
  let selectedDailyDate = formatDateKey(today); // 'YYYY-MM-DD'
  let gridScope = 'month'; // 'month' or 'week'
  let currentTheme = 'linen'; // 'linen' or 'twilight'
  let soundEnabled = true;

  // Active dialog context
  let activeNoteContext = { dateKey: null, habitId: null };

  // Data storage
  let trackerData = {}; // { dateKey: { habitId: 1 | 2 } }
  let journalData = {}; // { dateKey: "text" }
  let notesData = {};   // { dateKey: { habitId: "note text" } }

  const STORAGE_KEY = 'bullet_tracker_data_v4';
  const JOURNAL_KEY = 'bullet_journal_data_v4';
  const NOTES_KEY = 'bullet_notes_data_v4';
  const SOUND_KEY = 'bullet_tracker_sound_v4';
  const THEME_KEY = 'bullet_theme_v4';

  // --- 3. INIT ---
  function init() {
    loadFromLocalStorage();
    initTheme();
    setupEventListeners();
    setupNoteDialog();
    updateMonthDisplay();
    renderMonthlyGrid();
    setupDailyView();
    renderDailyView();
    renderStatsView();
    registerServiceWorker();
  }

  // Feature 1: PWA Service Worker
  function registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./service-worker.js').catch(() => {});
    }
  }

  function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseDateKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function loadFromLocalStorage() {
    try {
      const savedTracker = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('bullet_tracker_data_v3');
      if (savedTracker) trackerData = JSON.parse(savedTracker);

      const savedJournals = localStorage.getItem(JOURNAL_KEY) || localStorage.getItem('bullet_journal_data_v3');
      if (savedJournals) journalData = JSON.parse(savedJournals);

      const savedNotes = localStorage.getItem(NOTES_KEY);
      if (savedNotes) notesData = JSON.parse(savedNotes);

      const savedSound = localStorage.getItem(SOUND_KEY);
      if (savedSound !== null) soundEnabled = savedSound === 'true';

      const savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme) currentTheme = savedTheme;
    } catch (e) {
      console.warn('Storage parse error:', e);
    }
  }

  function saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trackerData));
    } catch (e) {}
  }

  function saveJournalToLocalStorage() {
    try {
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(journalData));
    } catch (e) {}
  }

  function saveNotesToLocalStorage() {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notesData));
    } catch (e) {}
  }

  // Feature 3: Theme Management
  function initTheme() {
    applyTheme(currentTheme);
  }

  function applyTheme(theme) {
    currentTheme = theme;
    if (theme === 'twilight') {
      document.documentElement.setAttribute('data-theme', 'twilight');
      document.getElementById('themeIcon').textContent = '☀️';
      document.getElementById('themeLabel').textContent = 'Linen';
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.getElementById('themeIcon').textContent = '🌙';
      document.getElementById('themeLabel').textContent = 'Twilight';
    }
    localStorage.setItem(THEME_KEY, currentTheme);
  }

  function toggleTheme() {
    applyTheme(currentTheme === 'twilight' ? 'linen' : 'twilight');
  }

  // Audio synthesizer
  function playTickSound(isTick) {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      if (isTick) {
        osc.frequency.setValueAtTime(680, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      } else {
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(240, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    } catch (e) {}
  }

  function getCellState(dateKey, habitId) {
    if (!trackerData[dateKey]) return 0;
    return trackerData[dateKey][habitId] || 0;
  }

  function setCellState(dateKey, habitId, state) {
    if (!trackerData[dateKey]) trackerData[dateKey] = {};
    if (state === 0) {
      delete trackerData[dateKey][habitId];
      if (Object.keys(trackerData[dateKey]).length === 0) delete trackerData[dateKey];
    } else {
      trackerData[dateKey][habitId] = state;
    }
    saveToLocalStorage();
    onDataUpdated();
  }

  function getCellNote(dateKey, habitId) {
    if (!notesData[dateKey]) return '';
    return notesData[dateKey][habitId] || '';
  }

  function setCellNote(dateKey, habitId, noteText) {
    const trimmed = (noteText || '').trim();
    if (!notesData[dateKey]) notesData[dateKey] = {};
    if (!trimmed) {
      delete notesData[dateKey][habitId];
      if (Object.keys(notesData[dateKey]).length === 0) delete notesData[dateKey];
    } else {
      notesData[dateKey][habitId] = trimmed;
    }
    saveNotesToLocalStorage();
    onDataUpdated();
  }

  function onDataUpdated() {
    renderMonthlyGrid();
    renderDailyView();
    renderStatsView();
    updateTodayBadge();
  }

  function cycleHabitState(dateKey, habitId) {
    const current = getCellState(dateKey, habitId);
    let next = 0;
    if (current === 0) next = 1;
    else if (current === 1) next = 2;
    else next = 0;

    setCellState(dateKey, habitId, next);

    if (next === 1) playTickSound(true);
    else if (next === 2) playTickSound(false);
  }

  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  // Feature 5: Get 7 days for "This Week" mode
  function getDaysForCurrentScope() {
    if (gridScope === 'month') {
      const daysCount = getDaysInMonth(currentYear, currentMonth);
      const days = [];
      for (let d = 1; d <= daysCount; d++) {
        days.push(new Date(currentYear, currentMonth, d));
      }
      return days;
    } else {
      // Week mode: Find Monday of selected date's week
      const target = parseDateKey(selectedDailyDate);
      const dayOfWeek = target.getDay(); // 0 is Sun, 1 is Mon
      const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(target);
      monday.setDate(target.getDate() + diffToMon);

      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        days.push(d);
      }
      return days;
    }
  }

  // --- 4. MONTHLY / WEEKLY GRID VIEW ---
  function updateMonthDisplay() {
    if (gridScope === 'month') {
      const label = `${MONTH_NAMES[currentMonth]} ${currentYear}`;
      document.getElementById('currentMonthYear').textContent = label;
      document.getElementById('sheetDateSubtitle').textContent = label;
    } else {
      const days = getDaysForCurrentScope();
      const first = days[0];
      const last = days[6];
      const firstStr = `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      const lastStr = `${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      const label = `${firstStr} – ${lastStr}`;
      document.getElementById('currentMonthYear').textContent = label.toUpperCase();
      document.getElementById('sheetDateSubtitle').textContent = label.toUpperCase();
    }
  }

  function renderMonthlyGrid() {
    const table = document.getElementById('habitGridTable');
    if (gridScope === 'week') table.classList.add('mode-week');
    else table.classList.remove('mode-week');

    const displayedDays = getDaysForCurrentScope();
    const gridThead = document.getElementById('gridThead');
    const gridTbody = document.getElementById('gridTbody');
    const gridTfoot = document.getElementById('gridTfoot');

    const todayKey = formatDateKey(new Date());

    // 1. THEAD
    let dayNamesHtml = `<th class="habit-col-name" rowspan="2">HABIT (${HABITS.length})</th>`;
    let dayNumsHtml = '';

    displayedDays.forEach(dayDate => {
      const dayOfWeek = dayDate.getDay();
      const initial = DAY_INITIALS[dayOfWeek];
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dateKey = formatDateKey(dayDate);
      const isToday = dateKey === todayKey;

      const colClass = `${isToday ? 'col-today' : ''} ${isWeekend ? 'col-weekend' : ''}`;
      dayNamesHtml += `<th class="habit-col-day ${colClass}">${initial}</th>`;
      dayNumsHtml += `<th class="habit-col-day ${colClass}" data-date="${dateKey}" title="${dayDate.toDateString()}">${dayDate.getDate()}</th>`;
    });

    dayNamesHtml += `<th class="habit-col-total" rowspan="2">DONE</th>`;

    gridThead.innerHTML = `
      <tr class="day-names-row">${dayNamesHtml}</tr>
      <tr class="day-nums-row">${dayNumsHtml}</tr>
    `;

    // 2. TBODY
    let tbodyHtml = '';

    HABITS.forEach((habit, idx) => {
      let rowHtml = `<tr data-habit-id="${habit.id}">`;

      // Sticky habit cell
      rowHtml += `
        <td class="habit-name-cell">
          <div class="habit-title-wrap">
            <span class="habit-number-idx">${String(idx + 1).padStart(2, '0')}.</span>
            <span class="habit-name-text">${habit.name}</span>
          </div>
        </td>
      `;

      let habitTicksInView = 0;

      displayedDays.forEach(dayDate => {
        const dateKey = formatDateKey(dayDate);
        const state = getCellState(dateKey, habit.id);
        const note = getCellNote(dateKey, habit.id);
        const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
        const isToday = dateKey === todayKey;

        if (state === 1) habitTicksInView++;

        let stateClass = '';
        let iconContent = '';
        if (state === 1) {
          stateClass = 'state-tick';
          iconContent = '✓';
        } else if (state === 2) {
          stateClass = 'state-cross';
          iconContent = '✕';
        }

        const noteClass = note ? 'has-note' : '';
        const cellColClass = `${isToday ? 'col-today' : ''} ${isWeekend ? 'col-weekend' : ''}`;
        const tooltipNote = note ? `\n📝 Note: "${note}"` : '\n(Right-click to add note)';

        rowHtml += `
          <td class="${cellColClass}">
            <div class="grid-box ${stateClass} ${noteClass}" 
                 data-date="${dateKey}" 
                 data-habit="${habit.id}" 
                 title="${habit.name} (${dayDate.toLocaleDateString()}): ${state === 1 ? 'Done ✓' : state === 2 ? 'Missed ✕' : 'Unchecked'}${tooltipNote}">
              ${iconContent}
            </div>
          </td>
        `;
      });

      const totalPossible = displayedDays.length;
      const pct = Math.round((habitTicksInView / totalPossible) * 100);
      rowHtml += `
        <td class="habit-row-total" title="${habitTicksInView} of ${totalPossible} (${pct}%)">
          ${habitTicksInView}/${totalPossible}
        </td>
      `;

      rowHtml += '</tr>';
      tbodyHtml += rowHtml;
    });

    gridTbody.innerHTML = tbodyHtml;

    // 3. TFOOT
    let tfootHtml = `<tr><td class="habit-name-cell"><strong>DAILY TOTAL</strong></td>`;
    displayedDays.forEach(dayDate => {
      const dateKey = formatDateKey(dayDate);
      let dayCompleted = 0;
      HABITS.forEach(h => {
        if (getCellState(dateKey, h.id) === 1) dayCompleted++;
      });
      const pct = Math.round((dayCompleted / HABITS.length) * 100);
      const isToday = dateKey === todayKey;

      tfootHtml += `
        <td class="${isToday ? 'col-today' : ''}" title="${dayDate.toLocaleDateString()}: ${dayCompleted}/${HABITS.length} (${pct}%)">
          <div class="daily-summary-score">${dayCompleted}</div>
          <div class="daily-summary-bar">
            <div class="daily-summary-fill" style="width: ${pct}%;"></div>
          </div>
        </td>
      `;
    });
    tfootHtml += `<td class="habit-row-total">-</td></tr>`;
    gridTfoot.innerHTML = tfootHtml;

    // Click & Right-click Handlers
    gridTbody.querySelectorAll('.grid-box').forEach(box => {
      // Left click: Toggle tick / cross
      box.addEventListener('click', function (e) {
        cycleHabitState(this.dataset.date, this.dataset.habit);
      });

      // Feature 2: Right click opens Note Dialog
      box.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        openNoteDialog(this.dataset.date, this.dataset.habit);
      });

      // Mobile long press support for notes
      let pressTimer;
      box.addEventListener('touchstart', function () {
        pressTimer = setTimeout(() => {
          openNoteDialog(box.dataset.date, box.dataset.habit);
        }, 600);
      }, { passive: true });
      box.addEventListener('touchend', function () {
        clearTimeout(pressTimer);
      });
    });
  }

  // --- 5. FEATURE 2: MINI-NOTES DIALOG ---
  function setupNoteDialog() {
    const dialog = document.getElementById('noteDialog');
    const closeBtn = document.getElementById('closeNoteDialogBtn');
    const saveBtn = document.getElementById('saveNoteBtn');
    const deleteBtn = document.getElementById('deleteNoteBtn');
    const input = document.getElementById('noteTextInput');

    closeBtn.addEventListener('click', () => dialog.close());

    saveBtn.addEventListener('click', () => {
      if (activeNoteContext.dateKey && activeNoteContext.habitId) {
        setCellNote(activeNoteContext.dateKey, activeNoteContext.habitId, input.value);
      }
      dialog.close();
    });

    deleteBtn.addEventListener('click', () => {
      if (activeNoteContext.dateKey && activeNoteContext.habitId) {
        setCellNote(activeNoteContext.dateKey, activeNoteContext.habitId, '');
      }
      dialog.close();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveBtn.click();
      }
    });
  }

  function openNoteDialog(dateKey, habitId) {
    const habit = HABITS.find(h => h.id === habitId);
    if (!habit) return;

    activeNoteContext = { dateKey, habitId };

    const dialog = document.getElementById('noteDialog');
    const titleEl = document.getElementById('noteDialogTitle');
    const dateEl = document.getElementById('noteDialogDate');
    const input = document.getElementById('noteTextInput');

    const d = parseDateKey(dateKey);
    titleEl.textContent = `${habit.name} Note`;
    dateEl.textContent = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    input.value = getCellNote(dateKey, habitId);

    dialog.showModal();
    input.focus();
  }

  // --- 6. TODAY'S DAILY CHECKLIST VIEW ---
  function setupDailyView() {
    const picker = document.getElementById('dailyDatePicker');
    picker.value = selectedDailyDate;

    picker.addEventListener('change', function () {
      selectedDailyDate = this.value;
      renderDailyView();
      if (gridScope === 'week') {
        updateMonthDisplay();
        renderMonthlyGrid();
      }
    });

    document.getElementById('dailyPrevDay').addEventListener('click', () => {
      const d = parseDateKey(selectedDailyDate);
      d.setDate(d.getDate() - 1);
      selectedDailyDate = formatDateKey(d);
      picker.value = selectedDailyDate;
      renderDailyView();
      if (gridScope === 'week') {
        updateMonthDisplay();
        renderMonthlyGrid();
      }
    });

    document.getElementById('dailyNextDay').addEventListener('click', () => {
      const d = parseDateKey(selectedDailyDate);
      d.setDate(d.getDate() + 1);
      selectedDailyDate = formatDateKey(d);
      picker.value = selectedDailyDate;
      renderDailyView();
      if (gridScope === 'week') {
        updateMonthDisplay();
        renderMonthlyGrid();
      }
    });

    document.getElementById('markAllDoneBtn').addEventListener('click', () => {
      HABITS.forEach(h => {
        if (getCellState(selectedDailyDate, h.id) !== 1) {
          setCellState(selectedDailyDate, h.id, 1);
        }
      });
      playTickSound(true);
    });

    document.getElementById('resetTodayBtn').addEventListener('click', () => {
      if (confirm('Reset all marks for this day?')) {
        HABITS.forEach(h => {
          setCellState(selectedDailyDate, h.id, 0);
        });
      }
    });

    const journalInput = document.getElementById('dailyJournalInput');
    journalInput.addEventListener('input', function () {
      journalData[selectedDailyDate] = this.value;
      saveJournalToLocalStorage();
      const notice = document.getElementById('journalSavedNotice');
      notice.textContent = 'Saving...';
      clearTimeout(window._journalSaveTimeout);
      window._journalSaveTimeout = setTimeout(() => {
        notice.textContent = 'Auto-saved ✓';
      }, 500);
    });
  }

  function renderDailyView() {
    const curDate = parseDateKey(selectedDailyDate);
    const isToday = selectedDailyDate === formatDateKey(new Date());

    document.getElementById('dailyViewDateTitle').textContent = isToday ? "TODAY'S CHECKLIST" : "DAILY CHECKLIST";
    document.getElementById('dailyViewDateSub').textContent = curDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    const journalInput = document.getElementById('dailyJournalInput');
    journalInput.value = journalData[selectedDailyDate] || '';
    document.getElementById('journalSavedNotice').textContent = 'Auto-saved';

    const itemsContainer = document.getElementById('dailyItemsList');
    itemsContainer.innerHTML = '';

    let totalDone = 0;

    HABITS.forEach((habit, idx) => {
      const state = getCellState(selectedDailyDate, habit.id);
      const note = getCellNote(selectedDailyDate, habit.id);
      const streak = calculateHabitStreak(habit.id, selectedDailyDate);

      if (state === 1) totalDone++;

      let rowStateClass = '';
      if (state === 1) rowStateClass = 'state-done';
      if (state === 2) rowStateClass = 'state-missed';

      const streakBadge = streak > 0 ? `<span class="item-streak-chip">🔥 ${streak}d</span>` : '';
      const noteClass = note ? 'has-note' : '';
      const noteTitle = note ? `Note: "${note}"` : 'Add note';

      const itemEl = document.createElement('div');
      itemEl.className = `daily-item-row ${rowStateClass}`;
      itemEl.innerHTML = `
        <div class="item-left">
          <span class="habit-idx-badge">${String(idx + 1).padStart(2, '0')}.</span>
          <span class="item-text" title="${habit.name}${note ? ' — ' + note : ''}">${habit.name}</span>
          ${streakBadge}
        </div>
        <div class="item-actions">
          <button class="check-btn btn-tick" title="Mark Done (Tick)">✓</button>
          <button class="check-btn btn-cross" title="Mark Missed (Cross)">✕</button>
          <button class="check-btn btn-note ${noteClass}" title="${noteTitle}">✎</button>
          <button class="check-btn btn-reset" title="Reset">↺</button>
        </div>
      `;

      itemEl.querySelector('.btn-tick').addEventListener('click', () => {
        const nextState = state === 1 ? 0 : 1;
        setCellState(selectedDailyDate, habit.id, nextState);
        if (nextState === 1) playTickSound(true);
      });

      itemEl.querySelector('.btn-cross').addEventListener('click', () => {
        const nextState = state === 2 ? 0 : 2;
        setCellState(selectedDailyDate, habit.id, nextState);
        if (nextState === 2) playTickSound(false);
      });

      // Feature 2: Open note dialog from daily checklist
      itemEl.querySelector('.btn-note').addEventListener('click', () => {
        openNoteDialog(selectedDailyDate, habit.id);
      });

      itemEl.querySelector('.btn-reset').addEventListener('click', () => {
        setCellState(selectedDailyDate, habit.id, 0);
      });

      itemsContainer.appendChild(itemEl);
    });

    const totalHabits = HABITS.length;
    const pct = Math.round((totalDone / totalHabits) * 100);

    document.getElementById('dailyScoreDisplay').textContent = `${totalDone} of ${totalHabits} Completed`;
    document.getElementById('dailyPercentPill').textContent = `${pct}%`;
    document.getElementById('dailyProgressBar').style.width = `${pct}%`;
  }

  // --- 7. STREAKS & INSIGHTS ---
  function calculateHabitStreak(habitId, untilDateKey) {
    let streak = 0;
    let checkDate = parseDateKey(untilDateKey);

    const stateToday = getCellState(formatDateKey(checkDate), habitId);
    if (stateToday !== 1) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const key = formatDateKey(checkDate);
      if (getCellState(key, habitId) === 1) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  function renderStatsView() {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    let totalMonthChecks = 0;
    let bestStreak = 0;
    let habitSuccessMap = [];

    const todayKey = formatDateKey(new Date());

    HABITS.forEach((h, idx) => {
      let checks = 0;
      let misses = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const key = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const state = getCellState(key, h.id);
        if (state === 1) checks++;
        if (state === 2) misses++;
      }
      totalMonthChecks += checks;
      const currentStreak = calculateHabitStreak(h.id, todayKey);
      if (currentStreak > bestStreak) bestStreak = currentStreak;

      const rate = Math.round((checks / daysInMonth) * 100);
      habitSuccessMap.push({
        num: idx + 1,
        ...h,
        checks,
        misses,
        rate,
        streak: currentStreak
      });
    });

    habitSuccessMap.sort((a, b) => b.rate - a.rate);
    const topHabit = habitSuccessMap[0] && habitSuccessMap[0].checks > 0 ? habitSuccessMap[0].name : 'None yet';
    const avgDailyRate = Math.round((totalMonthChecks / (HABITS.length * daysInMonth)) * 100);

    document.getElementById('statLongestStreak').textContent = `${bestStreak} Days`;
    document.getElementById('statTotalChecks').textContent = totalMonthChecks;
    document.getElementById('statAvgCompletion').textContent = `${avgDailyRate}%`;
    document.getElementById('statTopHabit').textContent = topHabit;

    const tbody = document.getElementById('statsTableBody');
    let tableHtml = '';

    habitSuccessMap.forEach(item => {
      tableHtml += `
        <tr>
          <td><span class="habit-number-idx">${String(item.num).padStart(2, '0')}</span></td>
          <td><strong>${item.name}</strong></td>
          <td><span style="color:var(--color-sage-hover); font-weight:600;">${item.checks} days</span></td>
          <td><span style="color:var(--color-rose-hover);">${item.misses} days</span></td>
          <td><strong>${item.rate}%</strong></td>
          <td>${item.streak > 0 ? `🔥 ${item.streak}d` : '-'}</td>
          <td>
            <div class="stats-progress-bar">
              <div class="stats-progress-fill" style="width: ${item.rate}%;"></div>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = tableHtml;
  }

  function updateTodayBadge() {
    const todayKey = formatDateKey(new Date());
    let done = 0;
    HABITS.forEach(h => {
      if (getCellState(todayKey, h.id) === 1) done++;
    });
    document.getElementById('todayDoneBadge').textContent = `${done}/${HABITS.length}`;
  }

  // --- 8. EVENT LISTENERS ---
  function setupEventListeners() {
    // Navigation Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));

        this.classList.add('active');
        const viewId = this.dataset.view;
        if (viewId === 'grid') document.getElementById('viewGrid').classList.add('active');
        if (viewId === 'daily') {
          document.getElementById('viewDaily').classList.add('active');
          renderDailyView();
        }
        if (viewId === 'stats') {
          document.getElementById('viewStats').classList.add('active');
          renderStatsView();
        }
      });
    });

    // Feature 5: Scope Switcher (Month vs Week)
    document.getElementById('btnScopeMonth').addEventListener('click', function () {
      this.classList.add('active');
      document.getElementById('btnScopeWeek').classList.remove('active');
      gridScope = 'month';
      updateMonthDisplay();
      renderMonthlyGrid();
    });

    document.getElementById('btnScopeWeek').addEventListener('click', function () {
      this.classList.add('active');
      document.getElementById('btnScopeMonth').classList.remove('active');
      gridScope = 'week';
      updateMonthDisplay();
      renderMonthlyGrid();
    });

    // Month / Week Navigation
    document.getElementById('prevMonthBtn').addEventListener('click', () => {
      if (gridScope === 'month') {
        currentMonth--;
        if (currentMonth < 0) {
          currentMonth = 11;
          currentYear--;
        }
      } else {
        const d = parseDateKey(selectedDailyDate);
        d.setDate(d.getDate() - 7);
        selectedDailyDate = formatDateKey(d);
        document.getElementById('dailyDatePicker').value = selectedDailyDate;
      }
      updateMonthDisplay();
      renderMonthlyGrid();
      renderStatsView();
    });

    document.getElementById('nextMonthBtn').addEventListener('click', () => {
      if (gridScope === 'month') {
        currentMonth++;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
        }
      } else {
        const d = parseDateKey(selectedDailyDate);
        d.setDate(d.getDate() + 7);
        selectedDailyDate = formatDateKey(d);
        document.getElementById('dailyDatePicker').value = selectedDailyDate;
      }
      updateMonthDisplay();
      renderMonthlyGrid();
      renderStatsView();
    });

    document.getElementById('jumpTodayBtn').addEventListener('click', () => {
      const now = new Date();
      currentYear = now.getFullYear();
      currentMonth = now.getMonth();
      selectedDailyDate = formatDateKey(now);
      document.getElementById('dailyDatePicker').value = selectedDailyDate;
      updateMonthDisplay();
      renderMonthlyGrid();
      renderDailyView();
      renderStatsView();
    });

    // Feature 3: Theme Toggle
    document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);

    // Sound Toggle
    const soundBtn = document.getElementById('soundToggleBtn');
    const soundIcon = document.getElementById('soundIcon');
    soundBtn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      localStorage.setItem(SOUND_KEY, soundEnabled);
      soundIcon.textContent = soundEnabled ? '🔔' : '🔕';
      soundBtn.title = soundEnabled ? 'Sound is ON' : 'Sound is OFF';
    });
    soundIcon.textContent = soundEnabled ? '🔔' : '🔕';

    // Export Data (Includes Notes!)
    document.getElementById('exportBtn').addEventListener('click', () => {
      const exportObject = {
        app: 'Aesthetic Bullet Journal Habit Tracker',
        version: 4,
        exportDate: new Date().toISOString(),
        trackerData,
        journalData,
        notesData
      };
      const jsonStr = JSON.stringify(exportObject, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `habit_tracker_backup_${formatDateKey(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    // Import Data
    const importFileInput = document.getElementById('importFileInput');
    document.getElementById('importBtn').addEventListener('click', () => {
      importFileInput.click();
    });

    importFileInput.addEventListener('change', function () {
      const file = this.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const imported = JSON.parse(e.target.result);
          if (imported.trackerData) {
            trackerData = { ...trackerData, ...imported.trackerData };
            if (imported.journalData) journalData = { ...journalData, ...imported.journalData };
            if (imported.notesData) notesData = { ...notesData, ...imported.notesData };
            saveToLocalStorage();
            saveJournalToLocalStorage();
            saveNotesToLocalStorage();
            onDataUpdated();
            alert('Backup restored successfully!');
          } else {
            alert('Invalid backup file format.');
          }
        } catch (err) {
          alert('Error parsing backup file: ' + err.message);
        }
      };
      reader.readAsText(file);
      this.value = '';
    });

    document.getElementById('printBtn').addEventListener('click', () => {
      window.print();
    });
  }

  document.addEventListener('DOMContentLoaded', init);

})();
