document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('register-form');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const registerBtn = form.querySelector('.btn-register');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Простая валидация совпадения паролей
        if (password !== confirmPassword) {
            alert('Пароли не совпадают!');
            confirmPasswordInput.focus();
            return;
        }

        // Блокировка кнопки на время "отправки"
        registerBtn.disabled = true;
        registerBtn.textContent = 'Создание аккаунта...';

        try {
            // Имитация задержки сети
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Здесь будет реальный запрос:
            // const res = await fetch('/api/auth/register', { method: 'POST', body: JSON.stringify({...}) });

            // После успешной регистрации перенаправляем на страницу входа
            window.location.href = '../login/';

        } catch (error) {
            console.error('Ошибка регистрации:', error);
            alert('Не удалось зарегистрироваться. Попробуйте снова.');
            registerBtn.disabled = false;
            registerBtn.textContent = 'Зарегистрироваться';
        }
    });
});