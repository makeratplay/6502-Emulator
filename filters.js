

app.filter('hex', function () {
  return function(input, size) {
    switch(size)
    {
      case 16:
      {
        if ( input == null || input == undefined || input > 0xffff ){
          retVal = 'XXXX';
        }
        else{
          var retVal = (input).toString(16);
          while( retVal.length < 4){
            retVal = '0' + retVal;
          }
        }        
        break;
      }
      case 8:
      default:
      {
        if ( input == null || input == undefined || input > 0xff ){
          retVal = 'XX';
        }
        else{
          var retVal = (input).toString(16);
          if ( retVal.length == 1){
            retVal = '0' + retVal;
          }
        }        
        break;
      }      
    }
    return retVal;
  };
});

app.filter('bool', function () {
  return function(input) {
    var retVal = 'On';
    if (input == 0 ){
      retVal = 'Off';
    }
    return retVal;
  };
});

app.filter('bit', function () {
  return function(input) {
    var retVal = '1';
    if (input == 0 ){
      retVal = '0';
    }
    return retVal;
  };
});

app.directive('step', function () {
  return function (scope, element, attrs) {
      element.bind("keydown keypress", function (event) {
          if(event.which === 121) {  // F10 Key
            scope.$apply( scope.vm.step );
            event.preventDefault();
          }
      });
  };
});