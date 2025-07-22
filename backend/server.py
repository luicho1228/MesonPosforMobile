from fastapi.encoders import jsonable_encoder
from fastapi import FastAPI, APIRouter, HTTPException, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
import json
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
    """Get current time in EDT timezone, convert to UTC for storage"""
    edt_time = datetime.now(EDT)
    # Convert to UTC for consistent storage
    utc_time = edt_time.astimezone(pytz.UTC)
    return utc_time

# Custom serializer for proper datetime handling
def serialize_datetime(dt):
    """Serialize datetime to ISO format with timezone info"""
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            # If timezone naive, assume UTC
            dt = dt.replace(tzinfo=pytz.UTC)
        return dt.isoformat()
    return dt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Custom JSON response for proper datetime serialization
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

class CustomJSONResponse(JSONResponse):
    def render(self, content: Any) -> bytes:
        # Custom serialization for datetime objects
        def custom_serializer(obj):
            if isinstance(obj, datetime):
                if obj.tzinfo is None:
                    # If timezone naive, assume UTC
                    obj = obj.replace(tzinfo=pytz.UTC)
                return obj.isoformat()
            raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
        
        return json.dumps(content, default=custom_serializer, ensure_ascii=False, allow_nan=False, indent=None, separators=(",", ":")).encode("utf-8")

# Set default response class
app.default_response_class = CustomJSONResponse

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
    modifier_groups: List[str] = []
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
    name: str = ""  # Custom table name (e.g., "Bar 1", "Patio A")
    capacity: int = 4
    status: TableStatus = TableStatus.AVAILABLE
    current_order_id: Optional[str] = None
    created_at: datetime = Field(default_factory=get_current_time)

class TableCreate(BaseModel):
    number: int
    name: str = ""  # Custom table name
    capacity: int = 4

class TableUpdate(BaseModel):
    name: Optional[str] = None  # Allow updating table name
    capacity: Optional[int] = None  # Allow updating capacity
    status: TableStatus
    current_order_id: Optional[str] = None

class TableMoveRequest(BaseModel):
    new_table_id: str

class Customer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    email: str = ""
    address: str = ""
    apartment: str = ""  # Apartment/unit number
    notes: str = ""  # Additional notes about customer
    total_orders: int = 0  # Total number of orders
    total_spent: float = 0.0  # Total amount spent
    last_order_date: Optional[datetime] = None  # Date of last order
    created_at: datetime = Field(default_factory=get_current_time)
    updated_at: datetime = Field(default_factory=get_current_time)

class CustomerCreate(BaseModel):
    name: str
    phone: str
    email: str = ""
    address: str = ""
    apartment: str = ""
    notes: str = ""

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    apartment: Optional[str] = None
    notes: Optional[str] = None

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
    customer_apartment: str = ""  # Customer apartment/unit number
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
    created_by: str = ""
    created_at: datetime = Field(default_factory=get_current_time)
    updated_at: datetime = Field(default_factory=get_current_time)
    delivery_instructions: str = ""
    order_notes: str = ""  # Notes/comments for the order (appears on receipt)
    estimated_time: Optional[datetime] = None
    cancellation_info: Optional[Dict] = None  # Cancellation details when order is cancelled

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class OrderCreate(BaseModel):
    customer_name: str = ""
    customer_phone: str = ""
    customer_address: str = ""
    customer_apartment: str = ""
    table_id: Optional[str] = None
    items: List[Dict]  # Will be processed to OrderItem
    order_type: OrderType
    tip: float = 0.0
    delivery_instructions: str = ""
    order_notes: str = ""  # Notes/comments for the order

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
    role: UserRole
    full_name: str
    email: str = ""
    phone: str = ""
    hourly_rate: float = 15.00
    active: bool = True
    created_at: datetime = Field(default_factory=get_current_time)

class UserCreate(BaseModel):
    pin: str
    role: UserRole
    full_name: str
    email: str = ""
    phone: str = ""
    hourly_rate: float = 15.00
    active: bool = True

class UserUpdate(BaseModel):
    role: Optional[UserRole] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    hourly_rate: Optional[float] = None
    active: Optional[bool] = None
    pin: Optional[str] = None

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

# Tax & Charges Models
class TaxRateType(str, Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"

class ChargeType(str, Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"

class TaxRate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    rate: float  # percentage (e.g., 8.5 for 8.5%) or fixed amount
    type: TaxRateType = TaxRateType.PERCENTAGE
    active: bool = True
    applies_to_order_types: List[str] = ["dine_in", "takeout", "delivery", "phone_order"]
    created_at: datetime = Field(default_factory=get_current_time)
    updated_at: datetime = Field(default_factory=get_current_time)

class ServiceCharge(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    amount: float  # percentage or fixed amount
    type: ChargeType = ChargeType.PERCENTAGE
    active: bool = True
    mandatory: bool = False
    applies_to_subtotal: bool = True  # If false, applies to total
    applies_to_order_types: List[str] = ["dine_in", "takeout", "delivery", "phone_order"]
    minimum_order_amount: float = 0.0
    created_at: datetime = Field(default_factory=get_current_time)
    updated_at: datetime = Field(default_factory=get_current_time)

class GratuityRule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    amount: float  # percentage or fixed amount
    type: ChargeType = ChargeType.PERCENTAGE
    active: bool = True
    minimum_order_amount: float = 0.0
    maximum_order_amount: float = 0.0  # 0 means no maximum
    applies_to_order_types: List[str] = ["dine_in", "takeout", "delivery", "phone_order"]
    party_size_minimum: int = 0  # minimum party size for auto-gratuity
    created_at: datetime = Field(default_factory=get_current_time)
    updated_at: datetime = Field(default_factory=get_current_time)

class DiscountPolicy(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    amount: float  # percentage or fixed amount
    type: ChargeType = ChargeType.PERCENTAGE
    active: bool = True
    applies_to_order_types: List[str] = ["dine_in", "takeout", "delivery", "phone_order"]
    minimum_order_amount: float = 0.0
    requires_manager_approval: bool = False
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    usage_limit: int = 0  # 0 means unlimited
    times_used: int = 0
    created_at: datetime = Field(default_factory=get_current_time)
    updated_at: datetime = Field(default_factory=get_current_time)

# Create/Update models for Tax & Charges
class TaxRateCreate(BaseModel):
    name: str
    description: str = ""
    rate: float
    type: TaxRateType = TaxRateType.PERCENTAGE
    active: bool = True
    applies_to_order_types: List[str] = ["dine_in", "takeout", "delivery", "phone_order"]

class ServiceChargeCreate(BaseModel):
    name: str
    description: str = ""
    amount: float
    type: ChargeType = ChargeType.PERCENTAGE
    active: bool = True
    mandatory: bool = False
    applies_to_subtotal: bool = True
    applies_to_order_types: List[str] = ["dine_in", "takeout", "delivery", "phone_order"]
    minimum_order_amount: float = 0.0

class GratuityRuleCreate(BaseModel):
    name: str
    description: str = ""
    amount: float
    type: ChargeType = ChargeType.PERCENTAGE
    active: bool = True
    minimum_order_amount: float = 0.0
    maximum_order_amount: float = 0.0
    applies_to_order_types: List[str] = ["dine_in", "takeout", "delivery", "phone_order"]
    party_size_minimum: int = 0

class DiscountPolicyCreate(BaseModel):
    name: str
    description: str = ""
    amount: float
    type: ChargeType = ChargeType.PERCENTAGE
    active: bool = True
    applies_to_order_types: List[str] = ["dine_in", "takeout", "delivery", "phone_order"]
    minimum_order_amount: float = 0.0
    requires_manager_approval: bool = False
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    usage_limit: int = 0

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

# User Management Routes
@api_router.get("/auth/users", response_model=List[User])
async def get_all_users(user_id: str = Depends(verify_token)):
    # Only managers can access user list
    current_user = await db.users.find_one({"id": user_id})
    if not current_user or current_user.get('role') != 'manager':
        raise HTTPException(status_code=403, detail="Access denied. Manager role required.")
    
    users = await db.users.find().to_list(1000)
    return [User(**{k: v for k, v in user.items() if k not in ['hashed_pin', 'password']}) for user in users]

@api_router.put("/auth/users/{target_user_id}", response_model=User)
async def update_user(target_user_id: str, user_data: UserUpdate, user_id: str = Depends(verify_token)):
    # Only managers can update users
    current_user = await db.users.find_one({"id": user_id})
    if not current_user or current_user.get('role') != 'manager':
        raise HTTPException(status_code=403, detail="Access denied. Manager role required.")
    
    # Find target user
    target_user = await db.users.find_one({"id": target_user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prepare update data
    update_data = {}
    if user_data.role is not None:
        update_data['role'] = user_data.role
    if user_data.full_name is not None:
        update_data['full_name'] = user_data.full_name
    if user_data.email is not None:
        update_data['email'] = user_data.email
    if user_data.phone is not None:
        update_data['phone'] = user_data.phone
    if user_data.hourly_rate is not None:
        update_data['hourly_rate'] = user_data.hourly_rate
    if user_data.active is not None:
        update_data['active'] = user_data.active
    if user_data.pin is not None:
        # Hash the new PIN
        update_data['hashed_pin'] = hash_pin(user_data.pin)
    
    if update_data:
        await db.users.update_one({"id": target_user_id}, {"$set": update_data})
    
    # Return updated user
    updated_user = await db.users.find_one({"id": target_user_id})
    return User(**{k: v for k, v in updated_user.items() if k not in ['hashed_pin', 'password']})

@api_router.delete("/auth/users/{target_user_id}")
async def delete_user(target_user_id: str, user_id: str = Depends(verify_token)):
    # Only managers can delete users
    current_user = await db.users.find_one({"id": user_id})
    if not current_user or current_user.get('role') != 'manager':
        raise HTTPException(status_code=403, detail="Access denied. Manager role required.")
    
    # Cannot delete yourself
    if target_user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    # Find target user
    target_user = await db.users.find_one({"id": target_user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete user
    await db.users.delete_one({"id": target_user_id})
    return {"message": "User deleted successfully"}

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
    
    # Build update data with only provided fields
    update_data = {}
    if table_update.name is not None:
        update_data['name'] = table_update.name
    if table_update.capacity is not None:
        update_data['capacity'] = table_update.capacity
    update_data['status'] = table_update.status
    if table_update.current_order_id is not None:
        update_data['current_order_id'] = table_update.current_order_id
    
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
    total_tip = dest_order.get("tip", 0) + source_order.get("tip", 0)
    total_amount = total_subtotal + total_tax + total_tip
    
    # Update destination order with merged items
    await db.orders.update_one(
        {"id": dest_order_id},
        {
            "$set": {
                "items": merged_items,
                "subtotal": total_subtotal,
                "tax": total_tax,
                "tip": total_tip,
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
    customers = await db.customers.find().sort("created_at", -1).to_list(1000)
    return [Customer(**customer) for customer in customers]

@api_router.get("/customers/{phone}")
async def get_customer_by_phone(phone: str, user_id: str = Depends(verify_token)):
    customer = await db.customers.find_one({"phone": phone})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return Customer(**customer)

@api_router.put("/customers/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, customer_update: CustomerUpdate, user_id: str = Depends(verify_token)):
    existing_customer = await db.customers.find_one({"id": customer_id})
    if not existing_customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Update only provided fields
    update_data = {k: v for k, v in customer_update.dict().items() if v is not None}
    update_data["updated_at"] = get_current_time()
    
    await db.customers.update_one({"id": customer_id}, {"$set": update_data})
    
    updated_customer = await db.customers.find_one({"id": customer_id})
    return Customer(**updated_customer)

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, user_id: str = Depends(verify_token)):
    result = await db.customers.delete_one({"id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted successfully"}

@api_router.get("/customers/{customer_id}/orders", response_model=List[Order])
async def get_customer_orders(customer_id: str, user_id: str = Depends(verify_token)):
    # Get customer to verify they exist
    customer = await db.customers.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get all orders for this customer
    orders = await db.orders.find({
        "$or": [
            {"customer_id": customer_id},
            {"customer_phone": customer["phone"]}
        ],
        "status": {"$ne": "draft"}
    }).sort("created_at", -1).to_list(1000)
    
    return [Order(**order) for order in orders]

@api_router.get("/customers/{customer_id}/stats")
async def get_customer_stats(customer_id: str, user_id: str = Depends(verify_token)):
    # Get customer to verify they exist
    customer = await db.customers.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get all paid orders for this customer
    orders = await db.orders.find({
        "$or": [
            {"customer_id": customer_id},
            {"customer_phone": customer["phone"]}
        ],
        "status": "paid"
    }).to_list(1000)
    
    total_orders = len(orders)
    total_spent = sum(order.get("total", 0) for order in orders)
    
    # Find last order date
    last_order_date = None
    if orders:
        last_order = max(orders, key=lambda o: o.get("created_at", datetime.min))
        last_order_date = last_order.get("created_at")
    
    # Calculate days since last order
    days_since_last_order = None
    if last_order_date:
        if isinstance(last_order_date, str):
            last_order_date = datetime.fromisoformat(last_order_date.replace('Z', '+00:00'))
        elif isinstance(last_order_date, datetime) and last_order_date.tzinfo is None:
            last_order_date = last_order_date.replace(tzinfo=pytz.UTC)
        
        current_time = get_current_time()
        days_since_last_order = (current_time - last_order_date).days
    
    return {
        "total_orders": total_orders,
        "total_spent": total_spent,
        "last_order_date": last_order_date,
        "days_since_last_order": days_since_last_order,
        "average_order_value": total_spent / total_orders if total_orders > 0 else 0
    }

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
    
    # Create or update customer if provided
    customer_id = None
    if order_data.customer_phone:
        # Check if customer exists
        existing_customer = await db.customers.find_one({"phone": order_data.customer_phone})
        
        if existing_customer:
            # Update existing customer info if new data is provided
            update_data = {}
            if order_data.customer_name and order_data.customer_name != existing_customer.get("name", ""):
                update_data["name"] = order_data.customer_name
            if order_data.customer_address and order_data.customer_address != existing_customer.get("address", ""):
                update_data["address"] = order_data.customer_address
            
            if update_data:
                update_data["updated_at"] = get_current_time()
                await db.customers.update_one({"id": existing_customer["id"]}, {"$set": update_data})
            
            customer_id = existing_customer["id"]
        else:
            # Create new customer
            customer_data = CustomerCreate(
                name=order_data.customer_name,
                phone=order_data.customer_phone,
                address=order_data.customer_address
            )
            new_customer = Customer(**customer_data.dict())
            await db.customers.insert_one(new_customer.dict())
            customer_id = new_customer.id
    
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
        order_notes=order_data.order_notes,
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
    
    # Update customer statistics if customer exists
    if order.get("customer_id") or order.get("customer_phone"):
        customer = None
        if order.get("customer_id"):
            customer = await db.customers.find_one({"id": order["customer_id"]})
        elif order.get("customer_phone"):
            customer = await db.customers.find_one({"phone": order["customer_phone"]})
        
        if customer:
            # Calculate new statistics
            customer_orders = await db.orders.find({
                "$or": [
                    {"customer_id": customer["id"]},
                    {"customer_phone": customer["phone"]}
                ],
                "status": "paid"
            }).to_list(1000)
            
            total_orders = len(customer_orders)
            total_spent = sum(order_item.get("total", 0) for order_item in customer_orders)
            
            # Update customer record
            await db.customers.update_one(
                {"id": customer["id"]},
                {"$set": {
                    "total_orders": total_orders,
                    "total_spent": total_spent,
                    "last_order_date": get_current_time(),
                    "updated_at": get_current_time()
                }}
            )
    
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

class OrderCancellation(BaseModel):
    reason: str  # "customer_canceled", "wrong_order", "other"
    notes: str = ""  # Additional details, especially for "other"

@api_router.post("/orders/{order_id}/cancel")
async def cancel_order(order_id: str, cancellation: OrderCancellation, user_id: str = Depends(verify_token)):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Only allow canceling orders that are not already paid or delivered
    if order.get("status") in ["paid", "delivered", "cancelled"]:
        raise HTTPException(status_code=400, detail="Cannot cancel paid, delivered, or already cancelled orders")
    
    # Get user info for tracking
    user = await db.users.find_one({"id": user_id})
    
    # Update order status to cancelled with cancellation details
    cancellation_info = {
        "reason": cancellation.reason,
        "notes": cancellation.notes,
        "cancelled_by": user.get("full_name", "Unknown") if user else "Unknown",
        "cancelled_at": get_current_time()
    }
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "status": "cancelled", 
            "updated_at": get_current_time(),
            "cancellation_info": cancellation_info
        }}
    )
    
    # Free table if it's a table order
    if order.get("table_id"):
        await db.tables.update_one(
            {"id": order["table_id"]},
            {"$set": {"status": "available", "current_order_id": None}}
        )
    
    return {"message": "Order cancelled successfully", "cancellation_info": cancellation_info}

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
    subtotal = sum(item.get("total_price", 0) or (item.get("price", 0) * item.get("quantity", 1)) for item in items)
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
        "order_notes": order_data.order_notes,
        "updated_at": get_current_time()
    }
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    updated_order = await db.orders.find_one({"id": order_id})
    return Order(**updated_order)

@api_router.put("/orders/{order_id}/table")
async def assign_table_to_order(order_id: str, table_data: dict, user_id: str = Depends(verify_token)):
    # Check if order exists
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if table exists
    table_id = table_data.get("table_id")
    table = await db.tables.find_one({"id": table_id})
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    # Update order with table assignment
    table_number = table.get("number")
    update_data = {
        "table_id": table_id,
        "table_number": table_number,
        "updated_at": get_current_time()
    }
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    # Update table status to occupied and assign order
    await db.tables.update_one(
        {"id": table_id}, 
        {"$set": {"status": "occupied", "current_order_id": order_id}}
    )
    
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

# Tax & Charges Management Routes

# Tax Rates
@api_router.get("/tax-charges/tax-rates", response_model=List[TaxRate])
async def get_tax_rates(user_id: str = Depends(verify_token)):
    user = await db.users.find_one({"id": user_id})
    if user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Access denied - Manager role required")
    
    tax_rates = await db.tax_rates.find().sort("created_at", -1).to_list(1000)
    return [TaxRate(**rate) for rate in tax_rates]

@api_router.post("/tax-charges/tax-rates", response_model=TaxRate)
async def create_tax_rate(tax_rate: TaxRateCreate, user_id: str = Depends(verify_token)):
    user = await db.users.find_one({"id": user_id})
    if user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Access denied - Manager role required")
    
    tax_rate_obj = TaxRate(**tax_rate.dict())
    await db.tax_rates.insert_one(tax_rate_obj.dict())
    return tax_rate_obj

@api_router.put("/tax-charges/tax-rates/{tax_rate_id}", response_model=TaxRate)
async def update_tax_rate(tax_rate_id: str, tax_rate_update: TaxRateCreate, user_id: str = Depends(verify_token)):
    user = await db.users.find_one({"id": user_id})
    if user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Access denied - Manager role required")
    
    existing_rate = await db.tax_rates.find_one({"id": tax_rate_id})
    if not existing_rate:
        raise HTTPException(status_code=404, detail="Tax rate not found")
    
    update_data = tax_rate_update.dict()
    update_data["updated_at"] = get_current_time()
    
    await db.tax_rates.update_one({"id": tax_rate_id}, {"$set": update_data})
    updated_rate = await db.tax_rates.find_one({"id": tax_rate_id})
    return TaxRate(**updated_rate)

@api_router.delete("/tax-charges/tax-rates/{tax_rate_id}")
async def delete_tax_rate(tax_rate_id: str, user_id: str = Depends(verify_token)):
    user = await db.users.find_one({"id": user_id})
    if user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Access denied - Manager role required")
    
    result = await db.tax_rates.delete_one({"id": tax_rate_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tax rate not found")
    
    return {"message": "Tax rate deleted successfully"}

# Service Charges
@api_router.get("/tax-charges/service-charges", response_model=List[ServiceCharge])
async def get_service_charges(user_id: str = Depends(verify_token)):
    user = await db.users.find_one({"id": user_id})
    if user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Access denied - Manager role required")
    
    charges = await db.service_charges.find().sort("created_at", -1).to_list(1000)
    return [ServiceCharge(**charge) for charge in charges]

@api_router.post("/tax-charges/service-charges", response_model=ServiceCharge)
async def create_service_charge(service_charge: ServiceChargeCreate, user_id: str = Depends(verify_token)):
    user = await db.users.find_one({"id": user_id})
    if user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Access denied - Manager role required")
    
    charge_obj = ServiceCharge(**service_charge.dict())
    await db.service_charges.insert_one(charge_obj.dict())
    return charge_obj

@api_router.put("/tax-charges/service-charges/{charge_id}", response_model=ServiceCharge)
async def update_service_charge(charge_id: str, charge_update: ServiceChargeCreate, user_id: str = Depends(verify_token)):
    user = await db.users.find_one({"id": user_id})
    if user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Access denied - Manager role required")
    
    existing_charge = await db.service_charges.find_one({"id": charge_id})
    if not existing_charge:
        raise HTTPException(status_code=404, detail="Service charge not found")
    
    update_data = charge_update.dict()
    update_data["updated_at"] = get_current_time()
    
    await db.service_charges.update_one({"id": charge_id}, {"$set": update_data})
    updated_charge = await db.service_charges.find_one({"id": charge_id})
    return ServiceCharge(**updated_charge)

@api_router.delete("/tax-charges/service-charges/{charge_id}")
async def delete_service_charge(charge_id: str, user_id: str = Depends(verify_token)):
    user = await db.users.find_one({"id": user_id})
    if user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Access denied - Manager role required")
    
    result = await db.service_charges.delete_one({"id": charge_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service charge not found")
    
    return {"message": "Service charge deleted successfully"}

# Gratuity Rules
@api_router.get("/tax-charges/gratuity-rules", response_model=List[GratuityRule])
async def get_gratuity_rules(user_id: str = Depends(verify_token)):
    user = await db.users.find_one({"id": user_id})
    if user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Access denied - Manager role required")
    
    rules = await db.gratuity_rules.find().sort("created_at", -1).to_list(1000)
    return [GratuityRule(**rule) for rule in rules]

@api_router.post("/tax-charges/gratuity-rules", response_model=GratuityRule)
async def create_gratuity_rule(gratuity_rule: GratuityRuleCreate, user_id: str = Depends(verify_token)):
    user = await db.users.find_one({"id": user_id})
    if user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Access denied - Manager role required")
    
    rule_obj = GratuityRule(**gratuity_rule.dict())
    await db.gratuity_rules.insert_one(rule_obj.dict())
    return rule_obj

@api_router.put("/tax-charges/gratuity-rules/{rule_id}", response_model=GratuityRule)
async def update_gratuity_rule(rule_id: str, rule_update: GratuityRuleCreate, user_id: str = Depends(verify_token)):
    user = await db.users.find_one({"id": user_id})
    if user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Access denied - Manager role required")
    
    existing_rule = await db.gratuity_rules.find_one({"id": rule_id})
    if not existing_rule:
        raise HTTPException(status_code=404, detail="Gratuity rule not found")
    
    update_data = rule_update.dict()
    update_data["updated_at"] = get_current_time()
    
    await db.gratuity_rules.update_one({"id": rule_id}, {"$set": update_data})
    updated_rule = await db.gratuity_rules.find_one({"id": rule_id})
    return GratuityRule(**updated_rule)

@api_router.delete("/tax-charges/gratuity-rules/{rule_id}")
async def delete_gratuity_rule(rule_id: str, user_id: str = Depends(verify_token)):
    user = await db.users.find_one({"id": user_id})
    if user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Access denied - Manager role required")
    
    result = await db.gratuity_rules.delete_one({"id": rule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Gratuity rule not found")
    
    return {"message": "Gratuity rule deleted successfully"}

# Discount Policies
@api_router.get("/tax-charges/discount-policies", response_model=List[DiscountPolicy])
async def get_discount_policies(user_id: str = Depends(verify_token)):
    user = await db.users.find_one({"id": user_id})
    if user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Access denied - Manager role required")
    
    policies = await db.discount_policies.find().sort("created_at", -1).to_list(1000)
    return [DiscountPolicy(**policy) for policy in policies]

@api_router.post("/tax-charges/discount-policies", response_model=DiscountPolicy)
async def create_discount_policy(discount_policy: DiscountPolicyCreate, user_id: str = Depends(verify_token)):
    user = await db.users.find_one({"id": user_id})
    if user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Access denied - Manager role required")
    
    policy_obj = DiscountPolicy(**discount_policy.dict())
    await db.discount_policies.insert_one(policy_obj.dict())
    return policy_obj

@api_router.put("/tax-charges/discount-policies/{policy_id}", response_model=DiscountPolicy)
async def update_discount_policy(policy_id: str, policy_update: DiscountPolicyCreate, user_id: str = Depends(verify_token)):
    user = await db.users.find_one({"id": user_id})
    if user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Access denied - Manager role required")
    
    existing_policy = await db.discount_policies.find_one({"id": policy_id})
    if not existing_policy:
        raise HTTPException(status_code=404, detail="Discount policy not found")
    
    update_data = policy_update.dict()
    update_data["updated_at"] = get_current_time()
    
    await db.discount_policies.update_one({"id": policy_id}, {"$set": update_data})
    updated_policy = await db.discount_policies.find_one({"id": policy_id})
    return DiscountPolicy(**updated_policy)

@api_router.delete("/tax-charges/discount-policies/{policy_id}")
async def delete_discount_policy(policy_id: str, user_id: str = Depends(verify_token)):
    user = await db.users.find_one({"id": user_id})
    if user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Access denied - Manager role required")
    
    result = await db.discount_policies.delete_one({"id": policy_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Discount policy not found")
    
    return {"message": "Discount policy deleted successfully"}

# Calculate taxes and charges for an order
@api_router.post("/tax-charges/calculate")
async def calculate_taxes_and_charges(order_data: Dict[str, Any], user_id: str = Depends(verify_token)):
    """Calculate taxes and charges for an order based on configured rules"""
    subtotal = order_data.get("subtotal", 0)
    order_type = order_data.get("order_type", "dine_in")
    party_size = order_data.get("party_size", 1)
    
    # Get active tax rates
    tax_rates = await db.tax_rates.find({"active": True, "applies_to_order_types": order_type}).to_list(100)
    
    # Get active service charges
    service_charges = await db.service_charges.find({
        "active": True, 
        "applies_to_order_types": order_type,
        "minimum_order_amount": {"$lte": subtotal}
    }).to_list(100)
    
    # Get active gratuity rules
    gratuity_rules = await db.gratuity_rules.find({
        "active": True,
        "applies_to_order_types": order_type,
        "minimum_order_amount": {"$lte": subtotal},
        "$or": [
            {"maximum_order_amount": 0},
            {"maximum_order_amount": {"$gte": subtotal}}
        ],
        "party_size_minimum": {"$lte": party_size}
    }).to_list(100)
    
    # Calculate taxes
    total_tax = 0
    tax_breakdown = []
    for rate in tax_rates:
        if rate["type"] == "percentage":
            tax_amount = subtotal * (rate["rate"] / 100)
        else:
            tax_amount = rate["rate"]
        
        total_tax += tax_amount
        tax_breakdown.append({
            "name": rate["name"],
            "rate": rate["rate"],
            "type": rate["type"],
            "amount": round(tax_amount, 2)
        })
    
    # Calculate service charges
    total_service_charges = 0
    service_charge_breakdown = []
    for charge in service_charges:
        base_amount = subtotal if charge["applies_to_subtotal"] else (subtotal + total_tax)
        
        if charge["type"] == "percentage":
            charge_amount = base_amount * (charge["amount"] / 100)
        else:
            charge_amount = charge["amount"]
        
        total_service_charges += charge_amount
        service_charge_breakdown.append({
            "name": charge["name"],
            "amount": charge["amount"],
            "type": charge["type"],
            "calculated_amount": round(charge_amount, 2),
            "mandatory": charge["mandatory"]
        })
    
    # Calculate suggested gratuity
    suggested_gratuity = []
    for rule in gratuity_rules:
        if rule["type"] == "percentage":
            gratuity_amount = subtotal * (rule["amount"] / 100)
        else:
            gratuity_amount = rule["amount"]
        
        suggested_gratuity.append({
            "name": rule["name"],
            "amount": rule["amount"],
            "type": rule["type"],
            "calculated_amount": round(gratuity_amount, 2),
            "party_size_minimum": rule["party_size_minimum"]
        })
    
    return {
        "subtotal": subtotal,
        "total_tax": round(total_tax, 2),
        "total_service_charges": round(total_service_charges, 2),
        "total_before_tip": round(subtotal + total_tax + total_service_charges, 2),
        "tax_breakdown": tax_breakdown,
        "service_charge_breakdown": service_charge_breakdown,
        "suggested_gratuity": suggested_gratuity
    }

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