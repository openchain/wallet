var module = angular.module("OpenChainWallet.Controllers");

// ***** SubmitController *****
// ****************************

module.controller("SubmitController", function ($scope, $rootScope, $location, walletSettings) {

    if (!walletSettings.initialized) {
        $location.path("/signin");
        return;
    }

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
