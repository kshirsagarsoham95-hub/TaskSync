function clearCanvas(canvas) {
  // make canvas fill its container at device pixel ratio
  const dpr  = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const w    = Math.floor(rect.width)  || 640;
  const h    = parseInt(canvas.getAttribute('height') || '260', 10);
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function renderWeeklyChart(data) {
  if (!data?.length) return;
  const canvas = document.getElementById('weekly-chart');
  const { ctx, w, h } = clearCanvas(canvas);

  const max        = Math.max(1, ...data.map(d => Math.max(d.planned, d.done)));
  const padL = 36, padR = 16, padT = 16, padB = 40;
  const chartW     = w - padL - padR;
  const chartH     = h - padT - padB;
  const barGap     = chartW / data.length;
  const barW       = Math.min(18, barGap * 0.35);

  // grid lines
  ctx.strokeStyle = cssVar('--line');
  ctx.lineWidth   = 1;
  [0, 0.25, 0.5, 0.75, 1].forEach(frac => {
    const y = padT + chartH * (1 - frac);
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
    ctx.fillStyle = cssVar('--muted');
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(Math.round(max * frac), 4, y + 4);
  });

  data.forEach((item, i) => {
    const cx         = padL + i * barGap + barGap / 2;
    const plannedH   = (item.planned / max) * chartH;
    const doneH      = (item.done    / max) * chartH;

    ctx.fillStyle = 'rgba(56,189,248,0.7)';
    ctx.fillRect(cx - barW - 2, padT + chartH - plannedH, barW, plannedH);

    ctx.fillStyle = 'rgba(52,211,153,0.8)';
    ctx.fillRect(cx + 2,        padT + chartH - doneH,    barW, doneH);

    ctx.fillStyle = cssVar('--muted');
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(item.day || '', cx, h - padB + 16);
  });
  ctx.textAlign = 'left';

  // legend
  ctx.fillStyle = 'rgba(56,189,248,0.7)';  ctx.fillRect(padL,      8, 10, 10);
  ctx.fillStyle = cssVar('--muted'); ctx.font = '11px Inter, sans-serif';
  ctx.fillText('Planned', padL + 14, 17);
  ctx.fillStyle = 'rgba(52,211,153,0.8)';  ctx.fillRect(padL + 80, 8, 10, 10);
  ctx.fillStyle = cssVar('--muted');
  ctx.fillText('Done', padL + 94, 17);
}

export function renderTrendChart(stats) {
  const trend = stats?.trend;
  if (!trend?.length) return;
  const canvas = document.getElementById('trend-chart');
  const { ctx, w, h } = clearCanvas(canvas);

  const max  = Math.max(1, ...trend.map(d => d.count));
  const padL = 36, padR = 16, padT = 24, padB = 36;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  const pts = trend.map((d, i) => ({
    x: padL + (i / Math.max(trend.length - 1, 1)) * chartW,
    y: padT + chartH * (1 - d.count / max),
    label: String(d.week || '').slice(-5),
    count: d.count
  }));

  // area fill
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, padT + chartH);
  ctx.lineTo(pts[0].x, padT + chartH);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
  grad.addColorStop(0,   'rgba(56,189,248,0.25)');
  grad.addColorStop(1,   'rgba(56,189,248,0)');
  ctx.fillStyle = grad;
  ctx.fill();

  // line
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth   = 2.5;
  ctx.lineJoin    = 'round';
  ctx.stroke();

  // dots + labels
  pts.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = cssVar('--muted');
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.label, p.x, h - padB + 16);
    if (p.count) ctx.fillText(p.count, p.x, p.y - 10);
  });
  ctx.textAlign = 'left';
}

export function renderHeatmap(data) {
  if (!data?.length) return;
  const canvas = document.getElementById('heatmap-chart');
  const { ctx, w, h } = clearCanvas(canvas);

  const cols   = 7;
  const rows   = Math.ceil(data.length / cols);
  const padL   = 8, padT = 8, padR = 8, padB = 8;
  const cellW  = (w - padL - padR)  / cols  - 4;
  const cellH  = (h - padT - padB)  / rows  - 4;

  data.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x   = padL + col * (cellW + 4);
    const y   = padT + row * (cellH + 4);
    const energy = Number(item.energy || 0);

    const fill = energy > 900 ? '#ef4444'
               : energy > 600 ? '#f59e0b'
               : energy > 200 ? '#22c55e'
               : 'rgba(148,163,184,0.14)';

    ctx.fillStyle = fill;
    roundRect(ctx, x, y, cellW, cellH, 8);
    ctx.fill();

    ctx.fillStyle = energy > 200 ? '#fff' : cssVar('--muted');
    ctx.font = `bold 11px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(String(item.date || '').slice(5), x + cellW / 2, y + cellH / 2 - 4);
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText(energy ? energy + ' E' : '—', x + cellW / 2, y + cellH / 2 + 12);
  });
  ctx.textAlign = 'left';
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

export function renderPriorityChart(data) {
  if (!data?.length) return;
  const canvas = document.getElementById('priority-chart');
  if (!canvas) return;
  const { ctx, w, h } = clearCanvas(canvas);

  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(cx, cy) - 20;

  const total = data.reduce((sum, item) => sum + item.count, 0);
  if (total === 0) {
    ctx.fillStyle = cssVar('--muted');
    ctx.textAlign = 'center';
    ctx.fillText('No priority data available', cx, cy);
    return;
  }

  let startAngle = 0;
  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6']; // priority 5 to 1 mapping or just random colors, priority ranges 1-5. We mapped P5 to red in backend?
  // Our priorities: 1 (low), 2, 3, 4, 5 (high)
  const pColors = {
    '1': '#3b82f6',
    '2': '#22c55e',
    '3': '#eab308',
    '4': '#f97316',
    '5': '#ef4444'
  };

  data.forEach((item) => {
    const sliceAngle = (item.count / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();

    ctx.fillStyle = pColors[String(item.priority)] || '#ccc';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // label
    const midAngle = startAngle + sliceAngle / 2;
    const labelX = cx + Math.cos(midAngle) * (radius + 12);
    const labelY = cy + Math.sin(midAngle) * (radius + 12);
    
    ctx.fillStyle = cssVar('--text');
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`P${item.priority}`, labelX, labelY);

    startAngle = endAngle;
  });
}

export function renderAnalytics(stats, weekly, heatmap, priority) {
  if (!stats) return;
  document.getElementById('stat-hit-rate').textContent    = `${Math.round(stats.hitRate     || 0)}%`;
  document.getElementById('stat-completed').textContent   = `${stats.completedTasks          || 0} completed`;
  document.getElementById('stat-total-tasks').textContent = `${stats.totalTasks              || 0}`;
  document.getElementById('stat-avg-score').textContent   = `${Math.round(stats.avgScore     || 0)}`;
  document.getElementById('stat-overdue').textContent     = `${stats.overdueTasks            || 0}`;
  if (weekly?.length)  renderWeeklyChart(weekly);
  if (stats?.trend)    renderTrendChart(stats);
  if (heatmap?.length) renderHeatmap(heatmap);
  if (priority?.length) renderPriorityChart(priority);
}