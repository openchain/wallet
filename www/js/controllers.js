var module = angular.module("OpenChainWallet.Controllers", []);
var ByteBuffer = dcodeIO.ByteBuffer;
var bitcore = require("bitcore");
var Mnemonic = require("bitcore-mnemonic");

// ***** HomeController *****
// **************************

module.controller("HomeController", function ($scope, $location, apiService, walletSettings, endpointManager) {

    if (!walletSettings.initialized) {
        $location.path("/signin");
        return;
    }

    $scope.transactions = [{ "raw": "abcd" }, { "raw": "efhd" }];
    $scope.root_account = walletSettings.root_account.toString();
    $scope.endpoints = endpointManager.endpoints;
    //apiService.getSubaccounts(walletSettings.root_account).success(function (response) {
    //    $scope.accounts = response;
    //});


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

module.controller("SendController", function ($scope, $location, $q, $routeParams, protobufBuilder, apiService, walletSettings, endpointManager) {

    if (!walletSettings.initialized) {
        $location.path("/signin");
        return;
    }

    $scope.mode = "form";
    $scope.endpoint = endpointManager.endpoints[$routeParams.ledgerId];

    $scope.send = function () {
        $q.all([
                apiService.getAccountStatus($scope.endpoint, $scope.fromAccount, $scope.asset),
                apiService.getAccountStatus($scope.endpoint, $scope.toAccount, $scope.asset)
            ])
            .then(function (result) { accountsRetrieved(result[0].data, result[1].data); });
        
        $scope.mode = "spinner";
    };

    var accountsRetrieved = function (from, to) {
        $scope.fromBalance = from["amount"];
        $scope.toBalance = to["amount"];

        $scope.constructedTransaction = new protobufBuilder.Transaction({
            "ledger_id": $scope.endpoint.rootUrl,
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
        apiService.postTransaction($scope.endpoint, $scope.constructedTransaction).then(transactionConfirmed);
        $scope.mode = "spinner";
    };

    var transactionConfirmed = function (result) {
        $scope.mode = "confirmed";
        $scope.ledgerRecordId = result.data["ledger_record"];
    }
});

// ***** AddEndpointController *****
// *********************************

module.controller("AddEndpointController", function ($scope, $location, walletSettings, apiService, endpointManager) {

    if (!walletSettings.initialized) {
        $location.path("/signin");
        return;
    }

    // TODO: Remove
    $scope.url = "http://localhost:5000/";

    $scope.add = function () {
        apiService.getLedgerInfo($scope.url).then(function (result) {
            endpointManager.addEndpoint(result.data);
            $location.path("/");
        });
    };
});