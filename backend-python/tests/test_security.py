import bcrypt


def test_password_hashing_and_verification():
    password = "EcoCusco2026!"
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    assert bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
