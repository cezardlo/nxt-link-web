# NXT LINK — INTELLIGENCE SYSTEM

## Overview
NXT LINK is an intelligence system designed to provide insights into technology trends, vendor activities, and industry developments. It serves as a resource for understanding what technology exists, where it's heading, and who is involved globally and in El Paso, Texas.

## Project Structure
The project is organized into several key components:

- **agents/**: Contains various agent classes that handle specific tasks related to data processing and analysis.
  - `base.py`: Base class for all agents.
  - `iker.py`: Implements vendor scoring logic.
  - `feed.py`: Handles enrichment of feed items.
  - `trend.py`: Provides industry forecasting capabilities.
  - `narrative.py`: Generates plain English answers from complex data.
  - `entity.py`: Extracts information about companies, people, and contracts.
  - `patent.py`: Provides intelligence on patents from USPTO and arXiv.

- **engines/**: Contains classes that implement various analytical engines.
  - `five_whys.py`: Implements root cause analysis using the "Five Whys" technique.
  - `connections.py`: Detects cross-industry patterns.
  - `supply_chain.py`: Maps supply chains across six tiers.
  - `decisions.py`: Generates action items based on intelligence gathered.

- **data/**: Contains modules for data access and caching.
  - `supabase.py`: REST API wrapper for Supabase.
  - `cache.py`: Implements a file-based caching mechanism.

- **api/**: Contains the FastAPI server setup.
  - `server.py`: Defines API endpoints and handles incoming requests.

- **fixes/**: Contains scripts for one-time data repair tasks.
  - `fix_vendor_columns.py`: Fixes vendor column issues in the database.
  - `fix_iker.py`: Runs fixes on IKER vendor scores.
  - `fix_signals.py`: Rescues general signals in the database.
  - `enrich_feeds.py`: Scores feed items.

- **tests/**: Contains smoke tests for the application.
  - `test_brain.py`: Ensures functionality is working as expected.

- **brain.py**: Main entry point for the application.

- **requirements.txt**: Lists the dependencies required for the project.

- **pyproject.toml**: Configuration file for the project.

## Setup Instructions
1. Clone the repository.
2. Navigate to the project directory.
3. Install the required dependencies using:
   ```
   pip install -r requirements.txt
   ```
4. Run the application with:
   ```
   python -X utf8 brain.py
   ```

## Usage
You can interact with the application through command-line commands. For example:
- To audit the data: `python -X utf8 brain.py audit`
- To score vendors: `python -X utf8 brain.py score [N]`
- To analyze trends: `python -X utf8 brain.py trends [industry]`

## Contribution
Contributions are welcome! Please submit a pull request with your changes.

## License
This project is licensed under the MIT License.