import asyncio
from dotenv import load_dotenv

from services.narrative_service import generate_narrative, synthesize_composite_story

load_dotenv()

async def test():
    print("Testing single narrative...")
    text_for_narrative = "The Nigerian central bank has recently adjusted the interest rates by 50 basis points, causing a ripple effect in local markets."
    source_name = "Premium Times"
    single_res = await generate_narrative(text_for_narrative, source_name=source_name)
    print("KEYS:", single_res.keys())
    print("SOURCES USED:", single_res.get("sources_used"))
    print("NARRATIVE:\n", single_res.get("narrative"))

    print("\n----------------\nTesting composite synthesis...")
    articles = [
        {"source": "Punch", "summary": "The CBN raised rates to curb inflation, a widely anticipated move."},
        {"source": "Channels TV", "summary": "Market reactions were mixed today following the CBN announcement. Most equities fell."}
    ]
    comp_res = await synthesize_composite_story(articles)
    print("KEYS:", comp_res.keys())
    print("SOURCES USED:", comp_res.get("sources_used"))
    print("NARRATIVE:\n", comp_res.get("narrative"))

if __name__ == "__main__":
    asyncio.run(test())
