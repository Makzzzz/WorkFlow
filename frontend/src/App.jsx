import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { Topbar } from './components/Topbar.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { AuthPage } from './pages/AuthPage.jsx';
import { CreateGroupPage } from './pages/CreateGroupPage.jsx';
import { MyGroupsPage } from './pages/MyGroupsPage.jsx';
import { GroupOrganizerPage } from './pages/GroupOrganizerPage.jsx';
import { CreateTaskPage } from './pages/CreateTaskPage.jsx';
import { TaskPage } from './pages/TaskPage.jsx';
import { ReviewPage } from './pages/ReviewPage.jsx';
import { UploadWorkPage } from './pages/UploadWorkPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage.jsx';
import { initializeAuth } from './utils/auth-session.js';

function getPageFromHash() {
  const hash = window.location.hash;
  
  // Извлекаем часть до '?' (параметры)
  const baseHash = hash.split('?')[0];
  
  if (baseHash === '#profile') return 'profile';
  if (baseHash === '#login') return 'login';
  if (baseHash === '#register') return 'register';
  if (baseHash === '#forgot-password') return 'forgot-password';
  if (baseHash === '#create-group') return 'create-group';
  if (baseHash === '#my-groups') return 'my-groups';
  if (baseHash === '#group') return 'group';
  if (baseHash === '#create-task') return 'create-task';
  if (baseHash === '#task') return 'task';
  if (baseHash === '#review') return 'review';
  if (baseHash === '#upload-work') return 'upload-work';
  return 'home';
}

function AppContent() {
  const [page, setPage] = React.useState(getPageFromHash);
  const { user, isLoading, logout, updateUser } = useAuth();

  React.useEffect(() => {
    initializeAuth();
  }, []);

  React.useEffect(() => {
    const handleHashChange = () => setPage(getPageFromHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const isAuthPage = page === 'login' || page === 'register' || page === 'forgot-password';

  // Защита маршрутов
  React.useEffect(() => {
    if (isLoading) return; // Ждем загрузки аутентификации
    
    const isProtected = !['home', 'login', 'register', 'forgot-password'].includes(page);
    
    if (isProtected && !user) {
      window.location.hash = '#login';
    }

    if (user && isAuthPage) {
      window.location.hash = '';
    }
  }, [page, user, isLoading, isAuthPage]);

  const handleProfileSave = React.useCallback((updatedUser) => {
    return updateUser(updatedUser);
  }, [updateUser]);

  const handleLogout = React.useCallback(() => {
    logout();
    window.location.hash = '';
  }, [logout]);

  if (isLoading) {
    return (
      <div className="app-shell">
        <main className="page-shell">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Загрузка...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main
        className={`page-shell motion-page ${isAuthPage ? 'page-shell--auth' : ''}`}
        id="top"
      >
        <Topbar currentPage={page} currentUser={user} onLogout={handleLogout} />

        {page === 'home' ? (
          <LandingPage />
        ) : page === 'login' || page === 'register' ? (
          <AuthPage mode={page} />
        ) : page === 'forgot-password' ? (
          <ForgotPasswordPage />
        ) : page === 'my-groups' ? (
          <MyGroupsPage />
        ) : page === 'group' ? (
          <GroupOrganizerPage currentUser={user} />
        ) : page === 'upload-work' ? (
          <UploadWorkPage />
        ) : page === 'review' ? (
          <ReviewPage />
        ) : page === 'task' ? (
          <TaskPage currentUser={user} />
        ) : page === 'create-task' ? (
          <CreateTaskPage />
        ) : page === 'create-group' ? (
          <CreateGroupPage currentUser={user} />
        ) : page === 'profile' ? (
          <ProfilePage
            currentUser={user}
            onLogout={handleLogout}
            onSave={handleProfileSave}
          />
        ) : (
          <LandingPage />
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;