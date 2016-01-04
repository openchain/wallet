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

// ***** AddEndpointController *****
// *********************************

module.controller("AddEndpointController", function ($scope, $rootScope, $location, Endpoint, settings, controllerService, endpointManager) {

    if (!controllerService.checkState())
        return;

    $rootScope.selectedTab = "none";
    $scope.hasNoEndpoint = Object.keys(endpointManager.endpoints).length === 0;
    $scope.httpRedirect = settings.httpRedirect;

    $scope.check = function () {
        if ($scope.endpointUrl.slice(-1) != "/")
            var endpointUrl = $scope.endpointUrl + "/";
        else
            var endpointUrl = $scope.endpointUrl;

        var endpoint = new Endpoint(endpointUrl);

        if (location.protocol === "https:" && endpointUrl.slice(0, 5) === "http:") {
            $scope.addEndpointForm.endpointUrl.$setValidity("connectionError", false);
            $scope.endpointError = "nonsecure";
            return;
        }

        endpoint.loadEndpointInfo().then(function (result) {
            $scope.endpoint = result;

            if (!result.properties.validatorUrl) {
                $scope.noMetadata = true;
            }
            else if (result.properties.validatorUrl != result.rootUrl) {
                $scope.rootUrlWarning = true;
            }
            else {
                $scope.success = true;
            }
        }).then(function () { }, function () {
            $scope.addEndpointForm.endpointUrl.$setValidity("connectionError", false);
            $scope.endpointError = "unreachable";
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
