import React from 'react';
import { getUrlParam, navigateTo } from '../utils/url.js';
import { getInitials } from '../utils/helpers.js';
import { taskService, solutionService, feedbackService, groupService } from '../services/api.js';

export function ReviewPage() {
  const taskId = getUrlParam('taskId');
  const memberId = getUrlParam('memberId');
  
  const [task, setTask] = React.useState(null);
  const [member, setMember] = React.useState(null);
  const [solution, setSolution] = React.useState(null);
  const [criteria, setCriteria] = React.useState([]);
  const [existingFeedback, setExistingFeedback] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  // Загрузка данных
  React.useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Функция для загрузки участника по ID из группы задачи
        const loadMemberFromGroup = async (taskData, targetMemberId) => {
          if (!taskData.group_id) {
            console.warn('У задачи нет group_id, невозможно загрузить участников');
            return null;
          }
          
          try {
            const groupData = await groupService.getGroupDetail(taskData.group_id);
            const members = groupData.members || [];
            
            // Ищем участника по ID (может быть user_id или id в зависимости от структуры)
            const foundMember = members.find(m =>
              (m.id && m.id.toString() === targetMemberId.toString()) ||
              (m.user_id && m.user_id.toString() === targetMemberId.toString())
            );
            
            if (foundMember) {
              return {
                id: foundMember.id || foundMember.user_id,
                name: foundMember.name || foundMember.email || 'Участник',
                email: foundMember.email || ''
              };
            }
            
            console.warn('Участник не найден в группе:', targetMemberId);
            return null;
          } catch (err) {
            console.warn('Не удалось загрузить участников группы:', err);
            return null;
          }
        };
        
        // Загрузка данных по taskId и memberId
        if (taskId && memberId) {
          console.log('Загрузка данных по taskId и memberId:', { taskId, memberId });
          
          // Загружаем задачу
          const taskData = await taskService.getTaskDetail(taskId);
          setTask(taskData);
          
          // Загружаем критерии задачи
          const criteriaData = await taskService.getTaskCriteria(taskId);
          setCriteria(criteriaData || []);
          
          // Загружаем участника
          const memberData = await loadMemberFromGroup(taskData, memberId);
          if (memberData) {
            setMember(memberData);
          } else {
            // Если участник не найден, создаем минимальный объект
            setMember({
              id: memberId,
              name: 'Участник',
              email: ''
            });
          }
          
          // Загружаем все решения задачи
          try {
            const solutions = await solutionService.getTaskSolutions(taskId);
            
            // Ищем решение для данного участника (memberId)
            const memberSolution = solutions.find(s =>
              s.student_id && s.student_id.toString() === memberId.toString()
            );
            
            if (memberSolution) {
              setSolution(memberSolution);
              
              // Загружаем существующую обратную связь для этого решения
              try {
                const feedbackData = await feedbackService.getFeedbackBySolution(memberSolution.id);
                setExistingFeedback(feedbackData);
              } catch (err) {
                console.log('Обратная связь не найдена, создаем новую');
                setExistingFeedback(null);
              }
            } else {
              // Решение не найдено
              setSolution(null);
              setExistingFeedback(null);
              console.log('Решение для участника не найдено');
            }
          } catch (err) {
            console.warn('Не удалось загрузить решения задачи:', err);
            setSolution(null);
            setExistingFeedback(null);
          }
        } else {
          setError('Не указаны taskId и memberId для загрузки данных');
        }
      } catch (err) {
        console.error('Ошибка при загрузке данных:', err);
        setError('Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [taskId, memberId]);

  const [criteriaComments, setCriteriaComments] = React.useState({});
  const [generalComment, setGeneralComment] = React.useState('');
  const [rating, setRating] = React.useState(0);
  const [ratingError, setRatingError] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Инициализация формы существующей обратной связью
  React.useEffect(() => {
    if (existingFeedback) {
      setRating(existingFeedback.rating || 0);
      setGeneralComment(existingFeedback.comment || '');
      
      // Инициализируем комментарии по критериям
      if (existingFeedback.criteria_feedback && criteria.length > 0) {
        const comments = {};
        existingFeedback.criteria_feedback.forEach(cf => {
          comments[cf.criteria_id] = cf.comment || '';
        });
        setCriteriaComments(comments);
      }
    } else if (criteria.length > 0) {
      // Инициализируем пустые комментарии для каждого критерия
      const initialComments = {};
      criteria.forEach(c => {
        initialComments[c.id] = '';
      });
      setCriteriaComments(initialComments);
    }
  }, [existingFeedback, criteria]);

  if (loading) {
    return (
      <section className="review-layout motion-rise motion-delay-2">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Загрузка данных...</p>
        </div>
      </section>
    );
  }

  if (error || !task || !member) {
    return (
      <section className="review-layout motion-rise motion-delay-2">
        <p className="error-message">{error || 'Данные не найдены.'}</p>
        <button 
          className="button button--primary" 
          onClick={() => navigateTo('task', { taskId })}
        >
          Вернуться к заданию
        </button>
      </section>
    );
  }

  // Простая ссылка на файл решения
  const filePath = solution?.file_path;
  const fileName = filePath ? filePath.split('/').pop() : null;

  const handleSubmit = async () => {
    if (!rating) {
      setRatingError(true);
      return;
    }
    
    try {
      setSubmitting(true);
      
      if (!solution?.id) {
        throw new Error('Не указано решение для оценки');
      }
      const targetSolutionId = solution.id;
      
      // Подготавливаем данные обратной связи
      const feedbackData = {
        grade: rating,
        overall_comment: generalComment,
        criteria_feedback: criteria.map(c => ({
          criteria_id: c.id,
          comment: criteriaComments[c.id] || ''
        }))
      };
      
      if (existingFeedback) {
        // Обновляем существующую обратную связь
        await feedbackService.updateFeedback(existingFeedback.id, feedbackData);
        console.log('Обратная связь обновлена');
      } else {
        // Создаем новую обратную связь
        await feedbackService.createFeedback(targetSolutionId, feedbackData);
        console.log('Обратная связь создана');
      }
      
      // Перенаправляем на страницу задачи
      navigateTo('task', { taskId: task.id });
      
    } catch (err) {
      console.error('Ошибка при отправке обратной связи:', err);
      alert('Не удалось отправить обратную связь. Попробуйте снова.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="review-layout motion-rise motion-delay-2">
      <h1 className="review__title motion-rise motion-delay-3">Проверка работы</h1>

      <div className="review-info-row motion-rise motion-delay-3">
        <div className="review-info-card">
          <span className="review-info-card__label">Задание</span>
          <strong className="review-info-card__value">{task.task_name || task.name}</strong>
        </div>
        {task.description && (
          <div className="review-info-card review-info-card--wide">
            <span className="review-info-card__label">Описание</span>
            <p className="review-info-card__value">{task.description}</p>
          </div>
        )}
      </div>

      <div className="review-body motion-rise motion-delay-4">
        <div className="review-preview group-panel">
          <div className="review-preview__header">
            <h2 className="group-panel__title">Просмотр работы</h2>
            <div className="review-author">
              <div className="review-author__avatar">{getInitials(member.name)}</div>
              <span className="review-author__name">{member.name}</span>
            </div>
          </div>
          <div className="review-preview__stage">
            {filePath ? (
              <div className="review-file-preview">
                <div className="review-file-preview__icon">📄</div>
                <p className="review-file-preview__name">{fileName || 'Файл решения'}</p>
                <a
                  className="button button--outline review-file-preview__download"
                  href={filePath}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Скачать решение
                </a>
              </div>
            ) : (
              <div className="review-file-preview">
                <div className="review-file-preview__icon">📭</div>
                <p className="review-file-preview__name">Работа не загружена</p>
              </div>
            )}
          </div>
        </div>

        <div className="review-form group-panel">
          <h2 className="group-panel__title">Комментарии</h2>

          <div className="review-criteria-list">
            {criteria.length > 0 ? criteria.map((c) => (
              <div className="review-criterion" key={c.id}>
                <strong className="review-criterion__name">{c.criteria_name}</strong>
                {c.description && (
                  <p className="review-criterion__desc">{c.description}</p>
                )}
                <textarea
                  className="review-criterion__textarea"
                  onChange={(e) => setCriteriaComments((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  placeholder="Напишите комментарий..."
                  value={criteriaComments[c.id] || ''}
                />
              </div>
            )) : (
              <p className="group-panel__empty">Критерии не заданы.</p>
            )}
          </div>

          <div className="review-general">
            <label className="review-general__label">Общий комментарий</label>
            <textarea
              className="review-general__textarea"
              onChange={(e) => setGeneralComment(e.target.value)}
              placeholder="Общее впечатление от работы..."
              value={generalComment}
            />
          </div>

          <div className="review-rating">
            <span className="review-rating__label">Оцените работу</span>
            <div className="review-rating__dots">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  className={`review-rating__dot${rating >= n ? ' is-active' : ''}`}
                  key={n}
                  onClick={() => { setRating(n); setRatingError(false); }}
                  type="button"
                >
                  {n}
                </button>
              ))}
            </div>
            {ratingError && (
              <span className="review-rating__error">Оцените работу</span>
            )}
          </div>

          <div className="review-form__footer">
            <button
              className="button button--primary review-submit"
              onClick={handleSubmit}
              type="button"
              disabled={submitting}
            >
              {submitting ? 'Отправка...' : (existingFeedback ? 'Сохранить' : 'Отправить ревью')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
