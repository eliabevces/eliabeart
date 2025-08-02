from fastapi import APIRouter, HTTPException, Request, status, Depends
from starlette.responses import JSONResponse
from src.core.keycloak import keycloak_openid
from keycloak.exceptions import KeycloakAuthenticationError
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer()

def get_current_user(token: HTTPAuthorizationCredentials = Depends(security)):
    """Validate the current user by decoding the JWT token.
    Args:
        token (HTTPAuthorizationCredentials): The JWT token from the request header.
    Returns:
        JSONResponse: The decoded token if valid.
    Raises:
        HTTPException: If the token is missing, invalid, or expired.
    """
    try:
        decoded_token = keycloak_openid.decode_token(token.credentials)
        return decoded_token
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while decoding the token.",
        )
