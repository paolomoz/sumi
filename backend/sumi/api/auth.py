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


def _derive_encryption_key(secret: str, salt: str, length: int = 64) -> bytes:
    """
    Derive the encryption key from AUTH_SECRET the same way Auth.js does.

    Auth.js v5 uses HKDF(sha256) with:
    - salt = cookie name (e.g. "__Secure-authjs.session-token")
    - info = "Auth.js Generated Encryption Key ({salt})"
    - length = 64 bytes for A256CBC-HS512
    """
    import hmac

    info = f"Auth.js Generated Encryption Key ({salt})".encode()
    salt_bytes = salt.encode() if salt else b"\x00" * 32

    # HKDF-Extract
    prk = hmac.new(salt_bytes, secret.encode(), hashlib.sha256).digest()

    # HKDF-Expand (need ceil(length/32) blocks)
    t = b""
    okm = b""
    for i in range(1, (length // 32) + 2):
        t = hmac.new(prk, t + info + bytes([i]), hashlib.sha256).digest()
        okm += t
        if len(okm) >= length:
            break

    return okm[:length]


# Cookie names Auth.js may use (secure for HTTPS, plain for HTTP)
_COOKIE_NAMES = [
    "__Secure-authjs.session-token",
    "authjs.session-token",
]


def _decrypt_session_token(token: str, secret: str) -> dict | None:
    """Decrypt a NextAuth JWE session token."""
    if not token or not secret:
        return None

    import json

    # Try each possible cookie name as the HKDF salt, since Auth.js uses
    # the cookie name as the salt for key derivation.
    for cookie_name in _COOKIE_NAMES:
        try:
            key = _derive_encryption_key(secret, salt=cookie_name, length=64)
            decrypted = jwe.decrypt(token, key)
            payload = json.loads(decrypted)
            return payload
        except Exception:
            continue

    logger.debug("Failed to decrypt session token with any known cookie name")
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
