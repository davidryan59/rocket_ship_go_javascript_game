// Code to monitor keyboard presses
window.addEventListener('keydown', function(event){
  var code = event.code
  console.log(code)
  switch(code){
    case "KeyXXX":
      // doSomething
      break
  }
  // do some Updates
})
// Note that this will respond wrong if key held down.
// Do it differently!
