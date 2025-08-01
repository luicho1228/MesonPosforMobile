#!/usr/bin/env python3
import requests
import json
import time
import os
from datetime import datetime
import random
import string

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

# Test user login with existing user
def login_existing_user():
    print("\n=== Logging in with Existing User ===")
    
    # Use a known PIN for an existing user
    # This is a simple 4-digit PIN that should exist in the system
    pin = "1234"
    
    try:
        # Login with the PIN
        login_data = {
            "pin": pin
        }
        
        response = requests.post(f"{API_URL}/auth/login", json=login_data)
        response.raise_for_status()
        result = response.json()
        
        auth_token = result.get("access_token")
        user_id = result.get("user", {}).get("id")
        
        print(f"User logged in successfully with ID: {user_id}")
        
        return auth_token, user_id
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Login failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        print(error_msg)
        
        # If login fails with 1234, try creating a new user
        return create_test_user()

# Create a test user if login fails
def create_test_user():
    print("\n=== Creating Test User ===")
    
    # Generate random PIN for user
    pin = ''.join(random.choices(string.digits, k=4))
    
    # Register user
    register_data = {
        "pin": pin,
        "role": "manager",
        "full_name": f"Test Manager {random_string(4)}",
        "phone": f"555{random_string(7)}"
    }
    
    try:
        response = requests.post(f"{API_URL}/auth/register", json=register_data)
        response.raise_for_status()
        result = response.json()
        
        auth_token = result.get("access_token")
        user_id = result.get("user", {}).get("id")
        
        print(f"User created successfully with ID: {user_id}")
        
        return auth_token, user_id
        
    except requests.exceptions.RequestException as e:
        error_msg = f"User creation failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        print(error_msg)
        return None, None

# Create a menu item for testing
def create_menu_item(auth_token):
    print("\n=== Creating Test Menu Item ===")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    menu_item_data = {
        "name": f"Test Pizza {random_string(4)}",
        "description": "Delicious test pizza with extra cheese",
        "price": 12.99,
        "category": "Pizza",
        "available": True,
        "image_url": "https://example.com/pizza.jpg",
        "modifier_groups": []
    }
    
    try:
        response = requests.post(f"{API_URL}/menu/items", json=menu_item_data, headers=headers)
        response.raise_for_status()
        result = response.json()
        
        menu_item_id = result.get("id")
        print(f"Menu item created with ID: {menu_item_id}")
        
        return menu_item_id
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Menu item creation failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        print(error_msg)
        return None

# Create an order
def create_order(auth_token, menu_item_id, order_type="takeout"):
    print(f"\n=== Creating Test Order ({order_type}) ===")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    order_data = {
        "customer_name": f"Test Customer {random_string(4)}",
        "customer_phone": f"555{random_string(7)}",
        "customer_address": "123 Test St",
        "items": [
            {
                "menu_item_id": menu_item_id,
                "quantity": 2,
                "special_instructions": "Extra crispy",
                "modifiers": []
            }
        ],
        "order_type": order_type,
        "tip": 3.00,
        "delivery_instructions": "Leave at door" if order_type == "delivery" else ""
    }
    
    try:
        response = requests.post(f"{API_URL}/orders", json=order_data, headers=headers)
        response.raise_for_status()
        result = response.json()
        
        order_id = result.get("id")
        print(f"Order created with ID: {order_id}")
        
        return order_id, result
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Order creation failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        print(error_msg)
        return None, None

# Send order to kitchen
def send_order_to_kitchen(auth_token, order_id):
    print(f"\n=== Sending Order {order_id} to Kitchen ===")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    try:
        response = requests.post(f"{API_URL}/orders/{order_id}/send", headers=headers)
        response.raise_for_status()
        result = response.json()
        
        print(f"Order sent to kitchen: {result.get('message')}")
        
        return True
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Send to kitchen failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        print(error_msg)
        return False

# Process payment for order
def process_payment(auth_token, order_id, payment_method="card", cash_received=None):
    print(f"\n=== Processing {payment_method.upper()} Payment for Order {order_id} ===")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    payment_data = {
        "payment_method": payment_method,
        "cash_received": cash_received,
        "email_receipt": "customer@example.com",
        "print_receipt": True
    }
    
    try:
        response = requests.post(f"{API_URL}/orders/{order_id}/pay", json=payment_data, headers=headers)
        response.raise_for_status()
        result = response.json()
        
        print(f"Payment processed: {result.get('message')}")
        if payment_method == "cash" and "change_amount" in result:
            print(f"Change amount: ${result.get('change_amount'):.2f}")
        
        return True, result
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Payment processing failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        print(error_msg)
        return False, None

# Get all orders
def get_orders(auth_token):
    print("\n=== Retrieving All Orders ===")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    try:
        response = requests.get(f"{API_URL}/orders", headers=headers)
        response.raise_for_status()
        orders = response.json()
        
        print(f"Retrieved {len(orders)} orders")
        
        return orders
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Order retrieval failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        print(error_msg)
        return []

# Get specific order
def get_order(auth_token, order_id):
    print(f"\n=== Retrieving Order {order_id} ===")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    try:
        response = requests.get(f"{API_URL}/orders/{order_id}", headers=headers)
        response.raise_for_status()
        order = response.json()
        
        print(f"Retrieved order: {order.get('order_number')}")
        
        return order
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Order retrieval failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        print(error_msg)
        return None

# Test order payment and history
def test_order_payment_and_history():
    print("\n========================================")
    print("ORDER PAYMENT AND HISTORY TEST")
    print("========================================")
    print(f"Testing against API URL: {API_URL}")
    print("Starting tests at:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("========================================\n")
    
    # Step 1: Login with existing user
    auth_token, user_id = login_existing_user()
    if not auth_token or not user_id:
        return print_test_result("Order Payment and History Test", False, "Failed to authenticate")
    
    # Step 2: Create a menu item
    menu_item_id = create_menu_item(auth_token)
    if not menu_item_id:
        return print_test_result("Order Payment and History Test", False, "Failed to create menu item")
    
    # Step 3: Create multiple orders with different types
    order_types = ["takeout", "delivery", "dine_in"]
    orders = []
    
    for order_type in order_types:
        order_id, order_data = create_order(auth_token, menu_item_id, order_type)
        if not order_id:
            return print_test_result("Order Payment and History Test", False, f"Failed to create {order_type} order")
        
        # Send order to kitchen
        if not send_order_to_kitchen(auth_token, order_id):
            return print_test_result("Order Payment and History Test", False, f"Failed to send {order_type} order to kitchen")
        
        orders.append({"id": order_id, "type": order_type, "data": order_data})
    
    # Step 4: Process payments with different methods
    payment_methods = [
        {"order_index": 0, "method": "card", "cash_received": None},
        {"order_index": 1, "method": "cash", "cash_received": 50.00},
        {"order_index": 2, "method": "card", "cash_received": None}
    ]
    
    paid_order_ids = []
    
    for payment in payment_methods:
        order = orders[payment["order_index"]]
        success, result = process_payment(
            auth_token, 
            order["id"], 
            payment["method"], 
            payment["cash_received"]
        )
        
        if not success:
            return print_test_result(
                "Order Payment and History Test", 
                False, 
                f"Failed to process {payment['method']} payment for {order['type']} order"
            )
        
        paid_order_ids.append(order["id"])
    
    # Step 5: Verify orders in order list
    all_orders = get_orders(auth_token)
    
    # Check if all paid orders are in the list
    found_orders = []
    missing_orders = []
    
    for paid_id in paid_order_ids:
        found = False
        for order in all_orders:
            if order.get("id") == paid_id:
                found = True
                found_orders.append(paid_id)
                
                # Verify order status and payment status
                if order.get("status") != "paid":
                    return print_test_result(
                        "Order Payment and History Test", 
                        False, 
                        f"Order {paid_id} status is not 'paid' (actual: {order.get('status')})"
                    )
                
                if order.get("payment_status") != "completed":
                    return print_test_result(
                        "Order Payment and History Test", 
                        False, 
                        f"Order {paid_id} payment_status is not 'completed' (actual: {order.get('payment_status')})"
                    )
                
                break
        
        if not found:
            missing_orders.append(paid_id)
    
    # Final result
    if missing_orders:
        return print_test_result(
            "Order Payment and History Test", 
            False, 
            f"Some paid orders are missing from order list: {missing_orders}"
        )
    
    return print_test_result(
        "Order Payment and History Test", 
        True, 
        f"All {len(paid_order_ids)} paid orders were found in order list with correct status"
    )

if __name__ == "__main__":
    test_order_payment_and_history()