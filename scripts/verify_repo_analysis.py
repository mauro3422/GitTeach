import requests
import json

URL = "http://localhost:8000/v1/chat/completions"
MODEL = "lfm2.5"

# --- MOCK DATA ---
MOCK_README = """
# Intro to Electron

Un proyecto simple para aprender Electron JS.
Incluye un sistema de gestión de perfiles de GitHub.

## Características
- Login con GitHub
- Visualización de Repositorios
- Editor de README con IA Local (LFM 2.5)
- Integración con OpenRouter (Opcional)

## Instalación
1. npm install
2. npm start
"""

# --- PROMPTS ---
# (Simplified versions for verification)

def get_router_prompt():
    return """SYSTEM: You are an Intent Classifier. ONLY output JSON.
CATALOG:
- list_repos: List user repositories.
- read_repo: Read README.md. params: repo, owner.
- chat: General chitchat.

EXAMPLES:
User: "Qué repos tengo?"
JSON: {"tool": "list_repos"}

User: "Lee el repo intro-electron"
JSON: {"tool": "read_repo"}

RESPONSE FORMAT:
{"tool": "TOOL_ID"}
"""

def get_constructor_prompt(tool_id):
    if tool_id == 'read_repo':
        return """Eres un Extractor.
VARIABLES:
- repo (nombre del repo)
- owner (usuario, opcional)

EJEMPLO:
Input: "Analiza el proyecto my-app"
JSON: { "action": "read_repo", "toolId": "read_repo", "params": { "repo": "my-app" } }

TU TURNO: Responde SOLO JSON.
"""
    return "TU TURNO: Responde JSON vacío {}"

def get_responder_prompt(tool, result, user_input):
    return f"""Eres un Asistente de Código.
CONTEXTO:
- Usuario: "{user_input}"
- Acción: "{tool}"
- Resultado: "{result}"

INSTRUCCIONES:
1. Analiza el resultado obtenido.
2. Responde al usuario resumiendo lo que encontraste.
3. Sé técnico pero breve.
"""

def verify_analysis_flow():
    print("🔬 TEST: Análisis de Repositorio")
    print("="*60)

    user_input = "Analiza el repositorio intro-electron y dime qué hace"
    print(f"👤 User: '{user_input}'")

    # 1. Router
    print("\n🤖 1. ROUTER...")
    router_resp = requests.post(URL, json={
        "model": MODEL,
        "messages": [{"role": "system", "content": get_router_prompt()}, {"role": "user", "content": user_input}],
        "temperature": 0.0
    }).json()['choices'][0]['message']['content']
    
    print(f"   Output: {router_resp}")
    try:
        tool_id = json.loads(router_resp.replace('```json','').replace('```','').strip())['tool']
    except:
        tool_id = "read_repo" # Fallback for test

    # 2. Constructor
    print("\n🤖 2. CONSTRUCTOR...")
    const_resp = requests.post(URL, json={
        "model": MODEL,
        "messages": [{"role": "system", "content": get_constructor_prompt(tool_id)}, {"role": "user", "content": user_input}],
        "temperature": 0.0
    }).json()['choices'][0]['message']['content']
    print(f"   Output: {const_resp}")

    # 3. Execution (Mocked)
    print("\n⚙️ 3. EJECUCIÓN (Simulada)...")
    print(f"   Fetching GitHub API for 'intro-electron'...")
    # Simulated result from AIToolbox.readRepo
    result = f"Contenido de intro-electron/README.md:\n{MOCK_README}"
    print("   [CONTENIDO RECIBIDO]")

    # 4. Responder
    print("\n🤖 4. RESPONDER (Análisis)...")
    final_resp = requests.post(URL, json={
        "model": MODEL,
        "messages": [{"role": "system", "content": get_responder_prompt(tool_id, result, user_input)}, {"role": "user", "content": user_input}],
        "temperature": 0.7
    }).json()['choices'][0]['message']['content']

    print(f"\n🧠 ANÁLISIS IA:\n{final_resp}")
    print("="*60)

if __name__ == "__main__":
    verify_analysis_flow()
