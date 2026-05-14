import React from 'react';
import { STORAGE_KEYS, readStorage, writeStorage } from '../utils/storage.js';
import { getInitials } from '../utils/helpers.js';
import { MOCK_MEMBERS } from '../data/mockMembers.js';

export function ReviewPage() {
  const taskId = readStorage(STORAGE_KEYS.selectedTaskId);
  const memberId = readStorage(STORAGE_KEYS.selectedMemberId);
  const tasks = readStorage(STORAGE_KEYS.tasks) ?? [];
  const task = tasks.find((t) => t.id === taskId);
  const member = MOCK_MEMBERS.find((m) => m.id === memberId);

  const criteria = task?.criteria ?? [];
  const existingReview = (readStorage(STORAGE_KEYS.reviews) ?? [])
    .find((r) => r.taskId === taskId && r.memberId === memberId);

  const submission = (readStorage(STORAGE_KEYS.submissions) ?? [])
    .find((s) => s.taskId === taskId && s.memberId === memberId);

  const mockFile = { name: `Работа_${member?.name?.split(' ')[0] ?? 'участника'}.pdf`, size: 2.4 * 1024 * 1024, type: 'application/pdf' };
  const submittedFiles = submission?.files?.length ? submission.files : [mockFile];

  const [activeFileIdx, setActiveFileIdx] = React.useState(0);
  const activeFile = submittedFiles[activeFileIdx] ?? null;

  const [criteriaComments, setCriteriaComments] = React.useState(
    () => existingReview?.criteriaComments ?? Object.fromEntries(criteria.map((c) => [c.id, ''])),
  );
  const [generalComment, setGeneralComment] = React.useState(existingReview?.generalComment ?? '');
  const [rating, setRating] = React.useState(existingReview?.rating ?? 0);
  const [ratingError, setRatingError] = React.useState(false);

  if (!task || !member) {
    return (
      <section className="review-layout motion-rise motion-delay-2">
        <p>Данные не найдены.</p>
      </section>
    );
  }

  const handleSubmit = () => {
    if (!rating) {
      setRatingError(true);
      return;
    }
    const existing = readStorage(STORAGE_KEYS.reviews) ?? [];
    const key = `${taskId}_${memberId}`;
    const updated = existing.filter((r) => r.key !== key);
    writeStorage(STORAGE_KEYS.reviews, [
      ...updated,
      { key, taskId, memberId, rating, criteriaComments, generalComment, status: 'Завершено' },
    ]);
    window.location.hash = '#task';
  };

  return (
    <section className="review-layout motion-rise motion-delay-2">
      <h1 className="review__title motion-rise motion-delay-3">Проверка работы</h1>

      <div className="review-info-row motion-rise motion-delay-3">
        <div className="review-info-card">
          <span className="review-info-card__label">Задание</span>
          <strong className="review-info-card__value">{task.name}</strong>
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
            {activeFile?.data ? (
              activeFile.type?.includes('image') ? (
                <img
                  alt={activeFile.name}
                  className="review-file-inline review-file-inline--image"
                  src={activeFile.data}
                />
              ) : activeFile.type?.includes('pdf') ? (
                <iframe
                  className="review-file-inline review-file-inline--pdf"
                  src={activeFile.data}
                  title={activeFile.name}
                />
              ) : (
                <div className="review-file-preview">
                  <div className="review-file-preview__icon">📎</div>
                  <p className="review-file-preview__name">{activeFile.name}</p>
                  <p className="review-file-preview__size">{(activeFile.size / 1024 / 1024).toFixed(2)} МБ</p>
                </div>
              )
            ) : (
              <div className="review-file-preview">
                <div className="review-file-preview__icon">📄</div>
                <p className="review-file-preview__name">{activeFile?.name}</p>
                <p className="review-file-preview__size">{activeFile ? `${(activeFile.size / 1024 / 1024).toFixed(2)} МБ` : ''}</p>
              </div>
            )}
          </div>

          {submittedFiles.length > 1 && (
            <div className="review-file-switcher">
              {submittedFiles.map((f, idx) => (
                <button
                  className={`review-file-switcher__btn${idx === activeFileIdx ? ' is-active' : ''}`}
                  key={f.name}
                  onClick={() => setActiveFileIdx(idx)}
                  title={f.name}
                  type="button"
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          )}

          {activeFile && (
            <span className="review-preview__filename">{activeFile.name}</span>
          )}
        </div>

        <div className="review-form group-panel">
          <h2 className="group-panel__title">Комментарии</h2>

          <div className="review-criteria-list">
            {criteria.length > 0 ? criteria.map((c) => (
              <div className="review-criterion" key={c.id}>
                <strong className="review-criterion__name">{c.name}</strong>
                <textarea
                  className="review-criterion__textarea"
                  onChange={(e) => setCriteriaComments((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  placeholder="Напишите комментарий..."
                  value={criteriaComments[c.id] ?? ''}
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
            >
              {existingReview ? 'Сохранить' : 'Отправить ревью'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
