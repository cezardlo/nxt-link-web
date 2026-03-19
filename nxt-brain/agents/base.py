class BaseAgent:
    def __init__(self):
        self.api_url = "https://api.example.com"  # Replace with actual API URL
        self.api_key = "your_api_key"  # Replace with actual API key

    def make_api_call(self, endpoint, params=None):
        import requests
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        response = requests.get(f"{self.api_url}/{endpoint}", headers=headers, params=params)
        return self.handle_response(response)

    def handle_response(self, response):
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"API call failed with status code {response.status_code}: {response.text}")