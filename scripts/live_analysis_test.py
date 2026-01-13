import requests
import json
import base64

# CONFIG
GITHUB_USER = "mauro3422"
AI_URL = "http://localhost:8000/v1/chat/completions"
MODEL = "lfm2.5"

def get_real_repos():
    print(f"🌍 Fetching repos for {GITHUB_USER}...")
    try:
        resp = requests.get(f"https://api.github.com/users/{GITHUB_USER}/repos")
        if resp.status_code != 200:
            print(f"❌ GitHub API Error: {resp.status_code}")
            return []
        return resp.json()
    except Exception as e:
        print(f"❌ Network Error: {e}")
        return []

def get_real_readme(repo_name):
    print(f"🌍 Fetching README for {repo_name}...")
    try:
        url = f"https://api.github.com/repos/{GITHUB_USER}/{repo_name}/readme"
        resp = requests.get(url)
        if resp.status_code != 200:
            print("   ⚠️ No README found (or private).")
            return None
        
        # Decode Base64
        content = base64.b64decode(resp.json()['content']).decode('utf-8')
        return content
    except Exception as e:
        print(f"❌ Error fetching README: {e}")
        return None

def analyze_with_ai(repo_name, readme_content):
    print(f"\n🧠 Sending {len(readme_content)} chars to Local AI...")
    
    prompt = f"""Eres un Senior Developer Reviewer.
Analiza el siguiente README de un proyecto y dame tu opinión honesta.
1. ¿De qué trata el proyecto?
2. ¿Qué tecnologías usa?
3. ¿Qué le falta o qué mejorarías?

PROYECTO: {repo_name}
README:
{readme_content[:3000]} 
(Truncado para no exceder contexto)
"""

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "You are a helpful Code Analyst."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7
    }

    try:
        resp = requests.post(AI_URL, json=payload, timeout=60)
        if resp.status_code == 200:
            return resp.json()['choices'][0]['message']['content']
        else:
            return f"❌ AI Server Error: {resp.status_code}"
    except Exception as e:
        return f"❌ AI Connection Error: {e}"

def run_live_test():
    print("🚀 INICIANDO TEST EN VIVO (Real Data + Local AI)")
    print("="*60)

    # 1. List Repos
    repos = get_real_repos()
    if not repos: return

    print(f"✅ Found {len(repos)} public repositories.")
    
    # Pick a target (try 'intro-electron' or just the first non-fork)
    target_repo = next((r for r in repos if r['name'] == 'intro-electron'), None)
    if not target_repo:
        target_repo = repos[0] if repos else None
    
    if not target_repo:
        print("❌ No repositories available to analyze.")
        return

    repo_name = target_repo['name']
    print(f"🎯 Target Selected: {repo_name}")

    # 2. Get Readme
    readme = get_real_readme(repo_name)
    if not readme:
        print("❌ Skipping analysis (No content).")
        return

    # 3. Analyze
    print("⏳ Analyzing...")
    analysis = analyze_with_ai(repo_name, readme)

    print("\n📋 INFORME DEL AGENTE:")
    print("-" * 40)
    print(analysis)
    print("-" * 40)

if __name__ == "__main__":
    run_live_test()
