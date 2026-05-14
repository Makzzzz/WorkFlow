import React from 'react';
import { STORAGE_KEYS, readStorage, writeStorage } from '../utils/storage.js';
import { moveCaretToEnd, formatDeadline } from '../utils/helpers.js';
import { Modal } from '../components/Modal.jsx';
import { MOCK_MEMBERS, STATUS_CLASS } from '../data/mockMembers.js';

export function TaskPage({ role }) {
  const isParticipant = role === 'participant';
  const [taskId] = React.useState(() => readStorage(STORAGE_KEYS.selectedTaskId));
  const [tasks, setTasks] = React.useState(() => readStorage(STORAGE_KEYS.tasks) ?? []);
  const [reviews, setReviews] = React.useState(() => readStorage(STORAGE_KEYS.reviews) ?? []);
  const [submissions, setSubmissions] = React.useState(() => readStorage(STORAGE_KEYS.submissions) ?? []);

  const task = tasks.find((t) => t.id === taskId);

  React.useEffect(() => {
    const handleHashChange = () => {
      setReviews(readStorage(STORAGE_KEYS.reviews) ?? []);
      setSubmissions(readStorage(STORAGE_KEYS.submissions) ?? []);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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

  if (!task) {
    return (
      <section className="task-page-layout motion-rise motion-delay-2">
        <p>Задание не найдено.</p>
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

  const handleEditSave = () => {
    if (!editName.trim()) return;
    const updated = tasks.map((t) =>
      t.id === taskId
        ? { ...t, name: editName.trim(), description: editDesc.trim(), deadline: editDeadline, criteria: editCriteria }
        : t,
    );
    writeStorage(STORAGE_KEYS.tasks, updated);
    setTasks(updated);
    setEditing(false);
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

  const handleAddCriterion = () => {
    if (!newCriterionName.trim()) return;
    setEditCriteria((prev) => [
      ...prev,
      { id: Date.now(), name: newCriterionName.trim(), description: newCriterionDesc.trim() },
    ]);
    setNewCriterionName('');
    setNewCriterionDesc('');
    setShowAddCriterion(false);
  };

  const handleDeleteTask = () => {
    writeStorage(STORAGE_KEYS.tasks, tasks.filter((t) => t.id !== taskId));
    window.location.hash = '#group';
  };

  const deadline = formatDeadline(task.deadline, true);

  if (isParticipant) {
    return (
      <section className="task-page-layout motion-rise motion-delay-2">
        <div className="task-page-header motion-rise motion-delay-3">
          <h1 className="task-page__title">{task.name}</h1>
          <a className="button button--primary button--as-link" href="#upload-work">
            Загрузить работу
          </a>
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
                          <strong>{c.name}</strong>
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
                {MOCK_MEMBERS.map((m) => {
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

  const sortedMembers = [...MOCK_MEMBERS].sort((a, b) => {
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
              <span className="group-panel__counter">{doneCount} / {MOCK_MEMBERS.length}</span>
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
                      writeStorage(STORAGE_KEYS.selectedMemberId, m.id);
                      window.location.hash = '#review';
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
                            <input className="group-info-input" onChange={(e) => handleCriterionChange(c.id, 'name', e.target.value)} onClick={moveCaretToEnd} onFocus={moveCaretToEnd} placeholder="Название" value={c.name} />
                            <input className="group-info-input" onChange={(e) => handleCriterionChange(c.id, 'description', e.target.value)} onClick={moveCaretToEnd} onFocus={moveCaretToEnd} placeholder="Описание" value={c.description} />
                            <div className="task-criterion-edit__actions">
                              <button className="button button--danger task-criterion-edit__delete" onClick={() => handleDeleteCriterion(c.id)} type="button">Удалить</button>
                              <button className="button button--outline" onClick={() => setExpandedCriterionId(null)} type="button">Готово</button>
                            </div>
                          </div>
                        ) : (
                          <button className="task-criterion-edit__pill" onClick={() => setExpandedCriterionId(c.id)} type="button">
                            <strong>{c.name}</strong>
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
                      <strong>{c.name}</strong>
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
