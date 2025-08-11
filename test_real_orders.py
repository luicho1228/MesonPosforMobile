#!/usr/bin/env python3
"""
Real Order Creation Test

This test simulates creating actual orders to see if service charges 
are being applied correctly in the real order flow.
"""

import asyncio
import requests

API_URL = "http://localhost:8001/api"

async def test_real_order_creation():
    print("🍽️ REAL ORDER CREATION SERVICE CHARGE TEST")
    print("=" * 60)
    
    # Authenticate
    auth_response = requests.post(f"{API_URL}/auth/login", json={"pin": "1234"})
    token = auth_response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    print("✅ Authenticated as manager")
    
    # Clean up any existing test charges
    existing_charges = requests.get(f"{API_URL}/tax-charges/service-charges", headers=headers)
    if existing_charges.status_code == 200:
        for charge in existing_charges.json():
            if "Small Order Fee" in charge.get("name", ""):
                requests.delete(f"{API_URL}/tax-charges/service-charges/{charge['id']}", headers=headers)
    
    # Create the small order fee exactly like you're trying to set up
    print("\n📝 Creating Small Order Fee (≤$20 total cost)")
    
    small_order_fee = {
        "name": "Small Order Fee",
        "description": "Fee for orders with total cost of $20 or less",
        "amount": 2.50,  # Fixed $2.50 fee
        "type": "fixed",
        "active": True,
        "mandatory": True,
        "applies_to_subtotal": False,  # Apply based on TOTAL COST (subtotal + tax)
        "applies_to_order_types": ["dine_in", "takeout", "delivery", "phone_order"],
        "minimum_order_amount": 0.0,
        "maximum_order_amount": 20.0  # Only for orders ≤ $20 total cost
    }
    
    create_response = requests.post(f"{API_URL}/tax-charges/service-charges", json=small_order_fee, headers=headers)
    if create_response.status_code != 200:
        print(f"❌ Failed to create service charge: {create_response.text}")
        return
    
    charge_data = create_response.json()
    print(f"✅ Created: {charge_data['name']}")
    print(f"   • Amount: ${charge_data['amount']} ({charge_data['type']})")
    print(f"   • Applies to: {'Total Cost' if not charge_data['applies_to_subtotal'] else 'Subtotal'}")
    print(f"   • Maximum: ${charge_data['maximum_order_amount']:.2f}")
    
    # Get some menu items for creating real orders
    menu_response = requests.get(f"{API_URL}/menu-items", headers=headers)
    if menu_response.status_code != 200:
        print("❌ Failed to get menu items")
        return
    
    menu_items = menu_response.json()
    if not menu_items:
        print("❌ No menu items found - creating a test item")
        # Create a test menu item
        test_item = {
            "name": "Test Burger",
            "description": "Test item for service charge testing",
            "price": 15.0,
            "category": "Main",
            "available": True
        }
        item_response = requests.post(f"{API_URL}/menu-items", json=test_item, headers=headers)
        if item_response.status_code == 200:
            menu_items = [item_response.json()]
        else:
            print(f"❌ Failed to create test menu item: {item_response.text}")
            return
    
    # Test different order scenarios
    test_scenarios = [
        {
            "description": "Small order (~$15 subtotal, should get fee)",
            "items": [{"menu_item_id": menu_items[0]["id"], "quantity": 1}],
            "expected_fee": True
        },
        {
            "description": "Medium order (~$30 subtotal, should NOT get fee)", 
            "items": [{"menu_item_id": menu_items[0]["id"], "quantity": 2}],
            "expected_fee": False
        }
    ]
    
    print(f"\n📊 Testing real order creation with {len(test_scenarios)} scenarios:")
    
    for i, scenario in enumerate(test_scenarios, 1):
        print(f"\n--- Scenario {i}: {scenario['description']} ---")
        
        # Create the order data
        order_data = {
            "customer_name": f"Test Customer {i}",
            "customer_phone": "555-1234",
            "customer_address": "",
            "table_id": None,
            "party_size": 2,
            "items": scenario["items"],
            "order_type": "takeout",
            "tip": 0.0,
            "delivery_instructions": "",
            "order_notes": f"Test order for service charge scenario {i}",
            "applied_discount_ids": []
        }
        
        item_descriptions = []
        for item in scenario['items']:
            item_descriptions.append(f"{item['quantity']}x {menu_items[0]['name']}")
        print(f"  📝 Creating order with items: {item_descriptions}")
        
        # Create the actual order
        order_response = requests.post(f"{API_URL}/orders", json=order_data, headers=headers)
        
        if order_response.status_code != 200:
            print(f"  ❌ Order creation failed: {order_response.text}")
            continue
        
        order = order_response.json()
        
        print(f"  ✅ Order created: {order['order_number']}")
        print(f"  💰 Subtotal: ${order['subtotal']:.2f}")
        print(f"  💰 Tax: ${order['tax']:.2f}")
        print(f"  💰 Service Charges: ${order['service_charges']:.2f}")
        print(f"  💰 Total: ${order['total']:.2f}")
        
        order_total_with_tax = order['subtotal'] + order['tax']
        print(f"  📊 Order Total Cost (subtotal + tax): ${order_total_with_tax:.2f}")
        
        # Check if small order fee was applied
        has_small_order_fee = order['service_charges'] >= 2.50  # Our fee is $2.50
        should_have_fee = order_total_with_tax <= 20.0
        
        print(f"  🎯 Should have Small Order Fee: {should_have_fee} (total cost ≤ $20)")
        print(f"  🎯 Actually has service charges: {has_small_order_fee} (≥$2.50)")
        
        if has_small_order_fee == should_have_fee:
            print(f"  ✅ CORRECT: Service charge behavior matches expectation")
        else:
            print(f"  ❌ ERROR: Service charge behavior doesn't match expectation")
            if should_have_fee and not has_small_order_fee:
                print(f"    Problem: Should have applied $2.50 Small Order Fee but didn't")
            elif not should_have_fee and has_small_order_fee:
                print(f"    Problem: Applied service charge but shouldn't have")
        
        # Clean up the test order
        requests.delete(f"{API_URL}/orders/{order['id']}", headers=headers)
        print(f"  🧹 Cleaned up test order")
    
    # Test the calculation endpoint for comparison
    print(f"\n🔍 COMPARISON: Testing calculation endpoint directly")
    
    calc_request = {
        "subtotal": 15.0,
        "order_type": "takeout",
        "party_size": 2
    }
    
    calc_response = requests.post(f"{API_URL}/tax-charges/calculate", json=calc_request, headers=headers)
    if calc_response.status_code == 200:
        calc_result = calc_response.json()
        print(f"  📊 Calculation endpoint results:")
        print(f"     Subtotal: ${calc_result.get('subtotal', 0):.2f}")
        print(f"     Tax: ${calc_result.get('total_tax', 0):.2f}")
        print(f"     Service Charges: ${calc_result.get('total_service_charges', 0):.2f}")
        
        # Check service charge breakdown
        breakdown = calc_result.get('service_charge_breakdown', [])
        small_fee_in_breakdown = any(charge['name'] == 'Small Order Fee' for charge in breakdown)
        print(f"     Small Order Fee in breakdown: {small_fee_in_breakdown}")
        
        if breakdown:
            print(f"     Service charge breakdown:")
            for charge in breakdown:
                print(f"       - {charge['name']}: ${charge['calculated_amount']:.2f}")
    
    # Clean up
    print(f"\n🧹 Cleaning up test service charge...")
    delete_response = requests.delete(f"{API_URL}/tax-charges/service-charges/{charge_data['id']}", headers=headers)
    if delete_response.status_code == 200:
        print("✅ Test service charge removed")
    else:
        print(f"⚠️ Could not remove test service charge: {delete_response.status_code}")
    
    print(f"\n🎯 DIAGNOSIS:")
    print("If the real orders don't show the service charges but the calculation endpoint does,")
    print("then there's a problem with the order creation logic not using the updated calculation function.")

if __name__ == "__main__":
    asyncio.run(test_real_order_creation())