import { api } from './api.js';

export async function generateRecurringTasks() {
  return api.generateRecurring();
}

export async function rescheduleMissedTasks(holidays = []) {
  return api.reschedule(holidays);
}
