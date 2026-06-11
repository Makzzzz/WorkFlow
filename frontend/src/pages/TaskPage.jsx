import React from 'react';
import { getUrlParam, navigateTo } from '../utils/url.js';
import { formatDeadline, formatDeadlineParts } from '../utils/helpers.js';
import { Modal } from '../components/Modal.jsx';
import { taskService, groupService, solutionService, feedbackService, peerService } from '../services/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export function TaskPage() {
  const { user } = useAuth();
  const [userStatus, setUserStatus] = React.useState(null);
  const isParticipant = userStatus === 'Студент';
  const [taskId] = React.useState(() => getUrlParam('taskId'));
  const [task, setTask] = React.useState(null);
  const [members, setMembers] = React.useState([]); // Участники группы
  const [reviews, setReviews] = React.useState([]); // Отзывы (загружаются с бэкенда)
  const [submissions, setSubmissions] = React.useState([]); // Решения (загружаются с бэкенда)
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [peerTask, setPeerTask] = React.useState(null);
  const [peerStarting, setPeerStarting] = React.useState(false);
  
  // Локальное определение классов для статусов (ранее импортировалось из mockMembers.js)
  const STATUS_CLASS = {
    'Не выполнено': 'status-badge--danger',
    'Ждёт оценки': 'status-badge--warning',
    'Завершено': 'status-badge--success'
  };

  const loadSolutionsAndReviews = async (currentTaskId) => {
    try {
      const solutions = await solutionService.getTaskSolutions(currentTaskId);
      
      const newSubmissions = [];
      const newReviews = [];
      
      for (const solution of solutions) {
        const memberId = solution.student_id;
        
        newSubmissions.push({
          taskId: currentTaskId,
          memberId: memberId,
          solutionId: solution.id,
          uploadedAt: solution.uploaded_at
        });
        
        try {
          const feedback = await feedbackService.getFeedbackBySolution(solution.id);
          if (feedback) {
            newReviews.push({
              taskId: currentTaskId,
              memberId: memberId,
              solutionId: solution.id,
              rating: feedback.grade,
              comment: feedback.overall_comment,
              reviewedAt: feedback.commented_at,
              criteriaFeedback: feedback.criteria_feedback || []
            });
          }
        } catch (feedbackErr) {
          // 404 is expected when no feedback exists yet
        }
      }
      
      setSubmissions(newSubmissions);
      setReviews(newReviews);
    } catch (err) {
      console.error('Ошибка при загрузке решений и отзывов:', err);
      // Не прерываем загрузку страницы, просто логируем ошибку
    }
  };

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
        
        const [taskData, criteriaData] = await Promise.all([
          taskService.getTaskDetail(taskId),
          taskService.getTaskCriteria(taskId).catch(() => [])
        ]);
        
        // Преобразуем данные из API в формат, ожидаемый компонентом
        const taskObj = {
          id: taskData.id,
          name: taskData.task_name || taskData.name || 'Задача',
          description: taskData.description || '',
          deadline: taskData.deadline,
          groupId: taskData.group_id,
          criteria: criteriaData || [],
        };
        setTask(taskObj);
        
        if (taskData.group_id) {
          try {
            const groupData = await groupService.getGroupDetail(taskData.group_id);
            setUserStatus(groupData.user_status || null);
            const groupMembers = (groupData.members || []).map(member => ({
              id: member.id || member.user_id,
              name: [member.first_name, member.last_name].filter(Boolean).join(' ') || member.email || 'Участник',
              status: 'Не выполнено' // Статус по умолчанию, будет обновлен позже
            }));
            setMembers(groupMembers);
            await loadSolutionsAndReviews(taskId);
          } catch {
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

  React.useEffect(() => {
    if (!taskId || !isParticipant) return;

    let cancelled = false;

    const loadPeerTask = async () => {
      try {
        const data = await peerService.getMyPeerTask(taskId);
        if (!cancelled) setPeerTask(data || null);
      } catch (err) {
        // 404 is expected when no peer review is assigned
        if (!cancelled) setPeerTask(null);
      }
    };

    loadPeerTask();

    return () => { cancelled = true; };
  }, [taskId, isParticipant]);

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

  // Member sort + filter (organizer view)
  const [memberSortTP, setMemberSortTP] = React.useState(null);
  const [memberFilterTP, setMemberFilterTP] = React.useState([]);
  const [sortDropTPOpen, setSortDropTPOpen] = React.useState(false);
  const [filterDropTPOpen, setFilterDropTPOpen] = React.useState(false);
  const sortDropTPRef = React.useRef(null);
  const filterDropTPRef = React.useRef(null);

  React.useEffect(() => {
    const handleClick = (e) => {
      if (sortDropTPRef.current && !sortDropTPRef.current.contains(e.target)) setSortDropTPOpen(false);
      if (filterDropTPRef.current && !filterDropTPRef.current.contains(e.target)) setFilterDropTPOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
    setEditDeadline(task.deadline?.slice(0, 16) ?? '');
    setEditCriteria(task.criteria ? task.criteria.map((c) => ({ ...c })) : []);
    setExpandedCriterionId(null);
    setShowAddCriterion(false);
    setEditing(true);
  };

  const handleEditSave = async () => {
    if (!editName.trim()) return;

    try {
      setLoading(true);

      const updateData = {
        task_name: editName.trim(),
        description: editDesc.trim() || null,
        deadline: editDeadline || null
      };

      const updatedTask = await taskService.updateTask(taskId, updateData);

      const originalIds = new Set((task.criteria || []).map((c) => c.id));
      const currentIds = new Set(editCriteria.map((c) => c.id));

      for (const c of (task.criteria || [])) {
        if (!currentIds.has(c.id)) {
          await taskService.deleteCriteria(c.id);
        }
      }

      for (const c of editCriteria) {
        if (originalIds.has(c.id)) {
          await taskService.updateCriteria(c.id, { criteria_name: c.criteria_name, description: c.description || null });
        }
      }

      setTask({
        ...task,
        name: updatedTask.task_name || updatedTask.name || editName.trim(),
        description: updatedTask.description || editDesc.trim(),
        deadline: updatedTask.deadline || editDeadline,
        criteria: editCriteria,
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
      
      const newCriterion = await taskService.addCriteria(taskId, criteriaData);
      
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
      
      await taskService.deleteTask(taskId);
      
      const groupId = getUrlParam('groupId');
      navigateTo('group', { groupId });
      
    } catch (err) {
      console.error('Ошибка при удалении задачи:', err);
      alert('Не удалось удалить задачу. Попробуйте снова.');
      setLoading(false);
      setConfirmDelete(false);
    }
  };

  const handleStartPeerReview = async () => {
    try {
      setPeerStarting(true);
      const result = await peerService.startPeerReview(taskId);
      alert(result?.message || 'Peer review успешно запущен');
    } catch (err) {
      console.error('Ошибка при запуске peer review:', err);
      alert(err?.message || 'Не удалось запустить peer review. Попробуйте снова.');
    } finally {
      setPeerStarting(false);
    }
  };

  const deadline = formatDeadline(task.deadline, true);
  const deadlineParts = formatDeadlineParts(task.deadline, true);

  if (isParticipant) {
    const selfMember = members.find((m) => user?.id && m.id?.toString() === user.id.toString());
    const selfStatus = selfMember ? getMemberEffectiveStatus(selfMember) : null;

    return (
      <section className="task-page-layout motion-rise motion-delay-2">
        <div className="task-page-header motion-rise motion-delay-3">
          <h1 className="task-page__title">{task.name}</h1>
          <div className="task-page-header__actions">
            {selfStatus === 'Завершено' && (
              <button
                className="button button--outline"
                onClick={() => navigateTo('review', { taskId, memberId: user.id })}
                type="button"
              >
                Посмотреть отзыв
              </button>
            )}
            {selfStatus === 'Ждёт оценки' && (
              <button
                className="button button--outline"
                onClick={() => navigateTo('review', { taskId, memberId: user.id })}
                type="button"
              >
                Посмотреть работу
              </button>
            )}
            <button
              className="button button--primary button--as-link"
              onClick={() => navigateTo('upload-work', { taskId })}
              type="button"
            >
              Загрузить работу
            </button>
          </div>
        </div>

        <div className="group-org-body motion-rise motion-delay-4">
          <div className="group-org-main">
            <div className="group-panel">
              <div className="participant-task-info">
                {deadline && (
                  <div className="participant-task-info__row">
                    <span className="participant-task-info__label">Дедлайн</span>
                    <span className="task-deadline-pill">
                      {deadlineParts?.time ? <><svg className="deadline-cal-icon" viewBox="0 0 12 12" fill="none" width="10" height="10"><rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M1 5h10" stroke="currentColor" strokeWidth="1.5"/><path d="M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>{deadlineParts.date}<svg className="deadline-sep-icon" viewBox="0 0 12 12" fill="none" width="10" height="10"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>{deadlineParts.time}</> : <><svg className="deadline-cal-icon" viewBox="0 0 12 12" fill="none" width="10" height="10"><rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M1 5h10" stroke="currentColor" strokeWidth="1.5"/><path d="M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>{deadline}</>}
                    </span>
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

            {peerTask && (
              <div className="group-panel peer-review-panel">
                <h2 className="group-panel__title">Peer review</h2>
                <p className="participant-task-info__text">Вам назначена работа на проверку</p>
                <button
                  className="button button--primary"
                  onClick={() => navigateTo('review', { taskId, memberId: peerTask.student_id })}
                  type="button"
                >
                  Перейти к проверке
                </button>
              </div>
            )}
          </aside>
        </div>
      </section>
    );
  }

  let filteredSortedMembers = [...members];

  if (memberFilterTP.length > 0) {
    filteredSortedMembers = filteredSortedMembers.filter((m) => memberFilterTP.includes(getMemberEffectiveStatus(m)));
  }

  if (memberSortTP === 'name-asc') {
    filteredSortedMembers.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  } else if (memberSortTP === 'name-desc') {
    filteredSortedMembers.sort((a, b) => b.name.localeCompare(a.name, 'ru'));
  } else if (memberSortTP === 'rating-desc') {
    filteredSortedMembers.sort((a, b) => (getMemberReview(b.id)?.rating ?? -1) - (getMemberReview(a.id)?.rating ?? -1));
  } else if (memberSortTP === 'rating-asc') {
    filteredSortedMembers.sort((a, b) => (getMemberReview(a.id)?.rating ?? -1) - (getMemberReview(b.id)?.rating ?? -1));
  } else {
    filteredSortedMembers.sort((a, b) => {
      const order = { 'Ждёт оценки': 0, 'Не выполнено': 1, 'Завершено': 2 };
      const sa = getMemberEffectiveStatus(a);
      const sb = getMemberEffectiveStatus(b);
      if (sa !== sb) return order[sa] - order[sb];
      if (sa === 'Завершено') return (getMemberReview(b.id)?.rating ?? 0) - (getMemberReview(a.id)?.rating ?? 0);
      return 0;
    });
  }

  const doneCount = members.filter((m) => getMemberEffectiveStatus(m) === 'Завершено').length;

  return (
    <section className="task-page-layout motion-rise motion-delay-2">
      <div className="task-page-header motion-rise motion-delay-3">
        <h1 className="task-page__title">{task.name}</h1>
        <div className="task-page-header__actions">
          <button
            className="button button--primary task-page-peer-btn"
            disabled={peerStarting}
            onClick={handleStartPeerReview}
            type="button"
          >
            {peerStarting ? 'Запуск...' : 'Назначить peer review'}
          </button>
        </div>
      </div>

      <div className="group-org-body motion-rise motion-delay-4">
        <div className="group-org-main">
          <div className="group-panel group-panel--members">
            <div className="group-panel__header">
              <div className="group-panel__header-left">
                <h2 className="group-panel__title">Участники</h2>
                <span className="group-panel__counter">{doneCount} / {members.length}</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {/* Sort */}
                <div className="member-sort" ref={sortDropTPRef}>
                  <button
                    className={`member-sort__btn${memberSortTP ? ' is-active' : ''}${sortDropTPOpen ? ' is-open' : ''}`}
                    onClick={() => setSortDropTPOpen((o) => !o)}
                    title="Сортировка"
                    type="button"
                  >
                    <svg fill="none" height="14" viewBox="0 0 16 16" width="14">
                      <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5"/>
                    </svg>
                  </button>
                  {sortDropTPOpen && (
                    <div className="member-sort__drop">
                      {[
                        { key: 'name-asc',     label: 'По алфавиту: А → Я' },
                        { key: 'name-desc',    label: 'По алфавиту: Я → А' },
                        { key: 'rating-desc',  label: 'По оценке: выше → ниже' },
                        { key: 'rating-asc',   label: 'По оценке: ниже → выше' },
                      ].map(({ key, label }) => (
                        <button
                          key={String(key)}
                          className={`member-sort__option${memberSortTP === key ? ' is-active' : ''}`}
                          onClick={() => { setMemberSortTP(memberSortTP === key ? null : key); setSortDropTPOpen(false); }}
                          type="button"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Filter */}
                <div className="member-sort" ref={filterDropTPRef}>
                  {memberFilterTP.length > 0 && (
                    <span className="task-filter-badge">{memberFilterTP.length}</span>
                  )}
                  <button
                    className={`member-sort__btn${memberFilterTP.length > 0 ? ' is-active' : ''}${filterDropTPOpen ? ' is-open' : ''}`}
                    onClick={() => setFilterDropTPOpen((o) => !o)}
                    title="Фильтр"
                    type="button"
                  >
                    <svg fill="none" height="14" viewBox="0 0 16 16" width="14">
                      <path d="M2 3h12l-4.5 5.5V13l-3-1.5V8.5L2 3z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5"/>
                    </svg>
                  </button>
                  {filterDropTPOpen && (
                    <div className="member-sort__drop">
                      {['Не выполнено', 'Ждёт оценки', 'Завершено'].map((status) => {
                        const checked = memberFilterTP.includes(status);
                        return (
                          <button
                            key={status}
                            className="member-sort__option task-filter-option"
                            onClick={() => setMemberFilterTP((prev) =>
                              checked ? prev.filter((s) => s !== status) : [...prev, status]
                            )}
                            type="button"
                          >
                            <span className={`task-filter-check${checked ? ' is-checked' : ''}`} />
                            {status}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <ul className="member-list">
              {filteredSortedMembers.map((m) => {
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
                <input className="group-info-input" onChange={(e) => setEditName(e.target.value)} value={editName} />
              ) : (
                <div className="group-info-value">{task.name}</div>
              )}
            </div>

            <div className="group-info-row group-info-row--desc">
              <span className="group-info-label">Описание</span>
              {editing ? (
                <textarea className="group-info-input group-info-input--autosize" onChange={(e) => setEditDesc(e.target.value)} rows={1} value={editDesc} />
              ) : (
                <div className="group-info-value group-info-value--desc">{task.description || ''}</div>
              )}
            </div>

            <div className="group-info-row">
              <span className="group-info-label">Дедлайн</span>
              {editing ? (
                <input className="group-info-input" onChange={(e) => setEditDeadline(e.target.value)} type="datetime-local" value={editDeadline} min={new Date().toISOString().slice(0, 16)} />
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
                            <textarea
                              className="group-info-input group-info-input--autosize"
                              onChange={(e) => handleCriterionChange(c.id, 'criteria_name', e.target.value)}
                              placeholder="Название"
                              rows={1}
                              value={c.criteria_name}
                            />
                            <textarea className="group-info-input group-info-input--autosize" onChange={(e) => handleCriterionChange(c.id, 'description', e.target.value)} placeholder="Описание" rows={1} value={c.description} />
                            <div className="task-criterion-edit__actions">
                              <button className="button button--danger task-criterion-edit__delete" onClick={() => handleDeleteCriterion(c.id)} type="button">Удалить</button>
                              <button className="button button--outline" onClick={() => setExpandedCriterionId(null)} type="button">Готово</button>
                            </div>
                          </div>
                        ) : (
                          <button className="task-criterion-edit__pill" onClick={() => setExpandedCriterionId(c.id)} type="button">
                            <strong>{c.criteria_name}</strong>
                            <svg className="task-criterion-edit__pencil" viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M7 7H6C5.46957 7 4.96086 7.21071 4.58579 7.58579C4.21071 7.96086 4 8.46957 4 9V18C4 18.5304 4.21071 19.0391 4.58579 19.4142C4.96086 19.7893 5.46957 20 6 20H15C15.5304 20 16.0391 19.7893 16.4142 19.4142C16.7893 19.0391 17 18.5304 17 18V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 5.00011L19 8.00011M20.385 6.58511C20.7788 6.19126 21.0001 5.65709 21.0001 5.10011C21.0001 4.54312 20.7788 4.00895 20.385 3.61511C19.9912 3.22126 19.457 3 18.9 3C18.343 3 17.8088 3.22126 17.415 3.61511L9 12.0001V15.0001H12L20.385 6.58511Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
                  task.criteria?.length > 0 ? (
                    <div className="task-criteria-pills">
                      {task.criteria.map((c) => (
                        <span className="task-criteria-pill" key={c.id}>{c.criteria_name}</span>
                      ))}
                    </div>
                  ) : <span className="task-criteria-empty">—</span>
                )}
              </div>
            </div>

            <div className="group-panel__info-footer">
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
