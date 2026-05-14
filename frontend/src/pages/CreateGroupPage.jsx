import React from 'react';
import { STORAGE_KEYS, readStorage, writeStorage } from '../utils/storage.js';
import { moveCaretToEnd } from '../utils/helpers.js';

export function CreateGroupPage({ currentUser }) {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    const existing = readStorage(STORAGE_KEYS.groups) ?? [];
    const newGroup = {
      id: Date.now(),
      name: name.trim(),
      description: description.trim(),
      createdAt: new Date().toLocaleDateString('ru-RU'),
      code: Math.floor(100000 + Math.random() * 900000).toString(),
      creatorEmail: currentUser?.email ?? null,
    };
    writeStorage(STORAGE_KEYS.groups, [newGroup, ...existing]);
    window.location.hash = '#my-groups';
  };

  return (
    <section className="create-group-layout motion-rise motion-delay-2">
      <div className="create-group-content motion-rise motion-delay-3">
        <h1 className="create-group__title">Создайте новую группу</h1>

        <form className="create-group-card" onSubmit={handleSubmit}>
          <label className="field">
            <span>Название группы</span>
            <input
              onChange={(e) => setName(e.target.value)}
              onClick={moveCaretToEnd}
              onFocus={moveCaretToEnd}
              type="text"
              value={name}
            />
          </label>

          <label className="field create-group__desc-field">
            <span>Описание</span>
            <textarea
              className="create-group__textarea"
              maxLength={200}
              onChange={(e) => setDescription(e.target.value)}
              value={description}
            />
            <span className={`create-group__char-count${description.length >= 190 ? ' create-group__char-count--warn' : ''}`}>
              {description.length} / 200
            </span>
          </label>
        </form>

        <button
          className="button button--primary create-group__submit"
          onClick={handleSubmit}
          type="button"
        >
          Создать группу
        </button>
      </div>
    </section>
  );
}