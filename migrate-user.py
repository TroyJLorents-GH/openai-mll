"""
One-time migration: re-partition Cosmos DB documents from userId="user1"
to a Firebase UID. Cosmos doesn't allow updating partition keys, so we
read each doc, change userId, insert under the new partition, and delete the old one.
"""

from azure.cosmos import CosmosClient, exceptions
from dotenv import load_dotenv
import os

load_dotenv("backend/.env")  # won't have Cosmos vars, but just in case

# --- CONFIGURE THESE ---
COSMOS_CONNECTION_STRING = os.getenv("COSMOS_CONNECTION_STRING", "")
COSMOS_DATABASE = os.getenv("COSMOS_DATABASE", "")
COSMOS_CONTAINER = os.getenv("COSMOS_CONTAINER", "")

OLD_USER_ID = "user1"
NEW_USER_ID = "sGW6c4TUMGVMbpUDU7NewpgTxPt2"

if not COSMOS_CONNECTION_STRING:
    print("ERROR: Set COSMOS_CONNECTION_STRING, COSMOS_DATABASE, COSMOS_CONTAINER")
    print("Either in backend/.env or as environment variables.")
    exit(1)

client = CosmosClient.from_connection_string(COSMOS_CONNECTION_STRING)
database = client.get_database_client(COSMOS_DATABASE)
container = database.get_container_client(COSMOS_CONTAINER)

# Query all docs under old userId
print(f"Querying documents with userId='{OLD_USER_ID}'...")
query = "SELECT * FROM c WHERE c.userId = @userId"
docs = list(container.query_items(
    query=query,
    parameters=[{"name": "@userId", "value": OLD_USER_ID}],
    partition_key=OLD_USER_ID,
))

print(f"Found {len(docs)} documents to migrate.")

if len(docs) == 0:
    print("Nothing to migrate.")
    exit(0)

migrated = 0
for doc in docs:
    doc_id = doc["id"]
    filename = doc.get("filename", doc_id)
    print(f"  Migrating: {filename} ({doc_id})")

    # Remove Cosmos metadata fields
    for key in ["_rid", "_self", "_etag", "_attachments", "_ts"]:
        doc.pop(key, None)

    # Update userId
    doc["userId"] = NEW_USER_ID

    # Create under new partition
    try:
        container.create_item(body=doc)
    except exceptions.CosmosResourceExistsError:
        print(f"    Already exists under new userId, skipping create.")

    # Delete old partition copy
    try:
        container.delete_item(item=doc_id, partition_key=OLD_USER_ID)
    except exceptions.CosmosResourceNotFoundError:
        print(f"    Old doc already deleted.")

    migrated += 1

print(f"\nDone! Migrated {migrated} documents from '{OLD_USER_ID}' to '{NEW_USER_ID}'.")
print("AI Search indexer will auto-sync within 5 minutes.")
