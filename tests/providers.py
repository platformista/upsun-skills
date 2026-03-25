"""
Provider-specific handlers for LLM interactions with document support.

Each provider has different capabilities for handling PDFs and documents.
This module provides a clean abstraction layer.
"""

import base64
import os
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional, Dict, Any

# Optional imports - providers may not be installed
try:
    from anthropic import Anthropic
except ImportError:
    Anthropic = None

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

try:
    import google.generativeai as genai
except ImportError:
    genai = None

try:
    import PyPDF2
except ImportError:
    PyPDF2 = None


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    def __init__(self, model: str):
        """
        Initialize the provider.

        Args:
            model: Model identifier
        """
        self.model = model
        self.client = self._init_client()

    @abstractmethod
    def _init_client(self):
        """Initialize the provider-specific client."""
        pass

    @abstractmethod
    def call(self, system_prompt: str, question: str, pdf_path: Optional[Path] = None) -> str:
        """
        Call the LLM with a question and optional PDF document.

        Args:
            system_prompt: System instructions
            question: User question
            pdf_path: Optional path to PDF document

        Returns:
            The model's response
        """
        pass

    @staticmethod
    def _pdf_to_base64(pdf_path: Path) -> str:
        """Convert PDF to base64 string."""
        with open(pdf_path, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')

    @staticmethod
    def _extract_pdf_text(pdf_path: Path) -> str:
        """Extract text from PDF using PyPDF2."""
        if PyPDF2 is None:
            raise ImportError("PyPDF2 not installed. Run: pip install PyPDF2")

        text_parts = []
        with open(pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for page_num, page in enumerate(reader.pages, 1):
                text = page.extract_text()
                text_parts.append(f"--- Page {page_num} ---\n{text}\n")

        return "\n".join(text_parts)


class AnthropicProvider(LLMProvider):
    """Anthropic Claude provider with native PDF support."""

    def _init_client(self):
        """Initialize Anthropic client."""
        if Anthropic is None:
            raise ImportError("anthropic package not installed. Run: pip install anthropic")

        api_key = os.environ.get("ANTHROPIC_API_KEY", "dummy-key-for-gateway")
        base_url = os.environ.get("ANTHROPIC_BASE_URL")

        if base_url:
            return Anthropic(api_key=api_key, base_url=base_url)
        else:
            if api_key == "dummy-key-for-gateway":
                raise ValueError("ANTHROPIC_API_KEY environment variable not set. Set it or use ai-gateway.")
            return Anthropic(api_key=api_key)

    def call(self, system_prompt: str, question: str, pdf_path: Optional[Path] = None) -> str:
        """
        Call Claude with native PDF support.

        Args:
            system_prompt: System instructions
            question: User question
            pdf_path: Optional path to PDF document

        Returns:
            Claude's response
        """
        # Build message content
        content = []

        # Add PDF as document block if provided
        if pdf_path:
            pdf_base64 = self._pdf_to_base64(pdf_path)
            content.append({
                "type": "document",
                "source": {
                    "type": "base64",
                    "media_type": "application/pdf",
                    "data": pdf_base64
                }
            })

        # Add the question
        content.append({
            "type": "text",
            "text": question
        })

        # Call Claude
        response = self.client.messages.create(
            model=self.model,
            max_tokens=4000,
            system=system_prompt,
            messages=[
                {"role": "user", "content": content}
            ]
        )

        return response.content[0].text


class OpenAIProvider(LLMProvider):
    """OpenAI GPT provider with text extraction fallback."""

    def _init_client(self):
        """Initialize OpenAI client."""
        if OpenAI is None:
            raise ImportError("openai package not installed. Run: pip install openai")

        api_key = os.environ.get("OPENAI_API_KEY", "dummy-key-for-gateway")
        base_url = os.environ.get("OPENAI_BASE_URL")

        if base_url:
            return OpenAI(api_key=api_key, base_url=base_url)
        else:
            if api_key == "dummy-key-for-gateway":
                raise ValueError("OPENAI_API_KEY environment variable not set. Set it or use ai-gateway.")
            return OpenAI(api_key=api_key)

    def call(self, system_prompt: str, question: str, pdf_path: Optional[Path] = None) -> str:
        """
        Call OpenAI with text extraction for PDFs.

        Args:
            system_prompt: System instructions
            question: User question
            pdf_path: Optional path to PDF document (will be extracted to text)

        Returns:
            GPT's response
        """
        # If PDF provided, extract text and append to system prompt
        if pdf_path:
            pdf_text = self._extract_pdf_text(pdf_path)
            system_prompt += f"\n\n## Source Document Content\n\n{pdf_text}"

        # Call OpenAI
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": question}
            ],
            max_tokens=4000
        )

        return response.choices[0].message.content


class GeminiProvider(LLMProvider):
    """Google Gemini provider with native PDF support."""

    def _init_client(self):
        """Initialize Gemini client."""
        if genai is None:
            raise ImportError("google-generativeai package not installed. Run: pip install google-generativeai")

        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable not set")

        genai.configure(api_key=api_key)
        return genai.GenerativeModel(self.model)

    def call(self, system_prompt: str, question: str, pdf_path: Optional[Path] = None) -> str:
        """
        Call Gemini with native PDF support.

        Args:
            system_prompt: System instructions
            question: User question
            pdf_path: Optional path to PDF document

        Returns:
            Gemini's response
        """
        # Build content parts
        content_parts = []

        # Add PDF if provided
        if pdf_path:
            # Upload file to Gemini
            uploaded_file = genai.upload_file(str(pdf_path))
            content_parts.append(uploaded_file)

        # Combine system prompt and question
        combined_prompt = f"{system_prompt}\n\n{question}"
        content_parts.append(combined_prompt)

        # Call Gemini
        response = self.client.generate_content(content_parts)

        return response.text


# Provider registry
PROVIDERS: Dict[str, type] = {
    "anthropic": AnthropicProvider,
    "openai": OpenAIProvider,
    "gemini": GeminiProvider,
}


def get_provider(provider_name: str, model: str) -> LLMProvider:
    """
    Get a provider instance.

    Args:
        provider_name: Name of the provider (anthropic, openai, gemini)
        model: Model identifier

    Returns:
        Initialized provider instance

    Raises:
        ValueError: If provider not found
    """
    if provider_name not in PROVIDERS:
        available = ", ".join(PROVIDERS.keys())
        raise ValueError(f"Unsupported provider: {provider_name}. Available: {available}")

    provider_class = PROVIDERS[provider_name]
    return provider_class(model)
