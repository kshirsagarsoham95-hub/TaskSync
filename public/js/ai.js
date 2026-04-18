import { api } from './api.js';
import { state } from './app.js';

let isOpen = false;

export function initAiPanel() {
  const panel = document.getElementById('ai-panel');
  const btnToggle = document.getElementById('btn-ai-toggle');
  const btnClose = document.getElementById('btn-ai-close');
  const btnSend = document.getElementById('btn-ai-send');
  const input = document.getElementById('ai-input');

  if (!panel || !btnToggle) return;

  btnToggle.addEventListener('click', toggleAiPanel);
  btnClose.addEventListener('click', () => { isOpen = true; toggleAiPanel(); });

  btnSend.addEventListener('click', () => sendMessage(input.value));
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage(input.value);
  });
}

export function toggleAiPanel() {
  const panel = document.getElementById('ai-panel');
  isOpen = !isOpen;
  if (isOpen) {
    panel.classList.add('open');
    document.getElementById('ai-input').focus();
  } else {
    panel.classList.remove('open');
  }
}

async function sendMessage(msg) {
  if (!msg.trim()) return;
  const input = document.getElementById('ai-input');
  const body = document.getElementById('ai-chat-body');
  
  input.value = '';
  appendMessage(msg, 'user');
  
  const loadingId = appendMessage('...', 'ai');
  
  try {
    const summary = state.tasks.map(t => ({
      id: t.id, title: t.title, status: t.status, 
      deadline: t.deadline, priority: t.priority
    }));
    const res = await api.askAi(msg, summary);
    document.getElementById(loadingId).innerHTML = parseMarkdown(res.reply);
  } catch (err) {
    document.getElementById(loadingId).innerText = "Sorry, I encountered an error: " + err.message;
  }
  
  body.scrollTop = body.scrollHeight;
}

function parseMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
  
  html = html.replace(/(<br>|^)\s*\*\s+(.*?)(?=<br>|$)/g, '$1&bull; $2');
  return html;
}

function appendMessage(text, role) {
  const body = document.getElementById('ai-chat-body');
  const div = document.createElement('div');
  div.className = `ai-msg ${role}`;
  div.innerHTML = role === 'user' ? text.replace(/</g, '&lt;') : parseMarkdown(text);
  div.id = 'ai-msg-' + Date.now() + Math.random();
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
  return div.id;
}
