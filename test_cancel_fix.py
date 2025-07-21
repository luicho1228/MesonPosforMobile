#!/usr/bin/env python3
import requests
import json
import random
import string

# Get the backend URL from the frontend .env file
BACKEND_URL = "https://13c19c9e-804b-4911-b1a3-7e31ff49e079.preview.emergentagent.com"
API_URL = f"{BACKEND_URL}/api"

def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def test_empty_order_cancel_fix():
    print("=== Testing Empty Order Cancel Fix ===")
    
    # Step 1: Register a test user
    pin = ''.join(random.choices(string.digits, k=4))
    register_data = {
        "pin": pin,
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
        
        print(f"✅ Authenticated as: {result.get('user', {}).get('full_name')}")
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Step 2: Create a menu item
        menu_item_data = {
            "name": f"Test Item {random_string(4)}",
            "description": "Test item for cancel fix",
            "price": 12.99,
            "category": "Test",
            "available": True
        }
        
        response = requests.post(f"{API_URL}/menu/items", json=menu_item_data, headers=headers)
        response.raise_for_status()
        menu_item = response.json()
        menu_item_id = menu_item.get("id")
        
        print(f"✅ Created menu item: {menu_item_id}")
        
        # Step 3: Create a table
        table_number = random.randint(10000, 99999)
        table_data = {"number": table_number, "capacity": 4}
        
        response = requests.post(f"{API_URL}/tables", json=table_data, headers=headers)
        response.raise_for_status()
        table = response.json()
        table_id = table.get("id")
        
        print(f"✅ Created table: {table_number} (ID: {table_id})")
        
        # Step 4: Create a dine-in order
        order_data = {
            "customer_name": "Empty Order Test Customer",
            "customer_phone": "5557777777",
            "customer_address": "123 Empty Order St",
            "table_id": table_id,
            "items": [
                {
                    "menu_item_id": menu_item_id,
                    "quantity": 1,
                    "special_instructions": "Test item for empty order scenario"
                }
            ],
            "order_type": "dine_in",
            "tip": 3.00,
            "order_notes": "Test order for empty order cancel fix"
        }
        
        response = requests.post(f"{API_URL}/orders", json=order_data, headers=headers)
        response.raise_for_status()
        order = response.json()
        order_id = order.get("id")
        
        print(f"✅ Created order: {order_id}")
        print(f"   Items: {len(order.get('items', []))}")
        print(f"   Subtotal: ${order.get('subtotal', 0):.2f}")
        
        # Step 5: Send order to kitchen
        response = requests.post(f"{API_URL}/orders/{order_id}/send", headers=headers)
        response.raise_for_status()
        
        print("✅ Order sent to kitchen")
        
        # Step 6: Remove all items from the order
        removal_data = {
            "reason": "customer_changed_mind",
            "notes": "Customer removed all items from order"
        }
        
        response = requests.delete(f"{API_URL}/orders/{order_id}/items/0", 
                                 json=removal_data, headers=headers)
        response.raise_for_status()
        
        print("✅ Removed all items from order")
        
        # Verify order is empty
        response = requests.get(f"{API_URL}/orders/{order_id}", headers=headers)
        response.raise_for_status()
        empty_order = response.json()
        
        remaining_items = empty_order.get("items", [])
        print(f"   Remaining items: {len(remaining_items)}")
        print(f"   Subtotal after removal: ${empty_order.get('subtotal', 0):.2f}")
        
        # Step 7: Test cancel order endpoint with POST method
        print("\n🔍 Testing cancel order endpoint...")
        
        cancellation_data = {
            "reason": "empty_order",
            "notes": "Order cancelled because all items were removed"
        }
        
        print(f"Making POST request to: {API_URL}/orders/{order_id}/cancel")
        print(f"Cancellation data: {json.dumps(cancellation_data, indent=2)}")
        
        response = requests.post(f"{API_URL}/orders/{order_id}/cancel", json=cancellation_data, headers=headers)
        response.raise_for_status()
        cancel_result = response.json()
        
        print(f"✅ Cancel response: {json.dumps(cancel_result, indent=2)}")
        
        # Step 8: Verify the order is properly cancelled
        response = requests.get(f"{API_URL}/orders/{order_id}", headers=headers)
        response.raise_for_status()
        cancelled_order = response.json()
        
        print(f"\n📋 Final order state:")
        print(f"   Status: {cancelled_order.get('status')}")
        print(f"   Cancellation info: {json.dumps(cancelled_order.get('cancellation_info'), indent=2)}")
        
        # Step 9: Verify table is freed
        response = requests.get(f"{API_URL}/tables", headers=headers)
        response.raise_for_status()
        tables = response.json()
        
        for table in tables:
            if table.get("id") == table_id:
                print(f"   Table status: {table.get('status')}")
                print(f"   Table current_order_id: {table.get('current_order_id')}")
                break
        
        # Test results
        success = True
        issues = []
        
        if cancelled_order.get("status") != "cancelled":
            success = False
            issues.append(f"Order status should be 'cancelled' but is '{cancelled_order.get('status')}'")
        
        cancellation_info = cancelled_order.get("cancellation_info")
        if not cancellation_info:
            success = False
            issues.append("Cancellation info not stored in order")
        else:
            if cancellation_info.get("reason") != "empty_order":
                success = False
                issues.append(f"Cancellation reason should be 'empty_order' but is '{cancellation_info.get('reason')}'")
            
            if cancellation_info.get("notes") != "Order cancelled because all items were removed":
                success = False
                issues.append("Cancellation notes not properly recorded")
        
        # Check table status
        table_freed = False
        for table in tables:
            if table.get("id") == table_id:
                if table.get("status") == "available" and table.get("current_order_id") is None:
                    table_freed = True
                break
        
        if not table_freed:
            success = False
            issues.append("Table not properly freed after order cancellation")
        
        if success:
            print("\n✅ EMPTY ORDER CANCEL FIX TEST PASSED")
            print("   - Order properly cancelled with POST method")
            print("   - Cancellation info stored correctly")
            print("   - Table properly freed")
        else:
            print("\n❌ EMPTY ORDER CANCEL FIX TEST FAILED")
            for issue in issues:
                print(f"   - {issue}")
        
        return success
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Test failed with error: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response: {e.response.text}")
        return False

if __name__ == "__main__":
    test_empty_order_cancel_fix()