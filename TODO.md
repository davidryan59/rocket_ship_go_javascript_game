# TO DO list

- Make a test function to replace masses by circles. Put it on a separate key.
  (Do this while collision detection algorithm still not perfect.)

- Want a separate background order and foreground order
- E.g. background could be sorted in terms of zoomout ~ mass
- E.g. foreground could be inverse sorted by mass
- Periodically re-sort the order of calculation as the masses change!
- Or if a mass is added/removed
- Can invalidate the sort orders, to need to recalculate
- Want to draw the background in order of zoomOut,
  but foreground in order of addition!

- Periodically, want to
- - Recalculate zoomOut based on mass
- - Sort the masses based on zoomOut
- - Anything light should

Bullets

- Use Week 13 Day 1 Homework folder structure
- Use Webpack to bundle, so that 'require' works when served
- Need Express?
- Add a licence file
- Read this: https://developer.mozilla.org/en-US/docs/Games/Publishing_games/Game_monetization

- Make colour of background stroke and fill more faded towards black depending on the zoomOut!
- Make zoomOut dependent on mass of rock (since its a pseudo-3D thing)
- Make a maximum zoomOut depending on the window size etc

- Fix the collision angle in the simple elastic model which transfers no friction or angular momentum. Its a reflection in the angle already provided. Probably a sin2theta. A simple matrix transformation of (u, v) should do it.

- Method to find radius at specific angle, a simple search.
- Method to find collision point(s) and contact angle(s) by going through extreme points in each mass, within 180 degrees.

- Want each mass to rotate around its centre of mass. This can be calculated by working out game coords, splitting into weighted triangles, calculating centre of mass (offset), turning back into angleradii. Note that the angles won't be evenly spread any more.
- Mark centres of rocks with stars. See the stars moved when centre of mass goes to actual centre of mass!

- Make a method to find radius at a specific angle. Should use a quick search.
- Make a method to find the collision point(s) and contact angle(s) by going through extreme points

- Put it back on port 3000 after finished course?
