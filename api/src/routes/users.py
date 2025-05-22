import logging
from fastapi import Response, APIRouter, HTTPException, Depends, Security
from sqlalchemy.orm import Session
from typing import Annotated
from src.auth.auth import get_current_user
from src.user.schemas import User, UserCreate
from src.database.database import get_db
from src.user import crud as user_crud

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("")
async def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Security(get_current_user),
):
    try:
        logger.info("current user %s", current_user.username)
        user_crud.create_user(db, user)
        return Response(content="User created successfully", status_code=201)
    except Exception as e:
        logger.error("POST /users - %s", str(e))
        raise HTTPException(status_code=500, detail="Error creating user")
