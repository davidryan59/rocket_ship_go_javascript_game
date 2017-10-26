var elasticCentredCollision = function(angle, m1, u1, v1, m2, u2, v2) {
  // The collision angle is between Up and Mass1->Mass2, in a clockwise direction

  // There are two masses, mass 1 and mass 2
  // Each have a mass and velocity vector, m and (u, v)
  // giving 6 inputs in total
  // The output will be a new (u, v) vector for each

  // Find coordinates in which m1*u1 + m2*u2 = 0 and m1*v1 + m2*v2 = 0
  // this is the centre of momentum frame

  var degresToRadians = Math.PI / 180
  var massSum = m1+m2

  var uConst = (m1*u1 + m2*u2) / massSum
  var vConst = (m1*v1 + m2*v2) / massSum

  // New (u, v) coordinates (A) in centre of momentum frame
  var uA1 = u1 - uConst
  var vA1 = v1 - vConst
  var uA2 = u2 - uConst
  var vA2 = v2 - vConst

  // When an elastic collision occurs, it can be broken into 3 parts:
  // 1) Rotate (u,v) by -angle
  // 2) Reflect in y-axis
  // 3) Rotate by angle
  // These combine to a cos(2*angle) sin(2*angle) based matrix.

  var cos = Math.cos(degreesToRadians * (2 * angle))
  var sin = Math.sin(degreesToRadians * (2 * angle))
  // These are used for Mass 2 (angle is M2 relative from M1)
  // Do X -> -X for each of these, for mass 1

  // Mass 2 new coords (B)
  var uB2 = cos * uA2 - sin * vA2
  var vB2 = -sin * uA2 - cos * vA2
  // Mass 1 new coords (B)
  var uB1 = -cos * uA1 + sin * vA1
  var vB1 = sin * uA1 + cos * vA1

  // Final coords need to add back in uConst, vConst
  var uC1 = uB1 + uConst
  var vC1 = vB1 + vConst
  var uC2 = uB2 + uConst
  var vC2 = vB2 + vConst

  // These are ready to be returned
  return [uC1, vC1, uC2, vC2]
}

module.exports = elasticCentredCollision
