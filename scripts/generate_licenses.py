import hashlib
import random
import string
import os
import sys

DEFAULT_SALT = "POS_BILLING_SECRET_SALT_2026"

def generate_license(identifier: str, salt: str) -> str:
    payload = f"PREM-{identifier}"
    hasher = hashlib.sha256()
    hasher.update(payload.encode())
    hasher.update(salt.encode())
    checksum = hasher.hexdigest()[:8]
    return f"{payload}-{checksum}"

def random_string(length=12):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

if __name__ == "__main__":
    salt = os.environ.get("LICENSE_SECRET_SALT", DEFAULT_SALT)

    count = 100
    if len(sys.argv) > 1:
        try:
            count = int(sys.argv[1])
        except ValueError:
            print("Usage: python3 generate_licenses.py [count]")
            sys.exit(1)

    print(f"Using Salt: {'[REDACTED]' if salt != DEFAULT_SALT else DEFAULT_SALT}")

    licenses = []
    for _ in range(count):
        ident = random_string()
        licenses.append(generate_license(ident, salt))

    output_file = "LICENSES.txt"
    with open(output_file, "w") as f:
        f.write("\n".join(licenses))

    print(f"Generated {count} licenses in {output_file}")
    if count == 1:
        print(f"Key: {licenses[0]}")
