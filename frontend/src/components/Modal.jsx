import React from 'react';

export function Modal({ title, text, onConfirm, onCancel, confirmLabel = 'Подтвердить', confirmClassName = 'button button--primary' }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">{title}</h2>
        <p className="modal__text">{text}</p>
        <div className="modal__actions">
          <button className="button button--outline" onClick={onCancel} type="button">
            Отмена
          </button>
          <button className={confirmClassName} onClick={onConfirm} type="button">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}