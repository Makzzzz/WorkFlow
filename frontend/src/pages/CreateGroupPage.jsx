import React from 'react';
import { groupService } from '../services/api.js';
import { getAccessToken, clearAuthData } from '../utils/auth-session.js';

export function CreateGroupPage() {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;

    const accessToken = getAccessToken();
    if (!accessToken) {
      setError('Вы не авторизованы. Пожалуйста, войдите в систему.');
      setTimeout(() => { window.location.hash = '#auth?mode=login'; }, 2000);
      return;
    }

    try {
      setLoading(true);
      setError('');
      await groupService.createGroup({ group_name: name.trim(), description: description.trim() || null });
      window.location.hash = '#my-groups';
    } catch (err) {
      if (err.status === 401) {
        setError('Сессия истекла. Пожалуйста, войдите снова.');
        clearAuthData();
        setTimeout(() => { window.location.hash = '#auth?mode=login'; }, 2000);
      } else {
        setError(err.message || 'Не удалось создать группу. Попробуйте снова.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="create-group-layout motion-rise motion-delay-2">
      <div className="create-group-content motion-rise motion-delay-3">
        <h1 className="create-group__title">Создайте новую группу</h1>

        <form className="create-group-card" onSubmit={handleSubmit}>
          <label className="field">
            <span>Название группы</span>
            <input
              onChange={(e) => setName(e.target.value)}
              type="text"
              value={name}
              disabled={loading}
            />
          </label>

          <label className="field create-group__desc-field">
            <span>Описание</span>
            <textarea
              className="create-group__textarea"
              maxLength={200}
              onChange={(e) => setDescription(e.target.value)}
              value={description}
              disabled={loading}
            />
            <span className={`create-group__char-count${description.length >= 190 ? ' create-group__char-count--warn' : ''}`}>
              {description.length} / 200
            </span>
          </label>
        {error && (
          <div className="create-group__error">
            {error}
          </div>
        )}

        <button
          className="button button--primary create-group__submit"
          type="submit"
          disabled={loading || !name.trim()}
        >
          {loading ? 'Создание...' : 'Создать группу'}
        </button>
        </form>
      </div>
    </section>
  );
}