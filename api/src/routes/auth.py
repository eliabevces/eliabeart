from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from starlette.responses import JSONResponse
from src.core.keycloak import keycloak_openid
from src.core.config import settings
import traceback
from keycloak.exceptions import KeycloakAuthenticationError

router = APIRouter()


@router.post("/login")
async def login(request: Request):
    data = await request.json()
    username = data.get("username")
    password = data.get("password")
    try:
        keycloak_openid.well_known()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Keycloak service is unavailable.",
        )
    if not username or not password:
        raise HTTPException(
            status_code=400, detail="Username and password are required."
        )
    try:
        token = keycloak_openid.token(
            grant_type="password",
            username=username,
            password=password,
        )
        return JSONResponse(token)
    except Exception as e:
        import traceback

        print("Keycloak login error:", str(e))
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid credentials. {str(e)}",
        )


@router.get("/")
def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token is missing.",
        )
    token = auth_header.split(" ")[1]
    try:
        decoded_token = keycloak_openid.decode_token(token)
        return JSONResponse(decoded_token)
    except KeycloakAuthenticationError as e:
        detail = str(e)
        if "expired" in detail.lower():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token."
            )
    except Exception as e:
        print("Token decode error:", str(e))
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while decoding the token.",
        )
