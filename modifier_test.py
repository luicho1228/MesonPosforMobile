#!/usr/bin/env python3
import requests
import json
import time
import os
import random
import string
from datetime import datetime

# Get the backend URL from the frontend .env file
BACKEND_URL = "https://9975ee4b-0f49-4fa9-a42c-42d367fc1ef8.preview.emergentagent.com"
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

# Test Authentication
def test_authentication():
    print("\n=== Testing Authentication ===")
    
    # Use a default PIN for testing (assuming this user exists)
    pin = "1234"
    
    # Test user login
    print("\nTesting user login...")
    login_data = {
        "pin": pin
    }
    
    try:
        response = requests.post(f"{API_URL}/auth/login", json=login_data)
        response.raise_for_status()
        result = response.json()
        
        auth_token = result.get("access_token")
        user_id = result.get("user", {}).get("id")
        
        print(f"User logged in successfully with ID: {user_id}")
        print(f"Auth token received: {auth_token[:10]}...")
        
        if not auth_token or not user_id:
            return None, None, print_test_result("Authentication - Login", False, "Failed to get auth token or user ID")
            
        return auth_token, user_id, print_test_result("Authentication", True, "Login successful")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Authentication test failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return None, None, print_test_result("Authentication", False, error_msg)

# Test Modifier Groups API
def test_modifier_groups(auth_token):
    print("\n=== Testing Modifier Groups API ===")
    
    if not auth_token:
        return None, print_test_result("Modifier Groups API", False, "No auth token available")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Test create modifier group
    print("\nTesting create modifier group...")
    group_name = f"Test Group {random_string(4)}"
    group_data = {
        "name": group_name,
        "required": False,
        "max_selections": 3
    }
    
    try:
        response = requests.post(f"{API_URL}/modifiers/groups", json=group_data, headers=headers)
        response.raise_for_status()
        result = response.json()
        
        group_id = result.get("id")
        print(f"Modifier group created with ID: {group_id}")
        
        if not group_id:
            return None, print_test_result("Modifier Groups - Create", False, "Failed to get group ID")
        
        # Test get all modifier groups
        print("\nTesting get all modifier groups...")
        response = requests.get(f"{API_URL}/modifiers/groups")
        response.raise_for_status()
        groups = response.json()
        
        print(f"Retrieved {len(groups)} modifier groups")
        
        # Verify our created group is in the list
        found = False
        for group in groups:
            if group.get("id") == group_id:
                found = True
                break
                
        if not found:
            return None, print_test_result("Modifier Groups - Get All", False, "Created group not found in list")
        
        return group_id, print_test_result("Modifier Groups API", True, "All modifier group operations successful")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Modifier groups test failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return None, print_test_result("Modifier Groups API", False, error_msg)

# Test Modifiers API
def test_modifiers(auth_token, group_id):
    print("\n=== Testing Modifiers API ===")
    
    if not auth_token or not group_id:
        return None, print_test_result("Modifiers API", False, "No auth token or group ID available")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Test create modifier
    print("\nTesting create modifier...")
    modifier_name = f"Test Modifier {random_string(4)}"
    modifier_data = {
        "name": modifier_name,
        "price": 1.99,
        "group_id": group_id
    }
    
    try:
        response = requests.post(f"{API_URL}/modifiers", json=modifier_data, headers=headers)
        response.raise_for_status()
        result = response.json()
        
        modifier_id = result.get("id")
        print(f"Modifier created with ID: {modifier_id}")
        
        if not modifier_id:
            return None, print_test_result("Modifiers - Create", False, "Failed to get modifier ID")
        
        # Test get all modifiers
        print("\nTesting get all modifiers...")
        response = requests.get(f"{API_URL}/modifiers")
        response.raise_for_status()
        modifiers = response.json()
        
        print(f"Retrieved {len(modifiers)} modifiers")
        
        # Test get modifiers by group
        print("\nTesting get modifiers by group...")
        response = requests.get(f"{API_URL}/modifiers/group/{group_id}")
        response.raise_for_status()
        group_modifiers = response.json()
        
        print(f"Retrieved {len(group_modifiers)} modifiers for group {group_id}")
        
        # Verify our created modifier is in the list
        found = False
        for modifier in group_modifiers:
            if modifier.get("id") == modifier_id:
                found = True
                break
                
        if not found:
            return None, print_test_result("Modifiers - Get By Group", False, "Created modifier not found in group list")
        
        return modifier_id, print_test_result("Modifiers API", True, "All modifier operations successful")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Modifiers test failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return None, print_test_result("Modifiers API", False, error_msg)

# Test Menu Items with Modifiers
def test_menu_items_with_modifiers(auth_token, group_id):
    print("\n=== Testing Menu Items with Modifiers ===")
    
    if not auth_token or not group_id:
        return print_test_result("Menu Items with Modifiers", False, "No auth token or group ID available")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Test create menu item with modifier groups
    print("\nTesting create menu item with modifier groups...")
    menu_item_data = {
        "name": f"Test Item with Modifiers {random_string(4)}",
        "description": "Test item with modifier groups",
        "price": 9.99,
        "category": "Test",
        "available": True,
        "image_url": "https://example.com/image.jpg",
        "modifier_groups": [group_id]
    }
    
    try:
        response = requests.post(f"{API_URL}/menu/items", json=menu_item_data, headers=headers)
        response.raise_for_status()
        result = response.json()
        
        menu_item_id = result.get("id")
        print(f"Menu item created with ID: {menu_item_id}")
        
        if not menu_item_id:
            return print_test_result("Menu Items - Create with Modifiers", False, "Failed to get menu item ID")
        
        # Verify modifier_groups field is present in the response
        if "modifier_groups" not in result:
            return print_test_result("Menu Items - Create with Modifiers", False, "modifier_groups field missing in response")
            
        if not result.get("modifier_groups") or group_id not in result.get("modifier_groups"):
            return print_test_result("Menu Items - Create with Modifiers", False, "modifier_groups not properly set in response")
        
        # Test get menu item to verify modifier_groups is included
        print("\nTesting get menu items to verify modifier_groups is included...")
        response = requests.get(f"{API_URL}/menu/items")
        response.raise_for_status()
        items = response.json()
        
        found_item = None
        for item in items:
            if item.get("id") == menu_item_id:
                found_item = item
                break
                
        if not found_item:
            return print_test_result("Menu Items - Get with Modifiers", False, "Created menu item not found in list")
            
        if "modifier_groups" not in found_item:
            return print_test_result("Menu Items - Get with Modifiers", False, "modifier_groups field missing in retrieved item")
            
        if not found_item.get("modifier_groups") or group_id not in found_item.get("modifier_groups"):
            return print_test_result("Menu Items - Get with Modifiers", False, "modifier_groups not properly included in retrieved item")
            
        print(f"Menu item retrieved with modifier_groups: {found_item.get('modifier_groups')}")
        
        return print_test_result("Menu Items with Modifiers", True, "Menu items with modifier groups working correctly")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Menu items with modifiers test failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("Menu Items with Modifiers", False, error_msg)

# Run all tests
def run_modifier_tests():
    print("\n========================================")
    print("RESTAURANT POS MODIFIER SYSTEM TEST SUITE")
    print("========================================")
    print(f"Testing against API URL: {API_URL}")
    print("Starting tests at:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("========================================\n")
    
    # Run tests in sequence
    auth_token, user_id, auth_result = test_authentication()
    
    if auth_token:
        group_id, group_result = test_modifier_groups(auth_token)
        
        if group_id:
            modifier_id, modifier_result = test_modifiers(auth_token, group_id)
            menu_result = test_menu_items_with_modifiers(auth_token, group_id)
    
    # Print summary
    print("\n========================================")
    print("TEST RESULTS SUMMARY")
    print("========================================")
    
    if not auth_token:
        print("❌ Authentication failed - could not proceed with other tests")
    elif not group_id:
        print("❌ Modifier Groups API failed - could not proceed with other tests")
    else:
        print("✅ Authentication: Success")
        print("✅ Modifier Groups API: Success")
        print("✅ Modifiers API: Success" if modifier_id else "❌ Modifiers API: Failed")
        print("✅ Menu Items with Modifiers: Success" if menu_result and menu_result[0] else "❌ Menu Items with Modifiers: Failed")
    
    print("========================================")

if __name__ == "__main__":
    run_modifier_tests()