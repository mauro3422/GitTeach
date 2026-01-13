export const AuthView = {
    guestState: null,
    returningState: null,
    onLoginSuccess: null,

    init(onLoginSuccess) {
        this.onLoginSuccess = onLoginSuccess;
        this.guestState = document.getElementById('auth-guest');
        this.returningState = document.getElementById('auth-returning');

        const btnLogin = document.getElementById('btn-login');
        const profileCard = document.getElementById('user-profile-clickable');
        const linkChange = document.getElementById('link-change-account');

        // Flujo Login Normal
        btnLogin.addEventListener('click', async () => {
            console.log("LOGIN CLICKED");
            if (window.githubAPI.logToTerminal) window.githubAPI.logToTerminal("🖱️ CLICK en Botón Login");

            btnLogin.innerText = 'Conectando...';
            try {
                const result = await window.githubAPI.login();
                if (window.githubAPI.logToTerminal) window.githubAPI.logToTerminal("Respuesta Login: " + JSON.stringify(result));

                if (result.success) this.onLoginSuccess();
            } catch (err) {
                console.error(err);
                if (window.githubAPI.logToTerminal) window.githubAPI.logToTerminal("❌ Error en Login: " + err.message);
                alert("Error al intentar abrir el navegador: " + err.message);
            }
            btnLogin.innerText = 'Iniciar flujo OAuth';
        });

        // Flujo de Continuidad (Click en el card o sus hijos)
        profileCard.addEventListener('click', (e) => {
            console.log("CONTINUE SESSION CLICKED");
            if (window.githubAPI.logToTerminal) window.githubAPI.logToTerminal("🖱️ CLICK en Card de Continuidad");

            this.onLoginSuccess();
        });

        // Cambiar cuenta
        linkChange.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("CHANGE ACCOUNT CLICKED");
            this.showGuestState();
        });
    },

    showReturningUser(user) {
        const avatar = document.getElementById('auth-user-avatar');
        const name = document.getElementById('auth-user-name');

        name.innerText = user.name || user.login;
        if (user.avatar_url) {
            avatar.style.backgroundImage = `url(${user.avatar_url})`;
        }

        this.guestState.classList.add('hidden');
        this.returningState.classList.remove('hidden');
    },

    showGuestState() {
        this.guestState.classList.remove('hidden');
        this.returningState.classList.add('hidden');
    }
};
