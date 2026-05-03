document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('create-group-form');
    const groupNameInput = document.getElementById('groupName');
    const descriptionInput = document.getElementById('description');
    const submitBtn = form.querySelector('.btn-primary');

    // Обработка отправки формы
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const groupName = groupNameInput.value.trim();
        const description = descriptionInput.value.trim();

        // Валидация
        if (!groupName || !description) {
            alert('Пожалуйста, заполните все обязательные поля.');
            return;
        }

        // Блокируем кнопку
        submitBtn.disabled = true;
        submitBtn.textContent = 'Создание...';

        try {
            // Имитация отправки на сервер
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Здесь будет реальный fetch запрос:
            /*
            const response = await fetch('/api/groups', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ groupName, description })
            });

            if (!response.ok) throw new Error('Ошибка создания группы');
            const data = await response.json();
            */

            // Успешное создание — перенаправляем на страницу групп
            window.location.href = '../groups/';

        } catch (error) {
            console.error('Ошибка:', error);
            alert('Не удалось создать группу. Попробуйте ещё раз.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Создать группу';
        }
    });

    // Автоматическая валидация при вводе
    groupNameInput.addEventListener('input', () => {
        if (groupNameInput.value.length > 50) {
            groupNameInput.setCustomValidity('Название не должно превышать 50 символов');
        } else {
            groupNameInput.setCustomValidity('');
        }
    });
});