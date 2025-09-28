#!/usr/bin/env python3
import requests
import json
import time
import os
import random
import string
from datetime import datetime

# Get the backend URL from the frontend .env file
BACKEND_URL = "https://app-decompose.preview.emergentagent.com"
API_URL = f"{BACKEND_URL}/api"

def analyze_merge_endpoint():
    """Analyze the table merge endpoint implementation in server.py"""
    
    print("\n=== Analyzing Table Merge Functionality ===")
    
    # The merge endpoint is implemented in server.py lines 620-676
    print("\nMerge Endpoint Implementation Analysis:")
    
    print("1. Endpoint: POST /api/tables/{table_id}/merge")
    print("2. Required Request Body: { 'new_table_id': 'destination_table_id' }")
    print("3. Authentication: Required (JWT token)")
    
    print("\nMerge Process:")
    print("1. Validates source table has an order")
    print("2. Validates destination table exists")
    print("3. Validates destination table is occupied with an order")
    print("4. Retrieves both orders")
    print("5. Merges items from source order into destination order")
    print("6. Recalculates totals:")
    print("   - Adds subtotals from both orders")
    print("   - Calculates tax as 8% of combined subtotal")
    print("   - Sets total as subtotal + tax")
    print("7. Updates destination order with merged items and new totals")
    print("8. Deletes source order")
    print("9. Sets source table to available with no current order")
    
    print("\nIssue Identified:")
    print("The merge operation does not combine tips from both orders.")
    print("In server.py lines 647-651, the calculation is:")
    print("   total_subtotal = dest_order['subtotal'] + source_order['subtotal']")
    print("   total_tax = total_subtotal * 0.08")
    print("   total_amount = total_subtotal + total_tax")
    print("Missing: total_tip = dest_order['tip'] + source_order['tip']")
    print("Missing: total_amount should include total_tip")
    
    print("\nExpected Behavior:")
    print("When merging orders, the tips from both orders should be combined.")
    print("The total should be calculated as: subtotal + tax + combined_tips")
    
    print("\nRecommended Fix:")
    print("Update the merge endpoint implementation to include tip calculation:")
    print("   total_subtotal = dest_order['subtotal'] + source_order['subtotal']")
    print("   total_tax = total_subtotal * 0.08")
    print("   total_tip = dest_order.get('tip', 0) + source_order.get('tip', 0)")
    print("   total_amount = total_subtotal + total_tax + total_tip")
    print("   Update destination order with all these values including total_tip")
    
    return True

if __name__ == "__main__":
    analyze_merge_endpoint()