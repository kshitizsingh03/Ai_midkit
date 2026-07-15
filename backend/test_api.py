import requests
import json

url = "http://localhost:8000/interaction/chat"
payload = {
    "text": "Met Dr. Sharma today at Apollo Hospital. We discussed CardioPlus. Doctor was interested, requested clinical trial reports. Schedule follow-up after two weeks."
}

try:
    response = requests.post(url, json=payload)
    print("Status Code:", response.status_code)
    print("Response JSON:")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print("ERROR calling local API:", e)
