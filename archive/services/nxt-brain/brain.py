import os
import sys


def run_api() -> None:
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("api.server:app", host=host, port=port, reload=False)


def print_help() -> None:
    print("Usage:")
    print("  python -X utf8 brain.py api      # start FastAPI server on :8000")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print_help()
        sys.exit(1)

    command = (sys.argv[1] or "").strip().lower()

    if command == "api":
        run_api()
    else:
        print(f"Unknown command: {command}")
        print_help()
        sys.exit(1)
