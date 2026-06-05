import React from 'react';
import { groupService } from '../services/api.js';
import { moveCaretToEnd } from '../utils/helpers.js';
import { SESSION_KEYS } from '../config.js';
import { getAccessToken, clearAuthData } from '../utils/auth-session.js';

export function CreateGroupPage() {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSubmit = async (event) => {
    console.log('🟢 handleSubmit вызван');
    event.preventDefault();
    console.log('🟢 event.preventDefault() выполнен');
    
    if (!name.trim()) {
      console.log('🔴 Имя группы не заполнено');
      return;
    }
    
    console.log('🟢 Имя группы заполнено:', name);
    
    // Проверяем аутентификацию
    const accessToken = getAccessToken();
    console.log('🟢 Проверка токена:', accessToken ? 'Токен найден' : 'Токен не найден');
    
    if (!accessToken) {
      const errorMsg = 'Вы не авторизованы. Пожалуйста, войдите в систему.';
      console.error('🔴 Пользователь не аутентифицирован. Токен отсутствует.');
      setError(errorMsg);
      // Перенаправляем на страницу логина
      setTimeout(() => {
        console.log('🟢 Перенаправление на страницу логина');
        window.location.hash = '#auth?mode=login';
      }, 2000);
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      console.log('🟢 Начало создания группы, loading=true');
      
      const refreshToken = sessionStorage.getItem(SESSION_KEYS.REFRESH_TOKEN);
      console.log('🔑 Токены в sessionStorage:', {
        accessToken: accessToken ? 'есть' : 'отсутствует',
        refreshToken: refreshToken ? 'есть' : 'отсутствует'
      });
      
      const groupData = {
        group_name: name.trim(),
        description: description.trim() || null
      };
      
      console.log('📤 Отправка данных для создания группы:', groupData);
      console.log('🌐 API_BASE_URL:', window.API_BASE_URL || 'не определен');
      
      console.log('🟢 Вызов groupService.createGroup...');
      const response = await groupService.createGroup(groupData);
      console.log('✅ Группа создана успешно:', response);
      
      // Перенаправляем на страницу моих групп
      console.log('🟢 Перенаправление на #my-groups');
      window.location.hash = '#my-groups';
    } catch (err) {
      console.error('🔴 Ошибка при создании группы:', err);
      console.error('🔴 Детали ошибки:', {
        message: err.message,
        status: err.status,
        data: err.data
      });
      
      if (err.status === 401) {
        const errorMsg = 'Сессия истекла. Пожалуйста, войдите снова.';
        console.error('🔴 Ошибка 401 - сессия истекла');
        setError(errorMsg);
        // Очищаем токены и перенаправляем на логин
        clearAuthData();
        setTimeout(() => {
          window.location.hash = '#auth?mode=login';
        }, 2000);
      } else {
        const errorMsg = err.message || 'Не удалось создать группу. Попробуйте снова.';
        console.error('🔴 Другая ошибка:', errorMsg);
        setError(errorMsg);
      }
    } finally {
      console.log('🟢 Завершение handleSubmit, loading=false');
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
              onClick={moveCaretToEnd}
              onFocus={moveCaretToEnd}
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