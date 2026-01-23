import re
import os

def main():
    base_dir = r"C:\Users\Dell\Desktop\Apex-Platform-2026\packages\core"
    md_file = os.path.join(base_dir, "src", "file src.md")
    
    with open(md_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Regex to find: ### [Number] 'src/[Path]' \n\n ```ts [Code] ```
    # Note: Using non-greedy match for code block content
    pattern = re.compile(r"### \d+.*?\s*`+(src/.*?)`+\s*[\r\n]+```ts\s*([\s\S]*?)```", re.MULTILINE)
    
    matches = pattern.findall(content)
    
    print(f"Found {len(matches)} test files to create.")
    
    for relative_path, code in matches:
        relative_path = relative_path.strip()
        full_path = os.path.join(base_dir, relative_path)
        directory = os.path.dirname(full_path)
        
        if not os.path.exists(directory):
            os.makedirs(directory, exist_ok=True)
            
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(code.strip() + "\n")
            
        print(f"✅ Created {relative_path}")

if __name__ == "__main__":
    main()
