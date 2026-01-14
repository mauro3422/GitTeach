/**
 * DeepCurator - Motor de Curación Profunda (Map-Reduce) y AI Insights
 * Extraído de ProfileAnalyzer para cumplir SRP
 * UPDATED: Usa Logger centralizado
 */
import { AIService } from './aiService.js';
import { Logger } from '../utils/logger.js';

export class DeepCurator {
    /**
     * Motor de Curación Profunda (Map-Reduce):
     * Toma el 100% de los resúmenes y los reduce a una memoria densa.
     */
    async runDeepCurator(username, coordinator) {
        const allSummariesString = coordinator.getAllSummaries();
        const allSummaries = allSummariesString.split('\n').filter(s => s.trim().length > 0);

        // --- FASE 1: MAPEO TEMÁTICO (En paralelo) ---
        Logger.mapper('Iniciando 3 capas de análisis especializado...');

        const thematicPrompts = {
            architecture: `Eres el ARQUITECTO DE SOFTWARE. Analiza estos 20 archivos y extrae:
                1. Patrones de diseño (DI, Factory, Singleton, etc).
                2. Nivel de cumplimiento de SOLID.
                3. Estructura de carpetas y modularidad.
                Respuesta técnica y concisa.`,

            habits: `Eres el MENTOR DE CÓDIGO. Analiza estos 20 archivos y extrae:
                1. Consistencia en Naming (variables/funciones).
                2. Manejo de errores y casos de borde.
                3. Calidad de comentarios y legibilidad.
                Respuesta técnica y concisa.`,

            stack: `Eres el EXPERTO EN STACK. Analiza estos 20 archivos y extrae:
                1. Uso avanzado de frameworks/librerías.
                2. Optimizaciones de performance y concurrencia.
                3. Manejo de dependencias y APIs externas.
                Respuesta técnica y concisa.`
        };

        const thematicAnalyses = await Promise.all(Object.entries(thematicPrompts).map(async ([key, systemPrompt]) => {
            const shuffled = allSummaries.sort(() => 0.5 - Math.random());
            const batchSample = shuffled.slice(0, 40).join('\n');

            try {
                return await AIService.callAI(`Mapper:${key}`, `${systemPrompt}\n\nARCHIVOS:\n${batchSample}`, 0.1);
            } catch (e) {
                return `Error en mapper ${key}`;
            }
        }));

        // --- FASE 2: REDUCE (Sintetizar ADN del Desarrollador) ---
        Logger.reducer('Sintetizando ADN del Desarrollador (Developer DNA)...');

        const reducePrompt = `ERES EL REDUCTOR DE INTELIGENCIA TÉCNICA. Tienes los resultados de 3 mappers especializados sobre el código de ${username}.
        
        EVIDENCIAS:
        ARQUITECTURA: ${thematicAnalyses[0]}
        HÁBITOS: ${thematicAnalyses[1]}
        STACK & PERFORMANCE: ${thematicAnalyses[2]}
        
        TU MISIÓN: Generar el "DEVELOPER DNA" estruturando los hallazgos de forma REALISTA y TÉCNICA.
        
        REGLAS DE ORO:
        1. NO INVENTES NOMBRES DE PROYECTOS (Ej: No digas "Proyecto X" si no está en el código).
        2. NO USES TÉRMINOS COMO "Máximo" o "Gravity" a menos que sean constantes reales del código.
        3. Mantén un tono profesional y basado 100% en las evidencias de los mappers.
        
        RESPONDE ÚNICAMENTE CON UN JSON VÁLIDO CON ESTE FORMATO:
        {
          "bio": "Resumen narrativo de 3-4 frases que destaca fortalezas únicas.",
          "traits": [
            { "name": "Arquitectura", "score": 0-100, "details": "Breve detalle del patrón detectado" },
            { "name": "Hábitos", "score": 0-100, "details": "Breve detalle sobre calidad/naming" },
            { "name": "Tecnología", "score": 0-100, "details": "Breve detalle sobre stack/performance" }
          ],
          "verdict": "Senior/Mid/Junior + Especialidad"
        }`;

        const rawResponse = await AIService.callAI("Reducer DNA", reducePrompt, 0.1);

        try {
            const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
            const dna = JSON.parse(jsonMatch[0]);
            return dna;
        } catch (e) {
            console.warn("Error parsing DNA JSON, returning raw", e);
            return { bio: rawResponse, traits: [], verdict: "Analizado" };
        }
    }

    /**
     * Genera insights de IA basados en los hallazgos del escaneo
     */
    async getAIInsights(username, langs, codeInsights, hasRealData) {
        let prompt = "";

        const isRateLimited = codeInsights && codeInsights.some(f => f.error === "Rate Limit");

        if (isRateLimited) {
            prompt = `¡NOTICIA IMPORTANTE! El sistema ha alcanzado el Límite de Tasa de GitHub (Rate Limit).
            Explícale al usuario con total honestidad que los Workers han sido bloqueados temporalmente por GitHub.
            Dile que no puedes analizar el código real en este momento para evitar alucinaciones.
            Sugiérele esperar unos minutos o usar un Personal Access Token si está disponible.
            Genera un JSON con este formato:
            { "summary": "Límite de API de GitHub alcanzado temporalmente.", "suggestions": ["github_stats"] }`;
        } else if (!hasRealData) {
            prompt = `¡ATENCIÓN! No he podido acceder al código real de los repositorios de ${username} (Errores de conexión o permisos).
            Dile al usuario de forma honesta que has analizado su lista de repositorios y lenguajes (${langs.join(', ')}), 
            pero que no has podido "bucear" en su código para una auditoría profunda. 
            Pregúntale si tiene el token de GitHub configurado correctamente.
            Genera un JSON con este formato:
            { "summary": "No pude analizar tu código a fondo por falta de acceso.", "suggestions": ["github_stats"] }`;
        } else {
            const structuredFindings = codeInsights.map(f => {
                const files = f.auditedSnippets && f.auditedSnippets !== "Sin Acceso"
                    ? f.auditedSnippets.map(s => `- ${s.file}: ${s.aiSummary || "Analizado"}`).join('\n')
                    : "Archivos analizados sin resumen específico.";
                return `### REPO: ${f.repo}\n${files}`;
            }).join('\n\n');

            prompt = `Eres un CURADOR TÉCNICO DE ÉLITE. Tu meta es transformar el código analizado por los Workers en un PERFIL DE IMPACTO para ${username}.
            
            DATOS CRUDOS POR REPOSITORIO (ESTRICTAMENTE VERACES):
            ${structuredFindings}
            
            INSTRUCCIONES DE CURACIÓN:
            1. **IDENTIDAD TÉCNICA**: Basándote en todos los repositorios, define la esencia del desarrollador.
            2. **EVIDENCIA FORENSE (CRÍTICO)**: NO uses frases vacías. Si dices que sabe Python, cita el archivo donde lo viste.
            3. **DETECTAR PROYECTOS REALES**: Separa lo que es tarea escolar de lo que es un Engine de Juegos real o una librería.

            REGLAS DE FORMATO (JSON ÚNICAMENTE):
            {
              "bio": "Resumen narrativo de 3-4 frases que destaca fortalezas únicas.",
              "traits": [
                { "name": "Arquitectura", "score": 0-100, "details": "Breve detalle del patrón detectado" },
                { "name": "Hábitos", "score": 0-100, "details": "Breve detalle sobre calidad/naming" },
                { "name": "Tecnología", "score": 0-100, "details": "Breve detalle sobre stack/performance" }
              ],
              "key_evidences": [
                 { "file": "path/al/archivo", "snippet": "Fragmento breve del código", "insight": "Por qué esto demuestra skill" }
              ],
              "verdict": "Senior/Mid/Junior + Especialidad"
            }
            
            Responde SIEMPRE en ESPAÑOL y basa tus afirmaciones SOLAMENTE en los datos de los mappers.`;
        }

        try {
            const response = await AIService.callAI("Eres un analista de perfiles GitHub experto.", prompt, 0.3);

            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.warn("[getAIInsights] Sin JSON, usando respuesta como summary.");
                return {
                    summary: response.substring(0, 500),
                    suggestions: ['github_stats']
                };
            }

            const cleanJson = jsonMatch[0];
            const data = JSON.parse(cleanJson);

            const summary = data.summary || data.bio || "Perfil analizado.";
            const suggestions = data.suggestions || ['github_stats', 'skills_grid'];

            return { summary, suggestions };
        } catch (e) {
            console.warn("AI Insight Fallback Error:", e);
            return {
                summary: `Desarrollador enfocado en ${langs[0] || 'software'}.`,
                suggestions: ['github_stats', 'top_langs']
            };
        }
    }

    /**
     * Genera un resumen técnico denso ("Con Chicha") usando la IA local.
     */
    async generateHighFidelitySummary(repo, path, usageSnippet) {
        const systemPrompt = `Eres un ANALISTA TÉCNICO DE ÉLITE.
Tu misión es identificar el PROPÓSITO y la CALIDAD del código analizado para construir un perfil profesional.

OBJETIVOS DE ANÁLISIS:
1. IDENTIFICAR DOMINIO: ¿Qué es esto? (Lógica de Negocio, UI, Script, Configuración, Motor de Juego, Análisis de Datos, etc.).
2. DETECTAR PATRONES: ¿Qué estructuras usa? (Singleton, Factory, Recursividad, Async/Await, Manejo de Errores).
3. EVALUAR COMPLEJIDAD: ¿Es código boilerplate o demuestra ingeniería real?
4. EXTRAER EVIDENCIA: Cita la función o variable clave que demuestra la habilidad.

NO INTERPRETES DE MÁS. Si es un archivo de configuración simple, dilo.
Si es un algoritmo complejo, destácalo.

FORMATO RESPUESTA (Texto plano, 1 línea densa):
[DOMINIO] <Descripción Técnica> | Evidencia: <Fragmento_Clave>`;

        const userPrompt = `Analiza este archivo de ${repo}: ${path}
\`\`\`
${usageSnippet.substring(0, 1000)}
\`\`\`
Dime qué demuestra sobre el desarrollador:`;

        try {
            return await AIService.callAI(systemPrompt, userPrompt, 0.1);
        } catch (e) {
            return `Análisis fallido: ${e.message}`;
        }
    }
}
