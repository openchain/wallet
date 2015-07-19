var module = angular.module("OpenChainWallet.Controllers");
var ByteBuffer = dcodeIO.ByteBuffer;
var Long = dcodeIO.Long;

module.controller("AdminController", function ($scope, $location, $routeParams, protobufBuilder, walletSettings, apiService, encodingService, endpointManager) {

    if (!walletSettings.initialized) {
        $location.path("/signin");
        return;
    }

    $scope.endpoints = endpointManager.endpoints;
    $scope.display = "asset-definition";

    for (var key in $scope.endpoints) {
        $scope.endpoint = $scope.endpoints[key];
        break;
    }

    $scope.setEndpoint = function (endpoint) {
        $scope.endpoint = endpoint;
    }

    $scope.setView = function (view) {
        $scope.display = view;
    }
});

module.controller("CreateAssetController", function ($scope, $location, $routeParams, protobufBuilder, walletSettings, apiService, encodingService, endpointManager) {

    $scope.assetPath = "";
    $scope.assetName = "";
    $scope.assetTicker = "";
    $scope.assetImage = "";

    $scope.create = function () {

        var key = encodingService.encodeString($scope.assetPath, 256 + 1);

        var value = JSON.stringify({
            name: $scope.assetName,
            name_short: $scope.assetTicker,
            icon_url: $scope.assetImage
        });

        apiService.getValue($scope.$parent.endpoint, key).then(function (result) {

            var constructedTransaction = new protobufBuilder.Mutation({
                "namespace": encodingService.encodeNamespace($scope.$parent.endpoint.rootUrl),
                "key_value_pairs": [
                    {
                        "key": key,
                        "value": encodingService.encodeString(value, 1),
                        "version": result.version
                    }
                ],
                "metadata": ByteBuffer.fromHex("")
            });

            apiService.postTransaction($scope.$parent.endpoint, constructedTransaction).then(function () {
                $location.path("/");
            });
        });

    };
});