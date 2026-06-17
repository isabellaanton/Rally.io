/**
 * Rally.io — Court Renderer (Tamanho ajustado conforme solicitado)
 */

const CourtRenderer = (() => {
  const W = 315, H = 450;   // ← Tamanho que você pediu

  const COURT_HALF_WIDTH = 2.3;
  const COURT_HALF_LENGTH = 7.5;
  const SINGLES_HALF_WIDTH = COURT_HALF_WIDTH * 0.82;

  const CAM_Y = 4.8;
  const CAM_Z = 11.5;
  const PITCH = 0.32;
  const FOV = 280;
  const HORIZON_Y = H * 0.38;

  function project(wx, wy, wz) {
    const dx = wx;
    const dy = wy - CAM_Y;
    const dz = wz - CAM_Z;

    const cosP = Math.cos(PITCH);
    const sinP = Math.sin(PITCH);

    const ty = dy * cosP - dz * sinP;
    const tz = dy * sinP + dz * cosP;

    const depth = -tz;
    if (depth <= 0.1) return { x: W / 2, y: H / 2, scale: 1, visible: false };

    const screenX = W / 2 + (dx * FOV) / depth;
    const screenY = HORIZON_Y - (ty * FOV) / depth;
    const scale = FOV / depth;

    return { x: screenX, y: screenY, scale: scale, visible: true };
  }

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

  function getPalette(surfaceId, dark) {
    const p = {
      clay:  { court: dark ? '#6b2000' : '#c04a1a', out: dark ? '#3d1200' : '#8b3010', line: 'rgba(255,255,255,0.88)', net: '#d4a060', post: '#bbb' },
      grass: { court: dark ? '#0f4520' : '#1e7a35', out: dark ? '#082010' : '#0f4020', line: 'rgba(255,255,255,0.9)',  net: '#ddd480', post: '#ccc' },
      hard:  { court: dark ? '#0a3060' : '#1460b0', out: dark ? '#061830' : '#0c3070', line: 'rgba(255,255,255,0.9)',  net: '#ddeeff', post: '#ccc' },
    };
    return p[surfaceId] || p.hard;
  }

  function draw(canvas, surfaceId, dark) {
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const pal = getPalette(surfaceId, dark);

    ctx.fillStyle = pal.out;
    ctx.fillRect(0, 0, W, H);

    const courtCorners = [
      [-COURT_HALF_WIDTH, 0, -COURT_HALF_LENGTH],
      [ COURT_HALF_WIDTH, 0, -COURT_HALF_LENGTH],
      [ COURT_HALF_WIDTH, 0,  COURT_HALF_LENGTH],
      [-COURT_HALF_WIDTH, 0,  COURT_HALF_LENGTH]
    ];
    poly3D(ctx, courtCorners, pal.court);

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

    ctx.strokeStyle = pal.line;
    ctx.lineWidth = 3;
    line3D(ctx, -COURT_HALF_WIDTH, 0, -COURT_HALF_LENGTH, COURT_HALF_WIDTH, 0, -COURT_HALF_LENGTH);
    line3D(ctx, COURT_HALF_WIDTH, 0, -COURT_HALF_LENGTH, COURT_HALF_WIDTH, 0, COURT_HALF_LENGTH);
    line3D(ctx, COURT_HALF_WIDTH, 0, COURT_HALF_LENGTH, -COURT_HALF_WIDTH, 0, COURT_HALF_LENGTH);
    line3D(ctx, -COURT_HALF_WIDTH, 0, COURT_HALF_LENGTH, -COURT_HALF_WIDTH, 0, -COURT_HALF_LENGTH);

    ctx.lineWidth = 1.8;
    line3D(ctx, -SINGLES_HALF_WIDTH, 0, -COURT_HALF_LENGTH, -SINGLES_HALF_WIDTH, 0, COURT_HALF_LENGTH);
    line3D(ctx, SINGLES_HALF_WIDTH, 0, -COURT_HALF_LENGTH, SINGLES_HALF_WIDTH, 0, COURT_HALF_LENGTH);

    const serviceZ = COURT_HALF_LENGTH - (COURT_HALF_LENGTH * 2 * 0.335);
    line3D(ctx, -SINGLES_HALF_WIDTH, 0, -serviceZ, SINGLES_HALF_WIDTH, 0, -serviceZ);
    line3D(ctx, -SINGLES_HALF_WIDTH, 0, serviceZ, SINGLES_HALF_WIDTH, 0, serviceZ);
    line3D(ctx, 0, 0, -serviceZ, 0, 0, 0);
    line3D(ctx, 0, 0, serviceZ, 0, 0, 0);

    const NET_W = COURT_HALF_WIDTH + 0.25;
    const NET_H = 0.55;

    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    line3D(ctx, -NET_W, 0, 0.05, NET_W, 0, 0.05);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = pal.net;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 0.8;
    for (let wx = -NET_W; wx <= NET_W; wx += 0.25) {
      line3D(ctx, wx, 0, 0, wx, NET_H, 0);
    }
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.2;
    line3D(ctx, -NET_W, NET_H, 0, NET_W, NET_H, 0);
    ctx.restore();

    ctx.fillStyle = pal.post;
    const postLeft = project(-NET_W, 0, 0);
    const postRight = project(NET_W, 0, 0);
    if (postLeft.visible) {
      ctx.beginPath();
      ctx.arc(postLeft.x, postLeft.y - (NET_H * postLeft.scale), 4.5 * (postLeft.scale / 25), 0, Math.PI * 2);
      ctx.fill();
      line3D(ctx, -NET_W, 0, 0, -NET_W, NET_H + 0.05, 0);
    }
    if (postRight.visible) {
      ctx.beginPath();
      ctx.arc(postRight.x, postRight.y - (NET_H * postRight.scale), 4.5 * (postRight.scale / 25), 0, Math.PI * 2);
      ctx.fill();
      line3D(ctx, NET_W, 0, 0, NET_W, NET_H + 0.05, 0);
    }

    ctx.save();
    ctx.font = 'bold 11px "Bebas Neue", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'center';
    const labelOpp = project(0, 0, -COURT_HALF_LENGTH - 0.6);
    if (labelOpp.visible) ctx.fillText('OPONENTE', labelOpp.x, labelOpp.y);
    const labelYou = project(0, 0, COURT_HALF_LENGTH + 0.6);
    if (labelYou.visible) ctx.fillText('VOCÊ', labelYou.x, labelYou.y);
    ctx.restore();

    const vig = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.08, W / 2, H * 0.52, H * 0.7);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, dark ? 'rgba(0,0,0,0.48)' : 'rgba(0,0,0,0.2)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  function courtToPixel(normX, normZ, normY = 0) {
    const wx = (normX - 0.5) * (COURT_HALF_WIDTH * 2);
    const wz = -COURT_HALF_LENGTH + normZ * (COURT_HALF_LENGTH * 2);
    const wy = normY * 2.6;
    const projected = project(wx, wy, wz);
    return { x: projected.x, y: projected.y, scale: projected.scale };
  }

  function pixelToTokenCSS(px, py, wrapEl, tokenRadius, scale = 25) {
    const scaleX = wrapEl.offsetWidth  / W;
    const scaleY = wrapEl.offsetHeight / H;
    const sizeMultiplier = Math.max(0.5, Math.min(3.5, scale / 25));
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