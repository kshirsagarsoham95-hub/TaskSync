let ganttOffset = 0; // days from today

export function renderGantt(tasks) {
  const canvas = document.getElementById('gantt-canvas');
  if (!canvas) return;

  const dpr     = window.devicePixelRatio || 1;
  const wrap    = canvas.parentElement;
  const W       = wrap.clientWidth  || 900;
  const DAYS    = 14;
  const LEFT    = 200;
  const ROW_H   = 40;
  const HEAD_H  = 48;
  const H       = HEAD_H + Math.max(tasks.length, 8) * ROW_H + 20;

  canvas.width        = W   * dpr;
  canvas.height       = H   * dpr;
  canvas.style.width  = W   + 'px';
  canvas.style.height = H   + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  const base = new Date();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + ganttOffset);

  const dayW = (W - LEFT) / DAYS;

  // update range label
  const endDate = new Date(base);
  endDate.setDate(base.getDate() + DAYS - 1);
  const fmt = d => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const label = document.getElementById('gantt-range-label');
  if (label) label.textContent = `${fmt(base)} — ${fmt(endDate)}`;

  // background stripes
  for (let i = 0; i < DAYS; i++) {
    const x = LEFT + i * dayW;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(15,23,42,0.3)' : 'rgba(15,23,42,0.15)';
    ctx.fillRect(x, 0, dayW, H);
  }

  // today line
  const todayOffset = -ganttOffset;
  if (todayOffset >= 0 && todayOffset < DAYS) {
    const tx = LEFT + todayOffset * dayW;
    ctx.strokeStyle = 'rgba(251,113,133,0.7)';
    ctx.lineWidth   = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(tx, 0); ctx.lineTo(tx, H); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(251,113,133,0.9)';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText('Today', tx + 4, 14);
  }

  // header dates
  ctx.fillStyle = css('--muted');
  ctx.font = '11px Inter, sans-serif';
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const x   = LEFT + i * dayW;
    const lbl = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    ctx.fillText(lbl, x + 4, HEAD_H - 10);

    ctx.strokeStyle = 'rgba(148,163,184,0.1)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(x, HEAD_H); ctx.lineTo(x, H); ctx.stroke();
  }

  // header border
  ctx.strokeStyle = css('--line');
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.moveTo(0, HEAD_H); ctx.lineTo(W, HEAD_H); ctx.stroke();

  // task rows
  const COLORS = ['#3b82f6','#22c55e','#eab308','#f97316','#ef4444'];

  tasks.slice(0, 20).forEach((task, idx) => {
    const y = HEAD_H + idx * ROW_H;

    // row separator
    ctx.strokeStyle = 'rgba(148,163,184,0.07)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(0, y + ROW_H); ctx.lineTo(W, y + ROW_H); ctx.stroke();

    // task label
    ctx.fillStyle = css('--text');
    ctx.font = '13px Inter, sans-serif';
    const label = task.title.length > 22 ? task.title.slice(0, 22) + '…' : task.title;
    ctx.fillText(label, 12, y + ROW_H / 2 + 5);

    // bar
    const taskDate = new Date(task.scheduled_date || task.deadline || base);
    taskDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((taskDate - base) / 86_400_000);
    if (diffDays >= DAYS || diffDays < -1) return;

    const startX  = LEFT + Math.max(0, diffDays) * dayW;
    const barMinW = 32;
    const barW    = Math.max(barMinW, (task.estimated_minutes / 60) * dayW * 0.9);
    const barH    = ROW_H * 0.55;
    const barY    = y + (ROW_H - barH) / 2;
    const color   = COLORS[Math.max(0, task.priority - 1)];

    ctx.fillStyle   = color + 'cc';
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    roundRect(ctx, startX + 2, barY, Math.min(barW, W - startX - 4), barH, 6);
    ctx.fill();
    ctx.stroke();

    // label on bar
    if (barW > 48) {
      ctx.fillStyle = '#fff';
      ctx.font      = 'bold 11px Inter, sans-serif';
      ctx.fillText(`${task.estimated_minutes}m`, startX + 8, barY + barH / 2 + 4);
    }
  });

  if (!tasks.length) {
    ctx.fillStyle = css('--muted');
    ctx.font      = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No scheduled tasks to display.', W / 2, HEAD_H + 60);
    ctx.textAlign = 'left';
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Wire up Prev/Next after DOM ready
export function initGanttControls(getTasks) {
  document.getElementById('gantt-prev')?.addEventListener('click', () => {
    ganttOffset -= 7;
    renderGantt(getTasks());
  });
  document.getElementById('gantt-next')?.addEventListener('click', () => {
    ganttOffset += 7;
    renderGantt(getTasks());
  });
}