/**
 * hook_crypto.js — Intercept encrypt_data() and log plaintext before encryption.
 *
 * Usage: fhook /hooks/hook_crypto.js
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
    if hasattr(_mod, 'encrypt_data') and hasattr(_mod, 'SECRET_PASSWORD'):
        _target = _mod
        break

if _target is None:
    print("[!] Could not find target module")
else:
    _orig_encrypt = _target.encrypt_data

    def _hooked_encrypt_data(data, key):
        print(f"\\n[HOOK] encrypt_data() called!")
        print(f"[HOOK]   plaintext = {data!r}")
        print(f"[HOOK]   key       = {key!r}")
        result = _orig_encrypt(data, key)
        print(f"[HOOK]   encrypted = {result!r}")
        _sys.stdout.flush()
        return result

    _target.encrypt_data = _hooked_encrypt_data
    print("[+] hook_crypto.js: encrypt_data() hooked successfully!")
    _sys.stdout.flush()
`);
