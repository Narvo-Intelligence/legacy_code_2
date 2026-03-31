import sys
import re
from pathlib import Path

def main():
    if len(sys.argv) < 2:
        print("Usage: python bump_api_version.py [major|mini|micro]")
        sys.exit(1)
        
    level = sys.argv[1].lower()
    if level not in ("major", "mini", "minor", "micro", "patch"):
        print("Error: level must be major, mini/minor, or micro/patch")
        sys.exit(1)
        
    # server.py is expected to be in the parent directory of the scripts folder
    server_file = Path(__file__).resolve().parent.parent / "server.py"
    
    if not server_file.exists():
        print(f"Error: {server_file} not found.")
        sys.exit(1)
        
    content = server_file.read_text(encoding="utf-8")
    
    # regex to find API_VERSION = "x.y.z" or "x.y"
    match = re.search(r'API_VERSION\s*=\s*(["\'])([\d\.]+)\1', content)
    if not match:
        print("Error: Could not find API_VERSION in server.py")
        sys.exit(1)
        
    current_version = match.group(2)
    parts = current_version.split(".")
    
    # Pad to 3 parts strictly
    while len(parts) < 3:
        parts.append("0")
        
    try:
        major, minor, patch = map(int, parts[:3])
    except ValueError:
        print(f"Error: Invalid version format '{current_version}'.")
        sys.exit(1)
    
    if level == "major":
        major += 1
        minor = 0
        patch = 0
    elif level in ("mini", "minor"):
        minor += 1
        patch = 0
    elif level in ("micro", "patch"):
        patch += 1
        
    new_version = f"{major}.{minor}.{patch}"
    
    # Replace in content
    new_content = content.replace(match.group(0), f'API_VERSION = "{new_version}"')
    
    server_file.write_text(new_content, encoding="utf-8")
    print(f"Bumped API version: {current_version} -> {new_version}")

if __name__ == "__main__":
    main()
