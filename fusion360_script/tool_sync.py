"""
Autodesk Fusion 360 CAM Tool Sync Script
----------------------------------------
This script extracts required cutting tools from the active CAM setup in Autodesk Fusion 360
and sends a JSON payload to the CNC Tool Manager web application at:
http://localhost:3000/api/fusion-tools

Can be run inside Autodesk Fusion 360 Scripts and Add-Ins, or run standalone via command line:
    python tool_sync.py [--url http://localhost:3000] [--machine VF-2]
"""

import os
import sys
import json
import urllib.request
import urllib.error
import argparse

# Configuration
# Can be overridden via environment variables or CLI arguments (--url)
DEFAULT_HOST = os.environ.get("TOOL_APP_HOST", "http://localhost:3000").rstrip("/")
WEB_APP_ENDPOINT = f"{DEFAULT_HOST}/api/fusion-tools"
MACHINE_NAME = os.environ.get("TOOL_APP_MACHINE", "Brother Speedio S700xd1")
API_SECRET = os.environ.get("TOOL_APP_SECRET", "internal-api-key-for-fusion-script")


def get_tools_from_fusion():
    """Extract tools from active Fusion 360 CAM setup if running inside Fusion."""
    try:
        import adsk.core
        import adsk.cam

        app = adsk.core.Application.get()
        doc = app.activeDocument
        products = doc.products
        cam_product = products.itemByProductType('CAMProductType')

        if not cam_product:
            print("No CAM workspace active in current document.")
            return []

        cam = adsk.cam.CAM.cast(cam_product)
        setups = cam.setups
        if setups.count == 0:
            print("No CAM setups found.")
            return []

        tools_list = []
        seen_tnums = set()

        # Iterate active operations in all setups
        for setup in setups:
            for op in setup.allOperations:
                if op.hasTool:
                    tool = op.tool
                    # Tool number in Fusion CAM
                    tnum = str(tool.parameters.itemByName('tool_number').value.value)
                    desc = tool.parameters.itemByName('tool_description').value.value if tool.parameters.itemByName('tool_description') else f"Tool {tnum}"
                    
                    if tnum and tnum not in seen_tnums:
                        seen_tnums.add(tnum)
                        tools_list.append({
                            "tnum": tnum,
                            "description": desc
                        })

        return tools_list
    except ImportError:
        # Running outside Autodesk Fusion 360 environment (e.g. CLI test mode)
        print("[Notice] Not running inside Autodesk Fusion 360. Using sample CAM setup payload.")
        return [
            {"tnum": "1", "description": "1/2 Rougher Mari (Rough - Large)"},
            {"tnum": "2", "description": "Downcut Top Hat"},
            {"tnum": "5", "description": "1/4 (HSAM2) Rough - Small"},
            {"tnum": "12", "description": "6.7mm drill"},
            {"tnum": "207", "description": "5/16 ThreadMill TiAln"},
            {"tnum": "108", "description": "0.250 Chamfer Mill (MISSING TOOL TEST)"},
            {"tnum": "999", "description": "Special Custom Flycutter (UNREGISTERED TEST)"}
        ]


def send_to_web_app(tools, machine_name=MACHINE_NAME, endpoint=WEB_APP_ENDPOINT, api_secret=API_SECRET):
    payload = {
        "machineName": machine_name,
        "requiredTools": tools
    }

    data = json.dumps(payload).encode('utf-8')
    headers = {
        'Content-Type': 'application/json',
        'Authorization': api_secret,
        'User-Agent': 'Autodesk-Fusion-360-ToolSync/1.0'
    }

    req = urllib.request.Request(endpoint, data=data, headers=headers, method='POST')

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            resp_data = resp.read().decode('utf-8')
            print(f"✓ Success ({resp.status}): Ingested {len(tools)} tools into CNC Tool Manager.")
            print(f"Response: {resp_data}")
            return True
    except urllib.error.URLError as e:
        print(f"✗ Failed to connect to CNC Tool Manager at {endpoint}: {e}")
        return False


def run(context=None, host=None, machine=None):
    """Entry point for Fusion 360 script engine."""
    endpoint = f"{host.rstrip('/')}/api/fusion-tools" if host else WEB_APP_ENDPOINT
    target_machine = machine if machine else MACHINE_NAME

    print(f"Connecting to CNC Tool Manager at: {endpoint}")
    print(f"Target machine: {target_machine}")
    print("Extracting CAM setup tools...")

    tools = get_tools_from_fusion()
    if tools:
        print(f"Found {len(tools)} cutting tools:")
        for t in tools:
            print(f"  - T{t['tnum']}: {t['description']}")
        send_to_web_app(tools, machine_name=target_machine, endpoint=endpoint)
    else:
        print("No tools found to transmit.")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Sync Fusion 360 CAM tools with CNC Tool Manager")
    parser.add_argument("--url", default=None, help="Base URL of CNC Tool Manager (e.g. http://192.168.1.150:3000)")
    parser.add_argument("--machine", default=None, help="Target machine name")
    args, unknown = parser.parse_known_args()

    run(host=args.url, machine=args.machine)

