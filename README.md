# Traffic Intersection Simulation

A high-fidelity, web-based traffic intersection simulation built with native JavaScript (Canvas API), HTML5, and CSS3. 

This project was developed to simulate and analyze traffic flow, vehicle queue dynamics, and congestion across various scenarios at a 4-way intersection.

### [Live Demo](https://roycethegreat2.github.io/traffic_simulation/)

---

## Key Features

* **Bidirectional Lanes:** Fully functional 4-way intersection (North/South and East/West) with dual lanes in each direction.
* **Realistic Vehicle Physics (Car-Following Model):** Vehicles adhere to strict following distances, brake smoothly when approaching red lights or stopped cars, and utilize **sequential acceleration** to move realistically when lights turn green (preventing unrealistic accordion effects).
* **Dynamic Signal Timing:** Customizable green light durations and yellow light transition times for both N/S and E/W phases.
* **Live Metrics Dashboard:** Real-time tracking of average wait times, current queue lengths, and system throughput (vehicles passing per minute).
* **Live Queue Chart:** Visual historical data of queue lengths plotted in real-time using Chart.js.
* **Vehicle Spawning Log:** A scrollable live feed tracking the spawn time, ID, assigned direction, and color of every vehicle entering the system.
* **Preset Scenarios:** Pre-configured environments to test different traffic patterns: Normal, Rush Hour, Low Traffic, and Emergency modes.
* **Responsive Dark/Light Mode:** Aesthetic glassmorphic UI design that dynamically adapts to system preferences (with persistent local storage).

---

## Architecture & File Structure

The project was refactored into a client-side architecture for maximum performance and portability:

* **`index.html`**  
  The structural layout of the dashboard. It integrates external fonts (Inter, JetBrains Mono), icons (Tabler Icons), and the Chart.js library, along with the Canvas element where the simulation is rendered.
  
* **`styles.css`**  
  The design system. It utilizes CSS variables for seamless theme switching, flex/grid layouts for the dashboard panels, and modern UI touches like soft shadows, rounded corners, and glassmorphism.
  
* **`sim-core.js`**  
  The mathematical core of the simulation. This file handles:
  - Global variable and state management.
  - Vehicle spawning rates and generation.
  - Phase logic (switching traffic lights from green to yellow to red).
  - The physics engine calculating acceleration (55 px/s²), deceleration (120 px/s²), speed, and position limits for every individual vehicle.

* **`sim-render.js`**  
  The rendering engine of the simulation. This file is responsible for drawing data to the screen:
  - HTML Canvas rendering (roads, markings, traffic lights, and vehicles).
  - Updating the Chart.js graph.
  - Managing UI interactions (button clicks, slider changes).
  - Updating HTML DOM elements with live statistics (wait times, spawn logs).

---

## Simulation Mechanics

### 1. Spawning
Vehicles are generated at the edges of the canvas based on a defined spawn rate (e.g., 12 cars per minute). The logic distributes these spawns realistically using a **randomized interval modifier**:
* **Per-Lane Split:** The total UI rate is divided by 2 to calculate the rate per directional lane (e.g., 12 cars/min total = 6 cars/min per lane).
* **Base Interval:** The base time between cars is calculated (e.g., 60 seconds / 6 cars = 10 seconds).
* **Random Modifier:** To prevent cars from spawning on a rigid, robotic schedule, the base interval is multiplied by a random factor between 0.5x and 1.5x (`interval * (0.5 + Math.random())`).
This means a 10-second base interval results in cars spawning randomly every 5 to 15 seconds. Over time, this averages out perfectly to the target rate while creating realistic "clumps" and "gaps" in traffic flow.

### 2. The Car-Following Model
In `sim-core.js`, the `updateAllVehicles()` function runs every frame:
* **Target Stops:** The engine calculates the most restrictive stopping point for every car. This could be a red light line, or the rear bumper of the car immediately in front of it.
* **Braking Distance:** If a car approaches its target stop and its current speed dictates that it needs to brake to avoid crossing it, it applies the deceleration constant.
* **Sequential Acceleration:** When a light turns green, the leading car accelerates. Trailing cars monitor the gap to the car ahead; they only accelerate when the gap is safe, creating a realistic wave of movement rather than all cars moving simultaneously.

### 3. Rendering Loop
The browser's `requestAnimationFrame` drives the simulation. Every tick (frame), it:
1. Calculates the time elapsed (`dt`).
2. Spawns new vehicles if necessary.
3. Updates traffic light phases.
4. Moves all vehicles based on the physics model.
5. Clears and redraws the `<canvas>` element.

---

## Running Locally

Because this is a completely static frontend application, you do not need a backend server to run it.

1. Clone the repository:
   ```bash
   git clone https://github.com/RoycetheGreat2/traffic_simulation.git
   ```
2. Open `index.html` in any modern web browser.
3. Alternatively, use a local development server for a slightly better experience:
   ```bash
   # If using Python:
   python -m http.server 8080
   # Then navigate to http://localhost:8080
   ```
