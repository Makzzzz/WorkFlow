import React from 'react';
import { getUrlParam, navigateTo } from '../utils/url.js';
import { getInitials, formatDeadline } from '../utils/helpers.js';
import { Modal } from '../components/Modal.jsx';
import { groupService } from '../services/api.js';
import { taskService } from '../services/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export function GroupOrganizerPage() {
  const { currentUser } = useAuth();
  const [userStatus, setUserStatus] = React.useState(null);
  const isParticipant = userStatus === 'Студент';
  const [activeTab, setActiveTab] = React.useState('members');
  const [copied, setCopied] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const [groupId] = React.useState(() => getUrlParam('groupId'));
  const [group, setGroup] = React.useState(null);
  const [tasks, setTasks] = React.useState([]);
  const [members, setMembers] = React.useState([]);

  const [editName, setEditName] = React.useState('');
  const [editDesc, setEditDesc] = React.useState('');

  // Загрузка данных группы
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
        
        // Загружаем детали группы (включая участников и задачи)
        const groupData = await groupService.getGroupDetail(groupId);
        
        // Сохраняем статус пользователя в группе
        setUserStatus(groupData.user_status || null);
        
        // Преобразуем данные из API в формат, ожидаемый компонентом
        setGroup({
          id: groupData.id,
          name: groupData.group_name || groupData.name || 'Название группы',
          description: groupData.description || '',
          invite_code: groupData.invite_code,
          createdAt: groupData.created_at || 'dd.mm.yyyy',
          code: groupData.invite_code // для совместимости с существующим кодом
        });
        
        // Участники
        const formattedMembers = (groupData.members || []).map(member => ({
          id: member.id,
          name: `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email,
          email: member.email,
          joinedAt: 'Недавно'
        }));
        setMembers(formattedMembers);
        
        // Задачи
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
        
        // В случае ошибки показываем пустые данные
        setGroup({
          id: groupId,
          name: 'Название группы',
          description: '',
          createdAt: 'dd.mm.yyyy'
        });
        setMembers([]);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    loadGroupData();
  }, [groupId]);

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Вы уверены, что хотите удалить участника из группы?')) {
      return;
    }

    try {
      await groupService.removeMember(groupId, memberId);
      
      // Обновляем список участников локально
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (err) {
      console.error('Ошибка при удалении участника:', err);
      alert('Не удалось удалить участника');
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline) - new Date(b.deadline);
  });

  const organizerName = currentUser?.name || `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim() || 'Организатор';

  const handleCopyInvite = () => {
    if (group?.invite_code) {
      navigator.clipboard.writeText(group.invite_code);
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
      
      // Обновляем локальное состояние
      setGroup(prev => ({
        ...prev,
        name: updatedGroup.group_name || updatedGroup.name || editName.trim(),
        description: updatedGroup.description || editDesc.trim(),
        invite_code: updatedGroup.invite_code
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
      
      // Перенаправляем на страницу моих групп
      navigateTo('my-groups');
    } catch (err) {
      console.error('Ошибка при удалении группы:', err);
      alert('Не удалось удалить группу');
    }
  };

  // Если загружается
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

  // Если ошибка
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

  // Основной рендеринг
  const currentGroup = group || {
    name: 'Название группы',
    description: '',
    createdAt: 'dd.mm.yyyy'
  };

  return (
    <section className="group-org-layout motion-rise motion-delay-2">
      <div className="group-org-header motion-rise motion-delay-3">
        <h1 className="group-org__title">{currentGroup.name}</h1>
        {!isParticipant && (
          <div className="group-org-header__actions">
            {currentGroup.invite_code && (
              <div className="group-invite-code">
                <span className="group-invite-code__label">Код для вступления</span>
                <div className="group-invite-code__digits">
                  {currentGroup.invite_code.split('').map((d, i) => (
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
                        // Используем navigateTo для перехода к задаче с параметрами
                        navigateTo('task', { taskId: task.id, groupId: groupId });
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
                        // Используем navigateTo для перехода к задаче с параметрами
                        navigateTo('task', { taskId: task.id, groupId: groupId });
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
                  <span className="group-panel__meta">Дата создания: {currentGroup.createdAt}</span>
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
    </section>
  );
}