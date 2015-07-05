var module = angular.module('OpenChainWallet.Controllers', []);

module.controller('HomeController', function ($scope, openChainApiService) {
    $scope.transactions = [{ "raw": "abcd" }, { "raw": "efhd" }];

    openChainApiService.getTransactionStream().success(function (response) {
        $scope.transactions = response;
    });
});

module.controller('SignInController', function ($scope) {

});