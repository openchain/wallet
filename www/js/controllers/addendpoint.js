var module = angular.module("OpenChainWallet.Controllers");
var ByteBuffer = dcodeIO.ByteBuffer;
var bitcore = require("bitcore");
var Mnemonic = require("bitcore-mnemonic");

// ***** AddEndpointController *****
// *********************************

module.controller("AddEndpointController", function ($scope, $location, walletSettings, apiService, endpointManager) {

    if (!walletSettings.initialized) {
        $location.path("/signin");
        return;
    }

    $scope.check = function () {
        apiService.getLedgerInfo($scope.endpointUrl).then(function (result) {
            $scope.endpoint = result.data;
        }, function () {
            $scope.addEndpointForm.endpointUrl.$setValidity("connectionError", false);
        });
    };

    $scope.changeUrl = function () {
        $scope.addEndpointForm.endpointUrl.$setValidity("connectionError", true);
    };

    $scope.confirm = function () {
        endpointManager.addEndpoint($scope.endpoint);
        $location.path("/");
    };
});
