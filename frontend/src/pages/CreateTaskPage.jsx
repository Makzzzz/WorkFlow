import React from 'react';
import { getUrlParam, navigateTo } from '../utils/url.js';
import { moveCaretToEnd, formatDeadline } from '../utils/helpers.js';
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

      // Подготавливаем данные для API
      const taskData = {
        task_name: name.trim(),
        description: description.trim(),
        deadline: deadline.trim() || null,
        is_p2p_enabled: false // По умолчанию отключено
      };

      // Создаем задачу через API
      const createdTask = await taskService.createTask(groupId, taskData);
      
      // Создаем критерии, если они есть
      if (criteria.length > 0) {
        for (const criterion of criteria) {
          try {
            await taskService.addCriteria(createdTask.id, {
              criteria_name: criterion.criteria_name,
              description: criterion.description || ''
            });
          } catch (critError) {
            console.error('Ошибка при создании критерия:', critError);
            // Продолжаем создание остальных критериев
          }
        }
      }

      // Перенаправляем на страницу группы с передачей groupId
      window.location.hash = `#group?groupId=${groupId}`;
      
    } catch (err) {
      console.error('Ошибка при создании задания:', err);
      setError('Не удалось создать задание. Проверьте подключение к серверу.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="create-task-layout motion-rise motion-delay-2">
      <h1 className="create-task__title motion-rise motion-delay-3">Создайте новое задание</h1>

      <div className="create-task-shell motion-rise motion-delay-4">
        {/* ── Form ── */}
        <div className="create-task-form">
          <h2 className="create-task-form__heading">Параметры задания</h2>

          {error && (
            <div className="error-message" style={{ marginBottom: '20px', color: '#dc3545' }}>
              {error}
            </div>
          )}

          <label className="create-task-field">
            <span>Название задания</span>
            <input
              onChange={(e) => setName(e.target.value)}
              onClick={moveCaretToEnd}
              onFocus={moveCaretToEnd}
              type="text"
              value={name}
              disabled={loading}
            />
          </label>

          <label className="create-task-field">
            <span>Описание</span>
            <textarea
              className="create-task-textarea"
              onChange={(e) => setDescription(e.target.value)}
              value={description}
              disabled={loading}
            />
          </label>

          <label className="create-task-field">
            <span>Дедлайн</span>
            <input
              className="create-task-deadline"
              onChange={(e) => setDeadline(e.target.value)}
              type="date"
              value={deadline}
              disabled={loading}
            />
            <p className="create-task-field__hint">Оставьте это поле пустым, если дедлайн не нужен</p>
          </label>

          <div className="create-task-criteria-header">
            <span className="create-task-field__label">Критерии оценки</span>
            <button
              className="button button--primary create-task-add-btn"
              onClick={() => setShowCriterionForm(true)}
              type="button"
              disabled={loading}
            >
              Задать критерий
            </button>
          </div>

          {showCriterionForm && (
            <div className="create-task-criterion-form">
              <label className="create-task-field">
                <span>Название критерия</span>
                <input
                  onChange={(e) => setCriterionName(e.target.value)}
                  type="text"
                  value={criterionName}
                  disabled={loading}
                />
              </label>
              <label className="create-task-field">
                <span>Описание критерия (необязательно)</span>
                <textarea
                  className="create-task-textarea"
                  onChange={(e) => setCriterionDesc(e.target.value)}
                  value={criterionDesc}
                  disabled={loading}
                />
              </label>
              <div className="create-task-criterion-actions">
                <button
                  className="button button--outline"
                  onClick={() => setShowCriterionForm(false)}
                  type="button"
                  disabled={loading}
                >
                  Отмена
                </button>
                <button
                  className="button button--primary"
                  onClick={handleAddCriterion}
                  type="button"
                  disabled={loading}
                >
                  Добавить
                </button>
              </div>
            </div>
          )}

          {criteria.length > 0 && (
            <div className="create-task-criteria-list">
              {criteria.map((c) => (
                <div className="create-task-criterion" key={c.id}>
                  <div className="create-task-criterion__info">
                    <strong>{c.criteria_name}</strong>
                    {c.description && <p>{c.description}</p>}
                  </div>
                  <button
                    className="create-task-criterion__delete"
                    onClick={() => handleDeleteCriterion(c.id)}
                    type="button"
                    disabled={loading}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="create-task-actions">
            <a
              className="button button--outline"
              href={`#group${groupId ? `?groupId=${groupId}` : ''}`}
              disabled={loading}
            >
              Отмена
            </a>
            <button
              className="button button--primary"
              onClick={handleSubmit}
              type="button"
              disabled={loading}
            >
              {loading ? 'Создание...' : 'Создать задание'}
            </button>
          </div>
        </div>

        {/* ── Preview ── */}
        <div className="create-task-preview">
          <div className="create-task-preview__bg">
            <img alt="" src={previewBg} />
          </div>
          <div className="create-task-preview__content">
            <h3 className="create-task-preview__title">Предпросмотр</h3>
            <div className="create-task-preview-card">
              <h4 className="create-task-preview-card__title">{name || 'Название задания'}</h4>
              <p className="create-task-preview-card__desc">
                {description || 'Описание задания появится здесь'}
              </p>
              {deadline && (
                <div className="create-task-preview-card__deadline">
                  <span className="create-task-preview-card__deadline-label">Дедлайн:</span>
                  <span className="create-task-preview-card__deadline-value">
                    {formatDeadline(deadline)}
                  </span>
                </div>
              )}
              {criteria.length > 0 && (
                <div className="create-task-preview-card__criteria">
                  <span className="create-task-preview-card__criteria-label">Критерии:</span>
                  <ul className="create-task-preview-card__criteria-list">
                    {criteria.map((c) => (
                      <li key={c.id}>{c.criteria_name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
