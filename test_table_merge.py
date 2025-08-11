#!/usr/bin/env python3
import requests
import json
import uuid
import random
import string

# Get the backend URL from the frontend .env file
BACKEND_URL = "https://5c6211d0-c981-4aa6-b05c-67ca512180a7.preview.emergentagent.com"
API_URL = f"{BACKEND_URL}/api"

# Global variables
auth_token = None
user_id = None
menu_item_id = None

def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def print_test_result(test_name, success, details=""):
    status = "✅ PASSED" if success else "❌ FAILED"
    print(f"\n{test_name}: {status}")
    if details:
        print(f"Details: {details}")
    return success, details

def setup_auth():
    global auth_token, user_id, menu_item_id
    
    # Login with existing manager account
    login_data = {"pin": "1234"}
    
    try:
        response = requests.post(f"{API_URL}/auth/login", json=login_data)
        response.raise_for_status()
        result = response.json()
        
        auth_token = result.get("access_token")
        user_data = result.get("user", {})
        user_id = user_data.get("id")
        
        print(f"✅ Authenticated as: {user_data.get('full_name')} ({user_data.get('role')})")
        
        # Get an existing menu item
        response = requests.get(f"{API_URL}/menu/items")
        response.raise_for_status()
        menu_items = response.json()
        
        if menu_items:
            menu_item_id = menu_items[0]["id"]
            print(f"✅ Using menu item: {menu_items[0]['name']} (ID: {menu_item_id})")
        else:
            print("❌ No menu items found")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ Authentication failed: {e}")
        return False

def test_enhanced_table_assignment_and_merge():
    """Test the enhanced table assignment and merge functionality as requested in the review"""
    global auth_token, menu_item_id
    print("\n=== Testing Enhanced Table Assignment and Merge Functionality ===")
    
    if not auth_token or not menu_item_id:
        return print_test_result("Enhanced Table Assignment and Merge", False, "Missing required test data")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    try:
        # Test 1: Table Status Management (GET, POST, PUT /api/tables)
        print("\n--- Test 1: Table Status Management ---")
        
        # Create multiple tables with different statuses
        table_names = [f"Test Table {random_string(4)}", f"VIP Table {random_string(4)}", f"Patio {random_string(4)}"]
        table_ids = []
        
        for i, name in enumerate(table_names):
            table_data = {
                "name": name,
                "capacity": 4 + i
            }
            
            response = requests.post(f"{API_URL}/tables", json=table_data, headers=headers)
            response.raise_for_status()
            table = response.json()
            table_ids.append(table.get("id"))
            print(f"Created table: {name} with ID: {table.get('id')}")
        
        # Test GET /api/tables - verify table status updates correctly
        response = requests.get(f"{API_URL}/tables")
        response.raise_for_status()
        tables = response.json()
        
        print(f"Retrieved {len(tables)} tables via GET /api/tables")
        
        # Verify all tables have required fields
        for table in tables:
            required_fields = ["id", "name", "capacity", "status", "current_order_id"]
            missing_fields = [field for field in required_fields if field not in table]
            if missing_fields:
                return print_test_result("Enhanced Table Assignment and Merge", False, 
                                       f"Table missing required fields: {missing_fields}")
        
        # Test 2: Create orders assigned to tables and verify table status updates
        print("\n--- Test 2: Order-Table Relationships ---")
        
        order_ids = []
        for i, table_id in enumerate(table_ids[:2]):  # Use first 2 tables
            order_data = {
                "customer_name": f"Table Test Customer {i+1}",
                "customer_phone": f"555000{i+1:04d}",
                "customer_address": f"{i+1}23 Table Test St",
                "table_id": table_id,
                "items": [
                    {
                        "menu_item_id": menu_item_id,
                        "quantity": i+1,
                        "special_instructions": f"Table {i+1} order"
                    }
                ],
                "order_type": "dine_in",
                "tip": 2.00 + i,
                "order_notes": f"Order for table assignment test {i+1}"
            }
            
            response = requests.post(f"{API_URL}/orders", json=order_data, headers=headers)
            response.raise_for_status()
            order = response.json()
            order_ids.append(order.get("id"))
            
            # Send order to kitchen to make table occupied
            response = requests.post(f"{API_URL}/orders/{order.get('id')}/send", headers=headers)
            response.raise_for_status()
            
            print(f"Created and sent order {order.get('id')} for table {table_id}")
        
        # Verify table statuses are updated to occupied
        response = requests.get(f"{API_URL}/tables")
        response.raise_for_status()
        updated_tables = response.json()
        
        occupied_count = 0
        for table in updated_tables:
            if table.get("id") in table_ids[:2]:
                if table.get("status") == "occupied" and table.get("current_order_id") in order_ids:
                    occupied_count += 1
                    print(f"✅ Table {table.get('name')} correctly occupied by order {table.get('current_order_id')}")
        
        if occupied_count != 2:
            return print_test_result("Enhanced Table Assignment and Merge", False, 
                                   f"Expected 2 occupied tables, found {occupied_count}")
        
        # Test 3: Table Merge Logic (POST /api/tables/{table_id}/merge)
        print("\n--- Test 3: Table Merge Functionality ---")
        
        # We have 2 occupied tables with orders, let's merge them
        source_table_id = table_ids[0]
        dest_table_id = table_ids[1]
        
        # Get original orders for comparison
        response = requests.get(f"{API_URL}/orders/{order_ids[0]}", headers=headers)
        response.raise_for_status()
        source_order = response.json()
        
        response = requests.get(f"{API_URL}/orders/{order_ids[1]}", headers=headers)
        response.raise_for_status()
        dest_order = response.json()
        
        original_source_subtotal = source_order.get("subtotal", 0)
        original_dest_subtotal = dest_order.get("subtotal", 0)
        original_source_tip = source_order.get("tip", 0)
        original_dest_tip = dest_order.get("tip", 0)
        
        print(f"Source order subtotal: ${original_source_subtotal:.2f}, tip: ${original_source_tip:.2f}")
        print(f"Dest order subtotal: ${original_dest_subtotal:.2f}, tip: ${original_dest_tip:.2f}")
        
        # Perform table merge
        merge_request = {"new_table_id": dest_table_id}
        response = requests.post(f"{API_URL}/tables/{source_table_id}/merge", 
                               json=merge_request, headers=headers)
        response.raise_for_status()
        merge_result = response.json()
        
        print(f"Merge result: {merge_result.get('message')}")
        
        # Verify merge results
        # 1. Source table should be available
        response = requests.get(f"{API_URL}/tables")
        response.raise_for_status()
        post_merge_tables = response.json()
        
        source_table_available = False
        dest_table_occupied = False
        
        for table in post_merge_tables:
            if table.get("id") == source_table_id:
                if table.get("status") == "available" and table.get("current_order_id") is None:
                    source_table_available = True
                    print("✅ Source table marked as available after merge")
            elif table.get("id") == dest_table_id:
                if table.get("status") == "occupied" and table.get("current_order_id"):
                    dest_table_occupied = True
                    print("✅ Destination table remains occupied after merge")
        
        if not source_table_available:
            return print_test_result("Enhanced Table Assignment and Merge", False, 
                                   "Source table not marked as available after merge")
        
        if not dest_table_occupied:
            return print_test_result("Enhanced Table Assignment and Merge", False, 
                                   "Destination table not properly occupied after merge")
        
        # 2. Source order should be deleted
        try:
            response = requests.get(f"{API_URL}/orders/{order_ids[0]}", headers=headers)
            if response.status_code == 200:
                return print_test_result("Enhanced Table Assignment and Merge", False, 
                                       "Source order still exists after merge")
        except:
            print("✅ Source order properly deleted after merge")
        
        # 3. Destination order should contain merged items and correct totals
        response = requests.get(f"{API_URL}/orders/{order_ids[1]}", headers=headers)
        response.raise_for_status()
        merged_order = response.json()
        
        merged_items = merged_order.get("items", [])
        merged_subtotal = merged_order.get("subtotal", 0)
        merged_tip = merged_order.get("tip", 0)
        
        print(f"Merged order has {len(merged_items)} items")
        print(f"Merged subtotal: ${merged_subtotal:.2f}, tip: ${merged_tip:.2f}")
        
        # Verify merged order has items from both original orders
        if len(merged_items) < 2:  # Should have at least 2 items (1 from each order)
            return print_test_result("Enhanced Table Assignment and Merge", False, 
                                   "Merged order doesn't contain items from both orders")
        
        # Verify totals are properly combined
        expected_combined_subtotal = original_source_subtotal + original_dest_subtotal
        expected_combined_tip = original_source_tip + original_dest_tip
        
        if abs(merged_subtotal - expected_combined_subtotal) > 0.01:
            return print_test_result("Enhanced Table Assignment and Merge", False, 
                                   f"Merged subtotal incorrect. Expected: ${expected_combined_subtotal:.2f}, Got: ${merged_subtotal:.2f}")
        
        if abs(merged_tip - expected_combined_tip) > 0.01:
            return print_test_result("Enhanced Table Assignment and Merge", False, 
                                   f"Merged tip incorrect. Expected: ${expected_combined_tip:.2f}, Got: ${merged_tip:.2f}")
        
        print("✅ Order merge totals calculated correctly")
        
        # Test 4: Order table reassignment (PUT /api/orders/{order_id}/table)
        print("\n--- Test 4: Order Table Reassignment ---")
        
        # Use the third table for reassignment test
        new_table_id = table_ids[2]
        
        # First, make sure the new table is available
        update_data = {"status": "available", "current_order_id": None}
        response = requests.put(f"{API_URL}/tables/{new_table_id}", json=update_data, headers=headers)
        response.raise_for_status()
        
        # Reassign the merged order to the new table
        table_assignment_data = {"table_id": new_table_id}
        response = requests.put(f"{API_URL}/orders/{order_ids[1]}/table", 
                              json=table_assignment_data, headers=headers)
        response.raise_for_status()
        reassigned_order = response.json()
        
        print(f"Order reassigned to table {new_table_id}")
        
        # Verify order table assignment is updated
        if reassigned_order.get("table_id") != new_table_id:
            return print_test_result("Enhanced Table Assignment and Merge", False, 
                                   "Order table assignment not updated correctly")
        
        # Verify new table is now occupied
        response = requests.get(f"{API_URL}/tables")
        response.raise_for_status()
        final_tables = response.json()
        
        new_table_occupied = False
        old_table_available = False
        
        for table in final_tables:
            if table.get("id") == new_table_id:
                if table.get("status") == "occupied" and table.get("current_order_id") == order_ids[1]:
                    new_table_occupied = True
                    print("✅ New table marked as occupied after reassignment")
            elif table.get("id") == dest_table_id:
                if table.get("status") == "available" and table.get("current_order_id") is None:
                    old_table_available = True
                    print("✅ Old table marked as available after reassignment")
        
        if not new_table_occupied:
            return print_test_result("Enhanced Table Assignment and Merge", False, 
                                   "New table not marked as occupied after reassignment")
        
        if not old_table_available:
            return print_test_result("Enhanced Table Assignment and Merge", False, 
                                   "Old table not marked as available after reassignment")
        
        # Test 5: Data integrity verification
        print("\n--- Test 5: Data Integrity Verification ---")
        
        # Verify no orphaned table references
        response = requests.get(f"{API_URL}/tables")
        response.raise_for_status()
        all_tables = response.json()
        
        response = requests.get(f"{API_URL}/orders/active", headers=headers)
        response.raise_for_status()
        active_orders = response.json()
        
        # Check for orphaned table references
        orphaned_tables = []
        for table in all_tables:
            if table.get("status") == "occupied" and table.get("current_order_id"):
                order_exists = any(order.get("id") == table.get("current_order_id") for order in active_orders)
                if not order_exists:
                    orphaned_tables.append(table.get("id"))
        
        if orphaned_tables:
            return print_test_result("Enhanced Table Assignment and Merge", False, 
                                   f"Found orphaned table references: {orphaned_tables}")
        
        # Check for orders without proper table assignments
        missing_table_assignments = []
        for order in active_orders:
            if order.get("order_type") == "dine_in" and order.get("table_id"):
                table_exists = any(table.get("id") == order.get("table_id") and 
                                 table.get("current_order_id") == order.get("id") 
                                 for table in all_tables)
                if not table_exists:
                    missing_table_assignments.append(order.get("id"))
        
        if missing_table_assignments:
            return print_test_result("Enhanced Table Assignment and Merge", False, 
                                   f"Found orders with missing table assignments: {missing_table_assignments}")
        
        print("✅ Data integrity verified - no orphaned references found")
        
        # Cleanup - pay the remaining order and clean up tables
        print("\n--- Cleanup ---")
        
        # Pay the remaining active order
        payment_data = {"payment_method": "card", "print_receipt": True}
        response = requests.post(f"{API_URL}/orders/{order_ids[1]}/pay", 
                               json=payment_data, headers=headers)
        response.raise_for_status()
        print("✅ Remaining order paid and table freed")
        
        # Delete test tables
        for table_id in table_ids:
            try:
                response = requests.delete(f"{API_URL}/tables/{table_id}", headers=headers)
                response.raise_for_status()
            except:
                pass  # Ignore cleanup errors
        
        return print_test_result("Enhanced Table Assignment and Merge", True, 
                               "All table assignment and merge functionality tests passed successfully")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Enhanced table assignment and merge test failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("Enhanced Table Assignment and Merge", False, error_msg)

if __name__ == "__main__":
    print("🚀 Testing Enhanced Table Assignment and Merge Functionality")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"API URL: {API_URL}")
    
    if setup_auth():
        test_enhanced_table_assignment_and_merge()
    else:
        print("❌ Setup failed, cannot run tests")