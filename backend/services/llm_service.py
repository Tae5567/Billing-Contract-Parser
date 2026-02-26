# LLM powered contract extraction service
# Uses Open AI gpt-4
# Returns structured billing config with per-field confidence scores


import json
import logging
import os
from typing import Any, Optional

from openai import AsyncOpenAI
import anthropic

logger = logging.getLogger(__name__)

EXTRACTION_SYSTEM_PROMPT = """You are an expert legal and financial analyst specializing in B2B SaaS contracts.
Your job is to extract billing and payment terms from contract text with high accuracy.

You MUST respond with ONLY valid JSON matching this exact schema (no markdown, no explanation):

{
  "contract_parties": {
    "vendor": {"value": "string or null", "confidence": 0.0-1.0, "source_text": "exact quote from contract"},
    "client": {"value": "string or null", "confidence": 0.0-1.0, "source_text": "exact quote"}
  },
  "contract_value": {
    "value": number or null,
    "currency": "USD" or other ISO code,
    "confidence": 0.0-1.0,
    "source_text": "exact quote"
  },
  "billing_frequency": {
    "value": "monthly" | "quarterly" | "annually" | "one-time" | "custom" | null,
    "custom_description": "string if custom, else null",
    "confidence": 0.0-1.0,
    "source_text": "exact quote"
  },
  "payment_schedule": {
    "value": "Net 30" | "Net 60" | "Net 90" | "Due on receipt" | "custom" | null,
    "due_days": number or null,
    "confidence": 0.0-1.0,
    "source_text": "exact quote"
  },
  "usage_tiers": {
    "value": [
      {
        "tier_name": "string",
        "min_units": number or null,
        "max_units": number or null,
        "price_per_unit": number or null,
        "flat_fee": number or null,
        "unit_type": "string e.g. seats, API calls, GB"
      }
    ],
    "confidence": 0.0-1.0,
    "source_text": "exact quote or null if no tiers"
  },
  "renewal_clause": {
    "auto_renews": true | false | null,
    "renewal_period_months": number or null,
    "cancellation_notice_days": number or null,
    "confidence": 0.0-1.0,
    "source_text": "exact quote"
  },
  "late_fee": {
    "applies": true | false | null,
    "rate_percent": number or null,
    "grace_period_days": number or null,
    "flat_amount": number or null,
    "confidence": 0.0-1.0,
    "source_text": "exact quote or null"
  },
  "start_date": {
    "value": "YYYY-MM-DD or null",
    "confidence": 0.0-1.0,
    "source_text": "exact quote"
  },
  "end_date": {
    "value": "YYYY-MM-DD or null",
    "confidence": 0.0-1.0,
    "source_text": "exact quote"
  },
  "special_terms": {
    "value": ["array of notable special billing terms as strings"],
    "confidence": 0.0-1.0,
    "source_text": "relevant quotes"
  },
  "extraction_notes": "string: any caveats, ambiguities, or things a human should double-check"
}

Confidence scoring guide:
- 1.0: Explicitly stated, clear and unambiguous
- 0.8-0.99: Stated but with minor ambiguity
- 0.5-0.79: Implied or inferred from context
- 0.0-0.49: Guessed or very uncertain — flag these for human review

CRITICAL RULES:
- Use null for fields not found in the contract
- confidence reflects YOUR certainty, not the contract's clarity
- source_text must be a direct quote from the contract (max 200 chars)
- For dates, parse to YYYY-MM-DD format
- For monetary values, use numbers (not strings like "$5,000")"""

USER_PROMPT_TEMPLATE = """Please extract all billing and payment terms from this contract:

---CONTRACT START---
{contract_text}
---CONTRACT END---

Extract every billing-related term you can find. If the contract is truncated, note this in extraction_notes."""

# Main extraction function. Tries OpenAI first, then optionally falls back to Anthropic.
# Returns the structured billing config dict.
async def extract_billing_config(contract_text: str) -> dict[str, Any]:
    # Truncate very long contracts (keep first 12k + last 2k chars for context)
    if len(contract_text) > 14000:
        contract_text = contract_text[:12000] + "\n...[middle section omitted]...\n" + contract_text[-2000:]

    try:
        result = await _extract_with_openai(contract_text)
        if result:
            return result
    except Exception as e:
        logger.warning(f"OpenAI extraction failed: {e}, trying Anthropic fallback")

    try:
        result = await _extract_with_anthropic(contract_text)
        if result:
            return result
    except Exception as e:
        logger.error(f"Anthropic fallback also failed: {e}")
        raise RuntimeError("Both LLM providers failed to extract contract data") from e

    raise RuntimeError("No LLM provider returned valid results")


# Use OpenAI
async def _extract_with_openai(contract_text: str) -> Optional[dict]:
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not set")
    
    client = AsyncOpenAI(api_key=api_key)
    
    response = await client.chat.completions.create(
        model="gpt-4o",
        temperature=0,  # Deterministic extraction
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {"role": "user", "content": USER_PROMPT_TEMPLATE.format(contract_text=contract_text)}
        ],
        max_tokens=4000,
    )
    
    content = response.choices[0].message.content
    return json.loads(content)


# Use Anthropic
async def _extract_with_anthropic(contract_text: str) -> Optional[dict]:
    
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not set")
    
    client = anthropic.AsyncAnthropic(api_key=api_key)
    
    message = await client.messages.create(
        model="claude-opus-4-6",
        max_tokens=4000,
        system=EXTRACTION_SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": USER_PROMPT_TEMPLATE.format(contract_text=contract_text)}
        ]
    )
    
    content = message.content[0].text
    # Strip any markdown fences if present
    content = content.strip()
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
    
    return json.loads(content)