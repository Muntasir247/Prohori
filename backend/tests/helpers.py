"""Reusable helpers for the auth test suite."""

from __future__ import annotations

from urllib.parse import parse_qs, urlparse

from app.services.email import get_outbox


def latest_token(purpose: str) -> str:
    """Return the token from the most recent emailed link of ``purpose``."""
    for sent in reversed(get_outbox()):
        if sent.purpose == purpose:
            query = parse_qs(urlparse(sent.link).query)
            return query["token"][0]
    raise AssertionError(f"no {purpose} email in outbox")


async def register(
    client,
    email: str = "user@example.com",
    password: str = "correct-horse-battery",
    name: str = "Test User",
    language: str = "bn",
    consent: bool = True,
):
    return await client.post(
        "/api/v1/auth/register",
        json={
            "name": name,
            "email": email,
            "password": password,
            "language": language,
            "consent": consent,
        },
    )


async def register_verified(
    client,
    email: str = "user@example.com",
    password: str = "correct-horse-battery",
) -> None:
    await register(client, email=email, password=password)
    token = latest_token("verify_email")
    resp = await client.post("/api/v1/auth/verify-email", json={"token": token})
    assert resp.status_code == 204


async def login(client, email: str, password: str):
    return await client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}
    )
