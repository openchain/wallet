var module = angular.module("OpenChainWallet.Controllers", []);
var ByteBuffer = dcodeIO.ByteBuffer;
var bitcore = require("bitcore");
var Mnemonic = require("bitcore-mnemonic");

// ***** HomeController *****
// **************************

module.controller("HomeController", function ($scope, $location, openChainApiService, walletSettings) {

    if (!walletSettings.initialized) {
        $location.path("/signin");
        return;
    }

    $scope.transactions = [{ "raw": "abcd" }, { "raw": "efhd" }];
    $scope.address = walletSettings.address.toString();

    openChainApiService.getTransactionStream().success(function (response) {
        $scope.transactions = response;
    });
});

// ***** SignInController *****
// ****************************

module.controller("SignInController", function ($scope, $location, walletSettings) {

    if (walletSettings.initialized) {
        $location.path("/");
        return;
    }

    var generatedMnemonic = new Mnemonic();
    $scope.seed = generatedMnemonic.toString();

    $scope.submit = function () {

        if (Mnemonic.isValid($scope.seed)) {

            var code = new Mnemonic($scope.seed);

            var hd_key = code.toHDPrivateKey();
            var derivedKey = hd_key.derive(44, true).derive(22, true).derive(0, true).derive(0).derive(0);

            walletSettings.hd_key = hd_key;
            walletSettings.derived_key = derivedKey;
            walletSettings.address = derivedKey.privateKey.toAddress();
            walletSettings.initialized = true;

            $location.path("/");
        }
    };
});

// ***** SendController *****
// **************************

module.controller("SendController", function ($scope, $location, protobufBuilder, openChainApiService, walletSettings) {

    if (!walletSettings.initialized) {
        $location.path("/");
        return;
    }

    $scope.send = function () {
        var transaction = new protobufBuilder.Transaction({
            "account_entries": [
                {
                    "account": $scope.fromAccount,
                    "asset": $scope.asset,
                    "amount": parseInt($scope.amount),
                    "version": ByteBuffer.fromHex("")
                },
                {
                    "account": $scope.toAccount,
                    "asset": $scope.asset,
                    "amount": -parseInt($scope.amount),
                    "version": ByteBuffer.fromHex("")
                },
            ],
            "metadata": ByteBuffer.fromHex("")
        });

        openChainApiService.postTransaction(transaction);
    };
});