// Three-Body Problem Simulation — Physics Engine
// Author: Diego Armando Plascencia Vega
//
// RK4 integrator for Newtonian gravitational 3-body problem.
// Provides initial conditions for several periodic solution families:
//   1. Figure-eight choreography (Moore / Chenciner-Montgomery)
//   2. Moth choreographies (Šuvakov & Dmitrašinović, 2013)
//   3. Broucke flower orbits (Broucke, 1975) — stable petal patterns
//   4. Hierarchical triple (tight binary + wide outer orbit)
//   5. Euler collinear orbit

var ThreeBodySim = (function () {
    "use strict";

    // Gravitational constant (set to 1 for normalized units)
    var G = 1;

    // ---------- Initial Conditions ----------
    // Each config: { name, masses: [m1,m2,m3], positions: [[x,y],...], velocities: [[vx,vy],...] }

    var CONFIGS = {
        // Figure-eight choreography (Chenciner & Montgomery, 2000)
        // Three equal masses chase each other around a figure-eight curve.
        // Reference values from Chenciner-Montgomery with G=1, m=1.
        // figureEight: {
        //     name: "Figure-Eight",
        //     masses: [1, 1, 1],
        //     positions: [
        //         [-0.97000436, 0.24308753],
        //         [0.97000436, -0.24308753],
        //         [0.0, 0.0]
        //     ],
        //     velocities: [
        //         [0.4662036850, 0.4323657300],
        //         [0.4662036850, 0.4323657300],
        //         [-0.9324073700, -0.8647314600]
        //     ]
        // },

        // Moth I choreography (Šuvakov & Dmitrašinović, 2013)
        // Three equal masses trace a moth-shaped periodic orbit.
        // Numerically stable with RK4 at dt=0.001.
        moth: {
            name: "Moth",
            masses: [1, 1, 1],
            positions: [
                [-1.0, 0.0],
                [1.0, 0.0],
                [0.0, 0.0]
            ],
            velocities: [
                [0.46444, 0.39606],
                [0.46444, 0.39606],
                [-0.92888, -0.79212]
            ]
        },

        // Moth II choreography (Šuvakov & Dmitrašinović, 2013)
        // A tighter variant of the moth-shaped orbit.
        mothII: {
            name: "Moth II",
            masses: [1, 1, 1],
            positions: [
                [-1.0, 0.0],
                [1.0, 0.0],
                [0.0, 0.0]
            ],
            velocities: [
                [0.43917, 0.45297],
                [0.43917, 0.45297],
                [-0.87834, -0.90594]
            ]
        },

        // // Broucke A2 - stable 3-petal flower orbit (Broucke, 1975) WRONG
        // // Satellite-type orbit where two bodies form a tight pair while the third swoops in/out.
        // brouckeA2: {
        //     name: "Flower (3-petal)",
        //     masses: [1, 1, 1],
        //     positions: [
        //         [-0.9892620043, 0.0],
        //         [2.2096177241, 0.0],
        //         [-0.2203557197, 0.0]
        //     ],
        //     velocities: [
        //         [0.0, 1.9169244185],
        //         [0.0, 0.1910268738],
        //         [0.0, -2.1079512924]
        //     ]
        // },

        // // Broucke R7 - stable 5-petal flower orbit (Broucke, 1975) WRONG
        // // Creates a beautiful 5-lobed rosette pattern.
        // brouckeR7: {
        //     name: "Flower (5-petal)",
        //     masses: [1, 1, 1],
        //     positions: [
        //         [0.8783826513, 0.0],
        //         [-0.3171529189, 0.0],
        //         [-0.5612297324, 0.0]
        //     ],
        //     velocities: [
        //         [0.0, 0.7284919942],
        //         [0.0, 2.2121723761],
        //         [0.0, -2.9406643703]
        //     ]
        // },

        // // Moth III choreography (Šuvakov & Dmitrašinović, 2013) UNSTABLE
        // mothIII: {
        //     name: "Moth III",
        //     masses: [1, 1, 1],
        //     positions: [
        //         [-1.0, 0.0],
        //         [1.0, 0.0],
        //         [0.0, 0.0]
        //     ],
        //     velocities: [
        //         [0.383444, 0.377364],
        //         [0.383444, 0.377364],
        //         [-0.766888, -0.754728]
        //     ]
        // },

        // // Butterfly I choreography (Šuvakov & Dmitrašinović, 2013)
        // // Beautiful butterfly-shaped periodic orbit. UNSTABLE
        // butterflyI: {
        //     name: "Butterfly I",
        //     masses: [1, 1, 1],
        //     positions: [
        //         [-1.0, 0.0],
        //         [1.0, 0.0],
        //         [0.0, 0.0]
        //     ],
        //     velocities: [
        //         [0.306893, 0.125507],
        //         [0.306893, 0.125507],
        //         [-0.613786, -0.251014]
        //     ]
        // },

        // // Butterfly II choreography (Šuvakov & Dmitrašinović, 2013) UNSTABLE
        // butterflyII: {
        //     name: "Butterfly II",
        //     masses: [1, 1, 1],
        //     positions: [
        //         [-1.0, 0.0],
        //         [1.0, 0.0],
        //         [0.0, 0.0]
        //     ],
        //     velocities: [
        //         [0.392955, 0.097579],
        //         [0.392955, 0.097579],
        //         [-0.785910, -0.195158]
        //     ]
        // },

        // // Butterfly III choreography (Šuvakov & Dmitrašinović, 2013) UNSTABLE
        // // Linearly stable variant.
        // butterflyIII: {
        //     name: "Butterfly III",
        //     masses: [1, 1, 1],
        //     positions: [
        //         [-1.0, 0.0],
        //         [1.0, 0.0],
        //         [0.0, 0.0]
        //     ],
        //     velocities: [
        //         [0.405916, 0.230163],
        //         [0.405916, 0.230163],
        //         [-0.811832, -0.460326]
        //     ]
        // },

        // // Butterfly IV choreography (Šuvakov & Dmitrašinović, 2013) UNSTABLE
        // butterflyIV: {
        //     name: "Butterfly IV",
        //     masses: [1, 1, 1],
        //     positions: [
        //         [-1.0, 0.0],
        //         [1.0, 0.0],
        //         [0.0, 0.0]
        //     ],
        //     velocities: [
        //         [0.350112, 0.079339],
        //         [0.350112, 0.079339],
        //         [-0.700224, -0.158678]
        //     ]
        // },

        // // Bumblebee choreography (Šuvakov & Dmitrašinović, 2013) UNSTABLE
        // // Linearly stable periodic orbit.
        // bumblebee: {
        //     name: "Bumblebee",
        //     masses: [1, 1, 1],
        //     positions: [
        //         [-1.0, 0.0],
        //         [1.0, 0.0],
        //         [0.0, 0.0]
        //     ],
        //     velocities: [
        //         [0.184279, 0.587188],
        //         [0.184279, 0.587188],
        //         [-0.368558, -1.174376]
        //     ]
        // },

        // // Dragonfly choreography (Šuvakov & Dmitrašinović, 2013) UNSTABLE
        // // Elegant elongated periodic orbit.
        // dragonfly: {
        //     name: "Dragonfly",
        //     masses: [1, 1, 1],
        //     positions: [
        //         [-1.0, 0.0],
        //         [1.0, 0.0],
        //         [0.0, 0.0]
        //     ],
        //     velocities: [
        //         [0.080584, 0.588836],
        //         [0.080584, 0.588836],
        //         [-0.161168, -1.177672]
        //     ]
        // },

        // // Goggles choreography (Šuvakov & Dmitrašinović, 2013) UNSTABLE
        // // Two-loop figure resembling goggles.
        // goggles: {
        //     name: "Goggles",
        //     masses: [1, 1, 1],
        //     positions: [
        //         [-1.0, 0.0],
        //         [1.0, 0.0],
        //         [0.0, 0.0]
        //     ],
        //     velocities: [
        //         [0.083300, 0.127889],
        //         [0.083300, 0.127889],
        //         [-0.166600, -0.255778]
        //     ]
        // },

        // // Yarn choreography (Šuvakov & Dmitrašinović, 2013) UNSTABLE
        // // Complex tangled periodic orbit.
        // yarn: {
        //     name: "Yarn",
        //     masses: [1, 1, 1],
        //     positions: [
        //         [-1.0, 0.0],
        //         [1.0, 0.0],
        //         [0.0, 0.0]
        //     ],
        //     velocities: [
        //         [0.559064, 0.349192],
        //         [0.559064, 0.349192],
        //         [-1.118128, -0.698384]
        //     ]
        // },

        // // Yin-Yang 1a choreography (Šuvakov & Dmitrašinović, 2013) UNSTABLE
        // yinYang1a: {
        //     name: "Yin-Yang 1a",
        //     masses: [1, 1, 1],
        //     positions: [
        //         [-1.0, 0.0],
        //         [1.0, 0.0],
        //         [0.0, 0.0]
        //     ],
        //     velocities: [
        //         [0.513938, 0.304736],
        //         [0.513938, 0.304736],
        //         [-1.027876, -0.609472]
        //     ]
        // },

        // // Yin-Yang 1b choreography (Šuvakov & Dmitrašinović, 2013) UNSTABLE
        // yinYang1b: {
        //     name: "Yin-Yang 1b",
        //     masses: [1, 1, 1],
        //     positions: [
        //         [-1.0, 0.0],
        //         [1.0, 0.0],
        //         [0.0, 0.0]
        //     ],
        //     velocities: [
        //         [0.282699, 0.327209],
        //         [0.282699, 0.327209],
        //         [-0.565398, -0.654418]
        //     ]
        // },

        // // Yin-Yang 2a choreography (Šuvakov & Dmitrašinović, 2013) UNSTABLE
        // yinYang2a: {
        //     name: "Yin-Yang 2a",
        //     masses: [1, 1, 1],
        //     positions: [
        //         [-1.0, 0.0],
        //         [1.0, 0.0],
        //         [0.0, 0.0]
        //     ],
        //     velocities: [
        //         [0.416822, 0.330333],
        //         [0.416822, 0.330333],
        //         [-0.833644, -0.660666]
        //     ]
        // },

        // Hierarchical triple: tight inner binary + wide outer orbit
        // Two bodies orbit each other closely while the third sweeps a large circle.
        // Inner binary separation 2a=0.6 at distance d=1.5 from COM; outer body at -3.0.
        hierarchical: {
            name: "Hierarchical",
            masses: [1, 1, 1],
            positions: [
                [1.8, 0.0],
                [1.2, 0.0],
                [-3.0, 0.0]
            ],
            velocities: [
                [0.0, 1.18504],
                [0.0, -0.64071],
                [0.0, -0.54433]
            ]
        },

        // Euler collinear orbit (eccentric variant)
        // Three equal masses on a line with 20% excess tangential velocity,
        // producing a pulsating rosette — bodies expand to ~2.6× their
        // initial distance once per revolution while staying collinear.
        // Base: omega^2 = G*m*5/(4d^3), d=1, m=1; velocities scaled by 1.20.
        euler: (function () {
            var m = 1;
            var d = 1;
            var vScale = 1.20;
            var omega = Math.sqrt(G * m * 5 / (4 * d * d * d));
            return {
                name: "Euler",
                masses: [m, m, m],
                positions: [
                    [-d, 0],
                    [0, 0],
                    [d, 0]
                ],
                velocities: [
                    [0, -omega * d * vScale],
                    [0, 0],
                    [0, omega * d * vScale]
                ]
            };
        })()
    };

    // List of config keys for random selection (derived automatically from CONFIGS)
    var CONFIG_KEYS = Object.keys(CONFIGS);

    // ---------- State ----------

    // State vector: [x1, y1, vx1, vy1, x2, y2, vx2, vy2, x3, y3, vx3, vy3]
    // Index helpers
    function posIdx(body) { return body * 4; }
    function velIdx(body) { return body * 4 + 2; }

    function createState(config) {
        var s = new Float64Array(12);
        for (var i = 0; i < 3; i++) {
            s[posIdx(i)]     = config.positions[i][0];
            s[posIdx(i) + 1] = config.positions[i][1];
            s[velIdx(i)]     = config.velocities[i][0];
            s[velIdx(i) + 1] = config.velocities[i][1];
        }
        return s;
    }

    // ---------- Derivatives ----------

    function derivatives(state, masses) {
        var ds = new Float64Array(12);
        // Positions' derivatives are velocities
        for (var i = 0; i < 3; i++) {
            ds[posIdx(i)]     = state[velIdx(i)];
            ds[posIdx(i) + 1] = state[velIdx(i) + 1];
        }
        // Velocities' derivatives are accelerations from gravity
        for (var i = 0; i < 3; i++) {
            var ax = 0, ay = 0;
            var xi = state[posIdx(i)], yi = state[posIdx(i) + 1];
            for (var j = 0; j < 3; j++) {
                if (j === i) continue;
                var dx = state[posIdx(j)] - xi;
                var dy = state[posIdx(j) + 1] - yi;
                var r2 = dx * dx + dy * dy;
                var r = Math.sqrt(r2);
                var f = G * masses[j] / (r2 * r);
                ax += f * dx;
                ay += f * dy;
            }
            ds[velIdx(i)]     = ax;
            ds[velIdx(i) + 1] = ay;
        }
        return ds;
    }

    // ---------- RK4 Integrator ----------

    function rk4Step(state, masses, dt) {
        var n = state.length;

        var k1 = derivatives(state, masses);

        var s2 = new Float64Array(n);
        for (var i = 0; i < n; i++) s2[i] = state[i] + 0.5 * dt * k1[i];
        var k2 = derivatives(s2, masses);

        var s3 = new Float64Array(n);
        for (var i = 0; i < n; i++) s3[i] = state[i] + 0.5 * dt * k2[i];
        var k3 = derivatives(s3, masses);

        var s4 = new Float64Array(n);
        for (var i = 0; i < n; i++) s4[i] = state[i] + dt * k3[i];
        var k4 = derivatives(s4, masses);

        var next = new Float64Array(n);
        for (var i = 0; i < n; i++) {
            next[i] = state[i] + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
        }
        return next;
    }

    // ---------- Simulation Object ----------

    function Simulation(configKey) {
        if (!configKey) {
            configKey = CONFIG_KEYS[Math.floor(Math.random() * CONFIG_KEYS.length)];
        }
        var config = CONFIGS[configKey];
        this.configKey = configKey;
        this.configName = config.name;
        this.masses = config.masses.slice();
        this.state = createState(config);
        this.time = 0;
        this.dt = 0.001; // default timestep (0.001 for numerical stability)
    }

    Simulation.prototype.step = function (dt) {
        dt = dt || this.dt;
        this.state = rk4Step(this.state, this.masses, dt);
        this.time += dt;
    };

    // Advance by a given amount of time using multiple fixed-size steps
    Simulation.prototype.advance = function (totalDt) {
        var steps = Math.ceil(totalDt / this.dt);
        var stepDt = totalDt / steps;
        for (var i = 0; i < steps; i++) {
            this.state = rk4Step(this.state, this.masses, stepDt);
        }
        this.time += totalDt;
    };

    Simulation.prototype.getPositions = function () {
        return [
            { x: this.state[0],  y: this.state[1] },
            { x: this.state[4],  y: this.state[5] },
            { x: this.state[8],  y: this.state[9] }
        ];
    };

    Simulation.prototype.getVelocities = function () {
        return [
            { x: this.state[2],  y: this.state[3] },
            { x: this.state[6],  y: this.state[7] },
            { x: this.state[10], y: this.state[11] }
        ];
    };

    // Compute total energy (kinetic + potential) — useful for verifying conservation
    Simulation.prototype.totalEnergy = function () {
        var KE = 0, PE = 0;
        for (var i = 0; i < 3; i++) {
            var vx = this.state[velIdx(i)], vy = this.state[velIdx(i) + 1];
            KE += 0.5 * this.masses[i] * (vx * vx + vy * vy);
            for (var j = i + 1; j < 3; j++) {
                var dx = this.state[posIdx(j)] - this.state[posIdx(i)];
                var dy = this.state[posIdx(j) + 1] - this.state[posIdx(i) + 1];
                var r = Math.sqrt(dx * dx + dy * dy);
                PE -= G * this.masses[i] * this.masses[j] / r;
            }
        }
        return KE + PE;
    };

    // Reset simulation to initial conditions
    Simulation.prototype.reset = function (configKey) {
        if (configKey) {
            var config = CONFIGS[configKey];
            this.configKey = configKey;
            this.configName = config.name;
            this.masses = config.masses.slice();
            this.state = createState(config);
        } else {
            this.state = createState(CONFIGS[this.configKey]);
        }
        this.time = 0;
    };

    // ---------- Public API ----------

    return {
        Simulation: Simulation,
        CONFIGS: CONFIGS,
        CONFIG_KEYS: CONFIG_KEYS
    };

})();
