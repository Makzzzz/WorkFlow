import React from 'react';
import { getInitials, moveCaretToEnd } from '../utils/helpers.js';

export function ProfilePage({ currentUser, onSave, onLogout }) {
  const safeUser = currentUser ?? {
    name: 'Нина Тичер',
    firstName: 'Нина',
    lastName: 'Тичер',
    email: 'nina@example.com',
  };
  const [formData, setFormData] = React.useState({
    firstName: safeUser.firstName ?? safeUser.name.split(' ')[0] ?? '',
    lastName: safeUser.lastName ?? safeUser.name.split(' ').slice(1).join(' ') ?? '',
    email: safeUser.email ?? '',
  });

  React.useEffect(() => {
    setFormData({
      firstName: safeUser.firstName ?? safeUser.name.split(' ')[0] ?? '',
      lastName: safeUser.lastName ?? safeUser.name.split(' ').slice(1).join(' ') ?? '',
      email: safeUser.email ?? '',
    });
  }, [safeUser.email, safeUser.firstName, safeUser.lastName, safeUser.name]);

  const handleChange = (field) => (event) => {
    const { value } = event.target;
    setFormData((currentData) => ({ ...currentData, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const email = formData.email.trim();
    if (!firstName || !lastName || !email) return;
    onSave({ name: `${firstName} ${lastName}`, firstName, lastName, email });
  };

  return (
    <section className="profile-layout motion-rise motion-delay-2">
      <form className="profile-card motion-rise motion-delay-3" onSubmit={handleSubmit}>
        <div className="profile-card__header">
          <div>
            <h1>Профиль</h1>
            <p>Измените основные данные своей учетной записи.</p>
          </div>
          <div className="profile-card__avatar">{getInitials(safeUser.name)}</div>
        </div>

        <div className="profile-card__grid">
          <label className="field">
            <span>Имя</span>
            <input
              onChange={handleChange('firstName')}
              onClick={moveCaretToEnd}
              onFocus={moveCaretToEnd}
              type="text"
              value={formData.firstName}
            />
          </label>

          <label className="field">
            <span>Фамилия</span>
            <input
              onChange={handleChange('lastName')}
              onClick={moveCaretToEnd}
              onFocus={moveCaretToEnd}
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
            onClick={moveCaretToEnd}
            onFocus={moveCaretToEnd}
            type="text"
            value={formData.email}
          />
        </label>

        <div className="profile-card__actions">
          <button className="button button--primary" type="submit">
            Сохранить изменения
          </button>
        </div>

        <button className="button button--danger" onClick={onLogout} type="button">
          Выйти из профиля
        </button>
      </form>
    </section>
  );
}