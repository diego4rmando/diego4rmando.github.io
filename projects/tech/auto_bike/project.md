---
title: "Autonomous Bicycle"
date: 2014
description: "A self-stabilizing bicycle developed at Andy Ruina's Robotics Lab at Cornell University."
thumbnail: "auto_bike_7.jpg"
images:
  - file: "auto_bike_1.jpg"
    thumb: "auto_bike_1.jpg"
    title: "Controls Simulation"
    caption: "2014 / Developed at Andy Ruina's Robotics Lab at Cornell University / Above is the simulated bicycle controlling the steer angle to a reference and maintaining the bicycle upright"
  - file: "auto_bike_2.jpg"
    thumb: "auto_bike_2.jpg"
    title: "Controls Simulation Bike Turning Path"
    caption: "2014 / Developed at Andy Ruina's Robotics Lab at Cornell University / Above is the bicycle trajectory when it steers to a reference angle and maintains itself upright"
  - file: "auto_bike_3.jpg"
    thumb: "auto_bike_3.jpg"
    title: "Controller Dynamics"
    caption: "2014 / Developed at Andy Ruina's Robotics Lab at Cornell University / Above is the roll angle, derivative of the roll angle, steer angle, and derivative of the steer angle as the bicycle stabilizes itself and steers to a constant reference steer angle"
  - file: "auto_bike_4.jpg"
    thumb: "auto_bike_4.jpg"
    title: "Controls Simulation: Steer Angle Stepping"
    caption: "2014 / Developed at Andy Ruina's Robotics Lab at Cornell University / Above is the simulated bicycle controlling the steer angle to a reference angle that alternates between a positive number and zero"
  - file: "auto_bike_5.jpg"
    thumb: "auto_bike_5.jpg"
    title: "Controls Simulation Bike Turning Path"
    caption: "2014 / Developed at Andy Ruina's Robotics Lab at Cornell University / Above is the bicycle trajectory when it steers to a reference angle that alternates between a positive number and zero"
  - file: "auto_bike_6.jpg"
    thumb: "auto_bike_6.jpg"
    title: "Controller Dynamics: Steer Angle Stepping"
    caption: "2014 / Developed at Andy Ruina's Robotics Lab at Cornell University / Above is the roll angle, derivative of the roll angle, steer angle, and derivative of the steer angle as the bicycle stabilizes itself and steers to a reference angle that alternates between a positive number and zero"
  - file: "auto_bike_7.jpg"
    thumb: "auto_bike_7.jpg"
    title: "Autonomous Bicycle Prototype"
    caption: "2014 / Developed at Andy Ruina's Robotics Lab at Cornell University / Above is the autonomous bicycle prototype"
---

Understanding human balance is an important endeavor both for the advancement of medical understanding and for expanding the capabilities of future robotic systems. Towards this end, the Biorobotics and Locomotion Laboratory started the Autonomous Bicycle project with the goal of developing a self-stabilizing bicycle that could be made into a stable drive by wire vehicle for a rider, or into a completely autonomous system with either remote or onboard navigation. This project has the potential for a multiplicity of benefits like enabling research on balance by logging human actions when riding the bicycle, creating safe bicycles that will stabilize on their own for riders who are unable to do so, or creating fully autonomous systems that can perform tasks.

In the Spring of 2014 I joined the research team and developed a reference-tracking observer-based controller for the self-stabilizing bicycle using the CVX optimization package in MATLAB. I also built a simulator using ODE45 and an animating function to plot the solution of the bicycle using the developed controller. This design showed promise in simulation and was ready for implementation on a real bicycle.

Apart from working on the controls, I also helped in the construction of the electrical components, actuators, and some preliminary code needed to build the final system. This involved the integration of a hub motor, a servo-motor, motor-drivers, an IMU, a BeagleBone Black microcontroller and other circuits necessary for these components to communicate.
