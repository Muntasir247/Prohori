"""Transactional email.

Two drivers (Doc 02 Section 5): ``console`` prints the action link to the server
log for development and records it in an in-memory outbox for tests; ``resend``
sends real mail in production. Emails always carry a clickable link, never a code
— Prohori never teaches users to read out codes (Section 7).
"""

from __future__ import annotations

from dataclasses import dataclass

from app.config import Settings, get_settings
from app.logging_config import get_logger

_logger = get_logger("prohori.email")


@dataclass
class SentEmail:
    to: str
    subject: str
    link: str
    purpose: str


# In-memory outbox used by the console driver. Tests read it to recover the link
# a user would click; it is never used in production (the resend driver is).
_outbox: list[SentEmail] = []


def get_outbox() -> list[SentEmail]:
    return _outbox


def clear_outbox() -> None:
    _outbox.clear()


class EmailService:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()

    @property
    def origin(self) -> str:
        return self._settings.app_origin.rstrip("/")

    async def _send(self, *, to: str, subject: str, link: str, purpose: str) -> None:
        if self._settings.email_driver == "resend" and self._settings.resend_api_key:
            await self._send_resend(to=to, subject=subject, link=link)
        else:
            # Console driver: log the link (never any secret code or PII body).
            _logger.info(
                "email_sent",
                extra={"route": "email", "purpose": purpose},
            )
            _outbox.append(
                SentEmail(to=to, subject=subject, link=link, purpose=purpose)
            )

    async def _send_resend(self, *, to: str, subject: str, link: str) -> None:
        import resend  # imported lazily so dev/test never needs the package

        resend.api_key = self._settings.resend_api_key
        html = (
            f'<p>{subject}</p>'
            f'<p><a href="{link}">{link}</a></p>'
            "<p>If you did not request this, you can ignore this email.</p>"
        )
        resend.Emails.send(
            {
                "from": "Prohori <no-reply@prohori.app>",
                "to": [to],
                "subject": subject,
                "html": html,
            }
        )

    async def send_verification(self, email: str, token: str) -> None:
        link = f"{self.origin}/verify-email?token={token}"
        await self._send(
            to=email,
            subject="Confirm your Prohori email",
            link=link,
            purpose="verify_email",
        )

    async def send_password_reset(self, email: str, token: str) -> None:
        link = f"{self.origin}/reset-password?token={token}"
        await self._send(
            to=email,
            subject="Reset your Prohori password",
            link=link,
            purpose="reset_password",
        )

    async def send_invite(self, email: str, token: str) -> None:
        link = f"{self.origin}/accept-invite?token={token}"
        await self._send(
            to=email,
            subject="You have been invited to review on Prohori",
            link=link,
            purpose="invite",
        )
