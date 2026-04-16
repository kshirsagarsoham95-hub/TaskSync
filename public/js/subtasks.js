export function createSubtaskEditor(initialSubtasks = []) {
  const root = document.createElement('div');
  root.className = 'tag-shell';
  const list = document.createElement('div');
  list.id = 'subtask-list';
  const state = { subtasks: initialSubtasks.map((item) => ({ title: item.title, checked: Boolean(item.checked) })) };

  function render() {
    list.innerHTML = '';
    if (!state.subtasks.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No subtasks yet';
      list.appendChild(empty);
      return;
    }

    state.subtasks.forEach((subtask, index) => {
      const row = document.createElement('div');
      row.className = 'subtask-item';
      const label = document.createElement('label');
      label.className = 'checkbox-wrap';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = subtask.checked;
      checkbox.addEventListener('change', () => {
        state.subtasks[index].checked = checkbox.checked;
      });
      const title = document.createElement('input');
      title.value = subtask.title;
      title.addEventListener('input', () => {
        state.subtasks[index].title = title.value;
      });
      label.append(checkbox, title);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'icon-btn';
      remove.textContent = '×';
      remove.addEventListener('click', () => {
        state.subtasks.splice(index, 1);
        render();
      });
      row.append(label, remove);
      list.appendChild(row);
    });
  }

  return {
    node: root,
    list,
    addSubtask() {
      state.subtasks.push({ title: '', checked: false });
      render();
    },
    getSubtasks() {
      return state.subtasks.map((item) => ({ title: item.title.trim(), checked: item.checked })).filter((item) => item.title);
    },
    render
  };
}
