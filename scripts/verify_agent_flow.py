import requests
import json
import time

URL = "http://localhost:8000/v1/chat/completions"
MODEL = "lfm2.5"

# --- PROMPTS (MIMICKING PROMPTBUILDER.JS) ---

def get_router_prompt():
    return """SYSTEM: You are an Intent Classifier. You ONLY output JSON.
Tasks:
1. Analyze the user request.
2. Match it to a tool ID from the catalog.
3. If no match, use "chat".

CATALOG:
- github_stats: Stats, score, performance.
- welcome_header: Welcome banner, header, "hola". params: type, color, text.
- tech_stack: Stack, badges, tools.
- top_langs: Top languages chart.
- contribution_snake: Snake game, animation.

EXAMPLES:
User: "Pon mis estadísticas"
JSON: {"tool": "github_stats"}

User: "Hola"
JSON: {"tool": "chat"}

RESPONSE FORMAT:
{"tool": "TOOL_ID_OR_CHAT"}
"""

def get_constructor_prompt(tool_id):
    # Simplified for LFM 2.5
    return f"""Eres un Extractor de Parámetros experto para la herramienta "{tool_id}".
Tu único trabajo es leer el texto del usuario y sacar los datos para llenar este JSON.

VARIABLES A EXTRAER:
- type (waving, shark, etc)
- color (red, blue, hex)
- text (custom text)

EJEMPLO:
Input: "Pon un banner estilo shark color rojo"
JSON:
{{
  "action": "insert_banner",
  "toolId": "{tool_id}",
  "params": {{
    "type": "shark",
    "color": "red"
  }}
}}

TU TURNO: Responde SOLO con el JSON válido.
"""

def get_responder_prompt(tool_name, result, user_input):
    return f"""Eres el Agente de Comunicación de GitTeach.
Acabamos de ejecutar una acción técnica basada en la petición del usuario.
Tu trabajo es reportar el resultado de forma natural y amigable en ESPAÑOL.

CONTEXTO:
- Petición del Usuario: "{user_input}"
- Herramienta Ejecutada: "{tool_name}"
- Resultado del Sistema: "{result}"
- Estado: ÉXITO ✅

INSTRUCCIONES:
1. Confirma brevemente qué se hizo.
2. NO menciones JSON ni detalles técnicos.
3. Sé conciso.
"""

# --- AGENT FLOW ---

def verify_flow(user_input):
    print(f"\n🧪 TEST: '{user_input}'")
    print("="*60)

    # 1. ROUTER
    print("🤖 1. ROUTER (Clasificación)...")
    router_resp = requests.post(URL, json={
        "model": MODEL,
        "messages": [
            {"role": "system", "content": get_router_prompt()},
            {"role": "user", "content": user_input}
        ],
        "temperature": 0.0
    }).json()['choices'][0]['message']['content']
    
    try:
        router_json = json.loads(router_resp.replace('```json', '').replace('```', '').strip())
        tool_id = router_json.get('tool', 'chat')
        print(f"   ✅ Intent: {tool_id}")
    except:
        print(f"   ❌ Fallo Router: {router_resp}")
        return

    if tool_id == 'chat':
        print("   ⏹️ Fin del flujo (Chat)")
        return

    # 2. CONSTRUCTOR
    print("🤖 2. CONSTRUCTOR (Extracción)...")
    const_resp = requests.post(URL, json={
        "model": MODEL,
        "messages": [
            {"role": "system", "content": get_constructor_prompt(tool_id)},
            {"role": "user", "content": user_input}
        ],
        "temperature": 0.0
    }).json()['choices'][0]['message']['content']

    try:
        const_json = json.loads(const_resp.replace('```json', '').replace('```', '').strip())
        print(f"   ✅ Params: {const_json.get('params')}")
    except:
        print(f"   ❌ Fallo Constructor: {const_resp}")
        return

    # 3. MOCK EXECUTION
    print("⚙️ 3. EJECUCIÓN (Simulada)...")
    mock_result = f"Banner '{tool_id}' insertado correctamente con color {const_json.get('params', {}).get('color', 'auto')}."
    print(f"   ✅ Resultado: {mock_result}")

    # 4. RESPONDER
    print("🤖 4. RESPONDER (Closed Loop)...")
    resp_prompt = get_responder_prompt(tool_id, mock_result, user_input)
    final_resp = requests.post(URL, json={
        "model": MODEL,
        "messages": [
            {"role": "system", "content": resp_prompt},
            {"role": "user", "content": user_input}
        ],
        "temperature": 0.7
    }).json()['choices'][0]['message']['content']

    print(f"\n🗣️ FINAL MESSAGE: \"{final_resp}\"")
    print("="*60)

if __name__ == "__main__":
    verify_flow("Pon un banner estilo shark color azul")
