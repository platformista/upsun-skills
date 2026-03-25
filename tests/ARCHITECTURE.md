# Test Suite Architecture

## Overview

The USAP test suite is built on a modular, provider-agnostic architecture that supports multiple LLM providers with different document handling capabilities.

## Design Principles

1. **Provider Abstraction**: Clean separation between test logic and provider-specific implementations
2. **Extensibility**: Easy to add new providers without modifying core test logic
3. **Optimal Document Handling**: Each provider uses its best method for PDF processing
4. **Configuration Over Code**: Providers selected via command-line arguments

## File Structure

```
tests/
├── run_usap_tests.py      # Main test runner
├── providers.py            # Provider abstraction layer
├── usap-test-suite.json   # Test cases
├── requirements.txt        # Dependencies
├── README.md              # Usage documentation
└── ARCHITECTURE.md        # This file
```

## Provider System

### Base Class: `LLMProvider`

Abstract base class defining the interface all providers must implement:

```python
class LLMProvider(ABC):
    def __init__(self, model: str):
        """Initialize with model identifier"""

    @abstractmethod
    def call(self, system_prompt: str, question: str, pdf_path: Optional[Path]) -> str:
        """Call the LLM with optional PDF document"""
```

### Implemented Providers

#### 1. AnthropicProvider

**PDF Handling**: Native document blocks (base64)

Claude supports PDFs natively through document content blocks:

```python
content = [
    {
        "type": "document",
        "source": {
            "type": "base64",
            "media_type": "application/pdf",
            "data": pdf_base64
        }
    },
    {"type": "text", "text": question}
]
```

**Advantages**:
- Preserves document structure
- No preprocessing needed
- Efficient token usage

**Models**: claude-sonnet-4-6, claude-haiku-4-5, claude-opus-4-6

#### 2. GeminiProvider

**PDF Handling**: File API upload

Gemini uploads PDFs to Google's servers and references them:

```python
uploaded_file = genai.upload_file(str(pdf_path))
response = model.generate_content([uploaded_file, question])
```

**Advantages**:
- Native PDF support
- Handles large documents
- Preserves formatting

**Models**: gemini-1.5-pro, gemini-2.0-flash

#### 3. OpenAIProvider

**PDF Handling**: Text extraction (PyPDF2)

OpenAI doesn't support PDFs natively, so we extract text first:

```python
def _extract_pdf_text(pdf_path: Path) -> str:
    reader = PyPDF2.PdfReader(pdf_path)
    text_parts = []
    for page in reader.pages:
        text_parts.append(page.extract_text())
    return "\n".join(text_parts)
```

**Limitations**:
- Loses formatting/structure
- May miss complex layouts
- Higher token usage

**Models**: gpt-5.4, gpt-4, gpt-4-turbo

## Provider Registry

Providers are registered in a dictionary for easy lookup:

```python
PROVIDERS = {
    "anthropic": AnthropicProvider,
    "openai": OpenAIProvider,
    "gemini": GeminiProvider,
}

def get_provider(provider_name: str, model: str) -> LLMProvider:
    provider_class = PROVIDERS[provider_name]
    return provider_class(model)
```

## Adding a New Provider

To add support for a new LLM provider:

### 1. Create Provider Class

```python
class NewProvider(LLMProvider):
    def _init_client(self):
        # Initialize the provider's SDK
        return NewProviderClient(api_key=os.environ.get("NEW_PROVIDER_KEY"))

    def call(self, system_prompt: str, question: str, pdf_path: Optional[Path]) -> str:
        # Implement provider-specific calling logic
        # Choose PDF handling method:
        # - Native support: use provider's document API
        # - No support: use self._extract_pdf_text(pdf_path)
        pass
```

### 2. Register Provider

```python
PROVIDERS = {
    "anthropic": AnthropicProvider,
    "openai": OpenAIProvider,
    "gemini": GeminiProvider,
    "newprovider": NewProvider,  # Add here
}
```

### 3. Update CLI

In `run_usap_tests.py`:

```python
parser.add_argument('--model-provider',
                   choices=['anthropic', 'openai', 'gemini', 'newprovider'],
                   default='anthropic')
```

### 4. Add Default Model

```python
if args.model is None:
    if args.model_provider == 'newprovider':
        args.model = 'new-model-name'
```

That's it! No changes needed to the core test logic.

## PDF Document Flow

```
┌─────────────────┐
│  USAP PDF File  │
└────────┬────────┘
         │
         ├─────────────┬──────────────┬──────────────┐
         │             │              │              │
    Anthropic       Gemini        OpenAI        Future
         │             │              │              │
         │             │              │              │
    ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐   ┌────▼─────┐
    │  Native  │  │  Native  │  │  Extract │   │   ???    │
    │  Base64  │  │File Upload│  │   Text   │   │          │
    └────┬─────┘  └────┬─────┘  └────┬─────┘   └────┬─────┘
         │             │              │              │
         └─────────────┴──────────────┴──────────────┘
                       │
                  ┌────▼────┐
                  │   LLM   │
                  └────┬────┘
                       │
                  ┌────▼────┐
                  │Response │
                  └─────────┘
```

## Test Execution Flow

```
1. Load test suite JSON
2. Load USAP skill instructions
3. Initialize provider (via get_provider)
4. For each test:
   a. Build system prompt (skill instructions)
   b. Call provider.call(prompt, question, pdf_path)
   c. Validate response (disclaimer, citation, refusal)
   d. Record results
5. Generate summary report
6. Save detailed JSON results
```

## Environment Variables

### Anthropic
- `ANTHROPIC_API_KEY`: API key
- `ANTHROPIC_BASE_URL`: Optional base URL (for ai-gateway)

### OpenAI
- `OPENAI_API_KEY`: API key
- `OPENAI_BASE_URL`: Optional base URL (for ai-gateway)

### Gemini
- `GOOGLE_API_KEY`: API key

## Dependencies

### Core
- `PyPDF2>=3.0.0`: PDF text extraction

### Provider SDKs (optional - install what you need)
- `anthropic>=0.40.0`: Claude
- `openai>=1.0.0`: GPT
- `google-generativeai>=0.3.0`: Gemini

## Future Enhancements

Potential additions to the provider system:

1. **Cohere Provider**: Add support for Cohere models
2. **Local Models**: Support for llama.cpp, Ollama, etc.
3. **Azure OpenAI**: Separate provider for Azure-hosted models
4. **Caching**: Provider-level caching for repeated PDF uploads
5. **Parallel Execution**: Run tests across multiple providers simultaneously
6. **Cost Tracking**: Log token usage and costs per provider

## Design Decisions

### Why Not Use LangChain?

We opted for a custom provider abstraction because:
- **Simplicity**: Lighter weight, fewer dependencies
- **Control**: Full control over PDF handling per provider
- **Transparency**: Clear what each provider does
- **Performance**: No framework overhead

### Why PyPDF2 for OpenAI?

- Widely used, stable library
- Simple API
- Good enough for text extraction
- Could be swapped for pdf2image + vision API if needed

### Why Separate providers.py?

- **Modularity**: Easy to test providers independently
- **Reusability**: Could be used in other projects
- **Clarity**: Separates concerns (testing vs. LLM calls)
- **Maintenance**: Update providers without touching test logic
