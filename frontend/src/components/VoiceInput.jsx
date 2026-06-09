import React from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

const BAR_COUNT = 5;
const BAR_W     = 2;
const BAR_GAP   = 3;
const CANVAS_W  = BAR_COUNT * BAR_W + (BAR_COUNT - 1) * BAR_GAP; // 22
const CANVAS_H  = 22;
const CX        = CANVAS_W / 2; // 11
const CY        = CANVAS_H / 2; // 11
const CIRCLE_R  = 9;
const TEAL      = '#1ca38b';

const PHASE_COLLAPSE = 400;
const PHASE_GROW     = 220;
const PHASE_CHECK    = 650;
const PHASE_HOLD     = 400;
const PHASE_FADE     = 350;

const easeOut   = t => 1 - (1 - Math.min(1, t)) ** 2;
const easeInOut = t => { const x = Math.min(1, t); return x < 0.5 ? 2*x*x : -1+(4-2*x)*x; };

const MicIcon = () => (
  <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
    <path d="M10.9014 16.4996L13.1184 9.94237H14.2261L16.4424 16.4996M13.1611 5.10112L15.2274 6.23888L16.3651 4.17188" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
    <path d="M15.2249 6.23925C15.0814 4.45999 14.3261 2.78534 13.0874 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M3.79736 1.5H9.39611V6.53925C9.38409 7.27376 9.08387 7.97411 8.56019 8.48928C8.03652 9.00446 7.33134 9.29318 6.59674 9.29318C5.86213 9.29318 5.15696 9.00446 4.63328 8.48928C4.10961 7.97411 3.80939 7.27376 3.79736 6.53925V1.5Z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M1.55713 6.54004C1.55722 7.4961 1.82927 8.43241 2.34154 9.23966C2.85381 10.0469 3.58514 10.6918 4.45016 11.0989C5.31518 11.5061 6.27818 11.6588 7.22674 11.5393C8.17529 11.4197 9.07025 11.0327 9.80713 10.4235M6.59638 11.5793V13.8368M11.6401 14.376H15.7036" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

const StopIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
    <rect x="0" y="0" width="10" height="10" rx="2"/>
  </svg>
);

function drawBar(ctx, x, h) {
  const bh = Math.max(1.5, h);
  const y  = (CANVAS_H - bh) / 2;
  const r  = Math.min(BAR_W / 2, bh / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + BAR_W, y,      x + BAR_W, y + bh, r);
  ctx.arcTo(x + BAR_W, y + bh, x,         y + bh, r);
  ctx.arcTo(x,         y + bh, x,         y,      r);
  ctx.arcTo(x,         y,      x + BAR_W, y,      r);
  ctx.closePath();
  ctx.fill();
}

function drawFilledCircle(ctx, radius) {
  ctx.fillStyle = TEAL;
  ctx.beginPath();
  ctx.arc(CX, CY, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawCheckPath(ctx, progress) {
  if (progress <= 0) return;
  const r  = CIRCLE_R;
  const p1 = { x: CX - r * 0.42, y: CY + r * 0.02 };
  const p2 = { x: CX - r * 0.05, y: CY + r * 0.38 };
  const p3 = { x: CX + r * 0.44, y: CY - r * 0.42 };
  const l1 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const l2 = Math.hypot(p3.x - p2.x, p3.y - p2.y);
  const drawn = progress * (l1 + l2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth   = 2.2;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  if (drawn <= l1) {
    const t = drawn / l1;
    ctx.lineTo(p1.x + (p2.x - p1.x) * t, p1.y + (p2.y - p1.y) * t);
  } else {
    ctx.lineTo(p2.x, p2.y);
    const t2 = (drawn - l1) / l2;
    ctx.lineTo(p2.x + (p3.x - p2.x) * t2, p2.y + (p3.y - p2.y) * t2);
  }
  ctx.stroke();
}

function WaveCanvas({ analyserRef, isRecording, isProcessing, onEnd }) {
  const canvasRef = React.useRef(null);
  const onEndRef  = React.useRef(onEnd);
  const stRef     = React.useRef({
    phase:   'idle',
    t0:      0,
    bars:    Array(BAR_COUNT).fill(2),
    snap:    Array(BAR_COUNT).fill(2),
    canStop: false,
  });

  // Keep onEnd ref current without adding it as a loop dependency
  React.useEffect(() => { onEndRef.current = onEnd; });

  // Transition driver — only mutates stRef, never touches the RAF loop
  React.useEffect(() => {
    const st = stRef.current;
    if (isRecording && st.phase === 'idle') {
      st.phase = 'wave';
    }
    if (!isRecording && isProcessing && st.phase === 'wave') {
      st.phase   = 'collapse';
      st.t0      = performance.now();
      st.snap    = [...st.bars];
      st.canStop = false;
    }
    if (!isProcessing && !['idle', 'wave', 'grow', 'check', 'hold', 'fade'].includes(st.phase)) {
      st.canStop = true;
    }
  }, [isRecording, isProcessing]);

  // Single persistent animation loop — runs for the lifetime of the component
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width        = CANVAS_W * dpr;
    canvas.height       = CANVAS_H * dpr;
    canvas.style.width  = CANVAS_W + 'px';
    canvas.style.height = CANVAS_H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const st = stRef.current;
    let raf;

    const tick = (now) => {
      raf = requestAnimationFrame(tick); // schedule first to never miss a frame

      if (st.phase === 'idle') {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        return;
      }

      let e = now - st.t0;

      if      (st.phase === 'collapse' && e >= PHASE_COLLAPSE) { st.phase = st.canStop ? 'grow' : 'loading'; st.t0 = now; }
      else if (st.phase === 'loading'  && st.canStop)          { st.phase = 'grow';  st.t0 = now; }
      else if (st.phase === 'grow'     && e >= PHASE_GROW)     { st.phase = 'check'; st.t0 = now; }
      else if (st.phase === 'check'    && e >= PHASE_CHECK)    { st.phase = 'hold';  st.t0 = now; }
      else if (st.phase === 'hold'     && e >= PHASE_HOLD)     { st.phase = 'fade';  st.t0 = now; }
      else if (st.phase === 'fade'     && e >= PHASE_FADE) {
        st.phase = 'idle';
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        onEndRef.current?.();
        return;
      }

      // Recompute e after transitions so the first frame of a new phase starts at 0
      e = now - st.t0;

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.globalAlpha = 1;

      switch (st.phase) {
        case 'wave': {
          const analyser = analyserRef.current;
          if (analyser) {
            const data = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(data);
            const step = Math.floor(analyser.frequencyBinCount / (BAR_COUNT * 2));
            const targets = Array.from({ length: BAR_COUNT }, (_, i) =>
              2 + (data[(i + 1) * step] / 255) * (CANVAS_H - 3)
            );
            st.bars = st.bars.map((c, i) => c + (targets[i] - c) * 0.25);
          }
          ctx.fillStyle = TEAL;
          st.bars.forEach((h, i) => drawBar(ctx, i * (BAR_W + BAR_GAP), h));
          break;
        }
        case 'collapse': {
          const p         = easeOut(e / PHASE_COLLAPSE);
          const spinAngle = (now / 800) * Math.PI * 2;
          const cx0       = (CANVAS_W - BAR_W) / 2;

          // Bars converge and fade out
          ctx.globalAlpha = 1 - p;
          ctx.fillStyle   = TEAL;
          st.snap.forEach((h, i) => {
            const x = i * (BAR_W + BAR_GAP) + (cx0 - i * (BAR_W + BAR_GAP)) * p;
            drawBar(ctx, x, h * (1 - p) + 1.5 * p);
          });

          // Spinner arc grows in, already rotating
          ctx.globalAlpha = p;
          ctx.strokeStyle = TEAL;
          ctx.lineWidth   = 2;
          ctx.lineCap     = 'round';
          ctx.beginPath();
          ctx.arc(CX, CY, CIRCLE_R - 1, spinAngle, spinAngle + Math.PI * 1.55 * p);
          ctx.stroke();

          ctx.globalAlpha = 1;
          break;
        }
        case 'loading': {
          const angle = (now / 800) * Math.PI * 2;
          ctx.strokeStyle = TEAL;
          ctx.lineWidth   = 2;
          ctx.lineCap     = 'round';
          ctx.beginPath();
          ctx.arc(CX, CY, CIRCLE_R - 1, angle, angle + Math.PI * 1.55);
          ctx.stroke();
          break;
        }
        case 'grow': {
          // Spinner fades out, filled circle fades in
          const p         = easeInOut(e / PHASE_GROW);
          const spinAngle = (now / 800) * Math.PI * 2;

          ctx.globalAlpha = 1 - p;
          ctx.strokeStyle = TEAL;
          ctx.lineWidth   = 2;
          ctx.lineCap     = 'round';
          ctx.beginPath();
          ctx.arc(CX, CY, CIRCLE_R - 1, spinAngle, spinAngle + Math.PI * 1.55);
          ctx.stroke();

          ctx.globalAlpha = p;
          drawFilledCircle(ctx, CIRCLE_R);
          ctx.globalAlpha = 1;
          break;
        }
        case 'check': {
          drawFilledCircle(ctx, CIRCLE_R);
          drawCheckPath(ctx, easeInOut(e / PHASE_CHECK));
          break;
        }
        case 'hold': {
          drawFilledCircle(ctx, CIRCLE_R);
          drawCheckPath(ctx, 1);
          break;
        }
        case 'fade': {
          ctx.globalAlpha = 1 - easeOut(e / PHASE_FADE);
          drawFilledCircle(ctx, CIRCLE_R);
          drawCheckPath(ctx, 1);
          ctx.globalAlpha = 1;
          break;
        }
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []); // empty deps — loop runs once, lives forever

  return <canvas ref={canvasRef} />;
}

export function VoiceInput({ onResult, disabled = false }) {
  const { isRecording, isProcessing, analyserRef, startRecording, stopRecording, resetError } = useSpeechRecognition();
  const [frameVisible, setFrameVisible] = React.useState(false);
  const [frameCircle, setFrameCircle]   = React.useState(false);

  React.useEffect(() => {
    if (isRecording || isProcessing) setFrameVisible(true);
    if (isProcessing) setFrameCircle(true);
  }, [isRecording, isProcessing]);

  const handleAnimEnd = React.useCallback(() => {
    setFrameVisible(false);
    setFrameCircle(false);
  }, []);

  const handleClick = async () => {
    if (isRecording) {
      try {
        const text = await stopRecording();
        if (text && onResult) onResult(text);
      } catch {}
    } else {
      resetError();
      await startRecording();
    }
  };

  const cls      = `stt-btn${isRecording ? ' stt-btn--recording' : ''}${isProcessing ? ' stt-btn--processing' : ''}`;
  const frameCls = `stt-wave-frame${frameVisible ? ' stt-wave-frame--active' : ''}${frameCircle ? ' stt-wave-frame--circle' : ''}`;

  return (
    <>
      <div className={frameCls}>
        <WaveCanvas
          analyserRef={analyserRef}
          isRecording={isRecording}
          isProcessing={isProcessing}
          onEnd={handleAnimEnd}
        />
      </div>
      <button
        className={cls}
        type="button"
        onClick={handleClick}
        disabled={isProcessing || disabled}
        title={isRecording ? 'Остановить запись' : isProcessing ? 'Распознавание...' : 'Голосовой ввод'}
      >
        {isRecording ? <StopIcon /> : <MicIcon />}
      </button>
    </>
  );
}
