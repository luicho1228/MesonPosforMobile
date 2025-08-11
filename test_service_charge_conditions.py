#!/usr/bin/env python3
"""
Service Charge Condition Logic Test

This script tests that service charge conditions work correctly,
particularly the "Apply based on order total cost" functionality.
"""

import asyncio
import os
import sys
import requests
import json

sys.path.append('/app')
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')

API_URL = "http://localhost:8001/api"

async def test_service_charge_conditions():
    """Test service charge condition logic"""
    
    print("🔧 SERVICE CHARGE CONDITIONS TEST")
    print("=" * 50)
    
    # Get authentication token
    auth_response = requests.post(f"{API_URL}/auth/login", json={"pin": "1234"})
    if auth_response.status_code != 200:
        print(f"❌ Failed to authenticate: {auth_response.status_code}")
        return False
    
    auth_data = auth_response.json()
    token = auth_data.get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    print("✅ Successfully authenticated")
    
    # Clear existing service charges to have clean test
    print("\n📝 Cleaning up existing service charges...")
    existing_charges = requests.get(f"{API_URL}/tax-charges/service-charges", headers=headers)
    if existing_charges.status_code == 200:
        for charge in existing_charges.json():
            if "Test" in charge.get("name", ""):
                requests.delete(f"{API_URL}/tax-charges/service-charges/{charge['id']}", headers=headers)
    
    # Test 1: Service charge with maximum amount based on subtotal
    print("\n📝 Test 1: Creating service charge with $20 maximum based on SUBTOTAL...")
    
    charge_subtotal = {
        "name": "Test Subtotal Max $20",
        "description": "Service charge with $20 max based on subtotal",
        "amount": 10.0,  # 10%
        "type": "percentage",
        "active": True,
        "mandatory": True,
        "applies_to_subtotal": True,  # Based on SUBTOTAL
        "applies_to_order_types": ["dine_in", "takeout", "delivery", "phone_order"],
        "minimum_order_amount": 0.0,
        "maximum_order_amount": 20.0  # Only apply if subtotal ≤ $20
    }
    
    response = requests.post(f"{API_URL}/tax-charges/service-charges", json=charge_subtotal, headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to create subtotal-based charge: {response.status_code}")
        return False
    
    subtotal_charge = response.json()
    print(f"✅ Created subtotal-based charge: {subtotal_charge['id']}")
    
    # Test 2: Service charge with maximum amount based on total
    print("\n📝 Test 2: Creating service charge with $20 maximum based on TOTAL...")
    
    charge_total = {
        "name": "Test Total Max $20",
        "description": "Service charge with $20 max based on total (subtotal + tax)",
        "amount": 5.0,  # 5%
        "type": "percentage",
        "active": True,
        "mandatory": True,
        "applies_to_subtotal": False,  # Based on TOTAL (subtotal + tax)
        "applies_to_order_types": ["dine_in", "takeout", "delivery", "phone_order"],
        "minimum_order_amount": 0.0,
        "maximum_order_amount": 20.0  # Only apply if total ≤ $20
    }
    
    response = requests.post(f"{API_URL}/tax-charges/service-charges", json=charge_total, headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to create total-based charge: {response.status_code}")
        return False
    
    total_charge = response.json()
    print(f"✅ Created total-based charge: {total_charge['id']}")
    
    # Test scenarios
    test_scenarios = [
        {
            "name": "Order with $15 subtotal (under $20 limit)",
            "subtotal": 15.0,
            "order_type": "dine_in",
            "expected_subtotal_charge": True,  # Should apply (subtotal $15 ≤ $20)
            "expected_total_charge": True      # Should apply (total ~$16.24 ≤ $20)
        },
        {
            "name": "Order with $18 subtotal (borderline)",
            "subtotal": 18.0,
            "order_type": "dine_in", 
            "expected_subtotal_charge": True,  # Should apply (subtotal $18 ≤ $20)
            "expected_total_charge": False     # Should NOT apply (total ~$19.48 < $20, but after adding 5% charge it would exceed)
        },
        {
            "name": "Order with $25 subtotal (over $20 limit)",
            "subtotal": 25.0,
            "order_type": "dine_in",
            "expected_subtotal_charge": False, # Should NOT apply (subtotal $25 > $20)
            "expected_total_charge": False     # Should NOT apply (total ~$27.06 > $20)
        }
    ]
    
    print(f"\n📝 Testing {len(test_scenarios)} scenarios...")
    
    for i, scenario in enumerate(test_scenarios, 1):
        print(f"\n--- Scenario {i}: {scenario['name']} ---")
        
        # Test the calculation endpoint directly
        calc_request = {
            "subtotal": scenario["subtotal"],
            "order_type": scenario["order_type"],
            "party_size": 2
        }
        
        response = requests.post(f"{API_URL}/tax-charges/calculate", json=calc_request, headers=headers)
        if response.status_code != 200:
            print(f"❌ Failed to calculate order: {response.status_code}")
            print(f"Response: {response.text}")
            continue
        
        calc_result = response.json()
        
        print(f"  Subtotal: ${scenario['subtotal']:.2f}")
        print(f"  Tax: ${calc_result.get('total_tax', 0):.2f}")  
        print(f"  Service Charges: ${calc_result.get('total_service_charges', 0):.2f}")
        print(f"  Total before charges: ${scenario['subtotal'] + calc_result.get('total_tax', 0):.2f}")
        
        # Analyze the service charge breakdown
        service_breakdown = calc_result.get('service_charge_breakdown', [])
        
        subtotal_charge_applied = any(charge['name'] == 'Test Subtotal Max $20' for charge in service_breakdown)
        total_charge_applied = any(charge['name'] == 'Test Total Max $20' for charge in service_breakdown)
        
        print(f"  Subtotal-based charge applied: {subtotal_charge_applied} (expected: {scenario['expected_subtotal_charge']})")
        print(f"  Total-based charge applied: {total_charge_applied} (expected: {scenario['expected_total_charge']})")
        
        # Verify expectations
        if subtotal_charge_applied != scenario['expected_subtotal_charge']:
            print(f"  ❌ FAIL: Subtotal-based charge expectation not met")
        else:
            print(f"  ✅ PASS: Subtotal-based charge behaved correctly")
            
        if total_charge_applied != scenario['expected_total_charge']:
            print(f"  ❌ FAIL: Total-based charge expectation not met")
        else:
            print(f"  ✅ PASS: Total-based charge behaved correctly")
    
    # Cleanup
    print(f"\n📝 Cleaning up test charges...")
    requests.delete(f"{API_URL}/tax-charges/service-charges/{subtotal_charge['id']}", headers=headers)
    requests.delete(f"{API_URL}/tax-charges/service-charges/{total_charge['id']}", headers=headers)
    print("✅ Test charges cleaned up")
    
    print(f"\n🎉 Service charge condition testing completed!")
    print("Check the results above to see if the logic is working correctly.")
    
    return True

if __name__ == "__main__":
    asyncio.run(test_service_charge_conditions())