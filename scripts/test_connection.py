import requests
import json

def test_lfm25():
    url = "http://localhost:8000/v1/chat/completions"
    headers = {"Content-Type": "application/json"}
    payload = {
        "model": "lfm2.5",
        "messages": [
            {"role": "user", "content": "Hola, ¿quién eres?"}
        ],
        "temperature": 0.7
    }

    print(f"Enviando solicitud a {url}...")
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        if response.status_code == 200:
            print("¡Respuesta recibida!")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Ocurrió un error: {e}")

if __name__ == "__main__":
    test_lfm25()
