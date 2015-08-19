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
    $scope.display = "tree-view";
    $scope.child = { refreshTree: function () { } };

    for (var key in $scope.endpoints) {
        $scope.endpoint = $scope.endpoints[key];
        break;
    }

    $scope.setEndpoint = function (endpoint) {
        $scope.endpoint = endpoint;
        if ($scope.display == "tree-view") {
            $scope.child.refreshTree();
        }
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
        
        var transaction = new TransactionBuilder(endpoint);
        $q.all($scope.mutations.map(function (mutation) {
            return transaction.fetchAndAddAccountRecord(mutation.account, mutation.asset, Long.fromString(mutation.amount));
        }))
        .then(function(array) {
            return transaction.uiSubmit(walletSettings.derivedKey);
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
        apiService.getData($scope.endpoint, "/aka/" + $scope.fields.alias + "/", "goto").then(function (result) {
            if (result.data != null) {
                $scope.fields.path = result.data;
            }
            else {
                $scope.fields.path = "";
            }
        });
    };

    $scope.submit = function () {
        var endpoint = $scope.endpoint;

        apiService.getData(endpoint, "/aka/" + $scope.fields.alias + "/", "goto").then(function (result) {

            var transaction = new TransactionBuilder(endpoint);
            transaction.addRecord(result.key, encodingService.encodeString($scope.fields.path), result.version);

            return transaction.uiSubmit(walletSettings.derivedKey);
        });
    };
});

module.controller("TreeViewController", function ($scope, apiService, encodingService) {

    var refreshTree = function () {
        apiService.getSubaccounts($scope.endpoint, "/").then(function (result) {
            var rootNode = {
                Path: "/",
                type: "",
                endpointId: $scope.endpoint.properties.id,
                children: []
            };

            var treeData = [rootNode];

            function addToTree(node, account, path) {
                if (path.length == 0) {
                    var child = {
                        Path: "[" + account.recordKey.recordType + "] " + account.recordKey.name,
                        key: account.recordKey.toString(),
                        endpointId: $scope.endpoint.properties.id,
                        record: account
                    };

                    if (account.recordKey.recordType == "ACC") {
                        child.asset = account.recordKey.name;
                        child.amount = encodingService.decodeInt64(account.value).toString();
                    }
                    else if (account.recordKey.recordType == "DATA") {
                        child.data = encodingService.decodeString(account.value);
                    }

                    node.children.push(child);
                }
                else {
                    var part = path[0];
                    for (var index = 0; index < node.children.length; index++) {
                        if (node.children[index].Path == part) {
                            addToTree(node.children[index], account, path.slice(1, path.length));
                            return;
                        }
                    }

                    var child = {
                        Path: part,
                        fullPath: account.recordKey.path.toString(),
                        endpointId: $scope.endpoint.properties.id,
                        children: []
                    };

                    node.children.push(child);

                    addToTree(child, account, path.slice(1, path.length));
                }
            };

            for (var i in result) {
                addToTree(rootNode, result[i], result[i].recordKey.path.parts);
            }

            $scope.treeData = treeData;
            $scope.expandedNodes = [rootNode];
        });
    };

    $scope.child.refreshTree = refreshTree;

    $scope.treeData = [];
    $scope.treeOptions = {
        dirSelectable: false,
        allowDeselect: false,
        injectClasses: {
            label: "tree-label"
        }
    };

    $scope.selectNode = function (node, selected) {
        $scope.selectedNode = node;
    };

    refreshTree();
});