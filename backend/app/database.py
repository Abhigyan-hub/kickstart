import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load the environment variables from the .env file
load_dotenv()

# Fetch the secret AWS database URL
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is missing. Check your .env file.")

# The engine is the core interface to the database
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Each instance of the SessionLocal class will be a unique database session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# FastAPI Dependency: This function creates an independent database session 
# for every single request and automatically closes it when the request is done.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()