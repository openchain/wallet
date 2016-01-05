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

// ***** TransactionController *****
// *********************************

module.controller("TransactionInfoController", function ($scope, $rootScope, $routeParams, $route, $q, controllerService, endpointManager) {

    if (!controllerService.checkState())
        return;

    $rootScope.selectedTab = "home";

    var mutationHash = $routeParams.hash;
    var transactions = [];
    $scope.transactions = transactions;
    $scope.endpoints = endpointManager.endpoints;

    $scope.setEndpoint = function (endpoint) {
        $scope.selectedRootUrl = endpoint.rootUrl;
    }

    for (var key in endpointManager.endpoints) {
        $scope.setEndpoint(endpointManager.endpoints[key]);
        break;
    }

    function loadEndpoint(key) {
        var endpoint = endpointManager.endpoints[key];
        
        endpoint.apiService.getTransaction(mutationHash).then(function (result) {
            if (result == null) {
                transactions.push({ endpoint: endpoint, success: false });
            }
            else {
                var parsedTransaction = {
                    success: true,
                    mutationHash: result.mutationHash.toHex(),
                    transactionHash: result.transactionHash.toHex(),
                    namespace: result.mutation.namespace.toHex(),
                    memo: getMemo(result.mutation.metadata),
                    acc_records: [],
                    data_records: [],
                    endpoint: endpoint,
                    date: moment(result.transaction.timestamp.toString(), "X").format("MMMM Do YYYY, hh:mm:ss")
                };

                $q.all(result.mutation.records.map(function (record) {
                    var key = RecordKey.parse(record.key);
                    if (key.recordType == "ACC") {
                        return endpoint.apiService.getAccountRecord(key.path.toString(), key.name, record.version).then(function (previousRecord) {
                            var newValue = record.value == null ? null : encoding.decodeInt64(record.value.data);
                            parsedTransaction.acc_records.push({
                                key: key,
                                valueDelta: newValue == null ? null : newValue.subtract(previousRecord.balance),
                                value: newValue
                            });
                        });
                    } else if (key.recordType == "DATA") {
                        parsedTransaction.data_records.push({
                            key: key,
                            value: record.value == null ? null : encoding.decodeString(record.value.data)
                        });
                    }
                })).then(function (result) {
                    transactions.push(parsedTransaction);
                    $scope.setEndpoint(endpoint);
                });
            }

        });
    }

    function getMemo(metadata) {
        try {
            var decodedMetadata = JSON.parse(encoding.decodeString(metadata));
            return decodedMetadata.memo;
        }
        catch (e) {
            return null;
        }
    }

    for (var key in endpointManager.endpoints) {
        loadEndpoint(key);
    }
});
