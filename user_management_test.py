#!/usr/bin/env python3
import requests
import json
import time
import os
import random
import string
from datetime import datetime

# Get the backend URL from the frontend .env file
BACKEND_URL = "https://13c19c9e-804b-4911-b1a3-7e31ff49e079.preview.emergentagent.com"
API_URL = f"{BACKEND_URL}/api"

# Test results
test_results = {
    "User Management API - GET /auth/users": {"success": False, "details": ""},
    "User Management API - PUT /auth/users/{user_id}": {"success": False, "details": ""},
    "User Management API - DELETE /auth/users/{user_id}": {"success": False, "details": ""},
    "Enhanced User Model": {"success": False, "details": ""},
    "Role-Based Access Control": {"success": False, "details": ""},
    "Self-Delete Prevention": {"success": False, "details": ""},
    "PIN Hashing": {"success": False, "details": ""},
    "Integration with Existing Auth": {"success": False, "details": ""}
}

# Global variables to store test data
manager_token = None
manager_id = None
employee_token = None
employee_id = None
test_user_id = None

# Helper function to generate random string
def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

# Helper function to generate random PIN
def random_pin(length=4):
    return ''.join(random.choices(string.digits, k=length))

# Helper function to print test result
def print_test_result(test_name, success, details=""):
    status = "✅ PASSED" if success else "❌ FAILED"
    print(f"\n{test_name}: {status}")
    if details:
        print(f"Details: {details}")
    return success, details

# 1. Create test users (manager and employee)
def create_test_users():
    global manager_token, manager_id, employee_token, employee_id
    print("\n=== Creating Test Users ===")
    
    # Create manager user
    manager_pin = random_pin()
    manager_data = {
        "pin": manager_pin,
        "role": "manager",
        "full_name": f"Test Manager {random_string(4)}",
        "email": f"manager_{random_string()}@example.com",
        "phone": f"555{random_string(7)}",
        "hourly_rate": 25.00,
        "active": True
    }
    
    try:
        response = requests.post(f"{API_URL}/auth/register", json=manager_data)
        response.raise_for_status()
        result = response.json()
        
        manager_token = result.get("access_token")
        manager_id = result.get("user", {}).get("id")
        
        print(f"Manager user created with ID: {manager_id}")
        print(f"Manager token: {manager_token[:10]}...")
        
        # Create employee user
        employee_pin = random_pin()
        employee_data = {
            "pin": employee_pin,
            "role": "employee",
            "full_name": f"Test Employee {random_string(4)}",
            "email": f"employee_{random_string()}@example.com",
            "phone": f"555{random_string(7)}",
            "hourly_rate": 15.00,
            "active": True
        }
        
        response = requests.post(f"{API_URL}/auth/register", json=employee_data)
        response.raise_for_status()
        result = response.json()
        
        employee_token = result.get("access_token")
        employee_id = result.get("user", {}).get("id")
        
        print(f"Employee user created with ID: {employee_id}")
        print(f"Employee token: {employee_token[:10]}...")
        
        return True
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Failed to create test users: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        print(error_msg)
        return False

# 2. Test GET /auth/users endpoint
def test_get_users():
    global manager_token, employee_token
    print("\n=== Testing GET /api/auth/users Endpoint ===")
    
    if not manager_token or not employee_token:
        return print_test_result("User Management API - GET /auth/users", False, "No auth tokens available")
    
    try:
        # Test with manager token (should succeed)
        print("\nTesting with manager token (should succeed)...")
        manager_headers = {"Authorization": f"Bearer {manager_token}"}
        
        response = requests.get(f"{API_URL}/auth/users", headers=manager_headers)
        response.raise_for_status()
        users = response.json()
        
        print(f"Retrieved {len(users)} users as manager")
        
        # Verify user fields
        if users:
            user = users[0]
            required_fields = ["id", "role", "full_name", "email", "hourly_rate", "active"]
            missing_fields = [field for field in required_fields if field not in user]
            
            if missing_fields:
                return print_test_result("User Management API - GET /auth/users", False, f"User object missing required fields: {missing_fields}")
        
        # Test with employee token (should fail with 403)
        print("\nTesting with employee token (should fail with 403)...")
        employee_headers = {"Authorization": f"Bearer {employee_token}"}
        
        try:
            response = requests.get(f"{API_URL}/auth/users", headers=employee_headers)
            if response.status_code == 403:
                print("Employee access correctly denied with 403 Forbidden")
            else:
                return print_test_result("User Management API - GET /auth/users", False, f"Employee access should be denied but got status code {response.status_code}")
        except requests.exceptions.RequestException as e:
            if hasattr(e, 'response') and e.response.status_code == 403:
                print("Employee access correctly denied with 403 Forbidden")
            else:
                return print_test_result("User Management API - GET /auth/users", False, f"Unexpected error when testing employee access: {str(e)}")
        
        return print_test_result("User Management API - GET /auth/users", True, "Endpoint works correctly with proper role-based access control")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"GET /auth/users test failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("User Management API - GET /auth/users", False, error_msg)

# 3. Test Enhanced User Model
def test_enhanced_user_model():
    global manager_token, manager_id
    print("\n=== Testing Enhanced User Model ===")
    
    if not manager_token or not manager_id:
        return print_test_result("Enhanced User Model", False, "No manager token or ID available")
    
    headers = {"Authorization": f"Bearer {manager_token}"}
    
    try:
        # Get current user to verify enhanced fields
        response = requests.get(f"{API_URL}/auth/me", headers=headers)
        response.raise_for_status()
        user = response.json()
        
        # Check for enhanced fields
        required_fields = ["email", "hourly_rate", "active"]
        missing_fields = [field for field in required_fields if field not in user]
        
        if missing_fields:
            return print_test_result("Enhanced User Model", False, f"User model missing enhanced fields: {missing_fields}")
        
        print(f"User model contains all required enhanced fields:")
        print(f"- email: {user.get('email')}")
        print(f"- hourly_rate: {user.get('hourly_rate')}")
        print(f"- active: {user.get('active')}")
        
        return print_test_result("Enhanced User Model", True, "User model includes all required enhanced fields")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Enhanced user model test failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("Enhanced User Model", False, error_msg)

# 4. Test PUT /auth/users/{user_id} endpoint
def test_update_user():
    global manager_token, employee_token, employee_id, test_user_id
    print("\n=== Testing PUT /api/auth/users/{user_id} Endpoint ===")
    
    if not manager_token or not employee_token or not employee_id:
        return print_test_result("User Management API - PUT /auth/users/{user_id}", False, "Missing required test data")
    
    manager_headers = {"Authorization": f"Bearer {manager_token}"}
    employee_headers = {"Authorization": f"Bearer {employee_token}"}
    
    try:
        # Create a test user to update
        test_pin = random_pin()
        test_user_data = {
            "pin": test_pin,
            "role": "employee",
            "full_name": f"Test Update User {random_string(4)}",
            "email": f"update_{random_string()}@example.com",
            "phone": f"555{random_string(7)}",
            "hourly_rate": 16.50,
            "active": True
        }
        
        response = requests.post(f"{API_URL}/auth/register", json=test_user_data)
        response.raise_for_status()
        result = response.json()
        
        test_user_id = result.get("user", {}).get("id")
        print(f"Created test user with ID: {test_user_id}")
        
        # Test update with manager token (should succeed)
        print("\nTesting update with manager token (should succeed)...")
        update_data = {
            "full_name": f"Updated User {random_string(4)}",
            "email": f"updated_{random_string()}@example.com",
            "hourly_rate": 18.75,
            "active": True,
            "pin": random_pin()
        }
        
        response = requests.put(f"{API_URL}/auth/users/{test_user_id}", json=update_data, headers=manager_headers)
        response.raise_for_status()
        updated_user = response.json()
        
        print(f"User updated successfully: {updated_user.get('full_name')}")
        
        # Verify update was applied
        if updated_user.get("full_name") != update_data["full_name"] or \
           updated_user.get("email") != update_data["email"] or \
           updated_user.get("hourly_rate") != update_data["hourly_rate"]:
            return print_test_result("User Management API - PUT /auth/users/{user_id}", False, "Update was not applied correctly")
        
        # Test update with employee token (should fail with 403)
        print("\nTesting update with employee token (should fail with 403)...")
        try:
            response = requests.put(f"{API_URL}/auth/users/{test_user_id}", json=update_data, headers=employee_headers)
            if response.status_code == 403:
                print("Employee access correctly denied with 403 Forbidden")
            else:
                return print_test_result("User Management API - PUT /auth/users/{user_id}", False, f"Employee access should be denied but got status code {response.status_code}")
        except requests.exceptions.RequestException as e:
            if hasattr(e, 'response') and e.response.status_code == 403:
                print("Employee access correctly denied with 403 Forbidden")
            else:
                return print_test_result("User Management API - PUT /auth/users/{user_id}", False, f"Unexpected error when testing employee access: {str(e)}")
        
        return print_test_result("User Management API - PUT /auth/users/{user_id}", True, "Endpoint works correctly with proper role-based access control")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"PUT /auth/users/{test_user_id} test failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("User Management API - PUT /auth/users/{user_id}", False, error_msg)

# 5. Test DELETE /auth/users/{user_id} endpoint
def test_delete_user():
    global manager_token, employee_token, manager_id, test_user_id
    print("\n=== Testing DELETE /api/auth/users/{user_id} Endpoint ===")
    
    if not manager_token or not employee_token or not test_user_id:
        return print_test_result("User Management API - DELETE /auth/users/{user_id}", False, "Missing required test data")
    
    manager_headers = {"Authorization": f"Bearer {manager_token}"}
    employee_headers = {"Authorization": f"Bearer {employee_token}"}
    
    try:
        # Test delete with employee token (should fail with 403)
        print("\nTesting delete with employee token (should fail with 403)...")
        try:
            response = requests.delete(f"{API_URL}/auth/users/{test_user_id}", headers=employee_headers)
            if response.status_code == 403:
                print("Employee access correctly denied with 403 Forbidden")
            else:
                return print_test_result("User Management API - DELETE /auth/users/{user_id}", False, f"Employee access should be denied but got status code {response.status_code}")
        except requests.exceptions.RequestException as e:
            if hasattr(e, 'response') and e.response.status_code == 403:
                print("Employee access correctly denied with 403 Forbidden")
            else:
                return print_test_result("User Management API - DELETE /auth/users/{user_id}", False, f"Unexpected error when testing employee access: {str(e)}")
        
        # Test self-delete prevention (should fail with 400)
        print("\nTesting self-delete prevention (should fail with 400)...")
        try:
            response = requests.delete(f"{API_URL}/auth/users/{manager_id}", headers=manager_headers)
            if response.status_code == 400:
                print("Self-delete correctly prevented with 400 Bad Request")
            else:
                return print_test_result("User Management API - DELETE /auth/users/{user_id}", False, f"Self-delete should be prevented but got status code {response.status_code}")
        except requests.exceptions.RequestException as e:
            if hasattr(e, 'response') and e.response.status_code == 400:
                print("Self-delete correctly prevented with 400 Bad Request")
            else:
                return print_test_result("User Management API - DELETE /auth/users/{user_id}", False, f"Unexpected error when testing self-delete: {str(e)}")
        
        # Test delete with manager token (should succeed)
        print("\nTesting delete with manager token (should succeed)...")
        response = requests.delete(f"{API_URL}/auth/users/{test_user_id}", headers=manager_headers)
        response.raise_for_status()
        result = response.json()
        
        print(f"User deleted successfully: {result.get('message')}")
        
        # Verify user was deleted by trying to get it
        try:
            response = requests.get(f"{API_URL}/auth/users", headers=manager_headers)
            response.raise_for_status()
            users = response.json()
            
            deleted = True
            for user in users:
                if user.get("id") == test_user_id:
                    deleted = False
                    break
            
            if not deleted:
                return print_test_result("User Management API - DELETE /auth/users/{user_id}", False, "User was not actually deleted")
                
        except requests.exceptions.RequestException as e:
            return print_test_result("User Management API - DELETE /auth/users/{user_id}", False, f"Error verifying deletion: {str(e)}")
        
        return print_test_result("User Management API - DELETE /auth/users/{user_id}", True, "Endpoint works correctly with proper role-based access control and self-delete prevention")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"DELETE /auth/users/{test_user_id} test failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("User Management API - DELETE /auth/users/{user_id}", False, error_msg)

# 6. Test PIN Hashing
def test_pin_hashing():
    print("\n=== Testing PIN Hashing ===")
    
    # Create a user with a known PIN
    test_pin = random_pin()
    test_user_data = {
        "pin": test_pin,
        "role": "employee",
        "full_name": f"PIN Test User {random_string(4)}",
        "email": f"pin_{random_string()}@example.com",
        "phone": f"555{random_string(7)}",
        "hourly_rate": 15.00,
        "active": True
    }
    
    try:
        # Register user
        response = requests.post(f"{API_URL}/auth/register", json=test_user_data)
        response.raise_for_status()
        result = response.json()
        
        pin_test_user_id = result.get("user", {}).get("id")
        pin_test_token = result.get("access_token")
        
        print(f"Created PIN test user with ID: {pin_test_user_id}")
        
        # Test login with the PIN
        login_data = {
            "pin": test_pin
        }
        
        response = requests.post(f"{API_URL}/auth/login", json=login_data)
        response.raise_for_status()
        login_result = response.json()
        
        if not login_result.get("access_token"):
            return print_test_result("PIN Hashing", False, "Failed to login with PIN")
        
        print("Successfully logged in with PIN")
        
        # Test PIN verification endpoint
        verify_data = {
            "pin": test_pin
        }
        
        response = requests.post(f"{API_URL}/auth/verify-pin", json=verify_data)
        response.raise_for_status()
        verify_result = response.json()
        
        if not verify_result.get("valid"):
            return print_test_result("PIN Hashing", False, "PIN verification failed")
        
        print("PIN verification successful")
        
        # Test with wrong PIN
        wrong_pin = str(int(test_pin) + 1) if test_pin != "9999" else "0000"
        wrong_verify_data = {
            "pin": wrong_pin
        }
        
        try:
            response = requests.post(f"{API_URL}/auth/verify-pin", json=wrong_verify_data)
            if response.status_code == 401:
                print("Wrong PIN correctly rejected with 401 Unauthorized")
            else:
                return print_test_result("PIN Hashing", False, f"Wrong PIN should be rejected but got status code {response.status_code}")
        except requests.exceptions.RequestException as e:
            if hasattr(e, 'response') and e.response.status_code == 401:
                print("Wrong PIN correctly rejected with 401 Unauthorized")
            else:
                return print_test_result("PIN Hashing", False, f"Unexpected error when testing wrong PIN: {str(e)}")
        
        # Update PIN using manager token
        if manager_token:
            headers = {"Authorization": f"Bearer {manager_token}"}
            new_pin = random_pin()
            update_data = {
                "pin": new_pin
            }
            
            response = requests.put(f"{API_URL}/auth/users/{pin_test_user_id}", json=update_data, headers=headers)
            response.raise_for_status()
            
            print(f"Updated PIN for test user")
            
            # Test login with new PIN
            new_login_data = {
                "pin": new_pin
            }
            
            response = requests.post(f"{API_URL}/auth/login", json=new_login_data)
            response.raise_for_status()
            new_login_result = response.json()
            
            if not new_login_result.get("access_token"):
                return print_test_result("PIN Hashing", False, "Failed to login with updated PIN")
            
            print("Successfully logged in with updated PIN")
            
            # Test login with old PIN (should fail)
            old_login_data = {
                "pin": test_pin
            }
            
            try:
                response = requests.post(f"{API_URL}/auth/login", json=old_login_data)
                if response.status_code == 401:
                    print("Old PIN correctly rejected with 401 Unauthorized")
                else:
                    return print_test_result("PIN Hashing", False, f"Old PIN should be rejected but got status code {response.status_code}")
            except requests.exceptions.RequestException as e:
                if hasattr(e, 'response') and e.response.status_code == 401:
                    print("Old PIN correctly rejected with 401 Unauthorized")
                else:
                    return print_test_result("PIN Hashing", False, f"Unexpected error when testing old PIN: {str(e)}")
        
        return print_test_result("PIN Hashing", True, "PIN hashing works correctly for authentication, verification, and updates")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"PIN hashing test failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("PIN Hashing", False, error_msg)

# 7. Test Integration with Existing Auth
def test_auth_integration():
    print("\n=== Testing Integration with Existing Auth ===")
    
    # Test /auth/register with enhanced user model
    test_pin = random_pin()
    test_user_data = {
        "pin": test_pin,
        "role": "employee",
        "full_name": f"Integration Test User {random_string(4)}",
        "email": f"integration_{random_string()}@example.com",
        "phone": f"555{random_string(7)}",
        "hourly_rate": 17.25,
        "active": True
    }
    
    try:
        # Register user with enhanced fields
        print("\nTesting /auth/register with enhanced fields...")
        response = requests.post(f"{API_URL}/auth/register", json=test_user_data)
        response.raise_for_status()
        result = response.json()
        
        integration_user_id = result.get("user", {}).get("id")
        integration_token = result.get("access_token")
        
        print(f"Created integration test user with ID: {integration_user_id}")
        
        # Verify enhanced fields were saved
        user = result.get("user", {})
        if user.get("email") != test_user_data["email"] or \
           user.get("hourly_rate") != test_user_data["hourly_rate"] or \
           user.get("active") != test_user_data["active"]:
            return print_test_result("Integration with Existing Auth", False, "Enhanced fields not saved correctly during registration")
        
        # Test /auth/login returns enhanced fields
        print("\nTesting /auth/login returns enhanced fields...")
        login_data = {
            "pin": test_pin
        }
        
        response = requests.post(f"{API_URL}/auth/login", json=login_data)
        response.raise_for_status()
        login_result = response.json()
        
        login_user = login_result.get("user", {})
        if login_user.get("email") != test_user_data["email"] or \
           login_user.get("hourly_rate") != test_user_data["hourly_rate"] or \
           login_user.get("active") != test_user_data["active"]:
            return print_test_result("Integration with Existing Auth", False, "Enhanced fields not returned correctly during login")
        
        # Test /auth/me returns enhanced fields
        print("\nTesting /auth/me returns enhanced fields...")
        headers = {"Authorization": f"Bearer {integration_token}"}
        
        response = requests.get(f"{API_URL}/auth/me", headers=headers)
        response.raise_for_status()
        me_user = response.json()
        
        if me_user.get("email") != test_user_data["email"] or \
           me_user.get("hourly_rate") != test_user_data["hourly_rate"] or \
           me_user.get("active") != test_user_data["active"]:
            return print_test_result("Integration with Existing Auth", False, "Enhanced fields not returned correctly by /auth/me")
        
        return print_test_result("Integration with Existing Auth", True, "All auth endpoints work correctly with enhanced user model")
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Auth integration test failed: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return print_test_result("Integration with Existing Auth", False, error_msg)

# 8. Test Role-Based Access Control
def test_role_based_access():
    global manager_token, employee_token
    print("\n=== Testing Role-Based Access Control ===")
    
    if not manager_token or not employee_token:
        return print_test_result("Role-Based Access Control", False, "No auth tokens available")
    
    manager_headers = {"Authorization": f"Bearer {manager_token}"}
    employee_headers = {"Authorization": f"Bearer {employee_token}"}
    
    # List of endpoints to test with expected access
    endpoints = [
        {"url": f"{API_URL}/auth/users", "method": "get", "manager_access": True, "employee_access": False},
        {"url": f"{API_URL}/auth/me", "method": "get", "manager_access": True, "employee_access": True}
    ]
    
    try:
        for endpoint in endpoints:
            url = endpoint["url"]
            method = endpoint["method"]
            manager_should_access = endpoint["manager_access"]
            employee_should_access = endpoint["employee_access"]
            
            print(f"\nTesting {method.upper()} {url}")
            
            # Test manager access
            print(f"Testing manager access (should {'succeed' if manager_should_access else 'fail'})...")
            try:
                if method == "get":
                    response = requests.get(url, headers=manager_headers)
                elif method == "post":
                    response = requests.post(url, headers=manager_headers)
                elif method == "put":
                    response = requests.put(url, headers=manager_headers)
                elif method == "delete":
                    response = requests.delete(url, headers=manager_headers)
                
                if manager_should_access:
                    if response.status_code >= 400:
                        return print_test_result("Role-Based Access Control", False, f"Manager should have access to {url} but got status code {response.status_code}")
                    print(f"Manager access correctly granted with status code {response.status_code}")
                else:
                    if response.status_code < 400:
                        return print_test_result("Role-Based Access Control", False, f"Manager should not have access to {url} but got status code {response.status_code}")
                    print(f"Manager access correctly denied with status code {response.status_code}")
                    
            except requests.exceptions.RequestException as e:
                if manager_should_access:
                    return print_test_result("Role-Based Access Control", False, f"Error testing manager access to {url}: {str(e)}")
                elif hasattr(e, 'response') and e.response.status_code >= 400:
                    print(f"Manager access correctly denied with status code {e.response.status_code}")
                else:
                    return print_test_result("Role-Based Access Control", False, f"Unexpected error testing manager access to {url}: {str(e)}")
            
            # Test employee access
            print(f"Testing employee access (should {'succeed' if employee_should_access else 'fail'})...")
            try:
                if method == "get":
                    response = requests.get(url, headers=employee_headers)
                elif method == "post":
                    response = requests.post(url, headers=employee_headers)
                elif method == "put":
                    response = requests.put(url, headers=employee_headers)
                elif method == "delete":
                    response = requests.delete(url, headers=employee_headers)
                
                if employee_should_access:
                    if response.status_code >= 400:
                        return print_test_result("Role-Based Access Control", False, f"Employee should have access to {url} but got status code {response.status_code}")
                    print(f"Employee access correctly granted with status code {response.status_code}")
                else:
                    if response.status_code < 400:
                        return print_test_result("Role-Based Access Control", False, f"Employee should not have access to {url} but got status code {response.status_code}")
                    print(f"Employee access correctly denied with status code {response.status_code}")
                    
            except requests.exceptions.RequestException as e:
                if employee_should_access:
                    return print_test_result("Role-Based Access Control", False, f"Error testing employee access to {url}: {str(e)}")
                elif hasattr(e, 'response') and e.response.status_code >= 400:
                    print(f"Employee access correctly denied with status code {e.response.status_code}")
                else:
                    return print_test_result("Role-Based Access Control", False, f"Unexpected error testing employee access to {url}: {str(e)}")
        
        return print_test_result("Role-Based Access Control", True, "Role-based access control works correctly for all tested endpoints")
        
    except Exception as e:
        return print_test_result("Role-Based Access Control", False, f"Role-based access control test failed: {str(e)}")

# Run all tests
def run_all_tests():
    print("\n========================================")
    print("USER MANAGEMENT API TEST SUITE")
    print("========================================")
    print(f"Testing against API URL: {API_URL}")
    print("Starting tests at:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("========================================\n")
    
    # Create test users first
    if not create_test_users():
        print("❌ Failed to create test users. Aborting tests.")
        return test_results
    
    # Run tests in sequence
    enhanced_success, enhanced_details = test_enhanced_user_model()
    test_results["Enhanced User Model"]["success"] = enhanced_success
    test_results["Enhanced User Model"]["details"] = enhanced_details
    
    get_users_success, get_users_details = test_get_users()
    test_results["User Management API - GET /auth/users"]["success"] = get_users_success
    test_results["User Management API - GET /auth/users"]["details"] = get_users_details
    
    update_success, update_details = test_update_user()
    test_results["User Management API - PUT /auth/users/{user_id}"]["success"] = update_success
    test_results["User Management API - PUT /auth/users/{user_id}"]["details"] = update_details
    
    delete_success, delete_details = test_delete_user()
    test_results["User Management API - DELETE /auth/users/{user_id}"]["success"] = delete_success
    test_results["User Management API - DELETE /auth/users/{user_id}"]["details"] = delete_details
    
    pin_success, pin_details = test_pin_hashing()
    test_results["PIN Hashing"]["success"] = pin_success
    test_results["PIN Hashing"]["details"] = pin_details
    
    auth_success, auth_details = test_auth_integration()
    test_results["Integration with Existing Auth"]["success"] = auth_success
    test_results["Integration with Existing Auth"]["details"] = auth_details
    
    rbac_success, rbac_details = test_role_based_access()
    test_results["Role-Based Access Control"]["success"] = rbac_success
    test_results["Role-Based Access Control"]["details"] = rbac_details
    
    # Self-delete prevention is tested as part of the DELETE endpoint test
    test_results["Self-Delete Prevention"]["success"] = delete_success
    test_results["Self-Delete Prevention"]["details"] = "Tested as part of DELETE endpoint test"
    
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