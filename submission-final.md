# FEM Submission

## Extracting the surface mesh

When parsing the tetrahedrons from the file and pair neighboring tetrahedrons, we see that tetrahedron that share a triangle face share three of their four vertices with each other. We note that the surface mesh are exactly the triangles which *aren't* between two tetrahedron (hence on the outside). So extracting all sides of the tetrahedrons with no neighbor are the surface mesh.

## Computing and applying internal forces

Every iteration of the loop, I first calculate the values needed for the force computations first. These include zeroing out the previous iteration's forces, applying gravity, computing area and stress tensors, as well as updating our P/V/material derivatives. All of these are stored in my tetrahedron data structure. Once all these values are computed, the forces on each node (from each face) are calculated with F * sigma * area * normal and then accumulated!

## Collision resolution

I represented my collision objects with an implicit "SDF" representation where I have box and sphere primatives that can be transformed, rotated, and grouped. When a vertex would penetrate the collision surface, I flip the velocity so it goes the other way. The reason I only implemented this instead of finding the projected direction perpendicular to the implicit surface is because I implemented everything in Javascript and needed computation to be fast. Thus my "SDF"s are actually quick inside-outside tests rather than a true SDF. This is a cruder approximation and I use smaller time steps to compensate.

## Integration method

I used the midpoint method to perform my explicit integration. With a set step value h, this involved first taking an Euler step with h * 0.5, first caching the original positions and velocities and then updating the position and velocity of the system to this new point. Then I found the derivatives at this h * 0.5 point, restored the original positions/velocities and took a full h step but with the midpoint derivatives. I separated my integrator into its own system that takes in state from the simulation as a function so we can elegantly handle different timesteps at the same time.

## Extra credit

### Pretty visualizer

I implemented my entire FEM simulation in Javascript so I could use the three.js library to interactively view my mesh. This involved writing a mini linear algebra (for matrix/vector math) and aggressively optimizing my code so that it can run in realtime. I made two modes to view the scene, one "normal" mode and one "neon" mode that has a bloom effect and shades everything in wireframe (but not the backfaces)! 

### Adaptive sampling

I implemented the adaptive sampling following Baraff and Witkin's notes. Basically I A) stored the starting positions/velocities A) took an Euler step with h and then B) reset back to the beginning and took two Euler steps with h * 0.5 and then C) computed the error and used it as a factor to scale h accordingly and D) reset back to the beginning to the use the proper h. This method helped resolve complicated meshes with many tetrahedrons that tended to explode; however, the delta time is not linear and when say a sphere bounces, it slows down at the exact point of the bounce.

# Video demos

https://github.com/Kauhentus/brown-cs2240-fem/assets/42982979/269e8ac3-2ef2-4625-aa11-e9321f49e914



https://github.com/Kauhentus/brown-cs2240-fem/assets/42982979/a03b2d18-258d-411d-b527-d5de967772bf



https://github.com/Kauhentus/brown-cs2240-fem/assets/42982979/2f785535-b358-4401-91aa-35b9115def1b



https://github.com/Kauhentus/brown-cs2240-fem/assets/42982979/98cefd0d-59df-4911-98c5-b76f0d12fbf4



