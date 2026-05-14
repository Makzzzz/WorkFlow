import React from 'react';
import bgWeb from '../assets/images/BG WEB.svg';

// Hero feature cards
import imgGroupsIcon      from '../assets/icons/Hero/1/top.svg';
import imgGroupsGraphic   from '../assets/icons/Hero/1/bot.svg';
import imgPeerIcon        from '../assets/icons/Hero/2/top.svg';
import imgPeerGraphic     from '../assets/icons/Hero/2/bot.svg';
import imgFeedbackIcon    from '../assets/icons/Hero/3/top.svg';
import imgFeedbackGraphic from '../assets/icons/Hero/3/bot.svg';
import imgResultsIcon     from '../assets/icons/Hero/4/top.svg';
import imgResultsGraphic  from '../assets/icons/Hero/4/bot.svg';

// How it works steps
import imgStep1 from '../assets/icons/How it works/group.svg';
import imgStep2 from '../assets/icons/How it works/task.svg';
import imgStep3 from '../assets/icons/How it works/check.svg';

// Why choose benefits
import imgBenefit1 from '../assets/icons/Why choose/economy.svg';
import imgBenefit2 from '../assets/icons/Why choose/feedback.svg';
import imgBenefit3 from '../assets/icons/Why choose/safety.svg';

// CTA
import imgCtaIcon from '../assets/icons/Start work/Group 4.svg';

import imgLogo from '../assets/images/logo.svg';

export function LandingPage() {
  return (
    <div className="landing">
      <div className="landing-main">
        <img alt="" className="landing-bg" src={bgWeb} />

    <section className="landing-hero motion-rise motion-delay-2">
        <div className="landing-hero__copy">
          <h1 className="landing-hero__title">
            Платформа для<br />быстрой и удобной<br />проверки учебных работ
          </h1>
          <p className="landing-hero__subtitle">
            Создавайте группы, загружайте задания,<br />
            собирайте понятную обратную связь<br />
            между студентами и преподавателями.
          </p>
          <a className="landing-hero__cta" href="#create-group">
            Попробовать бесплатно
          </a>
        </div>

        <div className="landing-cards-row motion-rise motion-delay-3">
          <div className="landing-card landing-card--dark">
            <img alt="" className="landing-card__icon" src={imgGroupsIcon} />
            <h3 className="landing-card__title">Группы</h3>
            <p className="landing-card__desc">
              Создавайте учебные группы, добавляйте студентов и управляйте доступами.
            </p>
            <img alt="" className="landing-card__graphic" src={imgGroupsGraphic} />
          </div>

          <div className="landing-card landing-card--blue">
            <img alt="" className="landing-card__icon" src={imgPeerIcon} />
            <h3 className="landing-card__title">Peer review</h3>
            <p className="landing-card__desc">
              Организуйте взаимную проверку работ внутри группы по вашим правилам.
            </p>
            <img alt="" className="landing-card__graphic" src={imgPeerGraphic} />
          </div>

          <div className="landing-card landing-card--white">
            <img alt="" className="landing-card__icon" src={imgFeedbackIcon} />
            <h3 className="landing-card__title">Фидбек</h3>
            <p className="landing-card__desc">
              Получайте обратную связь по критериям и общему комментарию.
            </p>
            <img alt="" className="landing-card__graphic" src={imgFeedbackGraphic} />
          </div>

          <div className="landing-card landing-card--mint">
            <img alt="" className="landing-card__icon" src={imgResultsIcon} />
            <h3 className="landing-card__title">Результаты</h3>
            <p className="landing-card__desc">
              Отслеживайте прогресс и результаты всех работ в одном месте.
            </p>
            <img alt="" className="landing-card__graphic" src={imgResultsGraphic} />
          </div>
        </div>
      </section>

      <section className="landing-steps-section motion-rise motion-delay-3">
        <div className="landing-steps-wrap">
        <h2 className="landing-section-title">Как это работает</h2>
        <div className="landing-steps-row">
          <div className="landing-step-card">
            <span className="landing-step-badge">1</span>
            <div className="landing-step-icon-wrap">
              <img alt="" src={imgStep1} />
            </div>
            <h3>Создайте группу</h3>
            <p>Укажите название и пригласите студентов по ссылке.</p>
          </div>
          <div className="landing-step-connector" />
          <div className="landing-step-card">
            <span className="landing-step-badge">2</span>
            <div className="landing-step-icon-wrap">
              <img alt="" src={imgStep2} />
            </div>
            <h3>Добавьте задание</h3>
            <p>Загрузите задание, опишите критерии и установите дедлайн.</p>
          </div>
          <div className="landing-step-connector" />
          <div className="landing-step-card">
            <span className="landing-step-badge">3</span>
            <div className="landing-step-icon-wrap">
              <img alt="" src={imgStep3} />
            </div>
            <h3>Проверка работ</h3>
            <p>Проверяйте работы сами или запускайте peer review внутри группы.</p>
          </div>
        </div>
        </div>
      </section>

      <section className="landing-why-section motion-rise motion-delay-4">
        <div className="landing-benefits-wrap">
        <h2 className="landing-section-title">Почему выбирают WorkFlow</h2>
        <div className="landing-benefits-row">
          <div className="landing-benefit-card">
            <div className="landing-benefit-icon">
              <img alt="" src={imgBenefit1} />
            </div>
            <h3>Экономия времени</h3>
            <p>Автоматизация распределения работ и сбора отзывов сокращает рутинные задачи.</p>
          </div>
          <div className="landing-benefit-card">
            <div className="landing-benefit-icon">
              <img alt="" src={imgBenefit2} />
            </div>
            <h3>Качественный фидбек</h3>
            <p>Структурированные критерии помогают давать более полезные и объективные комментарии.</p>
          </div>
          <div className="landing-benefit-card">
            <div className="landing-benefit-icon">
              <img alt="" src={imgBenefit3} />
            </div>
            <h3>Безопасность данных</h3>
            <p>Ваши данные и работы студентов надежно защищены и доступны только участникам.</p>
          </div>
        </div>
        </div>

        <div className="landing-cta-card">
          <div className="landing-cta-card__copy">
            <h2>Начните работу уже сегодня</h2>
            <p>Минимум настроек, понятный интерфейс и быстрый старт для курса или семинара.</p>
            <ul className="landing-cta-checklist">
              <li>Бесплатный доступ</li>
              <li>Без ограничений по времени</li>
              <li>Поддержка на русском языке</li>
            </ul>
            <a className="landing-cta-btn" href="#create-group">
              Создать первую группу
            </a>
          </div>
          <div className="landing-cta-card__visual">
            <img alt="Интерфейс приложения" className="landing-cta-card__mockup" src={imgCtaIcon} />
          </div>
        </div>
      </section>

      </div>{/* /landing-main */}

      <footer className="landing-footer">
        <div className="landing-footer__brand">
          <img alt="WorkFlow" className="landing-footer__logo" src={imgLogo} />
          <span className="landing-footer__brand-name">WorkFlow</span>
        </div>
        <span className="landing-footer__copy">© 2026 WorkFlow. Все права защищены.</span>
      </footer>
    </div>
  );
}