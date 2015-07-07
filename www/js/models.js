var module = angular.module("OpenChainWallet.Models", []);

module.value("walletSettings", {
    hd_key: null,
    derived_key: null,
    address: null,
    initialized: false
});

//module.value("bitcore", require("bitcore"));

//module.value("Mnemonic", require("bitcore-mnemonic"));
