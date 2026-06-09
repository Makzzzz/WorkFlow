export function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function formatDeadline(iso, includeYear = false) {
  if (!iso) return '';
  const date = new Date(iso);
  const dateOpts = { day: 'numeric', month: 'long' };
  if (includeYear) dateOpts.year = 'numeric';
  const datePart = date.toLocaleDateString('ru-RU', dateOpts);
  if (!iso.includes('T')) return datePart;
  const timePart = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `${datePart} | ${timePart}`;
}

export function formatDeadlineParts(iso, includeYear = false) {
  if (!iso) return null;
  const date = new Date(iso);
  const dateOpts = { day: 'numeric', month: 'long' };
  if (includeYear) dateOpts.year = 'numeric';
  const datePart = date.toLocaleDateString('ru-RU', dateOpts);
  if (!iso.includes('T')) return { date: datePart, time: null };
  const timePart = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return { date: datePart, time: timePart };
}

export function moveCaretToEnd(event) {
  const input = event.currentTarget;
  const length = input.value.length;

  window.requestAnimationFrame(() => {
    input.setSelectionRange(length, length);
  });
}

export function audioBufferToWav(buffer) {
  const numChannels = 1;
  const sampleRate = 16000;
  const bitDepth = 16;

  const offlineCtx = new OfflineAudioContext(numChannels,
    Math.floor(buffer.duration * sampleRate), sampleRate);

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineCtx.destination);
  source.start();

  return new Promise((resolve, reject) => {
    offlineCtx.startRendering().then((renderedBuffer) => {
      const pcmData = renderedBuffer.getChannelData(0);
      const pcm16 = new Int16Array(pcmData.length);

      for (let i = 0; i < pcmData.length; i++) {
        const s = Math.max(-1, Math.min(1, pcmData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      const dataLength = pcm16.length * 2;
      const headerLength = 44;
      const totalLength = headerLength + dataLength;

      const wav = new ArrayBuffer(totalLength);
      const view = new DataView(wav);

      writeString(view, 0, 'RIFF');
      view.setUint32(4, totalLength - 8, true);
      writeString(view, 8, 'WAVE');
      writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numChannels * bitDepth / 8, true);
      view.setUint16(32, numChannels * bitDepth / 8, true);
      view.setUint16(34, bitDepth, true);
      writeString(view, 36, 'data');
      view.setUint32(40, dataLength, true);

      let offset = 44;
      for (let i = 0; i < pcm16.length; i++) {
        view.setInt16(offset, pcm16[i], true);
        offset += 2;
      }

      resolve(new Blob([wav], { type: 'audio/wav' }));
    }).catch(reject);
  });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

