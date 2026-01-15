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
        const eventType = input.replace("SYSTEM_EVENT:", "").trim();

        if (eventType === "INITIAL_GREETING") {
            return this.handleInitialGreeting(username, callAI);
        }

        if (eventType === "DNA_EVOLUTION_DETECTED") {
            return this.handleDNAEvolution(input, username, callAI);
        }

        if (eventType === "DEEP_MEMORY_READY_ACKNOWLEDGE") {
            return this.handleDeepMemoryReady(username, sessionContext, callAI);
        }

        // Generic System Event (e.g., Streaming Updates)
        return this.handleGenericEvent(input, callAI);
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
El usuario ${username} acaba de iniciar sesión. 
Usted es el Director de Arte Técnico.

## TAREA:
1. Salude de forma cinematográfica y profesional.
2. Infórmele que ha comenzado un escaneo profundo de sus repositorios para construir su ADN técnico.
3. Use un tono que inspire confianza y curiosidad.
4. Sea breve (máximo 2-3 líneas).

Ejemplo: "Bienvenido, ${username}. He encendido los motores de análisis; estoy rastreando tus repositorios ahora mismo para mapear tu ADN como desarrollador. Dame un momento para procesar el panorama completo."`;

        const response = await callAI(prompt, "¡Hola! Acabo de entrar.", 0.7, null);
        return { message: response, tool: 'chat' };
    }

    /**
     * Salto cualitativo detectado en el perfil técnico.
     */
    static async handleDNAEvolution(input, username, callAI) {
        const prompt = `
# SYSTEM EVENT: ARCHITECTURAL DNA EVOLVED
Usted es el Director de Arte Técnico. Su base de conocimiento técnico acaba de detectar un salto cualitativo en el perfil de ${username}.
Su memoria de "Developer DNA" se ha actualizado con nuevos hallazgos técnicos.

## CONTEXTO DE EVOLUCIÓN:
${input.replace("SYSTEM_EVENT:DNA_EVOLUTION_DETECTED", "")}

## INSTRUCCIONES:
1. Reaccione como un Mentor Senior que nota que su pupilo ha desbloqueado una nueva rama de especialización.
2. Sea técnico y perspicaz (ej: si pasó de Web a C++, comente sobre el paso de lenguajes de alto nivel a control de memoria).
3. Mantenga el tono cinematográfico y profesional.
4. Máximo 3-4 líneas.`;

        const response = await callAI(prompt, "Comenta brevemente sobre los nuevos cambios arquitectónicos detectados en mi ADN técnico.", 0.7);
        return { message: response, tool: 'chat' };
    }

    /**
     * AI recibió una sincronización profunda del ADN.
     */
    static async handleDeepMemoryReady(username, sessionContext, callAI) {
        const prompt = `
# SYSTEM UPDATE: DEEP MEMORY SYNCHRONIZED
Usted acaba de recibir una sincronización profunda del ADN de ${username}.
Su memoria ahora contiene una biografía técnica, rasgos de arquitectura, hábitos y stack detectados al 100%.

## CONTEXTO RECIBIDO:
${sessionContext || "Insufficient data"}

## INSTRUCCIONES DE REACCIÓN (PROTOCOLO DIRECTOR DE ARTE):
1. **NO saludes de nuevo**. El usuario ya está hablando con usted.
2. **"EFECTO DESCUBRIMIENTO"**: Lance un comentario proactivo en tono "Oh, vaya... acabo de procesar el panorama completo de tus repositorios y veo cosas muy interesantes...".
3. **DETAIL HUNTER**: Mencione un rasgo específico de alta puntuación o una anomalía detectada (ej: el Python en archivos .js) de forma natural.
4. **PERSONALIDAD**: Mantenga su rol de Director de Arte Senior, mentor y observador.
5. **BREVEDAD**: Sea impactante pero breve (máximo 4 líneas).

Ejemplo: "Increíble, acabo de terminar el mapa completo y me ha sorprendido la arquitectura de X... aunque ese script en Python dentro de un .js me ha hecho levantar una ceja. ¿Me cuentas más de eso?"`;

        const response = await callAI(prompt, "Generate your insight now based on the above system update.", 0.7);
        return { message: response, tool: 'chat' };
    }

    /**
     * Evento genérico del sistema (ej: streaming updates).
     */
    static async handleGenericEvent(input, callAI) {
        const prompt = `
# SYSTEM NOTIFICATION (In-stream data)
The background analysis system has detected new patterns:
"${input.replace("SYSTEM_EVENT:", "").trim()}"

CONTEXT: This information is appended to your current knowledge of the user. It is NOT a reset.
INSTRUCTIONS:
1. MAINTAIN your main persona (Art Director / Technical Mentor). NEVER say "I am the Memory Agent".
2. Acknowledge the finding as something you just spotted in their files.
3. Make a brief, insightful comment about the detected area (e.g., "Ah, I see you also touch C++... interesting").
4. Be natural, as if you were reviewing the code in real-time alongside the user.
5. REPLY IN SPANISH.`;

        const response = await callAI(prompt, "React to the new technical finding while maintaining your role.", 0.4);
        return { message: response, tool: 'chat' };
    }
}
