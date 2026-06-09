import React from 'react';
import { getUrlParam, navigateTo } from '../utils/url.js';
import { getInitials, formatDeadlineParts } from '../utils/helpers.js';
import { Modal } from '../components/Modal.jsx';
import { groupService } from '../services/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export function GroupOrganizerPage() {
  const { user: currentUser } = useAuth();
  const [userStatus, setUserStatus] = React.useState(null);
  const isParticipant = userStatus === 'Студент';
  const [activeTab, setActiveTab] = React.useState('members');
  const [copied, setCopied] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [confirmDelete, setConfirmDelete]           = React.useState(false);
  const [confirmRemoveMember, setConfirmRemoveMember] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const [groupId] = React.useState(() => getUrlParam('groupId'));
  const [group, setGroup] = React.useState(null);
  const [organizer, setOrganizer] = React.useState(null);
  const [tasks, setTasks] = React.useState([]);
  const [members, setMembers] = React.useState([]);

  const [editName, setEditName] = React.useState('');
  const [editDesc, setEditDesc] = React.useState('');

  const [memberSort, setMemberSort]         = React.useState(null);
  const [sortDropOpen, setSortDropOpen]     = React.useState(false);
  const sortDropRef                         = React.useRef(null);

  React.useEffect(() => {
    if (!sortDropOpen) return;
    const close = (e) => { if (!sortDropRef.current?.contains(e.target)) setSortDropOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [sortDropOpen]);

  const sortedMembers = React.useMemo(() => {
    if (!memberSort) return members;
    return [...members].sort((a, b) => {
      const na = a.name.toLowerCase();
      const nb = b.name.toLowerCase();
      return memberSort === 'asc' ? na.localeCompare(nb, 'ru') : nb.localeCompare(na, 'ru');
    });
  }, [members, memberSort]);

  const [taskSort,         setTaskSort]         = React.useState(null);
  const [taskSortOpen,     setTaskSortOpen]      = React.useState(false);
  const [taskFilter,       setTaskFilter]        = React.useState([]);
  const [taskFilterOpen,   setTaskFilterOpen]    = React.useState(false);
  const taskSortRef   = React.useRef(null);
  const taskFilterRef = React.useRef(null);

  React.useEffect(() => {
    if (!taskSortOpen) return;
    const close = (e) => { if (!taskSortRef.current?.contains(e.target)) setTaskSortOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [taskSortOpen]);

  React.useEffect(() => {
    if (!taskFilterOpen) return;
    const close = (e) => { if (!taskFilterRef.current?.contains(e.target)) setTaskFilterOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [taskFilterOpen]);

  const toggleTaskFilter = (val) =>
    setTaskFilter(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  const filteredSortedTasks = React.useMemo(() => {
    const now = new Date();
    let result = tasks;

    if (taskFilter.length > 0) {
      result = result.filter(t => {
        const dl = t.deadline ? new Date(t.deadline) : null;
        return taskFilter.some(f => {
          if (f === 'no-deadline')  return !dl;
          if (f === 'active')       return dl && dl > now;
          if (f === 'overdue')      return dl && dl <= now;
          return false;
        });
      });
    }

    if (!taskSort) return result;
    return [...result].sort((a, b) => {
      if (taskSort === 'name-asc')  return a.name.localeCompare(b.name, 'ru');
      if (taskSort === 'name-desc') return b.name.localeCompare(a.name, 'ru');
      const da = a.deadline ? new Date(a.deadline) : null;
      const db = b.deadline ? new Date(b.deadline) : null;
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return taskSort === 'deadline-asc' ? da - db : db - da;
    });
  }, [tasks, taskSort, taskFilter]);

  React.useEffect(() => {
    const loadGroupData = async () => {
      if (!groupId) {
        setError('ID группы не найден');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const groupData = await groupService.getGroupDetail(groupId);
        
        setUserStatus(groupData.user_status || null);

        setGroup({
          id: groupData.id,
          name: groupData.group_name || groupData.name || 'Название группы',
          description: groupData.description || '',
          invite_token: groupData.invite_token,
          code: groupData.invite_token
        });

        if (groupData.organizer) {
          const o = groupData.organizer;
          setOrganizer({
            id: o.id,
            name: `${o.first_name || ''} ${o.last_name || ''}`.trim() || o.email,
          });
        }

        const formattedMembers = (groupData.members || []).map(member => ({
          id: member.id,
          name: `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email,
          email: member.email,
          joinedAt: 'Недавно'
        }));
        setMembers(formattedMembers);
        
        const formattedTasks = (groupData.tasks || []).map(task => ({
          id: task.id,
          name: task.task_name || task.name || 'Задача',
          description: task.description || '',
          deadline: task.deadline,
          groupId: task.group_id || groupId
        }));
        setTasks(formattedTasks);
        
      } catch (err) {
        console.error('Ошибка при загрузке данных группы:', err);
        setError('Не удалось загрузить данные группы');
        
        setGroup({
          id: groupId,
          name: 'Название группы',
          description: '',
        });
        setMembers([]);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    loadGroupData();
  }, [groupId]);

  const handleRemoveMember = (memberId) => {
    setConfirmRemoveMember(memberId);
  };

  const handleRemoveMemberConfirmed = async () => {
    const memberId = confirmRemoveMember;
    setConfirmRemoveMember(null);
    try {
      await groupService.removeMember(groupId, memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (err) {
      console.error('Ошибка при удалении участника:', err);
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline) - new Date(b.deadline);
  });

  const organizerName = organizer?.name || `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim() || 'Организатор';

  const handleCopyInvite = () => {
    if (group?.invite_token) {
      const base = window.location.origin + window.location.pathname;
      const link = `${base}#join?code=${group.invite_token}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEditStart = () => {
    if (group) {
      setEditName(group.name);
      setEditDesc(group.description);
      setEditing(true);
    }
  };

  const handleEditSave = async () => {
    if (!editName.trim() || !groupId) return;
    
    try {
      const updatedData = {
        group_name: editName.trim(),
        description: editDesc.trim()
      };
      
      const updatedGroup = await groupService.updateGroup(groupId, updatedData);
      
      setGroup(prev => ({
        ...prev,
        name: updatedGroup.group_name || updatedGroup.name || editName.trim(),
        description: updatedGroup.description || editDesc.trim(),
        invite_token: updatedGroup.invite_token,
        code: updatedGroup.invite_token
      }));
      
      setEditing(false);
    } catch (err) {
      console.error('Ошибка при обновлении группы:', err);
      alert('Не удалось обновить группу');
    }
  };

  const handleEditCancel = () => setEditing(false);

  const handleDeleteGroup = async () => {
    if (!groupId) return;
    
    try {
      await groupService.deleteGroup(groupId);
      
      navigateTo('my-groups');
    } catch (err) {
      console.error('Ошибка при удалении группы:', err);
      alert('Не удалось удалить группу');
    }
  };

  if (loading) {
    return (
      <section className="group-org-layout">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Загрузка данных группы...</p>
        </div>
      </section>
    );
  }

  if (error && !group) {
    return (
      <section className="group-org-layout">
        <div className="error-container">
          <h2>Ошибка</h2>
          <p>{error}</p>
          <button 
            className="button button--primary" 
            onClick={() => navigateTo('my-groups')}
          >
            Вернуться к моим группам
          </button>
        </div>
      </section>
    );
  }

  const currentGroup = group || {
    name: 'Название группы',
    description: '',
  };

  return (
    <section className="group-org-layout motion-rise motion-delay-2">
      <div className="group-org-header motion-rise motion-delay-3">
        <h1 className="group-org__title">{currentGroup.name}</h1>
        {!isParticipant && (
          <div className="group-org-header__actions">
            {currentGroup.invite_token && (
              <button
                className="button button--outline"
                onClick={handleCopyInvite}
                type="button"
              >
                {copied ? 'Скопировано!' : 'Скопировать ссылку-приглашение'}
              </button>
            )}
            <a
              className="button button--primary button--as-link"
              href={`#create-task${groupId ? `?groupId=${groupId}` : ''}`}
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
                <div className="group-panel__header-left">
                  <h2 className="group-panel__title">Участники</h2>
                  <span className="group-panel__counter">{members.length}</span>
                </div>
                {members.length > 0 && (
                  <div className="member-sort" ref={sortDropRef}>
                    <button
                      className={`member-sort__btn${sortDropOpen ? ' is-open' : ''}${memberSort ? ' is-active' : ''}`}
                      type="button"
                      title="Сортировка"
                      onClick={() => setSortDropOpen(v => !v)}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 4h10M4 7h6M6 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                    {sortDropOpen && (
                      <div className="member-sort__drop">
                        {[['asc', 'По алфавиту: А → Я'], ['desc', 'По алфавиту: Я → А']].map(([val, label]) => (
                          <button
                            key={val}
                            className={`member-sort__option${memberSort === val ? ' is-active' : ''}`}
                            type="button"
                            onClick={() => { setMemberSort(memberSort === val ? null : val); setSortDropOpen(false); }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {members.length === 0 ? (
                <p className="group-panel__empty">Участников пока нет.</p>
              ) : (
                <ul className="member-list">
                  {sortedMembers.map((m) => (
                    <li className="member-row" key={m.id}>
                      <div className="avatar">{getInitials(m.name)}</div>
                      <div className="member-row__info">
                        <span className="member-row__name">{m.name}</span>
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
              <div className="group-panel__header">
                <h2 className="group-panel__title">Задания</h2>
                {tasks.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px' }}>

                    {/* Сортировка */}
                    <div className="member-sort" ref={taskSortRef}>
                      <button
                        className={`member-sort__btn${taskSortOpen ? ' is-open' : ''}${taskSort ? ' is-active' : ''}`}
                        type="button"
                        title="Сортировка"
                        onClick={() => setTaskSortOpen(v => !v)}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2 4h10M4 7h6M6 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                      {taskSortOpen && (
                        <div className="member-sort__drop">
                          {[
                            ['name-asc',      'По алфавиту: А → Я'],
                            ['name-desc',     'По алфавиту: Я → А'],
                            ['deadline-asc',  'Сначала ближайшие'],
                            ['deadline-desc', 'Сначала дальние'],
                          ].map(([val, label]) => (
                            <button
                              key={val}
                              className={`member-sort__option${taskSort === val ? ' is-active' : ''}`}
                              type="button"
                              onClick={() => { setTaskSort(taskSort === val ? null : val); setTaskSortOpen(false); }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Фильтр */}
                    <div className="member-sort" ref={taskFilterRef}>
                      <button
                        className={`member-sort__btn${taskFilterOpen ? ' is-open' : ''}${taskFilter.length > 0 ? ' is-active' : ''}`}
                        type="button"
                        title="Фильтр"
                        onClick={() => setTaskFilterOpen(v => !v)}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2 2h10l-4 5v4l-2-1V7L2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      {taskFilter.length > 0 && (
                        <span className="task-filter-badge">{taskFilter.length}</span>
                      )}
                      {taskFilterOpen && (
                        <div className="member-sort__drop">
                          {[
                            ['no-deadline', 'Без дедлайна'],
                            ['active',      'Активные'],
                            ['overdue',     'Просроченные'],
                          ].map(([val, label]) => (
                            <button
                              key={val}
                              className={`member-sort__option task-filter-option${taskFilter.includes(val) ? ' is-active' : ''}`}
                              type="button"
                              onClick={() => toggleTaskFilter(val)}
                            >
                              <span className={`task-filter-check${taskFilter.includes(val) ? ' is-checked' : ''}`}/>
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
              {tasks.length === 0 ? (
                <p className="group-panel__empty">Заданий пока нет.</p>
              ) : filteredSortedTasks.length === 0 ? (
                <p className="group-panel__empty">Нет заданий по выбранным фильтрам.</p>
              ) : (
                <div className="task-list">
                  {filteredSortedTasks.map((task) => (
                    <div
                      className="task-row task-row--clickable"
                      key={task.id}
                      onClick={() => {
                        navigateTo('task', { taskId: task.id, groupId: groupId });
                      }}
                    >
                      <div className="task-row__info">
                        <strong className="task-row__name">{task.name}</strong>
                        {task.deadline && (
                          <span className="task-deadline-pill">
                            {(() => { const p = formatDeadlineParts(task.deadline); return p?.time ? <>Дедлайн: <svg className="deadline-cal-icon" viewBox="0 0 12 12" fill="none" width="10" height="10"><rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M1 5h10" stroke="currentColor" strokeWidth="1.5"/><path d="M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>{p.date}<svg className="deadline-sep-icon" viewBox="0 0 12 12" fill="none" width="10" height="10"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>{p.time}</> : <>Дедлайн: <svg className="deadline-cal-icon" viewBox="0 0 12 12" fill="none" width="10" height="10"><rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M1 5h10" stroke="currentColor" strokeWidth="1.5"/><path d="M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>{p?.date ?? ''}</>; })()}
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
                        navigateTo('task', { taskId: task.id, groupId: groupId });
                      }}
                    >
                      <div className="task-row__info">
                        <strong className="task-row__name">{task.name}</strong>
                        {task.deadline && (
                          <span className="task-deadline-pill">
                            {(() => { const p = formatDeadlineParts(task.deadline); return p?.time ? <><svg className="deadline-cal-icon" viewBox="0 0 12 12" fill="none" width="10" height="10"><rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M1 5h10" stroke="currentColor" strokeWidth="1.5"/><path d="M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>{p.date}<svg className="deadline-sep-icon" viewBox="0 0 12 12" fill="none" width="10" height="10"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>{p.time}</> : <><svg className="deadline-cal-icon" viewBox="0 0 12 12" fill="none" width="10" height="10"><rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M1 5h10" stroke="currentColor" strokeWidth="1.5"/><path d="M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>{p?.date}</>; })()}
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
                    <div className="group-info-value">{currentGroup.name}</div>
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
                      {currentGroup.description || ''}
                    </div>
                  )}
                </div>

                <p className="group-panel__meta">Кол-во участников: {members.length}</p>
                <div className="group-panel__info-footer">
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
          text={`Группа «${currentGroup.name}» будет удалена безвозвратно. Это действие нельзя отменить.`}
          title="Удалить группу?"
        />
      )}

      {confirmRemoveMember && (
        <Modal
          confirmClassName="button button--danger"
          confirmLabel="Удалить"
          onCancel={() => setConfirmRemoveMember(null)}
          onConfirm={handleRemoveMemberConfirmed}
          text={`Участник будет удалён из группы.`}
          title="Удалить участника?"
        />
      )}
    </section>
  );
}