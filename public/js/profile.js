import { api } from './api.js';
import { showToast } from './toast.js';

export function renderProfile(user, saveAuthUser) {
  if (!user) return;
  document.getElementById('profile-display-name').value = user.display_name || '';
  document.getElementById('profile-recommendation').checked = user.recommendation_setting === 1;

  const profileForm = document.getElementById('profile-form');
  profileForm.onsubmit = async (e) => {
    e.preventDefault();
    const displayName = document.getElementById('profile-display-name').value;
    const recommendationSetting = document.getElementById('profile-recommendation').checked;

    try {
      let updatedUser = user;
      
      if (displayName !== user.display_name) {
        const resProfile = await api.updateProfile({ display_name: displayName });
        if (resProfile && resProfile.user) updatedUser = resProfile.user;
      }
      
      if ((recommendationSetting ? 1 : 0) !== user.recommendation_setting) {
        const resSettings = await api.updateSettings({ recommendation_setting: recommendationSetting });
        if (resSettings && resSettings.user) updatedUser = resSettings.user;
      }
      
      saveAuthUser(updatedUser);
      showToast('Settings saved successfully', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const passwordForm = document.getElementById('password-form');
  passwordForm.onsubmit = async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('profile-current-pwd').value;
    const newPassword = document.getElementById('profile-new-pwd').value;

    try {
      if (currentPassword && newPassword) {
        await api.updatePassword({ currentPassword, newPassword });
        showToast('Password changed successfully', 'success');
        document.getElementById('profile-current-pwd').value = '';
        document.getElementById('profile-new-pwd').value = '';
        document.getElementById('btn-back-settings').click(); // Go back to settings view
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}
