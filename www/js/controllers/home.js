var module = angular.module("OpenChainWallet.Controllers");
var ByteBuffer = dcodeIO.ByteBuffer;
var Long = dcodeIO.Long;
var bitcore = require("bitcore");
var Mnemonic = require("bitcore-mnemonic");

// ***** HomeController *****
// **************************

module.controller("HomeController", function ($scope, $rootScope, $location, $route, $q, apiService, walletSettings, endpointManager, TransactionBuilder, encodingService, validator, AssetData) {

    if (!walletSettings.initialized) {
        $location.path("/signin");
        return;
    }

    $rootScope.selectedTab = "home";

    $scope.rootAccount = walletSettings.rootAccount.toString();
    $scope.endpoints = endpointManager.endpoints;
    $scope.display = "home";

    // Load all assets in the account
    var balance = [];

    function loadEndpoint(key) {
        var endpoint = endpointManager.endpoints[key];
        var dataModel = {
            endpoint: endpoint,
            state: "loading",
            assets: []
        };
        balance.push(dataModel);
        apiService.getAccountAssets(endpoint, walletSettings.rootAccount).then(function (result) {
            for (var itemKey in result) {
                var assetData = new AssetData(endpoint, result[itemKey].asset);
                assetData.setAccountBalance(result[itemKey]);
                dataModel.assets.push(assetData);
            }

            dataModel.state = "loaded";
        }, function () {
            dataModel.state = "error";
        }).then(function () {
            return $q.all(dataModel.assets.map(function (asset) {
                return asset.fetchAssetDefinition();
            }));
        });
    }

    for (var key in endpointManager.endpoints) {
        loadEndpoint(key);
    }

    $scope.balance = balance;

    // Handle click on the asset item
    $scope.sendAsset = function (asset) {
        $scope.sendingAsset = asset;
        $scope.display = "send";
        $scope.asset = asset;
        $scope.sendStatus = "send-active";
    };

    // Handle sending the asset
    $scope.confirmSend = function (sendTo, sendAmountText) {
        var sendAmount = Long.fromString(sendAmountText);
        var endpoint = $scope.asset.endpoint;
        var asset = $scope.asset.currentRecord;

        var transaction = new TransactionBuilder(endpoint);
        transaction.addAccountRecord(asset, sendAmount.negate());
        transaction.fetchAndAddAccountRecord(sendTo, asset.asset, sendAmount).then(function () {
            return transaction.uiSubmit(walletSettings.derivedKey);
        });
    };

    $scope.validateAmount = function (amount, control) {
        control.$setValidity("invalidNumber", validator.isNumber(amount));
    };

    $scope.cancelSend = function () {
        $route.reload();
    }
});
