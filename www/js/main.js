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

var app =
    angular.module('OpenchainWallet', [
        "ngRoute",
        "OpenchainWallet.Models",
        "OpenchainWallet.Controllers",
        "OpenchainWallet.Services",
        "treeControl"
    ])
    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider
            .when("/", {
                templateUrl: "views/home.html",
                controller: "HomeController"
            })
            .when("/submit", {
                templateUrl: "views/submit.html",
                controller: "SubmitController"
            })
            .when("/signin", {
                templateUrl: "views/signin.html",
                controller: "SignInController"
            })
            .when("/manageassets", {
                templateUrl: "views/manageassets.html",
                controller: "ManageAssetsController"
            })
            .when("/addendpoint", {
                templateUrl: "views/addendpoint.html",
                controller: "AddEndpointController"
            })
            .when("/admin", {
                templateUrl: "views/admin.html",
                controller: "AdminController"
            })
            .when("/transaction/:hash", {
                templateUrl: "views/transaction.html",
                controller: "TransactionInfoController"
            })
            .otherwise({
                redirectTo: '/'
            });
    }])
    .directive("assetItem", function () {
        return {
            restrict: 'A',
            templateUrl: 'views/directives/assetitem.html',
            replace: false
        };
    })
    .run(function ($rootScope, $window) {
        $rootScope.logOut = function () { $window.location.reload(); };
    });

angular.module("OpenchainWallet.Controllers", []);