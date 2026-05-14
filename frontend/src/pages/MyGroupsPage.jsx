import React from 'react';
import { STORAGE_KEYS, readStorage, writeStorage } from '../utils/storage.js';

export function MyGroupsPage() {
  const [groups, setGroups] = React.useState(() => readStorage(STORAGE_KEYS.groups) ?? []);
  const [search, setSearch] = React.useState('');
  const [joinCode, setJoinCode] = React.useState('');
  const [joinError, setJoinError] = React.useState('');
  const [joinSuccess, setJoinSuccess] = React.useState('');

  const handleJoin = () => {
    const code = joinCode.trim();
    if (code.length !== 6) { setJoinError('Введите 6-значный код'); return; }
    const all = readStorage(STORAGE_KEYS.groups) ?? [];
    const found = all.find((g) => g.code === code);
    if (!found) { setJoinError('Группа с таким кодом не найдена'); setJoinSuccess(''); return; }
    const currentUser = readStorage(STORAGE_KEYS.currentUser);
    if (currentUser) {
      const members = readStorage(STORAGE_KEYS.members) ?? [];
      const alreadyMember = members.some((m) => m.groupId === found.id && m.email === currentUser.email);
      if (!alreadyMember) {
        writeStorage(STORAGE_KEYS.members, [
          ...members,
          { id: Date.now(), groupId: found.id, name: currentUser.name, email: currentUser.email, joinedAt: new Date().toLocaleDateString('ru-RU') },
        ]);
      }
    }
    setJoinError('');
    setJoinSuccess(`Вы вступили в группу «${found.name}»`);
    writeStorage(STORAGE_KEYS.selectedGroupId, found.id);
    setJoinCode('');
    setTimeout(() => { setJoinSuccess(''); window.location.hash = '#group'; }, 1200);
  };

  React.useEffect(() => {
    setGroups(readStorage(STORAGE_KEYS.groups) ?? []);
  }, []);

  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()),
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
            />
            <button className="button button--primary" onClick={handleJoin} type="button">
              Вступить
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

      {groups.length === 0 ? (
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
                writeStorage(STORAGE_KEYS.selectedGroupId, group.id);
                window.location.hash = '#group';
              }}
            >
              <div className="group-card__body">
                <h2 className="group-card__name">{group.name}</h2>
                {group.description && (
                  <p className="group-card__desc">{group.description}</p>
                )}
              </div>
              <div className="group-card__footer">
                <span className="group-card__date">Создана {group.createdAt}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}