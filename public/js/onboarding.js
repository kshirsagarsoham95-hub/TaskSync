import { api } from './api.js';
import { state } from './app.js';
import { showToast } from './toast.js';
import { openModal, closeModal } from './modal.js';

export function checkOnboarding() {
  if (!localStorage.getItem('tasksync-onboarded')) {
    showOnboarding();
  }
}

function showOnboarding() {
  const content = document.createElement('div');
  content.innerHTML = `
    <div style="text-align: center;">
      <h2 style="margin-bottom: 16px;">Welcome to TaskSync!</h2>
      
      <div id="onboarding-step-0">
        <h3>Step 1: Tell us about yourself</h3>
        <p style="margin: 10px 0; color: var(--muted);">What is your profession? We will tailor task categories for you.</p>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
          <button class="ghost-btn ob-prof-btn" data-prof="Student">Student</button>
          <button class="ghost-btn ob-prof-btn" data-prof="Corporate">Corporate / Professional</button>
          <button class="ghost-btn ob-prof-btn" data-prof="Freelancer">Freelancer</button>
          <button class="ghost-btn ob-prof-btn" data-prof="Other">Other</button>
        </div>
      </div>

      <div id="onboarding-step-1" style="display:none;">
        <h3>Step 2: Create your first task</h3>
        <p style="margin: 10px 0; color: var(--muted);">Click the "+ New Task" button to get started.</p>
        <button id="btn-ob-1" class="primary-btn">Next</button>
      </div>
      
      <div id="onboarding-step-2" style="display:none;">
        <h3>Step 3: Use the Kanban board</h3>
        <p style="margin: 10px 0; color: var(--muted);">Drag and drop tasks between To Do, In Progress, and Done.</p>
        <button id="btn-ob-2" class="primary-btn">Next</button>
      </div>
      
      <div id="onboarding-step-3" style="display:none;">
        <h3>Step 4: Generate your schedule</h3>
        <p style="margin: 10px 0; color: var(--muted);">Set up recurring tasks and use the Reschedule button to automatically plan your week.</p>
        <button id="btn-ob-3" class="primary-btn">Done</button>
      </div>
    </div>
  `;
  openModal(content);

  const profBtns = content.querySelectorAll('.ob-prof-btn');
  profBtns.forEach(btn => {
    btn.onclick = async () => {
      try {
        const prof = btn.dataset.prof;
        const res = await api.updateProfession({ profession: prof });
        if (state.user) state.user.profession = res.user.profession;
        showToast('Profession saved!', 'success');
        document.getElementById('onboarding-step-0').style.display = 'none';
        document.getElementById('onboarding-step-1').style.display = 'block';
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  });

  document.getElementById('btn-ob-1').onclick = () => {
    document.getElementById('onboarding-step-1').style.display = 'none';
    document.getElementById('onboarding-step-2').style.display = 'block';
  };
  document.getElementById('btn-ob-2').onclick = () => {
    document.getElementById('onboarding-step-2').style.display = 'none';
    document.getElementById('onboarding-step-3').style.display = 'block';
  };
  document.getElementById('btn-ob-3').onclick = () => {
    localStorage.setItem('tasksync-onboarded', '1');
    closeModal();
  };
}
