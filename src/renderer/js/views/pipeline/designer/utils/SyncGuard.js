/**
 * SyncGuard.js
 *
 * Responsabilidad: Verificar la seguridad del entorno de ejecución (Canvas/DOM)
 * Proporciona un mecanismo de defensa para evitar fallos en entornos de prueba
 */

export class SyncGuard {
    /**
     * Determina si es seguro usar dimensiones visuales en el entorno actual
     */
    static isVisualSafe() {
        try {
            // Verificar si estamos en un entorno de pruebas (como JSDOM)
            if (typeof window === 'undefined') {
                return false;
            }

            // Verificar si estamos en JSDOM (característica común en entornos de prueba)
            if (window.navigator && window.navigator.userAgent &&
                window.navigator.userAgent.includes('jsdom')) {

                // En JSDOM, verificar si canvas está completamente funcional
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    if (!ctx || !ctx.measureText) {
                        return false;
                    }

                    // Probar si podemos medir texto correctamente
                    const testResult = ctx.measureText('test');
                    if (typeof testResult.width === 'undefined' || isNaN(testResult.width)) {
                        return false;
                    }
                } catch (e) {
                    return false;
                }
            }

            // Si llegamos aquí, asumimos que es seguro usar dimensiones visuales
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Valida si un objeto de bounds es válido para uso en cálculos
     */
    static isValidBounds(bounds) {
        if (!bounds) return false;

        return bounds.renderW &&
            bounds.renderH &&
            typeof bounds.renderW === 'number' &&
            !isNaN(bounds.renderW) &&
            isFinite(bounds.renderW) &&
            bounds.renderW > 0;
    }
}