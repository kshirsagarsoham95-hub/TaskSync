export function exportTasksCsv(tasks) {
  const rows = [
    ['Title', 'Description', 'Deadline', 'Estimated Minutes', 'Priority', 'Energy', 'Tags', 'Status', 'Scheduled Date']
  ];
  tasks.forEach((task) => {
    let tagsArray = [];
    if (Array.isArray(task.tags)) tagsArray = task.tags;
    else if (typeof task.tags === 'string') tagsArray = task.tags.split(',').map(t => t.trim()).filter(Boolean);

    rows.push([
      task.title,
      task.description || '',
      task.deadline || '',
      task.estimated_minutes,
      task.priority,
      task.energy_level,
      tagsArray.join('|'),
      task.status,
      task.scheduled_date || ''
    ]);
  });
  downloadBlob(rows.map((row) => row.map(escapeCsv).join(',')).join('\n'), 'tasksync-tasks.csv', 'text/csv;charset=utf-8');
}

export function printDashboard() {
  window.print();
}

function escapeCsv(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadBlob(content, name, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
