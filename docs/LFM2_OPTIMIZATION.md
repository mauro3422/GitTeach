# LFM2 Optimization & Prompt Engineering Guide 🧬

**Version:** 1.1 (Liquid Era - Forensic Update)
**Target Model:** Liquid Foundation Models 2.5 (LFM-1.2B / LFM-3B)

## 1. Understanding the Engine: LFM2 vs. Transformers
Unlike traditional GPT-style Transformers, **LFM2 (Liquid Foundation Models)** uses a hybrid architecture combining attention with **adaptive linear operators**.

### Key Characteristics "Edge-First"
- **Low Memory Footprint:** Optimized for local execution (Consumer GPUs/CPU).
- **Recurrent State:** Maintains structure better in long contexts (preventing "lost brackets" in JSON).
- **High Speed:** Extremely fast inference, ideal for real-time agents.

---

## 2. Engineering Best Practices

### A. Specialization > Generalization
LFM2 is a **specialist tool**, not a generalist encylopedia.
- **DO:** Use for RAG, extraction, summarization, and structured data tasks.
- **DON'T:** Use for "write me a novel" or complex zero-shot programming without context.

### B. The "Cage" Strategy (Context Isolation)
To prevent hallucinations where the model confuses context with target content:
```xml
<project_context>
  <!-- Background info only. NEVER describe this as current. -->
</project_context>

<target_file>
  <!-- The ONLY thing to analyze. -->
</target_file>
```
*Implementation in `AIWorkerPool.js`.*

### C. Cognitive Vaccines (Anti-Hallucination)
Explicitly negate common semantic traps in the **System Prompt**:
- `"Godot is NOT Go"` (Disambiguation)
- `"Config != Skill"` (Value judgment correction)
- `"Markdown describes, DOES NOT implement"` (Ontological correction)

---

## 3. High-Fidelity JSON Generation (Grammar Constraints)

The "Extract" capability of LFM2 is its strongest suit. We leverage **Grammar-Constrained Generation** to ensure 100% syntactical correctness.

### Strategy: `temperature: 0.0` + `json_schema`
In `AIService.js`, when temperature is set to 0, we verify:

```javascript
response_format: { 
    type: "json_object",
    schema: {
        type: "object",
        properties: {
            tool: { type: "string" },
            params: { type: "object" }
        },
        required: ["tool", "params"]
    }
}
```
**Why?** This forces the inference engine (llama.cpp level) to reject any token that would violate the JSON grammar. It makes syntax errors **mathematically impossible**.

### JSON-First Worker Prompts
Instead of asking for natural language summaries, request structured data:
```json
// STRICT RESPONSE FORMAT
{
    "tool": "analysis",
    "params": {
        "insight": "Technical observation...",
        "impact": "Architecture..."
    }
}
```
*This output is then parsed and formatted for the UI by the `AIWorkerPool` adapter.*

---

## 4. Summary of Improvements
| Feature | Old Approach | LFM2 Optimized |
| :--- | :--- | :--- |
| **Output Format** | Plain Text / Markdown | Strict JSON Schema |
| **Context** | Single block of text | XML-fenced Zones |
| **Parsing** | Regex (Fragile) | `JSON.parse` (Safe) |
| **Fidelity** | Hallucinations (Go/Godot) | Cognitive Vaccines |

---

## 5. Evidence-First Prompting (Anti-Echo)

**Problem**: When using few-shot examples, LFM2 (1.2B) tends to **copy example outputs** instead of analyzing the actual input code. This causes "echo pollution" where unrelated files get classified with example function names.

### Solution: Step-Based Extraction

Force the model to extract evidence BEFORE classification:

```
STEP 1: Extract the most important function/class/variable from the code.
STEP 2: Based on that evidence, classify the domain.

OUTPUT FORMAT:
[DOMAIN] Description | Evidence: <paste_actual_code_fragment>

IMPORTANT:
- Evidence MUST be copied from the actual code shown below.
- Never invent function names.
```

### Why it works
- The step-by-step process creates a "cognitive checkpoint"
- Model cannot classify without first reading the code
- No examples to copy = no echo pollution

---

## 6. LFM2-1.2B Model Specifications

### Capabilities ✅
| Capability | Details |
|------------|---------|
| **Parameters** | 1.17 billion (Instrust v2.5) |
| **Context Window** | 32,768 tokens (optimized for long-context RAG) |
| **Architecture** | **Hybrid Liquid-Transformer**: 10 double-gated LIV convolution blocks + 6 Grouped Query Attention (GQA) layers. |
| **Speed** | Extremely fast generation (16s for 3k chars). Low latency on Edge devices. |
| **Languages** | EN, ES, ZH, DE, AR, JA, KO, FR |
| **Best Tasks** | RAG, extraction, summarization, structured JSON |
| **Memory** | <2GB (int4 quantized) |

### Limitations ⚠️
| Limitation | Mitigation |
|------------|------------|
| Small parameter count | Avoid complex deductive reasoning. Use "Step-by-Step" prompting. |
| Tendency to copy few-shot examples | Use Evidence-First prompting (Step-Based) |
| **Compute Bound** on Prefill | High latency on large prompts if not batched correctly (See Section 7). |

---

## 7. Hardware Parallelism & Continuous Batching 🚀

**CRITICAL PERFORMANCE NOTE:**

When running multiple AI workers (e.g., Worker 1, 2, 3) against a single GPU server, you MUST distinguish between "Software Slots" and "Hardware Execution".

### The "Queueing" Problem
Using `--parallel 4` alone reserves memory for 4 users but does **NOT** guarantee parallel execution.
- **Without `-cb`**: The GPU processes Request A fully, then Request B.
- **Symptom**: Workers report high latency (e.g., 82s) despite the model being fast (16s). The extra time is "Queue Wait Time".

### The Solution: Continuous Batching (`-cb`)
The `-cb` flag enables **Continuous Batching**, allowing the server to dynamically interleave tokens from multiple requests.
- **With `-cb`**: Request A and Request B define tokens simultaneously.
- **Result**: Throughput increases dramatically. Worker wait times drop to near zero.

### Recommended Launch Command (GPU)
```batch
server\llama-server.exe --model "%MODEL_PATH%" ^
    --port 8000 ^
    --host 0.0.0.0 ^
    --n-gpu-layers 999 ^
    --ctx-size 81920 ^
    --parallel 4 ^
    -cb ^                  <-- CRITICAL FOR PARALLELISM
    --chat-template chatml
```

### The "Quality First" Concurrency Strategy
For "Deep Forensics" on LFM 2.5 (1.2B), we prioritize **Parallel Workers** over **Batch Size**.

| Strategy | Config | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **High Batching** | `parallel 1`, `batchSize 5` | Fewer HTTP requests | **Lower Quality** (Context dilution), Slow feedback loop |
| **High Concurrency** | `parallel 4`, `batchSize 1` | **Maximum Quality** (Dedicated context), 2x Throughput | Requires `-cb` flag |

**Recommendation:**
Keep `batchSize = 1` in `AIWorkerPool.js` and let the GPU's **Continuous Batching** handle the parallelism. This gives you the speed of batching with the precision of single-file analysis.
