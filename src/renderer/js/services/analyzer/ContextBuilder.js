/**
 * ContextBuilder - Construye el contexto de sesión para el AI.
 * Extrae la lógica de getFreshContext() del ProfileAnalyzer.
 * 
 * Responsabilidad única: Formatear el contexto técnico del usuario
 * para que la AI pueda acceder a la identidad, evidencias y perfil cognitivo.
 */

export class ContextBuilder {
    /**
     * Construye el contexto completo de sesión.
     * @param {string} username - Username del usuario
     * @param {object} results - Resultados del análisis
     * @param {object} technicalIdentity - Identidad técnica sintetizada
     * @param {object} cognitiveProfile - Perfil cognitivo (opcional)
     * @param {object} curationEvidence - Mapa de trazabilidad (opcional)
     * @param {Function} getSummaryForChat - Función para obtener resúmenes del coordinator
     * @returns {string} Contexto formateado
     */
    static build(username, results, technicalIdentity, cognitiveProfile = null, curationEvidence = null, getSummaryForChat = null) {
        if (!results) return "";

        const langList = (results.mainLangs && results.mainLangs.length > 0)
            ? results.mainLangs.join(', ')
            : 'varios lenguajes';

        // ATOMS: Quick summaries (Only top priority if no map is available)
        const quickSummaries = !curationEvidence && getSummaryForChat ? getSummaryForChat() : null;

        const identityString = this.formatIdentityString(technicalIdentity);
        const evidenceString = this.formatEvidenceString(curationEvidence);

        if (cognitiveProfile) {
            return this.buildCognitiveContext(username, cognitiveProfile, identityString, evidenceString, quickSummaries);
        }

        return this.buildBasicContext(username, langList, results.summary, identityString);
    }

    /**
     * Formatea la identidad técnica como string.
     */
    static formatIdentityString(technicalIdentity) {
        if (typeof technicalIdentity === 'object' && technicalIdentity !== null) {
            let identityString = `BIOGRAFÍA: ${technicalIdentity.bio}\n`;
            identityString += `VEREDICTO: ${technicalIdentity.verdict}\n`;
            if (Array.isArray(technicalIdentity.traits)) {
                identityString += "RASGOS TÉCNICOS (IDENTIDAD TÉCNICA):\n";
                technicalIdentity.traits.forEach(t => {
                    identityString += `- [${t.name} | Confianza: ${t.score}%]\n`;
                    identityString += `  Detalle: ${t.details}\n`;
                    if (t.evidence) identityString += `  Fuentes Core: ${t.evidence}\n`;
                });
            }
            return identityString;
        }
        return technicalIdentity || "Generando identidad técnica...";
    }

    /**
     * Formatea el mapa de trazabilidad como string.
     */
    static formatEvidenceString(curationEvidence) {
        if (!curationEvidence) return "";

        let evidenceString = "🔍 EVIDENCIAS TÉCNICAS (MAPA DE TRAZABILIDAD):\n";
        Object.entries(curationEvidence).forEach(([strength, refs]) => {
            evidenceString += `### DOMINIO: ${strength}\n`;
            refs.slice(0, 5).forEach(r => {
                evidenceString += `- [${r.repo}/${r.file}]: ${r.summary}\n`;
            });
        });
        return evidenceString;
    }

    /**
     * Construye el contexto con perfil cognitivo.
     */
    static buildCognitiveContext(username, cognitiveProfile, identityString, evidenceString, quickSummaries) {
        return `# 🧠 PERFIL COGNITIVO DEL USUARIO: ${username}
**TITLE**: ${cognitiveProfile.title}
**DOMAIN**: ${cognitiveProfile.domain}
**LANGUAGES**: ${cognitiveProfile.core_languages.join(', ')}
**CORE PATTERNS**: ${cognitiveProfile.patterns.join(', ')}

## 🧬 IDENTIDAD TÉCNICA SINTETIZADA
${identityString}

${evidenceString}

## 🔍 CACHE DE HALLAZGOS TÉCNICOS (WORKER FINDINGS)
${quickSummaries?.slice(0, 500) || "Evidencias curadas en el mapa superior."}...

---
**FIN DEL CONTEXTO DE INTELIGENCIA**`;
    }

    /**
     * Construye el contexto básico sin perfil cognitivo.
     */
    static buildBasicContext(username, langList, summary, identityString) {
        return `# 🧠 MEMORIA PROFUNDA: DIRECTOR DE ARTE
**USUARIO**: ${username}
**STACK DETECTADO**: ${langList}

## 📄 RESUMEN BIOGRÁFICO (CURADO)
${summary || "Sintetizando perfil..."}

## 🧬 IDENTIDAD TÉCNICA (SÍNTESIS MAP-REDUCE 100%)
${identityString}

---
**FIN DEL CONTEXTO DE INTELIGENCIA**`;
    }
}
