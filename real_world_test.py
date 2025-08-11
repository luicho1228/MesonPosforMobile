#!/usr/bin/env python3
"""
Real-world Service Charge Test

This test simulates your exact scenario: service charge with $20 maximum based on order total cost.
"""

import asyncio
import requests

API_URL = "http://localhost:8001/api"

async def test_real_world_scenario():
    print("🍽️ REAL-WORLD SERVICE CHARGE TEST")
    print("=" * 50)
    
    # Authenticate
    auth_response = requests.post(f"{API_URL}/auth/login", json={"pin": "1234"})
    token = auth_response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    print("✅ Authenticated as manager")
    
    # Clean up any existing test charges
    existing_charges = requests.get(f"{API_URL}/tax-charges/service-charges", headers=headers)
    if existing_charges.status_code == 200:
        for charge in existing_charges.json():
            if "Real World" in charge.get("name", ""):
                requests.delete(f"{API_URL}/tax-charges/service-charges/{charge['id']}", headers=headers)
    
    # Create the exact service charge you're trying to set up
    print("\n📝 Creating service charge: 'Apply based on order total cost, maximum $20'")
    
    service_charge = {
        "name": "Real World Test Charge", 
        "description": "Service charge with $20 maximum based on order total cost",
        "amount": 10.0,  # 10%
        "type": "percentage",
        "active": True,
        "mandatory": True,
        "applies_to_subtotal": False,  # Apply based on ORDER TOTAL COST (not subtotal)
        "applies_to_order_types": ["dine_in", "takeout", "delivery", "phone_order"],
        "minimum_order_amount": 0.0,
        "maximum_order_amount": 20.0  # Maximum $20
    }
    
    create_response = requests.post(f"{API_URL}/tax-charges/service-charges", json=service_charge, headers=headers)
    if create_response.status_code != 200:
        print(f"❌ Failed to create service charge: {create_response.text}")
        return
    
    charge_data = create_response.json()
    print(f"✅ Created service charge: {charge_data['name']}")
    print(f"   • Amount: {charge_data['amount']}% ({charge_data['type']})")
    print(f"   • Applies to: {'Order Total Cost' if not charge_data['applies_to_subtotal'] else 'Subtotal'}")
    print(f"   • Maximum: ${charge_data['maximum_order_amount']:.2f}")
    
    # Test various order amounts
    test_orders = [
        {"amount": 10.00, "description": "Small order - should apply"},
        {"amount": 15.00, "description": "Medium order - should apply"},
        {"amount": 18.00, "description": "Borderline order - should apply"}, 
        {"amount": 25.00, "description": "Large order - should NOT apply"},
        {"amount": 30.00, "description": "Very large order - should NOT apply"}
    ]
    
    print(f"\n📊 Testing {len(test_orders)} different order amounts:")
    
    for i, order in enumerate(test_orders, 1):
        print(f"\n--- Test {i}: {order['description']} (${order['amount']:.2f}) ---")
        
        calc_request = {
            "subtotal": order["amount"],
            "order_type": "dine_in",
            "party_size": 2
        }
        
        response = requests.post(f"{API_URL}/tax-charges/calculate", json=calc_request, headers=headers)
        if response.status_code != 200:
            print(f"❌ Calculation failed: {response.text}")
            continue
        
        result = response.json()
        
        subtotal = result.get("subtotal", 0)
        tax = result.get("total_tax", 0)
        service_charges = result.get("total_service_charges", 0)
        total_before_tip = result.get("total_before_tip", 0)
        
        order_total_with_tax = subtotal + tax  # This is what the condition checks against
        
        print(f"  💰 Subtotal: ${subtotal:.2f}")
        print(f"  💰 Tax: ${tax:.2f}")
        print(f"  💰 Order Total (subtotal + tax): ${order_total_with_tax:.2f}")
        print(f"  💰 Service Charges Applied: ${service_charges:.2f}")
        print(f"  💰 Final Total: ${total_before_tip:.2f}")
        
        # Check if our service charge was applied
        service_breakdown = result.get("service_charge_breakdown", [])
        our_charge_applied = any(charge["name"] == "Real World Test Charge" for charge in service_breakdown)
        
        # The condition should be: order_total_with_tax <= 20.00
        should_apply = order_total_with_tax <= 20.00
        
        if our_charge_applied == should_apply:
            status = "✅ CORRECT"
            if should_apply:
                print(f"  {status}: Service charge applied (order total ${order_total_with_tax:.2f} ≤ $20.00)")
            else:
                print(f"  {status}: Service charge NOT applied (order total ${order_total_with_tax:.2f} > $20.00)")
        else:
            status = "❌ ERROR"
            if should_apply:
                print(f"  {status}: Service charge should have been applied but wasn't")
            else:
                print(f"  {status}: Service charge shouldn't have been applied but was")
        
        # Show breakdown if charge was applied
        if our_charge_applied:
            for charge in service_breakdown:
                if charge["name"] == "Real World Test Charge":
                    print(f"    └─ Charge calculation: {charge['type']} {charge['amount']}% of ${order_total_with_tax:.2f} = ${charge['calculated_amount']:.2f}")
    
    # Clean up
    print(f"\n🧹 Cleaning up test service charge...")
    requests.delete(f"{API_URL}/tax-charges/service-charges/{charge_data['id']}", headers=headers)
    
    print(f"\n🎯 SUMMARY:")
    print("The service charge condition 'Apply based on order total cost with maximum $20' should:")
    print("• Apply the charge when: (Subtotal + Tax) ≤ $20.00")  
    print("• NOT apply the charge when: (Subtotal + Tax) > $20.00")
    print("• The charge amount is calculated as a percentage of the order total (subtotal + tax)")

if __name__ == "__main__":
    asyncio.run(test_real_world_scenario())