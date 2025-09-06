#!/usr/bin/env python3
import requests
import json
import time
import os
import random
import string
from datetime import datetime

# Get the backend URL from the frontend .env file
BACKEND_URL = "https://pos-refactor.preview.emergentagent.com"
API_URL = f"{BACKEND_URL}/api"

def test_table_merge_fix():
    """Test the fix for the table merge functionality"""
    
    print("\n=== Testing Table Merge Fix ===")
    
    # Step 1: Login with existing user
    print("\nStep 1: Authenticating...")
    
    login_data = {
        "pin": "1234"  # Using the default manager PIN
    }
    
    try:
        response = requests.post(f"{API_URL}/auth/login", json=login_data, timeout=10)
        response.raise_for_status()
        result = response.json()
        
        auth_token = result.get("access_token")
        user_id = result.get("user", {}).get("id")
        
        if not auth_token or not user_id:
            print("❌ FAILED: Authentication failed - could not get token")
            return False
            
        headers = {"Authorization": f"Bearer {auth_token}"}
        print(f"Authentication successful. User ID: {user_id}")
        
        # Step 2: Create a menu item for testing
        print("\nStep 2: Creating menu item...")
        
        menu_item_data = {
            "name": f"Test Item {random.randint(1000, 9999)}",
            "description": "Test item for merge fix",
            "price": 10.00,
            "category": "Test",
            "available": True
        }
        
        response = requests.post(f"{API_URL}/menu/items", json=menu_item_data, headers=headers, timeout=10)
        response.raise_for_status()
        menu_item = response.json()
        menu_item_id = menu_item.get("id")
        
        print(f"Created menu item: {menu_item.get('name')} (ID: {menu_item_id})")
        
        # Step 3: Create two tables
        print("\nStep 3: Creating tables...")
        
        table1_data = {
            "number": random.randint(1000, 1999),
            "capacity": 4
        }
        
        table2_data = {
            "number": random.randint(2000, 2999),
            "capacity": 2
        }
        
        response = requests.post(f"{API_URL}/tables", json=table1_data, headers=headers, timeout=10)
        response.raise_for_status()
        table1 = response.json()
        table1_id = table1.get("id")
        
        response = requests.post(f"{API_URL}/tables", json=table2_data, headers=headers, timeout=10)
        response.raise_for_status()
        table2 = response.json()
        table2_id = table2.get("id")
        
        print(f"Created tables: Table {table1_data['number']} (ID: {table1_id}) and Table {table2_data['number']} (ID: {table2_id})")
        
        # Step 4: Create two orders with tips
        print("\nStep 4: Creating orders with tips...")
        
        # Order 1 with $3.00 tip
        order1_data = {
            "customer_name": "Tip Test Customer 1",
            "table_id": table1_id,
            "items": [
                {
                    "menu_item_id": menu_item_id,
                    "quantity": 1
                }
            ],
            "order_type": "dine_in",
            "tip": 3.00
        }
        
        # Order 2 with $2.00 tip
        order2_data = {
            "customer_name": "Tip Test Customer 2",
            "table_id": table2_id,
            "items": [
                {
                    "menu_item_id": menu_item_id,
                    "quantity": 1
                }
            ],
            "order_type": "dine_in",
            "tip": 2.00
        }
        
        response = requests.post(f"{API_URL}/orders", json=order1_data, headers=headers, timeout=10)
        response.raise_for_status()
        order1 = response.json()
        order1_id = order1.get("id")
        
        response = requests.post(f"{API_URL}/orders", json=order2_data, headers=headers, timeout=10)
        response.raise_for_status()
        order2 = response.json()
        order2_id = order2.get("id")
        
        print(f"Created Order 1 (ID: {order1_id}) with $3.00 tip")
        print(f"Created Order 2 (ID: {order2_id}) with $2.00 tip")
        
        # Step 5: Send orders to kitchen
        print("\nStep 5: Sending orders to kitchen...")
        
        response = requests.post(f"{API_URL}/orders/{order1_id}/send", headers=headers, timeout=10)
        response.raise_for_status()
        
        response = requests.post(f"{API_URL}/orders/{order2_id}/send", headers=headers, timeout=10)
        response.raise_for_status()
        
        print("Both orders sent to kitchen")
        
        # Step 6: Merge orders
        print("\nStep 6: Merging orders...")
        
        merge_data = {
            "new_table_id": table1_id
        }
        
        response = requests.post(f"{API_URL}/tables/{table2_id}/merge", json=merge_data, headers=headers, timeout=10)
        response.raise_for_status()
        merge_result = response.json()
        
        print(f"Merge result: {merge_result.get('message')}")
        
        # Step 7: Verify merged order
        print("\nStep 7: Verifying merged order...")
        
        response = requests.get(f"{API_URL}/orders/{order1_id}", headers=headers, timeout=10)
        response.raise_for_status()
        merged_order = response.json()
        
        merged_subtotal = merged_order.get("subtotal", 0)
        merged_tax = merged_order.get("tax", 0)
        merged_tip = merged_order.get("tip", 0)
        merged_total = merged_order.get("total", 0)
        
        print(f"Merged Order - Subtotal: ${merged_subtotal:.2f}, Tax: ${merged_tax:.2f}, Tip: ${merged_tip:.2f}, Total: ${merged_total:.2f}")
        
        # Verify tip is combined
        expected_tip = 3.00 + 2.00
        if abs(merged_tip - expected_tip) > 0.01:
            print(f"❌ FAILED: Tip not combined correctly. Expected: ${expected_tip:.2f}, Got: ${merged_tip:.2f}")
            return False
        
        # Verify total includes combined tip
        expected_total = merged_subtotal + merged_tax + expected_tip
        if abs(merged_total - expected_total) > 0.01:
            print(f"❌ FAILED: Total not calculated correctly. Expected: ${expected_total:.2f}, Got: ${merged_total:.2f}")
            return False
        
        print("\n✅ PASSED: Table Merge Fix")
        print(f"Tips combined correctly: ${merged_tip:.2f}")
        print(f"Total calculated correctly: ${merged_total:.2f}")
        
        return True
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Test failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        print(f"❌ FAILED: {error_msg}")
        return False

if __name__ == "__main__":
    test_table_merge_fix()