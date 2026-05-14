import React from 'react';
import { STORAGE_KEYS, readStorage, writeStorage } from './utils/storage.js';
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

function getPageFromHash() {
  if (window.location.hash === '#profile') return 'profile';
  if (window.location.hash === '#login') return 'login';
  if (window.location.hash === '#register') return 'register';
  if (window.location.hash === '#create-group') return 'create-group';
  if (window.location.hash === '#my-groups') return 'my-groups';
  if (window.location.hash === '#group') return 'group';
  if (window.location.hash === '#create-task') return 'create-task';
  if (window.location.hash === '#task') return 'task';
  if (window.location.hash === '#review') return 'review';
  if (window.location.hash === '#upload-work') return 'upload-work';
  return 'home';
}

function App() {
  const [page, setPage] = React.useState(getPageFromHash);
  const [currentUser, setCurrentUser] = React.useState(() =>
    readStorage(STORAGE_KEYS.currentUser),
  );
  const getGroupRole = React.useCallback(() => {
    const groupId = readStorage(STORAGE_KEYS.selectedGroupId);
    const groups = readStorage(STORAGE_KEYS.groups) ?? [];
    const group = groups.find((g) => g.id === groupId);
    if (!group || !currentUser) return 'organizer';
    return group.creatorEmail === currentUser.email ? 'organizer' : 'participant';
  }, [currentUser]);

  React.useEffect(() => {
    const handleHashChange = () => setPage(getPageFromHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const isAuthPage = page === 'login' || page === 'register';

  const handleAuthSuccess = React.useCallback((user) => {
    setCurrentUser(user);
    writeStorage(STORAGE_KEYS.currentUser, user);
    window.location.hash = '';
    setPage('home');
  }, []);

  const handleProfileSave = React.useCallback((user) => {
    setCurrentUser(user);
    writeStorage(STORAGE_KEYS.currentUser, user);
    writeStorage(STORAGE_KEYS.registeredUser, user);
  }, []);

  const handleLogout = React.useCallback(() => {
    setCurrentUser(null);
    window.localStorage.removeItem(STORAGE_KEYS.currentUser);
    window.location.hash = '';
    setPage('home');
  }, []);

  const isProtected = !['home', 'login', 'register'].includes(page);
  if (isProtected && !currentUser) {
    window.location.hash = '#login';
  }

  return (
    <div className="app-shell">
      <main
        className={`page-shell motion-page ${isAuthPage ? 'page-shell--auth' : ''}`}
        id="top"
      >
        <Topbar currentPage={page} currentUser={currentUser} />

        {page === 'home' ? (
          <LandingPage />
        ) : !currentUser ? (
          <AuthPage mode="login" onAuthSuccess={handleAuthSuccess} />
        ) : page === 'my-groups' ? (
          <MyGroupsPage />
        ) : page === 'group' ? (
          <GroupOrganizerPage currentUser={currentUser} role={getGroupRole()} />
        ) : page === 'upload-work' ? (
          <UploadWorkPage />
        ) : page === 'review' ? (
          <ReviewPage />
        ) : page === 'task' ? (
          <TaskPage currentUser={currentUser} role={getGroupRole()} />
        ) : page === 'create-task' ? (
          <CreateTaskPage />
        ) : page === 'create-group' ? (
          <CreateGroupPage currentUser={currentUser} />
        ) : page === 'profile' ? (
          <ProfilePage
            currentUser={currentUser}
            onLogout={handleLogout}
            onSave={handleProfileSave}
          />
        ) : (
          <AuthPage mode={page} onAuthSuccess={handleAuthSuccess} />
        )}
      </main>
    </div>
  );
}

export default App;