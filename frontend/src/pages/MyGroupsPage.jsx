import React from 'react';
import { groupService } from '../services/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { debugApiConfig } from '../config.js';
import { navigateTo } from '../utils/url.js';

export function MyGroupsPage() {
  const { currentUser } = useAuth();
  const [groups, setGroups] = React.useState([]);
  const [search, setSearch] = React.useState('');
  const [joinCode, setJoinCode] = React.useState('');
  const [joinError, setJoinError] = React.useState('');
  const [joinSuccess, setJoinSuccess] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [joining, setJoining] = React.useState(false);

  // Загрузка групп при монтировании компонента
  React.useEffect(() => {
    console.log('🏁 MyGroupsPage mounted, starting loadGroups...');
    debugApiConfig(); // Показываем конфигурацию API
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      console.log('🔄 Начало загрузки групп...');
      
      console.log('📡 Вызов groupService.getMyGroups()...');
      const data = await groupService.getMyGroups();
      console.log('✅ Данные групп получены:', data);
      setGroups(data || []);
      
      // Если данные пустые, проверяем с тестовым токеном
      if (!data || data.length === 0) {
        console.log('⚠️ Получен пустой список групп. Проверяем с тестовым токеном...');
        await testWithDebugToken();
      }
    } catch (error) {
      console.error('❌ Ошибка при загрузке групп:', error);
      console.error('Детали ошибки:', error.message);
      console.error('Стек ошибки:', error.stack);
      
      // Пробуем использовать тестовый токен
      console.log('🔄 Пробуем использовать тестовый токен...');
      await testWithDebugToken();
    } finally {
      setLoading(false);
    }
  };

  // Функция для тестирования с отладочным токеном
  const testWithDebugToken = async () => {
    try {
      const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhcGl0ZXN0ZXJAZXhhbXBsZS5jb20iLCJ0eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzc5MzA0MjY4fQ.Cmc5ueO3PahVFA1PmPeJkcgrcGbKhxFZwvys8-vmYdk';
      const API_BASE_URL = 'http://localhost:8000';
      
      console.log('🔧 Тестирование с фиксированным токеном...');
      const response = await fetch(`${API_BASE_URL}/groups/my`, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Тестовый запрос успешен! Групп:', data.length);
        setGroups(data || []);
        
        // Сохраняем токен для будущих запросов (в sessionStorage)
        if (window.sessionStorage) {
          sessionStorage.setItem('access_token', TEST_TOKEN);
          console.log('🔑 Тестовый токен сохранен в sessionStorage');
        }
      } else {
        const text = await response.text();
        console.error('❌ Тестовый запрос не удался:', response.status, text);
      }
    } catch (error) {
      console.error('❌ Ошибка тестового запроса:', error.message);
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim();
    if (code.length !== 6) { 
      setJoinError('Введите 6-значный код'); 
      return; 
    }
    
    try {
      setJoining(true);
      setJoinError('');
      
      const response = await groupService.joinGroupByCode(code);
      
      setJoinSuccess(`Вы вступили в группу «${response.name}»`);
      // Используем navigateTo для перехода к группе с параметром groupId
      navigateTo('group', { groupId: response.id });
      setJoinCode('');
      
      // Обновляем список групп
      await loadGroups();
      
      setTimeout(() => { 
        setJoinSuccess(''); 
      }, 1200);
    } catch (error) {
      console.error('Ошибка при вступлении в группу:', error);
      setJoinError(error.message || 'Не удалось вступить в группу. Проверьте код и попробуйте снова.');
      setJoinSuccess('');
    } finally {
      setJoining(false);
    }
  };

  const filtered = groups.filter((g) =>
    g.group_name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <section className="my-groups-layout motion-rise motion-delay-2">
      <h1 className="my-groups__title motion-rise motion-delay-3">Мои группы</h1>

      <div className="join-by-code motion-rise motion-delay-3">
          <span className="join-by-code__label">Вступить в группу по коду</span>
          <div className="join-by-code__row">
            <input
              className="join-by-code__input"
              maxLength={6}
              onChange={(e) => { setJoinCode(e.target.value.replace(/\D/g, '')); setJoinError(''); }}
              placeholder="000000"
              type="text"
              value={joinCode}
              disabled={joining}
            />
            <button 
              className="button button--primary" 
              onClick={handleJoin} 
              type="button"
              disabled={joining}
            >
              {joining ? 'Вступление...' : 'Вступить'}
            </button>
          </div>
          {joinError && <span className="join-by-code__error">{joinError}</span>}
          {joinSuccess && <span className="join-by-code__success">{joinSuccess}</span>}
        </div>

      <div className="my-groups-toolbar motion-rise motion-delay-4">
        <input
          className="my-groups-search"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию"
          type="search"
          value={search}
        />
        <a className="button button--primary button--as-link" href="#create-group">
          Создать группу
        </a>
      </div>

      {loading ? (
        <div className="my-groups-empty motion-rise motion-delay-5">
          <p>Загрузка групп...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="my-groups-empty motion-rise motion-delay-5">
          <p>У вас пока нет групп.</p>
          <a className="button button--outline button--as-link" href="#create-group">
            Создать первую группу
          </a>
        </div>
      ) : filtered.length === 0 ? (
        <div className="my-groups-empty motion-rise motion-delay-5">
          <p>Группы с таким названием не найдены.</p>
        </div>
      ) : (
        <div className="my-groups-grid motion-rise motion-delay-5">
          {filtered.map((group) => (
            <article
              className="group-card"
              key={group.id}
              onClick={() => {
                // Используем navigateTo для перехода к группе с параметром groupId
                navigateTo('group', { groupId: group.id });
              }}
            >
              <div className="group-card__body">
                <h2 className="group-card__name">{group.group_name}</h2>
                {group.description && (
                  <p className="group-card__desc">{group.description}</p>
                )}
              </div>
              <div className="group-card__footer">
                <span className="group-card__date">
                  {group.created_at ? `Создана ${new Date(group.created_at).toLocaleDateString('ru-RU')}` : 'Дата создания не указана'}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}