var app =
    angular.module('OpenChainWallet', [
        "ngRoute",
        "OpenChainWallet.Controllers",
        "OpenChainWallet.Services",
    ]).
    config(['$routeProvider', function ($routeProvider) {
        $routeProvider.
            when("/", { templateUrl: "views/home.html", controller: "HomeController" }).
            when("/signin", { templateUrl: "views/signin.html", controller: "SignInController" }).
            otherwise({ redirectTo: '/' });
    }]);