var elasticCentredCollision = require('../elastic_centred_collision')
var assert = require('assert')

describe('elasticCollision', function(){
  var theObject

  beforeEach(function(){
  })

  it('test 1', function(){
    // Setup masses (make equal for simple tests)
    var m1 = 1
    var m2 = 1
    // Setup velocities
    var u1 = 1; var u2 = 0
    var v1 = 0; var v2 = 1
    // Setup collision angle from M1 to M2 (centre of masses)
    var angleM1M2 = 45
    // Setup expected results
    var expectedU1 = -10; var expectedU2 = -10
    var expectedV1 = -10; var expectedV2 = -10
    // Do calculation and check results
    var expectedArray = [expectedU1, expectedV1, expectedU2, expectedV2]
    var resultArray = elasticCentredCollision(angleM1M2, m1, u1, v1, m2, u2, v2)    // Take a result!
    assert.deepStrictEqual(expectedArray, resultArray)
  })
})
