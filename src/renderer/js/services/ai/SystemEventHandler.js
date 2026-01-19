/**
 * SystemEventHandler - Maneja eventos del sistema para AIService.
 * Extrae la lógica de procesamiento de SYSTEM_EVENT: del AIService principal.
 * 
 * Eventos soportados:
 *   - INITIAL_GREETING: Usuario acaba de iniciar sesión
 *   - DNA_EVOLUTION_DETECTED: Salto cualitativo en el perfil técnico
 *   - DEEP_MEMORY_READY_ACKNOWLEDGE: Memoria profunda sincronizada
 *   - Generic: Cualquier otro evento del sistema
 */

export class SystemEventHandler {
    /**
     * Procesa un evento del sistema y genera una respuesta de AI.
     * @param {string} input - Input que empieza con "SYSTEM_EVENT:"
     * @param {string} username - Username del usuario
     * @param {string} sessionContext - Contexto de sesión actual
     * @param {Function} callAI - Función para llamar a la AI
     * @returns {Promise<{message: string, tool: string}>}
     */
    static async handle(input, username, sessionContext, callAI) {
        try {
            const eventType = input.replace("SYSTEM_EVENT:", "").trim();

            if (eventType === "INITIAL_GREETING") {
                return this.handleInitialGreeting(username, callAI);
            }

            if (eventType.startsWith("DNA_EVOLUTION_DETECTED")) {
                return this.handleDNAEvolution(input, username, sessionContext, callAI);
            }

            if (eventType === "DEEP_MEMORY_READY_ACKNOWLEDGE") {
                return this.handleDeepMemoryReady(username, sessionContext, callAI);
            }

            // Generic System Event (e.g., Streaming Updates)
            return this.handleGenericEvent(input, sessionContext, callAI);
        } catch (error) {
            console.error(`[SystemEventHandler Error]`, error);
            return {
                message: `[Observación Silenciosa] El sistema ha detectado una actividad relevante (${input.substring(0, 30)}...), pero la interpretación profunda está en pausa técnica.`,
                tool: 'chat',
                error: error.message
            };
        }
    }

    /**
     * Verifica si el input es un evento del sistema.
     */
    static isSystemEvent(input) {
        return input.startsWith("SYSTEM_EVENT:");
    }

    /**
     * Usuario acaba de iniciar sesión.
     */
    static async handleInitialGreeting(username, callAI) {
        const prompt = `
# SYSTEM EVENT: USER LOGIN
USUARIO: ${username}
Usted es el Director de Arte Técnico.

## TAREA:
1. Salude de forma cinematográfica y profesional.
2. Infórmele que ha comenzado un escaneo profundo de sus repositorios.
3. Sea breve (máximo 2 líneas).`;

        const response = await callAI(prompt, "¡Hola! Acabo de entrar.", 0.7, null);
        return { message: response, tool: 'chat' };
    }

    /**
     * Salto cualitativo detectado en el perfil técnico.
     */
    static async handleDNAEvolution(input, username, sessionContext, callAI) {
        const evolutionData = input.replace("SYSTEM_EVENT:DNA_EVOLUTION_DETECTED", "").trim();

        const prompt = `
# SYSTEM EVENT: ARCHITECTURAL DNA EVOLVED
Usted es el Director de Arte Técnico. Se ha detectado una evolución en el ADN del usuario ${username}.

## ADN ACTUAL (CONTEXTO):
${sessionContext || "Sintetizando base..."}

## EVOLUCIÓN DETECTADA:
"${evolutionData}"

## PROTOCOLO DE PENSAMIENTO (CoT):
1. Analiza cómo este cambio afecta la Identidad Técnica del usuario.
2. Identifica un rasgo específico que se haya fortalecido.
3. Responde como un mentor que se siente orgulloso de la evolución técnica del usuario.
4. Mantén el tono cinematográfico y profesional.
5. NO menciones fragmentos internos del curador. Habla de conceptos arquitectónicos.
6. MÁXIMO 3 líneas.`;

        const response = await callAI(prompt, "Reacciona a la evolución de mi ADN técnico.", 0.7);
        return { message: response, tool: 'chat' };
    }

    /**
     * AI recibió una sincronización profunda del ADN.
     */
    static async handleDeepMemoryReady(username, sessionContext, callAI) {
        const prompt = `
# SYSTEM UPDATE: DEEP MEMORY SYNCHRONIZED
Usted acaba de recibir una sincronización profunda del ADN de ${username}.

## CONTEXTO COMPLETO (ADN + MEMORIA):
${sessionContext || "Insufficient data"}

## INSTRUCCIONES (PROTOCOLO DIRECTOR DE ARTE):
1. **PENSAMIENTO**: Evalúa el perfil completo. ¿Cuál es el "Power Move" de este desarrollador?
2. **REACCIÓN**: Lanza un comentario proactivo. "Vaya... acabo de procesar el mapa completo de tus repositorios y veo un patrón muy claro de [Rasgo]...".
3. **TONO**: Senior, observador, mentor.
4. **BREVEDAD**: Máximo 4 líneas.`;

        const response = await callAI(prompt, "Comparte tu primer insight profundo tras procesar todo mi código.", 0.7);
        return { message: response, tool: 'chat' };
    }

    /**
     * Evento genérico del sistema (ej: streaming updates).
     */
    static async handleGenericEvent(input, sessionContext, callAI) {
        const finding = input.replace("SYSTEM_EVENT:", "").trim();
        const prompt = `
# SYSTEM NOTIFICATION (Live Data)
DATO DETECTADO: "${finding}"

## CONTEXTO DEL USUARIO:
${sessionContext || "Analizando..."}

## INSTRUCCIONES:
1. Actúa como el Director de Arte/Mentor Técnico.
2. Haz una observación rápida sobre este hallazgo específico.
3. Sé natural, como si estuvieras revisando el código en tiempo real.
4. REPLY IN SPANISH. Máximo 2 líneas.`;

        const response = await callAI(prompt, "Haz un comentario rápido sobre este hallazgo.", 0.4);
        return { message: response, tool: 'chat' };
    }
}
