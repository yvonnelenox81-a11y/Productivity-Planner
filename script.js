// --- DOM Elements ---
const dateHeader = document.getElementById('current-date');
const timeSlotsContainer = document.getElementById('time-slots');
const newTaskInput = document.getElementById('new-task');
const addTaskBtn = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');
const clearCompletedBtn = document.getElementById('clear-completed');
const timerDisplay = document.getElementById('timer-display');
const startPauseBtn = document.getElementById('start-pause-btn');
const resetBtn = document.getElementById('reset-btn');
const progressCircle = document.getElementById('timer-progress');
const modeBtns = document.querySelectorAll('.mode-btn');

// --- State ---
let tasks = []; // { id, text, completed }
let schedule = {}; // key: "HH:MM" -> event text
let timer = {
  minutes: 25,
  seconds: 0,
  totalSeconds: 25 * 60,
  interval: null,
  isRunning: false,
};

// --- Initialize ---
function init() {
  // Set today's date
  const today = new Date();
  dateHeader.textContent = today.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // Load data
  loadFromStorage();
  renderTimeSlots();
  renderTasks();
  updateTimerDisplay();
  setActiveModeBtn();
}

// --- Local Storage ---
function saveToStorage() {
  localStorage.setItem('planner-tasks', JSON.stringify(tasks));
  localStorage.setItem('planner-schedule', JSON.stringify(schedule));
  localStorage.setItem('planner-timer', JSON.stringify({
    minutes: timer.minutes,
    seconds: timer.seconds,
    totalSeconds: timer.totalSeconds,
  }));
}

function loadFromStorage() {
  const savedTasks = localStorage.getItem('planner-tasks');
  if (savedTasks) tasks = JSON.parse(savedTasks);

  const savedSchedule = localStorage.getItem('planner-schedule');
  if (savedSchedule) schedule = JSON.parse(savedSchedule);

  const savedTimer = localStorage.getItem('planner-timer');
  if (savedTimer) {
    const t = JSON.parse(savedTimer);
    timer.minutes = t.minutes;
    timer.seconds = t.seconds;
    timer.totalSeconds = t.totalSeconds;
  }
}

// --- Time Slots (6 AM - 10 PM) ---
function renderTimeSlots() {
  timeSlotsContainer.innerHTML = '';
  for (let hour = 6; hour <= 22; hour++) {
    const hourStr = hour.toString().padStart(2, '0') + ':00';
    const eventText = schedule[hourStr] || '';

    const slotDiv = document.createElement('div');
    slotDiv.className = 'time-slot';
    slotDiv.innerHTML = `
      <span class="time-label">${formatHour(hour)}</span>
      <div class="slot-content">
        <div class="slot-task ${eventText ? '' : 'empty'}" data-time="${hourStr}">
          ${eventText || 'Click to add event'}
        </div>
        <button class="delete-slot-btn" data-time="${hourStr}" title="Delete event">&times;</button>
      </div>
    `;
    timeSlotsContainer.appendChild(slotDiv);
  }
}

function formatHour(hour) {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour;
  return `${displayHour}:00 ${ampm}`;
}

// Edit schedule event
timeSlotsContainer.addEventListener('click', (e) => {
  const slotTask = e.target.closest('.slot-task');
  if (slotTask) {
    const timeKey = slotTask.dataset.time;
    const currentText = schedule[timeKey] || '';
    const newText = prompt(`Event at ${timeKey}:`, currentText);
    if (newText !== null) {
      if (newText.trim() === '') {
        delete schedule[timeKey];
      } else {
        schedule[timeKey] = newText.trim();
      }
      saveToStorage();
      renderTimeSlots();
    }
  }

  const deleteBtn = e.target.closest('.delete-slot-btn');
  if (deleteBtn) {
    const timeKey = deleteBtn.dataset.time;
    delete schedule[timeKey];
    saveToStorage();
    renderTimeSlots();
  }
});

// --- Tasks ---
function addTask(text) {
  if (!text.trim()) return;
  const task = {
    id: Date.now().toString(),
    text: text.trim(),
    completed: false,
  };
  tasks.push(task);
  saveToStorage();
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveToStorage();
  renderTasks();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveToStorage();
    renderTasks();
  }
}

function clearCompleted() {
  tasks = tasks.filter(t => !t.completed);
  saveToStorage();
  renderTasks();
}

function renderTasks() {
  taskList.innerHTML = '';
  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.innerHTML = `
      <input type="checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
      <span class="${task.completed ? 'completed' : ''}">${task.text}</span>
      <button class="delete-btn" data-id="${task.id}">&times;</button>
    `;
    taskList.appendChild(li);
  });
}

addTaskBtn.addEventListener('click', () => {
  addTask(newTaskInput.value);
  newTaskInput.value = '';
});

newTaskInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addTask(newTaskInput.value);
    newTaskInput.value = '';
  }
});

taskList.addEventListener('click', (e) => {
  if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
    toggleTask(e.target.dataset.id);
  }
  if (e.target.classList.contains('delete-btn')) {
    deleteTask(e.target.dataset.id);
  }
});

clearCompletedBtn.addEventListener('click', clearCompleted);

// --- Pomodoro Timer ---
function updateTimerDisplay() {
  const mins = String(timer.minutes).padStart(2, '0');
  const secs = String(timer.seconds).padStart(2, '0');
  timerDisplay.textContent = `${mins}:${secs}`;
  updateProgressCircle();
}

function updateProgressCircle() {
  const total = timer.totalSeconds;
  const remaining = timer.minutes * 60 + timer.seconds;
  const fraction = remaining / total;
  const offset = 283 * (1 - fraction); // circumference is 283
  progressCircle.style.strokeDashoffset = offset;
}

function setTimer(minutes, seconds = 0) {
  timer.minutes = minutes;
  timer.seconds = seconds;
  timer.totalSeconds = minutes * 60 + seconds;
  updateTimerDisplay();
  saveToStorage();
}

function startTimer() {
  if (timer.isRunning) return;
  if (timer.minutes === 0 && timer.seconds === 0) {
    // reset to total if finished
    timer.minutes = Math.floor(timer.totalSeconds / 60);
    timer.seconds = timer.totalSeconds % 60;
    updateTimerDisplay();
  }
  timer.isRunning = true;
  startPauseBtn.textContent = '⏸ Pause';
  timer.interval = setInterval(() => {
    if (timer.seconds === 0) {
      if (timer.minutes === 0) {
        clearInterval(timer.interval);
        timer.isRunning = false;
        startPauseBtn.textContent = '▶ Start';
        alert('Time is up!');
        return;
      }
      timer.minutes--;
      timer.seconds = 59;
    } else {
      timer.seconds--;
    }
    updateTimerDisplay();
    saveToStorage();
  }, 1000);
}

function pauseTimer() {
  clearInterval(timer.interval);
  timer.isRunning = false;
  startPauseBtn.textContent = '▶ Start';
  saveToStorage();
}

function resetTimer() {
  pauseTimer();
  timer.minutes = Math.floor(timer.totalSeconds / 60);
  timer.seconds = timer.totalSeconds % 60;
  updateTimerDisplay();
  saveToStorage();
}

function setActiveModeBtn() {
  modeBtns.forEach(btn => {
    const mins = parseInt(btn.dataset.minutes);
    btn.classList.toggle('active', mins === timer.totalSeconds / 60);
  });
}

startPauseBtn.addEventListener('click', () => {
  if (timer.isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
});

resetBtn.addEventListener('click', resetTimer);

modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const mins = parseInt(btn.dataset.minutes);
    pauseTimer();
    setTimer(mins);
    setActiveModeBtn();
  });
});

// Initial load
init();
