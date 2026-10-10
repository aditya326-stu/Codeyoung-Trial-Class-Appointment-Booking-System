
import base64
import logging
from email.message import EmailMessage
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TOKEN_FILE = PROJECT_ROOT / "gmail_token.json"
SCOPES = ["https://www.googleapis.com/auth/gmail.send"]

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    if not to_email or "@" not in to_email:
        logger.error("Invalid recipient email: %s", to_email)
        return False

    if not TOKEN_FILE.exists():
        logger.error("Gmail token not found: %s", TOKEN_FILE)
        return False

    try:
        credentials = Credentials.from_authorized_user_file(
            str(TOKEN_FILE), SCOPES
        )

        if credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
            TOKEN_FILE.write_text(
                credentials.to_json(), encoding="utf-8"
            )

        if not credentials.valid:
            logger.error("Gmail authorization is invalid. Reauthorize Gmail.")
            return False

        message = EmailMessage()
        message["To"] = to_email
        message["Subject"] = subject
        message.set_content(
            "Your Codeyoung booking details are included in this email."
        )
        message.add_alternative(html_body, subtype="html")

        raw = base64.urlsafe_b64encode(
            message.as_bytes()
        ).decode("utf-8")

        service = build(
            "gmail",
            "v1",
            credentials=credentials,
            cache_discovery=False,
        )

        service.users().messages().send(
            userId="me",
            body={"raw": raw},
        ).execute()

        logger.info("Gmail API accepted email for %s", to_email)
        return True

    except Exception:
        logger.exception("Gmail API email sending failed")
        return False
