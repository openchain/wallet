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
    $scope.root_account = walletSettings.root_account.toString();

    openChainApiService.getSubaccounts(walletSettings.root_account).success(function (response) {
        $scope.accounts = response;
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
            walletSettings.root_account = "/account/p2pkh/" + derivedKey.privateKey.toAddress().toString();
            walletSettings.initialized = true;

            $location.path("/");
        }
    };
});

// ***** SendController *****
// **************************

module.controller("SendController", function ($scope, $location, $q, protobufBuilder, openChainApiService, walletSettings) {

    if (!walletSettings.initialized) {
        $location.path("/");
        return;
    }

    $scope.mode = "form";

    $scope.send = function () {
        $q.all([
            openChainApiService.getAccountStatus($scope.fromAccount, $scope.asset),
            openChainApiService.getAccountStatus($scope.toAccount, $scope.asset)
        ])
            .then(function (result) { accountsRetrieved(result[0].data, result[1].data); });
        
        $scope.mode = "spinner";
    };

    var accountsRetrieved = function (from, to) {
        $scope.fromBalance = from["amount"];
        $scope.toBalance = to["amount"];

        $scope.constructedTransaction = new protobufBuilder.Transaction({
            "account_entries": [
                {
                    "account": $scope.fromAccount,
                    "asset": $scope.asset,
                    "amount": -parseInt($scope.amount),
                    "version": ByteBuffer.fromHex(from["version"])
                },
                {
                    "account": $scope.toAccount,
                    "asset": $scope.asset,
                    "amount": parseInt($scope.amount),
                    "version": ByteBuffer.fromHex(to["version"])
                },
            ],
            "metadata": ByteBuffer.fromHex("")
        });

        $scope.mode = "confirm";
    };

    $scope.confirm = function () {

        openChainApiService.postTransaction($scope.constructedTransaction).then(transactionConfirmed);
        $scope.mode = "spinner";
    };

    var transactionConfirmed = function (result) {
        $scope.mode = "confirmed";
        $scope.ledgerRecordId = result.data["ledger_record"];
    }
});