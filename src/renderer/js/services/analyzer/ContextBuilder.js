/**
 * ContextBuilder - Construye el contexto de sesión para el AI.
 * Extrae la lógica de getFreshContext() del ProfileAnalyzer.
 * 
 * Responsabilidad única: Formatear el contexto técnico del usuario
 * para que la AI pueda acceder a la identidad, evidencias y perfil cognitivo.
 */

export class ContextBuilder {
    /**
     * Construye el contexto de sesión enfocado en el PERFIL DE USUARIO.
     * @param {string} username - Username del usuario
     * @param {object} results - Resultados del análisis
     * @param {object} technicalIdentity - Identidad técnica sintetizada (User Context)
     * @param {object} cognitiveProfile - Perfil cognitivo (opcional)
     * @param {object} curationEvidence - No se usa para el chat directamente (ADN crudo)
     * @param {Function} getSummaryForChat - Función para obtener resúmenes del coordinator
     * @returns {string} Contexto formateado
     */
    static build(username, results, technicalIdentity, cognitiveProfile = null, curationEvidence = null, getSummaryForChat = null) {
        if (!results) return "";

        const langList = (results && results.mainLangs && results.mainLangs.length > 0)
            ? results.mainLangs.join(', ')
            : 'varios lenguajes';

        // IDENTIDAD: Perfil consolidado que recibe el Router
        const identityString = this.formatIdentityString(technicalIdentity);

        if (cognitiveProfile) {
            return this.buildCognitiveContext(username, cognitiveProfile, identityString);
        }

        return this.buildBasicContext(username, langList, results.summary, identityString);
    }

    /**
     * Formatea la IDENTIDAD TÉCNICA (User Context).
     * Este es el "ADN Refinado" que el Sintetizador ha decidido que es persistente.
     */
    static formatIdentityString(technicalIdentity) {
        if (typeof technicalIdentity === 'object' && technicalIdentity !== null) {
            let identityString = `PERFIL TÉCNICO ACTUALIZADO:\n`;
            identityString += `BIOGRAFÍA: ${technicalIdentity.bio}\n`;
            identityString += `VEREDICTO: ${technicalIdentity.verdict}\n`;
            if (Array.isArray(technicalIdentity.traits)) {
                identityString += "RASGOS DE DESARROLLADOR:\n";
                technicalIdentity.traits.forEach(t => {
                    identityString += `- [${t.name}]: ${t.details} (Confianza: ${t.score}%)\n`;
                });
            }
            return identityString;
        }
        return technicalIdentity || "Perfil en construcción...";
    }

    /**
     * Construye el contexto con perfil cognitivo.
     */
    static buildCognitiveContext(username, cognitiveProfile, identityString) {
        const languages = (cognitiveProfile.core_languages || []).join(', ');
        const patterns = (cognitiveProfile.patterns || []).join(', ');

        return `**INSTRUCCIÓN PARA EL ROUTER**: Este es el contexto persistente del usuario. Utilízalo para filtrar intenciones y personalizar el tono. No menciones "hallazgos crudos" a menos que se te solicite memoria técnica.

# 🧠 PERFIL DE USUARIO: ${username}
**TITLE**: ${cognitiveProfile.title || 'Developer'}
**DOMAIN**: ${cognitiveProfile.domain || 'General'}
**LANGUAGES**: ${languages}
**CORE PATTERNS**: ${patterns}

## 🧬 IDENTIDAD SINTETIZADA
${identityString}

---
**FIN DEL CONTEXTO DE INTELIGENCIA**`;
    }

    /**
     * Construye el contexto básico sin perfil cognitivo.
     */
    static buildBasicContext(username, langList, summary, identityString) {
        return `**INSTRUCCIÓN PARA EL ROUTER**: Este es el contexto persistente del usuario. No menciones "hallazgos crudos" a menos que se te solicite memoria técnica.

# 🧠 CONTEXTO DE DESARROLLADOR
**USUARIO**: ${username}
**STACK**: ${langList}

## 📄 IDENTIDAD TÉCNICA
${identityString}

---
**FIN DEL CONTEXTO DE INTELIGENCIA**`;
    }
}
