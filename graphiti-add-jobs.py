"""
Add job descriptions to the Graphiti Knowledge Graph.

Usage:
  1. Add jobs from a JSON file:
       python graphiti-add-jobs.py --file jobs.json

  2. Add a single job interactively:
       python graphiti-add-jobs.py --interactive

  3. Search Indeed and add results:
       python graphiti-add-jobs.py --search "Full Stack Engineer" --location "Phoenix, AZ" --count 10

JSON file format (jobs.json):
[
  {
    "title": "Senior Full Stack Engineer",
    "company": "Microsoft",
    "location": "Remote",
    "description": "We are looking for a Senior Full Stack Engineer..."
  }
]
"""

import asyncio
import argparse
import json
import os
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv("backend/.env")

NEO4J_URI = os.getenv("NEO4J_URI", "neo4j+s://8ab5755a.databases.neo4j.io")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


def load_jobs_from_file(filepath):
    """Load job descriptions from a JSON file (handles multiline strings)."""
    with open(filepath, "r", encoding="utf-8") as f:
        raw = f.read()
    # Fix multiline strings: replace literal newlines inside JSON strings with \n
    # This lets users paste job descriptions with real newlines into the JSON
    import re
    def fix_multiline(match):
        return match.group(0).replace("\n", "\\n")
    raw = re.sub(r'"(?:[^"\\]|\\.)*"', fix_multiline, raw, flags=re.DOTALL)
    jobs = json.loads(raw)
    print(f"Loaded {len(jobs)} jobs from {filepath}")
    return jobs


def get_interactive_job():
    """Prompt user to enter a single job description."""
    print("\n--- Enter job details ---")
    title = input("Job Title: ").strip()
    company = input("Company: ").strip()
    location = input("Location: ").strip()
    print("Paste the job description (type END on a new line when done):")
    lines = []
    while True:
        line = input()
        if line.strip() == "END":
            break
        lines.append(line)
    description = "\n".join(lines)
    return [{"title": title, "company": company, "location": location, "description": description}]


async def add_jobs_to_graph(jobs):
    """Feed job descriptions into Graphiti as episodes."""
    from graphiti_core import Graphiti
    from graphiti_core.nodes import EpisodeType

    if not NEO4J_PASSWORD:
        print("ERROR: Set NEO4J_PASSWORD in backend/.env")
        return
    if not OPENAI_API_KEY:
        print("ERROR: Set OPENAI_API_KEY in backend/.env")
        return

    print(f"\nConnecting to Neo4j at {NEO4J_URI}...")
    graphiti = Graphiti(uri=NEO4J_URI, user=NEO4J_USER, password=NEO4J_PASSWORD)

    added = 0
    for i, job in enumerate(jobs, 1):
        title = job.get("title", "Unknown Role")
        company = job.get("company", "Unknown Company")
        location = job.get("location", "")
        description = job.get("description", "")
        url = job.get("url", "")
        salary = job.get("salary", "")
        date_posted = job.get("date_posted", datetime.now(timezone.utc).isoformat())

        if not description:
            print(f"  [{i}/{len(jobs)}] Skipping {title} at {company} (no description)")
            continue

        # Build a rich episode body for entity extraction
        episode_body = (
            f"Job Posting: {title}\n"
            f"Company: {company}\n"
            f"Location: {location}\n"
        )
        if salary:
            episode_body += f"Salary: {salary}\n"
        if url:
            episode_body += f"URL: {url}\n"
        episode_body += (
            f"\nJob Description:\n{description[:6000]}"
        )

        # Create a unique name from company + title
        safe_name = f"job_{company[:20]}_{title[:20]}".replace(" ", "_").lower()

        print(f"  [{i}/{len(jobs)}] Adding: {title} at {company}...")
        try:
            await graphiti.add_episode(
                name=safe_name,
                episode_body=episode_body,
                source=EpisodeType.text,
                source_description=f"Job posting: {title} at {company}",
                reference_time=datetime.now(timezone.utc),
            )
            added += 1
            print(f"    Done!")
        except Exception as e:
            print(f"    Error: {e}")

    # Show updated stats
    print(f"\n--- Added {added}/{len(jobs)} jobs to knowledge graph ---")

    print("\nRunning test search: 'What companies are hiring for React?'")
    results = await graphiti.search(
        query="What companies are hiring for React and full stack roles?",
        num_results=5,
    )
    print(f"Found {len(results)} results:")
    for r in results:
        fact = getattr(r, 'fact', str(r))
        print(f"  - {fact}")

    await graphiti.close()
    print("\nDone! Open Neo4j Explore to see the updated graph.")


def main():
    parser = argparse.ArgumentParser(description="Add job descriptions to Graphiti knowledge graph")
    parser.add_argument("--file", "-f", help="Path to a JSON file with job descriptions")
    parser.add_argument("--interactive", "-i", action="store_true", help="Enter a job interactively")
    parser.add_argument("--skip", "-s", type=int, default=0, help="Skip first N jobs (to avoid re-importing)")
    args = parser.parse_args()

    if args.file:
        jobs = load_jobs_from_file(args.file)
    elif args.interactive:
        jobs = get_interactive_job()
    else:
        # Default: look for jobs.json in project root
        default_path = os.path.join(os.path.dirname(__file__), "jobs.json")
        if os.path.exists(default_path):
            jobs = load_jobs_from_file(default_path)
        else:
            print("No jobs to add. Use one of:")
            print("  python graphiti-add-jobs.py --file jobs.json")
            print("  python graphiti-add-jobs.py --interactive")
            print(f"\nOr create {default_path} with job descriptions.")
            print("\nExample jobs.json:")
            example = [
                {
                    "title": "Senior Full Stack Engineer",
                    "company": "Microsoft",
                    "location": "Redmond, WA",
                    "salary": "$150,000 - $200,000",
                    "description": "We are looking for a Senior Full Stack Engineer to build cloud-native applications using React, .NET, and Azure..."
                }
            ]
            print(json.dumps(example, indent=2))
            return

    if args.skip > 0:
        print(f"Skipping first {args.skip} jobs...")
        jobs = jobs[args.skip:]

    if not jobs:
        print("No jobs found in input.")
        return

    asyncio.run(add_jobs_to_graph(jobs))


if __name__ == "__main__":
    main()
