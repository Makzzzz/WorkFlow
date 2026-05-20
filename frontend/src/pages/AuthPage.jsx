import React from 'react';
import { moveCaretToEnd } from '../utils/helpers.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export function AuthPage({ mode }) {
  console.log('AuthPage mode:', mode);
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
            <LoginCard />
          ) : (
            <RegisterCard />
          )}
        </div>
      </div>
    </section>
  );
}

function LoginCard() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const { login } = useAuth();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Заполните email и пароль.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await login(email, password);
      
      if (!result.success) {
        setErrorMessage(result.error || 'Неверный email или пароль. Проверьте данные и попробуйте снова.');
        return;
      }
      
      // Успешный вход - перенаправление происходит через App.jsx
      // или через защищенные маршруты
      console.log('Login successful:', result.user);
      
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage(
        error.message || 'Неверный email или пароль. Проверьте данные и попробуйте снова.'
      );
    } finally {
      setIsLoading(false);
    }
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
          disabled={isLoading}
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
          disabled={isLoading}
        />
      </label>

      {errorMessage ? <p className="field-error">{errorMessage}</p> : null}

      <button 
        className="button button--primary auth-submit" 
        type="submit"
        disabled={isLoading}
      >
        {isLoading ? 'Вход...' : 'Войти'}
      </button>
    </form>
  );
}

function RegisterCard() {
  const [formData, setFormData] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errorMessage, setErrorMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState('');
  const { register } = useAuth();

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

  const handleSubmit = async (event) => {
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

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const userData = {
        email: formData.email.trim(),
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        password: formData.password
      };

      const result = await register(userData);
      
      if (!result.success) {
        setErrorMessage(result.error || 'Ошибка регистрации. Проверьте данные и попробуйте снова.');
        return;
      }
      
      if (result.requiresEmailConfirmation) {
        setSuccessMessage('Регистрация успешна! Проверьте вашу почту для подтверждения email.');
        // Сбрасываем форму
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          confirmPassword: '',
        });
      } else {
        setSuccessMessage('Регистрация успешна! Вы автоматически вошли в систему.');
        // Успешная регистрация и вход - перенаправление происходит через App.jsx
      }
      
    } catch (error) {
      console.error('Registration error:', error);
      setErrorMessage(
        error.message || 'Ошибка регистрации. Проверьте данные и попробуйте снова.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="auth-card auth-card--register" onSubmit={handleSubmit}>
      <h2>Регистрация</h2>

      {errorMessage && <p className="field-error">{errorMessage}</p>}
      {successMessage && <p className="field-success">{successMessage}</p>}

      <label className="field">
        <span>Имя</span>
        <input
          onChange={handleChange('firstName')}
          onClick={moveCaretToEnd}
          onFocus={moveCaretToEnd}
          type="text"
          value={formData.firstName}
          disabled={isLoading}
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
          disabled={isLoading}
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
          disabled={isLoading}
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
            disabled={isLoading}
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
            disabled={isLoading}
          />
          {showPasswordError && (
            <p className="field-error">Пароли не совпадают.</p>
          )}
        </label>
      </div>

      <button
        className="button button--primary auth-submit"
        disabled={!passwordsMatch || !hasMinPasswordLength || isLoading}
        type="submit"
      >
        {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
      </button>
    </form>
  );
}