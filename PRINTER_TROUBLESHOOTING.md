# Star TSP III "Access Denied" Error - Quick Fix Guide

## The Problem
Getting error: "Connection failed: Failed to execute 'open' on 'USBDevice': Access denied"

## What Causes This
- Printer is already in use by another application
- Previous browser session didn't properly release the printer
- Windows printer drivers interfering with WebUSB
- Printer not properly configured

## Step-by-Step Solution

### Method 1: Simple Reset (Try This First)
1. **Disconnect** the USB cable from printer
2. **Close** all browser tabs with the POS system
3. **Close** any printer software (Star utilities, receipt designer, etc.)
4. **Wait** 10 seconds
5. **Reconnect** USB cable to printer
6. **Open** POS system in Chrome/Edge
7. **Click** "Connect Printer" again

### Method 2: Windows Device Reset
1. Open **Device Manager** (Windows key + X, then M)
2. Expand **Universal Serial Bus controllers**
3. Find your **Star TSP III** device
4. **Right-click** → **Disable device**
5. Wait 5 seconds
6. **Right-click** → **Enable device**
7. Try connecting again

### Method 3: Browser Reset
1. **Close** all Chrome/Edge windows
2. **Restart** the browser completely
3. Navigate to POS system
4. Try connecting again

### Method 4: Printer Configuration Check
1. Open **Star Configuration Utility**
2. Verify printer is set to **ESC/POS mode**
3. Apply settings and **restart printer**
4. Try connecting again

### Method 5: Advanced WebUSB Reset
1. In Chrome, go to `chrome://device-log/`
2. Look for USB device errors
3. Clear any USB permissions by going to:
   - Chrome Settings → Privacy and Security → Site Settings
   - Additional Content Settings → USB
   - Remove your POS site if listed
4. Try connecting again (you'll need to grant permission again)

## Prevention Tips
- Always use the **Disconnect** button before closing the POS
- Don't run multiple printer applications simultaneously
- Use the **Reconnect** button if print jobs fail
- Keep browser updated (Chrome 61+ or Edge 79+)

## Still Having Issues?
If none of these work:
1. Try a different USB cable
2. Try a different USB port
3. Restart your computer
4. Check if printer works with Star's own software first

The WebUSB connection is very reliable once properly established, these steps solve 99% of access denied issues.