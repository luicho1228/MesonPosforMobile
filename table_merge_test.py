#!/usr/bin/env python3
import requests
import json
import time
import os
import random
import string
from datetime import datetime

# Set a shorter timeout for requests to avoid gateway timeouts
requests.adapters.DEFAULT_RETRIES = 3
requests_session = requests.Session()
requests_session.request = lambda method, url, **kwargs: requests.Session.request(
    requests_session, method, url, timeout=10, **kwargs
)

# Get the backend URL from the frontend .env file
BACKEND_URL = "https://5019ac90-f84b-41e4-b986-f776bd62b398.preview.emergentagent.com"
API_URL = f"{BACKEND_URL}/api"

# Helper function to generate random string
def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

# Helper function to print test result
def print_test_result(test_name, success, details=""):
    status = "✅ PASSED" if success else "❌ FAILED"
    print(f"\n{test_name}: {status}")
    if details:
        print(f"Details: {details}")
    return success, details

def test_table_merge_functionality():
    print("\n=== Testing Table Merge Functionality ===")
    
    # Step 1: Authenticate to get token
    print("\nStep 1: Authenticating...")
    
    # Generate random pin for testing
    pin = ''.join(random.choices(string.digits, k=4))
    
    # Register a test user
    register_data = {
        "pin": pin,
        "role": "manager",
        "full_name": "Test Manager",
        "phone": "1234567890"
    }
    
    try:
        response = requests_session.post(f"{API_URL}/auth/register", json=register_data)
        response.raise_for_status()
        result = response.json()
        
        auth_token = result.get("access_token")
        user_id = result.get("user", {}).get("id")
        
        if not auth_token or not user_id:
            return print_test_result("Table Merge - Authentication", False, "Failed to get auth token or user ID")
            
        headers = {"Authorization": f"Bearer {auth_token}"}
        print(f"Authentication successful. User ID: {user_id}")
        
        # Step 2: Create two menu items for testing
        print("\nStep 2: Creating menu items...")
        
        menu_item1_data = {
            "name": f"Test Pizza {random_string(4)}",
            "description": "Delicious test pizza with extra cheese",
            "price": 12.99,
            "category": "Pizza",
            "available": True,
            "image_url": "https://example.com/pizza.jpg"
        }
        
        menu_item2_data = {
            "name": f"Test Pasta {random_string(4)}",
            "description": "Delicious test pasta with sauce",
            "price": 10.99,
            "category": "Pasta",
            "available": True,
            "image_url": "https://example.com/pasta.jpg"
        }
        
        response = requests_session.post(f"{API_URL}/menu/items", json=menu_item1_data, headers=headers)
        response.raise_for_status()
        menu_item1 = response.json()
        menu_item1_id = menu_item1.get("id")
        
        response = requests_session.post(f"{API_URL}/menu/items", json=menu_item2_data, headers=headers)
        response.raise_for_status()
        menu_item2 = response.json()
        menu_item2_id = menu_item2.get("id")
        
        print(f"Created menu items: {menu_item1.get('name')} and {menu_item2.get('name')}")
        
        # Step 3: Create two tables
        print("\nStep 3: Creating tables...")
        
        table1_number = random.randint(100, 199)
        table2_number = random.randint(200, 299)
        
        table1_data = {
            "number": table1_number,
            "name": f"Table {table1_number}",
            "capacity": 4
        }
        
        table2_data = {
            "number": table2_number,
            "name": f"Table {table2_number}",
            "capacity": 2
        }
        
        response = requests_session.post(f"{API_URL}/tables", json=table1_data, headers=headers)
        response.raise_for_status()
        table1 = response.json()
        table1_id = table1.get("id")
        
        response = requests_session.post(f"{API_URL}/tables", json=table2_data, headers=headers)
        response.raise_for_status()
        table2 = response.json()
        table2_id = table2.get("id")
        
        print(f"Created tables: Table {table1_number} (ID: {table1_id}) and Table {table2_number} (ID: {table2_id})")
        
        # Step 4: Create Order 1 with items and assign to Table 1
        print("\nStep 4: Creating Order 1 for Table 1...")
        
        order1_data = {
            "customer_name": "Table Merge Test Customer 1",
            "customer_phone": "5551234567",
            "table_id": table1_id,
            "items": [
                {
                    "menu_item_id": menu_item1_id,
                    "quantity": 2,
                    "special_instructions": "Extra cheese"
                }
            ],
            "order_type": "dine_in",
            "tip": 3.00,
            "order_notes": "Test order 1 for table merge"
        }
        
        response = requests_session.post(f"{API_URL}/orders", json=order1_data, headers=headers)
        response.raise_for_status()
        order1 = response.json()
        order1_id = order1.get("id")
        
        # Send Order 1 to kitchen to make Table 1 occupied
        response = requests_session.post(f"{API_URL}/orders/{order1_id}/send", headers=headers)
        response.raise_for_status()
        
        # Verify Table 1 is now occupied with Order 1
        response = requests_session.get(f"{API_URL}/tables", headers=headers)
        response.raise_for_status()
        tables = response.json()
        
        table1_occupied = False
        for table in tables:
            if table.get("id") == table1_id:
                if table.get("status") == "occupied" and table.get("current_order_id") == order1_id:
                    table1_occupied = True
                    break
        
        if not table1_occupied:
            return print_test_result("Table Merge - Table 1 Occupation", False, "Table 1 not properly occupied with Order 1")
            
        print(f"Created Order 1 (ID: {order1_id}) and assigned to Table {table1_number}")
        
        # Step 5: Create Order 2 with different items and assign to Table 2
        print("\nStep 5: Creating Order 2 for Table 2...")
        
        order2_data = {
            "customer_name": "Table Merge Test Customer 2",
            "customer_phone": "5559876543",
            "table_id": table2_id,
            "items": [
                {
                    "menu_item_id": menu_item2_id,
                    "quantity": 1,
                    "special_instructions": "Extra sauce"
                }
            ],
            "order_type": "dine_in",
            "tip": 2.00,
            "order_notes": "Test order 2 for table merge"
        }
        
        response = requests_session.post(f"{API_URL}/orders", json=order2_data, headers=headers)
        response.raise_for_status()
        order2 = response.json()
        order2_id = order2.get("id")
        
        # Send Order 2 to kitchen to make Table 2 occupied
        response = requests_session.post(f"{API_URL}/orders/{order2_id}/send", headers=headers)
        response.raise_for_status()
        
        # Verify Table 2 is now occupied with Order 2
        response = requests_session.get(f"{API_URL}/tables", headers=headers)
        response.raise_for_status()
        tables = response.json()
        
        table2_occupied = False
        for table in tables:
            if table.get("id") == table2_id:
                if table.get("status") == "occupied" and table.get("current_order_id") == order2_id:
                    table2_occupied = True
                    break
        
        if not table2_occupied:
            return print_test_result("Table Merge - Table 2 Occupation", False, "Table 2 not properly occupied with Order 2")
            
        print(f"Created Order 2 (ID: {order2_id}) and assigned to Table {table2_number}")
        
        # Get order details before merge for comparison
        response = requests_session.get(f"{API_URL}/orders/{order1_id}", headers=headers)
        response.raise_for_status()
        order1_before_merge = response.json()
        
        response = requests_session.get(f"{API_URL}/orders/{order2_id}", headers=headers)
        response.raise_for_status()
        order2_before_merge = response.json()
        
        # Calculate expected totals after merge
        expected_subtotal = order1_before_merge.get("subtotal", 0) + order2_before_merge.get("subtotal", 0)
        expected_tax = expected_subtotal * 0.08  # 8% tax rate
        expected_tip = order1_before_merge.get("tip", 0) + order2_before_merge.get("tip", 0)
        expected_total = expected_subtotal + expected_tax + expected_tip
        expected_item_count = len(order1_before_merge.get("items", [])) + len(order2_before_merge.get("items", []))
        
        print(f"\nBefore merge:")
        print(f"Order 1 - Subtotal: ${order1_before_merge.get('subtotal', 0):.2f}, Tip: ${order1_before_merge.get('tip', 0):.2f}, Items: {len(order1_before_merge.get('items', []))}")
        print(f"Order 2 - Subtotal: ${order2_before_merge.get('subtotal', 0):.2f}, Tip: ${order2_before_merge.get('tip', 0):.2f}, Items: {len(order2_before_merge.get('items', []))}")
        print(f"Expected after merge - Subtotal: ${expected_subtotal:.2f}, Tip: ${expected_tip:.2f}, Items: {expected_item_count}")
        
        # Step 6: Test merging Order 2 into Order 1's table (Table 1)
        print("\nStep 6: Merging Order 2 into Order 1...")
        
        merge_data = {
            "new_table_id": table1_id
        }
        
        response = requests_session.post(f"{API_URL}/tables/{table2_id}/merge", json=merge_data, headers=headers)
        response.raise_for_status()
        merge_result = response.json()
        
        print(f"Merge result: {merge_result.get('message')}")
        
        # Step 7: Verify the results of the merge
        print("\nStep 7: Verifying merge results...")
        
        # 7.1: Verify Order 1 now contains items from both orders
        response = requests_session.get(f"{API_URL}/orders/{order1_id}", headers=headers)
        response.raise_for_status()
        order1_after_merge = response.json()
        
        merged_items_count = len(order1_after_merge.get("items", []))
        merged_subtotal = order1_after_merge.get("subtotal", 0)
        merged_tax = order1_after_merge.get("tax", 0)
        merged_tip = order1_after_merge.get("tip", 0)
        merged_total = order1_after_merge.get("total", 0)
        
        print(f"\nAfter merge:")
        print(f"Order 1 - Subtotal: ${merged_subtotal:.2f}, Tax: ${merged_tax:.2f}, Tip: ${merged_tip:.2f}, Total: ${merged_total:.2f}, Items: {merged_items_count}")
        
        # Check if items were merged correctly
        if merged_items_count != expected_item_count:
            return print_test_result("Table Merge - Item Merging", False, 
                                    f"Expected {expected_item_count} items after merge, but got {merged_items_count}")
        
        # Check if totals were calculated correctly
        if abs(merged_subtotal - expected_subtotal) > 0.01:
            return print_test_result("Table Merge - Subtotal Calculation", False, 
                                    f"Expected subtotal ${expected_subtotal:.2f}, but got ${merged_subtotal:.2f}")
        
        if abs(merged_tax - expected_tax) > 0.01:
            return print_test_result("Table Merge - Tax Calculation", False, 
                                    f"Expected tax ${expected_tax:.2f}, but got ${merged_tax:.2f}")
        
        # Check if tips were merged correctly
        expected_tip_total = order1_before_merge.get("tip", 0) + order2_before_merge.get("tip", 0)
        if abs(merged_tip - expected_tip_total) > 0.01:
            return print_test_result("Table Merge - Tip Calculation", False, 
                                    f"Expected tip ${expected_tip_total:.2f}, but got ${merged_tip:.2f}")
        
        # The expected total should be subtotal + tax + tip
        corrected_expected_total = expected_subtotal + expected_tax + merged_tip
        if abs(merged_total - corrected_expected_total) > 0.01:
            return print_test_result("Table Merge - Total Calculation", False, 
                                    f"Expected total ${corrected_expected_total:.2f}, but got ${merged_total:.2f}")
        
        # 7.2: Verify Order 2 is deleted
        try:
            response = requests_session.get(f"{API_URL}/orders/{order2_id}", headers=headers)
            if response.status_code != 404:
                return print_test_result("Table Merge - Order Deletion", False, 
                                        f"Order 2 still exists with status code {response.status_code}")
        except requests.exceptions.RequestException:
            # Expected exception if order is deleted
            pass
        
        # 7.3: Verify Table 2 becomes available
        response = requests_session.get(f"{API_URL}/tables", headers=headers)
        response.raise_for_status()
        tables_after_merge = response.json()
        
        table2_available = False
        for table in tables_after_merge:
            if table.get("id") == table2_id:
                if table.get("status") == "available" and table.get("current_order_id") is None:
                    table2_available = True
                    break
        
        if not table2_available:
            return print_test_result("Table Merge - Table 2 Status", False, "Table 2 not properly set to available after merge")
        
        # 7.4: Verify Table 1 remains occupied with the merged order
        table1_still_occupied = False
        for table in tables_after_merge:
            if table.get("id") == table1_id:
                if table.get("status") == "occupied" and table.get("current_order_id") == order1_id:
                    table1_still_occupied = True
                    break
        
        if not table1_still_occupied:
            return print_test_result("Table Merge - Table 1 Status", False, "Table 1 not properly maintained as occupied after merge")
        
        # All verifications passed
        return print_test_result("Table Merge Functionality", True, 
                                "Successfully verified table merge functionality: items merged, totals calculated correctly, order deleted, and table statuses updated properly")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Table merge test failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("Table Merge Functionality", False, error_msg)

if __name__ == "__main__":
    test_table_merge_functionality()