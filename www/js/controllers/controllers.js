var module = angular.module("OpenChainWallet.Controllers", []);
var ByteBuffer = dcodeIO.ByteBuffer;
var bitcore = require("bitcore");
var Mnemonic = require("bitcore-mnemonic");

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
            walletSettings.derivedKey = derivedKey;
            walletSettings.rootAccount = "/p2pkh/" + derivedKey.privateKey.toAddress().toString();
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
    $scope.fromAccount = walletSettings.rootAccount;
    $scope.endpoint = endpointManager.endpoints[$routeParams.ledgerId];

    $scope.send = function () {
        $q.all([
                apiService.getAccount($scope.endpoint, $scope.fromAccount, $scope.asset),
                apiService.getAccount($scope.endpoint, $scope.toAccount, $scope.asset)
            ])
            .then(function (result) { accountsRetrieved(result[0], result[1]); });
        
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
                    "value": encodingService.encodeInt64(from["balance"].subtract(Long.fromString($scope.amount))),
                    "version": from["version"]
                },
                {
                    "key": encodingService.encodeAccount($scope.toAccount, $scope.asset),
                    "value": encodingService.encodeInt64(to["balance"].add(Long.fromString($scope.amount))),
                    "version": to["version"]
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

// ***** CreateAssetController *****
// *********************************

module.controller("CreateAssetController", function ($scope, $location, $routeParams, protobufBuilder, walletSettings, apiService, encodingService, endpointManager) {

    if (!walletSettings.initialized) {
        $location.path("/signin");
        return;
    }

    $scope.endpoint = endpointManager.endpoints[$routeParams.ledgerId];

    $scope.create = function () {

        var key = encodingService.encodeString($scope.assetPath, 256 + 1);

        var value = JSON.stringify({
            name: $scope.assetName,
            name_short: $scope.assetTicker,
            icon_url: $scope.assetImage
        });

        apiService.getValue($scope.endpoint, key).then(function (result) {

            var constructedTransaction = new protobufBuilder.Mutation({
                "namespace": encodingService.encodeNamespace($scope.endpoint.rootUrl),
                "key_value_pairs": [
                    {
                        "key": key,
                        "value": encodingService.encodeString(value, 1),
                        "version": result.version
                    }
                ],
                "metadata": ByteBuffer.fromHex("")
            });

            apiService.postTransaction($scope.endpoint, constructedTransaction).then(function () {
                $location.path("/");
            });
        });

    };
});