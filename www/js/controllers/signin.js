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
    $scope.seed = "patrol wise idea oyster inquiry crash dignity chronic scatter time admit pet";//generatedMnemonic.toString();

    $scope.submit = function () {

        if (Mnemonic.isValid($scope.seed)) {

            var code = new Mnemonic($scope.seed);

            var hdKey = code.toHDPrivateKey();

            walletSettings.setRootKey(hdKey);

            $location.path("/");
        }
    };
});
