// Homepage-inspired ambient particles, amplified for Waifu Gallery.
(() => {
  const canvas = document.getElementById("galleryParticles");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const palette = ["115, 190, 255", "151, 125, 255", "190, 164, 255", "111, 225, 255"];
  const random = (min, max) => min + Math.random() * (max - min);
  let width = 0, height = 0, stars = [], snow = [], raf = 0;

  function makeStar() {
    const bright = Math.random() > .78;
    return {
      x: random(0, width), y: random(0, height),
      r: bright ? random(1.5, 2.4) : random(.8, 1.65),
      vx: random(-.15, .15), vy: random(-.12, .1),
      alpha: bright ? random(.72, 1) : random(.42, .8),
      tint: palette[Math.floor(Math.random() * palette.length)],
      phase: random(0, Math.PI * 2), twinkle: random(.001, .003),
      sparkle: bright && Math.random() > .28,
      sparkleSize: random(3.5, 7)
    };
  }
  function makeSnow(fromTop = false) {
    const tint = Math.random() > .6 ? "191, 207, 255" : (Math.random() > .5 ? "222, 232, 255" : "176, 210, 255");
    return {
      x: random(-10, width + 10),
      y: fromTop ? random(-height * .25, -6) : random(0, height),
      r: random(.8, 2), vx: random(-.2, .2), vy: random(.24, .72),
      sway: random(0, Math.PI * 2), swaySpeed: random(.004, .012),
      alpha: random(.42, .78), tint, glow: Math.random() > .58
    };
  }
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const mobile = width < 600;
    const count = Math.min(mobile ? 155 : 255, Math.max(mobile ? 115 : 175, Math.round(width * height / (mobile ? 4400 : 3500))));
    stars = Array.from({ length: count }, makeStar);
    snow = Array.from({ length: mobile ? 42 : 68 }, () => makeSnow());
    paint(0);
  }
  function paint(time) {
    ctx.clearRect(0, 0, width, height);
    const t = time || 0;
    for (const p of stars) {
      if (!reduceMotion && !document.hidden) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -8) p.x = width + 8;
        if (p.x > width + 8) p.x = -8;
        if (p.y < -8) p.y = height + 8;
        if (p.y > height + 8) p.y = -8;
      }
      const pulse = reduceMotion ? 1 : .7 + (Math.sin(t * p.twinkle + p.phase) + 1) * .16;
      const alpha = p.alpha * pulse;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + p.tint + "," + alpha + ")";
      ctx.fill();
      const glow = p.sparkle ? 10 : 5.5;
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow);
      gradient.addColorStop(0, "rgba(" + p.tint + "," + (alpha * (p.sparkle ? .4 : .24)) + ")");
      gradient.addColorStop(1, "rgba(" + p.tint + ",0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(p.x - glow, p.y - glow, glow * 2, glow * 2);
      if (p.sparkle) {
        const len = p.sparkleSize * (.8 + pulse * .2);
        ctx.strokeStyle = "rgba(" + p.tint + "," + (alpha * .8) + ")";
        ctx.lineWidth = .85;
        ctx.beginPath();
        ctx.moveTo(p.x - len, p.y); ctx.lineTo(p.x + len, p.y);
        ctx.moveTo(p.x, p.y - len); ctx.lineTo(p.x, p.y + len);
        ctx.stroke();
      }
    }
    // Subtle constellations between nearby stars; kept faint to preserve artwork clarity.
    const maxDistance = width < 600 ? 82 : 105;
    for (let i = 0; i < stars.length; i++) {
      const a = stars[i];
      for (let j = i + 1; j < stars.length; j++) {
        const b = stars[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < maxDistance) {
          ctx.strokeStyle = "rgba(135, 157, 255," + ((1 - distance / maxDistance) * .14) + ")";
          ctx.lineWidth = .55;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    for (const p of snow) {
      if (!reduceMotion && !document.hidden) {
        p.sway += p.swaySpeed;
        p.x += p.vx + Math.sin(p.sway) * .32;
        p.y += p.vy;
        if (p.y > height + 8) Object.assign(p, makeSnow(true), { y: random(-28, -5) });
        if (p.x < -12) p.x = width + 12;
        if (p.x > width + 12) p.x = -12;
      }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + p.tint + "," + p.alpha + ")";
      ctx.fill();
      if (p.glow) {
        const glow = 6;
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow);
        gradient.addColorStop(0, "rgba(" + p.tint + "," + (p.alpha * .3) + ")");
        gradient.addColorStop(1, "rgba(" + p.tint + ",0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(p.x - glow, p.y - glow, glow * 2, glow * 2);
      }
    }
    if (!reduceMotion && !document.hidden) raf = requestAnimationFrame(paint);
  }
  function start() { if (!reduceMotion && !document.hidden && !raf) raf = requestAnimationFrame(paint); }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); else start(); });
  window.addEventListener("resize", () => { stop(); resize(); start(); }, { passive: true });
  window.addEventListener("orientationchange", () => { stop(); resize(); start(); }, { passive: true });
  resize(); start();
})();