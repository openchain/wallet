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

// ***** TransactionController *****
// *********************************

module.controller("TransactionInfoController", function ($scope, $rootScope, $routeParams, $route, $q, controllerService, apiService, encodingService, endpointManager, LedgerRecord) {

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
        
        apiService.getTransaction(endpoint, mutationHash).then(function (result) {
            if (result == null) {
                transactions.push({ endpoint: endpoint, success: false });
            }
            else {
                var parsedTransaction = {
                    success: true,
                    mutationHash: result.mutationHash.toHex(),
                    transactionHash: result.transactionHash.toHex(),
                    namespace: encodingService.decodeString(result.mutation.namespace),
                    acc_records: [],
                    data_records: [],
                    endpoint: endpoint,
                    date: moment(result.transaction.timestamp.toString(), "X").format("MMMM Do YYYY, hh:mm:ss")
                };

                $q.all(result.mutation.records.map(function (record) {
                    var key = LedgerRecord.parse(record.key);
                    if (key.recordType == "ACC") {
                        return apiService.getAccount(endpoint, key.path.toString(), key.name, record.version).then(function (previousRecord) {
                            var newValue = record.value == null ? null : encodingService.decodeInt64(record.value.data);
                            parsedTransaction.acc_records.push({
                                key: key,
                                valueDelta: newValue == null ? null : newValue.subtract(previousRecord.balance),
                                value: newValue
                            });
                        });
                    } else if (key.recordType == "DATA") {
                        parsedTransaction.data_records.push({
                            key: key,
                            value: record.value == null ? null : encodingService.decodeString(record.value.data)
                        });
                    }
                })).then(function (result) {
                    transactions.push(parsedTransaction);
                    $scope.setEndpoint(endpoint);
                });
            }

        });
    }

    for (var key in endpointManager.endpoints) {
        loadEndpoint(key);
    }
});
