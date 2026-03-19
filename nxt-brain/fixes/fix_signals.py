import os
import json
from data import supabase as db

def rescue_general_signals():
    # Fetch general signals from the database
    signals = db.select("intel_signals", {"category": "general"})
    
    # Process and update signals
    for signal in signals:
        # Example logic to update signal data
        if signal['status'] == 'unprocessed':
            signal['status'] = 'processed'
            db.update("intel_signals", signal['id'], signal)

    print(f"Rescued {len(signals)} general signals.")

if __name__ == "__main__":
    rescue_general_signals()