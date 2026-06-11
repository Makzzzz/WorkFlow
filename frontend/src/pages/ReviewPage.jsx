import React from 'react';
import { getUrlParam, navigateTo } from '../utils/url.js';
import { taskService, solutionService, feedbackService, groupService } from '../services/api.js';
import { useTemplates, TemplateInsertBtn, TemplatesPanel } from '../components/CommentTemplates.jsx';
import { VoiceInput } from '../components/VoiceInput.jsx';
import { ImageViewer } from '../components/ImageViewer.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

export function ReviewPage() {
  const { user } = useAuth();
  const taskId = getUrlParam('taskId');
  const memberId = getUrlParam('memberId');

  const [task, setTask] = React.useState(null);
  const [member, setMember] = React.useState(null);
  const [solution, setSolution] = React.useState(null);
  const [fileUrls, setFileUrls] = React.useState([]);
  const [fileIndex, setFileIndex] = React.useState(0);
  const [criteria, setCriteria] = React.useState([]);
  const [existingFeedback, setExistingFeedback] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const loadMemberFromGroup = async (taskData, targetMemberId) => {
          if (!taskData.group_id) {
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
                name: [foundMember.first_name, foundMember.last_name].filter(Boolean).join(' ') || foundMember.email || 'Участник',
                email: foundMember.email || ''
              };
            }
            
            return null;
          } catch {
            return null;
          }
        };
        
        if (taskId && memberId) {
          const taskData = await taskService.getTaskDetail(taskId);
          setTask(taskData);
          
          const criteriaData = await taskService.getTaskCriteria(taskId);
          setCriteria(criteriaData || []);
          
          const memberData = await loadMemberFromGroup(taskData, memberId);
          if (memberData) {
            setMember(memberData);
          } else {
            setMember({
              id: memberId,
              name: 'Участник',
              email: ''
            });
          }
          
          try {
            const solutions = await solutionService.getTaskSolutions(taskId);
            
            const memberSolution = solutions.find(s =>
              s.student_id && s.student_id.toString() === memberId.toString()
            );
            
            if (memberSolution) {
              setSolution(memberSolution);

              // Загружаем presigned URLs файлов из S3
              try {
                const detail = await solutionService.getSolutionDetail(memberSolution.id);
                setFileUrls(detail.file_urls || []);
                setFileIndex(0);
              } catch {
                setFileUrls([]);
              }

              try {
                const feedbackData = await feedbackService.getFeedbackBySolution(memberSolution.id);
                setExistingFeedback(feedbackData);
              } catch {
                setExistingFeedback(null);
              }
            } else {
              setSolution(null);
              setExistingFeedback(null);
            }
          } catch {
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
  const [showTemplates, setShowTemplates] = React.useState(false);
  const [previewLarge, setPreviewLarge] = React.useState(false);
  const [formMaxHeight, setFormMaxHeight] = React.useState(undefined);
  const previewPanelRef = React.useRef(null);
  const { list: tplList, loading: tplLoading, add: tplAdd, update: tplUpdate, remove: tplRemove } = useTemplates();

  React.useEffect(() => {
    const el = previewPanelRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setFormMaxHeight(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const appendText = (current, text) => current ? current + '\n' + text : text;

  React.useEffect(() => {
    if (existingFeedback) {
      setRating(existingFeedback.grade || 0);
      setGeneralComment(existingFeedback.overall_comment || '');
      
      if (existingFeedback.criteria_feedback && criteria.length > 0) {
        const comments = {};
        existingFeedback.criteria_feedback.forEach(cf => {
          comments[cf.criteria_id] = cf.comment || '';
        });
        setCriteriaComments(comments);
      }
    } else if (criteria.length > 0) {
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

  const isOwnSolution = !!(user?.id && member?.id && user.id.toString() === member.id.toString());

  const filePath = fileUrls[fileIndex] || null;
  const fileName = filePath ? filePath.split('?')[0].split('/').pop() : null;
  const fileExt = fileName ? fileName.split('.').pop().toLowerCase() : null;
  const fileType = ['jpg', 'jpeg', 'png', 'webp'].includes(fileExt) ? 'image'
                 : fileExt === 'pdf' ? 'pdf'
                 : null;

  const handleFileUrlError = async () => {
    if (!solution?.id) return;
    try {
      const detail = await solutionService.getSolutionDetail(solution.id);
      const urls = detail.file_urls || [];
      setFileUrls(urls);
      setFileIndex(prev => Math.min(prev, urls.length - 1));
    } catch {
      // не удалось обновить — оставляем как есть
    }
  };

  const handleSubmit = async () => {
    if (!rating) {
      setRatingError(true);
      return;
    }
    
    if (!solution?.id) {
      alert('Не удалось отправить обратную связь. Попробуйте снова.');
      return;
    }
    const targetSolutionId = solution.id;
    try {
      setSubmitting(true);
      
      const feedbackData = {
        grade: rating,
        overall_comment: generalComment,
        criteria_feedback: criteria.map(c => ({
          criteria_id: c.id,
          comment: criteriaComments[c.id] || ''
        }))
      };
      
      if (existingFeedback) {
        await feedbackService.updateFeedback(existingFeedback.id, feedbackData);
      } else {
        await feedbackService.createFeedback(targetSolutionId, feedbackData);
      }
      
      navigateTo('task', { taskId: task.id });
      
    } catch {
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

      <div className="review-body">
        <div className="review-preview group-panel" ref={previewPanelRef}>
          <div className="review-preview__header">
            <div className="review-preview__header-left">
              <h2 className="group-panel__title">
                {showTemplates ? 'Шаблоны комментариев' : 'Просмотр работы'}
              </h2>
              {!showTemplates && (
                <div className="review-author">
                  <div className="review-author__avatar">
                    <svg width="22" height="22" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.4688 13.5312C10.4896 12.5521 10 11.375 10 10C10 8.625 10.4896 7.44792 11.4688 6.46875C12.4479 5.48958 13.625 5 15 5C16.375 5 17.5521 5.48958 18.5312 6.46875C19.5104 7.44792 20 8.625 20 10C20 11.375 19.5104 12.5521 18.5312 13.5312C17.5521 14.5104 16.375 15 15 15C13.625 15 12.4479 14.5104 11.4688 13.5312ZM5 22.5V21.5C5 20.7917 5.1825 20.1408 5.5475 19.5475C5.9125 18.9542 6.39667 18.5008 7 18.1875C8.29167 17.5417 9.60417 17.0575 10.9375 16.735C12.2708 16.4125 13.625 16.2508 15 16.25C16.375 16.2492 17.7292 16.4108 19.0625 16.735C20.3958 17.0592 21.7083 17.5433 23 18.1875C23.6042 18.5 24.0887 18.9533 24.4537 19.5475C24.8187 20.1417 25.0008 20.7925 25 21.5V22.5C25 23.1875 24.7554 23.7763 24.2663 24.2663C23.7771 24.7563 23.1883 25.0008 22.5 25H7.5C6.8125 25 6.22417 24.7554 5.735 24.2663C5.24583 23.7771 5.00083 23.1883 5 22.5ZM7.5 22.5H22.5V21.5C22.5 21.2708 22.4429 21.0625 22.3288 20.875C22.2146 20.6875 22.0633 20.5417 21.875 20.4375C20.75 19.875 19.6146 19.4533 18.4687 19.1725C17.3229 18.8917 16.1667 18.7508 15 18.75C13.8333 18.7492 12.6771 18.89 11.5313 19.1725C10.3854 19.455 9.25 19.8767 8.125 20.4375C7.9375 20.5417 7.78625 20.6875 7.67125 20.875C7.55625 21.0625 7.49917 21.2708 7.5 21.5V22.5ZM16.7663 11.7663C17.2554 11.2763 17.5 10.6875 17.5 10C17.5 9.3125 17.2554 8.72417 16.7663 8.235C16.2771 7.74583 15.6883 7.50083 15 7.5C14.3117 7.49917 13.7233 7.74417 13.235 8.235C12.7467 8.72583 12.5017 9.31417 12.5 10C12.4983 10.6858 12.7433 11.2746 13.235 11.7663C13.7267 12.2579 14.315 12.5025 15 12.5C15.685 12.4975 16.2738 12.2529 16.7663 11.7663Z" fill="currentColor"/></svg>
                  </div>
                  <span className="review-author__name">{member.name}</span>
                </div>
              )}
            </div>
            <div className="review-preview__header-right">
              {!showTemplates && filePath && (
                <a
                  className="button button--outline"
                  href={filePath}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Скачать файл
                </a>
              )}
              {!isOwnSolution && (
                <button
                  className={`button ${showTemplates ? 'button--outline' : 'button--primary'} review-tpl-toggle`}
                  onClick={() => setShowTemplates(s => !s)}
                  type="button"
                >
                  {showTemplates ? '← Работа' : 'Шаблоны'}
                </button>
              )}
            </div>
          </div>

          {showTemplates ? (
            <TemplatesPanel
              list={tplList}
              loading={tplLoading}
              onAdd={tplAdd}
              onUpdate={tplUpdate}
              onRemove={tplRemove}
            />
          ) : (
            <div className={`review-preview__stage${previewLarge ? ' review-preview__stage--a4' : ''}`}>
              {fileType === 'image' && (
                <ImageViewer src={filePath} previewLarge={previewLarge} onToggleLarge={() => setPreviewLarge(v => !v)} onSrcError={handleFileUrlError} solutionId={solution?.id} readOnly={isOwnSolution} />
              )}
              {fileType === 'pdf' && (
                <div className="review-file-preview">
                  <div className="review-file-preview__icon">📄</div>
                  <p className="review-file-preview__name">{fileName}</p>
                  <a className="button button--outline" href={filePath} target="_blank" rel="noopener noreferrer">
                    Скачать PDF
                  </a>
                </div>
              )}
              {!fileType && (
                <div className="review-file-preview">
                  <div className="review-file-preview__icon">📭</div>
                  <p className="review-file-preview__name">Работа не загружена</p>
                </div>
              )}
            </div>
          )}

          {!showTemplates && fileUrls.length > 1 && (
            <div className="review-file-switcher">
              {fileUrls.map((_, i) => (
                <button
                  key={i}
                  className={`review-file-switcher__btn${i === fileIndex ? ' is-active' : ''}`}
                  type="button"
                  onClick={() => setFileIndex(i)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="review-form group-panel" style={formMaxHeight ? { maxHeight: formMaxHeight } : undefined}>
          <h2 className="group-panel__title">{isOwnSolution ? 'Отзыв проверяющего' : 'Комментарии'}</h2>

          {isOwnSolution ? (
            existingFeedback ? (
              <div className="review-form__scroll">
                <div className="review-criteria-list">
                  {criteria.length > 0 ? criteria.map((c) => (
                    <div className="review-criterion" key={c.id}>
                      <strong className="review-criterion__name">{c.criteria_name}</strong>
                      {c.description && (
                        <p className="review-criterion__desc">{c.description}</p>
                      )}
                      <p className="review-criterion__readonly">
                        {criteriaComments[c.id] || 'Без комментария'}
                      </p>
                    </div>
                  )) : (
                    <p className="group-panel__empty">Критерии не заданы.</p>
                  )}
                </div>

                <div className="review-general">
                  <label className="review-general__label">Общий комментарий</label>
                  <p className="review-general__readonly">
                    {generalComment || 'Без комментария'}
                  </p>
                </div>

                <div className="review-rating">
                  <span className="review-rating__label">Оценка</span>
                  <div className="review-rating__dots">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        className={`review-rating__dot review-rating__dot--readonly${rating >= n ? ' is-active' : ''}`}
                        key={n}
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="group-panel__empty">Отзыв ещё не оставлен.</p>
            )
          ) : (
            <>
              <div className="review-form__scroll">
                <div className="review-criteria-list">
                  {criteria.length > 0 ? criteria.map((c) => (
                    <div className="review-criterion" key={c.id}>
                      <strong className="review-criterion__name">{c.criteria_name}</strong>
                      {c.description && (
                        <p className="review-criterion__desc">{c.description}</p>
                      )}
                      <div className="tpl-field-wrap">
                        <TemplateInsertBtn
                          list={tplList}
                          value={criteriaComments[c.id] || ''}
                          onSave={tplAdd}
                          onInsert={text => setCriteriaComments(prev => ({
                            ...prev,
                            [c.id]: appendText(prev[c.id] || '', text)
                          }))}
                        />
                        <VoiceInput
                          onResult={text => setCriteriaComments(prev => ({
                            ...prev,
                            [c.id]: appendText(prev[c.id] || '', text)
                          }))}
                        />
                        <textarea
                          className="review-criterion__textarea"
                          onChange={(e) => setCriteriaComments((prev) => ({ ...prev, [c.id]: e.target.value }))}
                          placeholder="Напишите комментарий..."
                          value={criteriaComments[c.id] || ''}
                        />
                      </div>
                    </div>
                  )) : (
                    <p className="group-panel__empty">Критерии не заданы.</p>
                  )}
                </div>

                <div className="review-general">
                  <label className="review-general__label">Общий комментарий</label>
                  <div className="tpl-field-wrap">
                    <TemplateInsertBtn
                      list={tplList}
                      value={generalComment}
                      onSave={tplAdd}
                      onInsert={text => setGeneralComment(prev => appendText(prev, text))}
                    />
                    <VoiceInput
                      onResult={text => setGeneralComment(prev => appendText(prev, text))}
                    />
                    <textarea
                      className="review-general__textarea"
                      onChange={(e) => setGeneralComment(e.target.value)}
                      placeholder="Общее впечатление от работы..."
                      value={generalComment}
                    />
                  </div>
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
            </>
          )}
        </div>
      </div>
    </section>
  );
}
