import json
import os
import hashlib
import secrets

from http.server import BaseHTTPRequestHandler

import psycopg2


def get_database():
    return psycopg2.connect(
        os.environ["DATABASE_URL"]
    )


def hash_password(password, salt=None):
    if salt is None:
        salt = secrets.token_hex(16)

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100_000
    ).hex()

    return f"{salt}:{password_hash}"


def verify_password(password, stored_password):
    try:
        salt, stored_hash = stored_password.split(":")

        password_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            100_000
        ).hex()

        return secrets.compare_digest(
            password_hash,
            stored_hash
        )

    except Exception:
        return False


def create_tables(connection):
    with connection.cursor() as cursor:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

    connection.commit()


def response(handler, status, data):
    body = json.dumps(data).encode("utf-8")

    handler.send_response(status)

    handler.send_header(
        "Content-Type",
        "application/json"
    )

    handler.send_header(
        "Access-Control-Allow-Origin",
        "*"
    )

    handler.send_header(
        "Access-Control-Allow-Headers",
        "Content-Type"
    )

    handler.send_header(
        "Access-Control-Allow-Methods",
        "POST, OPTIONS"
    )

    handler.end_headers()

    handler.wfile.write(body)


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        response(
            self,
            200,
            {"message": "OK"}
        )

    def do_POST(self):

        try:
            length = int(
                self.headers.get(
                    "Content-Length",
                    0
                )
            )

            body = self.rfile.read(length)

            data = json.loads(
                body.decode("utf-8")
            )

            action = data.get("action")

            if action not in ["register", "login"]:
                response(
                    self,
                    400,
                    {
                        "detail":
                        "Invalid action"
                    }
                )
                return

            connection = get_database()

            create_tables(connection)

            with connection.cursor() as cursor:

                if action == "register":

                    name = str(
                        data.get("name", "")
                    ).strip()

                    email = str(
                        data.get("email", "")
                    ).strip().lower()

                    password = str(
                        data.get("password", "")
                    )

                    if len(name) < 2:
                        response(
                            self,
                            400,
                            {
                                "detail":
                                "Please enter a valid name."
                            }
                        )
                        return

                    if len(password) < 8:
                        response(
                            self,
                            400,
                            {
                                "detail":
                                "Password must contain at least 8 characters."
                            }
                        )
                        return

                    cursor.execute(
                        """
                        SELECT id
                        FROM users
                        WHERE email = %s
                        """,
                        (email,)
                    )

                    existing = cursor.fetchone()

                    if existing:
                        response(
                            self,
                            400,
                            {
                                "detail":
                                "Email is already registered."
                            }
                        )
                        return

                    encrypted_password = hash_password(
                        password
                    )

                    cursor.execute(
                        """
                        INSERT INTO users
                        (name, email, password)
                        VALUES (%s, %s, %s)
                        RETURNING id, name, email
                        """,
                        (
                            name,
                            email,
                            encrypted_password
                        )
                    )

                    user = cursor.fetchone()

                    connection.commit()

                    response(
                        self,
                        201,
                        {
                            "message":
                            "Account created successfully.",
                            "user": {
                                "id": user[0],
                                "name": user[1],
                                "email": user[2]
                            }
                        }
                    )

                    return

                if action == "login":

                    email = str(
                        data.get("email", "")
                    ).strip().lower()

                    password = str(
                        data.get("password", "")
                    )

                    cursor.execute(
                        """
                        SELECT id, name, email, password
                        FROM users
                        WHERE email = %s
                        """,
                        (email,)
                    )

                    user = cursor.fetchone()

                    if not user:
                        response(
                            self,
                            401,
                            {
                                "detail":
                                "Invalid email or password."
                            }
                        )
                        return

                    if not verify_password(
                        password,
                        user[3]
                    ):
                        response(
                            self,
                            401,
                            {
                                "detail":
                                "Invalid email or password."
                            }
                        )
                        return

                    response(
                        self,
                        200,
                        {
                            "message":
                            "Login successful.",
                            "user": {
                                "id": user[0],
                                "name": user[1],
                                "email": user[2]
                            }
                        }
                    )

                    return

        except Exception as error:

            print(error)

            response(
                self,
                500,
                {
                    "detail":
                    "Server error. Please try again."
                }
            )
