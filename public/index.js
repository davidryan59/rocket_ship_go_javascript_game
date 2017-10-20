var aGameContinues = function(state) {

  var coordsGameToCanvas = function(gameCoordArray, canvasCoordArray) {
    // Use gameCoordArray and current game state
    // to recalculate and overwrite the viewCoords
    // Want the two arrays to be the same size
    // which is an array of size N, of arrays of size 2

    var viewMidX = state.view.pos.x
    var viewMidY = state.view.pos.y
    var viewZoom = state.view.zoom

    var canvasMidX = state.canvas.centre.x
    var canvasMidY = state.canvas.centre.y

    var gameCoord = [0, 0]
    var gameX = 0
    var gameY = 0
    var canvasX = 0
    var canvasY = 0
    var canvasCoord = [0, 0]
    for (var i=0; i < gameCoordArray.length; i++) {
      gameCoord = gameCoordArray[i]
      gameX = gameCoord[0]
      gameY = gameCoord[1]
      canvasX = canvasMidX + viewZoom*(gameX-viewMidX)    // Game coords start in bottom left, but
      canvasY = canvasMidY - viewZoom*(gameY-viewMidY)    // Canvas coords start in top left
      canvasCoord = [canvasX, canvasY]
      canvasCoordArray[i] = canvasCoord
    }
  }

  var recalculatePoints = function() {
    coordsGameToCanvas(state.points.game, state.points.canvas)
  }

  var doTiming = function() {
    var prevLoop = state.timing.thisLoop
    var thisLoop = Date.now()    // in milliseconds!
    var msPerLoop = thisLoop-prevLoop
    state.timing.prevLoop = prevLoop
    state.timing.thisLoop = thisLoop
    state.timing.msPerLoop = msPerLoop
  }

  var updateViewCoords = function() {
    var prevX = state.view.pos.x    // Pixels
    var prevY = state.view.pos.y    // Pixels
    var prevU = state.view.vel.u    // Pixels per second
    var prevV = state.view.vel.v    // Pixels per second
    var grav = state.gravity        // Pixels per second per second
    var dT = state.timing.msPerLoop / 1000    // in seconds
    state.view.pos.x = prevX + prevU * dT
    state.view.pos.y = prevY + prevV * dT
    // state.view.vel.u = prevU + 0 * dT   // Currently does nothing
    state.view.vel.v = prevV + grav * dT
  }

  var drawCanvas = function(){
    var canvasLeft = state.canvas.bounds.left
    var canvasRight = state.canvas.bounds.right
    var canvasUp = state.canvas.bounds.up
    var canvasDown = state.canvas.bounds.down
    var context = state.context
    context.clearRect(canvasLeft, canvasUp, canvasRight-canvasLeft, canvasDown-canvasUp)
    // Draw the stuff here!
  }

  var updateDisplay = function(){
    var msPerLoop = state.timing.msPerLoop
    var frameRateText = msPerLoop > 0 ? Math.round(1000/msPerLoop) : "(Inf)"
    var frameRateDisplay = state.timing.fpsElt
    frameRateDisplay.innerText = frameRateText
    // Anything else to display?
  }

  while (!state.gameEnded) {

    state.loopCount++
    doTiming()
    updateViewCoords()
    recalculatePoints()
    drawCanvas()
    updateDisplay()

    // ****** START Simulate some calculation time here!
    var sum = 0
    for (var i=0; i<200000000; i++) {  // This takes around 100ms
      sum += i
    }
    // ****** END

    console.log("Game continues!")
    console.log("View position is", state.view.pos.x, state.view.pos.y)
    console.log("View velocity is", state.view.vel.u, state.view.vel.v)

    // Currently ending after 10 loops
    state.loopCount > 10 ? state.gameEnded = true : null;
  }
  console.log("State is", state)
  return state
}

var aGameStarts = function(state) {
  state.gamesPlayed++
  state.gameEnded = false
  state.loopCount = 0
  console.log("Game starts!")

  // Setup variables for game
  var frameRateElt = document.querySelector("#frame-rate")
  var timing = {
    // prevDrawing: Date.now(),
    prevLoop: Date.now(),    // dummy data
    thisLoop: Date.now(),
    msPerLoop: 10,
    // minMsBetweenDrawings: 100,
    // needsRedrawing: true,
    fpsElt: frameRateElt
  }
  var canvasElt = document.querySelector("#main-canvas")
  var context = canvasElt.getContext('2d')
  context.strokeStyle = "black"
  context.lineWidth = 3
  context.fillStyle = "white"
  var gamePoints = [[100, 100], [200, 300], [400, 50]]
  var canvasPoints = gamePoints.slice()  // Copy of array, to overwrite
  var points = {game: gamePoints, canvas: canvasPoints}
  var view = {pos: {x: 180, y: 120}, vel: {u: 2, v: 10}, zoom: 1}
  // x, y are positions in pixels
  // u, v are velocities in pixels per second
  var gravity = -10    // (Pixels per second per second!)

  // Setup canvas variable
  var boundLeft = 0
  var boundRight = canvasElt.width
  var boundUp = 0
  var boundDown = canvasElt.height
  var canvasBounds = {left: boundLeft, right: boundRight, up: boundUp, down: boundDown}
  var canvasCentre = {x: (boundLeft+boundRight)/2, y: (boundUp+boundDown)/2}
  var canvas = {elt: canvasElt, bounds: canvasBounds, centre: canvasCentre}

  // Store them all in the state
  state.timing = timing
  state.canvas = canvas
  state.context = context
  state.points = points
  state.view = view
  state.gravity = gravity

  return state
}

var aGameEnds = function(state) {
  // Ideally, would ask the user if they want to play again
  // At the moment, play twice
  state.gamesPlayed > 1 ? state.playAnotherGame = false : null
  console.log("Game ends!")
  return state
}

var playGame = function() {
  console.log("Hello!")
  var state = {
    gamesPlayed: 0,
    playAnotherGame: true,
  }
  while (state.playAnotherGame) {
    state = aGameStarts(state)
    state = aGameContinues(state)
    state = aGameEnds(state)
  }
}

var exitGame = function(){
  console.log("Goodbye!")
}

var app = function() {
  playGame()
  exitGame()
}

window.addEventListener('load', app)
