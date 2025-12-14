const K = 0.05;
const friction = 0.85;

class Particle {
    constructor(width, height, numTypes) {
        this.position = {
            x: Math.random() * width,
            y: Math.random() * height
        };
        this.velocity = {
            x: 0,
            y: 0
        };
        this.type = Math.floor(Math.random() * numTypes);
        this.width = width;
        this.height = height;
        
        // Color transition properties
        this.currentColor = null; // Current RGB color
        this.targetColor = null;  // Target RGB color
        this.colorTransitionSpeed = 0.01 + Math.random() * 0.015; // Slow transition speed (1-2.5% per frame)
        this.colorTransitionProgress = 1.0; // 0 to 1, 1 means transition complete
        this.colorTransitionDelay = Math.random() * 60; // Random delay before starting transition (0-60 frames)
        this.colorTransitionTimer = 0; // Countdown timer for delay
    }

    update(swarm, forces, minDistances, radii, forceModifier = 1.0, frictionModifier = 1.0) {
        let totalForce = { x: 0, y: 0 };

        for (let p of swarm) {
            if (p === this) continue;

            let direction = {
                x: p.position.x - this.position.x,
                y: p.position.y - this.position.y
            };

            // Fix edge problem (wrap around)
            if (direction.x > 0.5 * this.width) {
                direction.x -= this.width;
            }
            if (direction.x < -0.5 * this.width) {
                direction.x += this.width;
            }
            if (direction.y > 0.5 * this.height) {
                direction.y -= this.height;
            }
            if (direction.y < -0.5 * this.height) {
                direction.y += this.height;
            }

            let dis = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
            
            if (dis > 0) {
                // Normalize direction
                direction.x /= dis;
                direction.y /= dis;

                // Repulsion at minimum distance
                if (dis < minDistances[this.type][p.type]) {
                    let forceMag = Math.abs(forces[this.type][p.type]) * -3;
                    forceMag *= this.map(dis, 0, minDistances[this.type][p.type], 1, 0);
                    forceMag *= K * forceModifier;
                    
                    totalForce.x += direction.x * forceMag;
                    totalForce.y += direction.y * forceMag;
                }

                // Attraction/repulsion within radius
                if (dis < radii[this.type][p.type]) {
                    let forceMag = forces[this.type][p.type];
                    forceMag *= this.map(dis, 0, radii[this.type][p.type], 1, 0);
                    forceMag *= K * forceModifier;
                    
                    totalForce.x += direction.x * forceMag;
                    totalForce.y += direction.y * forceMag;
                }
            }
        }

        // Apply forces
        this.velocity.x += totalForce.x;
        this.velocity.y += totalForce.y;

        // Update position
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        // Wrap around edges
        this.position.x = (this.position.x + this.width) % this.width;
        this.position.y = (this.position.y + this.height) % this.height;

        // Apply friction with emotion modifier
        this.velocity.x *= friction * frictionModifier;
        this.velocity.y *= friction * frictionModifier;
    }

    display(ctx, colorPalette = null) {
        let targetColorHex;
        
        if (colorPalette && colorPalette.length > 0) {
            // Use emotion-based color palette (hex colors)
            const paletteIndex = this.type % colorPalette.length;
            targetColorHex = colorPalette[paletteIndex];
        } else {
            // Fallback to default rainbow colors
            const hue = this.type * 60;
            targetColorHex = this.hslToHex(hue, 100, 50);
        }
        
        // Convert target color to RGB
        const targetRGB = this.hexToRgb(targetColorHex);
        
        // Initialize current color if not set
        if (this.currentColor === null) {
            this.currentColor = targetRGB;
            this.targetColor = targetRGB;
        }
        
        // Update target if it has changed
        if (!this.colorsEqual(this.targetColor, targetRGB)) {
            this.targetColor = targetRGB;
            this.colorTransitionProgress = 0.0;
            this.colorTransitionTimer = this.colorTransitionDelay; // Reset delay timer
        }
        
        // Gradually transition to target color with delay
        if (this.colorTransitionProgress < 1.0) {
            // Wait for delay timer to count down
            if (this.colorTransitionTimer > 0) {
                this.colorTransitionTimer--;
            } else {
                // Start transitioning after delay expires
                this.colorTransitionProgress = Math.min(1.0, this.colorTransitionProgress + this.colorTransitionSpeed);
                
                // Interpolate between current and target
                this.currentColor = {
                    r: this.lerp(this.currentColor.r, this.targetColor.r, this.colorTransitionProgress),
                    g: this.lerp(this.currentColor.g, this.targetColor.g, this.colorTransitionProgress),
                    b: this.lerp(this.currentColor.b, this.targetColor.b, this.colorTransitionProgress)
                };
            }
        }
        
        // Use the current interpolated color
        const color = `rgb(${Math.round(this.currentColor.r)}, ${Math.round(this.currentColor.g)}, ${Math.round(this.currentColor.b)})`;
        ctx.fillStyle = color;
        
        // Calculate speed
        const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        
        // Smooth transition: speed 0-0.5 transitions from point to oval
        const maxSpeedForTransition = 0.8;
        const speedFactor = Math.min(speed / maxSpeedForTransition, 1.0);
        
        // Interpolate between point size (1) and oval size
        const minRadius = 2;
        const maxRadiusX = 4;
        const maxRadiusY = 2;
        
        const radiusX = minRadius + (maxRadiusX - minRadius) * speedFactor;
        const radiusY = minRadius + (maxRadiusY - minRadius) * speedFactor;
        
        if (speed > 0.01) {
            // Draw oriented ellipse with size based on speed
            const angle = Math.atan2(this.velocity.y, this.velocity.x);
            
            ctx.save();
            ctx.translate(this.position.x, this.position.y);
            ctx.rotate(angle);
            
            ctx.beginPath();
            ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        } else {
            // Draw small point when stationary
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, minRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    map(value, start1, stop1, start2, stop2) {
        return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
    }
    
    // Linear interpolation helper
    lerp(start, end, progress) {
        return start + (end - start) * progress;
    }
    
    // Convert hex color to RGB object
    hexToRgb(hex) {
        // Remove # if present
        hex = hex.replace('#', '');
        
        // Handle 8-character hex (with alpha) by taking first 6 chars
        if (hex.length === 8) {
            hex = hex.substring(0, 6);
        }
        
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return { r, g, b };
    }
    
    // Convert HSL to Hex
    hslToHex(h, s, l) {
        s /= 100;
        l /= 100;
        
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        
        let r = 0, g = 0, b = 0;
        
        if (h >= 0 && h < 60) {
            r = c; g = x; b = 0;
        } else if (h >= 60 && h < 120) {
            r = x; g = c; b = 0;
        } else if (h >= 120 && h < 180) {
            r = 0; g = c; b = x;
        } else if (h >= 180 && h < 240) {
            r = 0; g = x; b = c;
        } else if (h >= 240 && h < 300) {
            r = x; g = 0; b = c;
        } else if (h >= 300 && h < 360) {
            r = c; g = 0; b = x;
        }
        
        const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
        const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
        const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');
        
        return '#' + rHex + gHex + bHex;
    }
    
    // Check if two RGB colors are equal
    colorsEqual(color1, color2) {
        if (!color1 || !color2) return false;
        return color1.r === color2.r && color1.g === color2.g && color1.b === color2.b;
    }
}
