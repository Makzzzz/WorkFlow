export function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function formatDeadline(iso, includeYear = false) {
  if (!iso) return '';
  const opts = { day: 'numeric', month: 'long' };
  if (includeYear) opts.year = 'numeric';
  return new Date(iso).toLocaleDateString('ru-RU', opts);
}

export function moveCaretToEnd(event) {
  const input = event.currentTarget;
  const length = input.value.length;

  window.requestAnimationFrame(() => {
    input.setSelectionRange(length, length);
  });
}