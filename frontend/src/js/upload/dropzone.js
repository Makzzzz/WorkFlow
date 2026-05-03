document.addEventListener('DOMContentLoaded', () => {
    const dropzone = document.querySelector('.dropzone-card');
    const fileInput = document.getElementById('file-input');
    const selectBtn = document.getElementById('select-file-btn');
    const submitBtn = document.getElementById('submit-btn');
    const successMsg = document.querySelector('.upload-success');

    let selectedFile = null;

    // Клик по кнопке "Выбрать файл" открывает системный диалог
    selectBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // Обработка выбора файла через диалог
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selectedFile = e.target.files[0];
            updateDropzoneUI(selectedFile.name);
        }
    });

    // Drag & Drop события
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');

        if (e.dataTransfer.files.length > 0) {
            selectedFile = e.dataTransfer.files[0];
            updateDropzoneUI(selectedFile.name);
        }
    });

    // Обновление интерфейса после выбора файла
    function updateDropzoneUI(fileName) {
        selectBtn.textContent = '✓ ' + fileName;
        selectBtn.style.color = '#1ca38b';
        selectBtn.style.backgroundColor = '#e8f7f2';
        submitBtn.disabled = false;
    }

    // Отправка файла (заглушка для демонстрации)
    submitBtn.addEventListener('click', () => {
        if (!selectedFile) {
            alert('Пожалуйста, выберите файл для загрузки.');
            return;
        }

        // Имитация загрузки
        submitBtn.textContent = 'Загрузка...';
        submitBtn.disabled = true;

        setTimeout(() => {
            submitBtn.textContent = 'Отправить';
            submitBtn.disabled = false;
            successMsg.classList.add('show');
            successMsg.textContent = `✅ Файл "${selectedFile.name}" успешно загружен!`;

            // Сброс через 3 секунды
            setTimeout(() => {
                successMsg.classList.remove('show');
                selectBtn.textContent = 'Выбрать файл';
                selectBtn.style.color = '';
                selectBtn.style.backgroundColor = '';
                fileInput.value = '';
                selectedFile = null;
            }, 3000);
        }, 1500);
    });
});