#!/usr/bin/env python3
"""
Direct Order API Test

This test directly calls the order API to see if service charges work.
"""

import requests

API_URL = "http://localhost:8001/api"

def test_direct_order_api():
    print("🔧 DIRECT ORDER API TEST")
    print("=" * 50)
    
    # Authenticate
    auth_response = requests.post(f"{API_URL}/auth/login", json={"pin": "1234"})
    if auth_response.status_code != 200:
        print(f"❌ Authentication failed: {auth_response.status_code}")
        return
    
    token = auth_response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Authenticated")
    
    # Clean up any existing test charges
    existing_charges = requests.get(f"{API_URL}/tax-charges/service-charges", headers=headers)
    if existing_charges.status_code == 200:
        for charge in existing_charges.json():
            if "Test Small Order" in charge.get("name", ""):
                requests.delete(f"{API_URL}/tax-charges/service-charges/{charge['id']}", headers=headers)
    
    # Create a simple service charge for orders ≤ $20 total cost
    print("\n📝 Creating test service charge...")
    
    service_charge = {
        "name": "Test Small Order Fee",
        "description": "Test fee for orders ≤ $20 total cost",
        "amount": 3.00,
        "type": "fixed",
        "active": True,
        "mandatory": True,
        "applies_to_subtotal": False,  # Apply to total cost (subtotal + tax)
        "applies_to_order_types": ["takeout", "dine_in", "delivery", "phone_order"],
        "minimum_order_amount": 0.0,
        "maximum_order_amount": 20.0
    }
    
    create_response = requests.post(f"{API_URL}/tax-charges/service-charges", json=service_charge, headers=headers)
    if create_response.status_code != 200:
        print(f"❌ Failed to create service charge: {create_response.text}")
        return
    
    charge_data = create_response.json()
    print(f"✅ Created service charge: {charge_data['name']}")
    
    # Get menu items
    menu_response = requests.get(f"{API_URL}/menu-items", headers=headers)
    if menu_response.status_code != 200:
        print("❌ No menu items, creating a test item")
        
        # Create a test menu item
        test_menu_item = {
            "name": "Test Item",
            "description": "Test item for service charge testing",
            "price": 12.0,
            "category": "Test",
            "available": True
        }
        
        menu_create = requests.post(f"{API_URL}/menu-items", json=test_menu_item, headers=headers)
        if menu_create.status_code != 200:
            print(f"❌ Failed to create menu item: {menu_create.text}")
            # Clean up and return
            requests.delete(f"{API_URL}/tax-charges/service-charges/{charge_data['id']}", headers=headers)
            return
        
        menu_item = menu_create.json()
        print(f"✅ Created test menu item: {menu_item['name']} - ${menu_item['price']}")
    else:
        menu_items = menu_response.json()
        if not menu_items:
            print("❌ No menu items available")
            requests.delete(f"{API_URL}/tax-charges/service-charges/{charge_data['id']}", headers=headers)
            return
        menu_item = menu_items[0]
    
    # Test scenario 1: Small order that should get the fee
    print(f"\n🧪 Test 1: Small order with ${menu_item['price']} item")
    
    order_data = {
        "customer_name": "Test Customer",
        "customer_phone": "555-0123",
        "customer_address": "",
        "table_id": None,
        "party_size": 2,
        "items": [
            {
                "menu_item_id": menu_item["id"],
                "quantity": 1,
                "modifiers": [],
                "special_instructions": ""
            }
        ],
        "order_type": "takeout",
        "tip": 0.0,
        "delivery_instructions": "",
        "order_notes": "Test order for service charge",
        "applied_discount_ids": []
    }
    
    order_response = requests.post(f"{API_URL}/orders", json=order_data, headers=headers)
    
    if order_response.status_code != 200:
        print(f"❌ Order creation failed: {order_response.text}")
    else:
        order = order_response.json()
        print(f"✅ Order created: {order['order_number']}")
        print(f"   Subtotal: ${order['subtotal']:.2f}")
        print(f"   Tax: ${order['tax']:.2f}")
        print(f"   Service Charges: ${order['service_charges']:.2f}")
        print(f"   Total: ${order['total']:.2f}")
        
        order_total_cost = order['subtotal'] + order['tax']
        print(f"   Order total cost: ${order_total_cost:.2f}")
        
        if order_total_cost <= 20.0:
            if order['service_charges'] >= 3.0:
                print(f"   ✅ CORRECT: Service charge applied (order ≤ $20)")
            else:
                print(f"   ❌ ERROR: Service charge should have been applied but wasn't")
        else:
            if order['service_charges'] >= 3.0:
                print(f"   ❌ ERROR: Service charge shouldn't have been applied (order > $20)")
            else:
                print(f"   ✅ CORRECT: Service charge not applied (order > $20)")
        
        # Clean up the order
        requests.delete(f"{API_URL}/orders/{order['id']}", headers=headers)
    
    # Test scenario 2: Larger order that shouldn't get the fee
    print(f"\n🧪 Test 2: Large order with multiple items")
    
    large_order_data = {
        "customer_name": "Test Customer 2",
        "customer_phone": "555-0124",
        "customer_address": "",
        "table_id": None,
        "party_size": 2,
        "items": [
            {
                "menu_item_id": menu_item["id"],
                "quantity": 3,  # 3 items to make it over $20
                "modifiers": [],
                "special_instructions": ""
            }
        ],
        "order_type": "takeout",
        "tip": 0.0,
        "delivery_instructions": "",
        "order_notes": "Large test order",
        "applied_discount_ids": []
    }
    
    large_order_response = requests.post(f"{API_URL}/orders", json=large_order_data, headers=headers)
    
    if large_order_response.status_code != 200:
        print(f"❌ Large order creation failed: {large_order_response.text}")
    else:
        large_order = large_order_response.json()
        print(f"✅ Large order created: {large_order['order_number']}")
        print(f"   Subtotal: ${large_order['subtotal']:.2f}")
        print(f"   Tax: ${large_order['tax']:.2f}")
        print(f"   Service Charges: ${large_order['service_charges']:.2f}")
        print(f"   Total: ${large_order['total']:.2f}")
        
        large_order_total_cost = large_order['subtotal'] + large_order['tax']
        print(f"   Order total cost: ${large_order_total_cost:.2f}")
        
        if large_order_total_cost <= 20.0:
            if large_order['service_charges'] >= 3.0:
                print(f"   ✅ CORRECT: Service charge applied (order ≤ $20)")
            else:
                print(f"   ❌ ERROR: Service charge should have been applied but wasn't")
        else:
            if large_order['service_charges'] >= 3.0:
                print(f"   ❌ ERROR: Service charge shouldn't have been applied (order > $20)")
            else:
                print(f"   ✅ CORRECT: Service charge not applied (order > $20)")
        
        # Clean up the order
        requests.delete(f"{API_URL}/orders/{large_order['id']}", headers=headers)
    
    # Clean up test data
    print(f"\n🧹 Cleaning up...")
    requests.delete(f"{API_URL}/tax-charges/service-charges/{charge_data['id']}", headers=headers)
    if 'menu_create' in locals():  # Only delete if we created it
        requests.delete(f"{API_URL}/menu-items/{menu_item['id']}", headers=headers)
    print("✅ Cleanup complete")
    
    print(f"\n🎯 CONCLUSION:")
    print("This test directly calls the order creation API to see if service charge conditions work.")

if __name__ == "__main__":
    test_direct_order_api()