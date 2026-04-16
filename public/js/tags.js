export function createTagEditor(initialTags = []) {
  const root = document.createElement('div');
  root.className = 'tag-shell';
  const chips = document.createElement('div');
  chips.className = 'tag-editor';
  const input = document.createElement('input');
  input.className = 'tag-input';
  input.placeholder = 'Type a tag and press Enter';

  const state = { tags: [...initialTags] };

  function render() {
    chips.innerHTML = '';
    state.tags.forEach((tag) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = `${tag} ×`;
      chip.addEventListener('click', () => {
        state.tags = state.tags.filter((item) => item !== tag);
        render();
      });
      chips.appendChild(chip);
    });
  }

  function addTag(value) {
    const tag = String(value || '').trim();
    if (tag && !state.tags.includes(tag)) {
      state.tags.push(tag);
      render();
    }
    input.value = '';
  }

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag(input.value.replace(',', ''));
    }
  });

  root.append(chips, input);
  render();
  return { node: root, getTags: () => [...state.tags] };
}
