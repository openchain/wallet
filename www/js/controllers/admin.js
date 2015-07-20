var module = angular.module("OpenChainWallet.Controllers");
var ByteBuffer = dcodeIO.ByteBuffer;
var Long = dcodeIO.Long;

module.controller("AdminController", function ($scope, $location, protobufBuilder, walletSettings, apiService, encodingService, endpointManager) {

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

module.controller("CreateAssetController", function ($scope, $location, $routeParams, protobufBuilder, walletSettings, apiService, encodingService) {

    $scope.assetPath = "";
    $scope.assetName = "";
    $scope.assetTicker = "";
    $scope.assetImage = "";

    $scope.loadAsset = function () {

        $scope.$parent.endpoint.getAssetDefinition($scope.assetPath).then(function (result) {
            if (result != null) {
                $scope.assetName = result.name;
                $scope.assetTicker = result.nameShort;
                $scope.assetImage = result.iconUrl;
            }
        });
    };

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

module.controller("TransactionController", function ($scope, $location, $q, protobufBuilder, apiService, encodingService, validator) {

    $scope.mutations = [];

    $scope.addMutation = function () {
        $scope.mutations.push({
            account: "",
            asset: "",
            amount: ""
        })
    };

    $scope.remove = function (index) {
        if ($scope.mutations.length > 1) {
            $scope.mutations.splice(index, 1);
        }
    };

    $scope.submit = function () {
        var valid = true;
        var endpoint = $scope.endpoint;
        
        for (var mutationKey in $scope.mutations) {
            var mutation = $scope.mutations[mutationKey];
            mutation.amountError = !validator.isNumber(mutation.amount);
            mutation.assetError = !mutation.asset;
            mutation.accountError = !mutation.account;

            if (mutation.amountError || mutation.assetError || mutation.accountError)
                valid = false;
        }

        if (!valid)
            return;
        
        $q.all($scope.mutations.map(function (mutation) {
            return apiService.getAccount(endpoint, mutation.account, mutation.asset);
        }))
        .then(function(array) {
            var constructedTransaction = new protobufBuilder.Mutation({
                "namespace": encodingService.encodeNamespace(endpoint.rootUrl),
                "key_value_pairs": [ ],
                "metadata": ByteBuffer.fromHex("")
            });
            
            for (var i = 0; i < $scope.mutations.length; i++) {
                constructedTransaction.key_value_pairs.push({
                    "key": encodingService.encodeAccount($scope.mutations[i].account, $scope.mutations[i].asset),
                    "value": encodingService.encodeInt64(array[i].balance.add(Long.fromString($scope.mutations[i].amount))),
                    "version": array[i].version
                });
            }

            return apiService.postTransaction(endpoint, constructedTransaction);
        });

    };

    $scope.addMutation();

});