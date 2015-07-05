var module = angular.module('OpenChainWallet.Services', []);

module.factory('openChainApiService', function ($http) {
    var apiService = { };

    apiService.getTransactionStream = function (from) {
        return $http({
            method: 'GET',
            url: 'http://localhost:5000/transactionstream?from='
        });
    }

    return apiService;
});