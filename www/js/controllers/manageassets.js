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

var module = angular.module("OpenchainWallet.Controllers");
var sdk = require("openchain");
var encoding = sdk.encoding;
var RecordKey = sdk.RecordKey;
var LedgerPath = sdk.LedgerPath;
var Long = sdk.Long;

// ***** ManageAssetsController *****
// **********************************

module.controller("ManageAssetsController", function ($scope, $rootScope, controllerService, $route, $q, walletSettings, endpointManager, TransactionBuilder, validator, AssetData) {

    if (!controllerService.checkState())
        return;

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
        try {
            LedgerPath.parse($scope.fields.assetPath)
        }
        catch (e) {
            $scope.manageAssets.assetPath.$setValidity("invalidPath", false);
            return;
        }

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
        }, function () {
            return TransactionBuilder.uiError();
        });
    }

    $scope.editAsset = function () {

        var key = new RecordKey($scope.fields.assetPath, "DATA", "asdef").toByteBuffer();

        var value = JSON.stringify({
            name: $scope.fields.assetName,
            name_short: $scope.fields.assetTicker,
            icon_url: $scope.fields.assetImage
        });

        new TransactionBuilder($scope.endpoint)
            .addRecord(key, encoding.encodeString(value), $scope.version)
            .uiSubmit(findKey($scope.fields.assetPath));
    };

    $scope.issueAsset = function () {
        var issueAmount = Long.fromString($scope.fields.quantity);
        var transaction = new TransactionBuilder($scope.endpoint);

        $q.all([
            transaction.updateAccountRecord($scope.fields.assetPath, $scope.fields.assetPath, issueAmount.negate()),
            transaction.updateAccountRecord(walletSettings.rootAccount, $scope.fields.assetPath, issueAmount),
        ]).then(function (array) {
            return transaction.uiSubmit(findKey($scope.fields.assetPath));
        }, function () {
            return TransactionBuilder.uiError();
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