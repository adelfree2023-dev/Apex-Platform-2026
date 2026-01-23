#!/usr/bin/env python3
"""
Apex Platform AI Agent Orchestrator
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This script enables any AI agent or developer to:
1. Scaffold a new secure feature (ASMP-compliant)
2. Immediately scan it for violations
3. Ensure zero drift from security & architecture standards

Usage:
  python apex_agent.py create <feature_name>
  python apex_agent.py check
"""

import sys
import subprocess
import os
import re

def run_scaffold(feature_name):
    print(f"🤖 Agent: Creating secure feature '{feature_name}'...")
    # Check if scaffold_feature.py exists
    scaffold_script = "scaffold_feature.py"
    if not os.path.exists(scaffold_script):
        # Try finding it in automation directory
        if os.path.exists(os.path.join("automation", scaffold_script)):
            scaffold_script = os.path.join("automation", scaffold_script)
        else:
            print(f"❌ Error: {scaffold_script} not found.")
            return

    result = subprocess.run([sys.executable, scaffold_script, feature_name], capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print("⚠️  Scaffold warning/error:", result.stderr)

def run_security_gate():
    print("\n🔍 Agent: Running ASMP Security Gate...")
    gate_script = "security_gate.py"
    if not os.path.exists(gate_script):
         if os.path.exists(os.path.join("automation", gate_script)):
            gate_script = os.path.join("automation", gate_script)
         else:
            print(f"❌ Error: {gate_script} not found.")
            return

    result = subprocess.run([sys.executable, gate_script], capture_output=True, text=True)
    print(result.stdout)
    if "❌" in result.stdout or "🛑" in result.stdout:
        print("🚨 Agent: Security gate failed. Please fix issues before proceeding.")
        sys.exit(1)
    else:
        print("✅ Agent: All clear! Feature is ASMP-compliant and ready for development.")

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return

    command = sys.argv[1]

    if command == "create" and len(sys.argv) == 3:
        feature_name = sys.argv[2]
        if not re.match(r"^[a-z][a-z0-9]*$", feature_name):
            print("❌ Invalid feature name. Use lowercase letters and digits only (e.g., 'reports', 'inventory').")
            sys.exit(1)
        run_scaffold(feature_name)
        run_security_gate()
    elif command == "check":
        run_security_gate()
    else:
        print("❌ Unknown command.")
        print(__doc__)

if __name__ == "__main__":
    main()
