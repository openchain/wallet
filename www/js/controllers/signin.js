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

var module = angular.module("OpenChainWallet.Controllers");
var ByteBuffer = dcodeIO.ByteBuffer;
var bitcore = require("bitcore");
var Mnemonic = require("bitcore-mnemonic");

module.controller("SignInController", function ($scope, $rootScope, $location, walletSettings) {

    if (walletSettings.initialized) {
        $location.path("/");
        return;
    }

    $rootScope.selectedTab = "none";

    var generatedMnemonic = new Mnemonic();
    $scope.properties = { seed: "" };
    $scope.display = "signin";

    $scope.generate = function () {
        var generatedMnemonic = new Mnemonic();
        $scope.passphrase = generatedMnemonic.toString();
        $scope.display = "passphrase";
    };

    $scope.back = function () {
        $scope.display = "signin";
    };

    $scope.submit = function () {

        if (Mnemonic.isValid($scope.properties.seed)) {

            var worker = new Worker("js/derive.js");

            worker.addEventListener("message", function (hdKey) {
                $rootScope.$apply(function () {
                    var hdPrivateKey = new bitcore.HDPrivateKey(hdKey.data);
                    walletSettings.setRootKey(hdPrivateKey);
                    $location.path("/");
                })
            }, false);

            worker.postMessage({ mnemonic: $scope.properties.seed, network: "testnet" });

            $scope.display = "loading";
        }
        else {
            $scope.properties.signinForm.seed.$setValidity("invalidSeed", false);
        }
    };
});
