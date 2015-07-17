var module = angular.module("OpenChainWallet.Controllers");
var ByteBuffer = dcodeIO.ByteBuffer;
var bitcore = require("bitcore");
var Mnemonic = require("bitcore-mnemonic");

module.controller("SignInController", function ($scope, $location, walletSettings) {

    if (walletSettings.initialized) {
        $location.path("/");
        return;
    }

    var generatedMnemonic = new Mnemonic();
    $scope.seed = "patrol wise idea oyster inquiry crash dignity chronic scatter time admit pet";//generatedMnemonic.toString();

    $scope.submit = function () {

        if (Mnemonic.isValid($scope.seed)) {

            var code = new Mnemonic($scope.seed);

            var hd_key = code.toHDPrivateKey();
            var derivedKey = hd_key.derive(44, true).derive(22, true).derive(0, true).derive(0).derive(0);

            walletSettings.hdKey = hd_key;
            walletSettings.derivedKey = derivedKey;
            walletSettings.rootAccount = "/p2pkh/" + derivedKey.privateKey.toAddress().toString();
            walletSettings.initialized = true;

            $location.path("/");
        }
    };
});
