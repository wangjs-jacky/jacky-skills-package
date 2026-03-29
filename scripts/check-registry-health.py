#!/usr/bin/env python3
"""
Registry 健康检查脚本
检测 broken symlinks、missing paths、无效 entries

用法:
  python3 scripts/check-registry-health.py [--fix]

  --fix: 自动移除 broken entries（默认仅报告）
"""
import json
import os
import sys

REGISTRY_PATH = os.path.expanduser("~/.j-skills/registry.json")

def main():
    fix = "--fix" in sys.argv

    if not os.path.exists(REGISTRY_PATH):
        print("❌ Registry file not found:", REGISTRY_PATH)
        sys.exit(1)

    with open(REGISTRY_PATH) as f:
        data = json.load(f)

    skills = data.get("skills", {})
    total = len(skills)

    if total == 0:
        print("⚠️  Registry is empty")
        sys.exit(0)

    broken = []
    valid = []

    for name, skill in skills.items():
        path = skill.get("path", "")
        is_symlink = os.path.islink(path) if path else False
        exists = os.path.isdir(path) if path else False

        if exists:
            valid.append(name)
        else:
            broken.append({
                "name": name,
                "path": path,
                "reason": "broken symlink" if is_symlink else "path not found"
            })

    print(f"\n📋 Registry Health Check")
    print(f"   Total: {total} skills")
    print(f"   ✅ Valid: {len(valid)}")
    print(f"   ❌ Broken: {len(broken)}")

    if not broken:
        print("\n✅ All skill paths are valid!\n")
        sys.exit(0)

    print(f"\n❌ Broken entries ({len(broken)}):")
    for entry in broken:
        print(f"   • {entry['name']}")
        print(f"     path: {entry['path']}")
        print(f"     reason: {entry['reason']}")

    if fix:
        for entry in broken:
            del data["skills"][entry["name"]]
            print(f"   🗑️  Removed: {entry['name']}")

        with open(REGISTRY_PATH, "w") as f:
            json.dump(data, f, indent=2)

        print(f"\n✅ Cleaned {len(broken)} broken entries. Remaining: {len(data['skills'])} skills\n")
        sys.exit(0)
    else:
        print(f"\n💡 Run with --fix to auto-remove broken entries:")
        print(f"   python3 {sys.argv[0]} --fix\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
