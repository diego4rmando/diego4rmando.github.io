#!/usr/bin/env python3
"""
Three-Body Periodic Orbit Tester

Tests periodic orbits for:
1. Periodicity - does the system return close to initial conditions?
2. Energy conservation - does total energy remain constant?
3. Stability estimation - how sensitive is the orbit to perturbations?

Orbit configurations are automatically loaded from ../js/three_body_sim.js
so they only need to be defined in one place.

Usage:
    python test_periodicity.py                    # Test all orbits
    python test_periodicity.py moth               # Test specific orbit
    python test_periodicity.py --add 0.3 0.4      # Test custom velocities

Author: Diego Armando Plascencia Vega
"""

import numpy as np
import argparse
import re
import os
from dataclasses import dataclass
from typing import List, Tuple, Optional, Dict
import json

# Gravitational constant (normalized)
G = 1.0

# Path to the JS config file (relative to this script)
JS_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "js", "three_body_sim.js")


@dataclass
class OrbitConfig:
    """Configuration for a three-body orbit."""
    name: str
    masses: List[float]
    positions: List[List[float]]
    velocities: List[List[float]]


def parse_js_array(text: str) -> List:
    """Parse a JavaScript array literal into a Python list."""
    # Clean up the text
    text = text.strip()
    # Remove trailing commas before closing brackets
    text = re.sub(r',\s*\]', ']', text)
    # Try to parse as JSON
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # If that fails, try a more lenient approach
        # Remove any remaining JS-specific syntax
        text = re.sub(r'//.*$', '', text, flags=re.MULTILINE)  # Remove comments
        text = re.sub(r',\s*\]', ']', text)  # Remove trailing commas
        return json.loads(text)


def extract_nested_array(text: str, start: int) -> str:
    """Extract a nested array starting at position start (pointing to '[')."""
    if start >= len(text) or text[start] != '[':
        return ""
    depth = 0
    i = start
    while i < len(text):
        if text[i] == '[':
            depth += 1
        elif text[i] == ']':
            depth -= 1
            if depth == 0:
                return text[start:i+1]
        i += 1
    return ""


def extract_config_value(config_text: str, key: str) -> Optional[str]:
    """Extract a value for a given key from a JS object literal."""
    # First try to find the key
    key_pattern = rf'{key}\s*:\s*'
    match = re.search(key_pattern, config_text)
    if not match:
        return None

    value_start = match.end()

    # Find the first non-whitespace character after the key
    i = value_start
    while i < len(config_text) and config_text[i] in ' \t\n\r':
        i += 1

    if i >= len(config_text):
        return None

    # Check if it's an array
    if config_text[i] == '[':
        return extract_nested_array(config_text, i)

    # Check if it's a quoted string
    if config_text[i] == '"':
        end_quote = config_text.find('"', i + 1)
        if end_quote > 0:
            return config_text[i + 1:end_quote]
    elif config_text[i] == "'":
        end_quote = config_text.find("'", i + 1)
        if end_quote > 0:
            return config_text[i + 1:end_quote]

    return None


def parse_configs_from_js(js_path: str) -> Dict[str, OrbitConfig]:
    """Parse orbit configurations from three_body_sim.js."""
    with open(js_path, 'r') as f:
        content = f.read()

    configs = {}

    # Find the CONFIGS object
    # Match: var CONFIGS = { ... };
    configs_match = re.search(r'var\s+CONFIGS\s*=\s*\{(.*?)\n\s*\};', content, re.DOTALL)
    if not configs_match:
        raise ValueError("Could not find CONFIGS object in JS file")

    configs_content = configs_match.group(1)

    # Remove block comments
    configs_content = re.sub(r'/\*.*?\*/', '', configs_content, flags=re.DOTALL)

    # Find each config entry (key: { ... })
    # Handle both active and commented-out configs
    config_pattern = r'(?://\s*)?(\w+)\s*:\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}'

    for match in re.finditer(config_pattern, configs_content):
        key = match.group(1)
        config_text = match.group(2)

        # Skip if the entire config is commented out (starts with //)
        # Check the context before the match
        start_pos = match.start()
        line_start = configs_content.rfind('\n', 0, start_pos) + 1
        prefix = configs_content[line_start:start_pos].strip()
        if prefix.startswith('//'):
            continue

        # Skip IIFE configs (euler uses an IIFE)
        if '(function' in config_text:
            continue

        # Extract values
        name = extract_config_value(config_text, 'name')
        masses_str = extract_config_value(config_text, 'masses')
        positions_str = extract_config_value(config_text, 'positions')
        velocities_str = extract_config_value(config_text, 'velocities')

        if not all([name, masses_str, positions_str, velocities_str]):
            continue

        try:
            masses = parse_js_array(masses_str)
            positions = parse_js_array(positions_str)
            velocities = parse_js_array(velocities_str)

            configs[key] = OrbitConfig(
                name=name,
                masses=masses,
                positions=positions,
                velocities=velocities
            )
        except (json.JSONDecodeError, ValueError):
            # Silently skip configs that can't be parsed (e.g., commented-out ones)
            continue

    return configs


# Load configs from JS file
try:
    CONFIGS = parse_configs_from_js(JS_CONFIG_PATH)
except FileNotFoundError:
    print(f"Warning: Could not find {JS_CONFIG_PATH}")
    print("Using empty config. Run from the test/ directory or provide orbit via --add")
    CONFIGS = {}
except Exception as e:
    print(f"Warning: Error parsing JS config file: {e}")
    CONFIGS = {}


def create_state(config: OrbitConfig) -> np.ndarray:
    """Create state vector [x1,y1,vx1,vy1, x2,y2,vx2,vy2, x3,y3,vx3,vy3]."""
    state = np.zeros(12, dtype=np.float64)
    for i in range(3):
        state[i*4] = config.positions[i][0]
        state[i*4 + 1] = config.positions[i][1]
        state[i*4 + 2] = config.velocities[i][0]
        state[i*4 + 3] = config.velocities[i][1]
    return state


def derivatives(state: np.ndarray, masses: List[float]) -> np.ndarray:
    """Compute derivatives of the state vector."""
    ds = np.zeros(12, dtype=np.float64)

    # Position derivatives = velocities
    for i in range(3):
        ds[i*4] = state[i*4 + 2]      # dx/dt = vx
        ds[i*4 + 1] = state[i*4 + 3]  # dy/dt = vy

    # Velocity derivatives = accelerations from gravity
    for i in range(3):
        ax, ay = 0.0, 0.0
        xi, yi = state[i*4], state[i*4 + 1]

        for j in range(3):
            if j == i:
                continue
            dx = state[j*4] - xi
            dy = state[j*4 + 1] - yi
            r2 = dx*dx + dy*dy
            r = np.sqrt(r2)
            f = G * masses[j] / (r2 * r)
            ax += f * dx
            ay += f * dy

        ds[i*4 + 2] = ax
        ds[i*4 + 3] = ay

    return ds


def rk4_step(state: np.ndarray, masses: List[float], dt: float) -> np.ndarray:
    """Perform one RK4 integration step."""
    k1 = derivatives(state, masses)
    k2 = derivatives(state + 0.5 * dt * k1, masses)
    k3 = derivatives(state + 0.5 * dt * k2, masses)
    k4 = derivatives(state + dt * k3, masses)
    return state + (dt / 6.0) * (k1 + 2*k2 + 2*k3 + k4)


def total_energy(state: np.ndarray, masses: List[float]) -> float:
    """Compute total energy (kinetic + potential)."""
    KE = 0.0
    PE = 0.0

    for i in range(3):
        vx, vy = state[i*4 + 2], state[i*4 + 3]
        KE += 0.5 * masses[i] * (vx*vx + vy*vy)

        for j in range(i + 1, 3):
            dx = state[j*4] - state[i*4]
            dy = state[j*4 + 1] - state[i*4 + 1]
            r = np.sqrt(dx*dx + dy*dy)
            PE -= G * masses[i] * masses[j] / r

    return KE + PE


def state_distance(s1: np.ndarray, s2: np.ndarray) -> float:
    """Compute distance between two states (position + velocity)."""
    return np.linalg.norm(s1 - s2)


def position_distance(s1: np.ndarray, s2: np.ndarray) -> float:
    """Compute distance between positions only."""
    pos_diff = 0.0
    for i in range(3):
        dx = s1[i*4] - s2[i*4]
        dy = s1[i*4 + 1] - s2[i*4 + 1]
        pos_diff += dx*dx + dy*dy
    return np.sqrt(pos_diff)


def find_period(config: OrbitConfig, dt: float = 0.0001, max_time: float = 200.0,
                threshold: float = 0.01) -> Tuple[Optional[float], float, float]:
    """
    Find the period of an orbit by detecting when it returns close to initial state.

    Returns: (period or None, min_distance_achieved, energy_drift_percent)
    """
    initial_state = create_state(config)
    state = initial_state.copy()
    masses = config.masses

    initial_energy = total_energy(state, masses)
    min_distance = float('inf')
    best_time = 0.0

    t = 0.0
    # Skip initial transient (first 1.0 time units)
    while t < 1.0:
        state = rk4_step(state, masses, dt)
        t += dt

    # Search for return to initial state
    while t < max_time:
        state = rk4_step(state, masses, dt)
        t += dt

        dist = position_distance(state, initial_state)
        if dist < min_distance:
            min_distance = dist
            best_time = t

        if dist < threshold:
            current_energy = total_energy(state, masses)
            energy_drift = abs((current_energy - initial_energy) / initial_energy) * 100
            return t, min_distance, energy_drift

    current_energy = total_energy(state, masses)
    energy_drift = abs((current_energy - initial_energy) / initial_energy) * 100
    return None, min_distance, energy_drift


def test_stability(config: OrbitConfig, dt: float = 0.001, total_time: float = 100.0,
                   perturbation: float = 1e-8) -> float:
    """
    Estimate stability by measuring divergence of perturbed trajectory.

    Returns: approximate Lyapunov exponent (positive = unstable, negative = stable)
    """
    initial_state = create_state(config)
    masses = config.masses

    # Create perturbed initial state
    perturbed_state = initial_state.copy()
    perturbed_state[0] += perturbation  # Small perturbation to x1

    state = initial_state.copy()

    t = 0.0
    initial_sep = state_distance(state, perturbed_state)

    while t < total_time:
        state = rk4_step(state, masses, dt)
        perturbed_state = rk4_step(perturbed_state, masses, dt)
        t += dt

    final_sep = state_distance(state, perturbed_state)

    # Lyapunov exponent approximation: lambda ≈ (1/t) * ln(d_final / d_initial)
    if final_sep > 0 and initial_sep > 0:
        lyapunov = np.log(final_sep / initial_sep) / total_time
    else:
        lyapunov = 0.0

    return lyapunov


def test_energy_conservation(config: OrbitConfig, dt: float = 0.001,
                             total_time: float = 100.0) -> Tuple[float, float, float]:
    """
    Test energy conservation over time.

    Returns: (initial_energy, max_drift_percent, final_drift_percent)
    """
    state = create_state(config)
    masses = config.masses

    initial_energy = total_energy(state, masses)
    max_drift = 0.0

    t = 0.0
    while t < total_time:
        state = rk4_step(state, masses, dt)
        t += dt

        current_energy = total_energy(state, masses)
        drift = abs((current_energy - initial_energy) / initial_energy) * 100
        max_drift = max(max_drift, drift)

    final_energy = total_energy(state, masses)
    final_drift = abs((final_energy - initial_energy) / initial_energy) * 100

    return initial_energy, max_drift, final_drift


def test_orbit(key: str, config: OrbitConfig, verbose: bool = True) -> dict:
    """Run all tests on an orbit configuration."""
    results = {"name": config.name, "key": key}

    if verbose:
        print(f"\n{'='*60}")
        print(f"Testing: {config.name} ({key})")
        print(f"{'='*60}")
        print(f"Initial velocities: v1=({config.velocities[0][0]:.6f}, {config.velocities[0][1]:.6f})")

    # Test periodicity
    if verbose:
        print("\n[1] Periodicity Test...")
    period, min_dist, energy_drift = find_period(config)
    results["period"] = period
    results["min_return_distance"] = min_dist

    if period:
        if verbose:
            print(f"    Period found: T = {period:.4f}")
            print(f"    Return distance: {min_dist:.6f}")
        results["periodic"] = True
    else:
        if verbose:
            print(f"    Period NOT found within search time")
            print(f"    Closest approach: {min_dist:.6f}")
        results["periodic"] = False

    # Test energy conservation
    if verbose:
        print("\n[2] Energy Conservation Test...")
    initial_E, max_drift, final_drift = test_energy_conservation(config)
    results["initial_energy"] = initial_E
    results["max_energy_drift_percent"] = max_drift
    results["final_energy_drift_percent"] = final_drift

    if verbose:
        print(f"    Initial energy: {initial_E:.6f}")
        print(f"    Max drift: {max_drift:.6f}%")
        print(f"    Final drift: {final_drift:.6f}%")

        if max_drift < 0.01:
            print("    Status: EXCELLENT (drift < 0.01%)")
        elif max_drift < 0.1:
            print("    Status: GOOD (drift < 0.1%)")
        else:
            print("    Status: WARNING (drift >= 0.1%)")

    # Test stability
    if verbose:
        print("\n[3] Stability Estimation...")
    lyapunov = test_stability(config)
    results["lyapunov_estimate"] = lyapunov

    if verbose:
        print(f"    Lyapunov exponent estimate: {lyapunov:.6f}")
        if lyapunov < 0.01:
            print("    Status: STABLE (likely linearly stable)")
        elif lyapunov < 0.1:
            print("    Status: MARGINALLY STABLE")
        else:
            print("    Status: UNSTABLE (chaotic)")

    return results


def test_custom_orbit(vx: float, vy: float, verbose: bool = True) -> dict:
    """Test a custom choreography orbit with given initial velocities."""
    config = OrbitConfig(
        name=f"Custom (vx={vx}, vy={vy})",
        masses=[1, 1, 1],
        positions=[[-1.0, 0.0], [1.0, 0.0], [0.0, 0.0]],
        velocities=[[vx, vy], [vx, vy], [-2*vx, -2*vy]]
    )
    return test_orbit("custom", config, verbose)


def main():
    parser = argparse.ArgumentParser(
        description="Test three-body periodic orbits for periodicity and stability."
    )
    parser.add_argument(
        "orbit", nargs="?", default=None,
        help="Orbit key to test (e.g., 'moth', 'butterflyI'). Omit to test all."
    )
    parser.add_argument(
        "--add", nargs=2, type=float, metavar=("VX", "VY"),
        help="Test custom choreography orbit with given velocities"
    )
    parser.add_argument(
        "--json", action="store_true",
        help="Output results as JSON"
    )
    parser.add_argument(
        "--list", action="store_true",
        help="List available orbit configurations"
    )

    args = parser.parse_args()

    if args.list:
        print(f"Available orbit configurations (loaded from {JS_CONFIG_PATH}):")
        for key, config in CONFIGS.items():
            print(f"  {key:15} - {config.name}")
        print(f"\nTotal: {len(CONFIGS)} orbits")
        return

    results = []

    if args.add:
        vx, vy = args.add
        result = test_custom_orbit(vx, vy, verbose=not args.json)
        results.append(result)
    elif args.orbit:
        if args.orbit not in CONFIGS:
            print(f"Error: Unknown orbit '{args.orbit}'")
            print("Use --list to see available configurations")
            return
        result = test_orbit(args.orbit, CONFIGS[args.orbit], verbose=not args.json)
        results.append(result)
    else:
        # Test all orbits
        for key, config in CONFIGS.items():
            result = test_orbit(key, config, verbose=not args.json)
            results.append(result)

    if args.json:
        print(json.dumps(results, indent=2))
    else:
        # Summary
        print(f"\n{'='*60}")
        print("SUMMARY")
        print(f"{'='*60}")
        print(f"{'Orbit':<20} {'Periodic':<10} {'Period':<12} {'Energy Drift':<15} {'Stability'}")
        print("-" * 70)
        for r in results:
            periodic = "Yes" if r.get("periodic") else "No"
            period = f"{r['period']:.2f}" if r.get("period") else "N/A"
            drift = f"{r['max_energy_drift_percent']:.4f}%"
            lyap = r.get("lyapunov_estimate", 0)
            stability = "Stable" if lyap < 0.01 else ("Marginal" if lyap < 0.1 else "Unstable")
            print(f"{r['name']:<20} {periodic:<10} {period:<12} {drift:<15} {stability}")


if __name__ == "__main__":
    main()
