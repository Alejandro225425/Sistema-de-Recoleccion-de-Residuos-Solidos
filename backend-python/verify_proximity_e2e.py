from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def login(email, password):
    r = client.post('/api/auth/login', json={'email': email, 'password': password})
    print('LOGIN', r.status_code, r.text)
    return r.json().get('token')


def run():
    token = login('conductor@ecocusco.pe', 'Test12345!')
    if not token:
        print('Login failed; aborting')
        return
    headers = {'Authorization': f'Bearer {token}'}
    payload = {'truck_id': 4, 'latitude': -13.5350, 'longitude': -71.9847}
    r = client.post('/api/operations/track-location', json=payload, headers=headers)
    print('TRACK', r.status_code, r.json())

    m = client.get('/api/operations/monitor')
    print('MONITOR', m.status_code)
    notifications = m.json().get('notifications', [])
    print('NOTIFICATIONS COUNT:', len(notifications))
    found = any(n.get('type') == 'proximity' and n.get('title') == 'Aviso de proximidad' for n in notifications)
    print('PROXIMITY NOTIFICATION FOUND:', found)

if __name__ == '__main__':
    run()
