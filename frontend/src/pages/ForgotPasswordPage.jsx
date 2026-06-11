import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { authService } from '../services/api.js';

export function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [resetCode, setResetCode] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [step, setStep] = React.useState('email'); // 'email' | 'otp' | 'new-password' | 'done'

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setErrorMessage('Введите email.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage('Введите корректный email.');
      return;
    }
    setErrorMessage('');
    try {
      await authService.requestPasswordReset(email.trim());
      setStep('otp');
    } catch {
      setErrorMessage('Не удалось отправить код. Попробуйте снова.');
    }
  };

  return (
    <section className="forgot-layout motion-rise motion-delay-2">
      <div className="forgot-card">
        {step === 'done' ? (
          <>
            <h2 className="forgot-card__title">Пароль изменён</h2>
            <p className="forgot-card__hint">Вы успешно сбросили пароль. Войдите с новыми данными.</p>
            <a className="button button--primary forgot-submit" href={"#login"}>Войти</a>
          </>
        ) : step === 'new-password' ? (
          <NewPasswordCard email={email} code={resetCode} onSuccess={() => setStep('done')} />
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 className="forgot-card__title">Сброс пароля</h2>
            <div className="forgot-field-group">
              <label className="field">
                <span>Email</span>
                <input
                  autoComplete="email" inputMode="email"
                  onChange={(e) => setEmail(e.target.value)}
                  type="text" value={email}
                  disabled={step === 'otp'}
                />
              </label>
            </div>
            {errorMessage && <p className="field-error forgot-error">{errorMessage}</p>}
            <button className="button button--primary forgot-submit" type="submit"
              disabled={step === 'otp'}>
              Продолжить
            </button>
          </form>
        )}
      </div>

      {createPortal(
        <AnimatePresence>
          {step === 'otp' && (
            <OtpModal
              email={email}
              onSuccess={(code) => { setResetCode(code); setStep('new-password'); }}
              onResend={handleSubmit}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </section>
  );
}

// Периметр ячейки (56×64, rx=16) ≈ 212px
const PERIM = 212;
const HEAD = 4;
const DUR = 1.2;

// 8 слоёв: каждый короче предыдущего, opacity нарастает к голове
// Дальний конец → прозрачный (показывает белый бордер), ближе к точке → насыщенный teal
const TAIL_LAYERS = [
  { L: 72, op: 0.05 },
  { L: 64, op: 0.10 },
  { L: 56, op: 0.18 },
  { L: 46, op: 0.28 },
  { L: 36, op: 0.42 },
  { L: 26, op: 0.60 },
  { L: 16, op: 0.78 },
  { L:  8, op: 0.94 },
];

function OtpComet() {
  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2, overflow: 'visible' }}
      viewBox="0 0 56 64"
      fill="none"
    >
      {/* Хвост — слои с нарастающей opacity, длинные слои покрывают дальний (белый) конец */}
      {TAIL_LAYERS.map(({ L, op }) => (
        <motion.rect
          key={L}
          x="1" y="1" width="54" height="62" rx="15"
          stroke="#1ca38b"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${L} ${PERIM - L}`}
          animate={{ strokeDashoffset: [-(PERIM - L), -(2 * PERIM - L)] }}
          transition={{ duration: DUR, repeat: Infinity, ease: 'linear' }}
          style={{ opacity: op }}
        />
      ))}
      {/* Голова — яркая белая точка с зелёным свечением */}
      <motion.rect
        x="1" y="1" width="54" height="62" rx="15"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${HEAD} ${PERIM - HEAD}`}
        animate={{ strokeDashoffset: [0, -PERIM] }}
        transition={{ duration: DUR, repeat: Infinity, ease: 'linear' }}
        style={{ filter: 'drop-shadow(0 0 3px #1ca38b) drop-shadow(0 0 8px #5ef0d4)' }}
      />
    </svg>
  );
}

// Ячейка с подсветкой при вводе
function OtpCell({ digit, animTick, inputRef, disabled, onChange, onKeyDown, spinning, glowing, error }) {
  const glowControls = useAnimation();

  // Вспышка при вводе цифры
  React.useEffect(() => {
    if (!digit) return;
    glowControls.start({
      boxShadow: [
        '0 0 0 0px rgba(28,163,139,0)',
        '0 0 0 6px rgba(28,163,139,0.28)',
        '0 0 0 0px rgba(28,163,139,0)',
      ],
      transition: { duration: 0.45, ease: 'easeOut' },
    });
  }, [animTick]);

  // Постоянное свечение в стадии glowing
  React.useEffect(() => {
    if (glowing) {
      glowControls.start({
        boxShadow: '0 0 0 3px rgba(28,163,139,0.35), 0 0 18px rgba(28,163,139,0.3)',
        transition: { duration: 0.4, ease: 'easeOut' },
      });
    } else if (!glowing && !spinning) {
      glowControls.start({
        boxShadow: '0 0 0 0px rgba(28,163,139,0)',
        transition: { duration: 0.2 },
      });
    }
  }, [glowing]);

  return (
    <motion.div
      animate={glowControls}
      className={`otp-cell-wrap ${digit ? 'otp-cell-wrap--filled' : ''} ${spinning ? 'otp-cell-wrap--spinning' : ''} ${glowing ? 'otp-cell-wrap--glowing' : ''} ${error ? 'otp-cell-wrap--error' : ''}`}
      style={{ borderRadius: 18 }}
    >
      {spinning && <OtpComet />}
      <input
        ref={inputRef}
        className="otp-cell"
        type="text" maxLength={1}
        value={digit} disabled={disabled}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={(e) => e.target.select()}
        autoComplete="one-time-code"
        style={{ color: glowing ? 'transparent' : undefined, transition: 'color 0.3s ease', textTransform: 'uppercase' }}
      />
    </motion.div>
  );
}

const MERGE_OFFSETS  = [150, 90, 30, -30, -90, -150];
const ROTATE_ANGLES  = [-10, -5, -2,   2,   5,   10]; // deg, как карточки в колоде

export function OtpModal({ email, onSuccess, onResend, onSubmit }) {
  const LENGTH = 6;
  const [digits, setDigits] = React.useState(Array(LENGTH).fill(''));
  const [animTicks, setAnimTicks] = React.useState(Array(LENGTH).fill(0));
  const [stage, setStage] = React.useState('idle'); // 'idle' | 'spinning' | 'glowing' | 'merging' | 'success'
  const [isError, setIsError] = React.useState(false);
  const [resendCooldown, setResendCooldown] = React.useState(0);
  const inputRefs = React.useRef([]);
  const rowControls = useAnimation();

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  React.useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 60);
  }, []);

  const focusAt = (idx) =>
    inputRefs.current[Math.max(0, Math.min(LENGTH - 1, idx))]?.focus();

  const handleChange = (index, e) => {
    if (stage !== 'idle') return;
    const digit = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(-1).toUpperCase();
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit) {
      setAnimTicks((prev) => { const t = [...prev]; t[index]++; return t; });
      if (index < LENGTH - 1) focusAt(index + 1);
    }
    if (digit && next.every((d) => d !== '')) submitCode(next.join(''));
  };

  const handleKeyDown = (index, e) => {
    if (stage !== 'idle') return;
    if (e.key === 'Backspace') {
      if (digits[index]) { const n = [...digits]; n[index] = ''; setDigits(n); }
      else focusAt(index - 1);
    } else if (e.key === 'ArrowLeft') focusAt(index - 1);
    else if (e.key === 'ArrowRight') focusAt(index + 1);
    else if (e.key.length === 1 && !/^[a-zA-Z0-9]$/.test(e.key) && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
    }
  };

  const handlePaste = (e) => {
    if (stage !== 'idle') return;
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^a-zA-Z0-9]/g, '').slice(0, LENGTH).toUpperCase();
    if (!pasted) return;
    const next = Array(LENGTH).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    focusAt(Math.min(pasted.length, LENGTH - 1));
    if (pasted.length === LENGTH) submitCode(pasted);
  };

  const triggerError = async () => {
    setIsError(true);
    await rowControls.start({
      x: [0, -10, 10, -8, 8, -5, 5, 0],
      transition: { duration: 0.5, ease: 'easeInOut' },
    });
    await new Promise((r) => setTimeout(r, 400));
    setIsError(false);
    setDigits(Array(LENGTH).fill(''));
    focusAt(0);
  };

  const submitCode = async (code) => {
    setStage('spinning');
    try {
      if (onSubmit) {
        await onSubmit(code);
      } else {
        await new Promise((r) => setTimeout(r, 1200));
      }
      setStage('glowing');
      await new Promise((r) => setTimeout(r, 700));
      setStage('merging');
      await new Promise((r) => setTimeout(r, 950));
      setStage('success');
      await new Promise((r) => setTimeout(r, 1400));
      onSuccess(code);
    } catch {
      setStage('idle');
      await triggerError();
    }
  };

  const handleResend = (e) => {
    e.preventDefault();
    if (resendCooldown > 0) return;
    setResendCooldown(60);
    setDigits(Array(LENGTH).fill(''));
    setStage('idle');
    onResend(e);
    setTimeout(() => focusAt(0), 50);
  };

  return (
    <motion.div
      className="otp-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <motion.div
        className="otp-modal"
        initial={{ scale: 0.92, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 24, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      >
        <h2 className="otp-modal__title">Введите код</h2>
        <p className="otp-modal__hint">
          Мы отправили 6-значный код на&nbsp;<strong>{email}</strong>.
        </p>

        <motion.div className="otp-cells" animate={rowControls} onPaste={handlePaste}>
          {stage === 'success' ? (
            // Финальная ячейка с галочкой
            <motion.div
              className="otp-success-cell"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </motion.div>
          ) : (
            digits.map((digit, i) => (
              <motion.div
                key={i}
                animate={
                  stage === 'merging'
                    ? {
                        x:       [0, MERGE_OFFSETS[i],  MERGE_OFFSETS[i]],
                        rotate:  [0, ROTATE_ANGLES[i],  ROTATE_ANGLES[i]],
                        scale:   [1, 0.88,               0],
                        opacity: [1, 1,                  0],
                      }
                    : { x: 0, rotate: 0, scale: 1, opacity: 1 }
                }
                transition={
                  stage === 'merging'
                    ? { duration: 0.9, times: [0, 0.55, 1], ease: [0.22, 1, 0.36, 1] }
                    : { duration: 0 }
                }
                style={{ zIndex: stage === 'merging' ? 6 - Math.abs(i - 2.5) : 1 }}
              >
                <OtpCell
                  digit={digit}
                  animTick={animTicks[i]}
                  inputRef={(el) => { inputRefs.current[i] = el; }}
                  disabled={stage !== 'idle'}
                  spinning={stage === 'spinning'}
                  glowing={stage === 'glowing' || stage === 'merging'}
                  error={isError}
                  onChange={(e) => handleChange(i, e)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                />
              </motion.div>
            ))
          )}
        </motion.div>

        {stage === 'idle' && (
          <p className="otp-resend-row">
            Не получили код?{' '}
            {resendCooldown > 0 ? (
              <span className="otp-resend-timer">Повторно через {resendCooldown}с</span>
            ) : (
              <button className="otp-resend-btn" type="button" onClick={handleResend}>
                Отправить повторно
              </button>
            )}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

function NewPasswordCard({ email, code, onSuccess }) {
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  const showLengthError = password.length > 0 && password.length < 8;
  const showMatchError = confirm.length > 0 && password !== confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8 || password !== confirm) return;

    setIsLoading(true);
    setErrorMessage('');
    try {
      await authService.resetPassword(email.trim(), code, password);
      onSuccess();
    } catch (err) {
      setErrorMessage(err.message || 'Ошибка. Попробуйте снова.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="motion-rise" onSubmit={handleSubmit}>
      <h2 className="forgot-card__title">Сброс пароля</h2>

      <div className="forgot-field-group">
        <label className="field">
          <span>Новый пароль</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            autoComplete="new-password"
          />
          {showLengthError && (
            <p className="field-error">Минимум 8 символов.</p>
          )}
        </label>

        <label className="field">
          <span>Подтвердите пароль</span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={isLoading}
            autoComplete="new-password"
          />
          {showMatchError && (
            <p className="field-error">Пароли не совпадают.</p>
          )}
        </label>
      </div>

      {errorMessage && <p className="field-error forgot-error">{errorMessage}</p>}

      <button
        className="button button--primary forgot-submit"
        type="submit"
        disabled={isLoading || password.length < 8 || password !== confirm}
      >
        {isLoading ? 'Сохранение...' : 'Подтвердить'}
      </button>
    </form>
  );
}
