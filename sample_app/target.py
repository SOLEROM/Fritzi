#!/usr/bin/env python3
"""FridaLab target application — a long-running process with hookable functions."""

import time
import random
import sys
import os

# ── Hookable functions ────────────────────────────────────────────────

SECRET_PASSWORD = "s3cur3P@ss!"
LICENSE_SECRET = "FRIDA-LAB-2024-XYZZY"
FLAG = "FLAG{fr1d4_m4st3r_h00k3r}"


def authenticate(username: str, password: str) -> bool:
    """Plaintext credential check — hook me to see the password!"""
    return username == "admin" and password == SECRET_PASSWORD


def encrypt_data(data: str, key: str) -> str:
    """Simple XOR 'encryption' — hook me to see the plaintext!"""
    key_bytes = (key * ((len(data) // len(key)) + 1))[:len(data)]
    encrypted = "".join(chr(ord(a) ^ ord(b)) for a, b in zip(data, key_bytes))
    return encrypted.encode("unicode_escape").decode("ascii")


def check_license(license_key: str) -> bool:
    """License validation with hardcoded secret — hook me to always return True!"""
    return license_key == LICENSE_SECRET


def process_payment(amount: float, card_number: str) -> dict:
    """Fake payment processing — hook me to see card details!"""
    masked = "****-****-****-" + card_number[-4:]
    return {
        "status": "approved" if amount < 10000 else "declined",
        "masked_card": masked,
        "transaction_id": f"TXN-{random.randint(100000, 999999)}",
    }


def get_secret_flag() -> str:
    """Hidden function — can you call me via Frida?"""
    return FLAG


# ── Main loop ─────────────────────────────────────────────────────────

def main():
    print(f"[target.py] PID: {os.getpid()}", flush=True)
    print("[target.py] Running — attach Frida to inspect me!\n", flush=True)

    iteration = 0
    while True:
        iteration += 1
        print(f"--- iteration {iteration} ---", flush=True)

        # authenticate
        user = random.choice(["admin", "guest", "root"])
        pwd = random.choice([SECRET_PASSWORD, "wrong", "letmein"])
        result = authenticate(user, pwd)
        print(f"  authenticate({user!r}, {pwd!r}) => {result}", flush=True)

        # encrypt
        plaintext = random.choice(["hello world", "secret message", "frida is cool"])
        key = random.choice(["key", "abc", "xor"])
        cipher = encrypt_data(plaintext, key)
        print(f"  encrypt_data({plaintext!r}, {key!r}) => {cipher!r}", flush=True)

        # license
        lic = random.choice([LICENSE_SECRET, "INVALID-KEY", "TRIAL-EXPIRED"])
        valid = check_license(lic)
        print(f"  check_license({lic!r}) => {valid}", flush=True)

        # payment
        amount = round(random.uniform(5, 15000), 2)
        card = f"{random.randint(4000000000000000, 4999999999999999)}"
        pay = process_payment(amount, card)
        print(f"  process_payment({amount}, {card!r}) => {pay}", flush=True)

        # secret flag is never called — use Frida to invoke it!

        print(flush=True)
        time.sleep(5)


if __name__ == "__main__":
    main()
