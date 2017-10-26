var elasticCentredCollision = require('../elastic_centred_collision')
var assert = require('assert')

var roundArray = function(array, decimalPlaces) {
  var preMult = 10**decimalPlaces
  var postMult = 10**(-decimalPlaces)
  for (var i in array) {
    array[i] = Math.round(array[i]*preMult)*postMult
  }
  return array
}

describe('elasticCollision', function(){
  var theObject

  beforeEach(function(){
  })

  it('equal mass balls, opposite u, 15 degrees', function(){
    // Setup masses (make equal for simple tests)
    var m1 = 1
    var m2 = 1
    // Setup velocities
    var u1 = 1; var u2 = -1
    var v1 = 0; var v2 = 0
    // Setup collision angle from M1 to M2 (centre of masses)
    var angleM1M2 = 15
    // Setup expected results
    var expectedU1 = 0; var expectedU2 = 0
    var expectedV1 = 0; var expectedV2 = 0
    // Do calculation and check results
    var expectedArray = [expectedU1, expectedV1, expectedU2, expectedV2]
    var resultArray = elasticCentredCollision(angleM1M2, m1, u1, v1, m2, u2, v2)    // Take a result!
    assert.deepStrictEqual(expectedArray, roundArray(resultArray, 4))
  })

  it('equal mass balls, opposite u, 45 degrees', function(){
    // Setup masses (make equal for simple tests)
    var m1 = 1
    var m2 = 1
    // Setup velocities
    var u1 = 1; var u2 = -1
    var v1 = 0; var v2 = 0
    // Setup collision angle from M1 to M2 (centre of masses)
    var angleM1M2 = 45
    // Setup expected results
    var expectedU1 = 0; var expectedU2 = 0
    var expectedV1 = -1; var expectedV2 = 1
    // Do calculation and check results
    var expectedArray = [expectedU1, expectedV1, expectedU2, expectedV2]
    var resultArray = elasticCentredCollision(angleM1M2, m1, u1, v1, m2, u2, v2)    // Take a result!
    assert.deepStrictEqual(expectedArray, roundArray(resultArray, 4))
  })

  it('equal mass balls, opposite u, 90 degrees', function(){
    // Setup masses (make equal for simple tests)
    var m1 = 1
    var m2 = 1
    // Setup velocities
    var u1 = 1; var u2 = -1
    var v1 = 0; var v2 = 0
    // Setup collision angle from M1 to M2 (centre of masses)
    var angleM1M2 = 90
    // Setup expected results
    var expectedU1 = 0; var expectedU2 = 0
    var expectedV1 = 0; var expectedV2 = 0
    // Do calculation and check results
    var expectedArray = [expectedU1, expectedV1, expectedU2, expectedV2]
    var resultArray = elasticCentredCollision(angleM1M2, m1, u1, v1, m2, u2, v2)    // Take a result!
    assert.deepStrictEqual(expectedArray, roundArray(resultArray, 4))
  })

  it('equal mass balls, opposite u, 120 degrees', function(){
    // Setup masses (make equal for simple tests)
    var m1 = 1
    var m2 = 1
    // Setup velocities
    var u1 = 1; var u2 = -1
    var v1 = 0; var v2 = 0
    // Setup collision angle from M1 to M2 (centre of masses)
    var angleM1M2 = 120
    // Setup expected results
    var expectedU1 = 0; var expectedU2 = 0
    var expectedV1 = 0; var expectedV2 = 0
    // Do calculation and check results
    var expectedArray = [expectedU1, expectedV1, expectedU2, expectedV2]
    var resultArray = elasticCentredCollision(angleM1M2, m1, u1, v1, m2, u2, v2)    // Take a result!
    assert.deepStrictEqual(expectedArray, roundArray(resultArray, 3))
  })

  it('equal mass balls, opposite u, 150 degrees', function(){
    // Setup masses (make equal for simple tests)
    var m1 = 1
    var m2 = 1
    // Setup velocities
    var u1 = 1; var u2 = -1
    var v1 = 0; var v2 = 0
    // Setup collision angle from M1 to M2 (centre of masses)
    var angleM1M2 = 150
    // Setup expected results
    var expectedU1 = 0; var expectedU2 = 0
    var expectedV1 = 0; var expectedV2 = 0
    // Do calculation and check results
    var expectedArray = [expectedU1, expectedV1, expectedU2, expectedV2]
    var resultArray = elasticCentredCollision(angleM1M2, m1, u1, v1, m2, u2, v2)    // Take a result!
    assert.deepStrictEqual(expectedArray, roundArray(resultArray, 3))
  })

})
