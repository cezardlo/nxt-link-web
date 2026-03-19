import os
import json
from data import supabase as db

def enrich_feed_items():
    # Fetch unprocessed feed items
    unprocessed_items = db.select('feed_items', {'score': 5})

    for item in unprocessed_items:
        # Enrich the feed item (dummy enrichment logic)
        enriched_item = {
            'id': item['id'],
            'title': item['title'],
            'description': item['description'],
            'enriched_data': 'Enriched data based on some logic'
        }

        # Update the feed item with a new score
        db.update('feed_items', enriched_item['id'], {'score': 10, 'enriched_data': enriched_item['enriched_data']})

if __name__ == "__main__":
    enrich_feed_items()