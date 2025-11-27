# File: src/monitoring/event_listener.py (Version 2.2 - Integrated with Calculator)

import json
import asyncio
import os
import websockets
from web3 import Web3

# NEW: Import the analysis function from our new calculator module
from src.analysis.arbitrage_calculator import analyze_opportunity

async def listen_for_swaps():
    node_ws_url = os.environ.get("BASE_WEBSOCKET_URL")
    if not node_ws_url:
        print("CRITICAL ERROR: BASE_WEBSOCKET_URL environment variable not set.")
        return

    swap_event_topic = "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"

    try:
        print("Attempting to connect to Base network WebSocket endpoint...")
        async with websockets.connect(node_ws_url) as ws:
            print("Connection successful. Subscribing to logs on Base...")
            
            # (Subscription logic remains the same)
            await ws.send(json.dumps({
                "jsonrpc": "2.0", "id": 1, "method": "eth_subscribe",
                "params": ["logs", {"topics": [swap_event_topic]}]
            }))
            subscription_response = await ws.recv()
            if 'error' in json.loads(subscription_response):
                print(f"CRITICAL ERROR: Subscription failed! Response: {subscription_response}")
                return

            print("Subscription successful. Listening for Uniswap V3 Swap events on Base...")
            
            while True:
                try:
                    message = await asyncio.wait_for(ws.recv(), timeout=60.0) # Increased timeout
                    data = json.loads(message)

                    if 'params' in data and 'result' in data['params']:
                        log = data['params']['result']
                        pool_address = log['address']

                        print(f"--- [!] Swap Detected in Pool: {pool_address} ---")

                        # UPGRADE: Instead of just printing, we now call the calculator.
                        # We use asyncio.create_task to run the analysis concurrently
                        # so our listener doesn't get blocked.
                        asyncio.create_task(analyze_opportunity(pool_address))

                except asyncio.TimeoutError:
                    print("Heartbeat... still alive and listening for events on Base.")
                    continue
                except Exception as e:
                    print(f"ERROR processing message: {e}")

    except Exception as e:
        print(f"CRITICAL ERROR: A connection-level error occurred: {e}")


async def main():
    while True:
        await listen_for_swaps()
        print("Connection lost. Reconnecting to Base network in 5 seconds...")
        await asyncio.sleep(5)


if __name__ == "__main__":
    print("Starting the Integrated Event Listener (v2.2) for Project Chimera.")
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Listener stopped by user.")