from typing import Any
import json
import os

class Cache:
    def __init__(self, cache_file: str = "cache.json"):
        self.cache_file = cache_file
        self.load_cache()

    def load_cache(self) -> None:
        if os.path.exists(self.cache_file):
            with open(self.cache_file, 'r') as f:
                self.cache = json.load(f)
        else:
            self.cache = {}

    def save_cache(self) -> None:
        with open(self.cache_file, 'w') as f:
            json.dump(self.cache, f)

    def get(self, key: str) -> Any:
        return self.cache.get(key)

    def set(self, key: str, value: Any) -> None:
        self.cache[key] = value
        self.save_cache()