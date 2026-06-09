import React from 'react';
import { getUrlParam, navigateTo } from '../utils/url.js';
import { solutionService } from '../services/api.js';

export function UploadWorkPage() {
  const [files, setFiles] = React.useState([]);
  const [dragging, setDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState(null);
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
      setError('Выберите файл для загрузки');
      return;
    }
    if (!taskId) {
      setError('ID задачи не найден');
      return;
    }
    try {
      setUploading(true);
      setError(null);
      await solutionService.submitSolution(taskId, files[0]);
      navigateTo('task', { taskId });
    } catch (err) {
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

      <div className="upload-dropzone motion-rise motion-delay-4">
        <div className="upload-dropzone__plus">+</div>

        {files.length === 0 ? (
          <>
            <p className="upload-dropzone__label">Перетащите файл сюда</p>
            <p className="upload-dropzone__hint">JPG, JPEG, PNG, PDF.<br />Максимум 50 МБ.</p>
          </>
        ) : (
          <ul className="upload-file-list">
            {files.map((f) => (
              <li className="upload-file-item" key={f.name}>
                <div className="upload-file-item__info">
                  <span className="upload-file-item__name">{f.name}</span>
                  <span className="upload-file-item__size">{(f.size / 1024 / 1024).toFixed(2)} МБ</span>
                </div>
                <button className="upload-file-item__remove" onClick={() => removeFile(f.name)} type="button" disabled={uploading}>✕</button>
              </li>
            ))}
          </ul>
        )}

        <button
          className="upload-dropzone__pick"
          onClick={() => inputRef.current?.click()}
          type="button"
          disabled={uploading}
        >
          {files.length > 0 ? 'Добавить ещё' : 'Выбрать файл'}
        </button>

        <input
          accept=".pdf,.png,.jpg,.jpeg,.ppt,.pptx"
          multiple
          onChange={(e) => addFiles(e.target.files)}
          ref={inputRef}
          type="file"
          disabled={uploading}
          style={{ display: 'none' }}
        />
      </div>

      <button
        className="upload-submit"
        onClick={handleSubmit}
        type="button"
        disabled={uploading || files.length === 0}
      >
        {uploading ? 'Загрузка...' : 'Отправить'}
      </button>
    </section>
  );
}
