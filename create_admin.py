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

async def create_admin_user():
    # MongoDB connection
    mongo_url = "mongodb://localhost:27017"
    client = AsyncIOMotorClient(mongo_url)
    db = client["restaurant_pos"]
    
    # Check if admin user already exists
    existing_admin = await db.users.find_one({"username": "admin"})
    if existing_admin:
        print("Admin user already exists!")
        return
    
    # Hash password
    password = "admin123"
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Create admin user
    admin_user = {
        "id": str(uuid.uuid4()),
        "username": "admin",
        "email": "admin@restaurant.com",
        "role": "manager",
        "full_name": "Restaurant Admin",
        "phone": "555-0000",
        "is_active": True,
        "created_at": datetime.utcnow(),
        "password": hashed_password
    }
    
    # Insert admin user
    await db.users.insert_one(admin_user)
    print("✅ Admin user created successfully!")
    print("Username: admin")
    print("Password: admin123")
    
    # Create some sample menu items
    sample_items = [
        {
            "id": str(uuid.uuid4()),
            "name": "Margherita Pizza",
            "description": "Fresh tomato sauce, mozzarella, and basil",
            "price": 14.99,
            "category": "Pizza",
            "image_url": "",
            "available": True,
            "modifiers": ["Extra Cheese"],
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
            "modifiers": ["Extra Cheese", "Bacon"],
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
            "modifiers": ["Grilled Chicken"],
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Coca Cola",
            "description": "Refreshing soft drink",
            "price": 2.99,
            "category": "Beverages",
            "image_url": "",
            "available": True,
            "modifiers": [],
            "created_at": datetime.utcnow()
        }
    ]
    
    # Insert sample menu items
    await db.menu_items.insert_many(sample_items)
    print("✅ Sample menu items created!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_admin_user())