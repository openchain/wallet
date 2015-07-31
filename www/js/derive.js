
self.addEventListener("message", function (e) {

    window = {};
    window.Object = Object;
    window.String = String;
    window.RegExp = RegExp;
    window.Math = Math;
    window.Function = Function;
    window.Array = Array;
    window.Date = Date;
    window.parseInt = parseInt;
    window.parseFloat = parseFloat;
    window.crypto = crypto;

    importScripts("../bower_components/bitcore/bitcore.js");
    importScripts("../bower_components/bitcore-mnemonic/bitcore-mnemonic.js");

    var bitcore = require("bitcore");
    var Mnemonic = require("bitcore-mnemonic");

    var code = new Mnemonic(e.data.mnemonic);
    var derivedKey = code.toHDPrivateKey(null, e.data.network);
    self.postMessage(derivedKey.xprivkey);

}, false);