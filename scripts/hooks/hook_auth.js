/**
 * hook_auth.js — Intercept authenticate() and log credentials.
 *
 * Usage: fhook /hooks/hook_auth.js
 */

"use strict";

/* Find the libpython module and resolve CPython C-API symbols (Frida 17+ API). */
var pyMod = Process.enumerateModules().find(function (m) {
    return /libpython/i.test(m.name);
}) || Process.enumerateModules().find(function (m) {
    return /python/i.test(m.name);
});
if (!pyMod) throw new Error("No Python module found — is this a CPython process?");

var PyGILState_Ensure  = new NativeFunction(pyMod.getExportByName("PyGILState_Ensure"),  "int",     []);
var PyGILState_Release = new NativeFunction(pyMod.getExportByName("PyGILState_Release"), "void",    ["int"]);
var PyRun_SimpleString = new NativeFunction(pyMod.getExportByName("PyRun_SimpleString"), "int",     ["pointer"]);

function pyExec(code) {
    var gstate = PyGILState_Ensure();
    try {
        PyRun_SimpleString(Memory.allocUtf8String(code));
    } finally {
        PyGILState_Release(gstate);
    }
}

pyExec(`
import sys as _sys

_target = None
for _name, _mod in _sys.modules.items():
    if hasattr(_mod, 'authenticate') and hasattr(_mod, 'SECRET_PASSWORD'):
        _target = _mod
        break

if _target is None:
    print("[!] Could not find target module")
else:
    _orig_authenticate = _target.authenticate

    def _hooked_authenticate(username, password):
        print(f"\\n[HOOK] authenticate() called!")
        print(f"[HOOK]   username = {username!r}")
        print(f"[HOOK]   password = {password!r}")
        result = _orig_authenticate(username, password)
        print(f"[HOOK]   result   = {result}")
        _sys.stdout.flush()
        return result

    _target.authenticate = _hooked_authenticate
    print("[+] hook_auth.js: authenticate() hooked successfully!")
    _sys.stdout.flush()
`);
