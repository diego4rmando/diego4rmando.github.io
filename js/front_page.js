// Front Page Animation for diegoapv.com
// Author: Diego Armando Plascencia Vega
//
// Canvas-based front page with sky gradient, orbiting ASCII project objects,
// gravitational physics, and hover/tap/click interactions.

(function() {
    'use strict';

    // ===== CONSTANTS =====
    var CYCLE_SECONDS = 60;
    var STAR_COUNT = 100;
    var PHYSICS_G = 500;
    var PHYSICS_DAMPING = 0.9999;
    var PHYSICS_SOFTENING = 20;

    var OBJECT_FONT_SIZE = 24;
    var ORBIT_MIN_R = 0.15; // fraction of min(w,h)
    var ORBIT_MAX_R = 0.40;
    var TOOLTIP_THUMB_SIZE = 80;
    var MAX_DT = 0.05;

    // Category star constants
    var STAR_VISUAL_RADIUS = 30;           // px radius of drawn star circle
    var STAR_ORBIT_RADIUS_FRAC = 0.22;     // fraction of min(w,h) for star orbit around center
    var STAR_ORBIT_SPEED = 0.15;           // radians per second

    // Electron-shell orbital constants
    var SHELL_MIN_R = 60;                  // minimum orbital radius around a star (px)
    var SHELL_MAX_R = 160;                 // maximum orbital radius around a star (px)
    var SHELL_RESTORING_K = 4.0;           // radial restoring force spring constant
    var SHELL_DAMPING = 0.97;              // per-frame velocity damping to prevent runaway
    var SHELL_PERTURBATION = 0.3;          // slight random nudge amplitude (px/s²)
    var SHELL_ORBIT_SPEED_BASE = 1.2;      // base angular speed (rad/s) at SHELL_MIN_R

    // Color palettes per category: [highlightRGB, baseRGB, edgeRGB]
    // Additional categories get auto-assigned from this pool
    var STAR_COLOR_PALETTES = [
        { highlight: [255, 200, 120], base: [220, 130,  50], edge: [140,  60,  20] },  // warm amber
        { highlight: [140, 200, 255], base: [ 50, 120, 200], edge: [ 20,  50, 130] },  // cool blue
        { highlight: [180, 255, 160], base: [ 80, 180,  60], edge: [ 30, 100,  20] },  // green
        { highlight: [255, 160, 220], base: [200,  60, 150], edge: [120,  20,  80] },  // magenta
    ];

    // Sky color keyframes: [t, topRGB, bottomRGB]
    var SKY_KEYFRAMES = [
        { t: 0.00, top: [255, 170, 100], bot: [255, 200, 150] },  // Dawn
        { t: 0.20, top: [100, 160, 255], bot: [180, 210, 255] },  // Day
        { t: 0.45, top: [255, 120,  50], bot: [255, 180, 100] },  // Dusk
        { t: 0.55, top: [ 40,  30,  80], bot: [ 80,  50, 100] },  // Twilight
        { t: 0.75, top: [ 10,  10,  40], bot: [ 20,  15,  50] },  // Night
        { t: 0.95, top: [ 30,  30,  70], bot: [ 60,  40,  90] },  // Pre-dawn
    ];

    // ===== UTILITIES =====
    function lerp(a, b, f) {
        return a + (b - a) * f;
    }

    function lerpColor(c1, c2, f) {
        return [
            Math.round(lerp(c1[0], c2[0], f)),
            Math.round(lerp(c1[1], c2[1], f)),
            Math.round(lerp(c1[2], c2[2], f))
        ];
    }

    // ===== SKY GRADIENT =====
    function SkyGradient() {
        this.stars = [];
        for (var i = 0; i < STAR_COUNT; i++) {
            this.stars.push({
                x: Math.random(),
                y: Math.random(),
                size: 1 + Math.random() * 1.5,
                twinkleOffset: Math.random() * Math.PI * 2
            });
        }
    }

    SkyGradient.prototype.getTimePosition = function() {
        return ((Date.now() / 1000) % CYCLE_SECONDS) / CYCLE_SECONDS;
    };

    SkyGradient.prototype.getNightAlpha = function(t) {
        // Ramps up during dusk/twilight, full during night, ramps down at dawn
        if (t >= 0.45 && t < 0.55) return (t - 0.45) / 0.10;
        if (t >= 0.55 && t < 0.90) return 1.0;
        if (t >= 0.90 && t <= 1.00) return 1.0 - (t - 0.90) / 0.10;
        return 0;
    };

    SkyGradient.prototype.getColors = function(t) {
        // Find surrounding keyframes and interpolate
        var kf = SKY_KEYFRAMES;
        var i1 = kf.length - 1;
        var i2 = 0;
        for (var i = 0; i < kf.length - 1; i++) {
            if (t >= kf[i].t && t < kf[i + 1].t) {
                i1 = i;
                i2 = i + 1;
                break;
            }
        }
        // Handle wrap-around (pre-dawn → dawn)
        if (t >= kf[kf.length - 1].t) {
            i1 = kf.length - 1;
            i2 = 0;
        }

        var t1 = kf[i1].t;
        var t2 = kf[i2].t;
        if (t2 <= t1) t2 += 1.0; // wrap
        var localT = t - t1;
        if (localT < 0) localT += 1.0;
        var range = t2 - t1;
        var f = range > 0 ? localT / range : 0;

        return {
            top: lerpColor(kf[i1].top, kf[i2].top, f),
            bot: lerpColor(kf[i1].bot, kf[i2].bot, f)
        };
    };

    SkyGradient.prototype.draw = function(ctx, w, h) {
        var t = this.getTimePosition();
        var colors = this.getColors(t);
        var nightAlpha = this.getNightAlpha(t);

        // Draw gradient
        var grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgb(' + colors.top.join(',') + ')');
        grad.addColorStop(1, 'rgb(' + colors.bot.join(',') + ')');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Draw stars
        if (nightAlpha > 0) {
            var now = Date.now() / 1000;
            for (var i = 0; i < this.stars.length; i++) {
                var s = this.stars[i];
                var twinkle = 0.5 + 0.5 * Math.sin(now * 1.5 + s.twinkleOffset);
                var alpha = nightAlpha * twinkle * 0.9;
                ctx.beginPath();
                ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
                ctx.fill();
            }
        }

        return { t: t, nightAlpha: nightAlpha };
    };

    // ===== CATEGORY STAR =====
    function CategoryStar(config) {
        this.category = config.category;
        this.palette = config.palette;       // { highlight, base, edge } RGB arrays
        this.radius = STAR_VISUAL_RADIUS;

        // Orbital state: angle on the shared circular path around canvas center
        this.orbitAngle = config.startAngle || 0;

        // Absolute position (computed each frame from orbit)
        this.x = 0;
        this.y = 0;
    }

    CategoryStar.prototype.update = function(dt, cx, cy, orbitRadius) {
        this.orbitAngle += STAR_ORBIT_SPEED * dt;
        this.x = cx + orbitRadius * Math.cos(this.orbitAngle);
        this.y = cy + orbitRadius * Math.sin(this.orbitAngle);
    };

    CategoryStar.prototype.draw = function(ctx, nightAlpha) {
        var r = this.radius;
        var x = this.x;
        var y = this.y;

        // Interpolate palette toward white/bright at night
        var hl = this.getDayNightColor(this.palette.highlight, nightAlpha);
        var base = this.getDayNightColor(this.palette.base, nightAlpha);
        var edge = this.getDayNightColor(this.palette.edge, nightAlpha);

        // Radial gradient with offset highlight for 3D spherical look
        var grad = ctx.createRadialGradient(
            x - r * 0.3, y - r * 0.3, r * 0.05,  // highlight center (offset upper-left)
            x, y, r                                 // outer edge
        );
        grad.addColorStop(0, 'rgb(' + hl.join(',') + ')');
        grad.addColorStop(0.5, 'rgb(' + base.join(',') + ')');
        grad.addColorStop(1, 'rgb(' + edge.join(',') + ')');

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
    };

    CategoryStar.prototype.getDayNightColor = function(rgb, nightAlpha) {
        // At night, shift colors brighter/more luminous; during day, use palette as-is
        var nightShift = [
            Math.min(255, rgb[0] + 60),
            Math.min(255, rgb[1] + 60),
            Math.min(255, rgb[2] + 80)
        ];
        return lerpColor(rgb, nightShift, nightAlpha);
    };

    CategoryStar.prototype.hitTest = function(px, py) {
        var dx = px - this.x;
        var dy = py - this.y;
        return (dx * dx + dy * dy) <= (this.radius * this.radius);
    };

    // ===== CELESTIAL OBJECT =====
    function CelestialObject(config) {
        this.id = config.id;
        this.char = config.char;
        this.title = config.title;
        this.category = config.category;
        this.thumbnail = config.thumbnail;
        this.url = config.url;
        this.date = config.date || 0;
        this.fontSize = config.fontSize || OBJECT_FONT_SIZE;

        // Physics state
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.vx = config.vx || 0;
        this.vy = config.vy || 0;
        this.mass = config.mass || 1;

        // Orbital state (electron-shell model)
        this.parentStar = null;            // reference to CategoryStar
        this.targetOrbitRadius = 0;        // assigned shell radius (px)
        this.orbitAngle = 0;               // current angle around parent star

        // Interaction state
        this.caught = false;
        this.lineupTarget = null;
        this.faded = false;
        this.fadeAlpha = 1.0;

        // Thumbnail image (preloaded)
        this.thumbImg = null;
    }

    CelestialObject.prototype.getColor = function(nightAlpha) {
        // Day: dark characters against light sky
        // Night: light characters against dark sky
        var dayR = 40, dayG = 40, dayB = 60;
        var nightR = 220, nightG = 220, nightB = 255;
        return [
            Math.round(lerp(dayR, nightR, nightAlpha)),
            Math.round(lerp(dayG, nightG, nightAlpha)),
            Math.round(lerp(dayB, nightB, nightAlpha))
        ];
    };

    CelestialObject.prototype.draw = function(ctx, nightAlpha) {
        var color = this.getColor(nightAlpha);
        ctx.save();
        ctx.globalAlpha = this.fadeAlpha;
        ctx.font = 'bold ' + this.fontSize + 'px monospace';
        ctx.fillStyle = 'rgb(' + color.join(',') + ')';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.char, this.x, this.y);

        if (this.caught) {
            this.drawTooltip(ctx, color);
        }
        ctx.restore();
    };

    CelestialObject.prototype.drawTooltip = function(ctx, color) {
        var tx = this.x;
        var ty = this.y - this.fontSize - 15;
        var thumbSize = TOOLTIP_THUMB_SIZE;

        // Draw thumbnail if available and loaded
        if (this.thumbImg && this.thumbImg.complete && this.thumbImg.naturalWidth > 0) {
            // Draw with aspect ratio preserved, fitting in thumbSize box
            var iw = this.thumbImg.naturalWidth;
            var ih = this.thumbImg.naturalHeight;
            var scale = Math.min(thumbSize / iw, thumbSize / ih);
            var dw = iw * scale;
            var dh = ih * scale;
            ctx.drawImage(this.thumbImg, tx - dw / 2, ty - dh, dw, dh);
            ty -= dh + 5;
        } else {
            ty -= 5;
        }

        // Draw title
        ctx.font = 'bold 11px helvetica, sans-serif';
        ctx.fillStyle = 'rgb(' + color.join(',') + ')';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(this.title, tx, ty);
    };

    CelestialObject.prototype.hitTest = function(px, py) {
        var halfW = this.fontSize * 1.2;
        var halfH = this.fontSize * 1.2;
        return Math.abs(px - this.x) < halfW && Math.abs(py - this.y) < halfH;
    };

    // ===== PHYSICS ENGINE (Electron-Shell Model) =====
    // Each project object orbits its parent category star in stable circular orbits.
    // A radial restoring force keeps objects at their target shell radius.
    function PhysicsEngine() {}

    PhysicsEngine.prototype.update = function(objects, dt) {
        dt = Math.min(dt, MAX_DT);

        for (var i = 0; i < objects.length; i++) {
            var obj = objects[i];
            if (obj.caught) continue;

            if (obj.lineupTarget) {
                this.moveToTarget(obj, dt);
                continue;
            }

            var star = obj.parentStar;
            if (!star) continue;

            // Vector from parent star to object
            var dx = obj.x - star.x;
            var dy = obj.y - star.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 1) dist = 1; // avoid division by zero

            var nx = dx / dist; // radial unit vector (outward from star)
            var ny = dy / dist;

            // Tangential unit vector (perpendicular, counter-clockwise)
            var tx = -ny;
            var ty = nx;

            // 1. Radial restoring force: spring toward target orbit radius
            var radialDisp = dist - obj.targetOrbitRadius;
            var restoringForce = -SHELL_RESTORING_K * radialDisp;

            // 2. Tangential drive: maintain orbital speed (slower at larger radii)
            var targetSpeed = SHELL_ORBIT_SPEED_BASE * obj.targetOrbitRadius / Math.max(dist, 1);
            // Current tangential velocity
            var vTan = obj.vx * tx + obj.vy * ty;
            var tanForce = (targetSpeed - vTan) * 2.0; // gentle correction

            // 3. Slight random perturbation for organic feel
            var pertX = (Math.random() - 0.5) * SHELL_PERTURBATION;
            var pertY = (Math.random() - 0.5) * SHELL_PERTURBATION;

            // Combine forces
            var ax = restoringForce * nx + tanForce * tx + pertX;
            var ay = restoringForce * ny + tanForce * ty + pertY;

            obj.vx = (obj.vx + ax * dt) * SHELL_DAMPING;
            obj.vy = (obj.vy + ay * dt) * SHELL_DAMPING;

            // Track the moving star: shift position by star movement
            obj.x += obj.vx * dt;
            obj.y += obj.vy * dt;
        }
    };

    PhysicsEngine.prototype.moveToTarget = function(obj, dt) {
        var ease = 1.0 - Math.pow(0.02, dt);
        obj.x += (obj.lineupTarget.x - obj.x) * ease;
        obj.y += (obj.lineupTarget.y - obj.y) * ease;
        obj.vx = 0;
        obj.vy = 0;
    };

    // ===== INTERACTION MANAGER =====
    function InteractionManager(app) {
        this.app = app;
        this.canvas = app.canvas;
        this.caughtObject = null;
        this.activeCategoryLineup = null;

        var self = this;

        // Desktop events
        this.canvas.addEventListener('mousemove', function(e) { self.onMouseMove(e); });
        this.canvas.addEventListener('click', function(e) { self.onClick(e); });

        // Mobile events
        this.canvas.addEventListener('touchstart', function(e) { self.onTouchStart(e); }, { passive: false });
    }

    InteractionManager.prototype.getCanvasPoint = function(e) {
        var rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
        };
    };

    InteractionManager.prototype.getTouchPoint = function(e) {
        var touch = e.changedTouches[0];
        var rect = this.canvas.getBoundingClientRect();
        return {
            x: (touch.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (touch.clientY - rect.top) * (this.canvas.height / rect.height)
        };
    };

    InteractionManager.prototype.findObjectAt = function(px, py) {
        // Check project objects (reverse so topmost is hit first)
        for (var i = this.app.objects.length - 1; i >= 0; i--) {
            if (this.app.objects[i].fadeAlpha > 0.3 && this.app.objects[i].hitTest(px, py)) {
                return this.app.objects[i];
            }
        }
        return null;
    };

    InteractionManager.prototype.onMouseMove = function(e) {
        var p = this.getCanvasPoint(e);
        var hit = this.findObjectAt(p.x, p.y);

        if (hit) {
            // Catch on hover (stop and show thumbnail)
            if (this.caughtObject && this.caughtObject !== hit) {
                this.caughtObject.caught = false;
            }
            hit.caught = true;
            this.caughtObject = hit;
            this.canvas.style.cursor = 'pointer';
        } else {
            // Mouse left all objects → release
            if (this.caughtObject) this.caughtObject.caught = false;
            this.caughtObject = null;
            this.canvas.style.cursor = 'default';
        }
    };

    InteractionManager.prototype.onClick = function(e) {
        var p = this.getCanvasPoint(e);
        var hit = this.findObjectAt(p.x, p.y);
        if (hit && hit.url) {
            window.location.href = hit.url;
        }
    };

    InteractionManager.prototype.onTouchStart = function(e) {
        var p = this.getTouchPoint(e);
        var hit = this.findObjectAt(p.x, p.y);

        if (hit) {
            e.preventDefault();
            if (this.caughtObject === hit) {
                // Second tap → navigate
                if (hit.url) window.location.href = hit.url;
            } else {
                // First tap → catch
                if (this.caughtObject) this.caughtObject.caught = false;
                hit.caught = true;
                this.caughtObject = hit;
            }
        } else {
            // Tap empty space → release
            if (this.caughtObject) this.caughtObject.caught = false;
            this.caughtObject = null;
        }
    };

    InteractionManager.prototype.toggleCategoryLineup = function(category) {
        if (this.activeCategoryLineup === category) {
            this.restoreOrbits();
            this.activeCategoryLineup = null;
            return;
        }

        this.activeCategoryLineup = category;

        // Sort matching objects by date (chronological: oldest first)
        var matching = this.app.objects
            .filter(function(o) { return o.category === category; })
            .sort(function(a, b) { return a.date - b.date; });

        var others = this.app.objects.filter(function(o) { return o.category !== category; });

        // Lineup: horizontal row across the canvas
        var canvasW = this.app.canvas.width;
        var canvasH = this.app.canvas.height;
        var spacing = canvasW / (matching.length + 1);
        var lineY = canvasH * 0.5;

        for (var i = 0; i < matching.length; i++) {
            matching[i].lineupTarget = {
                x: spacing * (i + 1),
                y: lineY
            };
            matching[i].faded = false;
            matching[i].vx = 0;
            matching[i].vy = 0;
        }

        // Fade out non-matching objects
        for (var j = 0; j < others.length; j++) {
            others[j].faded = true;
        }
    };

    InteractionManager.prototype.restoreOrbits = function() {
        for (var i = 0; i < this.app.objects.length; i++) {
            var obj = this.app.objects[i];
            obj.lineupTarget = null;
            obj.faded = false;

            // Re-initialize orbital velocity around parent star
            if (obj.parentStar) {
                var dx = obj.x - obj.parentStar.x;
                var dy = obj.y - obj.parentStar.y;
                var dist = Math.sqrt(dx * dx + dy * dy) || 1;
                var speed = SHELL_ORBIT_SPEED_BASE * (0.9 + Math.random() * 0.2);
                // Tangential velocity (perpendicular to radial)
                obj.vx = -speed * (dy / dist) * obj.targetOrbitRadius;
                obj.vy = speed * (dx / dist) * obj.targetOrbitRadius;
            } else {
                obj.vx = (Math.random() - 0.5) * 50;
                obj.vy = (Math.random() - 0.5) * 50;
            }
        }
    };

    // ===== FRONT PAGE APP =====
    function FrontPageApp() {
        this.canvas = document.getElementById('sky_canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.sky = new SkyGradient();
        this.objects = [];
        this.stars = [];
        this.physics = null;
        this.interaction = null;
        this.lastTime = null;

        this.resize();
        var self = this;
        window.addEventListener('resize', function() { self.resize(); });

        // Start the animation loop immediately (sky renders even if data fails to load)
        this.startLoop();

        // Load project data and set up interactions
        this.loadData().then(function() {
            self.interaction = new InteractionManager(self);
        }).catch(function(err) {
            console.warn('Could not load project data:', err);
            // Interactions still work for sun if it exists
            self.interaction = new InteractionManager(self);
        });
    }

    FrontPageApp.prototype.resize = function() {
        var oldW = this.canvas.width || window.innerWidth;
        var oldH = this.canvas.height || window.innerHeight;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        if (oldW > 0 && oldH > 0) {
            var scaleX = this.canvas.width / oldW;
            var scaleY = this.canvas.height / oldH;
            for (var i = 0; i < this.objects.length; i++) {
                this.objects[i].x *= scaleX;
                this.objects[i].y *= scaleY;
            }
        }
    };

    FrontPageApp.prototype.fetchJSON = function(url) {
        // Use fetch if available and not on file:// protocol, otherwise XMLHttpRequest
        if (window.fetch && window.location.protocol !== 'file:') {
            return fetch(url).then(function(res) { return res.json(); });
        }
        return new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onload = function() {
                if (xhr.status === 200 || xhr.status === 0) {
                    try { resolve(JSON.parse(xhr.responseText)); }
                    catch(e) { reject(e); }
                } else { reject(new Error('HTTP ' + xhr.status)); }
            };
            xhr.onerror = function() { reject(new Error('XHR failed')); };
            xhr.send();
        });
    };

    FrontPageApp.prototype.loadData = function() {
        var self = this;
        return this.fetchJSON('./data/projects.json')
            .then(function(data) {
                var projects = data.projects;

                // Create category stars and project objects
                var categories = Object.keys(projects);
                for (var c = 0; c < categories.length; c++) {
                    var cat = categories[c];
                    var palette = STAR_COLOR_PALETTES[c % STAR_COLOR_PALETTES.length];
                    var startAngle = (2 * Math.PI * c) / categories.length;

                    var star = new CategoryStar({
                        category: cat,
                        palette: palette,
                        startAngle: startAngle
                    });
                    self.stars.push(star);

                    var projList = projects[cat];
                    for (var p = 0; p < projList.length; p++) {
                        var proj = projList[p];
                        var obj = new CelestialObject({
                            id: proj.id,
                            char: proj.ascii_char || '*',
                            title: proj.title,
                            category: proj.category,
                            thumbnail: proj.thumbnail,
                            url: proj.id + '.html',
                            date: parseInt(proj.date) || 0,
                            fontSize: OBJECT_FONT_SIZE
                        });
                        obj.parentStar = star;
                        // Preload thumbnail
                        if (proj.thumbnail) {
                            obj.thumbImg = new Image();
                            obj.thumbImg.src = proj.thumbnail;
                        }
                        self.objects.push(obj);
                    }
                }

                // Initialize physics and orbits
                self.physics = new PhysicsEngine();
                self.initOrbits();
            });
    };

    FrontPageApp.prototype.initOrbits = function() {
        // Group objects by parent star
        var starObjects = {};
        for (var i = 0; i < this.objects.length; i++) {
            var obj = this.objects[i];
            if (!obj.parentStar) continue;
            var cat = obj.parentStar.category;
            if (!starObjects[cat]) starObjects[cat] = [];
            starObjects[cat].push(obj);
        }

        // For each star, distribute its objects across shells
        for (var s = 0; s < this.stars.length; s++) {
            var star = this.stars[s];
            var objs = starObjects[star.category] || [];
            var count = objs.length;

            for (var j = 0; j < count; j++) {
                var o = objs[j];

                // Distribute across shells evenly between SHELL_MIN_R and SHELL_MAX_R
                var shellFrac = count > 1 ? j / (count - 1) : 0.5;
                o.targetOrbitRadius = SHELL_MIN_R + (SHELL_MAX_R - SHELL_MIN_R) * shellFrac;

                // Start at evenly spaced angles with slight randomness
                var angle = (2 * Math.PI * j / count) + (Math.random() - 0.5) * 0.4;
                o.orbitAngle = angle;

                // Position relative to star's current location
                o.x = star.x + o.targetOrbitRadius * Math.cos(angle);
                o.y = star.y + o.targetOrbitRadius * Math.sin(angle);

                // Tangential velocity for stable circular orbit
                var speed = SHELL_ORBIT_SPEED_BASE * o.targetOrbitRadius / o.targetOrbitRadius;
                // speed simplifies to SHELL_ORBIT_SPEED_BASE, but varies slightly
                speed *= (0.9 + Math.random() * 0.2);
                o.vx = -speed * Math.sin(angle) * o.targetOrbitRadius;
                o.vy = speed * Math.cos(angle) * o.targetOrbitRadius;
            }
        }
    };

    FrontPageApp.prototype.startLoop = function() {
        var self = this;
        var tick = function() {
            self.update();
            self.draw();
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    };

    FrontPageApp.prototype.update = function() {
        var now = performance.now() / 1000;
        if (this.lastTime === null) {
            this.lastTime = now;
            return;
        }
        var dt = now - this.lastTime;
        this.lastTime = now;

        // Update category stars (orbit around canvas center)
        var cx = this.canvas.width / 2;
        var cy = this.canvas.height / 2;
        var starOrbitR = Math.min(this.canvas.width, this.canvas.height) * STAR_ORBIT_RADIUS_FRAC;
        for (var s = 0; s < this.stars.length; s++) {
            this.stars[s].update(dt, cx, cy, starOrbitR);
        }

        // Physics
        if (this.physics) {
            this.physics.update(this.objects, dt);
        }

        // Animate fade alpha
        for (var i = 0; i < this.objects.length; i++) {
            var obj = this.objects[i];
            var targetAlpha = obj.faded ? 0.1 : 1.0;
            obj.fadeAlpha += (targetAlpha - obj.fadeAlpha) * 0.05;
        }
    };

    FrontPageApp.prototype.draw = function() {
        var w = this.canvas.width;
        var h = this.canvas.height;

        // Draw sky (returns t and nightAlpha)
        var skyState = this.sky.draw(this.ctx, w, h);
        var nightAlpha = skyState.nightAlpha;

        // Draw category stars
        for (var s = 0; s < this.stars.length; s++) {
            this.stars[s].draw(this.ctx, nightAlpha);
        }

        // Draw project objects
        for (var i = 0; i < this.objects.length; i++) {
            this.objects[i].draw(this.ctx, nightAlpha);
        }

    };

    // ===== BOOTSTRAP =====
    document.addEventListener('DOMContentLoaded', function() {
        window.frontPageApp = new FrontPageApp();
    });

})();
