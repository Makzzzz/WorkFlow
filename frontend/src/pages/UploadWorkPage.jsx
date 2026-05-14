import React from 'react';
import { STORAGE_KEYS, readStorage, writeStorage } from '../utils/storage.js';

const PARTICIPANT_MEMBER_ID = 1;

export function UploadWorkPage() {
  const [files, setFiles] = React.useState([]);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef(null);

  const addFiles = (newFiles) => {
    const list = Array.from(newFiles);
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...list.filter((f) => !names.has(f.name))];
    });
  };

  const removeFile = (name) => setFiles((prev) => prev.filter((f) => f.name !== name));

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  const readAsBase64 = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });

  const handleSubmit = async () => {
    if (!files.length) return;
    const taskId = readStorage(STORAGE_KEYS.selectedTaskId);
    const existing = readStorage(STORAGE_KEYS.submissions) ?? [];
    const key = `${taskId}_${PARTICIPANT_MEMBER_ID}`;
    const fileMeta = await Promise.all(
      files.map(async (f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
        data: await readAsBase64(f),
      })),
    );
    const updated = existing.filter((s) => s.key !== key);
    writeStorage(STORAGE_KEYS.submissions, [...updated, { key, taskId, memberId: PARTICIPANT_MEMBER_ID, files: fileMeta }]);
    window.location.hash = '#task';
  };

  return (
    <section
      className={`upload-layout motion-rise motion-delay-2${dragging ? ' upload-layout--dragging' : ''}`}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <h1 className="upload__title motion-rise motion-delay-3">Загрузите свою работу</h1>

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
        >
          {files.length > 0 ? 'Добавить ещё' : 'Выбрать файлы'}
        </button>

        <input
          accept=".pdf,.png,.jpg,.jpeg,.ppt,.pptx"
          multiple
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
          ref={inputRef}
          style={{ display: 'none' }}
          type="file"
        />
      </div>

      <button
        className={`upload-submit motion-rise motion-delay-5${!files.length ? ' upload-submit--disabled' : ''}`}
        disabled={!files.length}
        onClick={handleSubmit}
        type="button"
      >
        Отправить
      </button>
    </section>
  );
}
