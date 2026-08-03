import importlib
import os

from fastapi.testclient import TestClient


def test_vercel_origin_is_allowed():
    os.environ["CORS_ORIGIN_REGEX"] = r"https://.*\.vercel\.app"

    import app.main as main_module

    main_module = importlib.reload(main_module)
    client = TestClient(main_module.app)

    response = client.options(
        "/api/health",
        headers={
            "Origin": "https://sistema-de-recoleccion-de-residuos-solidos-e55p294t7.vercel.app",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://sistema-de-recoleccion-de-residuos-solidos-e55p294t7.vercel.app"
    assert response.headers["access-control-allow-credentials"] == "true"
