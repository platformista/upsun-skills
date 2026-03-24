#!/usr/bin/env python3
"""
USAP Skill Test Runner

This script runs a comprehensive test suite against the USAP skill to measure:
- Hallucination rate
- Disclaimer inclusion rate
- Citation accuracy
- Scope compliance (refusing out-of-scope questions)

Usage:
    python run_usap_tests.py --model-provider anthropic --model claude-3-5-sonnet-20241022
    python run_usap_tests.py --model-provider openai --model gpt-4
"""

import json
import argparse
import os
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime
import re

try:
    from anthropic import Anthropic
except ImportError:
    Anthropic = None

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None


class USAPTestRunner:
    """Test runner for USAP skill validation."""

    def __init__(self, test_suite_path: str, usap_skill_path: str, model_provider: str = "anthropic", model: str = "claude-3-5-sonnet-20241022"):
        """
        Initialize the test runner.

        Args:
            test_suite_path: Path to the test suite JSON file
            usap_skill_path: Path to the USAP skill markdown file
            model_provider: LLM provider ("anthropic" or "openai")
            model: Model identifier
        """
        self.test_suite_path = Path(test_suite_path)
        self.usap_skill_path = Path(usap_skill_path)
        self.model_provider = model_provider
        self.model = model

        # Load test suite
        with open(self.test_suite_path, 'r') as f:
            self.test_data = json.load(f)

        # Load USAP skill instructions
        with open(self.usap_skill_path, 'r') as f:
            self.usap_skill = f.read()

        # Get expected disclaimer text
        self.expected_disclaimer = self.test_data['test_suite']['disclaimer_text']

        # Initialize LLM client
        self.client = self._init_client()

    def _init_client(self):
        """Initialize the LLM client based on provider."""
        if self.model_provider == "anthropic":
            if Anthropic is None:
                raise ImportError("anthropic package not installed. Run: pip install anthropic")

            # Check for API key (optional if using ai-gateway)
            api_key = os.environ.get("ANTHROPIC_API_KEY", "dummy-key-for-gateway")

            # Support ai-gateway base URL override
            base_url = os.environ.get("ANTHROPIC_BASE_URL")
            if base_url:
                return Anthropic(api_key=api_key, base_url=base_url)
            else:
                if api_key == "dummy-key-for-gateway":
                    raise ValueError("ANTHROPIC_API_KEY environment variable not set. Set it or use ai-gateway.")
                return Anthropic(api_key=api_key)

        elif self.model_provider == "openai":
            if OpenAI is None:
                raise ImportError("openai package not installed. Run: pip install openai")

            # Check for API key (optional if using ai-gateway)
            api_key = os.environ.get("OPENAI_API_KEY", "dummy-key-for-gateway")

            # Support ai-gateway base URL override
            base_url = os.environ.get("OPENAI_BASE_URL")
            if base_url:
                return OpenAI(api_key=api_key, base_url=base_url)
            else:
                if api_key == "dummy-key-for-gateway":
                    raise ValueError("OPENAI_API_KEY environment variable not set. Set it or use ai-gateway.")
                return OpenAI(api_key=api_key)
        else:
            raise ValueError(f"Unsupported model provider: {self.model_provider}")

    def _call_llm(self, question: str) -> str:
        """
        Call the LLM with the USAP skill context and question.

        Args:
            question: The user's question

        Returns:
            The LLM's response
        """
        system_prompt = f"""You are a helpful assistant that follows the instructions in the USAP skill exactly.

{self.usap_skill}

Important: Follow the instructions in the skill document precisely."""

        if self.model_provider == "anthropic":
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": question}
                ]
            )
            return response.content[0].text

        elif self.model_provider == "openai":
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": question}
                ],
                max_tokens=2000
            )
            return response.choices[0].message.content

    def _check_disclaimer(self, response: str) -> bool:
        """Check if the disclaimer is present in the response."""
        # Normalize both strings for comparison
        response_normalized = response.strip().lower()
        disclaimer_normalized = self.expected_disclaimer.strip().lower()

        # Check for the key parts of the disclaimer
        has_ai_warning = "ai that can make mistakes" in response_normalized
        has_verify_message = "verify" in response_normalized
        has_trust_center_link = "trust-center" in response_normalized or "trust center" in response_normalized

        return has_ai_warning and has_verify_message and has_trust_center_link

    def _check_citation(self, response: str) -> bool:
        """Check if the response includes a citation to USAP."""
        response_lower = response.lower()

        # Look for references to USAP2026 or the security assurance plan
        citation_patterns = [
            r'usap',
            r'security assurance plan',
            r'section\s+\d+',
            r'page\s+\d+',
            r'chapter\s+\d+',
        ]

        for pattern in citation_patterns:
            if re.search(pattern, response_lower):
                return True

        return False

    def _check_scope_refusal(self, response: str) -> bool:
        """Check if the response properly refuses to answer out-of-scope questions."""
        response_lower = response.lower()

        # Look for refusal indicators
        refusal_patterns = [
            r'cannot answer',
            r'not.*upsun.*related',
            r'not.*security.*related',
            r'only.*security',
            r'my.*job.*is.*to.*provide.*security',
            r'out.*of.*scope',
            r'not.*able.*to.*answer',
        ]

        for pattern in refusal_patterns:
            if re.search(pattern, response_lower):
                return True

        return False

    def _check_redirect_to_contact(self, response: str) -> bool:
        """Check if the response redirects to Upsun contact page when appropriate."""
        response_lower = response.lower()
        return 'upsun.com/contact' in response_lower or 'contact-us' in response_lower

    def _validate_response(self, test: Dict[str, Any], response: str) -> Dict[str, Any]:
        """
        Validate a response against test expectations.

        Args:
            test: Test case definition
            response: LLM response

        Returns:
            Validation results dictionary
        """
        results = {
            'test_id': test['id'],
            'category': test['category'],
            'question': test['question'],
            'response': response,
            'passed': True,
            'failures': []
        }

        expected = test['expected_behaviors']

        # Check disclaimer
        has_disclaimer = self._check_disclaimer(response)
        if expected['should_include_disclaimer'] and not has_disclaimer:
            results['passed'] = False
            results['failures'].append('Missing disclaimer')
        elif not expected['should_include_disclaimer'] and has_disclaimer:
            results['passed'] = False
            results['failures'].append('Unexpected disclaimer present')

        # Check citation
        has_citation = self._check_citation(response)
        if expected['should_include_citation'] and not has_citation:
            results['passed'] = False
            results['failures'].append('Missing USAP citation')

        # Check scope refusal
        has_refusal = self._check_scope_refusal(response)
        if expected['should_refuse'] and not has_refusal:
            results['passed'] = False
            results['failures'].append('Failed to refuse out-of-scope question')
        elif not expected['should_refuse'] and has_refusal:
            results['passed'] = False
            results['failures'].append('Incorrectly refused in-scope question')

        # Additional validation criteria checks
        if 'validation_criteria' in test:
            criteria = test['validation_criteria']

            # Check for redirect if needed
            if criteria.get('should_redirect_if_not_found'):
                has_redirect = self._check_redirect_to_contact(response)
                if not has_redirect and 'cannot find' in response.lower():
                    results['failures'].append('Missing redirect to contact page when answer not found')

        return results

    def run_tests(self, limit: int = None) -> Dict[str, Any]:
        """
        Run all tests in the suite.

        Args:
            limit: Optional limit on number of tests to run

        Returns:
            Test results dictionary
        """
        tests = self.test_data['tests']
        if limit:
            tests = tests[:limit]

        results = {
            'metadata': {
                'timestamp': datetime.now().isoformat(),
                'model_provider': self.model_provider,
                'model': self.model,
                'total_tests': len(tests),
                'passing_threshold': self.test_data['test_suite']['passing_threshold']
            },
            'test_results': [],
            'summary': {
                'total': len(tests),
                'passed': 0,
                'failed': 0,
                'by_category': {}
            }
        }

        print(f"Running {len(tests)} tests...")
        print(f"Model: {self.model_provider}/{self.model}")
        print("=" * 80)

        for i, test in enumerate(tests, 1):
            print(f"\n[{i}/{len(tests)}] Test ID {test['id']} ({test['category']})")
            print(f"Question: {test['question']}")

            # Call LLM
            try:
                response = self._call_llm(test['question'])
                print(f"Response: {response[:100]}...")

                # Validate response
                validation = self._validate_response(test, response)
                results['test_results'].append(validation)

                # Update summary
                if validation['passed']:
                    results['summary']['passed'] += 1
                    print("✓ PASSED")
                else:
                    results['summary']['failed'] += 1
                    print(f"✗ FAILED: {', '.join(validation['failures'])}")

                # Track by category
                category = test['category']
                if category not in results['summary']['by_category']:
                    results['summary']['by_category'][category] = {'passed': 0, 'failed': 0, 'total': 0}

                results['summary']['by_category'][category]['total'] += 1
                if validation['passed']:
                    results['summary']['by_category'][category]['passed'] += 1
                else:
                    results['summary']['by_category'][category]['failed'] += 1

            except Exception as e:
                print(f"✗ ERROR: {str(e)}")
                results['test_results'].append({
                    'test_id': test['id'],
                    'category': test['category'],
                    'question': test['question'],
                    'response': None,
                    'passed': False,
                    'failures': [f'Exception: {str(e)}']
                })
                results['summary']['failed'] += 1

        # Calculate failure rate
        results['summary']['failure_rate'] = results['summary']['failed'] / results['summary']['total']
        results['summary']['pass_rate'] = results['summary']['passed'] / results['summary']['total']

        return results

    def print_summary(self, results: Dict[str, Any]):
        """Print a summary of test results."""
        summary = results['summary']
        threshold = results['metadata']['passing_threshold']

        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {summary['total']}")
        print(f"Passed: {summary['passed']}")
        print(f"Failed: {summary['failed']}")
        print(f"Pass Rate: {summary['pass_rate']:.2%}")
        print(f"Failure Rate: {summary['failure_rate']:.2%}")
        print(f"Required Pass Rate: {threshold:.2%}")

        if summary['pass_rate'] >= threshold:
            print(f"\n✓ SUCCESS: Pass rate ({summary['pass_rate']:.2%}) meets threshold ({threshold:.2%})")
        else:
            print(f"\n✗ FAILURE: Pass rate ({summary['pass_rate']:.2%}) below threshold ({threshold:.2%})")

        print("\nResults by Category:")
        for category, stats in summary['by_category'].items():
            rate = stats['passed'] / stats['total']
            print(f"  {category}: {stats['passed']}/{stats['total']} ({rate:.2%})")

        # Show common failure patterns
        print("\nCommon Failures:")
        failure_counts = {}
        for test_result in results['test_results']:
            if not test_result['passed']:
                for failure in test_result['failures']:
                    failure_counts[failure] = failure_counts.get(failure, 0) + 1

        for failure, count in sorted(failure_counts.items(), key=lambda x: x[1], reverse=True):
            print(f"  {failure}: {count} occurrences")

    def save_results(self, results: Dict[str, Any], output_path: str):
        """Save detailed results to a JSON file."""
        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\nDetailed results saved to: {output_path}")


def main():
    """Main entry point."""
    # Get the script's directory and repository root
    script_dir = Path(__file__).parent.resolve()
    repo_root = script_dir.parent

    parser = argparse.ArgumentParser(description='Run USAP skill validation tests')
    parser.add_argument('--test-suite', default=None,
                       help='Path to test suite JSON file (default: usap-test-suite.json in script dir)')
    parser.add_argument('--skill', default=None,
                       help='Path to USAP skill file (default: ../skills/usap/usap-skill.md)')
    parser.add_argument('--model-provider', choices=['anthropic', 'openai'], default='anthropic',
                       help='LLM provider to use')
    parser.add_argument('--model', default=None,
                       help='Model identifier (default: claude-sonnet-4-6 for Anthropic, gpt-5.4 for OpenAI). Other options: claude-haiku-4-5, claude-opus-4-6')
    parser.add_argument('--output', default=None,
                       help='Output file for detailed results (default: auto-generated in results/)')
    parser.add_argument('--limit', type=int, default=None,
                       help='Limit number of tests to run (for testing)')

    args = parser.parse_args()

    # Set default model based on provider
    if args.model is None:
        if args.model_provider == 'anthropic':
            args.model = 'claude-sonnet-4-6'  # Recommended by ai-gateway
        elif args.model_provider == 'openai':
            args.model = 'gpt-5.4'  # Recommended by ai-gateway

    # Set default paths relative to script location
    if args.test_suite is None:
        args.test_suite = script_dir / 'usap-test-suite.json'
    else:
        args.test_suite = Path(args.test_suite)

    if args.skill is None:
        args.skill = repo_root / 'skills' / 'usap' / 'usap-skill.md'
    else:
        args.skill = Path(args.skill)

    # Auto-generate output filename if not provided
    if args.output is None:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        results_dir = script_dir / 'results'
        results_dir.mkdir(parents=True, exist_ok=True)
        args.output = results_dir / f'usap_test_results_{timestamp}.json'
    else:
        args.output = Path(args.output)
        # Create parent directory if needed
        args.output.parent.mkdir(parents=True, exist_ok=True)

    # Run tests
    runner = USAPTestRunner(
        test_suite_path=args.test_suite,
        usap_skill_path=args.skill,
        model_provider=args.model_provider,
        model=args.model
    )

    results = runner.run_tests(limit=args.limit)

    # Print summary
    runner.print_summary(results)

    # Save results
    runner.save_results(results, args.output)

    # Exit with appropriate code
    if results['summary']['pass_rate'] >= results['metadata']['passing_threshold']:
        return 0
    else:
        return 1


if __name__ == '__main__':
    exit(main())
