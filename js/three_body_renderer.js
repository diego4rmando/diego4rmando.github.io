// Three-Body Problem Simulation — Canvas Renderer
// Author: Diego Armando Plascencia Vega
//
// Full-viewport canvas renderer for the three-body simulation.
// Renders: shifting background gradient, glowing bodies, fading trails.
// Replaces the CSS background gradient (color_space_fade.js) with canvas-drawn gradient.

var ThreeBodyRenderer = (function () {
    "use strict";

    // ===================== TUNABLE CONFIG =====================
    // All visual parameters are gathered here for easy tuning.

    var CONFIG = {
        // Background gradient — explicit color stops that the gradient cycles through.
        // Each stop is [R, G, B]. The gradient smoothly interpolates between consecutive
        // stops, looping back to the first. Add, remove, or reorder stops to taste.
        gradient: {
            stops: [
                [255, 255, 200],  // soft yellow
                // [255, 200, 200],  // soft pink
                [255, 220, 180],  // soft peach
                [242, 247, 161], // F2F7A1 Light Yellow
                [70, 194, 203],   // 46C2CB Cyan
                [109,103, 228],  // 6D67E4 Neutral Blue
                [69, 60, 103],  // 453C67 Dark Purple

            ],
            cycleDuration: 60000,  // full color cycle in milliseconds (60s = one full rotation)
            colorOffset: 0.5      // phase offset between top and bottom gradient colors (0-1)
        },

        // Body rendering
        body: {
            colors: ["#ffffff", "#ffffff", "#ffffff"], // white
            coreRadius: 5,         // radius of the bright core circle
            glowRadius: 18,        // radius of the outer glow
            glowAlpha: 0.35,       // opacity of the outer glow
            bloomBlur: 20,         // shadowBlur for bloom effect
            bloomAlpha: 0.6        // opacity of bloom shadow
        },

        // Trail rendering
        trail: {
            maxLength: 2000,       // number of past positions to store per body
            maxAlpha: 0.5,         // maximum trail point opacity (at newest end)
            dotRadius: 1.5,        // radius of each trail dot
            glowDotRadius: 3,      // radius of trail glow dots (for recent positions)
            recentCount: 100       // number of recent trail points that get extra glow
        },

        // Simulation
        sim: {
            timePerFrame: 0.03,    // simulation time advanced per animation frame
            coordRange: 5          // simulation coordinate range for mapping ([-range/2, range/2])
        }
    };

    // ===================== GRADIENT =====================

    // Interpolate between color stops at a given phase (0-1, wraps around).
    // Stops are an array of [R,G,B] arrays; phase 0 = first stop, phase 1 = back to first.
    function interpolateStops(phase, stops) {
        var n = stops.length;
        // Wrap phase to [0, 1)
        phase = phase - Math.floor(phase);
        var scaled = phase * n;
        var idx = Math.floor(scaled);
        var t = scaled - idx;
        var a = stops[idx % n];
        var b = stops[(idx + 1) % n];
        return [
            Math.round(a[0] + (b[0] - a[0]) * t),
            Math.round(a[1] + (b[1] - a[1]) * t),
            Math.round(a[2] + (b[2] - a[2]) * t)
        ];
    }

    // Get the two gradient colors for the current time.
    // Returns { top: [R,G,B], bottom: [R,G,B] }
    function getGradientColors(timestamp) {
        var stops = CONFIG.gradient.stops;
        // Phase: 0-1 over the full cycle duration
        var phase = (timestamp % CONFIG.gradient.cycleDuration) / CONFIG.gradient.cycleDuration;
        var top = interpolateStops(phase, stops);
        var bottom = interpolateStops(phase + CONFIG.gradient.colorOffset, stops);
        return { top: top, bottom: bottom };
    }

    // Compute average perceived brightness of the current gradient (0-1 range).
    function getGradientBrightness(colors) {
        // Simple average of both colors, weighted by perceived luminance
        var topL = (0.299 * colors.top[0] + 0.587 * colors.top[1] + 0.114 * colors.top[2]) / 255;
        var botL = (0.299 * colors.bottom[0] + 0.587 * colors.bottom[1] + 0.114 * colors.bottom[2]) / 255;
        return (topL + botL) / 2;
    }

    // Draw the background gradient on the canvas.
    function drawGradient(ctx, w, h, colors) {
        var grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "rgb(" + colors.top[0] + "," + colors.top[1] + "," + colors.top[2] + ")");
        grad.addColorStop(1, "rgb(" + colors.bottom[0] + "," + colors.bottom[1] + "," + colors.bottom[2] + ")");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    }

    // ===================== COORDINATE MAPPING =====================

    function toCanvas(sx, sy, w, h) {
        var scale = Math.min(w, h) / CONFIG.sim.coordRange;
        return {
            x: w / 2 + sx * scale,
            y: h / 2 - sy * scale
        };
    }

    // ===================== TRAIL DRAWING =====================

    function drawTrails(ctx, trails, w, h, brightnessAdj) {
        for (var b = 0; b < 3; b++) {
            var trail = trails[b];
            var color = CONFIG.body.colors[b];
            var len = trail.length;
            if (len === 0) continue;

            for (var i = 0; i < len; i++) {
                var fraction = i / len; // 0 = oldest, 1 = newest
                var alpha = fraction * CONFIG.trail.maxAlpha * brightnessAdj;
                var p = toCanvas(trail[i].x, trail[i].y, w, h);

                ctx.beginPath();
                ctx.arc(p.x, p.y, CONFIG.trail.dotRadius, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.globalAlpha = alpha;
                ctx.fill();

                // Extra glow on recent trail points
                if (i > len - CONFIG.trail.recentCount) {
                    var recentFraction = (i - (len - CONFIG.trail.recentCount)) / CONFIG.trail.recentCount;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, CONFIG.trail.glowDotRadius, 0, 2 * Math.PI);
                    ctx.globalAlpha = recentFraction * 0.15 * brightnessAdj;
                    ctx.fill();
                }
            }
        }
        ctx.globalAlpha = 1;
    }

    // ===================== BODY DRAWING =====================

    function drawBodies(ctx, positions, w, h, brightnessAdj) {
        for (var b = 0; b < 3; b++) {
            var p = toCanvas(positions[b].x, positions[b].y, w, h);
            var color = CONFIG.body.colors[b];

            // Bloom effect via shadowBlur
            ctx.save();
            ctx.shadowColor = color;
            ctx.shadowBlur = CONFIG.body.bloomBlur;
            ctx.globalAlpha = CONFIG.body.bloomAlpha * brightnessAdj;
            ctx.beginPath();
            ctx.arc(p.x, p.y, CONFIG.body.coreRadius, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.restore();

            // Outer glow (radial gradient)
            var gradient = ctx.createRadialGradient(
                p.x, p.y, 0,
                p.x, p.y, CONFIG.body.glowRadius
            );
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, "rgba(0,0,0,0)");
            ctx.beginPath();
            ctx.arc(p.x, p.y, CONFIG.body.glowRadius, 0, 2 * Math.PI);
            ctx.fillStyle = gradient;
            ctx.globalAlpha = CONFIG.body.glowAlpha * brightnessAdj;
            ctx.fill();

            // Bright core
            ctx.beginPath();
            ctx.arc(p.x, p.y, CONFIG.body.coreRadius, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.globalAlpha = 1.0 * brightnessAdj;
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // ===================== RENDERER OBJECT =====================

    function Renderer(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");
        this.sim = null;
        this.trails = [[], [], []];
        this.animId = null;
        this.running = false;

        this._resize = this._onResize.bind(this);
        window.addEventListener("resize", this._resize);
        window.addEventListener("orientationchange", this._resize);
        this._fitCanvas();
    }

    Renderer.prototype._fitCanvas = function () {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    };

    Renderer.prototype._onResize = function () {
        this._fitCanvas();
    };

    // Initialize with a simulation instance (from ThreeBodySim)
    Renderer.prototype.init = function (sim) {
        this.sim = sim;
        this.trails = [[], [], []];
    };

    // Start the render loop
    Renderer.prototype.start = function () {
        if (this.running) return;
        this.running = true;
        var self = this;
        function loop(timestamp) {
            if (!self.running) return;
            self._frame(timestamp);
            self.animId = requestAnimationFrame(loop);
        }
        this.animId = requestAnimationFrame(loop);
    };

    // Stop the render loop
    Renderer.prototype.stop = function () {
        this.running = false;
        if (this.animId) {
            cancelAnimationFrame(this.animId);
            this.animId = null;
        }
    };

    // Single frame: advance simulation, record trails, draw everything
    Renderer.prototype._frame = function (timestamp) {
        var w = this.canvas.width;
        var h = this.canvas.height;
        var ctx = this.ctx;

        // Advance physics
        if (this.sim) {
            this.sim.advance(CONFIG.sim.timePerFrame);
        }

        // Record trail positions
        if (this.sim) {
            var positions = this.sim.getPositions();
            for (var b = 0; b < 3; b++) {
                this.trails[b].push({ x: positions[b].x, y: positions[b].y });
                if (this.trails[b].length > CONFIG.trail.maxLength) {
                    this.trails[b].shift();
                }
            }
        }

        // Background gradient
        var gradColors = getGradientColors(timestamp || Date.now());
        drawGradient(ctx, w, h, gradColors);

        // Compute brightness adjustment: darken bodies/trails on light backgrounds
        // brightness is ~0.8-1.0 for these pastels; we want bodies more visible on darker phases
        var bgBrightness = getGradientBrightness(gradColors);
        // Map: bright background (0.9+) → lower body opacity; dark background (0.8) → full opacity
        var brightnessAdj = Math.max(0.4, 1.0 - (bgBrightness - 0.8) * 2);

        // Draw simulation
        if (this.sim) {
            var positions = this.sim.getPositions();
            drawTrails(ctx, this.trails, w, h, brightnessAdj);
            drawBodies(ctx, positions, w, h, brightnessAdj);
        }
    };

    // Clean up
    Renderer.prototype.destroy = function () {
        this.stop();
        window.removeEventListener("resize", this._resize);
        window.removeEventListener("orientationchange", this._resize);
    };

    // ===================== PUBLIC API =====================

    return {
        Renderer: Renderer,
        CONFIG: CONFIG
    };

})();
