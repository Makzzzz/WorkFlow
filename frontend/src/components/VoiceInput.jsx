import React from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

export function VoiceInput({ onResult, disabled = false }) {
  const { isRecording, isProcessing, error, startRecording, stopRecording, resetError } = useSpeechRecognition();

  const handleClick = async () => {
    if (isRecording) {
      try {
        const text = await stopRecording();
        if (text && onResult) {
          onResult(text);
        }
      } catch (err) {
        // ошибка уже обработана в хуке
      }
    } else {
      resetError();
      await startRecording();
    }
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isProcessing || disabled}
        title={isRecording ? 'Остановить запись' : 'Записать голосовой комментарий'}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '2px solid',
          borderColor: isRecording ? '#dc3545' : isProcessing ? '#ffc107' : '#6c757d',
          background: isRecording ? '#dc3545' : isProcessing ? '#fff3cd' : '#f8f9fa',
          color: isRecording ? '#fff' : isProcessing ? '#856404' : '#6c757d',
          cursor: isProcessing ? 'wait' : 'pointer',
          fontSize: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          animation: isRecording ? 'pulse 1s infinite' : 'none',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {isProcessing ? '⏳' : isRecording ? '🔴' : '🎤'}
      </button>

      {isRecording && (
        <span style={{ fontSize: '12px', color: '#dc3545', animation: 'pulse 1s infinite' }}>
          Запись...
        </span>
      )}

      {isProcessing && (
        <span style={{ fontSize: '12px', color: '#856404' }}>
          Распознавание...
        </span>
      )}

      {error && (
        <span style={{ fontSize: '12px', color: '#dc3545' }}>
          {error}
        </span>
      )}

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
