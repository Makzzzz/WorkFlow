import React from 'react';
import { STORAGE_KEYS, readStorage, writeStorage } from '../utils/storage.js';
import { moveCaretToEnd, formatDeadline } from '../utils/helpers.js';
import previewBg from '../assets/images/create task bg.svg';

export function CreateTaskPage() {
  const [groupId] = React.useState(() => readStorage(STORAGE_KEYS.selectedGroupId));

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [deadline, setDeadline] = React.useState('');
  const [criteria, setCriteria] = React.useState([]);

  const [showCriterionForm, setShowCriterionForm] = React.useState(false);
  const [criterionName, setCriterionName] = React.useState('');
  const [criterionDesc, setCriterionDesc] = React.useState('');

  const handleAddCriterion = () => {
    if (!criterionName.trim()) return;
    setCriteria((prev) => [
      ...prev,
      { id: Date.now(), name: criterionName.trim(), description: criterionDesc.trim() },
    ]);
    setCriterionName('');
    setCriterionDesc('');
    setShowCriterionForm(false);
  };

  const handleDeleteCriterion = (id) => {
    setCriteria((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    const existing = readStorage(STORAGE_KEYS.tasks) ?? [];
    const newTask = {
      id: Date.now(),
      groupId,
      name: name.trim(),
      description: description.trim(),
      deadline: deadline.trim(),
      criteria,
      createdAt: new Date().toLocaleDateString('ru-RU'),
    };
    writeStorage(STORAGE_KEYS.tasks, [newTask, ...existing]);
    window.location.hash = '#group';
  };

  return (
    <section className="create-task-layout motion-rise motion-delay-2">
      <h1 className="create-task__title motion-rise motion-delay-3">Создайте новое задание</h1>

      <div className="create-task-shell motion-rise motion-delay-4">
        {/* ── Form ── */}
        <div className="create-task-form">
          <h2 className="create-task-form__heading">Параметры задания</h2>

          <label className="create-task-field">
            <span>Название задания</span>
            <input
              onChange={(e) => setName(e.target.value)}
              onClick={moveCaretToEnd}
              onFocus={moveCaretToEnd}
              type="text"
              value={name}
            />
          </label>

          <label className="create-task-field">
            <span>Описание</span>
            <textarea
              className="create-task-textarea"
              onChange={(e) => setDescription(e.target.value)}
              value={description}
            />
          </label>

          <label className="create-task-field">
            <span>Дедлайн</span>
            <input
              className="create-task-deadline"
              onChange={(e) => setDeadline(e.target.value)}
              type="date"
              value={deadline}
            />
            <p className="create-task-field__hint">Оставьте это поле пустым, если дедлайн не нужен</p>
          </label>

          <div className="create-task-criteria-header">
            <span className="create-task-field__label">Критерии оценки</span>
            <button
              className="button button--primary create-task-add-btn"
              onClick={() => setShowCriterionForm(true)}
              type="button"
            >
              Задать критерий
            </button>
          </div>

          {showCriterionForm && (
            <div className="create-task-criterion-form">
              <label className="create-task-field">
                <span>Название критерия</span>
                <input
                  autoFocus
                  onChange={(e) => setCriterionName(e.target.value)}
                  onClick={moveCaretToEnd}
                  onFocus={moveCaretToEnd}
                  type="text"
                  value={criterionName}
                />
              </label>
              <label className="create-task-field">
                <span>Описание</span>
                <input
                  onChange={(e) => setCriterionDesc(e.target.value)}
                  onClick={moveCaretToEnd}
                  onFocus={moveCaretToEnd}
                  type="text"
                  value={criterionDesc}
                />
              </label>
              <div className="create-task-criterion-form__actions">
                <button
                  className="button button--outline"
                  onClick={() => { setShowCriterionForm(false); setCriterionName(''); setCriterionDesc(''); }}
                  type="button"
                >
                  Отмена
                </button>
                <button
                  className="button button--primary"
                  onClick={handleAddCriterion}
                  type="button"
                >
                  Добавить
                </button>
              </div>
            </div>
          )}

          <div className="create-task-criteria-list">
            {criteria.map((c) => (
              <div className="create-task-criterion-row" key={c.id}>
                <div className="create-task-criterion-row__text">
                  <strong>{c.name}</strong>
                  {c.description && <span>{c.description}</span>}
                </div>
                <button
                  className="button button--outline create-task-criterion-row__delete"
                  onClick={() => handleDeleteCriterion(c.id)}
                  type="button"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Preview ── */}
        <div className="create-task-preview">
          <img alt="" className="create-task-preview__bg" src={previewBg} />
          <div className="create-task-preview__inner">
            <div className="create-task-preview__label">Просмотр задания</div>

            <div className="create-task-preview-card">
              <h3>{name || 'Название задания'}</h3>
              {description && <p>{description}</p>}
              {deadline && (
                <span className="create-task-preview-deadline">Дедлайн: {formatDeadline(deadline)}</span>
              )}
            </div>

            {criteria.length > 0 && (
              <div className="create-task-preview-card">
                <h3>Критерии</h3>
                <ul className="create-task-preview-criteria">
                  {criteria.map((c) => (
                    <li key={c.id}>• {c.name}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              className="button create-task-preview__submit"
              onClick={handleSubmit}
              type="button"
            >
              Создать задание
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
