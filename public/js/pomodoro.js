import { showToast } from './toast.js';
import { api } from './api.js';
import { state, refreshData } from './app.js';

let interval = null;
let remaining = 25 * 60;
let phase = 'work'; // 'work' or 'break'
let activeTaskId = null;
let running = false;
let audioCtx = null;

export function initPomodoro() {
  document.getElementById('btn-pomo-start').addEventListener('click', toggleTimer);
  document.getElementById('btn-pomo-pause').addEventListener('click', () => {
    running = false;
    updateUI();
  });
  document.getElementById('btn-pomo-reset').addEventListener('click', () => {
    running = false;
    remaining = phase === 'work' ? 25 * 60 : 5 * 60;
    updateUI();
  });
  document.getElementById('btn-pomo-skip').addEventListener('click', nextPhase);
  
  setInterval(() => {
    if (running) {
      remaining--;
      if (remaining <= 0) nextPhase();
      updateUI();
    }
  }, 1000);
}

export function startPomodoroForTask(taskId, title) {
  activeTaskId = taskId;
  phase = 'work';
  remaining = 25 * 60;
  running = true;
  document.getElementById('pomodoro-panel').style.display = 'block';
  document.getElementById('pomodoro-task-title').innerText = title;
  updateUI();
}

function toggleTimer() {
  running = !running;
  updateUI();
}

function updateUI() {
  const panel = document.getElementById('pomodoro-panel');
  if (running) panel.classList.add('running');
  else panel.classList.remove('running');
  
  const m = Math.floor(remaining / 60).toString().padStart(2, '0');
  const s = (remaining % 60).toString().padStart(2, '0');
  const timeStr = `${m}:${s}`;
  
  document.getElementById('pomodoro-time').innerText = timeStr;
  
  if (running) {
    document.title = `[${timeStr}] ${document.getElementById('pomodoro-task-title').innerText} - TaskSync`;
  } else {
    document.title = 'TaskSync';
  }
}

async function nextPhase() {
  running = false;
  playBeep();
  
  if (phase === 'work') {
    phase = 'break';
    remaining = 5 * 60;
    showToast('Work complete! Take a 5 min break.', 'success');
    // If we wanted to track pomodoro count on the task, we'd do an API call here.
  } else {
    phase = 'work';
    remaining = 25 * 60;
    showToast('Break over! Back to work.', 'info');
  }
  updateUI();
}

function playBeep() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  } catch(e) {}
}
