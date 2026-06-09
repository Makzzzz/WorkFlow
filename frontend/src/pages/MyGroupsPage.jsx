import React from 'react';
import { groupService } from '../services/api.js';
import { navigateTo } from '../utils/url.js';

export function MyGroupsPage() {
  const [groups, setGroups] = React.useState([]);
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [joinLink, setJoinLink] = React.useState('');
  const [joining, setJoining] = React.useState(false);
  const [joinError, setJoinError] = React.useState('');

  React.useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await groupService.getMyGroups();
      setGroups(data || []);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    const trimmed = joinLink.trim();
    if (!trimmed) return;
    const match = trimmed.match(/[?&]code=([^&\s]+)/);
    const token = match ? match[1] : trimmed;
    setJoining(true);
    setJoinError('');
    try {
      await groupService.joinGroupByToken(token);
      setJoinLink('');
      await loadGroups();
    } catch (e) {
      setJoinError(e.message || 'Не удалось вступить в группу');
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

      <div className="my-groups-join motion-rise motion-delay-4">
        <input
          className="my-groups-search"
          placeholder="Вставьте ссылку-приглашение"
          value={joinLink}
          onChange={(e) => { setJoinLink(e.target.value); setJoinError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          disabled={joining}
        />
        <button
          className="button button--primary"
          onClick={handleJoin}
          disabled={joining || !joinLink.trim()}
          type="button"
        >
          {joining ? 'Вступление...' : 'Вступить'}
        </button>
        {joinError && <p className="my-groups-join__error">{joinError}</p>}
      </div>

      <div className="my-groups-toolbar motion-rise motion-delay-4">
        <input
          className="my-groups-search"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию"
          type="search"
          value={search}
        />
        <a className="button button--primary button--as-link" href={"#create-group"}>
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
          <a className="button button--outline button--as-link" href={"#create-group"}>
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
              onClick={() => navigateTo('group', { groupId: group.id })}
            >
              <div className="group-card__body">
                <h2 className="group-card__name">{group.group_name}</h2>
                {group.description && (
                  <p className="group-card__desc">{group.description}</p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
