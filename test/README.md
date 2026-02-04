# Three-Body Orbit Testing Tools

This folder contains tools for testing and visualizing periodic three-body orbits.

## Files

### test.html
Interactive browser-based visualization of all periodic orbits.

**Usage:** Open in a browser (requires serving from the project root for relative paths to work):
```bash
cd /path/to/diego4rmando.github.io
python -m http.server 8000
# Then open http://localhost:8000/test/test.html
```

**Features:**
- Sidebar with all available orbit configurations
- Real-time simulation with trails
- Energy conservation monitoring (green = excellent, yellow = warning, red = poor)
- Pause/resume, reset, and clear trails controls

### test_periodicity.py
Python script for quantitative testing of orbit periodicity and stability.

**Usage:**
```bash
# List available orbits
python test_periodicity.py --list

# Test a specific orbit
python test_periodicity.py moth
python test_periodicity.py butterflyI

# Test all orbits
python test_periodicity.py

# Test custom velocities (choreography format)
python test_periodicity.py --add 0.3 0.4

# Output as JSON
python test_periodicity.py --json
```

**Tests performed:**
1. **Periodicity** - Detects if/when the system returns close to initial state
2. **Energy Conservation** - Monitors energy drift over time
3. **Stability Estimation** - Approximates Lyapunov exponent

## Notes on Energy Drift

Some orbits (especially Butterfly variants) show high energy drift in the Python tests. This is due to:
- Close approaches between bodies where the fixed timestep RK4 (dt=0.001) loses accuracy
- The orbits are still periodic (periods are found correctly)

For more accurate energy conservation:
- Use smaller dt (edit the script)
- Use adaptive timestep integration
- Use higher-order methods (RK8, symplectic integrators)

The JavaScript implementation on the website uses dt=0.001 which provides visually stable results.

## Adding New Orbits

Orbit configurations are defined in **one place only**: `js/three_body_sim.js`. The Python test script automatically parses this file, so you don't need to maintain duplicate configurations.

1. Find initial conditions (vx, vy for first body) from literature
2. Add configuration to `js/three_body_sim.js` in the CONFIGS object
3. Test with: `python test_periodicity.py <orbit_key>`
4. Verify visually in test.html

## References

- Šuvakov & Dmitrašinović (2013): https://arxiv.org/abs/1303.0181
- Princeton WebGL visualization: https://vanderbei.princeton.edu/WebGL/Suki.html
- SJTU Three-Body Database: https://github.com/sjtu-liao/three-body
