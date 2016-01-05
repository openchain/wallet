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
var RecordKey = sdk.RecordKey;
var encoding = sdk.encoding;
var Long = sdk.Long;

module.controller("AdminController", function ($scope, $rootScope, $location, controllerService, walletSettings, endpointManager) {

    if (!controllerService.checkState())
        return;

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

module.controller("TransactionController", function ($scope, $location, $q, TransactionBuilder, walletSettings, validator) {

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
            return transaction.updateAccountRecord(mutation.account, mutation.asset, Long.fromString(mutation.amount));
        }))
        .then(function(array) {
            return transaction.uiSubmit(walletSettings.derivedKey);
        }, function () {
            return TransactionBuilder.uiError();
        });
    };

    $scope.addMutation();

});

module.controller("AliasEditorController", function ($scope, $location, $q, TransactionBuilder, walletSettings) {
    $scope.fields = {
        alias: "",
        path: ""
    };

    $scope.loadAlias = function () {
        $scope.endpoint.apiService.getDataRecord("/aka/" + $scope.fields.alias + "/", "goto").then(function (result) {
            if (result.data != null) {
                $scope.fields.path = result.data;
            }
            else {
                $scope.fields.path = "";
            }
        }, function () {
            return TransactionBuilder.uiError();
        });
    };

    $scope.submit = function () {
        var endpoint = $scope.endpoint;

        endpoint.apiService.getDataRecord("/aka/" + $scope.fields.alias + "/", "goto").then(function (result) {

            var transaction = new TransactionBuilder(endpoint);
            transaction.addRecord(result.key, encoding.encodeString($scope.fields.path), result.version);

            return transaction.uiSubmit(walletSettings.derivedKey);
        }, function () {
            return TransactionBuilder.uiError();
        });
    };
});

module.controller("DataEditorController", function ($scope, TransactionBuilder, walletSettings) {
    $scope.fields = {
        recordName: "",
        path: "",
        data: ""
    };

    $scope.loadData = function () {
        $scope.endpoint.apiService.getDataRecord($scope.fields.path, $scope.fields.recordName).then(function (result) {
            if (result.data != null) {
                $scope.fields.data = result.data;
            }
            else {
                $scope.fields.data = "";
            }
        }, function () {
            return TransactionBuilder.uiError();
        });
    };

    $scope.submit = function () {
        var endpoint = $scope.endpoint;

        $scope.endpoint.apiService.getDataRecord($scope.fields.path, $scope.fields.recordName).then(function (result) {

            var transaction = new TransactionBuilder(endpoint);
            transaction.addRecord(result.key, encoding.encodeString($scope.fields.data), result.version);

            return transaction.uiSubmit(walletSettings.derivedKey);
        }, function () {
            return TransactionBuilder.uiError();
        });
    };
});

module.controller("InfoEditorController", function ($scope, TransactionBuilder, walletSettings) {
    $scope.fields = {
        name: "",
        validatorUrl: "",
        tos: "",
        webpageUrl: ""
    };

    $scope.loadData = function () {
        $scope.endpoint.apiService.getDataRecord("/", "info").then(function (result) {
            if (result.data != null) {
                var fields = JSON.parse(result.data);
                $scope.fields = {
                    name: fields.name,
                    validatorUrl: fields.validator_url,
                    tos: fields.tos,
                    webpageUrl: fields.webpage_url
                };
            }
            else {
                $scope.fields = {
                    name: "",
                    validatorUrl: "",
                    tos: "",
                    webpageUrl: ""
                };
            }
        }, function () {
            return TransactionBuilder.uiError();
        });
    };

    $scope.submit = function () {
        var endpoint = $scope.endpoint;

        $scope.endpoint.apiService.getDataRecord("/", "info").then(function (result) {

            var transaction = new TransactionBuilder(endpoint);

            var value = JSON.stringify({
                name: $scope.fields.name,
                validator_url: $scope.fields.validatorUrl,
                tos: $scope.fields.tos,
                webpage_url: $scope.fields.webpageUrl
            });

            transaction.addRecord(result.key, encoding.encodeString(value), result.version);

            return transaction.uiSubmit(walletSettings.derivedKey);
        }, function () {
            return TransactionBuilder.uiError();
        });
    };
});

module.controller("TreeViewController", function ($scope) {

    var refreshTree = function () {
        $scope.endpoint.apiService.getSubAccounts("/").then(function (result) {
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
                        child.amount = encoding.decodeInt64(account.value).toString();
                    }
                    else if (account.recordKey.recordType == "DATA") {
                        try {
                            child.data = encoding.decodeString(account.value);
                        }
                        catch (e) {
                            child.data = "<invalid>";
                        }
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
                result[i].recordKey = RecordKey.parse(result[i].key);
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
        $scope.transactions = [];

        $scope.endpoint.apiService.getRecordMutations(node.key).then(function (result) {
            $scope.transactions = result.map(function (item) { return item.toHex(); });
        });
    };

    refreshTree();
});