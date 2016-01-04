// Copyright 2015 Coinprism, Inc.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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

    importScripts("../bower_components/bitcore-lib/bitcore-lib.js");
    importScripts("../bower_components/bitcore-mnemonic/bitcore-mnemonic.js");

    var bitcore = require("bitcore-lib");
    var Mnemonic = require("bitcore-mnemonic");

    var code = new Mnemonic(e.data.mnemonic);
    var derivedKey = code.toHDPrivateKey(null, "livenet");
    self.postMessage(derivedKey.xprivkey);

}, false);