from fastapi import FastAPI, APIRouter, HTTPException, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta, timezone
from enum import Enum
import bcrypt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import pytz

# Set timezone to Eastern Daylight Time
EDT = pytz.timezone('US/Eastern')

def get_current_time():
    """Get current time in EDT timezone"""
    return datetime.now(EDT)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
security = HTTPBearer()

# Enums
class OrderStatus(str, Enum):
    DRAFT = "draft"  # In cart, not sent yet
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    READY = "ready"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    PAID = "paid"

class OrderType(str, Enum):
    DINE_IN = "dine_in"
    TAKEOUT = "takeout"
    DELIVERY = "delivery"
    PHONE_ORDER = "phone_order"

class UserRole(str, Enum):
    EMPLOYEE = "employee"
    MANAGER = "manager"

class TableStatus(str, Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    NEEDS_CLEANING = "needs_cleaning"
    RESERVED = "reserved"
    PROBLEM = "problem"

class PaymentMethod(str, Enum):
    CASH = "cash"
    CARD = "card"

class RemovalReason(str, Enum):
    WRONG_ITEM = "wrong_item"
    CUSTOMER_CHANGED_MIND = "customer_changed_mind"
    OTHER = "other"

# Models
class ModifierGroup(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    required: bool = False
    max_selections: int = 1

class Modifier(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price: float = 0.0
    group_id: str

class MenuItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    price: float
    category: str
    image_url: str = ""
    available: bool = True
    created_at: datetime = Field(default_factory=get_current_time)

class MenuItemCreate(BaseModel):
    name: str
    description: str = ""
    price: float
    category: str
    image_url: str = ""
    available: bool = True
    modifier_groups: List[str] = []

class ModifierGroupCreate(BaseModel):
    name: str
    required: bool = False
    max_selections: int = 1

class ModifierCreate(BaseModel):
    name: str
    price: float = 0.0
    group_id: str

class Table(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    number: int
    capacity: int = 4
    status: TableStatus = TableStatus.AVAILABLE
    created_at: datetime = Field(default_factory=get_current_time)

class TableCreate(BaseModel):
    number: int
    capacity: int = 4

class TableUpdate(BaseModel):
    status: TableStatus
    current_order_id: Optional[str] = None

class TableMoveRequest(BaseModel):
    new_table_id: str

class Customer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    email: str = ""
    created_at: datetime = Field(default_factory=get_current_time)

class CustomerCreate(BaseModel):
    name: str
    phone: str
    email: str = ""
    address: str = ""

class OrderItemModifier(BaseModel):
    modifier_id: str
    name: str
    price: float

class OrderItem(BaseModel):
    menu_item_id: str
    menu_item_name: Optional[str] = ""  # Make optional for backward compatibility
    quantity: int
    base_price: Optional[float] = 0.0  # Make optional for backward compatibility
    modifiers: List[OrderItemModifier] = []
    special_instructions: str = ""
    total_price: Optional[float] = 0.0  # Make optional for backward compatibility
    
    # For backward compatibility with old data format
    price: Optional[float] = None

    def __init__(self, **data):
        # Handle backward compatibility
        if 'price' in data and 'base_price' not in data:
            data['base_price'] = data['price']
        if 'price' in data and 'total_price' not in data:
            data['total_price'] = data['price'] * data.get('quantity', 1)
        if 'menu_item_name' not in data:
            data['menu_item_name'] = f"Item {data.get('menu_item_id', '')[:8]}"
            
        super().__init__(**data)

class ItemRemoval(BaseModel):
    reason: RemovalReason
    notes: str = ""
    removed_by: str
    removed_at: datetime = Field(default_factory=get_current_time)

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    customer_id: Optional[str] = None
    customer_name: str = ""
    customer_phone: str = ""
    customer_address: str = ""
    table_id: Optional[str] = None
    table_number: Optional[int] = None
    items: List[OrderItem]
    removed_items: List[Dict] = []  # Track removed items with reasons
    subtotal: float
    tax: float
    tip: float = 0.0
    total: float
    order_type: OrderType
    status: OrderStatus = OrderStatus.DRAFT
    payment_method: Optional[PaymentMethod] = None
    payment_status: str = "pending"
    cash_received: Optional[float] = None
    change_amount: Optional[float] = None
    created_at: datetime = Field(default_factory=get_current_time)
    updated_at: datetime = Field(default_factory=get_current_time)
    delivery_instructions: str = ""
    estimated_time: Optional[datetime] = None

class OrderCreate(BaseModel):
    customer_name: str = ""
    customer_phone: str = ""
    customer_address: str = ""
    table_id: Optional[str] = None
    items: List[Dict]  # Will be processed to OrderItem
    order_type: OrderType
    tip: float = 0.0
    delivery_instructions: str = ""

class PaymentRequest(BaseModel):
    payment_method: PaymentMethod
    cash_received: Optional[float] = None
    email_receipt: Optional[str] = None
    print_receipt: bool = True

class ItemRemovalRequest(BaseModel):
    reason: RemovalReason
    notes: str = ""

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pin: str
    role: UserRole
    full_name: str
    phone: str = ""
    created_at: datetime = Field(default_factory=get_current_time)

class UserCreate(BaseModel):
    pin: str
    role: UserRole
    full_name: str
    phone: str = ""

class UserLogin(BaseModel):
    pin: str

class PinVerification(BaseModel):
    pin: str

class TimeEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    clock_in: datetime
    clock_out: Optional[datetime] = None
    break_start: Optional[datetime] = None
    break_end: Optional[datetime] = None
    total_hours: float = 0.0
    overtime_hours: float = 0.0
    created_at: datetime = Field(default_factory=get_current_time)

# Authentication helpers
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = get_current_time() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return user_id
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

def hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_pin(pin: str, hashed: str) -> bool:
    return bcrypt.checkpw(pin.encode('utf-8'), hashed.encode('utf-8'))

async def verify_user_pin(pin: str) -> Optional[Dict]:
    """Verify PIN and return user data"""
    users = await db.users.find().to_list(1000)
    for user in users:
        if verify_pin(pin, user.get('hashed_pin', '')):
            return user
    return None

# Routes

# Auth routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user exists (by PIN)
    existing_user = await db.users.find_one({"pin": user_data.pin})
    if existing_user:
        raise HTTPException(status_code=400, detail="PIN already registered")
    
    # Hash PIN and create user
    hashed_pin = hash_pin(user_data.pin)
    user_dict = user_data.dict()
    del user_dict['pin']
    user_obj = User(**user_dict)
    
    # Store user with hashed PIN
    user_to_store = user_obj.dict()
    user_to_store['hashed_pin'] = hashed_pin
    
    await db.users.insert_one(user_to_store)
    
    # Create access token
    access_token = create_access_token(data={"sub": user_obj.id})
    return {"access_token": access_token, "token_type": "bearer", "user": user_obj}

@api_router.post("/auth/login")
async def login(login_data: UserLogin):
    user = await verify_user_pin(login_data.pin)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid PIN")
    
    if not user.get('is_active', True):
        raise HTTPException(status_code=401, detail="Account is deactivated")
    
    access_token = create_access_token(data={"sub": user['id']})
    user_obj = User(**{k: v for k, v in user.items() if k not in ['hashed_pin', 'password']})
    return {"access_token": access_token, "token_type": "bearer", "user": user_obj}

@api_router.post("/auth/verify-pin")
async def verify_pin_endpoint(pin_data: PinVerification):
    user = await verify_user_pin(pin_data.pin)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid PIN")
    
    user_obj = User(**{k: v for k, v in user.items() if k not in ['hashed_pin', 'password']})
    return {"valid": True, "user": user_obj}

@api_router.get("/auth/me")
async def get_current_user(user_id: str = Depends(verify_token)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**{k: v for k, v in user.items() if k not in ['hashed_pin', 'password']})

# Modifier Groups routes
@api_router.post("/modifiers/groups", response_model=ModifierGroup)
async def create_modifier_group(group: ModifierGroupCreate, user_id: str = Depends(verify_token)):
    group_obj = ModifierGroup(**group.dict())
    await db.modifier_groups.insert_one(group_obj.dict())
    return group_obj

@api_router.get("/modifiers/groups", response_model=List[ModifierGroup])
async def get_modifier_groups():
    groups = await db.modifier_groups.find().to_list(1000)
    return [ModifierGroup(**group) for group in groups]

@api_router.delete("/modifiers/groups/{group_id}")
async def delete_modifier_group(group_id: str, user_id: str = Depends(verify_token)):
    # Delete all modifiers in this group first
    await db.modifiers.delete_many({"group_id": group_id})
    result = await db.modifier_groups.delete_one({"id": group_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Modifier group not found")
    return {"message": "Modifier group deleted successfully"}

# Modifiers routes
@api_router.post("/modifiers", response_model=Modifier)
async def create_modifier(modifier: ModifierCreate, user_id: str = Depends(verify_token)):
    modifier_obj = Modifier(**modifier.dict())
    await db.modifiers.insert_one(modifier_obj.dict())
    return modifier_obj

@api_router.get("/modifiers", response_model=List[Modifier])
async def get_modifiers():
    modifiers = await db.modifiers.find().to_list(1000)
    return [Modifier(**modifier) for modifier in modifiers]

@api_router.get("/modifiers/group/{group_id}", response_model=List[Modifier])
async def get_modifiers_by_group(group_id: str):
    modifiers = await db.modifiers.find({"group_id": group_id}).to_list(1000)
    return [Modifier(**modifier) for modifier in modifiers]

@api_router.delete("/modifiers/{modifier_id}")
async def delete_modifier(modifier_id: str, user_id: str = Depends(verify_token)):
    result = await db.modifiers.delete_one({"id": modifier_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Modifier not found")
    return {"message": "Modifier deleted successfully"}

# Menu routes
@api_router.post("/menu/items", response_model=MenuItem)
async def create_menu_item(item: MenuItemCreate, user_id: str = Depends(verify_token)):
    item_obj = MenuItem(**item.dict())
    await db.menu_items.insert_one(item_obj.dict())
    return item_obj

@api_router.get("/menu/items", response_model=List[MenuItem])
async def get_menu_items():
    items = await db.menu_items.find({"available": True}).to_list(1000)
    return [MenuItem(**item) for item in items]

@api_router.get("/menu/items/all", response_model=List[MenuItem])
async def get_all_menu_items(user_id: str = Depends(verify_token)):
    items = await db.menu_items.find().to_list(1000)
    return [MenuItem(**item) for item in items]

@api_router.put("/menu/items/{item_id}", response_model=MenuItem)
async def update_menu_item(item_id: str, item: MenuItemCreate, user_id: str = Depends(verify_token)):
    existing_item = await db.menu_items.find_one({"id": item_id})
    if not existing_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    updated_item = MenuItem(id=item_id, **item.dict())
    await db.menu_items.replace_one({"id": item_id}, updated_item.dict())
    return updated_item

@api_router.delete("/menu/items/{item_id}")
async def delete_menu_item(item_id: str, user_id: str = Depends(verify_token)):
    result = await db.menu_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"message": "Menu item deleted successfully"}

@api_router.get("/menu/categories")
async def get_menu_categories():
    categories = await db.menu_items.distinct("category")
    return {"categories": categories}

# Table routes
@api_router.post("/tables", response_model=Table)
async def create_table(table: TableCreate, user_id: str = Depends(verify_token)):
    # Check if table number already exists
    existing_table = await db.tables.find_one({"number": table.number})
    if existing_table:
        raise HTTPException(status_code=400, detail="Table number already exists")
    
    table_obj = Table(**table.dict())
    await db.tables.insert_one(table_obj.dict())
    return table_obj

@api_router.get("/tables", response_model=List[Table])
async def get_tables():
    tables = await db.tables.find().sort("number", 1).to_list(1000)
    return [Table(**table) for table in tables]

@api_router.put("/tables/{table_id}", response_model=Table)
async def update_table(table_id: str, table_update: TableUpdate, user_id: str = Depends(verify_token)):
    existing_table = await db.tables.find_one({"id": table_id})
    if not existing_table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    update_data = table_update.dict()
    update_data['updated_at'] = get_current_time()
    
    await db.tables.update_one({"id": table_id}, {"$set": update_data})
    
    updated_table = await db.tables.find_one({"id": table_id})
    return Table(**updated_table)

@api_router.post("/tables/{table_id}/merge")
async def merge_table_orders(table_id: str, merge_request: TableMoveRequest, user_id: str = Depends(verify_token)):
    # Get source table
    source_table = await db.tables.find_one({"id": table_id})
    if not source_table or not source_table.get("current_order_id"):
        raise HTTPException(status_code=404, detail="No order found on source table")
    
    # Get destination table
    dest_table = await db.tables.find_one({"id": merge_request.new_table_id})
    if not dest_table:
        raise HTTPException(status_code=404, detail="Destination table not found")
    
    if dest_table.get("status") != "occupied" or not dest_table.get("current_order_id"):
        raise HTTPException(status_code=400, detail="Destination table has no order to merge with")
    
    source_order_id = source_table["current_order_id"]
    dest_order_id = dest_table["current_order_id"]
    
    # Get both orders
    source_order = await db.orders.find_one({"id": source_order_id})
    dest_order = await db.orders.find_one({"id": dest_order_id})
    
    if not source_order or not dest_order:
        raise HTTPException(status_code=404, detail="One or both orders not found")
    
    # Merge items from source order into destination order
    merged_items = dest_order["items"] + source_order["items"]
    
    # Recalculate totals
    total_subtotal = dest_order["subtotal"] + source_order["subtotal"]
    total_tax = total_subtotal * 0.08
    total_amount = total_subtotal + total_tax
    
    # Update destination order with merged items
    await db.orders.update_one(
        {"id": dest_order_id},
        {
            "$set": {
                "items": merged_items,
                "subtotal": total_subtotal,
                "tax": total_tax,
                "total": total_amount,
                "updated_at": get_current_time()
            }
        }
    )
    
    # Delete source order
    await db.orders.delete_one({"id": source_order_id})
    
    # Clear source table
    await db.tables.update_one(
        {"id": table_id},
        {"$set": {"status": "available", "current_order_id": None}}
    )
    
    return {"message": "Orders merged successfully"}

@api_router.post("/tables/{table_id}/move")
async def move_table_order(table_id: str, move_request: TableMoveRequest, user_id: str = Depends(verify_token)):
    # Get current table
    current_table = await db.tables.find_one({"id": table_id})
    if not current_table or not current_table.get("current_order_id"):
        raise HTTPException(status_code=404, detail="No order found on this table")
    
    # Get new table
    new_table = await db.tables.find_one({"id": move_request.new_table_id})
    if not new_table:
        raise HTTPException(status_code=404, detail="New table not found")
    
    if new_table.get("status") != "available":
        raise HTTPException(status_code=400, detail="New table is not available")
    
    order_id = current_table["current_order_id"]
    
    # Update order with new table
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"table_id": move_request.new_table_id, "table_number": new_table["number"], "updated_at": get_current_time()}}
    )
    
    # Clear current table
    await db.tables.update_one(
        {"id": table_id},
        {"$set": {"status": "available", "current_order_id": None}}
    )
    
    # Occupy new table
    await db.tables.update_one(
        {"id": move_request.new_table_id},
        {"$set": {"status": "occupied", "current_order_id": order_id}}
    )
    
    return {"message": "Order moved successfully"}

@api_router.delete("/tables/{table_id}")
async def delete_table(table_id: str, user_id: str = Depends(verify_token)):
    result = await db.tables.delete_one({"id": table_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Table not found")
    return {"message": "Table deleted successfully"}

# Customer routes
@api_router.post("/customers", response_model=Customer)
async def create_customer(customer: CustomerCreate, user_id: str = Depends(verify_token)):
    # Check if customer with phone already exists
    existing_customer = await db.customers.find_one({"phone": customer.phone})
    if existing_customer:
        return Customer(**existing_customer)
    
    customer_obj = Customer(**customer.dict())
    await db.customers.insert_one(customer_obj.dict())
    return customer_obj

@api_router.get("/customers", response_model=List[Customer])
async def get_customers(user_id: str = Depends(verify_token)):
    customers = await db.customers.find().to_list(1000)
    return [Customer(**customer) for customer in customers]

@api_router.get("/customers/{phone}")
async def get_customer_by_phone(phone: str, user_id: str = Depends(verify_token)):
    customer = await db.customers.find_one({"phone": phone})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return Customer(**customer)

# Order routes
@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate, user_id: str = Depends(verify_token)):
    # Process order items and calculate totals
    processed_items = []
    subtotal = 0
    
    for item_data in order_data.items:
        menu_item = await db.menu_items.find_one({"id": item_data["menu_item_id"]})
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"Menu item not found: {item_data['menu_item_id']}")
        
        # Process modifiers
        modifiers = []
        modifier_total = 0
        
        for modifier_data in item_data.get("modifiers", []):
            modifier = await db.modifiers.find_one({"id": modifier_data["modifier_id"]})
            if modifier:
                modifiers.append(OrderItemModifier(
                    modifier_id=modifier["id"],
                    name=modifier["name"],
                    price=modifier["price"]
                ))
                modifier_total += modifier["price"]
        
        item_total = (menu_item["price"] + modifier_total) * item_data["quantity"]
        
        order_item = OrderItem(
            menu_item_id=menu_item["id"],
            menu_item_name=menu_item["name"],
            quantity=item_data["quantity"],
            base_price=menu_item["price"],
            modifiers=modifiers,
            special_instructions=item_data.get("special_instructions", ""),
            total_price=item_total
        )
        
        processed_items.append(order_item)
        subtotal += item_total
    
    # Calculate tax and total
    tax = subtotal * 0.08  # 8% tax rate
    total = subtotal + tax + order_data.tip
    
    # Generate order number
    order_count = await db.orders.count_documents({})
    order_number = f"ORD-{order_count + 1:04d}"
    
    # Create customer if provided
    customer_id = None
    if order_data.customer_phone:
        customer_data = CustomerCreate(
            name=order_data.customer_name,
            phone=order_data.customer_phone,
            address=order_data.customer_address
        )
        customer = await create_customer(customer_data, user_id)
        customer_id = customer.id
    
    # Get table info if dine-in
    table_number = None
    if order_data.table_id:
        table = await db.tables.find_one({"id": order_data.table_id})
        if table:
            table_number = table["number"]
    
    order_obj = Order(
        order_number=order_number,
        customer_id=customer_id,
        customer_name=order_data.customer_name,
        customer_phone=order_data.customer_phone,
        customer_address=order_data.customer_address,
        table_id=order_data.table_id,
        table_number=table_number,
        items=processed_items,
        subtotal=subtotal,
        tax=tax,
        tip=order_data.tip,
        total=total,
        order_type=order_data.order_type,
        delivery_instructions=order_data.delivery_instructions,
        created_by=user_id,
        status=OrderStatus.DRAFT  # Start as draft
    )
    
    await db.orders.insert_one(order_obj.dict())
    return order_obj

@api_router.post("/orders/{order_id}/send")
async def send_order_to_kitchen(order_id: str, user_id: str = Depends(verify_token)):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["status"] != "draft":
        raise HTTPException(status_code=400, detail="Order already sent")
    
    # Update order status to pending
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": "pending", "updated_at": get_current_time()}}
    )
    
    # If table order, mark table as occupied
    if order.get("table_id"):
        await db.tables.update_one(
            {"id": order["table_id"]},
            {"$set": {"status": "occupied", "current_order_id": order_id}}
        )
    
    return {"message": "Order sent to kitchen successfully"}

@api_router.post("/orders/{order_id}/pay")
async def process_payment(order_id: str, payment: PaymentRequest, user_id: str = Depends(verify_token)):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = {
        "payment_method": payment.payment_method,
        "payment_status": "completed",
        "status": "paid",
        "updated_at": get_current_time()
    }
    
    # Handle cash payment
    if payment.payment_method == "cash" and payment.cash_received:
        if payment.cash_received < order["total"]:
            raise HTTPException(status_code=400, detail="Insufficient cash received")
        
        change_amount = payment.cash_received - order["total"]
        update_data["cash_received"] = payment.cash_received
        update_data["change_amount"] = change_amount
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    # Free table if it's a table order
    if order.get("table_id"):
        await db.tables.update_one(
            {"id": order["table_id"]},
            {"$set": {"status": "available", "current_order_id": None}}
        )
    
    updated_order = await db.orders.find_one({"id": order_id})
    return {
        "message": "Payment processed successfully",
        "change_amount": update_data.get("change_amount", 0),
        "order": Order(**updated_order)
    }

@api_router.delete("/orders/{order_id}/items/{item_index}")
async def remove_order_item(order_id: str, item_index: int, removal: ItemRemovalRequest, user_id: str = Depends(verify_token)):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if item_index >= len(order["items"]):
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Get user info for tracking
    user = await db.users.find_one({"id": user_id})
    
    # Store removed item info
    removed_item = order["items"][item_index].copy()
    removed_item["removal_info"] = {
        "reason": removal.reason,
        "notes": removal.notes,
        "removed_by": user.get("full_name", "Unknown") if user else "Unknown",
        "removed_at": datetime.utcnow()
    }
    
    # Add to removed items list
    removed_items = order.get("removed_items", [])
    removed_items.append(removed_item)
    
    # Remove item from order
    items = order["items"]
    items.pop(item_index)
    
    # Recalculate totals
    subtotal = sum(item["total_price"] for item in items)
    tax = subtotal * 0.08
    total = subtotal + tax + order.get("tip", 0)
    
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "items": items,
                "removed_items": removed_items,
                "subtotal": subtotal,
                "tax": tax,
                "total": total,
                "updated_at": get_current_time()
            }
        }
    )
    
    return {"message": "Item removed successfully"}

@api_router.get("/orders", response_model=List[Order])
async def get_orders(user_id: str = Depends(verify_token)):
    # Get current user to check role
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Managers see all orders, employees see only their orders
    if user.get("role") == "manager":
        orders = await db.orders.find({"status": {"$ne": "draft"}}).sort("created_at", -1).to_list(1000)
    else:
        orders = await db.orders.find({"created_by": user_id, "status": {"$ne": "draft"}}).sort("created_at", -1).to_list(1000)
    
    return [Order(**order) for order in orders]

@api_router.get("/orders/active", response_model=List[Order])
async def get_active_orders(user_id: str = Depends(verify_token)):
    # Get current user to check role  
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Active orders include pending (pay later) and processing statuses
    active_statuses = ["pending", "confirmed", "preparing", "ready", "out_for_delivery"]
    
    if user.get("role") == "manager":
        orders = await db.orders.find({"status": {"$in": active_statuses}}).sort("created_at", -1).to_list(1000)
    else:
        orders = await db.orders.find({
            "created_by": user_id,
            "status": {"$in": active_statuses}
        }).sort("created_at", -1).to_list(1000)
    
    return [Order(**order) for order in orders]

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, user_id: str = Depends(verify_token)):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if user can access this order
    user = await db.users.find_one({"id": user_id})
    if user.get("role") != "manager" and order["created_by"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return Order(**order)

@api_router.put("/orders/{order_id}")
async def update_order(order_id: str, order_data: OrderCreate, user_id: str = Depends(verify_token)):
    existing_order = await db.orders.find_one({"id": order_id})
    if not existing_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if user can update this order
    user = await db.users.find_one({"id": user_id})
    if user.get("role") != "manager" and existing_order["created_by"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Process order items and calculate totals
    processed_items = []
    subtotal = 0
    
    for item_data in order_data.items:
        menu_item = await db.menu_items.find_one({"id": item_data["menu_item_id"]})
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"Menu item not found: {item_data['menu_item_id']}")
        
        # Process modifiers
        modifiers = []
        modifier_total = 0
        
        for modifier_data in item_data.get("modifiers", []):
            modifier = await db.modifiers.find_one({"id": modifier_data["modifier_id"]})
            if modifier:
                modifiers.append(OrderItemModifier(
                    modifier_id=modifier["id"],
                    name=modifier["name"],
                    price=modifier["price"]
                ))
                modifier_total += modifier["price"]
        
        item_total = (menu_item["price"] + modifier_total) * item_data["quantity"]
        
        order_item = OrderItem(
            menu_item_id=menu_item["id"],
            menu_item_name=menu_item["name"],
            quantity=item_data["quantity"],
            base_price=menu_item["price"],
            modifiers=modifiers,
            special_instructions=item_data.get("special_instructions", ""),
            total_price=item_total
        )
        
        processed_items.append(order_item)
        subtotal += item_total
    
    # Calculate tax and total
    tax = subtotal * 0.08
    total = subtotal + tax + order_data.tip
    
    # Create customer if provided
    customer_id = existing_order.get("customer_id")
    if order_data.customer_phone:
        customer_data = CustomerCreate(
            name=order_data.customer_name,
            phone=order_data.customer_phone,
            address=order_data.customer_address
        )
        customer = await create_customer(customer_data, user_id)
        customer_id = customer.id
    
    # Get table info if dine-in
    table_number = existing_order.get("table_number")
    if order_data.table_id:
        table = await db.tables.find_one({"id": order_data.table_id})
        if table:
            table_number = table["number"]
    
    # Update the order (keeping same order number and ID)
    update_data = {
        "customer_id": customer_id,
        "customer_name": order_data.customer_name,
        "customer_phone": order_data.customer_phone,
        "customer_address": order_data.customer_address,
        "table_id": order_data.table_id,
        "table_number": table_number,
        "items": [item.dict() for item in processed_items],
        "subtotal": subtotal,
        "tax": tax,
        "tip": order_data.tip,
        "total": total,
        "order_type": order_data.order_type,
        "delivery_instructions": order_data.delivery_instructions,
        "updated_at": datetime.utcnow()
    }
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    updated_order = await db.orders.find_one({"id": order_id})
    return Order(**updated_order)

@api_router.delete("/orders/{order_id}")
async def delete_order(order_id: str, user_id: str = Depends(verify_token)):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if user can delete this order
    user = await db.users.find_one({"id": user_id})
    if user.get("role") != "manager" and order["created_by"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Free table if it's a table order
    if order.get("table_id"):
        await db.tables.update_one(
            {"id": order["table_id"]},
            {"$set": {"status": "available", "current_order_id": None}}
        )
    
    result = await db.orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Order deleted successfully"}

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: Dict[str, str], user_id: str = Depends(verify_token)):
    new_status = status.get("status")
    if new_status not in [s.value for s in OrderStatus]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if user can update this order
    user = await db.users.find_one({"id": user_id})
    if user.get("role") != "manager" and order["created_by"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = await db.orders.update_one(
        {"id": order_id}, 
        {"$set": {"status": new_status, "updated_at": get_current_time()}}
    )
    
    return {"message": "Order status updated successfully"}

# Time tracking routes
@api_router.post("/time/clock-in")
async def clock_in(user_id: str = Depends(verify_token)):
    today = get_current_time().date().isoformat()
    
    # Check if already clocked in today
    existing_entry = await db.time_entries.find_one({
        "user_id": user_id,
        "date": today,
        "clock_out": None
    })
    
    if existing_entry:
        raise HTTPException(status_code=400, detail="Already clocked in")
    
    time_entry = TimeEntry(
        user_id=user_id,
        clock_in=get_current_time(),
        date=today
    )
    
    await db.time_entries.insert_one(time_entry.dict())
    return {"message": "Clocked in successfully", "time": time_entry.clock_in}

@api_router.post("/time/clock-out")
async def clock_out(user_id: str = Depends(verify_token)):
    today = get_current_time().date().isoformat()
    
    entry = await db.time_entries.find_one({
        "user_id": user_id,
        "date": today,
        "clock_out": None
    })
    
    if not entry:
        raise HTTPException(status_code=400, detail="Not clocked in")
    
    clock_out_time = get_current_time()
    clock_in_time = entry['clock_in']
    
    # Calculate hours
    total_seconds = (clock_out_time - clock_in_time).total_seconds()
    total_hours = total_seconds / 3600
    
    # Calculate overtime (over 8 hours)
    overtime_hours = max(0, total_hours - 8)
    
    await db.time_entries.update_one(
        {"id": entry['id']},
        {
            "$set": {
                "clock_out": clock_out_time,
                "total_hours": total_hours,
                "overtime_hours": overtime_hours
            }
        }
    )
    
    return {
        "message": "Clocked out successfully",
        "total_hours": total_hours,
        "overtime_hours": overtime_hours
    }

@api_router.get("/time/entries")
async def get_time_entries(user_id: str = Depends(verify_token)):
    entries = await db.time_entries.find({"user_id": user_id}).sort("date", -1).to_list(100)
    return [TimeEntry(**entry) for entry in entries]

@api_router.get("/time/active-employees")
async def get_active_employees(user_id: str = Depends(verify_token)):
    # Check if user is manager
    user = await db.users.find_one({"id": user_id})
    if not user or user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Manager access required")
    
    today = get_current_time().date().isoformat()
    
    # Get active time entries (clocked in but not out)
    active_entries = await db.time_entries.find({
        "date": today,
        "clock_out": None
    }).to_list(1000)
    
    # Get user details for each active entry
    active_employees = []
    for entry in active_entries:
        user_data = await db.users.find_one({"id": entry["user_id"]})
        if user_data:
            clock_in_time = entry["clock_in"]
            now = datetime.utcnow()
            active_hours = (now - clock_in_time).total_seconds() / 3600
            
            active_employees.append({
                "user_id": entry["user_id"],
                "full_name": user_data.get("full_name", "Unknown"),
                "clock_in_time": clock_in_time,
                "active_hours": round(active_hours, 2)
            })
    
    return {"active_employees": active_employees}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()