import os
import glob
import re

files = glob.glob("/Volumes/T7 Shield/MockmateWebsiteT7/lib/scenarios/real-world/bugfix/*.ts")

for f in files:
    with open(f, 'r') as file:
        content = file.read()
    
    # Python replacement
    if "results.append({\"suite\": suite, \"name\": name, \"passed\": True, \"error\": None})" in content:
        content = content.replace(
            "results.append({\"suite\": suite, \"name\": name, \"passed\": True, \"error\": None})",
            "results.append({\"suite\": suite, \"name\": name, \"passed\": True, \"error\": None, \"isHidden\": \"hidden\" in suite.lower()})"
        )
        content = content.replace(
            "results.append({\"suite\": suite, \"name\": name, \"passed\": False, \"error\": str(exc) or traceback.format_exc()})",
            "results.append({\"suite\": suite, \"name\": name, \"passed\": False, \"error\": str(exc) or traceback.format_exc(), \"isHidden\": \"hidden\" in suite.lower()})"
        )
        
    # JavaScript replacement (multi-line)
    if "results.push({ suite, name, passed: true, error: null })" in content:
        content = content.replace(
            "results.push({ suite, name, passed: true, error: null })",
            "results.push({ suite, name, passed: true, error: null, isHidden: suite.toLowerCase().includes(\"hidden\") })"
        )
        content = content.replace(
            "results.push({ suite, name, passed: false, error: error && error.message ? error.message : String(error) })",
            "results.push({ suite, name, passed: false, error: error && error.message ? error.message : String(error), isHidden: suite.toLowerCase().includes(\"hidden\") })"
        )
        content = content.replace(
            "results.push({ suite, name, passed: false, error: error.message })",
            "results.push({ suite, name, passed: false, error: error.message, isHidden: suite.toLowerCase().includes(\"hidden\") })"
        )
        
    with open(f, 'w') as file:
        file.write(content)

print("Done patching.")
