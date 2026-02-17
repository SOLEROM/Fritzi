#!/usr/bin/env bash
# FridaLab startup script — prints cheat sheet, starts target, drops into bash.

set -e

TARGET_PID=""

start_target() {
    python3 /app/sample_app/target.py > /tmp/target.log 2>&1 &
    TARGET_PID=$!
    echo "$TARGET_PID" > /tmp/target.pid
    # give it a moment to start
    sleep 1
}

stop_target() {
    if [ -f /tmp/target.pid ]; then
        kill "$(cat /tmp/target.pid)" 2>/dev/null || true
        rm -f /tmp/target.pid
    fi
}

# ── Aliases ───────────────────────────────────────────────────────────

setup_aliases() {
    cat >> ~/.bashrc << 'ALIASES'

# FridaLab aliases
alias flist='frida-ps'
fattach()  { frida -p "$(cat /tmp/target.pid)"; }
ftrace()   { frida-trace -p "$(cat /tmp/target.pid)" "$@"; }
fhook()    { frida -p "$(cat /tmp/target.pid)" -l "$1"; }
frestart() {
    echo "[*] Restarting target app..."
    kill "$(cat /tmp/target.pid 2>/dev/null)" 2>/dev/null || true
    sleep 1
    python3 /app/sample_app/target.py > /tmp/target.log 2>&1 &
    echo "$!" > /tmp/target.pid
    echo "[+] target.py restarted (PID: $(cat /tmp/target.pid))"
}
alias targetlog='tail -f /tmp/target.log'
export -f fattach ftrace fhook frestart
ALIASES
}

# ── Cheat Sheet ───────────────────────────────────────────────────────

print_cheatsheet() {
    cat << 'EOF'

╔══════════════════════════════════════════════════════════════════╗
║                    🔬  FridaLab Playground  🔬                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  TARGET APP  target.py is running in the background.             ║
║              Logs: targetlog  (tail -f /tmp/target.log)          ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║  QUICK ALIASES                                                   ║
║                                                                  ║
║    flist            List processes (frida-ps)                    ║
║    fattach          Attach REPL to target app (by PID)            ║
║    ftrace           Trace calls in target app (by PID)            ║
║    fhook <file>     Load a JS hook script against target app      ║
║    frestart         Kill & restart target.py                     ║
║    targetlog        Tail the target app log                      ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║  READY-MADE HOOKS  (in /hooks/)                                  ║
║                                                                  ║
║    fhook /hooks/hook_auth.js      Log credentials                ║
║    fhook /hooks/hook_crypto.js    Log plaintext before encrypt   ║
║    fhook /hooks/hook_license.js   Bypass license check           ║
║    fhook /hooks/hook_all.js       All hooks combined             ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║  FRIDA REPL TIPS  (after running fattach)                        ║
║                                                                  ║
║    Python.perform(() => { ... })   Run in Python context         ║
║    Module.findExportByName(...)    Find native exports           ║
║    Interceptor.attach(ptr, {...})  Hook native functions          ║
║                                                                  ║
║  INVOKE HIDDEN FUNCTION (from Frida REPL):                       ║
║    rpc.exports.callSecret()  (after loading hook_all.js)         ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝

EOF
}

# ── Main ──────────────────────────────────────────────────────────────

setup_aliases
print_cheatsheet

echo "[*] Starting target.py in background..."
start_target
echo "[+] target.py started (PID: $(cat /tmp/target.pid))"
echo "[*] Dropping into bash — happy hooking!"
echo ""

exec bash --rcfile ~/.bashrc
