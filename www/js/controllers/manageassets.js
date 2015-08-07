var module = angular.module("OpenChainWallet.Controllers");
var ByteBuffer = dcodeIO.ByteBuffer;
var Long = dcodeIO.Long;
var bitcore = require("bitcore");
var Mnemonic = require("bitcore-mnemonic");

// ***** ManageAssetsController *****
// **********************************

module.controller("ManageAssetsController", function ($scope, $rootScope, $location, $route, $q, apiService, walletSettings, endpointManager, TransactionBuilder, encodingService, validator, AssetData) {

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
        
        $scope.endpoint.getAssetDefinition($scope.fields.assetPath, true).then(function (result) {

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

        var key = encodingService.encodeData($scope.fields.assetPath + "asdef/");

        var value = JSON.stringify({
            name: $scope.fields.assetName,
            name_short: $scope.fields.assetTicker,
            icon_url: $scope.fields.assetImage
        });

        new TransactionBuilder($scope.endpoint)
            .addRecord(key, encodingService.encodeString(value), $scope.version)
            .submit(findKey($scope.fields.assetPath)).then(function () {
                $location.path("/");
            });
    };

    $scope.issueAsset = function () {
        var issueAmount = Long.fromString($scope.fields.quantity);
        var transaction = new TransactionBuilder($scope.endpoint);

        $q.all([
            transaction.fetchAndAddAccountRecord($scope.fields.assetPath, $scope.fields.assetPath, issueAmount.negate()),
            transaction.fetchAndAddAccountRecord(walletSettings.rootAccount, $scope.fields.assetPath, issueAmount),
        ]).then(function (array) {
            transaction.submit(findKey($scope.fields.assetPath)).then(function () {
                $location.path("/");
            });
        });
    };

    $scope.changeAmount = function () {
        $scope.fields.quantityInvalid = !validator.isNumber($scope.fields.quantity);
    };

    var findKey = function (assetPath) {
        for (var i = 0; i < 20; i++) {
            if ("/asset/p2pkh/" + walletSettings.getAssetKey(i).privateKey.toAddress().toString() + "/" == assetPath)
                return walletSettings.getAssetKey(i);
        }

        return walletSettings.derivedKey;
    };
});