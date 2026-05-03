document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = form.querySelector('.btn-login');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            alert('Пожалуйста, заполните все поля.');
            return;
        }

        loginBtn.disabled = true;
        loginBtn.textContent = 'Вход...';

        try {
            // Имитация входа
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Здесь будет реальный запрос к API
            /*
            const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });
            */

            // Успешный вход — перенаправление
            window.location.href = '../groups/';

        } catch (error) {
            console.error('Ошибка входа:', error);
            alert('Неверный email или пароль.');
            loginBtn.disabled = false;
            loginBtn.textContent = 'Войти';
        }
    });
});