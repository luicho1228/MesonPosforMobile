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
from datetime import datetime, timedelta
from enum import Enum
import bcrypt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

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
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    READY = "ready"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class OrderType(str, Enum):
    DINE_IN = "dine_in"
    TAKEOUT = "takeout"
    DELIVERY = "delivery"
    PHONE_ORDER = "phone_order"

class UserRole(str, Enum):
    CASHIER = "cashier"
    MANAGER = "manager"
    KITCHEN = "kitchen"
    DELIVERY = "delivery"

class PaymentMethod(str, Enum):
    CASH = "cash"
    CARD = "card"
    ONLINE = "online"

# Models
class MenuItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    price: float
    category: str
    image_url: str = ""
    available: bool = True
    modifiers: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MenuItemCreate(BaseModel):
    name: str
    description: str = ""
    price: float
    category: str
    image_url: str = ""
    available: bool = True
    modifiers: List[str] = []

class Customer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    email: str = ""
    address: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CustomerCreate(BaseModel):
    name: str
    phone: str
    email: str = ""
    address: str = ""

class OrderItem(BaseModel):
    menu_item_id: str
    quantity: int
    price: float
    modifiers: List[str] = []
    special_instructions: str = ""

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    customer_id: Optional[str] = None
    customer_name: str = ""
    customer_phone: str = ""
    customer_address: str = ""
    items: List[OrderItem]
    subtotal: float
    tax: float
    tip: float = 0.0
    total: float
    order_type: OrderType
    status: OrderStatus = OrderStatus.PENDING
    payment_method: Optional[PaymentMethod] = None
    payment_status: str = "pending"
    created_by: str  # user_id
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    delivery_address: str = ""
    delivery_instructions: str = ""
    estimated_time: Optional[datetime] = None

class OrderCreate(BaseModel):
    customer_name: str = ""
    customer_phone: str = ""
    customer_address: str = ""
    items: List[OrderItem]
    order_type: OrderType
    tip: float = 0.0
    delivery_address: str = ""
    delivery_instructions: str = ""

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    role: UserRole
    full_name: str
    phone: str = ""
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: UserRole
    full_name: str
    phone: str = ""

class UserLogin(BaseModel):
    username: str
    password: str

class TimeEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    clock_in: datetime
    clock_out: Optional[datetime] = None
    break_start: Optional[datetime] = None
    break_end: Optional[datetime] = None
    total_hours: float = 0.0
    overtime_hours: float = 0.0
    date: str  # YYYY-MM-DD format
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Authentication helpers
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)
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

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

# Routes

# Auth routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Hash password and create user
    hashed_password = hash_password(user_data.password)
    user_dict = user_data.dict()
    del user_dict['password']
    user_obj = User(**user_dict)
    
    # Store user with hashed password
    user_to_store = user_obj.dict()
    user_to_store['password'] = hashed_password
    
    await db.users.insert_one(user_to_store)
    
    # Create access token
    access_token = create_access_token(data={"sub": user_obj.id})
    return {"access_token": access_token, "token_type": "bearer", "user": user_obj}

@api_router.post("/auth/login")
async def login(login_data: UserLogin):
    user = await db.users.find_one({"username": login_data.username})
    if not user or not verify_password(login_data.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get('is_active', True):
        raise HTTPException(status_code=401, detail="Account is deactivated")
    
    access_token = create_access_token(data={"sub": user['id']})
    user_obj = User(**{k: v for k, v in user.items() if k != 'password'})
    return {"access_token": access_token, "token_type": "bearer", "user": user_obj}

@api_router.get("/auth/me")
async def get_current_user(user_id: str = Depends(verify_token)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**{k: v for k, v in user.items() if k != 'password'})

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
    # Calculate totals
    subtotal = sum(item.price * item.quantity for item in order_data.items)
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
    
    order_obj = Order(
        order_number=order_number,
        customer_id=customer_id,
        customer_name=order_data.customer_name,
        customer_phone=order_data.customer_phone,
        customer_address=order_data.customer_address,
        items=order_data.items,
        subtotal=subtotal,
        tax=tax,
        tip=order_data.tip,
        total=total,
        order_type=order_data.order_type,
        delivery_address=order_data.delivery_address,
        delivery_instructions=order_data.delivery_instructions,
        created_by=user_id
    )
    
    await db.orders.insert_one(order_obj.dict())
    return order_obj

@api_router.get("/orders", response_model=List[Order])
async def get_orders(user_id: str = Depends(verify_token)):
    orders = await db.orders.find().sort("created_at", -1).to_list(1000)
    return [Order(**order) for order in orders]

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, user_id: str = Depends(verify_token)):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return Order(**order)

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: Dict[str, str], user_id: str = Depends(verify_token)):
    new_status = status.get("status")
    if new_status not in [s.value for s in OrderStatus]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.orders.update_one(
        {"id": order_id}, 
        {"$set": {"status": new_status, "updated_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Order status updated successfully"}

# Time tracking routes
@api_router.post("/time/clock-in")
async def clock_in(user_id: str = Depends(verify_token)):
    today = datetime.utcnow().date().isoformat()
    
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
        clock_in=datetime.utcnow(),
        date=today
    )
    
    await db.time_entries.insert_one(time_entry.dict())
    return {"message": "Clocked in successfully", "time": time_entry.clock_in}

@api_router.post("/time/clock-out")
async def clock_out(user_id: str = Depends(verify_token)):
    today = datetime.utcnow().date().isoformat()
    
    entry = await db.time_entries.find_one({
        "user_id": user_id,
        "date": today,
        "clock_out": None
    })
    
    if not entry:
        raise HTTPException(status_code=400, detail="Not clocked in")
    
    clock_out_time = datetime.utcnow()
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

# Dashboard/Analytics routes
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user_id: str = Depends(verify_token)):
    today = datetime.utcnow().date()
    
    # Today's orders
    today_orders = await db.orders.count_documents({
        "created_at": {
            "$gte": datetime.combine(today, datetime.min.time()),
            "$lt": datetime.combine(today + timedelta(days=1), datetime.min.time())
        }
    })
    
    # Today's revenue
    today_revenue_pipeline = [
        {
            "$match": {
                "created_at": {
                    "$gte": datetime.combine(today, datetime.min.time()),
                    "$lt": datetime.combine(today + timedelta(days=1), datetime.min.time())
                }
            }
        },
        {
            "$group": {
                "_id": None,
                "total_revenue": {"$sum": "$total"}
            }
        }
    ]
    
    today_revenue_result = await db.orders.aggregate(today_revenue_pipeline).to_list(1)
    today_revenue = today_revenue_result[0]["total_revenue"] if today_revenue_result else 0
    
    # Pending orders
    pending_orders = await db.orders.count_documents({"status": "pending"})
    
    # Active employees (clocked in today)
    active_employees = await db.time_entries.count_documents({
        "date": today.isoformat(),
        "clock_out": None
    })
    
    return {
        "today_orders": today_orders,
        "today_revenue": today_revenue,
        "pending_orders": pending_orders,
        "active_employees": active_employees
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