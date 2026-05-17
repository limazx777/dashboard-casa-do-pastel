if (sessionStorage.getItem('token')) {
    window.location.href = 'index.html';
}

document.getElementById('loginForm').addEventListener('submit', (event) => {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');

    errorDiv.textContent = '';

    if (username === 'casadopastel' && password === 'casadopastel2026') {
        sessionStorage.setItem('token', 'acesso-local-autorizado');
        sessionStorage.setItem('role', 'admin');
        window.location.href = 'index.html';
        return;
    }

    errorDiv.textContent = 'Usuario ou senha incorretos';
});
