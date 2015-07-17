var module = angular.module("OpenChainWallet.Controllers", []);
var ByteBuffer = dcodeIO.ByteBuffer;
var bitcore = require("bitcore");
var Mnemonic = require("bitcore-mnemonic");

// ***** AddEndpointController *****
// *********************************

module.controller("AddEndpointController", function ($scope, $location, walletSettings, apiService, endpointManager) {

    if (!walletSettings.initialized) {
        $location.path("/signin");
        return;
    }

    $scope.check = function () {
        apiService.getLedgerInfo($scope.endpointUrl).then(function (result) {
            $scope.endpoint = result.data;
        }, function () {
            $scope.addEndpointForm.endpointUrl.$setValidity("connectionError", false);
        });
    };

    $scope.changeUrl = function () {
        $scope.addEndpointForm.endpointUrl.$setValidity("connectionError", true);
    };

    $scope.confirm = function () {
        endpointManager.addEndpoint($scope.endpoint);
        $location.path("/");
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