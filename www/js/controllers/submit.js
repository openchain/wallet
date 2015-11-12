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

// ***** SubmitController *****
// ****************************

module.controller("SubmitController", function ($scope, $rootScope, $location, controllerService) {

    if (!controllerService.checkState())
        return;

    var transaction = $rootScope.submitTransaction;
    $rootScope.submitTransaction = null;

    if (transaction == null) {
        $scope.display = "error";
        $scope.error = "ConnectionError";
    }
    else {
        $scope.display = "pending";

        transaction.transaction.submit(transaction.key)
            .then(function (response) {
                $scope.display = "success";
                $scope.transactionHash = response.data["transaction_hash"];
                $scope.mutationHash = response.data["mutation_hash"];
            }, function (response) {
                $scope.display = "error";

                if (response.status == 400) {
                    $scope.error = response.data["error_code"];
                } else {
                    $scope.error = "Unknown";
                }
            });
    }

    $scope.cancelSend = function () {
        $location.path("/");
        return;
    }
});
