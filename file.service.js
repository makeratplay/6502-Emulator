function FileService($http) {
    return {
      getBinaryFile: function (url) {
          return $http(
            {
                url: url,
                method: "GET",
                headers: {
                   'Content-type': 'application/json'
                },
              responseType: "arraybuffer"
            }
          )
          .then(function (response) {
            var arrayBuffer = response.data;
            var byteArray = new Uint8Array(arrayBuffer);
              return byteArray;
          });
      },

      getFile: function (url) {
        return $http.get(url).then( function (response) { return response.data; });
      }
    };
  }
  angular.module("App").factory("FileService", FileService);
  