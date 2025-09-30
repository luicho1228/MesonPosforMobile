#!/usr/bin/env python3
"""
POSInterface Restoration Verification Test
Testing basic backend functionality to verify that the POSInterface restoration didn't break any backend connections.
"""

import requests
import json
import time
import os
import uuid
from datetime import datetime
import random
import string

# Get the backend URL from the frontend .env file
BACKEND_URL = "https://pos-interface-repair.preview.emergentagent.com"
API_URL = f"{BACKEND_URL}/api"

# Global variables to store test data
auth_token = None
user_id = None
menu_item_id = None
table_id = None
order_id = None

def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def print_test_result(test_name, success, details=""):
    status = "✅ PASSED" if success else "❌ FAILED"
    print(f"\n{test_name}: {status}")
    if details:
        print(f"Details: {details}")
    return success, details

def test_authentication_system():
    """Test 1: Authentication system - verify login/logout is working"""
    global auth_token, user_id
    print("\n=== Test 1: Authentication System ===")
    
    try:
        # Test with existing manager PIN
        print("Testing login with existing manager PIN 1234...")
        login_data = {"pin": "1234"}
        
        response = requests.post(f"{API_URL}/auth/login", json=login_data)
        response.raise_for_status()
        result = response.json()
        
        auth_token = result.get("access_token")
        user_data = result.get("user", {})
        user_id = user_data.get("id")
        
        print(f"✅ Login successful: {user_data.get('full_name')} ({user_data.get('role')})")
        print(f"✅ Auth token received: {auth_token[:20]}...")
        
        if not auth_token or not user_id:
            return print_test_result("Authentication System", False, "Failed to get auth token or user ID")
        
        # Test get current user
        print("Testing get current user endpoint...")
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(f"{API_URL}/auth/me", headers=headers)
        response.raise_for_status()
        current_user = response.json()
        
        print(f"✅ Current user retrieved: {current_user.get('full_name')}")
        
        if current_user.get("id") != user_id:
            return print_test_result("Authentication System", False, "User ID mismatch")
        
        return print_test_result("Authentication System", True, "Login and user retrieval working correctly")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Authentication test failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("Authentication System", False, error_msg)

def test_menu_items_endpoint():
    """Test 2: Menu items endpoint - verify menu data can be retrieved"""
    print("\n=== Test 2: Menu Items Endpoint ===")
    
    try:
        # Test get available menu items (public endpoint)
        print("Testing GET /api/menu/items (available items)...")
        response = requests.get(f"{API_URL}/menu/items")
        response.raise_for_status()
        items = response.json()
        
        print(f"✅ Retrieved {len(items)} available menu items")
        
        if len(items) == 0:
            return print_test_result("Menu Items Endpoint", False, "No menu items found")
        
        # Verify menu item structure
        sample_item = items[0]
        required_fields = ["id", "name", "price", "category", "available"]
        missing_fields = [field for field in required_fields if field not in sample_item]
        
        if missing_fields:
            return print_test_result("Menu Items Endpoint", False, f"Menu items missing required fields: {missing_fields}")
        
        # Store a menu item ID for later tests
        global menu_item_id
        menu_item_id = sample_item["id"]
        print(f"✅ Sample menu item: {sample_item['name']} - ${sample_item['price']}")
        
        # Test get all menu items (authenticated endpoint)
        if auth_token:
            print("Testing GET /api/menu/items/all (all items)...")
            headers = {"Authorization": f"Bearer {auth_token}"}
            response = requests.get(f"{API_URL}/menu/items/all", headers=headers)
            response.raise_for_status()
            all_items = response.json()
            print(f"✅ Retrieved {len(all_items)} total menu items")
        
        # Test get menu categories
        print("Testing GET /api/menu/categories...")
        response = requests.get(f"{API_URL}/menu/categories")
        response.raise_for_status()
        categories = response.json().get("categories", [])
        print(f"✅ Retrieved {len(categories)} menu categories: {categories}")
        
        return print_test_result("Menu Items Endpoint", True, f"Menu data retrieval working correctly - {len(items)} items, {len(categories)} categories")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Menu items test failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("Menu Items Endpoint", False, error_msg)

def test_active_orders_endpoint():
    """Test 3: Active orders endpoint - verify orders are being displayed correctly"""
    print("\n=== Test 3: Active Orders Endpoint ===")
    
    if not auth_token:
        return print_test_result("Active Orders Endpoint", False, "No auth token available")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    try:
        # Test get active orders
        print("Testing GET /api/orders/active...")
        response = requests.get(f"{API_URL}/orders/active", headers=headers)
        response.raise_for_status()
        active_orders = response.json()
        
        print(f"✅ Retrieved {len(active_orders)} active orders")
        
        # Verify active orders structure
        if active_orders:
            sample_order = active_orders[0]
            required_fields = ["id", "order_number", "status", "items", "total", "created_at"]
            missing_fields = [field for field in required_fields if field not in sample_order]
            
            if missing_fields:
                return print_test_result("Active Orders Endpoint", False, f"Active orders missing required fields: {missing_fields}")
            
            print(f"✅ Sample active order: {sample_order['order_number']} - Status: {sample_order['status']}")
            
            # Verify only active statuses are included
            active_statuses = ["pending", "confirmed", "preparing", "ready", "out_for_delivery"]
            for order in active_orders:
                if order.get("status") not in active_statuses:
                    return print_test_result("Active Orders Endpoint", False, f"Non-active order found: {order.get('order_number')} with status {order.get('status')}")
        
        # Test get all orders for comparison
        print("Testing GET /api/orders (all orders)...")
        response = requests.get(f"{API_URL}/orders", headers=headers)
        response.raise_for_status()
        all_orders = response.json()
        print(f"✅ Retrieved {len(all_orders)} total orders")
        
        return print_test_result("Active Orders Endpoint", True, f"Active orders endpoint working correctly - {len(active_orders)} active orders out of {len(all_orders)} total")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Active orders test failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("Active Orders Endpoint", False, error_msg)

def test_tables_endpoint():
    """Test 4: Tables endpoint - verify table management is functional"""
    print("\n=== Test 4: Tables Endpoint ===")
    
    if not auth_token:
        return print_test_result("Tables Endpoint", False, "No auth token available")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    try:
        # Test get all tables
        print("Testing GET /api/tables...")
        response = requests.get(f"{API_URL}/tables")
        response.raise_for_status()
        tables = response.json()
        
        print(f"✅ Retrieved {len(tables)} tables")
        
        if len(tables) == 0:
            return print_test_result("Tables Endpoint", False, "No tables found")
        
        # Verify table structure
        sample_table = tables[0]
        required_fields = ["id", "name", "capacity", "status", "current_order_id"]
        missing_fields = [field for field in required_fields if field not in sample_table]
        
        if missing_fields:
            return print_test_result("Tables Endpoint", False, f"Tables missing required fields: {missing_fields}")
        
        # Store a table ID for later tests
        global table_id
        available_table = None
        for table in tables:
            if table.get("status") == "available":
                available_table = table
                table_id = table["id"]
                break
        
        if available_table:
            print(f"✅ Sample available table: {available_table['name']} - Capacity: {available_table['capacity']}")
        else:
            print("⚠️ No available tables found, but table structure is correct")
        
        # Count table statuses
        status_counts = {}
        for table in tables:
            status = table.get("status", "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1
        
        print(f"✅ Table status distribution: {status_counts}")
        
        # Test table creation (to verify write operations work)
        print("Testing POST /api/tables (create table)...")
        test_table_name = f"Test Table {random_string(5)}"
        table_data = {
            "name": test_table_name,
            "capacity": 4
        }
        
        response = requests.post(f"{API_URL}/tables", json=table_data, headers=headers)
        response.raise_for_status()
        new_table = response.json()
        
        print(f"✅ Created test table: {new_table['name']} (ID: {new_table['id']})")
        
        # Clean up - delete the test table
        response = requests.delete(f"{API_URL}/tables/{new_table['id']}", headers=headers)
        response.raise_for_status()
        print(f"✅ Cleaned up test table")
        
        return print_test_result("Tables Endpoint", True, f"Table management working correctly - {len(tables)} tables, CRUD operations functional")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Tables test failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("Tables Endpoint", False, error_msg)

def test_basic_order_creation_workflow():
    """Test 5: Basic order creation workflow"""
    print("\n=== Test 5: Basic Order Creation Workflow ===")
    
    if not auth_token or not menu_item_id:
        return print_test_result("Basic Order Creation Workflow", False, "Missing required test data (auth_token or menu_item_id)")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    try:
        # Step 1: Create a new order
        print("Step 1: Creating new order...")
        order_data = {
            "customer_name": "Test Customer",
            "customer_phone": "5551234567",
            "customer_address": "123 Test St",
            "items": [
                {
                    "menu_item_id": menu_item_id,
                    "quantity": 1,
                    "special_instructions": "Test order"
                }
            ],
            "order_type": "takeout",
            "tip": 2.00,
            "order_notes": "POSInterface verification test"
        }
        
        response = requests.post(f"{API_URL}/orders", json=order_data, headers=headers)
        response.raise_for_status()
        order = response.json()
        
        global order_id
        order_id = order.get("id")
        order_number = order.get("order_number")
        
        print(f"✅ Order created: {order_number} (ID: {order_id})")
        print(f"   Status: {order.get('status')}")
        print(f"   Subtotal: ${order.get('subtotal', 0):.2f}")
        print(f"   Total: ${order.get('total', 0):.2f}")
        
        if order.get("status") != "draft":
            return print_test_result("Basic Order Creation Workflow", False, "New order should have 'draft' status")
        
        # Step 2: Send order to kitchen
        print("Step 2: Sending order to kitchen...")
        response = requests.post(f"{API_URL}/orders/{order_id}/send", headers=headers)
        response.raise_for_status()
        
        # Verify order status changed
        response = requests.get(f"{API_URL}/orders/{order_id}", headers=headers)
        response.raise_for_status()
        updated_order = response.json()
        
        print(f"✅ Order sent to kitchen, new status: {updated_order.get('status')}")
        
        if updated_order.get("status") != "pending":
            return print_test_result("Basic Order Creation Workflow", False, "Order should have 'pending' status after sending to kitchen")
        
        # Step 3: Verify order appears in active orders
        print("Step 3: Verifying order appears in active orders...")
        response = requests.get(f"{API_URL}/orders/active", headers=headers)
        response.raise_for_status()
        active_orders = response.json()
        
        order_found = False
        for active_order in active_orders:
            if active_order.get("id") == order_id:
                order_found = True
                print(f"✅ Order found in active orders: {active_order.get('order_number')}")
                break
        
        if not order_found:
            return print_test_result("Basic Order Creation Workflow", False, "Order not found in active orders after sending to kitchen")
        
        # Step 4: Process payment
        print("Step 4: Processing payment...")
        payment_data = {
            "payment_method": "card",
            "print_receipt": True
        }
        
        response = requests.post(f"{API_URL}/orders/{order_id}/pay", json=payment_data, headers=headers)
        response.raise_for_status()
        payment_result = response.json()
        
        print(f"✅ Payment processed: {payment_result.get('message')}")
        
        # Verify final order status
        response = requests.get(f"{API_URL}/orders/{order_id}", headers=headers)
        response.raise_for_status()
        final_order = response.json()
        
        print(f"✅ Final order status: {final_order.get('status')}")
        print(f"   Payment method: {final_order.get('payment_method')}")
        
        if final_order.get("status") != "paid":
            return print_test_result("Basic Order Creation Workflow", False, "Order should have 'paid' status after payment")
        
        return print_test_result("Basic Order Creation Workflow", True, "Complete order workflow successful - create → send to kitchen → payment")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Order creation workflow test failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("Basic Order Creation Workflow", False, error_msg)

def main():
    print("=" * 80)
    print("POSInterface Restoration Verification Test")
    print("Testing basic backend functionality to verify POSInterface restoration")
    print("didn't break any backend connections.")
    print("=" * 80)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"API URL: {API_URL}")
    print(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    
    # Run all tests
    test_results = []
    
    test_results.append(test_authentication_system())
    test_results.append(test_menu_items_endpoint())
    test_results.append(test_active_orders_endpoint())
    test_results.append(test_tables_endpoint())
    test_results.append(test_basic_order_creation_workflow())
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST RESULTS SUMMARY")
    print("=" * 80)
    
    passed_count = sum(1 for result in test_results if result[0])
    failed_count = len(test_results) - passed_count
    
    for i, (success, details) in enumerate(test_results, 1):
        test_names = [
            "Authentication System",
            "Menu Items Endpoint", 
            "Active Orders Endpoint",
            "Tables Endpoint",
            "Basic Order Creation Workflow"
        ]
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{test_names[i-1]}: {status}")
        if not success and details:
            print(f"  └─ {details}")
    
    print("=" * 80)
    print(f"📊 Results: {passed_count} passed, {failed_count} failed")
    
    if failed_count == 0:
        print("🎉 ALL TESTS PASSED - POSInterface restoration did not break backend connections!")
    else:
        print("🚨 SOME TESTS FAILED - Backend issues detected after POSInterface restoration")
    
    print("=" * 80)

if __name__ == "__main__":
    main()