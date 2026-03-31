import asyncio
from services.factcheck_service import generate_truth_tags

async def test_truth_tags():
    narrative = """
    In a recent development, the Central Bank of Nigeria has announced a major shift in monetary policy.
    According to a press statement released on their official website, interest rates will be adjusted by 0.5% effective next month.
    The Guardian reports that this move has been met with mixed reactions from financial analysts in Lagos.
    """
    sources = ["Central Bank of Nigeria", "The Guardian"]
    
    print("Evaluating Narrative:")
    print(narrative.strip())
    print("\nSources:", sources)
    print("\n--- Generating Truth Tags ---")
    
    result = await generate_truth_tags(narrative, sources)
    print(f"Trust Score: {result.get('trust_score')}")
    print(f"Tags: {', '.join(result.get('tags', []))}")
    print(f"Explanation: {result.get('explanation')}")

if __name__ == "__main__":
    asyncio.run(test_truth_tags())
