import React from 'react';
import { getUrlParam, navigateTo } from '../utils/url.js';
import { solutionService } from '../services/api.js';

const PARTICIPANT_MEMBER_ID = 1;

export function UploadWorkPage() {
  const [files, setFiles] = React.useState([]);
  const [dragging, setDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(false);
  const inputRef = React.useRef(null);

  const taskId = getUrlParam('taskId');

  const addFiles = (newFiles) => {
    const list = Array.from(newFiles);
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...list.filter((f) => !names.has(f.name))];
    });
    setError(null);
  };

  const removeFile = (name) => setFiles((prev) => prev.filter((f) => f.name !== name));

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  const handleSubmit = async () => {
    if (!files.length) {
      setError('Выберите хотя бы один файл для загрузки');
      return;
    }

    if (!taskId) {
      setError('ID задачи не найден');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(false);

      console.log('Начало загрузки решения для задачи ID:', taskId);
      console.log('Количество файлов:', files.length);

      // Для простоты загружаем только первый файл (можно расширить для множественной загрузки)
      const fileToUpload = files[0];
      
      console.log('Загрузка файла:', fileToUpload.name, 'тип:', fileToUpload.type, 'размер:', fileToUpload.size);

      // Отправляем решение через API
      const response = await solutionService.submitSolution(taskId, fileToUpload);
      console.log('Решение успешно загружено:', response);

      setSuccess(true);
      setFiles([]);

      // Через 2 секунды перенаправляем на страницу задачи
      setTimeout(() => {
        navigateTo('task', { taskId });
      }, 2000);

    } catch (err) {
      console.error('Ошибка при загрузке решения:', err);
      setError(err.message || 'Не удалось загрузить решение. Попробуйте снова.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <section
      className={`upload-layout motion-rise motion-delay-2${dragging ? ' upload-layout--dragging' : ''}`}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <h1 className="upload__title motion-rise motion-delay-3">Загрузите свою работу</h1>

      {error && (
        <div className="upload-error motion-rise motion-delay-3">
          <div className="upload-error__message">{error}</div>
        </div>
      )}

      {success && (
        <div className="upload-success motion-rise motion-delay-3">
          <div className="upload-success__message">✅ Решение успешно загружено! Перенаправление на страницу задачи...</div>
        </div>
      )}

      <div className="upload-dropzone motion-rise motion-delay-4">
        <div className="upload-dropzone__plus">+</div>

        {files.length === 0 ? (
          <>
            <p className="upload-dropzone__label">Перетащите файлы сюда</p>
            <p className="upload-dropzone__hint">PDF, изображение, презентация или ссылка.<br />Максимум 50 МБ.</p>
          </>
        ) : (
          <ul className="upload-file-list">
            {files.map((f) => (
              <li className="upload-file-item" key={f.name}>
                <div className="upload-file-item__info">
                  <span className="upload-file-item__name">{f.name}</span>
                  <span className="upload-file-item__size">{(f.size / 1024 / 1024).toFixed(2)} МБ</span>
                </div>
                <button
                  className="upload-file-item__remove"
                  onClick={() => removeFile(f.name)}
                  type="button"
                  disabled={uploading}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          className="upload-dropzone__pick"
          onClick={() => inputRef.current?.click()}
          type="button"
          disabled={uploading || success}
        >
          {files.length > 0 ? 'Добавить ещё' : 'Выбрать файлы'}
        </button>

        <input
          accept=".pdf,.png,.jpg,.jpeg,.ppt,.pptx"
          className="upload-dropzone__input"
          multiple
          onChange={(e) => addFiles(e.target.files)}
          ref={inputRef}
          type="file"
          disabled={uploading || success}
        />
      </div>

      <div className="upload-actions motion-rise motion-delay-5">
        <button
          className="button button--outline"
          onClick={() => navigateTo('task', { taskId })}
          type="button"
          disabled={uploading}
        >
          Отмена
        </button>
        <button
          className="button button--primary"
          onClick={handleSubmit}
          type="button"
          disabled={uploading || files.length === 0 || success}
        >
          {uploading ? 'Загрузка...' : 'Отправить решение'}
        </button>
      </div>

      <div className="upload-info motion-rise motion-delay-5">
        <h3 className="upload-info__title">Как это работает:</h3>
        <ul className="upload-info__list">
          <li>Загрузите файл с вашим решением (PDF, изображение, презентация)</li>
          <li>Максимальный размер файла: 50 МБ</li>
          <li>После загрузки ваше решение будет доступно для проверки организатором</li>
          <li>Вы можете загрузить только одно решение на задачу</li>
        </ul>
      </div>
    </section>
  );
}
