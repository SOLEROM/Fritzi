/**
 * hook_all.js — Combined hooks for all target functions + secret flag retrieval.
 *
 * Usage: fhook /hooks/hook_all.js
 *
 * After loading, retrieve the secret flag from the Frida REPL:
 *   rpc.exports.callSecret()
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
    # ── Hook authenticate() ──
    _orig_auth = _target.authenticate
    def _hooked_authenticate(username, password):
        print(f"\\n[HOOK] authenticate({username!r}, {password!r})")
        result = _orig_auth(username, password)
        print(f"[HOOK]   => {result}")
        _sys.stdout.flush()
        return result
    _target.authenticate = _hooked_authenticate

    # ── Hook encrypt_data() ──
    _orig_encrypt = _target.encrypt_data
    def _hooked_encrypt_data(data, key):
        print(f"\\n[HOOK] encrypt_data({data!r}, key={key!r})")
        result = _orig_encrypt(data, key)
        print(f"[HOOK]   => {result!r}")
        _sys.stdout.flush()
        return result
    _target.encrypt_data = _hooked_encrypt_data

    # ── Hook check_license() — BYPASS ──
    def _hooked_check_license(license_key):
        print(f"\\n[HOOK] check_license({license_key!r}) => BYPASSED to True")
        _sys.stdout.flush()
        return True
    _target.check_license = _hooked_check_license

    # ── Hook process_payment() ──
    _orig_payment = _target.process_payment
    def _hooked_process_payment(amount, card_number):
        print(f"\\n[HOOK] process_payment(amount={amount}, card={card_number!r})")
        result = _orig_payment(amount, card_number)
        print(f"[HOOK]   => {result}")
        _sys.stdout.flush()
        return result
    _target.process_payment = _hooked_process_payment

    print("[+] hook_all.js: All functions hooked!")
    print("[+] License check bypassed (always returns True)")
    print("[+] Use rpc.exports.callSecret() to get the flag!")
    _sys.stdout.flush()
`);

/* RPC export to call the hidden get_secret_flag() */
rpc.exports = {
    callSecret: function () {
        /* Write the flag to a temp file, then read it back via Frida. */
        pyExec(`
import sys as _sys
for _name, _mod in _sys.modules.items():
    if hasattr(_mod, 'get_secret_flag'):
        _flag = _mod.get_secret_flag()
        open('/tmp/_frida_flag', 'w').write(_flag)
        print(f"[FLAG] {_flag}")
        _sys.stdout.flush()
        break
`);
        try {
            var f = new File("/tmp/_frida_flag", "r");
            var flag = f.readAllText().trim();
            f.close();
            return flag;
        } catch (e) {
            return "Error reading flag: " + e.message;
        }
    }
};
