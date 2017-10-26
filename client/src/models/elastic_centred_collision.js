var elasticCentredCollision = function(angleM1M2, m1, u1, v1, m2, u2, v2, damping) {
  // The collision angle is between Up and Mass1->Mass2, in a clockwise direction

  // There are two masses, mass 1 and mass 2
  // Each have a mass and velocity vector, m and (u, v)
  // giving 6 inputs in total
  // The output will be a new (u, v) vector for each

  // Find coordinates in which m1*u1 + m2*u2 = 0 and m1*v1 + m2*v2 = 0
  // this is the centre of momentum frame

  var degreesToRadians = Math.PI / 180
  var massSum = m1+m2

  var uConst = (m1*u1 + m2*u2) / massSum
  var vConst = (m1*v1 + m2*v2) / massSum

  // New (u, v) coordinates (A) in centre of momentum frame
  var u1i = u1 - uConst
  var v1i = v1 - vConst
  var u2i = u2 - uConst
  var v2i = v2 - vConst

  // When an elastic collision occurs, it can be broken into 3 parts:
  // 1) Rotate (u,v) by -angle
  // 2) Reflect in y-axis
  // 3) Rotate by angle
  // These combine to a cos(2*angle) sin(2*angle) based matrix.

  var cos = Math.cos(degreesToRadians * (2 * angleM1M2))
  var sin = Math.sin(degreesToRadians * (2 * angleM1M2))
  // These are used for Mass 2 (angle is M2 relative from M1)
  // Do X -> -X for each of these, for mass 1

  // Mass 2 new coords (B)
  var u2ii = 0 + cos * u2i - sin * v2i
  var v2ii = 0 - sin * u2i - cos * v2i
  // Mass 1 new coords (B)
  var u1ii = 0 + cos * u1i - sin * v1i
  var v1ii = 0 - sin * u1i - cos * v1i
  // Final coords need to add back in uConst, vConst
  var u1iii = damping * u1ii + uConst
  var v1iii = damping * v1ii + vConst
  var u2iii = damping * u2ii + uConst
  var v2iii = damping * v2ii + vConst

  // These are ready to be returned
  return [u1iii, v1iii, u2iii, v2iii]
}

module.exports = elasticCentredCollision
