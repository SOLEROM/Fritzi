# FridaLab Docker Playground

A self-contained Docker environment for learning [Frida](https://frida.re/) dynamic instrumentation. The container bundles a Python target app with hookable functions, Frida tools, and ready-made hook scripts for quick exploration.

## Quick Start

```bash
docker compose build
docker compose run --rm frida
```

You'll see a cheat sheet and a bash prompt. The target app is already running in the background.

## What's Inside

### Target App (`sample_app/target.py`)

A long-running Python process that periodically calls these functions:

| Function | What it does | Hook goal |
|---|---|---|
| `authenticate(user, pwd)` | Plaintext credential check | Sniff passwords |
| `encrypt_data(data, key)` | XOR "encryption" | Log plaintext before encryption |
| `check_license(key)` | Hardcoded license validation | Bypass to always return `True` |
| `process_payment(amt, card)` | Fake payment processing | Intercept card numbers |
| `get_secret_flag()` | Hidden CTF flag (never called) | Invoke it via Frida to capture the flag |

### Ready-Made Hook Scripts (`/hooks/`)

| Script | Effect |
|---|---|
| `hook_auth.js` | Intercepts `authenticate()`, logs username and password |
| `hook_crypto.js` | Intercepts `encrypt_data()`, logs plaintext and key |
| `hook_license.js` | Bypasses `check_license()` to always return `True` |
| `hook_all.js` | All of the above + RPC export to call `get_secret_flag()` |

### Shell Aliases

| Alias | Expands to |
|---|---|
| `flist` | `frida-ps` |
| `fattach` | `frida -p <PID>` (attaches to target by PID) |
| `ftrace` | `frida-trace -p <PID>` (traces target by PID) |
| `fhook <file>` | `frida -p <PID> -l <file>` |
| `frestart` | Kill and restart the target app |
| `targetlog` | `tail -f /tmp/target.log` |

## Usage Examples

**List processes** to confirm the target is running:
```bash
flist
```

**Hook credentials** — watch usernames and passwords get logged:
```bash
fhook /hooks/hook_auth.js
```

**Bypass the license check**:
```bash
fhook /hooks/hook_license.js
```

**Load all hooks and capture the flag**:
```bash
fhook /hooks/hook_all.js
# In the Frida REPL that opens:
rpc.exports.callSecret()
```

**Attach an interactive REPL** to poke around manually:
```bash
fattach
```

### hooks in logs
  

> docker exec -it fridalab bash                                                                          

Then check the target's log:
      tail -f /tmp/target.log


  You'll see the [HOOK] lines showing intercepted usernames and passwords as the target app runs its loop
   every 5 seconds.



## How the Hooks Work

The hook scripts use CPython's C API (`PyGILState_Ensure`, `PyRun_SimpleString`) to inject Python code into the running target process. This monkey-patches the target module's functions with wrapped versions that log arguments and return values (or override behavior entirely).

## Requirements

- Docker and Docker Compose
- The container needs `SYS_PTRACE` capability (configured in `docker-compose.yml`) for Frida to attach to processes
