import requests
import json
import time
import os

# Configuración del Servidor Local
URL = "http://localhost:8000/v1/chat/completions"
PROMPT_FILE = "scripts/current_prompt.json"

# Escenarios de prueba: Variaciones Semánticas NO VISTAS en los ejemplos
SCENARIOS = [
    # Variations for 'welcome_header' (Examples were: "Pon un banner", "Quiero un header", "Cabecera animada")
    "Pon un título gigante que salude a mis visitantes", 
    "Necesito una portada animada con mi nombre",
    
    # Variations for 'contribution_snake' (Examples were: "Pon el juego", "Quiero la snake", "Animación")
    "Quiero ver a la víbora comiendo mis commits",
    "Pon esa cosa que se mueve por el calendario de verde",

    # Variations for 'github_stats' (Examples were: "Pon mis estadísticas", "Quiero ver mis stats")
    "Muéstrame qué tan activo he sido con una tarjeta de datos",
    "Analiza mi rendimiento y ponlo en el readme",

    # Variations for 'top_langs'
    "Un pastel visual con mis tecnologías favoritas",

    # Unknown / Chat Intents
    "Crea un archivo LICENSE.md automático", # Tech related but no tool
    "Dime un chiste sobre Java",
    "¿Puedes optimizar mi código?"
]

def get_live_prompt():
    """Lee el prompt exportado dinámicamente por la App para no hardcodear nada."""
    if not os.path.exists(PROMPT_FILE):
        print(f"⚠️ {PROMPT_FILE} no encontrado. Asegúrate de que la App esté ejecutándose y haya procesado al menos un mensaje.")
        return None
    
    with open(PROMPT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
        return data.get("systemPrompt")

def run_stress_test():
    print(f"🚀 Iniciando Stress Test dinámico (Sincronizado con App)")
    print("-" * 60)
    
    system_prompt = get_live_prompt()
    if not system_prompt:
        # Fallback si no hay archivo, pero avisamos
        print("❌ Abortando: No hay prompt dinámico disponible.")
        return

    results = []

    for i, user_input in enumerate(SCENARIOS, 1):
        print(f"[{i}/{len(SCENARIOS)}] User: '{user_input}'")
        
        payload = {
            "model": "lfm2.5",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_input}
            ],
            "temperature": 0.0 # Precisión máxima
        }

        try:
            start_time = time.time()
            response = requests.post(URL, json=payload, timeout=30)
            elapsed = time.time() - start_time
            
            if response.status_code == 200:
                raw_content = response.json()['choices'][0]['message']['content']
                
                try:
                    clean_json = raw_content.replace('```json', '').replace('```', '').strip()
                    parsed = json.loads(clean_json)
                    status = "✅ OK"
                    details = f"Action: {parsed.get('action')}, Tool: {parsed.get('toolId')}"
                except Exception:
                    status = "❌ JSON FAIL"
                    details = f"Raw: {raw_content[:40]}..."
                    parsed = raw_content

                print(f"   Status: {status} | {elapsed:.2f}s")
                print(f"   Log: {details}")
                
            else:
                print(f"   ❌ Error Server: {response.status_code}")
                parsed = "FAILED"

        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            parsed = "ERROR"

        results.append({
            "input": user_input,
            "response": parsed
        })
        print("-" * 40)

    # Guardar reporte
    with open("scripts/audit_lfm25_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=4, ensure_ascii=False)
    print("\n📊 Test finalizado. Audit en scripts/audit_lfm25_results.json")

if __name__ == "__main__":
    run_stress_test()
