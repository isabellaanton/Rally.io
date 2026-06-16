/**
 * Rally.io — Court Renderer (Fully 3D Perspective)
 * Renders a 3D tennis court on a 2D canvas using custom perspective projection.
 * Written as a standalone ES-style module (IIFE for compatibility).
 */

const CourtRenderer = (() => {
  // ── Canvas Constants ─────────────────────────────────────────
  const W = 320, H = 520;

  // ── 3D Camera & Scene Configuration ──────────────────────────
  // World space dimensions for the court layout
  const COURT_HALF_WIDTH = 2.3;   // Total doubles width is 4.6 units
  const COURT_HALF_LENGTH = 7.5;  // Total length is 15.0 units (-7.5 to +7.5)
  const SINGLES_HALF_WIDTH = COURT_HALF_WIDTH * 0.82; // Inset singles lines

  // Camera settings (Positioned behind player looking toward opponent)
  const CAM_Y = 4.8;        // Camera altitude/height above the floor
  const CAM_Z = 11.5;       // Camera depth distance behind the baseline
  const PITCH = 0.32;       // Angle looking down down the court (in radians)
  const FOV = 280;          // Field of view / focal projection factor
  const HORIZON_Y = H * 0.38; // Vertical screen position of the horizon line

  // ── 3D Perspective Projection Function ───────────────────────
  /**
   * Projects 3D World coordinates (wx, wy, wz) into 2D screen coordinates.
   * wx: Left (-) to Right (+)
   * wy: Ground level (0) to Sky (+)
   * wz: Opponent side (-) to Player side (+)
   */
  function project(wx, wy, wz) {
    const dx = wx;
    const dy = wy - CAM_Y;
    const dz = wz - CAM_Z;

    const cosP = Math.cos(PITCH);
    const sinP = Math.sin(PITCH);

    // Transform along pitch rotation
    const ty = dy * cosP - dz * sinP;
    const tz = dy * sinP + dz * cosP;

    // Depth inversion for screen rendering
    const depth = -tz;
    if (depth <= 0.1) return { x: W / 2, y: H / 2, scale: 1, visible: false };

    const screenX = W / 2 + (dx * FOV) / depth;
    const screenY = HORIZON_Y - (ty * FOV) / depth;
    const scale = FOV / depth;

    return { x: screenX, y: screenY, scale: scale, visible: true };
  }

  // ── 3D Drawing Utilities ─────────────────────────────────────
  function line3D(ctx, wx1, wy1, wz1, wx2, wy2, wz2) {
    const p1 = project(wx1, wy1, wz1);
    const p2 = project(wx2, wy2, wz2);
    if (p1.visible && p2.visible) {
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  }

  function poly3D(ctx, points, fillStyle) {
    ctx.beginPath();
    let first = true;
    for (const pt of points) {
      const p = project(pt[0], pt[1], pt[2]);
      if (first) {
        ctx.moveTo(p.x, p.y);
        first = false;
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.closePath();
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
  }

  // ── Surface palettes ─────────────────────────────────────────
  function getPalette(surfaceId, dark) {
    const p = {
      clay:  { court: dark ? '#6b2000' : '#c04a1a', out: dark ? '#3d1200' : '#8b3010',
                line: 'rgba(255,255,255,0.88)', net: '#d4a060', post: '#bbb' },
      grass: { court: dark ? '#0f4520' : '#1e7a35', out: dark ? '#082010' : '#0f4020',
                line: 'rgba(255,255,255,0.9)',  net: '#ddd480', post: '#ccc' },
      hard:  { court: dark ? '#0a3060' : '#1460b0', out: dark ? '#061830' : '#0c3070',
                line: 'rgba(255,255,255,0.9)',  net: '#ddeeff', post: '#ccc' },
    };
    return p[surfaceId] || p.hard;
  }

  // ── Draw ─────────────────────────────────────────────────────
  function draw(canvas, surfaceId, dark) {
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const pal = getPalette(surfaceId, dark);

    // Background (out-of-bounds area)
    ctx.fillStyle = pal.out;
    ctx.fillRect(0, 0, W, H);

    // 3D Court Main Surface Plane
    const courtCorners = [
      [-COURT_HALF_WIDTH, 0, -COURT_HALF_LENGTH],
      [ COURT_HALF_WIDTH, 0, -COURT_HALF_LENGTH],
      [ COURT_HALF_WIDTH, 0,  COURT_HALF_LENGTH],
      [-COURT_HALF_WIDTH, 0,  COURT_HALF_LENGTH]
    ];
    poly3D(ctx, courtCorners, pal.court);

    // 3D Perspective Court Textures
    if (surfaceId === 'hard') {
      ctx.save();
      ctx.globalAlpha = 0.04;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      for (let wz = -COURT_HALF_LENGTH; wz <= COURT_HALF_LENGTH; wz += 0.3) {
        line3D(ctx, -COURT_HALF_WIDTH, 0, wz, COURT_HALF_WIDTH, 0, wz);
      }
      ctx.restore();
    }

    if (surfaceId === 'clay') {
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      for (let wz = -COURT_HALF_LENGTH + 0.2; wz <= COURT_HALF_LENGTH; wz += 0.5) {
        line3D(ctx, -COURT_HALF_WIDTH + 0.1, 0, wz, COURT_HALF_WIDTH - 0.1, 0, wz + 0.04);
      }
      ctx.restore();
    }

    // ── 3D Court Lines ──────────────────────────────────────────
    ctx.strokeStyle = pal.line;

    // Outer boundary line (Doubles perimeter)
    ctx.lineWidth = 2.5;
    line3D(ctx, -COURT_HALF_WIDTH, 0, -COURT_HALF_LENGTH,  COURT_HALF_WIDTH, 0, -COURT_HALF_LENGTH);
    line3D(ctx,  COURT_HALF_WIDTH, 0, -COURT_HALF_LENGTH,  COURT_HALF_WIDTH, 0,  COURT_HALF_LENGTH);
    line3D(ctx,  COURT_HALF_WIDTH, 0,  COURT_HALF_LENGTH, -COURT_HALF_WIDTH, 0,  COURT_HALF_LENGTH);
    line3D(ctx, -COURT_HALF_WIDTH, 0,  COURT_HALF_LENGTH, -COURT_HALF_WIDTH, 0, -COURT_HALF_LENGTH);

    // Singles lines
    ctx.lineWidth = 1.5;
    line3D(ctx, -SINGLES_HALF_WIDTH, 0, -COURT_HALF_LENGTH, -SINGLES_HALF_WIDTH, 0,  COURT_HALF_LENGTH);
    line3D(ctx,  SINGLES_HALF_WIDTH, 0, -COURT_HALF_LENGTH,  SINGLES_HALF_WIDTH, 0,  COURT_HALF_LENGTH);

    // Service Lines (33.5% from baselines)
    const serviceZ = COURT_HALF_LENGTH - (COURT_HALF_LENGTH * 2 * 0.335); // 2.475 units away from center net
    line3D(ctx, -SINGLES_HALF_WIDTH, 0, -serviceZ, SINGLES_HALF_WIDTH, 0, -serviceZ);
    line3D(ctx, -SINGLES_HALF_WIDTH, 0,  serviceZ, SINGLES_HALF_WIDTH, 0,  serviceZ);

    // Center Service Lines
    line3D(ctx, 0, 0, -serviceZ, 0, 0, 0);
    line3D(ctx, 0, 0,  serviceZ, 0, 0, 0);

    // Center baseline marks (ticks)
    line3D(ctx, 0, 0, -COURT_HALF_LENGTH, 0, 0, -COURT_HALF_LENGTH + 0.3);
    line3D(ctx, 0, 0,  COURT_HALF_LENGTH, 0, 0,  COURT_HALF_LENGTH - 0.3);

    // ── 3D Net ──────────────────────────────────────────────────
    const NET_W = COURT_HALF_WIDTH + 0.25;
    const NET_H = 0.55; // Vertical physical height of net mesh

    // Net Shadow on floor
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    line3D(ctx, -NET_W, 0, 0.05, NET_W, 0, 0.05);
    ctx.restore();

    // Net Body Mesh
    ctx.save();
    ctx.strokeStyle = pal.net;
    ctx.lineWidth = 2.5;
    
    // Simple vertical strings mesh approximation
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 0.8;
    for (let wx = -NET_W; wx <= NET_W; wx += 0.25) {
      line3D(ctx, wx, 0, 0, wx, NET_H, 0);
    }

    // Top White Band Line
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.0;
    line3D(ctx, -NET_W, NET_H, 0, NET_W, NET_H, 0);
    ctx.restore();

    // Net Posts
    ctx.fillStyle = pal.post;
    const postLeft = project(-NET_W, 0, 0);
    const postRight = project(NET_W, 0, 0);
    
    if (postLeft.visible) {
      ctx.beginPath();
      ctx.arc(postLeft.x, postLeft.y - (NET_H * postLeft.scale), 3.5 * (postLeft.scale / 25), 0, Math.PI * 2);
      ctx.fill();
      line3D(ctx, -NET_W, 0, 0, -NET_W, NET_H + 0.05, 0);
    }
    if (postRight.visible) {
      ctx.beginPath();
      ctx.arc(postRight.x, postRight.y - (NET_H * postRight.scale), 3.5 * (postRight.scale / 25), 0, Math.PI * 2);
      ctx.fill();
      line3D(ctx, NET_W, 0, 0, NET_W, NET_H + 0.05, 0);
    }

    // ── Side Labels ───────────────────────────────────────────
    ctx.save();
    ctx.font = 'bold 10px "Bebas Neue", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'center';
    
    const labelOpp = project(0, 0, -COURT_HALF_LENGTH - 0.6);
    if (labelOpp.visible) ctx.fillText('OPONENTE', labelOpp.x, labelOpp.y);

    const labelYou = project(0, 0, COURT_HALF_LENGTH + 0.6);
    if (labelYou.visible) ctx.fillText('VOCÊ', labelYou.x, labelYou.y);
    ctx.restore();

    // ── Vignette ─────────────────────────────────────────────
    const vig = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.1, W / 2, H * 0.5, H * 0.6);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, dark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.18)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Token positioning helpers ─────────────────────────────
  /**
   * Convert normalized court position (0..1 x, 0..1 z) to screen space pixels.
   * Leverages 3D mapping formulas to feed elements into the projection engine.
   */
  function courtToPixel(normX, normZ, normY = 0) {
    const wx = (normX - 0.5) * (COURT_HALF_WIDTH * 2);
    const wz = -COURT_HALF_LENGTH + normZ * (COURT_HALF_LENGTH * 2);
    const wy = normY; // Explicit physical height injection (e.g. Ball arc)

    const projected = project(wx, wy, wz);
    return { x: projected.x, y: projected.y, scale: projected.scale };
  }

  /**
   * Convert canvas pixel and depth-scale into responsive CSS offsets for DOM tokens.
   */
  function pixelToTokenCSS(px, py, wrapEl, tokenRadius, scale = 25) {
    const scaleX = wrapEl.offsetWidth  / W;
    const scaleY = wrapEl.offsetHeight / H;
    
    // Scale size dynamically based on perspective distance multiplier
    const sizeMultiplier = Math.max(0.4, Math.min(2.5, scale / 25));
    const dynamicRadius = tokenRadius * sizeMultiplier;

    return {
      left: px * scaleX - dynamicRadius,
      top:  py * scaleY - dynamicRadius,
      width: dynamicRadius * 2,
      height: dynamicRadius * 2
    };
  }

  return { draw, courtToPixel, pixelToTokenCSS, CANVAS_W: W, CANVAS_H: H };
})();