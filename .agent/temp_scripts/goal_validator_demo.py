import sys
import json

def verify_closure_logic(task_list, messages):
    """
    Simulates the Goal-Validator logic.
    - task_list: Check if all items are [x]
    - messages: Check if recent bugs were added to task_list.
    """
    status = "OK"
    missing = []
    
    # Logic: If 'bug' in messages but not in task_list -> status = FAIL
    bug_keywords = ["bug", "error", "fallo", "problema"]
    recent_concerns = [m for m in messages if any(k in m.lower() for k in bug_keywords)]
    
    for concern in recent_concerns:
        # Simplified check: is the concern reflected in task_list?
        if not any(item.lower() in concern.lower() for item in task_list):
            status = "INCOMPLETE"
            missing.append(concern)
            
    return {"status": status, "missing_verification": missing}

if __name__ == "__main__":
    # Mock data for demonstration
    sample_tasks = ["Bifurcate Skills", "Update GEMINI.md", "Implement Memory Logic"]
    sample_messages = ["Found a bug in the sidebar while refactoring"]
    
    # This proves the Goal-Validator would catch an unlisted bug.
    result = verify_closure_logic(sample_tasks, sample_messages)
    print(json.dumps(result, indent=2))
