#!/usr/bin/env python3
import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient

async def cleanup_database():
    # MongoDB connection
    mongo_url = "mongodb://localhost:27017"
    client = AsyncIOMotorClient(mongo_url)
    db = client["restaurant_pos"]
    
    print("Cleaning up problematic orders...")
    
    # Remove orders that might have invalid data structure
    result = await db.orders.delete_many({})
    print(f"Removed {result.deleted_count} orders")
    
    # Reset table statuses
    await db.tables.update_many({}, {"$set": {"status": "available", "current_order_id": None}})
    print("Reset all table statuses to available")
    
    client.close()
    print("Database cleanup completed!")

if __name__ == "__main__":
    asyncio.run(cleanup_database())