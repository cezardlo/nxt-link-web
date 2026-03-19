import os
import urllib.request
import json
from data import supabase as db

def fix_vendor_columns():
    # Fetch all vendors from the database
    vendors = db.select('vendors')

    for vendor in vendors:
        # Check if the vendor has the correct column names
        if 'name' in vendor:
            # Update the vendor to use the correct column name
            vendor['company_name'] = vendor.pop('name')

            # Update the vendor in the database
            db.update('vendors', vendor['id'], vendor)

if __name__ == "__main__":
    fix_vendor_columns()