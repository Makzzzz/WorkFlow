import React from 'react';
import { getUrlParam } from '../utils/url.js';
import { formatDeadlineParts } from '../utils/helpers.js';
import previewBg from '../assets/images/create task bg.svg';
import { taskService } from '../services/api.js';

export function CreateTaskPage() {
  const [groupId] = React.useState(() => getUrlParam('groupId'));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [deadline, setDeadline] = React.useState('');
  const [criteria, setCriteria] = React.useState([]);

  const [showCriterionForm, setShowCriterionForm] = React.useState(false);
  const [criterionName, setCriterionName] = React.useState('');
  const [criterionDesc, setCriterionDesc] = React.useState('');
  const [editingCriterionId, setEditingCriterionId] = React.useState(null);
  const [editCriterionName, setEditCriterionName] = React.useState('');
  const [editCriterionDesc, setEditCriterionDesc] = React.useState('');

  const handleAddCriterion = () => {
    if (!criterionName.trim()) return;
    setCriteria((prev) => [
      ...prev,
      { id: Date.now(), criteria_name: criterionName.trim(), description: criterionDesc.trim() },
    ]);
    setCriterionName('');
    setCriterionDesc('');
    setShowCriterionForm(false);
  };

  const handleDeleteCriterion = (id) => {
    setCriteria((prev) => prev.filter((c) => c.id !== id));
  };

  const handleEditCriterion = (c) => {
    setEditingCriterionId(c.id);
    setEditCriterionName(c.criteria_name);
    setEditCriterionDesc(c.description);
  };

  const handleSaveEditCriterion = (id) => {
    if (!editCriterionName.trim()) return;
    setCriteria((prev) =>
      prev.map((c) => c.id === id ? { ...c, criteria_name: editCriterionName.trim(), description: editCriterionDesc.trim() } : c)
    );
    setEditingCriterionId(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Введите название задания');
      return;
    }
    if (!groupId) {
      setError('Группа не выбрана');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const taskData = {
        task_name: name.trim(),
        description: description.trim(),
        deadline: deadline.trim() || null,
        is_p2p_enabled: false,
      };
      const createdTask = await taskService.createTask(groupId, taskData);
      if (criteria.length > 0) {
        for (const criterion of criteria) {
          try {
            await taskService.addCriteria(createdTask.id, {
              criteria_name: criterion.criteria_name,
              description: criterion.description || '',
            });
          } catch {}
        }
      }
      window.location.hash = `#group?groupId=${groupId}`;
    } catch {
      setError('Не удалось создать задание. Проверьте подключение к серверу.');
    } finally {
      setLoading(false);
    }
  };

  const deadlineParts = formatDeadlineParts(deadline);

  return (
    <section className="create-task-layout motion-rise motion-delay-2">
      <h1 className="create-task__title motion-rise motion-delay-3">Создайте новое задание</h1>

      <div className="create-task-shell motion-rise motion-delay-4">
        {/* ── Form ── */}
        <div className="create-task-form">
          <h2 className="create-task-form__heading">Параметры задания</h2>

          {error && (
            <div style={{ color: '#dc3545', fontSize: '0.88rem' }}>{error}</div>
          )}

          <label className="create-task-field">
            <span>Название задания</span>
            <input onChange={(e) => setName(e.target.value)} type="text" value={name} disabled={loading} />
          </label>

          <label className="create-task-field">
            <span>Описание</span>
            <textarea className="create-task-textarea" onChange={(e) => setDescription(e.target.value)} value={description} disabled={loading} />
          </label>

          <label className="create-task-field">
            <span>Дедлайн</span>
            <input className="create-task-deadline" onChange={(e) => setDeadline(e.target.value)} type="datetime-local" value={deadline} disabled={loading} min={new Date().toISOString().slice(0, 16)} />
            <p className="create-task-field__hint">Оставьте это поле пустым, если дедлайн не нужен</p>
          </label>

          <div className="create-task-criteria-header">
            <span className="create-task-field__label">Критерии оценки</span>
            <button className="button button--primary create-task-add-btn" onClick={() => setShowCriterionForm(true)} type="button" disabled={loading}>
              Задать критерий
            </button>
          </div>

          {criteria.length > 0 && (
            <div className="create-task-criteria-list">
              {criteria.map((c) => (
                <div key={c.id}>
                  {editingCriterionId === c.id ? (
                    <div className="create-task-criterion-form">
                      <input
                        className="create-task-field"
                        style={{ height: 44, padding: '0 14px', border: '1px solid var(--stroke)', borderRadius: 12, font: 'inherit', fontSize: '0.9rem', outline: 'none' }}
                        onChange={(e) => setEditCriterionName(e.target.value)}
                        value={editCriterionName}
                        placeholder="Название"
                      />
                      <input
                        style={{ height: 44, padding: '0 14px', border: '1px solid var(--stroke)', borderRadius: 12, font: 'inherit', fontSize: '0.9rem', outline: 'none' }}
                        onChange={(e) => setEditCriterionDesc(e.target.value)}
                        value={editCriterionDesc}
                        placeholder="Описание"
                      />
                      <div className="create-task-criterion-form__actions">
                        <button className="button button--outline" onClick={() => setEditingCriterionId(null)} type="button">Отмена</button>
                        <button className="button button--primary" onClick={() => handleSaveEditCriterion(c.id)} type="button">Сохранить</button>
                      </div>
                    </div>
                  ) : (
                    <div className="create-task-criterion-row">
                      <div className="create-task-criterion-row__text">
                        <strong>{c.criteria_name}</strong>
                        {c.description && <span>{c.description}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button className="button button--outline create-task-criterion-row__delete" onClick={() => handleEditCriterion(c)} type="button" disabled={loading}>Изменить</button>
                        <button className="button button--danger create-task-criterion-row__delete" onClick={() => handleDeleteCriterion(c.id)} type="button" disabled={loading}>Удалить</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {showCriterionForm && (
            <div className="create-task-criterion-form">
              <label className="create-task-field">
                <span>Название критерия</span>
                <input onChange={(e) => setCriterionName(e.target.value)} type="text" value={criterionName} disabled={loading} />
              </label>
              <label className="create-task-field">
                <span>Описание критерия</span>
                <textarea className="create-task-textarea" onChange={(e) => setCriterionDesc(e.target.value)} value={criterionDesc} disabled={loading} />
              </label>
              <div className="create-task-criterion-form__actions">
                <button className="button button--outline" onClick={() => setShowCriterionForm(false)} type="button" disabled={loading}>Отмена</button>
                <button className="button button--primary" onClick={handleAddCriterion} type="button" disabled={loading}>Добавить</button>
              </div>
            </div>
          )}

          <div className="create-task-actions">
            <a className="button button--outline create-task-cancel-btn" href={`#group${groupId ? `?groupId=${groupId}` : ''}`}>Отмена</a>
            <button className="button button--primary create-task-cancel-btn" onClick={handleSubmit} type="button" disabled={loading}>
              {loading ? 'Создание...' : 'Создать задание'}
            </button>
          </div>
        </div>

        {/* ── Preview ── */}
        <div className="create-task-preview">
          <div className="create-task-preview__bg">
            <img alt="" src={previewBg} />
          </div>
          <div className="create-task-preview__inner">
            <span className="create-task-preview__label">Предпросмотр</span>

            <div className="create-task-preview-card">
              <h3>{name || 'Название задания'}</h3>
              <p>{description || 'Описание задания появится здесь'}</p>
              {deadline && (
                <div className="create-task-preview-deadline">
                  {deadlineParts?.time ? (
                    <>
                      <svg className="deadline-cal-icon" viewBox="0 0 12 12" fill="none" width="10" height="10"><rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M1 5h10" stroke="currentColor" strokeWidth="1.5"/><path d="M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      {deadlineParts.date}
                      <svg className="deadline-sep-icon" viewBox="0 0 12 12" fill="none" width="10" height="10"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {deadlineParts.time}
                    </>
                  ) : deadlineParts?.date}
                </div>
              )}
            </div>

            {criteria.length > 0 && (
              <div className="create-task-preview-card">
                <h3>Критерии</h3>
                <ul className="create-task-preview-criteria">
                  {criteria.map((c) => (
                    <li key={c.id}>• {c.criteria_name}</li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        </div>
      </div>
    </section>
  );
}
