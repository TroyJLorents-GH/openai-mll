"""
Graphiti Knowledge Graph Setup for Resume Match AI
Connects to Neo4j AuraDB, initializes indices, and feeds resume data.
"""

import asyncio
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv("backend/.env")

# Neo4j AuraDB connection
NEO4J_URI = os.getenv("NEO4J_URI", "neo4j+s://8ab5755a.databases.neo4j.io")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "")

# OpenAI key (Graphiti uses it for entity extraction)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# Cosmos DB (to pull existing resumes)
COSMOS_CONNECTION_STRING = os.getenv("COSMOS_CONNECTION_STRING", "")
COSMOS_DATABASE = os.getenv("COSMOS_DATABASE", "")
COSMOS_CONTAINER = os.getenv("COSMOS_CONTAINER", "")

USER_ID = "sGW6c4TUMGVMbpUDU7NewpgTxPt2"


async def main():
    from graphiti_core import Graphiti
    from graphiti_core.nodes import EpisodeType

    if not NEO4J_PASSWORD:
        print("ERROR: Set NEO4J_PASSWORD in backend/.env")
        return
    if not OPENAI_API_KEY:
        print("ERROR: Set OPENAI_API_KEY in backend/.env")
        return

    print(f"Connecting to Neo4j at {NEO4J_URI}...")
    graphiti = Graphiti(
        uri=NEO4J_URI,
        user=NEO4J_USER,
        password=NEO4J_PASSWORD,
    )

    print("Building indices and constraints...")
    await graphiti.build_indices_and_constraints()
    print("Indices ready.")

    # Pull resumes from Cosmos DB
    if COSMOS_CONNECTION_STRING:
        print("\nFetching resumes from Cosmos DB...")
        from azure.cosmos import CosmosClient
        client = CosmosClient.from_connection_string(COSMOS_CONNECTION_STRING)
        database = client.get_database_client(COSMOS_DATABASE)
        container = database.get_container_client(COSMOS_CONTAINER)

        query = "SELECT * FROM c WHERE c.userId = @userId"
        docs = list(container.query_items(
            query=query,
            parameters=[{"name": "@userId", "value": USER_ID}],
            partition_key=USER_ID,
        ))
        print(f"Found {len(docs)} resumes.")

        for doc in docs:
            filename = doc.get("filename", doc["id"])
            full_text = doc.get("fullText", doc.get("extractedText", ""))
            key_phrases = doc.get("keyPhrases", [])
            uploaded_at = doc.get("uploadedAt", datetime.utcnow().isoformat())

            if not full_text:
                print(f"  Skipping {filename} (no text)")
                continue

            # Build a rich episode body combining all resume data
            episode_body = (
                f"Resume: {filename}\n"
                f"Candidate: Troy Lorents\n"
                f"Uploaded: {uploaded_at}\n"
                f"Key Skills/Phrases: {', '.join(key_phrases[:30])}\n\n"
                f"Full Resume Text:\n{full_text[:6000]}"
            )

            print(f"  Adding episode: {filename}...")
            await graphiti.add_episode(
                name=f"resume_{doc['id'][:8]}",
                episode_body=episode_body,
                source=EpisodeType.text,
                source_description=f"Resume upload: {filename}",
                reference_time=datetime.fromisoformat(uploaded_at.replace("Z", "+00:00")) if uploaded_at else datetime.utcnow(),
            )
            print(f"    Done: {filename}")

        print(f"\nAll {len(docs)} resumes added to knowledge graph!")
    else:
        print("\nNo COSMOS_CONNECTION_STRING set — skipping resume import.")
        print("You can add episodes manually later.")

    # Test search
    print("\n--- Testing search ---")
    results = await graphiti.search(
        query="What programming skills does Troy have?",
        num_results=5,
    )

    print(f"Found {len(results)} results")
    for r in results:
        print(f"  {r}")

    await graphiti.close()
    print("\nDone! Open Neo4j Explore to visualize your graph.")


if __name__ == "__main__":
    asyncio.run(main())
