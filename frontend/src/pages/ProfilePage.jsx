import React from 'react';
import { getInitials } from '../utils/helpers.js';

export function ProfilePage({ currentUser, onSave, onLogout }) {
  const user = currentUser ?? {};
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'U';

  const [formData, setFormData] = React.useState({
    firstName: user.first_name ?? '',
    lastName: user.last_name ?? '',
    email: user.email ?? '',
  });
  const [saveState, setSaveState] = React.useState('idle'); // 'idle' | 'loading' | 'saved' | 'error'

  React.useEffect(() => {
    setFormData({
      firstName: currentUser?.first_name ?? '',
      lastName: currentUser?.last_name ?? '',
      email: currentUser?.email ?? '',
    });
  }, [currentUser?.first_name, currentUser?.last_name, currentUser?.email]);

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const email = formData.email.trim();
    if (!firstName || !email) return;
    setSaveState('loading');
    const result = await onSave({ first_name: firstName, last_name: lastName, email });
    if (result?.success) {
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } else {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 2000);
    }
  };

  return (
    <section className="profile-layout motion-rise motion-delay-2">
      <form className="profile-card motion-rise motion-delay-3" onSubmit={handleSubmit}>
        <div className="profile-card__header">
          <div>
            <h1>Профиль</h1>
            <p>Измените основные данные своей учетной записи.</p>
          </div>
          <div className="profile-card__avatar">{getInitials(fullName)}</div>
        </div>

        <div className="profile-card__grid">
          <label className="field">
            <span>Имя</span>
            <input
              onChange={handleChange('firstName')}
              type="text"
              value={formData.firstName}
            />
          </label>

          <label className="field">
            <span>Фамилия</span>
            <input
              onChange={handleChange('lastName')}
              type="text"
              value={formData.lastName}
            />
          </label>
        </div>

        <label className="field">
          <span>Email</span>
          <input
            autoComplete="email"
            inputMode="email"
            onChange={handleChange('email')}
            type="text"
            value={formData.email}
          />
        </label>

        <div className="profile-card__actions">
          <button className="button button--primary" type="submit" disabled={saveState === 'loading'}>
            {saveState === 'loading' ? 'Сохранение...' : saveState === 'saved' ? 'Сохранено' : saveState === 'error' ? 'Ошибка' : 'Сохранить изменения'}
          </button>
        </div>

        <button className="button button--danger" onClick={onLogout} type="button">
          Выйти из профиля
        </button>
      </form>
    </section>
  );
}
