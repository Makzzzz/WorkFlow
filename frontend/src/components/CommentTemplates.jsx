import React from 'react';
import { commentPatternService } from '../services/api.js';

export function useTemplates() {
  const [list, setList] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    commentPatternService.getAll()
      .then(data => setList(data.map(t => ({ id: t.id, text: t.comment }))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const add = async (text) => {
    const created = await commentPatternService.create(text);
    setList(prev => [{ id: created.id, text: created.comment }, ...prev]);
  };

  const update = async (id, text) => {
    await commentPatternService.update(id, text);
    setList(prev => prev.map(t => t.id === id ? { ...t, text } : t));
  };

  const remove = async (id) => {
    await commentPatternService.remove(id);
    setList(prev => prev.filter(t => t.id !== id));
  };

  return { list, loading, add, update, remove };
}

// Маленькая кнопка + дропдаун на textarea
export function TemplateInsertBtn({ list, onInsert, value, onSave }) {
  const [open, setOpen] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [saveError, setSaveError] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const h = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const handleSave = async () => {
    if (!value?.trim() || !onSave) return;
    try {
      await onSave(value.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    } catch {
      setSaveError(true);
      setTimeout(() => setSaveError(false), 1200);
    }
  };

  return (
    <div className="tpl-insert" ref={ref}>
      {onSave && (
        <button
          className={`tpl-insert__trigger${saved ? ' is-open' : ''}${saveError ? ' tpl-insert__trigger--error' : ''}`}
          onClick={handleSave}
          title="Сохранить как шаблон"
          type="button"
          disabled={!value?.trim()}
        >
          {saved ? (
            <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
              <path d="M2.5 8.5l3.5 3.5 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : saveError ? (
            <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
              <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          )}
        </button>
      )}
      <button
        className={`tpl-insert__trigger${open ? ' is-open' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Вставить шаблон"
        type="button"
      >
        <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
          <rect x="2" y="2" width="12" height="2.5" rx="1.25" fill="currentColor" opacity=".4"/>
          <rect x="2" y="6.75" width="12" height="2.5" rx="1.25" fill="currentColor" opacity=".7"/>
          <rect x="2" y="11.5" width="8" height="2.5" rx="1.25" fill="currentColor"/>
        </svg>
      </button>
      {open && (
        <div className="tpl-insert__dropdown">
          {list.length === 0 ? (
            <p className="tpl-insert__empty">Нет сохранённых шаблонов.</p>
          ) : list.map(t => (
            <button
              key={t.id}
              className="tpl-insert__item"
              onClick={() => { onInsert(t.text); setOpen(false); }}
              type="button"
            >
              {t.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Панель управления шаблонами
export function TemplatesPanel({ list, loading, onAdd, onUpdate, onRemove }) {
  const [adding, setAdding] = React.useState(false);
  const [newText, setNewText] = React.useState('');
  const [editId, setEditId] = React.useState(null);
  const [editText, setEditText] = React.useState('');

  const handleAdd = async () => {
    if (!newText.trim()) return;
    await onAdd(newText.trim());
    setNewText('');
    setAdding(false);
  };

  const handleUpdate = async (id) => {
    if (!editText.trim()) return;
    await onUpdate(id, editText.trim());
    setEditId(null);
  };

  return (
    <div className="tpl-panel">
      <div className="tpl-panel__body">
        <div className="tpl-cat">
          <div className="tpl-cat__head">
            {!adding && (
              <button className="tpl-cat__add" onClick={() => setAdding(true)} type="button">
                + Добавить
              </button>
            )}
          </div>

          {loading ? (
            <p className="tpl-panel__loading">Загрузка...</p>
          ) : (
            <>
              {list.map(t => (
                <div key={t.id} className="tpl-item">
                  {editId === t.id ? (
                    <div className="tpl-item__edit-wrap">
                      <textarea
                        className="tpl-item__edit"
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        autoFocus
                      />
                      <div className="tpl-item__btns">
                        <button
                          className="button button--primary tpl-item__save"
                          onClick={() => handleUpdate(t.id)}
                          type="button"
                        >
                          Сохранить
                        </button>
                        <button className="tpl-item__cancel" onClick={() => setEditId(null)} type="button">
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="tpl-item__row">
                      <p className="tpl-item__text">{t.text}</p>
                      <div className="tpl-item__btns tpl-item__btns--row">
                        <button
                          className="tpl-item__action"
                          onClick={() => { setEditId(t.id); setEditText(t.text); }}
                          type="button"
                          title="Редактировать"
                        >
                          <svg viewBox="0 0 24 24" fill="none" width="13" height="13">
                            <path d="M7 7H6C5.46957 7 4.96086 7.21071 4.58579 7.58579C4.21071 7.96086 4 8.46957 4 9V18C4 18.5304 4.21071 19.0391 4.58579 19.4142C4.96086 19.7893 5.46957 20 6 20H15C15.5304 20 16.0391 19.7893 16.4142 19.4142C16.7893 19.0391 17 18.5304 17 18V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M16 5.00011L19 8.00011M20.385 6.58511C20.7788 6.19126 21.0001 5.65709 21.0001 5.10011C21.0001 4.54312 20.7788 4.00895 20.385 3.61511C19.9912 3.22126 19.457 3 18.9 3C18.343 3 17.8088 3.22126 17.415 3.61511L9 12.0001V15.0001H12L20.385 6.58511Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button
                          className="tpl-item__action tpl-item__action--del"
                          onClick={() => onRemove(t.id)}
                          type="button"
                          title="Удалить"
                        >
                          <svg viewBox="0 0 16 16" fill="none" width="11" height="11">
                            <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {list.length === 0 && !adding && (
                <p className="tpl-panel__empty">Шаблонов пока нет.</p>
              )}
            </>
          )}

          {adding && (
            <div className="tpl-add">
              <textarea
                className="tpl-add__input"
                placeholder="Текст шаблона..."
                value={newText}
                onChange={e => setNewText(e.target.value)}
                autoFocus
              />
              <div className="tpl-item__btns">
                <button className="button button--primary" onClick={handleAdd} type="button">
                  Добавить
                </button>
                <button className="tpl-item__cancel" onClick={() => { setAdding(false); setNewText(''); }} type="button">
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
