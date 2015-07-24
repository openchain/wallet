var module = angular.module("OpenChainWallet.Controllers");
var ByteBuffer = dcodeIO.ByteBuffer;
var Long = dcodeIO.Long;

module.controller("AdminController", function ($scope, $rootScope, $location, walletSettings, apiService, encodingService, endpointManager) {

    if (!walletSettings.initialized) {
        $location.path("/signin");
        return;
    }

    $rootScope.selectedTab = "advanced";

    $scope.endpoints = endpointManager.endpoints;
    $scope.display = "advanced-transaction";

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

module.controller("TransactionController", function ($scope, $location, $q, TransactionBuilder, apiService, encodingService, walletSettings, validator) {

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
            var transaction = new TransactionBuilder(endpoint);
            
            for (var i = 0; i < $scope.mutations.length; i++) {
                transaction.addAccountRecord(array[i], Long.fromString($scope.mutations[i].amount));
            }

            return transaction.submit(walletSettings.derivedKey);
        });

    };

    $scope.addMutation();

});

module.controller("AliasEditorController", function ($scope, $location, $q, TransactionBuilder, apiService, encodingService, walletSettings) {
    $scope.fields = {
        alias: "",
        path: ""
    };

    $scope.loadAlias = function () {
        apiService.getAlias($scope.endpoint, $scope.fields.alias).then(function (result) {
            if (result.path != null) {
                $scope.fields.path = result.path;
            }
            else {
                $scope.fields.path = "";
            }
        });
    };

    $scope.submit = function () {
        var endpoint = $scope.endpoint;

        apiService.getAlias(endpoint, $scope.fields.alias).then(function (result) {

            var transaction = new TransactionBuilder(endpoint);
            transaction.addRecord(result.key, encodingService.encodeString($scope.fields.path), result.version);

            return transaction.submit(walletSettings.derivedKey);
        });
    };
});