"""
Authentication module for verifying NextAuth session tokens.

NextAuth v5 uses encrypted JWE tokens (not plain JWT). We need to decrypt them
using the AUTH_SECRET. The token is passed as a cookie or via X-Session-Token header.
"""

import base64
import hashlib
import logging
from typing import Annotated

from fastapi import Cookie, Depends, Header, HTTPException, status
from jose import jwe
from pydantic import BaseModel

from sumi.config import settings

logger = logging.getLogger(__name__)


class User(BaseModel):
    """Authenticated user from session token."""
    id: str
    name: str | None = None
    email: str | None = None
    image: str | None = None


def _derive_encryption_key(secret: str) -> bytes:
    """
    Derive the encryption key from AUTH_SECRET the same way NextAuth does.
    NextAuth uses HKDF with SHA-256 to derive a 32-byte key.
    """
    # NextAuth uses the info string "Auth.js Generated Encryption Key"
    # and derives a 32-byte key using HKDF
    import hmac

    # Simplified HKDF-Extract + HKDF-Expand for NextAuth compatibility
    # NextAuth v5 uses: hkdf(sha256, secret, salt="", info="Auth.js Generated Encryption Key", keylen=32)
    info = b"Auth.js Generated Encryption Key"

    # HKDF Extract (with empty salt, PRK = HMAC(0x00...00, IKM))
    salt = b"\x00" * 32
    prk = hmac.new(salt, secret.encode(), hashlib.sha256).digest()

    # HKDF Expand
    t = b""
    okm = b""
    for i in range(1, 2):  # We only need 32 bytes = 1 block
        t = hmac.new(prk, t + info + bytes([i]), hashlib.sha256).digest()
        okm += t

    return okm[:32]


def _decrypt_session_token(token: str, secret: str) -> dict | None:
    """Decrypt a NextAuth JWE session token."""
    if not token or not secret:
        return None

    try:
        # Derive the encryption key
        key = _derive_encryption_key(secret)

        # Decrypt the JWE token
        decrypted = jwe.decrypt(token, key)

        # Parse the JSON payload
        import json
        payload = json.loads(decrypted)
        return payload
    except Exception as e:
        logger.debug(f"Failed to decrypt session token: {e}")
        return None


async def get_current_user(
    session_token: Annotated[str | None, Cookie(alias="authjs.session-token")] = None,
    secure_session_token: Annotated[str | None, Cookie(alias="__Secure-authjs.session-token")] = None,
    x_session_token: Annotated[str | None, Header(alias="X-Session-Token")] = None,
) -> User:
    """
    Dependency that extracts and validates the user from the session token.
    Raises 401 if no valid session is found.
    """
    # Try different token sources (header takes precedence for API calls)
    token = x_session_token or secure_session_token or session_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    if not settings.auth_secret:
        logger.error("AUTH_SECRET not configured - cannot verify session tokens")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication not configured",
        )

    payload = _decrypt_session_token(token, settings.auth_secret)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )

    # Extract user info from the payload
    # NextAuth stores user info directly in the token
    user_id = payload.get("id") or payload.get("sub") or payload.get("testUserId")

    if not user_id:
        # Try to construct ID from provider info (how our frontend does it)
        provider = payload.get("provider")
        provider_account_id = payload.get("providerAccountId")
        if provider and provider_account_id:
            user_id = f"{provider}:{provider_account_id}"

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session: no user ID",
        )

    return User(
        id=user_id,
        name=payload.get("name"),
        email=payload.get("email"),
        image=payload.get("picture"),
    )


async def get_optional_user(
    session_token: Annotated[str | None, Cookie(alias="authjs.session-token")] = None,
    secure_session_token: Annotated[str | None, Cookie(alias="__Secure-authjs.session-token")] = None,
    x_session_token: Annotated[str | None, Header(alias="X-Session-Token")] = None,
) -> User | None:
    """
    Dependency that extracts the user if present, but doesn't require auth.
    Returns None if no valid session.
    """
    token = x_session_token or secure_session_token or session_token

    if not token or not settings.auth_secret:
        return None

    payload = _decrypt_session_token(token, settings.auth_secret)

    if not payload:
        return None

    user_id = payload.get("id") or payload.get("sub") or payload.get("testUserId")

    if not user_id:
        provider = payload.get("provider")
        provider_account_id = payload.get("providerAccountId")
        if provider and provider_account_id:
            user_id = f"{provider}:{provider_account_id}"

    if not user_id:
        return None

    return User(
        id=user_id,
        name=payload.get("name"),
        email=payload.get("email"),
        image=payload.get("picture"),
    )
