import React from 'react';
import { STORAGE_KEYS, readStorage, writeStorage } from '../utils/storage.js';
import { getInitials, formatDeadline } from '../utils/helpers.js';
import { Modal } from '../components/Modal.jsx';

export function GroupOrganizerPage({ currentUser, role }) {
  const isParticipant = role === 'participant';
  const [activeTab, setActiveTab] = React.useState('members');
  const [copied, setCopied] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const [groupId] = React.useState(() => readStorage(STORAGE_KEYS.selectedGroupId));
  const [groups, setGroups] = React.useState(() => readStorage(STORAGE_KEYS.groups) ?? []);
  const [tasks, setTasks] = React.useState(() =>
    (readStorage(STORAGE_KEYS.tasks) ?? []).filter((t) => t.groupId === groupId),
  );
  const [members, setMembers] = React.useState(() =>
    (readStorage(STORAGE_KEYS.members) ?? []).filter((m) => m.groupId === groupId),
  );

  const handleRemoveMember = (memberId) => {
    const all = readStorage(STORAGE_KEYS.members) ?? [];
    const updated = all.filter((m) => !(m.groupId === groupId && m.id === memberId));
    writeStorage(STORAGE_KEYS.members, updated);
    setMembers(updated.filter((m) => m.groupId === groupId));
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline) - new Date(b.deadline);
  });
  const group = groups.find((g) => g.id === groupId) ?? {
    name: 'Название группы',
    description: '',
    createdAt: 'dd.mm.yyyy',
  };

  const [editName, setEditName] = React.useState(group.name);
  const [editDesc, setEditDesc] = React.useState(group.description);

  React.useEffect(() => {
    setTasks((readStorage(STORAGE_KEYS.tasks) ?? []).filter((t) => t.groupId === groupId));
  }, [groupId]);

  const organizerName = currentUser?.name ?? 'Организатор';

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(group.code ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditStart = () => {
    setEditName(group.name);
    setEditDesc(group.description);
    setEditing(true);
  };

  const handleEditSave = () => {
    if (!editName.trim()) return;
    const updated = groups.map((g) =>
      g.id === groupId ? { ...g, name: editName.trim(), description: editDesc.trim() } : g,
    );
    writeStorage(STORAGE_KEYS.groups, updated);
    setGroups(updated);
    setEditing(false);
  };

  const handleEditCancel = () => setEditing(false);

  const handleDeleteGroup = () => {
    const updated = groups.filter((g) => g.id !== groupId);
    writeStorage(STORAGE_KEYS.groups, updated);
    window.location.hash = '#my-groups';
  };

  return (
    <section className="group-org-layout motion-rise motion-delay-2">
      <div className="group-org-header motion-rise motion-delay-3">
        <h1 className="group-org__title">{group.name}</h1>
        {!isParticipant && (
          <div className="group-org-header__actions">
            {group.code && (
              <div className="group-invite-code">
                <span className="group-invite-code__label">Код для вступления</span>
                <div className="group-invite-code__digits">
                  {group.code.split('').map((d, i) => (
                    <span className="group-invite-code__digit" key={i}>{d}</span>
                  ))}
                </div>
                <button
                  className="group-invite-code__copy"
                  onClick={handleCopyInvite}
                  type="button"
                >
                  {copied ? 'Скопировано!' : 'Скопировать'}
                </button>
              </div>
            )}
            <a
              className="button button--primary button--as-link"
              href="#create-task"
            >
              Создать задание
            </a>
          </div>
        )}
      </div>

      <div className="group-org-tabs motion-rise motion-delay-3">
        <button
          className={`group-org-tab${activeTab === 'members' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('members')}
          type="button"
        >
          Участники
        </button>
        <button
          className={`group-org-tab${activeTab === 'tasks' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('tasks')}
          type="button"
        >
          Задания
        </button>
      </div>

      <div className="group-org-body motion-rise motion-delay-4">
        <div className="group-org-main">
          {activeTab === 'members' ? (
            <div className="group-panel">
              <div className="group-panel__header">
                <h2 className="group-panel__title">Участники</h2>
                <span className="group-panel__counter">{members.length}</span>
              </div>
              {members.length === 0 ? (
                <p className="group-panel__empty">Участников пока нет.</p>
              ) : (
                <ul className="member-list">
                  {members.map((m) => (
                    <li className="member-row" key={m.id}>
                      <div className="avatar">{getInitials(m.name)}</div>
                      <div className="member-row__info">
                        <span className="member-row__name">{m.name}</span>
                        <span className="member-row__meta">Вступил {m.joinedAt}</span>
                      </div>
                      {!isParticipant && (
                        <button
                          className="member-row__remove"
                          onClick={() => handleRemoveMember(m.id)}
                          title="Удалить участника"
                          type="button"
                        >
                          ✕
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="group-panel">
              <h2 className="group-panel__title">Задания</h2>
              {tasks.length === 0 ? (
                <p className="group-panel__empty">Заданий пока нет.</p>
              ) : (
                <div className="task-list">
                  {sortedTasks.map((task) => (
                    <div
                      className="task-row task-row--clickable"
                      key={task.id}
                      onClick={() => {
                        writeStorage(STORAGE_KEYS.selectedTaskId, task.id);
                        window.location.hash = '#task';
                      }}
                    >
                      <div className="task-row__info">
                        <strong className="task-row__name">{task.name}</strong>
                        {task.deadline && (
                          <span className="task-deadline-pill">
                            Дедлайн: {formatDeadline(task.deadline)}
                          </span>
                        )}
                      </div>
                      <span className="task-row__arrow">→</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="group-org-sidebar">
          {isParticipant ? (
            <>
              <div className="group-panel group-panel--organizer">
                <span className="group-panel__badge">Организатор</span>
                <div className="group-panel__org-info">
                  <span className="group-panel__org-name">{organizerName}</span>
                  <div className="avatar">{getInitials(organizerName)}</div>
                </div>
              </div>

              <div className="group-panel">
              <h2 className="group-panel__title">Быстрый доступ</h2>
              {tasks.length === 0 ? (
                <p className="group-panel__empty">Заданий пока нет.</p>
              ) : (
                <div className="task-list">
                  {sortedTasks.map((task) => (
                    <div
                      className="task-row task-row--clickable"
                      key={task.id}
                      onClick={() => {
                        writeStorage(STORAGE_KEYS.selectedTaskId, task.id);
                        window.location.hash = '#task';
                      }}
                    >
                      <div className="task-row__info">
                        <strong className="task-row__name">{task.name}</strong>
                        {task.deadline && (
                          <span className="task-deadline-pill">
                            {formatDeadline(task.deadline)}
                          </span>
                        )}
                      </div>
                      <span className="task-row__arrow">→</span>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </>
          ) : (
            <>
              <div className="group-panel group-panel--organizer">
                <span className="group-panel__badge">Организатор</span>
                <div className="group-panel__org-info">
                  <span className="group-panel__org-name">{organizerName}</span>
                  <div className="avatar">{getInitials(organizerName)}</div>
                </div>
              </div>

              <div className="group-panel group-panel--info">
                <h3 className="group-panel__section-title">О группе</h3>

                <div className="group-info-row">
                  <span className="group-info-label">Название</span>
                  {editing ? (
                    <input
                      className="group-info-input"
                      onChange={(e) => setEditName(e.target.value)}
                      value={editName}
                    />
                  ) : (
                    <div className="group-info-value">{group.name}</div>
                  )}
                </div>

                <div className="group-info-row group-info-row--desc">
                  <span className="group-info-label">Описание</span>
                  {editing ? (
                    <textarea
                      className="group-info-input group-info-input--textarea"
                      maxLength={200}
                      onChange={(e) => setEditDesc(e.target.value)}
                      value={editDesc}
                    />
                  ) : (
                    <div className="group-info-value group-info-value--desc">
                      {group.description || ''}
                    </div>
                  )}
                </div>

                <p className="group-panel__meta">Кол-во участников: {members.length}</p>
                <div className="group-panel__info-footer">
                  <span className="group-panel__meta">Дата создания: {group.createdAt}</span>
                  {editing ? (
                    <div className="group-edit-actions">
                      <button className="button button--outline" onClick={handleEditCancel} type="button">
                        Отмена
                      </button>
                      <button className="button button--primary" onClick={handleEditSave} type="button">
                        Сохранить
                      </button>
                    </div>
                  ) : (
                    <button className="button button--primary" onClick={handleEditStart} type="button">
                      Редактировать
                    </button>
                  )}
                </div>
              </div>

              <button
                className="button button--danger group-delete-btn"
                onClick={() => setConfirmDelete(true)}
                type="button"
              >
                Удалить группу
              </button>
            </>
          )}
        </aside>
      </div>

      {confirmDelete && (
        <Modal
          confirmClassName="button button--danger"
          confirmLabel="Удалить"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDeleteGroup}
          text={`Группа «${group.name}» будет удалена безвозвратно. Это действие нельзя отменить.`}
          title="Удалить группу?"
        />
      )}
    </section>
  );
}