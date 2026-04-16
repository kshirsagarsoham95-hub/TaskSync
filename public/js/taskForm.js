import { openModal, closeModal } from './modal.js';
import { createTagEditor } from './tags.js';
import { createSubtaskEditor } from './subtasks.js';

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function createAttachmentEditor(initialLinks = []) {
  const root = document.createElement('div');
  root.className = 'tag-shell';
  const list = document.createElement('div');
  const state = { links: [...initialLinks] };

  function render() {
    list.innerHTML = '';
    if (!state.links.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No attachments yet';
      list.appendChild(empty);
      return;
    }

    state.links.forEach((link, index) => {
      const row = document.createElement('div');
      row.className = 'attachment-item';
      const input = document.createElement('input');
      input.placeholder = 'https://example.com/resource';
      input.value = link;
      input.addEventListener('input', () => {
        state.links[index] = input.value;
        input.style.borderColor = input.value.trim() && !isValidUrl(input.value.trim()) ? 'rgba(251,113,133,0.65)' : '';
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'icon-btn';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        state.links.splice(index, 1);
        render();
      });
      row.append(input, remove);
      list.appendChild(row);
    });
  }

  root.appendChild(list);
  render();
  return {
    node: root,
    addLink() {
      state.links.push('');
      render();
    },
    getLinks() {
      return state.links.map((link) => link.trim()).filter(Boolean);
    }
  };
}

function validatePayload(payload) {
  const issues = [];
  if (!payload.title.trim()) {
    issues.push('Title is required.');
  }
  if (!Number.isFinite(payload.estimated_minutes) || payload.estimated_minutes <= 0) {
    issues.push('Estimated minutes must be greater than 0.');
  }
  if (!Number.isFinite(payload.buffer_minutes) || payload.buffer_minutes < 0) {
    issues.push('Buffer minutes cannot be negative.');
  }
  if (payload.deadline && payload.scheduled_date && payload.scheduled_date > payload.deadline) {
    issues.push('Scheduled date should not be later than the deadline.');
  }
  const invalidLinks = payload.attachmentLinks.filter((link) => !isValidUrl(link));
  if (invalidLinks.length) {
    issues.push('Attachment links must be valid http or https URLs.');
  }
  return issues;
}

export function openTaskForm({ task = null, onSubmit }) {
  const template = document.getElementById('task-form-template');
  const fragment = template.content.cloneNode(true);
  const form = fragment.querySelector('#task-form');
  const title = fragment.querySelector('#task-form-title');
  title.textContent = task ? 'Edit Task' : 'New Task';

  const tagEditor = createTagEditor(task?.tags || []);
  const subtaskEditor = createSubtaskEditor(task?.subtasks || []);
  const attachmentEditor = createAttachmentEditor(task?.attachmentLinks || []);
  subtaskEditor.render();

  const feedback = document.createElement('div');
  feedback.className = 'empty-state';
  feedback.style.display = 'none';
  feedback.style.textAlign = 'left';
  feedback.style.padding = '14px 16px';
  feedback.style.border = '1px solid rgba(251,113,133,0.35)';
  feedback.style.borderRadius = '14px';
  feedback.style.background = 'rgba(127,29,29,0.2)';

  fragment.querySelector('#tag-editor').appendChild(tagEditor.node);
  fragment.querySelector('#subtask-editor').appendChild(subtaskEditor.node);
  fragment.querySelector('#subtask-editor').appendChild(subtaskEditor.list);
  fragment.querySelector('#attachment-editor').appendChild(attachmentEditor.node);
  form.insertBefore(feedback, form.querySelector('.form-actions'));

  if (task) {
    Object.entries({
      title: task.title,
      template_name: task.template_name || '',
      description: task.description || '',
      deadline: task.deadline || '',
      scheduled_date: task.scheduled_date || '',
      estimated_minutes: task.estimated_minutes,
      buffer_minutes: task.buffer_minutes || 0,
      priority: task.priority,
      energy_level: task.energy_level,
      status: task.status,
      recurrence: task.recurrence,
      notes: task.notes || ''
    }).forEach(([name, value]) => {
      const field = form.elements.namedItem(name);
      if (field) {
        field.value = value ?? '';
      }
    });
    const templateCheckbox = fragment.querySelector('#task-is-template');
    if (templateCheckbox) {

      templateCheckbox.checked = Boolean(task.template_name);
}
  }

  fragment.querySelector('#btn-add-subtask').addEventListener('click', () => subtaskEditor.addSubtask());
  fragment.querySelector('#btn-add-attachment').addEventListener('click', () => attachmentEditor.addLink());

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    feedback.style.display = 'none';
    const submitButton = form.querySelector('.primary-btn');
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';

    try {
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      payload.title = String(payload.title || '').trim();
      payload.description = String(payload.description || '').trim();
      payload.notes = String(payload.notes || '').trim();
      payload.estimated_minutes = Number(payload.estimated_minutes || 60);
      payload.buffer_minutes = Number(payload.buffer_minutes || 0);
      payload.priority = Number(payload.priority || 3);
      payload.energy_level = Number(payload.energy_level || 2);
      const templateCheckbox = fragment.querySelector('#task-is-template');

        payload.template_name = (templateCheckbox && templateCheckbox.checked)
          ? String(payload.template_name || payload.title).trim()
          : null;
      payload.tags = tagEditor.getTags();
      payload.subtasks = subtaskEditor.getSubtasks();
      payload.attachmentLinks = attachmentEditor.getLinks();

      const issues = validatePayload(payload);
      if (issues.length) {
        feedback.style.display = 'block';
        feedback.innerHTML = issues.map((issue) => `<div>${issue}</div>`).join('');
        return;
      }

      await onSubmit(payload);
      closeModal();
    } catch (error) {
      feedback.style.display = 'block';
      feedback.textContent = error.message || 'Could not save the task.';
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Save Task';
    }
  });

  const wrapper = document.createElement('div');
  wrapper.appendChild(fragment);
  openModal(wrapper);
}

