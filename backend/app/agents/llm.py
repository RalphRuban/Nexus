from google.adk.models import BaseLlm, LlmRequest, LlmResponse
from google.genai import types


class MockLlm(BaseLlm):
    """Zero-cost stub LLM for deterministic/offline mode.

    Validated against ADK 2.7.0. Requires a ``model`` field and must
    yield exactly one LlmResponse per turn.
    """

    model: str = "mock-llm"

    @classmethod
    def supported_models(cls) -> list[str]:
        return [r"mock-llm.*"]

    async def generate_content_async(
        self,
        llm_request: LlmRequest,
        stream: bool = False,
    ):
        response = LlmResponse(
            content=types.Content(
                parts=[
                    types.Part(
                        text=(
                            '{"summary": "deterministic reasoning completed", '
                            '"status": "ok"}'
                        )
                    )
                ]
            ),
            turn_complete=True,
            finish_reason="STOP",
        )

        yield response


def build_llm(mode: str):
    """Return an LLM instance for the given mode.

    ``deterministic`` uses the offline MockLlm; ``llm`` uses the
    built-in Gemini model (requires GOOGLE_API_KEY).
    """
    if mode == "deterministic":
        return MockLlm()

    from google.adk.models import Gemini

    return Gemini(model="gemini-3.5-flash")
