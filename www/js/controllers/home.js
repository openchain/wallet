// Copyright 2015 Coinprism, Inc.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var module = angular.module("OpenChainWallet.Controllers");
var ByteBuffer = dcodeIO.ByteBuffer;
var Long = dcodeIO.Long;
var bitcore = require("bitcore");
var Mnemonic = require("bitcore-mnemonic");

// ***** HomeController *****
// **************************

module.controller("HomeController", function ($scope, $rootScope, controllerService, $route, $q, apiService, walletSettings, endpointManager, TransactionBuilder, encodingService, validator, AssetData) {

    if (!controllerService.checkState())
        return;

    $rootScope.selectedTab = "home";

    $scope.rootAccount = walletSettings.rootAccount.toString();
    $scope.rawAddress = walletSettings.derivedKey.privateKey.toAddress().toString();
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
