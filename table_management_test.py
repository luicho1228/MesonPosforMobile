#!/usr/bin/env python3
import requests
import json
import time
import os
from datetime import datetime
import random
import string

# Get the backend URL from the frontend .env file
BACKEND_URL = "https://8a0df572-7e4c-4714-a7d2-3d0aeb1b665e.preview.emergentagent.com"
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

# Test Table Management Bug Fix - Current Order ID
def test_table_management_current_order_id():
    print("\n=== Testing Table Management Bug Fix - Current Order ID ===")
    
    # Step 1: Login to get auth token
    print("\nStep 1: Logging in to get auth token...")
    login_data = {
        "pin": "1234"  # Using demo admin credentials
    }
    
    try:
        response = requests.post(f"{API_URL}/auth/login", json=login_data)
        response.raise_for_status()
        result = response.json()
        
        auth_token = result.get("access_token")
        user_id = result.get("user", {}).get("id")
        
        if not auth_token or not user_id:
            return print_test_result("Table Management Bug Fix", False, "Failed to get auth token or user ID")
            
        print(f"Logged in successfully with user ID: {user_id}")
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Step 2: Get all tables and verify current_order_id field exists
        print("\nStep 2: Getting all tables to verify current_order_id field exists...")
        response = requests.get(f"{API_URL}/tables")
        response.raise_for_status()
        tables = response.json()
        
        if not tables:
            # Create a table if none exists
            print("No tables found. Creating a test table...")
            table_data = {
                "number": random.randint(1, 100),
                "capacity": 4
            }
            response = requests.post(f"{API_URL}/tables", json=table_data, headers=headers)
            response.raise_for_status()
            new_table = response.json()
            tables = [new_table]
            print(f"Created test table with number: {new_table['number']}")
        
        # Check if current_order_id field exists in table model
        sample_table = tables[0]
        if "current_order_id" not in sample_table:
            return print_test_result("Table Management Bug Fix", False, "current_order_id field not found in table model")
            
        print(f"Found {len(tables)} tables. current_order_id field exists in table model.")
        
        # Find an available table for testing
        available_table = None
        for table in tables:
            if table["status"] == "available":
                available_table = table
                break
                
        if not available_table:
            # Make a table available if none is available
            print("No available tables found. Making a table available...")
            table_id = tables[0]["id"]
            update_data = {
                "status": "available",
                "current_order_id": None
            }
            response = requests.put(f"{API_URL}/tables/{table_id}", json=update_data, headers=headers)
            response.raise_for_status()
            available_table = response.json()
            print(f"Made table {available_table['number']} available for testing.")
        
        print(f"Using table {available_table['number']} (ID: {available_table['id']}) for testing.")
        
        # Step 3: Create a new dine-in order for the table
        print("\nStep 3: Creating a new dine-in order for the table...")
        
        # First, create a menu item if needed
        print("Checking for menu items...")
        response = requests.get(f"{API_URL}/menu/items")
        response.raise_for_status()
        menu_items = response.json()
        
        menu_item_id = None
        if menu_items:
            menu_item_id = menu_items[0]["id"]
            print(f"Using existing menu item: {menu_items[0]['name']} (ID: {menu_item_id})")
        else:
            # Create a menu item
            print("No menu items found. Creating a test menu item...")
            menu_item_data = {
                "name": f"Test Item {random_string(4)}",
                "description": "Test item for table management testing",
                "price": 9.99,
                "category": "Test",
                "available": True
            }
            response = requests.post(f"{API_URL}/menu/items", json=menu_item_data, headers=headers)
            response.raise_for_status()
            new_menu_item = response.json()
            menu_item_id = new_menu_item["id"]
            print(f"Created test menu item: {new_menu_item['name']} (ID: {menu_item_id})")
        
        # Create the dine-in order
        order_data = {
            "customer_name": "Table Test Customer",
            "customer_phone": "",
            "customer_address": "",
            "table_id": available_table["id"],
            "items": [
                {
                    "menu_item_id": menu_item_id,
                    "quantity": 1,
                    "modifiers": []
                }
            ],
            "order_type": "dine_in",
            "tip": 0,
            "delivery_instructions": "",
            "order_notes": "Table management test order"
        }
        
        response = requests.post(f"{API_URL}/orders", json=order_data, headers=headers)
        response.raise_for_status()
        order = response.json()
        order_id = order["id"]
        
        print(f"Created dine-in order with ID: {order_id}")
        
        # Step 4: Send order to kitchen (should set table status to occupied and current_order_id)
        print("\nStep 4: Sending order to kitchen...")
        response = requests.post(f"{API_URL}/orders/{order_id}/send", headers=headers)
        response.raise_for_status()
        send_result = response.json()
        
        print(f"Order sent to kitchen: {send_result.get('message')}")
        
        # Step 5: Get tables and verify that table shows status=occupied and current_order_id is populated
        print("\nStep 5: Verifying table status and current_order_id...")
        response = requests.get(f"{API_URL}/tables")
        response.raise_for_status()
        updated_tables = response.json()
        
        # Find our table
        test_table = None
        for table in updated_tables:
            if table["id"] == available_table["id"]:
                test_table = table
                break
                
        if not test_table:
            return print_test_result("Table Management Bug Fix", False, "Could not find test table after sending order")
            
        print(f"Table {test_table['number']} status: {test_table['status']}")
        print(f"Table {test_table['number']} current_order_id: {test_table['current_order_id']}")
        
        if test_table["status"] != "occupied":
            return print_test_result("Table Management Bug Fix", False, f"Table status not set to 'occupied' (current: {test_table['status']})")
            
        if test_table["current_order_id"] != order_id:
            return print_test_result("Table Management Bug Fix", False, f"Table current_order_id not set correctly (expected: {order_id}, got: {test_table['current_order_id']})")
            
        # Step 6: Get order using the current_order_id to verify order exists
        print("\nStep 6: Verifying order exists using current_order_id...")
        response = requests.get(f"{API_URL}/orders/{test_table['current_order_id']}", headers=headers)
        response.raise_for_status()
        retrieved_order = response.json()
        
        if retrieved_order["id"] != order_id:
            return print_test_result("Table Management Bug Fix", False, "Retrieved order ID does not match original order ID")
            
        print(f"Successfully retrieved order using current_order_id: {retrieved_order['order_number']}")
        
        # Step 7: Test edge case - payment completion clears current_order_id
        print("\nStep 7: Testing payment completion clears current_order_id...")
        payment_data = {
            "payment_method": "cash",
            "cash_received": 20.00,
            "print_receipt": True
        }
        
        response = requests.post(f"{API_URL}/orders/{order_id}/pay", json=payment_data, headers=headers)
        response.raise_for_status()
        payment_result = response.json()
        
        print(f"Payment processed: {payment_result.get('message')}")
        
        # Verify table is available and current_order_id is cleared
        response = requests.get(f"{API_URL}/tables")
        response.raise_for_status()
        tables_after_payment = response.json()
        
        # Find our table again
        paid_table = None
        for table in tables_after_payment:
            if table["id"] == available_table["id"]:
                paid_table = table
                break
                
        if not paid_table:
            return print_test_result("Table Management Bug Fix", False, "Could not find test table after payment")
            
        print(f"Table {paid_table['number']} status after payment: {paid_table['status']}")
        print(f"Table {paid_table['number']} current_order_id after payment: {paid_table['current_order_id']}")
        
        if paid_table["status"] != "available":
            return print_test_result("Table Management Bug Fix", False, f"Table status not set to 'available' after payment (current: {paid_table['status']})")
            
        if paid_table["current_order_id"] is not None:
            return print_test_result("Table Management Bug Fix", False, f"Table current_order_id not cleared after payment (current: {paid_table['current_order_id']})")
            
        # Step 8: Test edge case - order cancellation clears current_order_id
        print("\nStep 8: Testing order cancellation clears current_order_id...")
        
        # Create another order
        response = requests.post(f"{API_URL}/orders", json=order_data, headers=headers)
        response.raise_for_status()
        new_order = response.json()
        new_order_id = new_order["id"]
        
        print(f"Created another dine-in order with ID: {new_order_id}")
        
        # Send to kitchen
        response = requests.post(f"{API_URL}/orders/{new_order_id}/send", headers=headers)
        response.raise_for_status()
        
        # Verify table is occupied with new order
        response = requests.get(f"{API_URL}/tables")
        response.raise_for_status()
        tables_with_new_order = response.json()
        
        # Find our table
        new_order_table = None
        for table in tables_with_new_order:
            if table["id"] == available_table["id"]:
                new_order_table = table
                break
                
        print(f"Table {new_order_table['number']} status with new order: {new_order_table['status']}")
        print(f"Table {new_order_table['number']} current_order_id with new order: {new_order_table['current_order_id']}")
        
        # Cancel the order
        cancellation_data = {
            "reason": "customer_canceled",
            "notes": "Testing cancellation"
        }
        
        response = requests.post(f"{API_URL}/orders/{new_order_id}/cancel", json=cancellation_data, headers=headers)
        response.raise_for_status()
        cancel_result = response.json()
        
        print(f"Order cancelled: {cancel_result.get('message')}")
        
        # Verify table is available and current_order_id is cleared
        response = requests.get(f"{API_URL}/tables")
        response.raise_for_status()
        tables_after_cancel = response.json()
        
        # Find our table again
        cancelled_table = None
        for table in tables_after_cancel:
            if table["id"] == available_table["id"]:
                cancelled_table = table
                break
                
        if not cancelled_table:
            return print_test_result("Table Management Bug Fix", False, "Could not find test table after cancellation")
            
        print(f"Table {cancelled_table['number']} status after cancellation: {cancelled_table['status']}")
        print(f"Table {cancelled_table['number']} current_order_id after cancellation: {cancelled_table['current_order_id']}")
        
        if cancelled_table["status"] != "available":
            return print_test_result("Table Management Bug Fix", False, f"Table status not set to 'available' after cancellation (current: {cancelled_table['status']})")
            
        if cancelled_table["current_order_id"] is not None:
            return print_test_result("Table Management Bug Fix", False, f"Table current_order_id not cleared after cancellation (current: {cancelled_table['current_order_id']})")
            
        return print_test_result("Table Management Bug Fix", True, "All table management tests passed successfully. The current_order_id field is properly implemented and working as expected.")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Table management test failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("Table Management Bug Fix", False, error_msg)

if __name__ == "__main__":
    test_table_management_current_order_id()