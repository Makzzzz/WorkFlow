import React from 'react';
import { STORAGE_KEYS, readStorage, writeStorage } from '../utils/storage.js';
import { moveCaretToEnd } from '../utils/helpers.js';

export function AuthPage({ mode, onAuthSuccess }) {
  const isLogin = mode === 'login';

  return (
    <section className="auth-layout motion-rise motion-delay-2">
      <div className="auth-shell motion-rise motion-delay-3">
        <div className="auth-shell__intro">
          <h1>
            Вход и<br />регистрация
          </h1>
        </div>

        <div className="auth-tabs">
          <a className={`auth-tabs__item ${isLogin ? 'is-active' : ''}`} href="#login">
            Вход
          </a>
          <a className={`auth-tabs__item ${!isLogin ? 'is-active' : ''}`} href="#register">
            Регистрация
          </a>
        </div>

        <div className="auth-panel-transition" key={mode}>
          {isLogin ? (
            <LoginCard onAuthSuccess={onAuthSuccess} />
          ) : (
            <RegisterCard onAuthSuccess={onAuthSuccess} />
          )}
        </div>
      </div>
    </section>
  );
}

function LoginCard({ onAuthSuccess }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Заполните email и пароль.');
      return;
    }

    const registeredUser = readStorage(STORAGE_KEYS.registeredUser);

    if (!registeredUser) {
      setErrorMessage('Сначала зарегистрируйте аккаунт.');
      return;
    }

    if (registeredUser.email !== email.trim()) {
      setErrorMessage('Пользователь с таким email не найден.');
      return;
    }

    setErrorMessage('');
    onAuthSuccess(registeredUser);
  };

  return (
    <form className="auth-card auth-card--login" onSubmit={handleSubmit}>
      <h2>Вход в аккаунт</h2>

      <label className="field">
        <span>Email</span>
        <input
          autoComplete="email"
          inputMode="email"
          onChange={(e) => setEmail(e.target.value)}
          onClick={moveCaretToEnd}
          onFocus={moveCaretToEnd}
          type="text"
          value={email}
        />
      </label>

      <label className="field">
        <span>Пароль</span>
        <input
          onChange={(e) => setPassword(e.target.value)}
          onClick={moveCaretToEnd}
          onFocus={moveCaretToEnd}
          type="password"
          value={password}
        />
      </label>

      {errorMessage ? <p className="field-error">{errorMessage}</p> : null}

      <button className="button button--primary auth-submit" type="submit">
        Войти
      </button>
    </form>
  );
}

function RegisterCard({ onAuthSuccess }) {
  const [formData, setFormData] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const hasMinPasswordLength =
    formData.password.length === 0 || formData.password.length >= 8;

  const passwordsMatch =
    formData.confirmPassword.length === 0 ||
    (formData.password === formData.confirmPassword && hasMinPasswordLength);

  const showPasswordLengthError =
    formData.password.length > 0 && formData.password.length < 8;

  const showPasswordError =
    formData.confirmPassword.length > 0 &&
    formData.password !== formData.confirmPassword;

  const handleChange = (field) => (event) => {
    const { value } = event.target;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (
      !formData.firstName.trim() ||
      !formData.lastName.trim() ||
      !formData.email.trim() ||
      formData.password.length < 8 ||
      formData.password !== formData.confirmPassword
    ) {
      return;
    }

    const user = {
      name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
    };

    writeStorage(STORAGE_KEYS.registeredUser, user);
    onAuthSuccess(user);
  };

  return (
    <form className="auth-card auth-card--register" onSubmit={handleSubmit}>
      <h2>Регистрация</h2>

      <label className="field">
        <span>Имя</span>
        <input
          onChange={handleChange('firstName')}
          onClick={moveCaretToEnd}
          onFocus={moveCaretToEnd}
          type="text"
          value={formData.firstName}
        />
      </label>

      <label className="field">
        <span>Фамилия</span>
        <input
          onChange={handleChange('lastName')}
          onClick={moveCaretToEnd}
          onFocus={moveCaretToEnd}
          type="text"
          value={formData.lastName}
        />
      </label>

      <label className="field">
        <span>Email</span>
        <input
          autoComplete="email"
          inputMode="email"
          onChange={handleChange('email')}
          onClick={moveCaretToEnd}
          onFocus={moveCaretToEnd}
          type="text"
          value={formData.email}
        />
      </label>

      <div className="field-grid">
        <label className="field">
          <span>Пароль</span>
          <input
            className={showPasswordLengthError ? 'input-error' : ''}
            onChange={handleChange('password')}
            onClick={moveCaretToEnd}
            onFocus={moveCaretToEnd}
            type="password"
            value={formData.password}
          />
          {showPasswordLengthError && (
            <p className="field-error">Пароль должен содержать минимум 8 символов.</p>
          )}
        </label>

        <label className="field">
          <span>Повтор пароля</span>
          <input
            className={showPasswordError ? 'input-error' : ''}
            onChange={handleChange('confirmPassword')}
            onClick={moveCaretToEnd}
            onFocus={moveCaretToEnd}
            type="password"
            value={formData.confirmPassword}
          />
          {showPasswordError && (
            <p className="field-error">Пароли не совпадают.</p>
          )}
        </label>
      </div>

      <button
        className="button button--primary auth-submit"
        disabled={!passwordsMatch || !hasMinPasswordLength}
        type="submit"
      >
        Зарегистрироваться
      </button>
    </form>
  );
}