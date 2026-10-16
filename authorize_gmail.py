
from pathlib import Path
from google_auth_oauthlib.flow import InstalledAppFlow

PROJECT_ROOT = Path(__file__).resolve().parent
CREDENTIALS_FILE = PROJECT_ROOT / "gmail_credentials.json"
TOKEN_FILE = PROJECT_ROOT / "gmail_token.json"

SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/calendar.events",
]


def main():
    if not CREDENTIALS_FILE.exists():
        print(f"Credentials file not found: {CREDENTIALS_FILE}")
        return

    flow = InstalledAppFlow.from_client_secrets_file(
        str(CREDENTIALS_FILE),
        SCOPES,
    )

    credentials = flow.run_local_server(port=0)

    TOKEN_FILE.write_text(credentials.to_json(), encoding="utf-8")
    print("Gmail authorization successful.")
    print(f"Token saved to: {TOKEN_FILE}")


if __name__ == "__main__":
    main()
