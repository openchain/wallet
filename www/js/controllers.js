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

    $scope.rootAccount = walletSettings.rootAccount.toString();
    $scope.endpoints = endpointManager.endpoints;

    var balance = [];

    function loadEndpoint(key) {
        var endpoint = endpointManager.endpoints[key];
        var dataModel = {
            endpoint: endpoint,
            state: "loading",
            assets: []
        };
        balance.push(dataModel);
        apiService.getAccountStatus(endpoint, walletSettings.rootAccount, null).then(function (result) {
            for (var itemKey in result.data) {
                dataModel.assets.push(result.data[itemKey]);
            }

            dataModel.assets.state = "loaded";
        });
    }

    for (var key in endpointManager.endpoints) {
        loadEndpoint(key);
    }

    $scope.balance = balance;
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

            walletSettings.hdKey = hd_key;
            walletSettings.derived_key = derivedKey;
            walletSettings.rootAccount = "/account/p2pkh/" + derivedKey.privateKey.toAddress().toString();
            walletSettings.initialized = true;

            $location.path("/");
        }
    };
});

// ***** SendController *****
// **************************

module.controller("SendController", function ($scope, $location, $q, $routeParams, protobufBuilder, apiService, encodingService, walletSettings, endpointManager) {

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
            .then(function (result) { accountsRetrieved(result[0].data[0], result[1].data[0]); });
        
        $scope.mode = "spinner";
    };

    var accountsRetrieved = function (from, to) {
        $scope.fromBalance = from["balance"];
        $scope.toBalance = to["balance"];

        $scope.constructedTransaction = new protobufBuilder.Mutation({
            "namespace": encodingService.encodeNamespace($scope.endpoint.rootUrl),
            "key_value_pairs": [
                {
                    "key": encodingService.encodeAccount($scope.fromAccount, $scope.asset),
                    "value": encodingService.encodeInt64(-parseInt($scope.amount)),
                    "version": ByteBuffer.fromHex(from["version"])
                },
                {
                    "key": encodingService.encodeAccount($scope.toAccount, $scope.asset),
                    "value": encodingService.encodeInt64(parseInt($scope.amount)),
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

    $scope.add = function () {
        apiService.getLedgerInfo($scope.url).then(function (result) {
            endpointManager.addEndpoint(result.data);
            $location.path("/");
        });
    };
});