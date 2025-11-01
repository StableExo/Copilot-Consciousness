# File: src/monitoring/event_listener.py (Version 2.1 - Base Network)

import json
import asyncio
import os
import websockets
from web3 import Web3

async def listen_for_swaps():
    """
    The main worker task that connects and processes messages from the Base network.
    """
    # MODIFIED: Now targeting the Base network WebSocket URL
    node_ws_url = os.environ.get("BASE_WEBSOCKET_URL")
    if not node_ws_url:
        print("CRITICAL ERROR: BASE_WEBSOCKET_URL environment variable not set.")
        return

    # This topic hash is the same for Uniswap V3 on all EVM chains.
    swap_event_topic = "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"

    try:
        print("Attempting to connect to Base network WebSocket endpoint...")
        async with websockets.connect(node_ws_url) as ws:
            print("Connection successful. Subscribing to logs on Base...")
            
            subscription_payload = {
                "jsonrpc": "2.0", "id": 1, "method": "eth_subscribe",
                "params": ["logs", {"topics": [swap_event_topic]}]
            }
            await ws.send(json.dumps(subscription_payload))
            
            subscription_response = await ws.recv()
            print(f"DEBUG: Subscription response received: {subscription_response}")
            if 'error' in json.loads(subscription_response):
                print(f"CRITICAL ERROR: Subscription failed! Response: {subscription_response}")
                return

            print("Subscription successful. Listening for Uniswap V3 Swap events on Base...")
            
            while True:
                try:
                    message = await asyncio.wait_for(ws.recv(), timeout=15.0)
                    print(f"DEBUG: Received raw message: {message}") 
                    
                    data = json.loads(message)
                    if 'params' in data and 'result' in data['params']:
                        log = data['params']['result']
                        pool_address = log['address']
                        transaction_hash = log['transactionHash']
                        print(f"--- [!] Base Swap Detected in Pool: {pool_address} | TX: {transaction_hash[:10]}... ---")

                except asyncio.TimeoutError:
                    print("Heartbeat... still alive and listening for events on Base.")
                    continue
                except Exception as e:
                    print(f"ERROR: Could not process received message. Error: {e}")

    except Exception as e:
        print(f"CRITICAL ERROR: A connection-level error occurred: {e}")


async def main():
    """
    Main loop to ensure the listener reconnects on failure.
    """
    while True:
        await listen_for_swaps()
        print("Connection lost. Reconnecting to Base network in 5 seconds...")
        await asyncio.sleep(5)


if __name__ == "__main__":
    print("Starting the Real-Time Event Listener (v2.1) for Project Chimera.")
    print("TARGET NETWORK: Base Mainnet")
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Listener stopped by user.")
  
