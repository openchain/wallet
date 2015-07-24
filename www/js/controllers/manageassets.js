var module = angular.module("OpenChainWallet.Controllers");
var ByteBuffer = dcodeIO.ByteBuffer;
var Long = dcodeIO.Long;
var bitcore = require("bitcore");
var Mnemonic = require("bitcore-mnemonic");

// ***** ManageAssetsController *****
// **********************************

module.controller("ManageAssetsController", function ($scope, $rootScope, $location, $route, $q, apiService, walletSettings, endpointManager, protobufBuilder, encodingService, validator, AssetData) {

    if (!walletSettings.initialized) {
        $location.path("/signin");
        return;
    }

    $rootScope.selectedTab = "assets";

    $scope.mode = "select-path";
    $scope.endpoints = endpointManager.endpoints;
    $scope.endpoint = null;
    $scope.fields = {
        assetPath: ""
    };

    $scope.setEndpoint = function (endpoint) {
        $scope.endpoint = endpoint;
    }

    $scope.slots = [];
    for (var i = 0; i < 20; i++) {
        $scope.slots.push({
            index: i,
            key: walletSettings.getAssetKey(i),
            address: walletSettings.getAssetKey(i).privateKey.toAddress().toString(),
        });
    }

    $scope.displayForm = function () {
        
        $scope.endpoint.getAssetDefinition($scope.fields.assetPath).then(function (result) {

            $scope.version = result.version;

            $scope.fields.assetName = result.name;
            $scope.fields.assetTicker = result.nameShort;
            $scope.fields.assetImage = result.iconUrl;
            $scope.fields.quantityInvalid = true;

            $scope.asset = new AssetData($scope.endpoint, $scope.fields.assetPath);
            return $scope.asset.fetchAssetDefinition();
        })
        .then(function () {
            
            $scope.mode = "show-form";
        });
    }

    $scope.editAsset = function () {

        var key = encodingService.encodeString($scope.fields.assetPath, encodingService.usage.ASSET_DEFINITION);

        var value = JSON.stringify({
            name: $scope.fields.assetName,
            name_short: $scope.fields.assetTicker,
            icon_url: $scope.fields.assetImage
        });

        var constructedTransaction = new protobufBuilder.Mutation({
            "namespace": encodingService.encodeNamespace($scope.endpoint.rootUrl),
            "records": [
                {
                    "key": key,
                    "value": encodingService.encodeString(value),
                    "version": $scope.version
                }
            ],
            "metadata": ByteBuffer.fromHex("")
        });

        apiService.postTransaction($scope.endpoint, constructedTransaction, findKey($scope.fields.assetPath)).then(function () {
            $location.path("/");
        });
    };

    $scope.issueAsset = function () {
        var issueAmount = Long.fromString($scope.fields.quantity);
        
        $q.all([
            apiService.getAccount($scope.endpoint, $scope.fields.assetPath, $scope.fields.assetPath),
            apiService.getAccount($scope.endpoint, walletSettings.rootAccount, $scope.fields.assetPath)
        ]).then(function (array) {
            var valueFrom = array[0];
            var valueTo = array[1];

            var constructedTransaction = new protobufBuilder.Mutation({
                "namespace": encodingService.encodeNamespace($scope.endpoint.rootUrl),
                "records": [
                    {
                        "key": valueFrom.key,
                        "value": encodingService.encodeInt64(valueFrom["balance"].subtract(issueAmount)),
                        "version": valueFrom.version
                    },
                    {
                        "key": valueTo.key,
                        "value": encodingService.encodeInt64(valueTo["balance"].add(issueAmount)),
                        "version": valueTo.version
                    }
                ],
                "metadata": ByteBuffer.fromHex("")
            });

            apiService.postTransaction($scope.endpoint, constructedTransaction, findKey($scope.fields.assetPath)).then(function () {
                $location.path("/");
            });
        });
    };

    $scope.changeAmount = function () {
        $scope.fields.quantityInvalid = !validator.isNumber($scope.fields.quantity);
    };

    var findKey = function (assetPath) {
        for (var i = 0; i < 20; i++) {
            if ("/p2pkh/" + walletSettings.getAssetKey(i).privateKey.toAddress().toString() == assetPath)
                return walletSettings.getAssetKey(i);
        }

        return walletSettings.derivedKey;
    };
});