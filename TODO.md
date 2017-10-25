# TO DO list

- Versioning - start at v0.0.0
- This might be my final project
- Use Week 13 Day 1 Homework folder structure
- Use Webpack to bundle, so that 'require' works when served
- Need Express?
- Add a licence file
- Read this: https://developer.mozilla.org/en-US/docs/Games/Publishing_games/Game_monetization

- Make stars move in parallax.

- Fix the collision angle in the simple elastic model which transfers no friction or angular momentum. Its a reflection in the angle already provided. Probably a sin2theta. A simple matrix transformation of (u, v) should do it.

- Method to find radius at specific angle, a simple search.
- Method to find collision point(s) and contact angle(s) by going through extreme points in each mass, within 180 degrees.

- Want each mass to rotate around its centre of mass. This can be calculated by working out game coords, splitting into weighted triangles, calculating centre of mass (offset), turning back into angleradii. Note that the angles won't be evenly spread any more.
- Mark centres of rocks with stars. See the stars moved when centre of mass goes to actual centre of mass!

- Make a method to find radius at a specific angle. Should use a quick search.
- Make a method to find the collision point(s) and contact angle(s) by going through extreme points
