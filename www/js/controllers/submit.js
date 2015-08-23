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

// ***** SubmitController *****
// ****************************

module.controller("SubmitController", function ($scope, $rootScope, $location, controllerService) {

    if (!controllerService.checkState())
        return;

    if (!$rootScope.submitTransaction) {
        $location.path("/");
        return;
    }

    var transaction = $rootScope.submitTransaction;
    $rootScope.submitTransaction = null;
    $scope.display = "pending";

    transaction.transaction.submit(transaction.key)
        .then(function (data, status, headers, config) {
            $scope.display = "success";
            $scope.transactionHash = data.data["ledger_record"];
        }, function (data, status, headers, config) {
            if (status == 400) {
                $scope.display = "error";
            } else {
                $scope.display = "error";
            }
        });

    $scope.cancelSend = function () {
        $location.path("/");
        return;
    }
});
