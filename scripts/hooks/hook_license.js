/**
 * hook_license.js — Bypass check_license() to always return True.
 *
 * Usage: fhook /hooks/hook_license.js
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
    if hasattr(_mod, 'check_license') and hasattr(_mod, 'SECRET_PASSWORD'):
        _target = _mod
        break

if _target is None:
    print("[!] Could not find target module")
else:
    _orig_check = _target.check_license

    def _hooked_check_license(license_key):
        print(f"\\n[HOOK] check_license() called!")
        print(f"[HOOK]   license_key = {license_key!r}")
        print(f"[HOOK]   BYPASSED — returning True!")
        _sys.stdout.flush()
        return True

    _target.check_license = _hooked_check_license
    print("[+] hook_license.js: check_license() hooked — always returns True!")
    _sys.stdout.flush()
`);
