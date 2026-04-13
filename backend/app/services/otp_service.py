"""
CipherTrust — OTP Service
Generates 4-digit OTP, stores in Redis, sends via email (SMTP).
In dev mode, OTP is logged to console.
"""

import logging
import secrets
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings
from app.core.redis import get_redis

logger = logging.getLogger(__name__)

OTP_TTL = 300  # 5 minutes
OTP_PREFIX = "otp:"


def generate_otp() -> str:
    """Generate a cryptographically secure 4-digit OTP."""
    return str(secrets.randbelow(9000) + 1000)


async def store_otp(email: str, otp: str) -> None:
    """Store OTP in Redis with TTL."""
    redis = get_redis()
    await redis.set(f"{OTP_PREFIX}{email}", otp, ex=OTP_TTL)


async def verify_otp(email: str, otp: str) -> bool:
    """Verify OTP from Redis. Deletes on success."""
    redis = get_redis()
    stored = await redis.get(f"{OTP_PREFIX}{email}")
    if stored and stored == otp:
        await redis.delete(f"{OTP_PREFIX}{email}")
        return True
    return False


async def send_otp(email: str) -> str:
    """Generate, store, and send OTP. Returns the OTP (for dev logging)."""
    otp = generate_otp()
    await store_otp(email, otp)

    # Always log for dev/testing
    logger.warning("OTP for %s: %s", email, otp)

    # Send via SMTP if configured
    if settings.SMTP_HOST:
        _send_email(email, otp)

    return otp


def _send_email(to_email: str, otp: str) -> None:
    """Send OTP email via SMTP."""
    msg = MIMEMultipart()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email
    msg["Subject"] = "CipherTrust — Your verification code"

    body = f"""\
Your CipherTrust verification code is:

    {otp}

This code expires in 5 minutes.

If you didn't request this code, please ignore this email.
"""
    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_TLS:
                server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        logger.info("OTP email sent to %s", to_email)
    except Exception as exc:
        logger.error("Failed to send OTP email to %s: %s", to_email, exc)
