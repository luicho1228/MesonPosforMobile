#!/usr/bin/env python3
import requests
import json
import time
import os
from datetime import datetime
import random
import string

# Get the backend URL from the frontend .env file
BACKEND_URL = "https://9975ee4b-0f49-4fa9-a42c-42d367fc1ef8.preview.emergentagent.com"
API_URL = f"{BACKEND_URL}/api"

# Test results
test_results = {
    "Authentication System": {"success": False, "details": ""},
    "Menu Management API": {"success": False, "details": ""},
    "Customer Management API": {"success": False, "details": ""},
    "Order Management API": {"success": False, "details": ""},
    "Time Tracking API": {"success": False, "details": ""},
    "Dashboard Analytics API": {"success": False, "details": ""},
    "Table Management API": {"success": False, "details": ""},
    "Receipt Data Requirements": {"success": False, "details": ""},
    "Order Processing Workflow": {"success": False, "details": ""}
}

# Global variables to store test data
auth_token = None
user_id = None
menu_item_id = None
customer_id = None
order_id = None
table_id = None
modifier_group_id = None
modifier_id = None

# Helper function to generate random string
def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

# Helper function to print test results
def print_test_result(test_name, success, details=""):
    status = "✅ PASSED" if success else "❌ FAILED"
    print(f"\n{test_name}: {status}")
    if details:
        print(f"Details: {details}")
    return success, details

# 1. Test Authentication System
def test_authentication():
    global auth_token, user_id
    print("\n=== Testing Authentication System ===")
    
    # Generate random username to avoid conflicts
    username = f"manager_{random_string()}"
    email = f"{username}@example.com"
    password = "Password123!"
    
    # Test user registration
    print("\nTesting user registration...")
    register_data = {
        "username": username,
        "email": email,
        "password": password,
        "role": "manager",
        "full_name": "Test Manager",
        "phone": "1234567890"
    }
    
    try:
        response = requests.post(f"{API_URL}/auth/register", json=register_data)
        response.raise_for_status()
        result = response.json()
        
        auth_token = result.get("access_token")
        user_id = result.get("user", {}).get("id")
        
        print(f"User registered successfully with ID: {user_id}")
        print(f"Auth token received: {auth_token[:10]}...")
        
        if not auth_token or not user_id:
            return print_test_result("Authentication - Registration", False, "Failed to get auth token or user ID")
            
        # Test login
        print("\nTesting user login...")
        login_data = {
            "username": username,
            "password": password
        }
        
        response = requests.post(f"{API_URL}/auth/login", json=login_data)
        response.raise_for_status()
        result = response.json()
        
        login_token = result.get("access_token")
        login_user = result.get("user", {})
        
        print(f"User logged in successfully: {login_user.get('username')}")
        print(f"Login token received: {login_token[:10]}...")
        
        if not login_token:
            return print_test_result("Authentication - Login", False, "Failed to get login token")
            
        # Test get current user
        print("\nTesting get current user...")
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(f"{API_URL}/auth/me", headers=headers)
        response.raise_for_status()
        user_data = response.json()
        
        print(f"Current user retrieved: {user_data.get('username')}")
        
        if user_data.get("id") != user_id:
            return print_test_result("Authentication - Get Current User", False, "User ID mismatch")
            
        return print_test_result("Authentication System", True, "Registration, login, and user retrieval successful")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Authentication test failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("Authentication System", False, error_msg)

# 2. Test Menu Management API
def test_menu_management():
    global menu_item_id, auth_token
    print("\n=== Testing Menu Management API ===")
    
    if not auth_token:
        return print_test_result("Menu Management API", False, "No auth token available")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Test create menu item
    print("\nTesting create menu item...")
    menu_item_data = {
        "name": f"Test Pizza {random_string(4)}",
        "description": "Delicious test pizza with extra cheese",
        "price": 12.99,
        "category": "Pizza",
        "available": True,
        "image_url": "https://example.com/pizza.jpg",
        "modifiers": ["Extra Cheese", "Pepperoni"]
    }
    
    try:
        response = requests.post(f"{API_URL}/menu/items", json=menu_item_data, headers=headers)
        response.raise_for_status()
        result = response.json()
        
        menu_item_id = result.get("id")
        print(f"Menu item created with ID: {menu_item_id}")
        
        if not menu_item_id:
            return print_test_result("Menu Management - Create Item", False, "Failed to get menu item ID")
        
        # Test get available menu items
        print("\nTesting get available menu items...")
        response = requests.get(f"{API_URL}/menu/items")
        response.raise_for_status()
        items = response.json()
        
        print(f"Retrieved {len(items)} available menu items")
        
        # Test get all menu items
        print("\nTesting get all menu items...")
        response = requests.get(f"{API_URL}/menu/items/all", headers=headers)
        response.raise_for_status()
        all_items = response.json()
        
        print(f"Retrieved {len(all_items)} total menu items")
        
        # Test update menu item
        print("\nTesting update menu item...")
        update_data = {
            "name": f"Updated Pizza {random_string(4)}",
            "description": "Updated description",
            "price": 14.99,
            "category": "Pizza",
            "available": True,
            "image_url": "https://example.com/updated-pizza.jpg",
            "modifiers": ["Extra Cheese", "Pepperoni", "Mushrooms"]
        }
        
        response = requests.put(f"{API_URL}/menu/items/{menu_item_id}", json=update_data, headers=headers)
        response.raise_for_status()
        updated_item = response.json()
        
        print(f"Menu item updated: {updated_item.get('name')}")
        
        # Test get menu categories
        print("\nTesting get menu categories...")
        response = requests.get(f"{API_URL}/menu/categories")
        response.raise_for_status()
        categories = response.json().get("categories", [])
        
        print(f"Retrieved {len(categories)} menu categories: {categories}")
        
        # Test delete menu item
        print("\nTesting delete menu item...")
        response = requests.delete(f"{API_URL}/menu/items/{menu_item_id}", headers=headers)
        response.raise_for_status()
        delete_result = response.json()
        
        print(f"Menu item deleted: {delete_result.get('message')}")
        
        # Create a new item for further testing
        response = requests.post(f"{API_URL}/menu/items", json=menu_item_data, headers=headers)
        response.raise_for_status()
        result = response.json()
        menu_item_id = result.get("id")
        
        return print_test_result("Menu Management API", True, "All menu management operations successful")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Menu management test failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("Menu Management API", False, error_msg)

# 3. Test Customer Management API
def test_customer_management():
    global customer_id, auth_token
    print("\n=== Testing Customer Management API ===")
    
    if not auth_token:
        return print_test_result("Customer Management API", False, "No auth token available")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Test create customer
    print("\nTesting create customer...")
    phone = f"555{random_string(7)}"
    customer_data = {
        "name": f"Test Customer {random_string(4)}",
        "phone": phone,
        "email": f"customer_{random_string()}@example.com",
        "address": "123 Test St, Test City, TS 12345"
    }
    
    try:
        response = requests.post(f"{API_URL}/customers", json=customer_data, headers=headers)
        response.raise_for_status()
        result = response.json()
        
        customer_id = result.get("id")
        print(f"Customer created with ID: {customer_id}")
        
        if not customer_id:
            return print_test_result("Customer Management - Create Customer", False, "Failed to get customer ID")
        
        # Test get all customers
        print("\nTesting get all customers...")
        response = requests.get(f"{API_URL}/customers", headers=headers)
        response.raise_for_status()
        customers = response.json()
        
        print(f"Retrieved {len(customers)} customers")
        
        # Test get customer by phone
        print("\nTesting get customer by phone...")
        response = requests.get(f"{API_URL}/customers/{phone}", headers=headers)
        response.raise_for_status()
        customer = response.json()
        
        print(f"Retrieved customer by phone: {customer.get('name')}")
        
        if customer.get("id") != customer_id:
            return print_test_result("Customer Management - Get by Phone", False, "Customer ID mismatch")
            
        return print_test_result("Customer Management API", True, "All customer management operations successful")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Customer management test failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("Customer Management API", False, error_msg)

# 4. Test Order Management API
def test_order_management():
    global order_id, auth_token, menu_item_id, customer_id
    print("\n=== Testing Order Management API ===")
    
    if not auth_token or not menu_item_id:
        return print_test_result("Order Management API", False, "No auth token or menu item available")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Test create order
    print("\nTesting create order...")
    order_data = {
        "customer_name": "Test Customer",
        "customer_phone": "5551234567",
        "customer_address": "123 Test St",
        "items": [
            {
                "menu_item_id": menu_item_id,
                "quantity": 2,
                "price": 12.99,
                "special_instructions": "Extra crispy"
            }
        ],
        "order_type": "delivery",
        "tip": 3.00,
        "delivery_address": "123 Test St, Test City, TS 12345",
        "delivery_instructions": "Leave at door"
    }
    
    try:
        response = requests.post(f"{API_URL}/orders", json=order_data, headers=headers)
        response.raise_for_status()
        result = response.json()
        
        order_id = result.get("id")
        print(f"Order created with ID: {order_id}")
        
        if not order_id:
            return print_test_result("Order Management - Create Order", False, "Failed to get order ID")
        
        # Test get all orders
        print("\nTesting get all orders...")
        response = requests.get(f"{API_URL}/orders", headers=headers)
        response.raise_for_status()
        orders = response.json()
        
        print(f"Retrieved {len(orders)} orders")
        
        # Test get order by ID
        print("\nTesting get order by ID...")
        response = requests.get(f"{API_URL}/orders/{order_id}", headers=headers)
        response.raise_for_status()
        order = response.json()
        
        print(f"Retrieved order: {order.get('order_number')}")
        
        if order.get("id") != order_id:
            return print_test_result("Order Management - Get by ID", False, "Order ID mismatch")
        
        # Test update order status
        print("\nTesting update order status...")
        status_data = {"status": "confirmed"}
        
        response = requests.put(f"{API_URL}/orders/{order_id}/status", json=status_data, headers=headers)
        response.raise_for_status()
        status_result = response.json()
        
        print(f"Order status updated: {status_result.get('message')}")
        
        # Verify status update
        response = requests.get(f"{API_URL}/orders/{order_id}", headers=headers)
        response.raise_for_status()
        updated_order = response.json()
        
        if updated_order.get("status") != "confirmed":
            return print_test_result("Order Management - Status Update", False, "Status not updated correctly")
            
        return print_test_result("Order Management API", True, "All order management operations successful")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Order management test failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("Order Management API", False, error_msg)

# 5. Test Time Tracking API
def test_time_tracking():
    global auth_token
    print("\n=== Testing Time Tracking API ===")
    
    if not auth_token:
        return print_test_result("Time Tracking API", False, "No auth token available")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    try:
        # Test clock in
        print("\nTesting clock in...")
        response = requests.post(f"{API_URL}/time/clock-in", headers=headers)
        response.raise_for_status()
        clock_in_result = response.json()
        
        print(f"Clock in result: {clock_in_result.get('message')}")
        
        # Test get time entries
        print("\nTesting get time entries...")
        response = requests.get(f"{API_URL}/time/entries", headers=headers)
        response.raise_for_status()
        entries = response.json()
        
        print(f"Retrieved {len(entries)} time entries")
        
        # Small delay to ensure clock-out time is different
        time.sleep(2)
        
        # Test clock out
        print("\nTesting clock out...")
        response = requests.post(f"{API_URL}/time/clock-out", headers=headers)
        response.raise_for_status()
        clock_out_result = response.json()
        
        print(f"Clock out result: {clock_out_result.get('message')}")
        print(f"Total hours: {clock_out_result.get('total_hours')}")
        
        # Verify time entries after clock out
        response = requests.get(f"{API_URL}/time/entries", headers=headers)
        response.raise_for_status()
        updated_entries = response.json()
        
        if len(updated_entries) < 1:
            return print_test_result("Time Tracking API", False, "No time entries found after clock out")
            
        latest_entry = updated_entries[0]
        if latest_entry.get("clock_out") is None:
            return print_test_result("Time Tracking API", False, "Clock out not recorded properly")
            
        return print_test_result("Time Tracking API", True, "All time tracking operations successful")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Time tracking test failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("Time Tracking API", False, error_msg)

# 6. Test Dashboard Analytics API
def test_dashboard_analytics():
    global auth_token
    print("\n=== Testing Dashboard Analytics API ===")
    
    if not auth_token:
        return print_test_result("Dashboard Analytics API", False, "No auth token available")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    try:
        # Test get dashboard stats
        print("\nTesting get dashboard stats...")
        response = requests.get(f"{API_URL}/dashboard/stats", headers=headers)
        response.raise_for_status()
        stats = response.json()
        
        print(f"Dashboard stats retrieved:")
        print(f"Today's orders: {stats.get('today_orders')}")
        print(f"Today's revenue: ${stats.get('today_revenue'):.2f}")
        print(f"Pending orders: {stats.get('pending_orders')}")
        print(f"Active employees: {stats.get('active_employees')}")
        
        if "today_orders" not in stats or "today_revenue" not in stats or "pending_orders" not in stats or "active_employees" not in stats:
            return print_test_result("Dashboard Analytics API", False, "Missing required stats fields")
            
        return print_test_result("Dashboard Analytics API", True, "Dashboard stats retrieved successfully")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Dashboard analytics test failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("Dashboard Analytics API", False, error_msg)

# Run all tests
def run_all_tests():
    print("\n========================================")
    print("RESTAURANT POS BACKEND API TEST SUITE")
    print("========================================")
    print(f"Testing against API URL: {API_URL}")
    print("Starting tests at:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("========================================\n")
    
    # Run tests in sequence
    auth_success, auth_details = test_authentication()
    test_results["Authentication System"]["success"] = auth_success
    test_results["Authentication System"]["details"] = auth_details
    
    if auth_success:
        menu_success, menu_details = test_menu_management()
        test_results["Menu Management API"]["success"] = menu_success
        test_results["Menu Management API"]["details"] = menu_details
        
        customer_success, customer_details = test_customer_management()
        test_results["Customer Management API"]["success"] = customer_success
        test_results["Customer Management API"]["details"] = customer_details
        
        order_success, order_details = test_order_management()
        test_results["Order Management API"]["success"] = order_success
        test_results["Order Management API"]["details"] = order_details
        
        time_success, time_details = test_time_tracking()
        test_results["Time Tracking API"]["success"] = time_success
        test_results["Time Tracking API"]["details"] = time_details
        
        dashboard_success, dashboard_details = test_dashboard_analytics()
        test_results["Dashboard Analytics API"]["success"] = dashboard_success
        test_results["Dashboard Analytics API"]["details"] = dashboard_details
    
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
    
    print("\n========================================")
    if all_passed:
        print("🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉")
    else:
        print("❌ SOME TESTS FAILED. See details above.")
    print("========================================")
    
    return test_results

if __name__ == "__main__":
    run_all_tests()