// src/renderer/js/views/dashboard.js
export const DashboardView = {
    currentReadmeSha: null,
    currentUsername: null,

    async updateUserInfo() {
        const userName = document.getElementById('user-name');
        const userAvatar = document.getElementById('user-avatar');
        const repoCountValue = document.getElementById('repo-count');
        const editor = document.getElementById('readme-editor');

        const user = await window.githubAPI.getUserData();
        if (user && !user.error) {
            this.currentUsername = user.login;
            if (userName) {
                userName.innerText = user.name || user.login;
                userName.dataset.login = user.login; // Guardamos el login real
            }
            if (user.avatar_url && userAvatar) {
                userAvatar.style.backgroundImage = `url(${user.avatar_url})`;
            }

            // Cargamos cantidad real de repositorios
            const repos = await window.githubAPI.listRepos();
            if (Array.isArray(repos) && repoCountValue) {
                repoCountValue.innerText = repos.length;
            }

            // CARGA REAL DEL README
            await this.loadReadme();
        }
    },

    async loadReadme() {
        const editor = document.getElementById('readme-editor');
        if (!this.currentUsername || !editor) return;

        editor.placeholder = "⌛ Obteniendo README desde GitHub...";
        const readmeData = await window.githubAPI.getProfileReadme(this.currentUsername);

        if (readmeData && readmeData.content) {
            this.currentReadmeSha = readmeData.sha;
            // GitHub devuelve el contenido en base64
            const content = atob(readmeData.content.replace(/\n/g, ''));
            editor.value = content;
        } else {
            editor.value = "# No se encontró README de perfil.\n\nHe detectado que aún no tienes activado tu perfil dinámico en GitHub. ¡Esto es vital para que la IA y tú trabajéis juntos!";
            this.currentReadmeSha = null;

            // Inyectar un botón de ayuda si no existe
            this.showCreateProfileCTA();
        }
    },

    showCreateProfileCTA() {
        if (document.getElementById('cta-create-profile')) return;

        const editor = document.getElementById('readme-editor');
        const container = editor?.parentElement;
        if (!container) return;

        const cta = document.createElement('div');
        cta.id = 'cta-create-profile';
        cta.className = 'cta-container';
        cta.innerHTML = `
            <p class="cta-text">🚀 <b>¡Casi listo!</b> GitHub necesita que crees un repositorio especial con tu nombre.</p>
            <button id="btn-create-profile-now" class="github-btn" style="width: auto;">Crear Perfil</button>
        `;

        container.appendChild(cta);
        this.setupCTAListener(cta);
    },

    setupCTAListener(ctaElement) {
        const btn = document.getElementById('btn-create-profile-now');
        btn?.addEventListener('click', async () => {
            btn.innerText = "⏳ Creando en GitHub...";
            const result = await window.githubAPI.createProfileRepo(this.currentUsername);

            if (result && !result.error) {
                ctaElement.remove();
                await this.loadReadme();
            } else {
                alert("Error al crear el perfil: " + (result?.error || "Desconocido"));
                btn.innerText = "Reintentar crear";
            }
        });
    },

    init() {
        const btnSync = document.getElementById('btn-sync');
        const btnSave = document.getElementById('btn-save');
        const editor = document.getElementById('readme-editor');
        const preview = document.getElementById('preview-container');
        const editorContainer = document.getElementById('editor-container');

        if (btnSync) {
            btnSync.addEventListener('click', async () => {
                const originalText = btnSync.innerText;
                btnSync.innerText = "⏳ Sincronizando...";
                await this.loadReadme();

                // Disparar evento de input para que el preview se actualice automáticamente
                editor.dispatchEvent(new Event('input'));

                btnSync.innerText = originalText;
            });
        }

        if (btnSave) {
            btnSave.addEventListener('click', async () => {
                if (!this.currentUsername || !editor.value) return;

                const originalText = btnSave.innerText;
                btnSave.innerText = "📤 Publicando...";

                const result = await window.githubAPI.updateProfileReadme(
                    this.currentUsername,
                    editor.value,
                    this.currentReadmeSha
                );

                if (result && !result.error) {
                    this.currentReadmeSha = result.content.sha; // Actualizar SHA para siguientes ediciones
                    btnSave.innerText = "✅ ¡Publicado!";
                    setTimeout(() => btnSave.innerText = originalText, 2000);
                } else {
                    console.error("Error al publicar:", result?.error);
                    btnSave.innerText = "❌ Error";
                    setTimeout(() => btnSave.innerText = originalText, 2000);
                    alert("Error al publicar cambios. Verifica tu conexión o permisos.");
                }
            });
        }

        console.log('[DashboardView] Inicializado correctamente.');
    }
};
