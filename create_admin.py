#!/usr/bin/env python3
import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
from datetime import datetime
import uuid

# Add the backend directory to Python path
sys.path.append('/app/backend')

async def create_demo_users():
    # MongoDB connection
    mongo_url = "mongodb://localhost:27017"
    client = AsyncIOMotorClient(mongo_url)
    db = client["restaurant_pos"]
    
    # Clear existing users to avoid conflicts
    await db.users.delete_many({})
    
    # Hash PINs
    def hash_pin(pin):
        return bcrypt.hashpw(pin.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Create demo users
    demo_users = [
        {
            "id": str(uuid.uuid4()),
            "pin": "1234",
            "role": "manager",
            "full_name": "Demo Manager",
            "phone": "555-0001",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "hashed_pin": hash_pin("1234")
        },
        {
            "id": str(uuid.uuid4()),
            "pin": "5678",
            "role": "employee",
            "full_name": "Demo Employee",
            "phone": "555-0002",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "hashed_pin": hash_pin("5678")
        }
    ]
    
    # Insert demo users
    await db.users.insert_many(demo_users)
    print("✅ Demo users created successfully!")
    print("Manager PIN: 1234 (Demo Manager)")
    print("Employee PIN: 5678 (Demo Employee)")
    
    # Create default tables (1-10)
    await db.tables.delete_many({})  # Clear existing tables
    tables = []
    for i in range(1, 11):
        tables.append({
            "id": str(uuid.uuid4()),
            "number": i,
            "capacity": 4,
            "status": "available",
            "current_order_id": None,
            "created_at": datetime.utcnow()
        })
    
    await db.tables.insert_many(tables)
    print("✅ Default tables (1-10) created!")
    
    # Create sample modifier groups and modifiers
    await db.modifier_groups.delete_many({})
    await db.modifiers.delete_many({})
    
    # Size modifier group
    size_group = {
        "id": str(uuid.uuid4()),
        "name": "Size",
        "required": True,
        "max_selections": 1
    }
    await db.modifier_groups.insert_one(size_group)
    
    size_modifiers = [
        {"id": str(uuid.uuid4()), "name": "Small", "price": 0.0, "group_id": size_group["id"]},
        {"id": str(uuid.uuid4()), "name": "Medium", "price": 1.50, "group_id": size_group["id"]},
        {"id": str(uuid.uuid4()), "name": "Large", "price": 3.00, "group_id": size_group["id"]}
    ]
    await db.modifiers.insert_many(size_modifiers)
    
    # Flavor modifier group for sodas
    flavor_group = {
        "id": str(uuid.uuid4()),
        "name": "Flavor",
        "required": True,
        "max_selections": 1
    }
    await db.modifier_groups.insert_one(flavor_group)
    
    flavor_modifiers = [
        {"id": str(uuid.uuid4()), "name": "Coca Cola", "price": 0.0, "group_id": flavor_group["id"]},
        {"id": str(uuid.uuid4()), "name": "Sprite", "price": 0.0, "group_id": flavor_group["id"]},
        {"id": str(uuid.uuid4()), "name": "Orange Fanta", "price": 0.0, "group_id": flavor_group["id"]},
        {"id": str(uuid.uuid4()), "name": "Diet Coke", "price": 0.0, "group_id": flavor_group["id"]}
    ]
    await db.modifiers.insert_many(flavor_modifiers)
    
    # Extras modifier group
    extras_group = {
        "id": str(uuid.uuid4()),
        "name": "Extras",
        "required": False,
        "max_selections": 5
    }
    await db.modifier_groups.insert_one(extras_group)
    
    extras_modifiers = [
        {"id": str(uuid.uuid4()), "name": "Extra Cheese", "price": 1.50, "group_id": extras_group["id"]},
        {"id": str(uuid.uuid4()), "name": "Bacon", "price": 2.00, "group_id": extras_group["id"]},
        {"id": str(uuid.uuid4()), "name": "Mushrooms", "price": 1.00, "group_id": extras_group["id"]},
        {"id": str(uuid.uuid4()), "name": "Pepperoni", "price": 1.50, "group_id": extras_group["id"]}
    ]
    await db.modifiers.insert_many(extras_modifiers)
    
    print("✅ Sample modifier groups and modifiers created!")
    
    # Update menu items with modifier groups
    await db.menu_items.delete_many({})  # Clear existing items
    sample_items = [
        {
            "id": str(uuid.uuid4()),
            "name": "Margherita Pizza",
            "description": "Fresh tomato sauce, mozzarella, and basil",
            "price": 14.99,
            "category": "Pizza",
            "image_url": "",
            "available": True,
            "modifier_groups": [size_group["id"], extras_group["id"]],
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Cheeseburger",
            "description": "Beef patty with cheese, lettuce, tomato",
            "price": 12.99,
            "category": "Burgers",
            "image_url": "",
            "available": True,
            "modifier_groups": [extras_group["id"]],
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Caesar Salad",
            "description": "Fresh romaine lettuce with caesar dressing",
            "price": 8.99,
            "category": "Salads",
            "image_url": "",
            "available": True,
            "modifier_groups": [extras_group["id"]],
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Soda",
            "description": "Refreshing soft drink",
            "price": 2.99,
            "category": "Beverages",
            "image_url": "",
            "available": True,
            "modifier_groups": [size_group["id"], flavor_group["id"]],
            "created_at": datetime.utcnow()
        }
    ]
    
    # Insert updated menu items
    await db.menu_items.insert_many(sample_items)
    print("✅ Sample menu items with modifiers created!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_demo_users())