export function openModal(node) {
  const shell = document.getElementById('modal-root');
  const content = document.getElementById('modal-content');
  content.innerHTML = '';
  content.appendChild(node);
  shell.classList.remove('hidden');
}

export function closeModal() {
  document.getElementById('modal-root').classList.add('hidden');
  document.getElementById('modal-content').innerHTML = '';
}

export function initModal() {
  document.getElementById('modal-root').addEventListener('click', (event) => {
    if (event.target.matches('[data-modal-close]')) {
      closeModal();
    }
  });
}
