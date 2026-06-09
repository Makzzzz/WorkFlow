import { useState, useRef, useCallback } from 'react';
import { speechService } from '../services/api.js';
import { audioBufferToWav } from '../utils/helpers.js';

export function useSpeechRecognition() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);

  const resetError = useCallback(() => setError(null), []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Analyser for waveform visualization
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        audioCtx.createMediaStreamSource(stream).connect(analyser);
        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;
      } catch {}

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

          if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
          }
          if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
            analyserRef.current = null;
          }

          const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
          chunksRef.current = [];
          const arrayBuffer = await blob.arrayBuffer();
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const wavBlob = await audioBufferToWav(audioBuffer);

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
    analyserRef,
    startRecording,
    stopRecording,
    resetError,
  };
}
