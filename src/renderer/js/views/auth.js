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
            btnLogin.innerText = 'Conectando...';
            const result = await window.githubAPI.login();
            if (result.success) this.onLoginSuccess();
            btnLogin.innerText = 'Iniciar flujo OAuth';
        });

        // Flujo de Continuidad (Click en el card)
        profileCard.addEventListener('click', () => {
            this.onLoginSuccess();
        });

        // Cambiar cuenta
        linkChange.addEventListener('click', (e) => {
            e.preventDefault();
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
