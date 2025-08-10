#!/usr/bin/env python3
import requests
import json
import time
import os
from datetime import datetime
import random
import string

# Get the backend URL from the frontend .env file
BACKEND_URL = "https://5c6211d0-c981-4aa6-b05c-67ca512180a7.preview.emergentagent.com"
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

# Global variables to store test data
auth_token = None
user_id = None
menu_item_id = None
table_id = None
order_id = None

# 1. Test Authentication (Login with demo admin)
def test_authentication():
    global auth_token, user_id
    print("\n=== Testing Authentication ===")
    
    # Use demo admin credentials
    login_data = {
        "pin": "1234"  # Demo admin PIN
    }
    
    try:
        response = requests.post(f"{API_URL}/auth/login", json=login_data)
        response.raise_for_status()
        result = response.json()
        
        auth_token = result.get("access_token")
        user_id = result.get("user", {}).get("id")
        
        print(f"Admin logged in successfully with ID: {user_id}")
        print(f"Auth token received: {auth_token[:10]}...")
        
        if not auth_token or not user_id:
            return print_test_result("Authentication", False, "Failed to get auth token or user ID")
        
        return print_test_result("Authentication", True, "Login successful")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Authentication test failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("Authentication", False, error_msg)

# 2. Test Menu Item Creation (for order)
def test_create_menu_item():
    global menu_item_id, auth_token
    print("\n=== Creating Test Menu Item ===")
    
    if not auth_token:
        return print_test_result("Create Menu Item", False, "No auth token available")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    menu_item_data = {
        "name": f"Test Item {random_string(4)}",
        "description": "Test item for order cancellation test",
        "price": 9.99,
        "category": "Test",
        "available": True,
        "image_url": "",
        "modifier_groups": []
    }
    
    try:
        response = requests.post(f"{API_URL}/menu/items", json=menu_item_data, headers=headers)
        response.raise_for_status()
        result = response.json()
        
        menu_item_id = result.get("id")
        print(f"Menu item created with ID: {menu_item_id}")
        
        if not menu_item_id:
            return print_test_result("Create Menu Item", False, "Failed to get menu item ID")
        
        return print_test_result("Create Menu Item", True, "Menu item created successfully")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Menu item creation failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("Create Menu Item", False, error_msg)

# 3. Test Table Creation
def test_create_table():
    global table_id, auth_token
    print("\n=== Creating Test Table ===")
    
    if not auth_token:
        return print_test_result("Create Table", False, "No auth token available")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Generate a random table number to avoid conflicts
    table_number = random.randint(100, 999)
    
    table_data = {
        "number": table_number,
        "capacity": 4
    }
    
    try:
        response = requests.post(f"{API_URL}/tables", json=table_data, headers=headers)
        response.raise_for_status()
        result = response.json()
        
        table_id = result.get("id")
        print(f"Table created with ID: {table_id} and number: {table_number}")
        
        if not table_id:
            return print_test_result("Create Table", False, "Failed to get table ID")
        
        return print_test_result("Create Table", True, "Table created successfully")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Table creation failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("Create Table", False, error_msg)

# 4. Test Order Creation (dine-in order for the table)
def test_create_order():
    global order_id, auth_token, menu_item_id, table_id
    print("\n=== Creating Test Order ===")
    
    if not auth_token or not menu_item_id or not table_id:
        return print_test_result("Create Order", False, "Missing required test data")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    order_data = {
        "customer_name": "Test Customer",
        "customer_phone": "",
        "customer_address": "",
        "table_id": table_id,
        "items": [
            {
                "menu_item_id": menu_item_id,
                "quantity": 1,
                "modifiers": [],
                "special_instructions": ""
            }
        ],
        "order_type": "dine_in",
        "tip": 0.0,
        "delivery_instructions": "",
        "order_notes": "Test order for cancellation test"
    }
    
    try:
        response = requests.post(f"{API_URL}/orders", json=order_data, headers=headers)
        response.raise_for_status()
        result = response.json()
        
        order_id = result.get("id")
        print(f"Order created with ID: {order_id}")
        
        if not order_id:
            return print_test_result("Create Order", False, "Failed to get order ID")
        
        return print_test_result("Create Order", True, "Order created successfully")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Order creation failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("Create Order", False, error_msg)

# 5. Test Send Order to Kitchen (makes table occupied)
def test_send_order_to_kitchen():
    global order_id, auth_token, table_id
    print("\n=== Sending Order to Kitchen ===")
    
    if not auth_token or not order_id:
        return print_test_result("Send Order to Kitchen", False, "Missing required test data")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    try:
        response = requests.post(f"{API_URL}/orders/{order_id}/send", headers=headers)
        response.raise_for_status()
        result = response.json()
        
        print(f"Order sent to kitchen: {result.get('message')}")
        
        # Verify table status is now occupied
        response = requests.get(f"{API_URL}/tables", headers=headers)
        response.raise_for_status()
        tables = response.json()
        
        table = next((t for t in tables if t.get("id") == table_id), None)
        if not table:
            return print_test_result("Send Order to Kitchen", False, "Table not found")
        
        if table.get("status") != "occupied":
            return print_test_result("Send Order to Kitchen", False, f"Table status is {table.get('status')}, expected 'occupied'")
        
        if table.get("current_order_id") != order_id:
            return print_test_result("Send Order to Kitchen", False, "Table current_order_id not set correctly")
        
        print(f"Table status: {table.get('status')}")
        print(f"Table current_order_id: {table.get('current_order_id')}")
        
        return print_test_result("Send Order to Kitchen", True, "Order sent to kitchen and table status updated correctly")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Send order to kitchen failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("Send Order to Kitchen", False, error_msg)

# 6. Test Order Cancellation with "other" reason
def test_cancel_order():
    global order_id, auth_token, table_id
    print("\n=== Testing Order Cancellation ===")
    
    if not auth_token or not order_id:
        return print_test_result("Cancel Order", False, "Missing required test data")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    cancellation_data = {
        "reason": "other",  # Using "other" as the valid reason
        "notes": "Table X cancelled via table management"
    }
    
    try:
        response = requests.post(f"{API_URL}/orders/{order_id}/cancel", json=cancellation_data, headers=headers)
        response.raise_for_status()
        result = response.json()
        
        print(f"Order cancellation result: {result.get('message')}")
        print(f"Cancellation info: {result.get('cancellation_info')}")
        
        # Verify order status is now cancelled
        response = requests.get(f"{API_URL}/orders/{order_id}", headers=headers)
        response.raise_for_status()
        order = response.json()
        
        if order.get("status") != "cancelled":
            return print_test_result("Cancel Order", False, f"Order status is {order.get('status')}, expected 'cancelled'")
        
        print(f"Order status after cancellation: {order.get('status')}")
        
        return print_test_result("Cancel Order", True, "Order cancelled successfully with 'other' reason")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Order cancellation failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("Cancel Order", False, error_msg)

# 7. Test Table Status After Cancellation
def test_table_status_after_cancellation():
    global table_id, auth_token
    print("\n=== Testing Table Status After Cancellation ===")
    
    if not auth_token or not table_id:
        return print_test_result("Table Status After Cancellation", False, "Missing required test data")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    try:
        response = requests.get(f"{API_URL}/tables", headers=headers)
        response.raise_for_status()
        tables = response.json()
        
        table = next((t for t in tables if t.get("id") == table_id), None)
        if not table:
            return print_test_result("Table Status After Cancellation", False, "Table not found")
        
        if table.get("status") != "available":
            return print_test_result("Table Status After Cancellation", False, f"Table status is {table.get('status')}, expected 'available'")
        
        if table.get("current_order_id") is not None:
            return print_test_result("Table Status After Cancellation", False, f"Table current_order_id is {table.get('current_order_id')}, expected null")
        
        print(f"Table status after cancellation: {table.get('status')}")
        print(f"Table current_order_id after cancellation: {table.get('current_order_id')}")
        
        return print_test_result("Table Status After Cancellation", True, "Table status updated correctly after cancellation")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Table status check failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("Table Status After Cancellation", False, error_msg)

# 8. Test Table Update Endpoint
def test_table_update():
    global table_id, auth_token
    print("\n=== Testing Table Update Endpoint ===")
    
    if not auth_token or not table_id:
        return print_test_result("Table Update", False, "Missing required test data")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # First, make sure the table is in a known state
    update_data = {
        "status": "occupied",
        "current_order_id": "test-order-id"
    }
    
    try:
        # Set table to occupied with a test order ID
        response = requests.put(f"{API_URL}/tables/{table_id}", json=update_data, headers=headers)
        response.raise_for_status()
        
        # Now test updating to available with null current_order_id
        update_data = {
            "status": "available",
            "current_order_id": None
        }
        
        response = requests.put(f"{API_URL}/tables/{table_id}", json=update_data, headers=headers)
        response.raise_for_status()
        result = response.json()
        
        if result.get("status") != "available":
            return print_test_result("Table Update", False, f"Table status is {result.get('status')}, expected 'available'")
        
        if result.get("current_order_id") is not None:
            return print_test_result("Table Update", False, f"Table current_order_id is {result.get('current_order_id')}, expected null")
        
        print(f"Table status after update: {result.get('status')}")
        print(f"Table current_order_id after update: {result.get('current_order_id')}")
        
        return print_test_result("Table Update", True, "Table updated successfully to available with null current_order_id")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Table update failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("Table Update", False, error_msg)

# 9. Test Complete Workflow
def test_complete_workflow():
    global auth_token, menu_item_id, table_id, order_id
    print("\n=== Testing Complete Workflow ===")
    
    if not auth_token:
        return print_test_result("Complete Workflow", False, "No auth token available")
    
    # Reset global variables for a fresh test
    menu_item_id = None
    table_id = None
    order_id = None
    
    # Step 1: Create menu item
    menu_success, _ = test_create_menu_item()
    if not menu_success:
        return print_test_result("Complete Workflow", False, "Failed to create menu item")
    
    # Step 2: Create table
    table_success, _ = test_create_table()
    if not table_success:
        return print_test_result("Complete Workflow", False, "Failed to create table")
    
    # Step 3: Create dine-in order
    order_success, _ = test_create_order()
    if not order_success:
        return print_test_result("Complete Workflow", False, "Failed to create order")
    
    # Step 4: Send to kitchen (table becomes occupied)
    kitchen_success, _ = test_send_order_to_kitchen()
    if not kitchen_success:
        return print_test_result("Complete Workflow", False, "Failed to send order to kitchen")
    
    # Step 5: Cancel order
    cancel_success, _ = test_cancel_order()
    if not cancel_success:
        return print_test_result("Complete Workflow", False, "Failed to cancel order")
    
    # Step 6: Verify table status after cancellation
    table_status_success, _ = test_table_status_after_cancellation()
    if not table_status_success:
        return print_test_result("Complete Workflow", False, "Table status not updated correctly after cancellation")
    
    return print_test_result("Complete Workflow", True, "Complete workflow tested successfully")

# Run all tests
def run_all_tests():
    print("\n========================================")
    print("ORDER CANCELLATION API FIX TEST SUITE")
    print("========================================")
    print(f"Testing against API URL: {API_URL}")
    print("Starting tests at:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("========================================\n")
    
    # Test results
    test_results = {
        "Authentication": {"success": False, "details": ""},
        "Order Cancel Endpoint": {"success": False, "details": ""},
        "Table Update Endpoint": {"success": False, "details": ""},
        "Complete Workflow": {"success": False, "details": ""}
    }
    
    # Run authentication test
    auth_success, auth_details = test_authentication()
    test_results["Authentication"]["success"] = auth_success
    test_results["Authentication"]["details"] = auth_details
    
    if auth_success:
        # Test order cancel endpoint
        cancel_success, cancel_details = test_cancel_order()
        if not cancel_success:
            # If direct cancel fails, we need to create an order first
            # Create menu item, table, order, and send to kitchen
            test_create_menu_item()
            test_create_table()
            test_create_order()
            test_send_order_to_kitchen()
            
            # Now try cancelling again
            cancel_success, cancel_details = test_cancel_order()
        
        test_results["Order Cancel Endpoint"]["success"] = cancel_success
        test_results["Order Cancel Endpoint"]["details"] = cancel_details
        
        # Test table update endpoint
        table_update_success, table_update_details = test_table_update()
        test_results["Table Update Endpoint"]["success"] = table_update_success
        test_results["Table Update Endpoint"]["details"] = table_update_details
        
        # Test complete workflow
        workflow_success, workflow_details = test_complete_workflow()
        test_results["Complete Workflow"]["success"] = workflow_success
        test_results["Complete Workflow"]["details"] = workflow_details
    
    # Print summary
    print("\n========================================")
    print("TEST RESULTS SUMMARY")
    print("========================================")
    
    all_passed = True
    for test_name, result in test_results.items():
        status = "✅ PASSED" if result["success"] else "❌ FAILED"
        print(f"{test_name}: {status}")
        if not result["success"]:
            all_passed = False
            print(f"  Details: {result['details']}")
    
    print("\n========================================")
    if all_passed:
        print("🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉")
        print("The order cancellation API fix is working correctly.")
        print("- Order cancel endpoint accepts 'other' as a valid reason")
        print("- Table update endpoint correctly sets current_order_id to null")
        print("- Complete workflow functions as expected")
    else:
        print("❌ SOME TESTS FAILED. See details above.")
    print("========================================")
    
    return test_results

if __name__ == "__main__":
    run_all_tests()