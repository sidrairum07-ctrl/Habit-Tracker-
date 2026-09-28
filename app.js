/**
 * Aesthetic Bullet Journal Habit Tracker & Daily To-Do Planner
 * Complete State Management, Grid Rendering, Daily View & Persistence
 */

(function () {
  'use strict';

  // --- 1. HABITS DEFINITION (Exact 20 items requested) ---
  const HABITS = [
    { id: 'fajr', name: 'Fajr', category: 'spiritual' },
    { id: 'morning_duas', name: 'Morning Duas', category: 'spiritual' },
    { id: 'quran_tilawah', name: 'Quran Tilawah', category: 'spiritual' },
    { id: 'daily_dhikr', name: 'Daily Dhikr', category: 'spiritual' },
    { id: 'exercise', name: 'Exercise (15-20mins)', category: 'lifestyle' },
    { id: 'zuhur', name: 'Zuhur', category: 'spiritual' },
    { id: 'dsa', name: 'DSA (min 1hr)', category: 'career' },
    { id: 'roadmap', name: 'Roadmap (1hr)', category: 'career' },
    { id: 'evening_duas', name: 'Evening Duas', category: 'spiritual' },
    { id: 'asr', name: 'Asr', category: 'spiritual' },
    { id: 'no_junk_food', name: 'No Junk Food', category: 'lifestyle' },
    { id: 'no_music', name: 'No Music', category: 'spiritual' },
    { id: 'maghrib', name: 'Maghrib', category: 'spiritual' },
    { id: 'clean_tidy', name: 'Clean/Tidy Something', category: 'lifestyle' },
    { id: 'isha', name: 'Isha', category: 'spiritual' },
    { id: 'limit_screentime', name: 'Limit Screentime', category: 'lifestyle' },
    { id: 'read_10mins', name: 'Read - 10 mins', category: 'career' },
    { id: 'write_journal', name: 'Write Journal Basic', category: 'career' },
    { id: 'skincare', name: 'Skincare', category: 'lifestyle' },
    { id: 'sleep', name: 'Sleep (6-7 hrs)', category: 'lifestyle' }
  ];

  const MONTH_NAMES = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // --- 2. APPLICATION STATE ---
  const today = new Date();
  let currentYear = today.getFullYear();
  let currentMonth = today.getMonth(); // 0-indexed
  let selectedDailyDate = formatDateKey(today); // 'YYYY-MM-DD'
  let activeCategoryFilter = 'all';
  let soundEnabled = true;

  // Storage data structure: { "YYYY-MM-DD": { [habitId]: 1 (tick) | 2 (cross) } }
  let trackerData = {};
  // Journal data structure: { "YYYY-MM-DD": "text notes..." }
  let journalData = {};

  const STORAGE_KEY = 'bullet_tracker_data_v2';
  const JOURNAL_KEY = 'bullet_journal_data_v2';
  const SOUND_KEY = 'bullet_tracker_sound_v2';

  // --- 3. INITIALIZATION ---
  function init() {
    loadFromLocalStorage();
    setupEventListeners();
    updateMonthDisplay();
    renderMonthlyGrid();
    setupDailyView();
    renderDailyView();
    renderStatsView();
  }

  // Helper: Format date to 'YYYY-MM-DD'
  function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Load saved data
  function loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        trackerData = JSON.parse(saved);
      }
      const savedJournals = localStorage.getItem(JOURNAL_KEY);
      if (savedJournals) {
        journalData = JSON.parse(savedJournals);
      }
      const savedSound = localStorage.getItem(SOUND_KEY);
      if (savedSound !== null) {
        soundEnabled = savedSound === 'true';
      }
    } catch (e) {
      console.warn('Failed to parse localStorage data:', e);
      trackerData = {};
      journalData = {};
    }
  }

  // Save to localStorage
  function saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trackerData));
    } catch (e) {
      console.warn('Failed to save trackerData to localStorage:', e);
    }
  }

  function saveJournalToLocalStorage() {
    try {
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(journalData));
    } catch (e) {
      console.warn('Failed to save journalData to localStorage:', e);
    }
  }

  // --- 4. AUDIO SYNTHESIZER (Pleasant soft aesthetic clicks) ---
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
        // High soft chime for completion
        osc.frequency.setValueAtTime(680, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      } else {
        // Gentle woodblock thud for cross
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(240, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    } catch (e) {
      // AudioContext may be restricted by browser policy before first user gesture
    }
  }

  // --- 5. DATA GETTERS & SETTERS ---
  function getCellState(dateKey, habitId) {
    if (!trackerData[dateKey]) return 0;
    return trackerData[dateKey][habitId] || 0;
  }

  function setCellState(dateKey, habitId, state) {
    if (!trackerData[dateKey]) {
      trackerData[dateKey] = {};
    }
    if (state === 0) {
      delete trackerData[dateKey][habitId];
      if (Object.keys(trackerData[dateKey]).length === 0) {
        delete trackerData[dateKey];
      }
    } else {
      trackerData[dateKey][habitId] = state;
    }
    saveToLocalStorage();
    onDataUpdated();
  }

  // Called whenever data changes to refresh views
  function onDataUpdated() {
    renderMonthlyGrid();
    renderDailyView();
    renderStatsView();
    updateTodayBadge();
  }

  // Toggle habit cell state: 0 (empty) -> 1 (tick) -> 2 (cross) -> 0
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

  // Days in current viewing month
  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  // --- 6. MONTHLY GRID VIEW (Inspired by Image 2 - Yellow Grid Tracker) ---
  function updateMonthDisplay() {
    const label = `${MONTH_NAMES[currentMonth]} ${currentYear}`;
    document.getElementById('currentMonthYear').textContent = label;
    document.getElementById('sheetDateSubtitle').textContent = label;
  }

  function renderMonthlyGrid() {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const gridThead = document.getElementById('gridThead');
    const gridTbody = document.getElementById('gridTbody');
    const gridTfoot = document.getElementById('gridTfoot');

    const todayKey = formatDateKey(new Date());

    // 1. Build THEAD: Day of Week row + Day Number row
    let dayNamesHtml = `<th class="habit-col-name" rowspan="2">HABIT (${HABITS.length})</th>`;
    let dayNumsHtml = '';

    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(currentYear, currentMonth, day);
      const dayOfWeek = dayDate.getDay();
      const initial = DAY_INITIALS[dayOfWeek];
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateKey === todayKey;

      const colClass = `${isToday ? 'col-today' : ''} ${isWeekend ? 'col-weekend' : ''}`;

      dayNamesHtml += `<th class="habit-col-day ${colClass}">${initial}</th>`;
      dayNumsHtml += `<th class="habit-col-day ${colClass}" data-date="${dateKey}" title="${dayDate.toDateString()}">${day}</th>`;
    }

    dayNamesHtml += `<th class="habit-col-total" rowspan="2">DONE</th>`;

    gridThead.innerHTML = `
      <tr class="day-names-row">${dayNamesHtml}</tr>
      <tr class="day-nums-row">${dayNumsHtml}</tr>
    `;

    // 2. Build TBODY: One row per habit
    let tbodyHtml = '';
    let totalChecksThisMonth = 0;
    let totalPossibleCells = HABITS.length * daysInMonth;

    HABITS.forEach((habit, idx) => {
      // Check category filter
      const isHidden = activeCategoryFilter !== 'all' && habit.category !== activeCategoryFilter;
      const rowStyle = isHidden ? 'display: none;' : '';

      let rowHtml = `<tr style="${rowStyle}" data-habit-id="${habit.id}">`;

      // Sticky Habit Name Cell
      rowHtml += `
        <td class="habit-name-cell">
          <div class="habit-title-wrap">
            <span class="habit-category-dot ${habit.category}" title="${habit.category}"></span>
            <span class="habit-number-idx">${String(idx + 1).padStart(2, '0')}.</span>
            <span class="habit-name-text">${habit.name}</span>
          </div>
        </td>
      `;

      // Day Cells
      let habitMonthTicks = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const state = getCellState(dateKey, habit.id);
        const dayDate = new Date(currentYear, currentMonth, day);
        const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
        const isToday = dateKey === todayKey;

        if (state === 1) {
          habitMonthTicks++;
          totalChecksThisMonth++;
        }

        let stateClass = '';
        let iconContent = '';
        if (state === 1) {
          stateClass = 'state-tick';
          iconContent = '✓';
        } else if (state === 2) {
          stateClass = 'state-cross';
          iconContent = '✕';
        }

        const cellColClass = `${isToday ? 'col-today' : ''} ${isWeekend ? 'col-weekend' : ''}`;

        rowHtml += `
          <td class="${cellColClass}">
            <div class="grid-box ${stateClass}" 
                 data-date="${dateKey}" 
                 data-habit="${habit.id}" 
                 title="${habit.name} on Day ${day}: ${state === 1 ? 'Done ✓' : state === 2 ? 'Missed ✕' : 'Click to mark'}">
              ${iconContent}
            </div>
          </td>
        `;
      }

      // Habit Total in Month
      const habitPct = Math.round((habitMonthTicks / daysInMonth) * 100);
      rowHtml += `
        <td class="habit-row-total" title="${habitMonthTicks} of ${daysInMonth} days (${habitPct}%)">
          ${habitMonthTicks}/${daysInMonth}
        </td>
      `;

      rowHtml += '</tr>';
      tbodyHtml += rowHtml;
    });

    gridTbody.innerHTML = tbodyHtml;

    // 3. Build TFOOT: Daily Column Summaries
    let tfootHtml = `<tr><td class="habit-name-cell"><strong>DAILY TOTAL</strong></td>`;
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      let dayCompleted = 0;
      HABITS.forEach(h => {
        if (getCellState(dateKey, h.id) === 1) dayCompleted++;
      });
      const pct = Math.round((dayCompleted / HABITS.length) * 100);
      const isToday = dateKey === todayKey;

      tfootHtml += `
        <td class="${isToday ? 'col-today' : ''}" title="Day ${day}: ${dayCompleted}/${HABITS.length} (${pct}%)">
          <div class="daily-summary-score">${dayCompleted}</div>
          <div class="daily-summary-bar">
            <div class="daily-summary-fill" style="width: ${pct}%;"></div>
          </div>
        </td>
      `;
    }
    const monthConsistency = totalPossibleCells > 0 ? Math.round((totalChecksThisMonth / totalPossibleCells) * 100) : 0;
    tfootHtml += `<td class="habit-row-total">${monthConsistency}%</td></tr>`;
    gridTfoot.innerHTML = tfootHtml;

    // Update Bottom Summary
    document.getElementById('monthOverallStat').innerHTML = `
      Monthly Consistency: <strong>${monthConsistency}%</strong> (${totalChecksThisMonth}/${totalPossibleCells} checks)
    `;

    // Attach click listeners to grid boxes
    gridTbody.querySelectorAll('.grid-box').forEach(box => {
      box.addEventListener('click', function () {
        const dateKey = this.dataset.date;
        const habitId = this.dataset.habit;
        cycleHabitState(dateKey, habitId);
      });
    });
  }

  // --- 7. TODAY'S DAILY CHECKLIST VIEW ---
  function setupDailyView() {
    const picker = document.getElementById('dailyDatePicker');
    picker.value = selectedDailyDate;

    picker.addEventListener('change', function () {
      selectedDailyDate = this.value;
      renderDailyView();
    });

    document.getElementById('dailyPrevDay').addEventListener('click', () => {
      const d = new Date(selectedDailyDate + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      selectedDailyDate = formatDateKey(d);
      picker.value = selectedDailyDate;
      renderDailyView();
    });

    document.getElementById('dailyNextDay').addEventListener('click', () => {
      const d = new Date(selectedDailyDate + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      selectedDailyDate = formatDateKey(d);
      picker.value = selectedDailyDate;
      renderDailyView();
    });

    // Batch Actions
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

    // Daily Journal Textarea
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
    const curDate = new Date(selectedDailyDate + 'T00:00:00');
    const isToday = selectedDailyDate === formatDateKey(new Date());

    // Update Titles
    document.getElementById('dailyViewDateTitle').textContent = isToday ? "TODAY'S TO-DO CHECKLIST" : "DAILY TO-DO CHECKLIST";
    document.getElementById('dailyViewDateSub').textContent = curDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    // Populate Journal Input
    const journalInput = document.getElementById('dailyJournalInput');
    journalInput.value = journalData[selectedDailyDate] || '';
    document.getElementById('journalSavedNotice').textContent = 'Auto-saved';

    // Group habits by category
    const spiritualList = document.getElementById('listSpiritual');
    const careerList = document.getElementById('listCareer');
    const lifestyleList = document.getElementById('listLifestyle');

    spiritualList.innerHTML = '';
    careerList.innerHTML = '';
    lifestyleList.innerHTML = '';

    let totalDone = 0;
    let counts = { spiritual: [0, 0], career: [0, 0], lifestyle: [0, 0] };

    HABITS.forEach((habit) => {
      const state = getCellState(selectedDailyDate, habit.id);
      const streak = calculateHabitStreak(habit.id, selectedDailyDate);

      counts[habit.category][1]++;
      if (state === 1) {
        totalDone++;
        counts[habit.category][0]++;
      }

      let rowStateClass = '';
      if (state === 1) rowStateClass = 'state-done';
      if (state === 2) rowStateClass = 'state-missed';

      const streakBadge = streak > 0 ? `<span class="item-streak-chip">🔥 ${streak}d</span>` : '';

      const itemEl = document.createElement('div');
      itemEl.className = `daily-item-row ${rowStateClass}`;
      itemEl.innerHTML = `
        <div class="item-left">
          <span class="habit-category-dot ${habit.category}"></span>
          <span class="item-text" title="${habit.name}">${habit.name}</span>
          ${streakBadge}
        </div>
        <div class="item-actions">
          <button class="check-btn btn-tick" title="Mark Done (Tick)">✓</button>
          <button class="check-btn btn-cross" title="Mark Missed (Cross)">✕</button>
          <button class="check-btn btn-reset" title="Reset">↺</button>
        </div>
      `;

      // Click Handlers for Item Actions
      const tickBtn = itemEl.querySelector('.btn-tick');
      const crossBtn = itemEl.querySelector('.btn-cross');
      const resetBtn = itemEl.querySelector('.btn-reset');

      tickBtn.addEventListener('click', () => {
        const nextState = state === 1 ? 0 : 1;
        setCellState(selectedDailyDate, habit.id, nextState);
        if (nextState === 1) playTickSound(true);
      });

      crossBtn.addEventListener('click', () => {
        const nextState = state === 2 ? 0 : 2;
        setCellState(selectedDailyDate, habit.id, nextState);
        if (nextState === 2) playTickSound(false);
      });

      resetBtn.addEventListener('click', () => {
        setCellState(selectedDailyDate, habit.id, 0);
      });

      if (habit.category === 'spiritual') spiritualList.appendChild(itemEl);
      else if (habit.category === 'career') careerList.appendChild(itemEl);
      else lifestyleList.appendChild(itemEl);
    });

    // Update Category Counts
    document.getElementById('countSpiritual').textContent = `${counts.spiritual[0]}/${counts.spiritual[1]}`;
    document.getElementById('countCareer').textContent = `${counts.career[0]}/${counts.career[1]}`;
    document.getElementById('countLifestyle').textContent = `${counts.lifestyle[0]}/${counts.lifestyle[1]}`;

    // Update Daily Progress Bar
    const totalHabits = HABITS.length;
    const pct = Math.round((totalDone / totalHabits) * 100);

    document.getElementById('dailyScoreDisplay').textContent = `${totalDone} of ${totalHabits} Completed`;
    document.getElementById('dailyPercentPill').textContent = `${pct}%`;
    document.getElementById('dailyProgressBar').style.width = `${pct}%`;
  }

  // --- 8. STREAKS & INSIGHTS VIEW ---
  function calculateHabitStreak(habitId, untilDateKey) {
    let streak = 0;
    let checkDate = new Date(untilDateKey + 'T00:00:00');

    // If today is unchecked, check if yesterday was checked
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

    HABITS.forEach(h => {
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
        ...h,
        checks,
        misses,
        rate,
        streak: currentStreak
      });
    });

    // Top habit
    habitSuccessMap.sort((a, b) => b.rate - a.rate);
    const topHabit = habitSuccessMap[0] && habitSuccessMap[0].checks > 0 ? habitSuccessMap[0].name : 'None yet';

    const avgDailyRate = Math.round((totalMonthChecks / (HABITS.length * daysInMonth)) * 100);

    // Update stat cards
    document.getElementById('statLongestStreak').textContent = `${bestStreak} Days`;
    document.getElementById('statTotalChecks').textContent = totalMonthChecks;
    document.getElementById('statAvgCompletion').textContent = `${avgDailyRate}%`;
    document.getElementById('statTopHabit').textContent = topHabit;

    // Render Stats Table
    const tbody = document.getElementById('statsTableBody');
    let tableHtml = '';

    habitSuccessMap.forEach(item => {
      tableHtml += `
        <tr>
          <td><strong>${item.name}</strong></td>
          <td><span class="habit-category-dot ${item.category}" style="display:inline-block; margin-right:4px;"></span> ${item.category.toUpperCase()}</td>
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

  // --- 9. EVENT LISTENERS & SETUP ---
  function setupEventListeners() {
    // Navigation Tabs (Monthly Grid vs Today's To-Do vs Insights)
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

    // Month Navigation
    document.getElementById('prevMonthBtn').addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      updateMonthDisplay();
      renderMonthlyGrid();
      renderStatsView();
    });

    document.getElementById('nextMonthBtn').addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
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

    // Category Filter Pills on Grid View
    document.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', function () {
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        this.classList.add('active');
        activeCategoryFilter = this.dataset.category;
        renderMonthlyGrid();
      });
    });

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

    // Export Data (JSON Download)
    document.getElementById('exportBtn').addEventListener('click', () => {
      const exportObject = {
        app: 'Aesthetic Bullet Journal Habit Tracker',
        version: 2,
        exportDate: new Date().toISOString(),
        trackerData,
        journalData
      };
      const jsonStr = JSON.stringify(exportObject, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bullet_habit_tracker_backup_${formatDateKey(new Date())}.json`;
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
            if (imported.journalData) {
              journalData = { ...journalData, ...imported.journalData };
            }
            saveToLocalStorage();
            saveJournalToLocalStorage();
            onDataUpdated();
            alert('✦ Backup restored successfully!');
          } else {
            alert('Invalid backup file format.');
          }
        } catch (err) {
          alert('Error parsing backup file: ' + err.message);
        }
      };
      reader.readAsText(file);
      this.value = ''; // Reset input
    });

    // Print Tracker
    document.getElementById('printBtn').addEventListener('click', () => {
      window.print();
    });
  }

  // Run on page load
  document.addEventListener('DOMContentLoaded', init);

})();
