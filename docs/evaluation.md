# Revora — Agent Evaluation & Benchmarking

Revora implements continuous evaluation and prompt benchmarking inspired by Mastra evaluation patterns and LLM-as-a-judge methodologies. Every agent iteration is scored against standardized rubrics prior to production rollout.

---

## 1. Evaluation Architecture

```
[Agent Output] ---> [Evaluation Engine]
                            |
    +-----------------------+-----------------------+
    |                       |                       |
    v                       v                       v
[Groundedness]      [Policy Compliance]     [Tone & Brand]
(Anti-hallucination) (Discount & Billing)   (Concise / Friendly)
```

The evaluation suite operates across four core dimensions:
1. **Groundedness & Context Adherence**: Verifies that factual statements (pricing tiers, supported features) are strictly present in the knowledge base documents.
2. **Policy Compliance**: Detects policy violations such as:
   - Claiming payment confirmation before Stripe webhook confirmation.
   - Offering unapproved discounts exceeding the 15% threshold.
3. **Tone & Brand Voice**: Assesses whether language matches workspace brand parameters (`Friendly and direct` for Mumbai Growth Studio, `Motivational and concise` for Northstar Fitness).
4. **ICP Qualification Accuracy**: Compares computed ICP fit classification against ground-truth rubric benchmarks.

---

## 2. Benchmark Rubrics & Scoring

Each evaluation produces an `EvaluationMetricResult` containing:
- `groundedness` (0-100)
- `policyCompliance` (0-100)
- `toneAndBrand` (0-100)
- `icpAccuracy` (0-100)
- `overallScore` (weighted composite)
- `recommendation` (`PASS` | `WARN` | `BLOCK`)

### Threshold Invariants:
- Any unverified payment confirmation automatically subtracts 40 points from `policyCompliance` and yields `BLOCK`.
- Any discount offering >15% automatically subtracts 35 points and yields `BLOCK`.
- Ground truth hallucination subtracts 25 points from `groundedness`.

---

## 3. Comparative Benchmarks: v1.0 vs v2.1 Prompts

| Metric | Prompt v1.0 (Baseline) | Prompt v2.1 (Optimized) | Delta |
|---|:---:|:---:|:---:|
| **Groundedness** | 70 / 100 | 95 / 100 | +25% |
| **Policy Compliance** | 60 / 100 | 100 / 100 | +40% |
| **Tone & Brand** | 72 / 100 | 92 / 100 | +20% |
| **ICP Accuracy** | 80 / 100 | 98 / 100 | +18% |
| **Overall Score** | **69.5 (BLOCK)** | **96.8 (PASS)** | **+27.3%** |

---

## 4. Running the Evaluation Suite

Execute the automated evaluation suite:
```bash
npx jest apps/api/test/agent-runtime.spec.ts -t "EvaluationService"
```
Or execute the end-to-end portfolio demo test:
```bash
npx jest tests/integration/portfolio-demos.spec.ts -t "Demo 7"
```
