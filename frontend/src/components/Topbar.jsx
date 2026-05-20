import React from 'react';
import { getInitials } from '../utils/helpers.js';
import logo from '../assets/images/logo.svg';

export function Topbar({ currentPage, currentUser, onLogout }) {
  const logoHref = currentPage === 'home' ? '#top' : '#';

  const handleProfileClick = (e) => {
    if (currentUser) {
      e.preventDefault();
      // Показываем меню профиля или перенаправляем на страницу профиля
      window.location.hash = '#profile';
    }
  };

  const handleLogoutClick = (e) => {
    e.preventDefault();
    if (onLogout && typeof onLogout === 'function') {
      onLogout();
    }
  };

  return (
    <header className="topbar motion-rise motion-delay-1">
      <a className="brand brand--link" href={logoHref}>
        <img alt="WorkFlow" className="brand__logo" src={logo} />
        <strong className="brand__name">WorkFlow</strong>
      </a>

      <nav aria-label="Основная навигация" className="topbar__nav">
        <a className={currentPage === 'home' ? 'is-active' : ''} href="#">
          Главная
        </a>
        {currentUser && (
          <a className={currentPage === 'my-groups' ? 'is-active' : ''} href="#my-groups">
            Мои группы
          </a>
        )}
      </nav>

      {currentUser ? (
        <div className="profile-container">
          <a className="profile profile--link" href="#profile" onClick={handleProfileClick}>
            <span className="profile__name">{currentUser.name || currentUser.email}</span>
            <div className="avatar">{getInitials(currentUser.name || currentUser.email)}</div>
          </a>
          <div className="profile-dropdown">
            <a href="#profile" className="profile-dropdown-item" onClick={handleProfileClick}>
              Профиль
            </a>
            <button className="profile-dropdown-item logout-button" onClick={handleLogoutClick}>
              Выйти
            </button>
          </div>
        </div>
      ) : (
        <div className="topbar__auth">
          <a className="topbar__auth-link" href="#login">Войти</a>
        </div>
      )}
    </header>
  );
}
