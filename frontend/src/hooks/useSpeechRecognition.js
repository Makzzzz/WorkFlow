import { useState, useRef, useCallback } from 'react';
import { speechService } from '../services/api.js';
import { audioBufferToWav } from '../utils/helpers.js';

/**
 * Хук для записи голоса с микрофона и распознавания речи через бэкенд (SaluteSpeech).
 *
 * Возвращает:
 *   isRecording    – идёт ли запись
 *   isProcessing   – отправлено ли аудио на распознавание (ожидание ответа)
 *   error          – текст ошибки (null, если ошибки нет)
 *   startRecording – начать запись
 *   stopRecording  – остановить запись и вернуть Promise<string> с распознанным текстом
 *   resetError     – сбросить ошибку
 */
export function useSpeechRecognition() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  /** Сбросить ошибку */
  const resetError = useCallback(() => setError(null), []);

  /** Начать запись с микрофона */
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Доступ к микрофону запрещён.');
      } else if (err.name === 'NotFoundError') {
        setError('Микрофон не найден.');
      } else {
        setError('Ошибка микрофона: ' + err.message);
      }
    }
  }, []);

  /** Остановить запись и отправить аудио на распознавание */
  const stopRecording = useCallback(async () => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) {
        reject(new Error('Запись не начата'));
        return;
      }

      mediaRecorder.onstop = async () => {
        try {
          setIsProcessing(true);

          // Освобождаем микрофон
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
          }

          // Конвертируем записанное аудио в WAV
          const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
          chunksRef.current = [];
          const arrayBuffer = await blob.arrayBuffer();
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const wavBlob = await audioBufferToWav(audioBuffer);

          // Отправляем на бэкенд
          const result = await speechService.recognize(wavBlob);

          setIsProcessing(false);
          resolve(result.text || '');
        } catch (err) {
          setIsProcessing(false);
          setError('Ошибка обработки: ' + err.message);
          reject(err);
        }
      };

      mediaRecorder.stop();
      setIsRecording(false);
    });
  }, []);

  return {
    isRecording,
    isProcessing,
    error,
    startRecording,
    stopRecording,
    resetError,
  };
}