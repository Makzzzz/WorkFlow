import React from 'react';
import { getInitials } from '../utils/helpers.js';
import logo from '../assets/images/logo.svg';

export function Topbar({ currentPage, currentUser}) {
  const logoHref = currentPage === 'home' ? '#top' : '#';

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
          <a className={currentPage === 'my-groups' ? 'is-active' : ''} href={"#my-groups"}>
            Мои группы
          </a>
        )}
      </nav>

      {currentUser ? (
        <div className="profile-container">
          <a className="profile profile--link" href={"#profile"}>
            <span className="profile__name">{[currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ') || currentUser.email}</span>
            <div className="avatar">{getInitials([currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ') || currentUser.email)}</div>
          </a>
        </div>
      ) : (
        <div className="topbar__auth">
          <a className="topbar__auth-link" href={"#login"}>Войти</a>
        </div>
      )}
    </header>
  );
}
