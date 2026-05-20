import React from 'react';
import { getUrlParam, navigateTo } from '../utils/url.js';
import { moveCaretToEnd, formatDeadline } from '../utils/helpers.js';
import { Modal } from '../components/Modal.jsx';
import { taskService, groupService, solutionService, feedbackService } from '../services/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export function TaskPage() {
  const { currentUser } = useAuth();
  const [userStatus, setUserStatus] = React.useState(null);
  const isParticipant = userStatus === 'Студент';
  const [taskId] = React.useState(() => getUrlParam('taskId'));
  const [task, setTask] = React.useState(null);
  const [members, setMembers] = React.useState([]); // Участники группы
  const [reviews, setReviews] = React.useState([]); // Отзывы (загружаются с бэкенда)
  const [submissions, setSubmissions] = React.useState([]); // Решения (загружаются с бэкенда)
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  
  // Локальное определение классов для статусов (ранее импортировалось из mockMembers.js)
  const STATUS_CLASS = {
    'Не выполнено': 'status-badge--danger',
    'Ждёт оценки': 'status-badge--warning',
    'Завершено': 'status-badge--success'
  };

  // Функция для загрузки решений и отзывов
  const loadSolutionsAndReviews = async (currentTaskId) => {
    try {
      console.log('Загрузка решений для задачи ID:', currentTaskId);
      
      // Загружаем все решения для задачи
      const solutions = await solutionService.getTaskSolutions(currentTaskId);
      console.log('Решения получены:', solutions.length);
      
      // Создаем массивы для submissions и reviews
      const newSubmissions = [];
      const newReviews = [];
      
      // Для каждого решения загружаем отзыв (если есть)
      for (const solution of solutions) {
        const memberId = solution.student_id;
        
        // Добавляем в submissions
        newSubmissions.push({
          taskId: currentTaskId,
          memberId: memberId,
          solutionId: solution.id,
          uploadedAt: solution.uploaded_at
        });
        
        // Пытаемся загрузить отзыв для этого решения
        try {
          const feedback = await feedbackService.getFeedbackBySolution(solution.id);
          if (feedback) {
            // Преобразуем feedback в формат review
            newReviews.push({
              taskId: currentTaskId,
              memberId: memberId,
              solutionId: solution.id,
              rating: feedback.grade, // grade из FeedbackResponse
              comment: feedback.overall_comment,
              reviewedAt: feedback.commented_at,
              criteriaFeedback: feedback.criteria_feedback || []
            });
            console.log(`Отзыв найден для решения ${solution.id}, оценка: ${feedback.grade}`);
          }
        } catch (feedbackErr) {
          // Если отзыв не найден (404) или другая ошибка - это нормально
          if (feedbackErr.status !== 404) {
            console.warn(`Ошибка при загрузке отзыва для решения ${solution.id}:`, feedbackErr);
          }
        }
      }
      
      // Обновляем состояния
      setSubmissions(newSubmissions);
      setReviews(newReviews);
      
      console.log('Submissions загружены:', newSubmissions.length);
      console.log('Reviews загружены:', newReviews.length);
      
    } catch (err) {
      console.error('Ошибка при загрузке решений и отзывов:', err);
      // Не прерываем загрузку страницы, просто логируем ошибку
    }
  };

  // Загрузка данных задачи при монтировании компонента
  React.useEffect(() => {
    const loadTaskData = async () => {
      if (!taskId) {
        setError('ID задачи не найден');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log('Загрузка данных задачи с ID:', taskId);
        
        // Параллельная загрузка задачи и критериев
        const [taskData, criteriaData] = await Promise.all([
          taskService.getTaskDetail(taskId),
          taskService.getTaskCriteria(taskId).catch(err => {
            console.warn('Не удалось загрузить критерии:', err);
            return []; // Возвращаем пустой массив в случае ошибки
          })
        ]);
        
        console.log('Данные задачи получены:', taskData);
        console.log('Критерии получены:', criteriaData);
        
        // Преобразуем данные из API в формат, ожидаемый компонентом
        const taskObj = {
          id: taskData.id,
          name: taskData.task_name || taskData.name || 'Задача',
          description: taskData.description || '',
          deadline: taskData.deadline,
          groupId: taskData.group_id,
          criteria: criteriaData || [],
          createdAt: taskData.created_at || 'Недавно'
        };
        setTask(taskObj);
        
        // Загружаем участников группы, если есть groupId
        if (taskData.group_id) {
          try {
            const groupData = await groupService.getGroupDetail(taskData.group_id);
            // Сохраняем статус пользователя в группе
            setUserStatus(groupData.user_status || null);
            const groupMembers = (groupData.members || []).map(member => ({
              id: member.id || member.user_id,
              name: member.name || member.email || 'Участник',
              status: 'Не выполнено' // Статус по умолчанию, будет обновлен позже
            }));
            setMembers(groupMembers);
            console.log('Участники группы загружены:', groupMembers.length);
            
            // Загружаем решения и отзывы для задачи
            await loadSolutionsAndReviews(taskId);
          } catch (err) {
            console.warn('Не удалось загрузить участников группы:', err);
            setMembers([]);
          }
        } else {
          // Если нет group_id, все равно загружаем решения и отзывы
          await loadSolutionsAndReviews(taskId);
        }
        
      } catch (err) {
        console.error('Ошибка при загрузке данных задачи:', err);
        setError('Не удалось загрузить данные задачи');
        
        // В случае ошибки не используем localStorage как fallback
        // Просто показываем ошибку
      } finally {
        setLoading(false);
      }
    };

    loadTaskData();
  }, [taskId]);

  const getMemberReview = (memberId) =>
    reviews.find((r) => r.taskId === taskId && r.memberId === memberId);

  const hasMemberSubmitted = (memberId) =>
    submissions.some((s) => s.taskId === taskId && s.memberId === memberId);

  const getMemberEffectiveStatus = (m) => {
    const review = getMemberReview(m.id);
    if (review) return 'Завершено';
    if (hasMemberSubmitted(m.id)) return 'Ждёт оценки';
    return m.status;
  };

  const [editing, setEditing] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [editName, setEditName] = React.useState('');
  const [editDesc, setEditDesc] = React.useState('');
  const [editDeadline, setEditDeadline] = React.useState('');
  const [editCriteria, setEditCriteria] = React.useState([]);
  const [expandedCriterionId, setExpandedCriterionId] = React.useState(null);
  const [showAddCriterion, setShowAddCriterion] = React.useState(false);
  const [newCriterionName, setNewCriterionName] = React.useState('');
  const [newCriterionDesc, setNewCriterionDesc] = React.useState('');

  if (loading) {
    return (
      <section className="task-page-layout motion-rise motion-delay-2">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Загрузка данных задачи...</p>
        </div>
      </section>
    );
  }

  if (error || !task) {
    return (
      <section className="task-page-layout motion-rise motion-delay-2">
        <p className="error-message">{error || 'Задание не найдено.'}</p>
        <button 
          className="button button--primary" 
          onClick={() => navigateTo('group', { groupId: getUrlParam('groupId') })}
        >
          Вернуться к группе
        </button>
      </section>
    );
  }

  const handleEditStart = () => {
    setEditName(task.name);
    setEditDesc(task.description ?? '');
    setEditDeadline(task.deadline ?? '');
    setEditCriteria(task.criteria ? task.criteria.map((c) => ({ ...c })) : []);
    setExpandedCriterionId(null);
    setShowAddCriterion(false);
    setEditing(true);
  };

  const handleEditSave = async () => {
    if (!editName.trim()) return;
    
    try {
      setLoading(true);
      
      // Подготавливаем данные для обновления
      const updateData = {
        task_name: editName.trim(),
        description: editDesc.trim() || null,
        deadline: editDeadline || null
      };
      
      console.log('Отправка обновления задачи:', updateData);
      const updatedTask = await taskService.updateTask(taskId, updateData);
      console.log('Задача обновлена успешно:', updatedTask);
      
      // Обновляем локальное состояние
      setTask({
        ...task,
        name: updatedTask.task_name || updatedTask.name || editName.trim(),
        description: updatedTask.description || editDesc.trim(),
        deadline: updatedTask.deadline || editDeadline
      });
      
      setEditing(false);
      
    } catch (err) {
      console.error('Ошибка при обновлении задачи:', err);
      alert('Не удалось обновить задачу. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCancel = () => {
    setEditing(false);
    setExpandedCriterionId(null);
    setShowAddCriterion(false);
  };

  const handleCriterionChange = (id, field, value) => {
    setEditCriteria((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleDeleteCriterion = (id) => {
    setEditCriteria((prev) => prev.filter((c) => c.id !== id));
    setExpandedCriterionId(null);
  };

  const handleAddCriterion = async () => {
    if (!newCriterionName.trim()) return;
    
    try {
      setLoading(true);
      
      const criteriaData = {
        criteria_name: newCriterionName.trim(),
        description: newCriterionDesc.trim() || null
      };
      
      console.log('Добавление критерия:', criteriaData);
      const newCriterion = await taskService.addCriteria(taskId, criteriaData);
      console.log('Критерий добавлен успешно:', newCriterion);
      
      // Обновляем локальное состояние
      setTask({
        ...task,
        criteria: [...(task.criteria || []), newCriterion]
      });
      
      setNewCriterionName('');
      setNewCriterionDesc('');
      setShowAddCriterion(false);
      
    } catch (err) {
      console.error('Ошибка при добавлении критерия:', err);
      alert('Не удалось добавить критерий. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    try {
      setLoading(true);
      
      console.log('Удаление задачи с ID:', taskId);
      await taskService.deleteTask(taskId);
      console.log('Задача удалена успешно');
      
      // Перенаправляем на страницу группы
      const groupId = getUrlParam('groupId');
      navigateTo('group', { groupId });
      
    } catch (err) {
      console.error('Ошибка при удалении задачи:', err);
      alert('Не удалось удалить задачу. Попробуйте снова.');
      setLoading(false);
      setConfirmDelete(false);
    }
  };

  const deadline = formatDeadline(task.deadline, true);

  if (isParticipant) {
    return (
      <section className="task-page-layout motion-rise motion-delay-2">
        <div className="task-page-header motion-rise motion-delay-3">
          <h1 className="task-page__title">{task.name}</h1>
          <button
            className="button button--primary button--as-link"
            onClick={() => navigateTo('upload-work', { taskId })}
            type="button"
          >
            Загрузить работу
          </button>
        </div>

        <div className="group-org-body motion-rise motion-delay-4">
          <div className="group-org-main">
            <div className="group-panel">
              <div className="participant-task-info">
                {deadline && (
                  <div className="participant-task-info__row">
                    <span className="participant-task-info__label">Дедлайн</span>
                    <span className="task-deadline-pill">{deadline}</span>
                  </div>
                )}
                {task.description && (
                  <div className="participant-task-info__row participant-task-info__row--desc">
                    <span className="participant-task-info__label">Описание</span>
                    <p className="participant-task-info__text">{task.description}</p>
                  </div>
                )}
                {task.criteria?.length > 0 && (
                  <div className="participant-task-info__row participant-task-info__row--desc participant-task-info__row--criteria">
                    <span className="participant-task-info__label">Критерии</span>
                    <div className="participant-task-criteria">
                      {task.criteria.map((c) => (
                        <div className="task-criteria-inline" key={c.id}>
                          <strong>{c.criteria_name}</strong>
                          {c.description && <span>{c.description}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="group-org-sidebar">
            <div className="group-panel participant-members-panel">
              <h2 className="group-panel__title">Участники</h2>
              <ul className="member-list">
                {members.map((m) => {
                  const status = getMemberEffectiveStatus(m);
                  return (
                    <li className="task-member-row" key={m.id}>
                      <span className="task-member-row__name">{m.name}</span>
                      <span className={`status-badge ${STATUS_CLASS[status]}`}>{status}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      </section>
    );
  }

  const sortedMembers = [...members].sort((a, b) => {
    const order = { 'Ждёт оценки': 0, 'Не выполнено': 1, 'Завершено': 2 };
    const sa = getMemberEffectiveStatus(a);
    const sb = getMemberEffectiveStatus(b);
    if (sa !== sb) return order[sa] - order[sb];
    if (sa === 'Завершено') {
      return (getMemberReview(b.id)?.rating ?? 0) - (getMemberReview(a.id)?.rating ?? 0);
    }
    return 0;
  });

  const doneCount = sortedMembers.filter((m) => getMemberEffectiveStatus(m) === 'Завершено').length;

  return (
    <section className="task-page-layout motion-rise motion-delay-2">
      <div className="task-page-header motion-rise motion-delay-3">
        <h1 className="task-page__title">{task.name}</h1>
        <div className="task-page-header__actions">
          <button className="button button--primary" type="button">
            Назначить peer review
          </button>
        </div>
      </div>

      <div className="group-org-body motion-rise motion-delay-4">
        <div className="group-org-main">
          <div className="group-panel">
            <div className="group-panel__header">
              <h2 className="group-panel__title">Участники</h2>
              <span className="group-panel__counter">{doneCount} / {members.length}</span>
            </div>
            <ul className="member-list">
              {sortedMembers.map((m) => {
                const review = getMemberReview(m.id);
                const status = getMemberEffectiveStatus(m);
                const clickable = status === 'Ждёт оценки' || status === 'Завершено';
                return (
                  <li
                    className={`task-member-row${clickable ? ' task-member-row--clickable' : ''}`}
                    key={m.id}
                    onClick={clickable ? () => {
                      // Используем navigateTo для перехода к ревью с параметрами
                      // Вместо memberId будем использовать solutionId (нужно получить из API)
                      // Пока просто переходим на страницу ревью с taskId и memberId
                      navigateTo('review', { taskId, memberId: m.id });
                    } : undefined}
                  >
                    <span className="task-member-row__name">{m.name}</span>
                    <div className="task-member-row__right">
                      {review?.rating > 0 && (
                        <span className="task-member-rating" data-score={review.rating}>{review.rating}</span>
                      )}
                      <span className={`status-badge ${STATUS_CLASS[status]}`}>{status}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <aside className="group-org-sidebar">
          <div className="group-panel group-panel--info">
            <h3 className="group-panel__section-title">О задании</h3>

            <div className="group-info-row">
              <span className="group-info-label">Название</span>
              {editing ? (
                <input className="group-info-input" onChange={(e) => setEditName(e.target.value)} onClick={moveCaretToEnd} onFocus={moveCaretToEnd} value={editName} />
              ) : (
                <div className="group-info-value">{task.name}</div>
              )}
            </div>

            <div className="group-info-row group-info-row--desc">
              <span className="group-info-label">Описание</span>
              {editing ? (
                <textarea className="group-info-input group-info-input--textarea" onChange={(e) => setEditDesc(e.target.value)} value={editDesc} />
              ) : (
                <div className="group-info-value group-info-value--desc">{task.description || ''}</div>
              )}
            </div>

            <div className="group-info-row">
              <span className="group-info-label">Дедлайн</span>
              {editing ? (
                <input className="group-info-input" onChange={(e) => setEditDeadline(e.target.value)} type="date" value={editDeadline} />
              ) : (
                <div className="group-info-value">{deadline || '—'}</div>
              )}
            </div>

            <div className="group-info-row group-info-row--desc">
              <span className="group-info-label">Критерии</span>
              <div className="group-info-value group-info-value--desc task-criteria-edit-wrap">
                {editing ? (
                  <>
                    {editCriteria.map((c) => (
                      <div className="task-criterion-edit" key={c.id}>
                        {expandedCriterionId === c.id ? (
                          <div className="task-criterion-edit__form">
                            <input className="group-info-input" onChange={(e) => handleCriterionChange(c.id, 'criteria_name', e.target.value)} onClick={moveCaretToEnd} onFocus={moveCaretToEnd} placeholder="Название" value={c.criteria_name} />
                            <input className="group-info-input" onChange={(e) => handleCriterionChange(c.id, 'description', e.target.value)} onClick={moveCaretToEnd} onFocus={moveCaretToEnd} placeholder="Описание" value={c.description} />
                            <div className="task-criterion-edit__actions">
                              <button className="button button--danger task-criterion-edit__delete" onClick={() => handleDeleteCriterion(c.id)} type="button">Удалить</button>
                              <button className="button button--outline" onClick={() => setExpandedCriterionId(null)} type="button">Готово</button>
                            </div>
                          </div>
                        ) : (
                          <button className="task-criterion-edit__pill" onClick={() => setExpandedCriterionId(c.id)} type="button">
                            <strong>{c.criteria_name}</strong>
                            <span className="task-criterion-edit__pencil">✎</span>
                          </button>
                        )}
                      </div>
                    ))}
                    {showAddCriterion ? (
                      <div className="task-criterion-edit__form">
                        <input autoFocus className="group-info-input" onChange={(e) => setNewCriterionName(e.target.value)} placeholder="Название" value={newCriterionName} />
                        <input className="group-info-input" onChange={(e) => setNewCriterionDesc(e.target.value)} placeholder="Описание" value={newCriterionDesc} />
                        <div className="task-criterion-edit__actions">
                          <button className="button button--outline" onClick={() => { setShowAddCriterion(false); setNewCriterionName(''); setNewCriterionDesc(''); }} type="button">Отмена</button>
                          <button className="button button--primary" onClick={handleAddCriterion} type="button">Добавить</button>
                        </div>
                      </div>
                    ) : (
                      <button className="task-criterion-add-btn" onClick={() => setShowAddCriterion(true)} type="button">+ Задать критерий</button>
                    )}
                  </>
                ) : (
                  task.criteria?.length > 0 ? task.criteria.map((c) => (
                    <div className="task-criteria-inline" key={c.id}>
                      <strong>{c.criteria_name}</strong>
                      {c.description && <span>{c.description}</span>}
                    </div>
                  )) : <span className="task-criteria-empty">—</span>
                )}
              </div>
            </div>

            <div className="group-panel__info-footer">
              <span className="group-panel__meta">Создано: {task.createdAt}</span>
              {editing ? (
                <div className="group-edit-actions">
                  <button className="button button--outline" onClick={handleEditCancel} type="button">Отмена</button>
                  <button className="button button--primary" onClick={handleEditSave} type="button">Сохранить</button>
                </div>
              ) : (
                <button className="button button--primary" onClick={handleEditStart} type="button">Редактировать</button>
              )}
            </div>
          </div>

          <button className="button button--danger group-delete-btn" onClick={() => setConfirmDelete(true)} type="button">
            Удалить задание
          </button>
        </aside>
      </div>

      {confirmDelete && (
        <Modal
          confirmClassName="button button--danger"
          confirmLabel="Удалить"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDeleteTask}
          text={`Задание «${task.name}» будет удалено безвозвратно. Это действие нельзя отменить.`}
          title="Удалить задание?"
        />
      )}
    </section>
  );
}
