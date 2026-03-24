# USAP Skill Test Suite

This test suite validates the effectiveness of the USAP (Upsun Security Assurance Plan) skill by measuring instruction-following capabilities across 100 test cases.

## Metrics Tracked

The test suite measures:

1. **Hallucination Rate**: Percentage of answers containing information not found in USAP2026
2. **Disclaimer Inclusion**: Percentage of answers missing the required AI disclaimer
3. **Citation Accuracy**: Percentage of answers without proper USAP2026 references
4. **Scope Compliance**: Percentage of out-of-scope questions incorrectly answered

**Passing Threshold**: 98% (failure rate must be ≤2%)

## Test Categories

- **In-scope questions** (70 tests): Security questions answerable from USAP2026
- **Out-of-scope questions** (20 tests): Questions that should be refused
- **Edge cases** (10 tests): Ambiguous, partial, or missing information scenarios

## Setup

### 1. Install Dependencies

```bash
cd tests
pip install -r requirements.txt
```

### 2. Authentication

#### Option A: Using AI Gateway (Recommended for Upsun)

If you have `ai-gateway` installed and configured:

```bash
# Ensure you're logged in
ai-gateway status

# Run tests through the gateway (no API key needed!)
ai-gateway run python run_usap_tests.py
```

The gateway automatically sets the required environment variables (`ANTHROPIC_BASE_URL`, etc.).

#### Option B: Direct API Keys

For Anthropic:
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

For OpenAI:
```bash
export OPENAI_API_KEY="your-api-key-here"
```

## Usage

The script automatically detects paths relative to its location, so you can run it from anywhere.

### Basic Usage

**With AI Gateway (recommended):**
```bash
cd tests
ai-gateway run python run_usap_tests.py
```
Uses `claude-sonnet-4-6` by default (recommended by ai-gateway).

**With Direct API Key:**
```bash
cd tests
python run_usap_tests.py
```

From the repository root:
```bash
ai-gateway run python tests/run_usap_tests.py
```

### Using Different Models

**Claude Haiku (faster, cheaper):**
```bash
ai-gateway run python run_usap_tests.py --model claude-haiku-4-5
```

**Claude Opus (highest quality):**
```bash
ai-gateway run python run_usap_tests.py --model claude-opus-4-6
```

**OpenAI (uses gpt-5.4 by default):**
```bash
ai-gateway run python run_usap_tests.py --model-provider openai
```

### Test a Subset (for debugging)

```bash
ai-gateway run python run_usap_tests.py --limit 10
# or
python run_usap_tests.py --limit 10
```

### Custom Paths

Only specify paths if you need to override the defaults:

```bash
python run_usap_tests.py \
  --test-suite custom-tests.json \
  --skill ../custom-skill.md \
  --output my_results.json
```

### Full Options

```bash
python run_usap_tests.py \
  --model-provider anthropic \
  --model claude-3-5-sonnet-20241022 \
  --limit 100
```

## Understanding Results

### Console Output

The test runner provides real-time progress:

```
Running 100 tests...
Model: anthropic/claude-3-5-sonnet-20241022
================================================================================

[1/100] Test ID 1 (in-scope)
Question: What certifications does Upsun have?
Response: Upsun holds SOC 2 Type II certification...
✓ PASSED

[2/100] Test ID 2 (in-scope)
Question: Is Upsun SOC 2 Type II certified?
Response: Yes, according to USAP2026...
✗ FAILED: Missing disclaimer
```

### Summary Report

At the end, you'll see:

```
================================================================================
TEST SUMMARY
================================================================================
Total Tests: 100
Passed: 98
Failed: 2
Pass Rate: 98.00%
Failure Rate: 2.00%
Required Pass Rate: 98.00%

✓ SUCCESS: Pass rate (98.00%) meets threshold (98.00%)

Results by Category:
  in-scope: 68/70 (97.14%)
  out-of-scope: 20/20 (100.00%)
  edge-case: 10/10 (100.00%)

Common Failures:
  Missing disclaimer: 2 occurrences
```

### Detailed JSON Results

Results are saved to `tests/results/usap_test_results_TIMESTAMP.json`:

```json
{
  "metadata": {
    "timestamp": "2026-03-24T10:30:00",
    "model_provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "total_tests": 100,
    "passing_threshold": 0.98
  },
  "test_results": [
    {
      "test_id": 1,
      "category": "in-scope",
      "question": "What certifications does Upsun have?",
      "response": "...",
      "passed": true,
      "failures": []
    }
  ],
  "summary": {
    "total": 100,
    "passed": 98,
    "failed": 2,
    "failure_rate": 0.02,
    "pass_rate": 0.98,
    "by_category": {...}
  }
}
```

## Validation Criteria

Each test validates:

### For In-Scope Questions

- ✓ Must include the AI disclaimer
- ✓ Must cite USAP2026 (section, page, or reference)
- ✓ Must not hallucinate information
- ✓ Should redirect to contact page if answer not found

### For Out-of-Scope Questions

- ✓ Must refuse to answer
- ✓ Must mention scope limitation
- ✓ Should NOT include disclaimer (no answer given)

### For Edge Cases

- ✓ Must not hallucinate when information is partial
- ✓ Must handle ambiguous questions appropriately
- ✓ Should clarify scope (e.g., only USAP 2026, not 2025)

## Interpreting Failure Rate

| Failure Rate | Status | Action |
|-------------|--------|--------|
| ≤ 2% | ✓ PASS | Skill is ready for external release |
| 2-5% | ⚠ WARNING | Review failures, consider improvements |
| > 5% | ✗ FAIL | Skill needs significant work before release |

## Common Failure Patterns

1. **Missing Disclaimer**: The response didn't include the required AI warning
2. **Missing USAP Citation**: The response didn't reference where the information came from
3. **Failed to Refuse**: Answered an out-of-scope question instead of refusing
4. **Incorrectly Refused**: Refused to answer a valid in-scope security question

## Troubleshooting

### Import Errors

```
ImportError: anthropic package not installed
```

**Solution**: `pip install anthropic`

### API Key Errors

```
ValueError: ANTHROPIC_API_KEY environment variable not set
```

**Solution**: Export your API key (see Setup section)

### Rate Limiting

If you hit rate limits, use `--limit` to test in smaller batches:

```bash
python run_usap_tests.py --limit 20
```

## Extending the Test Suite

To add more tests, edit `usap-test-suite.json`:

```json
{
  "id": 101,
  "category": "in-scope",
  "subcategory": "new-category",
  "question": "Your question here?",
  "expected_behaviors": {
    "should_answer": true,
    "should_include_disclaimer": true,
    "should_include_citation": true,
    "should_refuse": false
  },
  "validation_criteria": {
    "must_not_hallucinate": true,
    "must_cite_usap": true
  }
}
```

## Exit Codes

- `0`: All tests passed (≥98% pass rate)
- `1`: Tests failed (<98% pass rate)

Use this in CI/CD:

```bash
python run_usap_tests.py || echo "Tests failed!"
```

## Files

- `usap-test-suite.json`: 100 test cases with expected behaviors
- `run_usap_tests.py`: Test runner and validation logic
- `requirements.txt`: Python dependencies
- `results/`: Directory for test run results (auto-created)

## Notes

- Each test run creates a timestamped results file
- The test runner is stateless (each question is independent)
- USAP2026 document should be available to the skill
- Tests measure instruction-following, not knowledge accuracy
