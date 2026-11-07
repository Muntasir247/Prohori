"""Password policy and argon2id hashing (Doc 02 Section 7).

Rules: argon2id, 10+ characters, rejected if on a small common-password list.
The hasher is a module-level singleton with argon2's sensible defaults.
"""

from __future__ import annotations

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

from app.errors import AppError

MIN_PASSWORD_LENGTH = 10

# A deliberately small blocklist of the most-guessed passwords. A production
# system would use a larger corpus (e.g. the HIBP top-N); the policy hook is what
# matters here.
_COMMON_PASSWORDS = frozenset(
    {
        "password",
        "password1",
        "password123",
        "12345678",
        "123456789",
        "1234567890",
        "qwertyuiop",
        "qwerty123",
        "11111111",
        "00000000",
        "iloveyou",
        "admin123",
        "letmein123",
        "welcome123",
        "prohori123",
        "changeme123",
        "passw0rd",
        "abcd1234",
    }
)

_hasher = PasswordHasher()


def validate_password(password: str) -> None:
    """Raise ``AppError`` (422, field ``password``) if the password is too weak."""
    if len(password) < MIN_PASSWORD_LENGTH:
        raise AppError(
            "weak_password",
            status=422,
            message_key="errors.password_too_short",
            fields={"password": "too_short"},
        )
    if password.lower() in _COMMON_PASSWORDS:
        raise AppError(
            "weak_password",
            status=422,
            message_key="errors.password_too_common",
            fields={"password": "too_common"},
        )


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        _hasher.verify(password_hash, password)
        return True
    except (VerifyMismatchError, InvalidHashError):
        return False


def needs_rehash(password_hash: str) -> bool:
    return _hasher.check_needs_rehash(password_hash)
