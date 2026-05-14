export const STORAGE_KEYS = {
  currentUser: 'workflow.currentUser',
  registeredUser: 'workflow.registeredUser',
  groups: 'workflow.groups',
  selectedGroupId: 'workflow.selectedGroupId',
  tasks: 'workflow.tasks',
  selectedTaskId: 'workflow.selectedTaskId',
  selectedMemberId: 'workflow.selectedMemberId',
  reviews: 'workflow.reviews',
  submissions: 'workflow.submissions',
  members: 'workflow.members',
};

export function readStorage(key) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return null;
  }
}