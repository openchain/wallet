var module = angular.module("OpenChainWallet.Controllers");
var ByteBuffer = dcodeIO.ByteBuffer;
var Long = dcodeIO.Long;
var bitcore = require("bitcore");
var Mnemonic = require("bitcore-mnemonic");

// ***** ManageAssetsController *****
// **********************************

module.controller("ManageAssetsController", function ($scope, $rootScope, $location, $route, $q, apiService, walletSettings, endpointManager, protobufBuilder, encodingService, validator) {

    if (!walletSettings.initialized) {
        $location.path("/signin");
        return;
    }

    $rootScope.selectedTab = "assets";
});