import logging
import re
import sys
import json
import urllib.request
import threading

# ==========================================
# CONFIGURATION
# ==========================================

# Paste your copied Discord Webhook URL here
DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1527703079003099267/LivIKcCeZwIarBJYeQRsEKq0XofjhoEN-Tte-pLXX7cvxeSAB9-GfsuBR1TyyPzCN1tk"

SENSITIVE_KEYS = [
    "password", "password_hash", "otp", "token", "jwt", 
    "secret", "credit_card", "aws_key", "db_pass"
]

# ==========================================
# FILTERS & HANDLERS
# ==========================================

class SensitiveDataFilter(logging.Filter):
    """Scans log messages and redacts sensitive information."""
    def filter(self, record):
        log_message = record.getMessage()
        for key in SENSITIVE_KEYS:
            pattern = rf"({key}['\"]?\s*[:=]\s*['\"]?)([^'\",\s}}]+)"
            log_message = re.sub(pattern, r"\1***REDACTED***", log_message, flags=re.IGNORECASE)
        record.msg = log_message
        return True

class DiscordWebhookHandler(logging.Handler):
    """Sends log records to a Discord Webhook asynchronously using Embeds."""
    def __init__(self, webhook_url):
        super().__init__()
        self.webhook_url = webhook_url

    def emit(self, record):
        if not self.webhook_url or not self.webhook_url.startswith("http"):
            return

        log_entry = self.format(record)
        
        # Color code the Discord embed based on the severity
        color = 3447003 # Default Blue for INFO
        if record.levelno == logging.WARNING:
            color = 16776960 # Yellow
        elif record.levelno >= logging.ERROR:
            color = 15158332 # Red
        elif "Success" in record.getMessage() or "online" in record.getMessage().lower():
            color = 3066993 # Green

        payload = {
            "username": "MAN OF THE SERVER",
            "embeds": [{
                "title": f"[{record.levelname}] CASCADE API",
                "description": log_entry,
                "color": color
            }]
        }

        # Fire and forget in a background thread so it doesn't block the API
        def send_to_discord():
            try:
                req = urllib.request.Request(
                    self.webhook_url, 
                    data=json.dumps(payload).encode('utf-8'), 
                    headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
                )
                urllib.request.urlopen(req, timeout=3)
            except Exception:
                pass # Silently fail if Discord is down or network drops

        threading.Thread(target=send_to_discord).start()

# ==========================================
# INITIALIZE LOGGER
# ==========================================

logger = logging.getLogger("CASCADE_API")
logger.setLevel(logging.DEBUG)

# 1. Console Output (VS Code Terminal)
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(asctime)s | %(levelname)-8s | [%(name)s] | %(message)s')
console_handler.setFormatter(formatter)
console_handler.addFilter(SensitiveDataFilter())

# 2. Discord Output (Only Warning, Error, and Critical by default, or INFO for logins)
discord_handler = DiscordWebhookHandler(DISCORD_WEBHOOK_URL)
discord_handler.setLevel(logging.INFO) # Adjust this if Discord gets too spammy
discord_handler.setFormatter(logging.Formatter('%(message)s'))
discord_handler.addFilter(SensitiveDataFilter())

# Attach both handlers
logger.addHandler(console_handler)
logger.addHandler(discord_handler)