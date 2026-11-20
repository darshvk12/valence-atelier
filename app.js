/**
 * VALENCE ATELIER — Interactive Engine & Motion Physics
 * Features: Lenis Smooth Scroll, Magnetic Cursor, Word-by-Word Scroll Scrubbing,
 * Web Audio Spatial Soundscape, Interactive Material Canvas, World Clocks, Stacking Cards.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  /* ==========================================================================
     1. LENIS SMOOTH SCROLLING
     ========================================================================== */
  let lenis;
  try {
    if (typeof Lenis !== 'undefined') {
      lenis = new Lenis({
        duration: 1.25,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 2.0,
      });

      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }
  } catch (err) {
    console.warn('Lenis smooth scroll initialization skipped:', err);
  }

  /* ==========================================================================
     2. CUSTOM MAGNETIC CURSOR
     ========================================================================== */
  const cursor = document.getElementById('cursor');
  let mouseX = -100, mouseY = -100;
  let cursorX = -100, cursorY = -100;

  if (cursor && window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    const renderCursor = () => {
      // Linear interpolation (lerp) for smooth trailing
      cursorX += (mouseX - cursorX) * 0.2;
      cursorY += (mouseY - cursorY) * 0.2;
      cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
      requestAnimationFrame(renderCursor);
    };
    requestAnimationFrame(renderCursor);

    // Hover detection for buttons and links
    const interactiveTargets = document.querySelectorAll('a, button, .interactive-target, .material-btn, .pill-checkbox');
    interactiveTargets.forEach((target) => {
      target.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      target.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });

    // Hover detection for project cards (switch to VIEW badge)
    const projectCards = document.querySelectorAll('.stack-card, .preview-card, .monograph-card');
    projectCards.forEach((card) => {
      card.addEventListener('mouseenter', () => document.body.classList.add('cursor-project'));
      card.addEventListener('mouseleave', () => document.body.classList.remove('cursor-project'));
    });
  }

  /* ==========================================================================
     3. HEADER SCROLL DETECTION & ANCHOR NAVIGATION
     ========================================================================== */
  const header = document.getElementById('siteHeader');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, { passive: true });

  // Smooth scroll to anchor links using Lenis
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        // Close drawers if open
        closeAllDrawers();
        if (lenis) {
          lenis.scrollTo(targetEl, { offset: -60 });
        } else {
          targetEl.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  /* ==========================================================================
     4. STICKY STACKING CARDS DEPTH DYNAMICS
     ========================================================================== */
  const stackCards = document.querySelectorAll('.stack-card');
  const updateStackingEffects = () => {
    stackCards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      // If card has pinned near top (sticky range)
      if (rect.top <= 120 && index < stackCards.length - 1) {
        const nextCard = stackCards[index + 1];
        const nextRect = nextCard.getBoundingClientRect();
        
        // As next card scrolls up, scale down current card
        const overlap = Math.max(0, window.innerHeight - nextRect.top);
        const progress = Math.min(1, Math.max(0, overlap / window.innerHeight));
        
        const scale = 1 - progress * 0.05; // 1.0 -> 0.95
        const brightness = 1 - progress * 0.12; // 1.0 -> 0.88
        card.style.transform = `scale(${scale})`;
        card.style.filter = `brightness(${brightness})`;
      } else {
        card.style.transform = 'scale(1)';
        card.style.filter = 'brightness(1)';
      }
    });
  };

  window.addEventListener('scroll', updateStackingEffects, { passive: true });

  /* ==========================================================================
     5. SCROLL-SCRUBBED PHILOSOPHY THEATRE
     ========================================================================== */
  const philosophySection = document.getElementById('philosophy');
  const scrubWords = document.querySelectorAll('.scrub-word');
  const scrubBarFill = document.getElementById('scrubBarFill');
  const scrubPct = document.getElementById('scrubPct');

  const updateScrub = () => {
    if (!philosophySection) return;
    const rect = philosophySection.getBoundingClientRect();
    const sectionHeight = philosophySection.offsetHeight - window.innerHeight;
    const scrollInside = -rect.top;

    if (scrollInside >= 0 && scrollInside <= sectionHeight) {
      const progress = scrollInside / sectionHeight;
      const totalWords = scrubWords.length;
      const activeWordCount = Math.floor(progress * totalWords);

      scrubWords.forEach((word, idx) => {
        if (idx <= activeWordCount) {
          word.classList.add('active');
        } else {
          word.classList.remove('active');
        }
      });

      if (scrubBarFill) {
        const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));
        scrubBarFill.style.width = `${pct}%`;
        if (scrubPct) scrubPct.textContent = `${pct}%`;
      }
    } else if (scrollInside > sectionHeight) {
      scrubWords.forEach(w => w.classList.add('active'));
      if (scrubBarFill) scrubBarFill.style.width = '100%';
      if (scrubPct) scrubPct.textContent = '100%';
    } else {
      scrubWords.forEach(w => w.classList.remove('active'));
      if (scrubBarFill) scrubBarFill.style.width = '0%';
      if (scrubPct) scrubPct.textContent = '0%';
    }
  };

  window.addEventListener('scroll', updateScrub, { passive: true });
  updateScrub();

  /* ==========================================================================
     6. METRIC COUNTERS ANIMATION ON SCROLL
     ========================================================================== */
  const metricCards = document.querySelectorAll('.telemetry-card');
  let metricsAnimated = false;

  const animateMetrics = () => {
    if (metricsAnimated) return;
    const telemetrySec = document.getElementById('telemetry');
    if (!telemetrySec) return;
    const rect = telemetrySec.getBoundingClientRect();

    if (rect.top <= window.innerHeight * 0.75) {
      metricsAnimated = true;
      document.querySelectorAll('.card-metric-num').forEach((numEl) => {
        const target = parseFloat(numEl.getAttribute('data-target'));
        const duration = 1800;
        const startTime = performance.now();

        const countStep = (now) => {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / duration);
          // Ease out cubic
          const easeProgress = 1 - Math.pow(1 - progress, 3);
          
          if (target === 0) {
            numEl.textContent = '0.00';
          } else {
            const current = Math.floor(easeProgress * target);
            numEl.textContent = current.toLocaleString();
          }

          if (progress < 1) {
            requestAnimationFrame(countStep);
          } else {
            if (target === 0) {
              numEl.textContent = '0.00';
            } else {
              numEl.textContent = target.toLocaleString();
            }
          }
        };
        requestAnimationFrame(countStep);
      });
    }
  };

  window.addEventListener('scroll', animateMetrics, { passive: true });

  /* ==========================================================================
     7. MATERIALITY STUDIO (INTERACTIVE CANVAS & SHADER TACTILITY LAB)
     ========================================================================== */
  const canvas = document.getElementById('materialCanvas');
  const hudLightVector = document.getElementById('hudLightVector');
  const hudRoughness = document.getElementById('hudRoughness');
  const materialBtns = document.querySelectorAll('.material-btn');

  // Dossier elements
  const dossierTitle = document.getElementById('dossierTitle');
  const dossierDesc = document.getElementById('dossierDesc');
  const dossierDensity = document.getElementById('dossierDensity');
  const dossierStrength = document.getElementById('dossierStrength');
  const dossierAcoustic = document.getElementById('dossierAcoustic');

  const materialsData = {
    concrete: {
      title: 'Bush-Hammered Alpine Concrete',
      desc: 'Formulated with locally quarried crushed quartz from the Swiss Alps. Struck repeatedly with pneumatic bush-hammers to fracture the surface cement cream, revealing the deep mineral grains and dampening high-frequency sound waves.',
      density: '2,450 kg/m³',
      strength: '75 MPa (C60/75)',
      acoustic: '0.38 αw (Low Flutter)',
      roughness: '0.82 Ra',
      baseColor: [55, 57, 62],
      accentGlint: [190, 195, 205],
      textureType: 'stone'
    },
    basalt: {
      title: 'Columnar Volcanic Black Basalt',
      desc: 'Formed from rapid sub-glacial lava cooling in the Icelandic southern highlands. Hexagonal columnar geometry cut with high-pressure waterjets, providing extraordinary thermal lag and total electromagnetic dampening.',
      density: '2,920 kg/m³',
      strength: '140 MPa (Extreme)',
      acoustic: '0.22 αw (Hard Specular)',
      roughness: '0.64 Ra',
      baseColor: [22, 23, 26],
      accentGlint: [120, 125, 135],
      textureType: 'basalt'
    },
    titanium: {
      title: 'Darkened Brushed Aerospace Titanium',
      desc: 'Grade 5 (Ti-6Al-4V) titanium alloy, surface-brushed with ceramic stones and electro-chemically passivated to produce an immutable charcoal oxide shield impervious to saline sea spray and acid precipitation.',
      density: '4,430 kg/m³',
      strength: '950 MPa (Yield)',
      acoustic: '0.05 αw (Reflective)',
      roughness: '0.34 Ra',
      baseColor: [38, 40, 46],
      accentGlint: [230, 235, 245],
      textureType: 'brushed'
    },
    hinoki: {
      title: 'Carbonized Hinoki Cypress (Yakisugi)',
      desc: 'Centuries-old Japanese Hinoki timber charred to a depth of 4mm with open pine-wood torches. The crystalline carbon shell repels subterranean moisture, fungal spores, and insects without chemical resins.',
      density: '480 kg/m³',
      strength: '42 MPa (Flexural)',
      acoustic: '0.52 αw (Acoustic Warmth)',
      roughness: '0.91 Ra',
      baseColor: [18, 16, 15],
      accentGlint: [160, 130, 100],
      textureType: 'wood'
    },
    quartz: {
      title: 'Smoked Obsidian Quartzite Slab',
      desc: 'Metamorphic crystalline rock from high-altitude Chilean quarries. Translucent quartz veins fracture incident daylight, casting muted geometric shadows while shielding interior spaces from intense solar ultraviolet radiation.',
      density: '2,650 kg/m³',
      strength: '115 MPa (Compressive)',
      acoustic: '0.14 αw (Specular)',
      roughness: '0.48 Ra',
      baseColor: [30, 28, 35],
      accentGlint: [210, 195, 235],
      textureType: 'quartz'
    }
  };

  let activeMaterialKey = 'concrete';
  let lightX = 0.5, lightY = 0.5;
  let targetLightX = 0.5, targetLightY = 0.5;

  if (canvas) {
    const ctx = canvas.getContext('2d');

    // Dynamic resolution scaling for mobile Retina and desktop
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Handle mouse movement over canvas
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      targetLightX = (e.clientX - rect.left) / rect.width;
      targetLightY = (e.clientY - rect.top) / rect.height;
    });

    canvas.addEventListener('mouseleave', () => {
      targetLightX = 0.5;
      targetLightY = 0.5;
    });

    // Touch support for mobile canvas
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        targetLightX = (e.touches[0].clientX - rect.left) / rect.width;
        targetLightY = (e.touches[0].clientY - rect.top) / rect.height;
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        targetLightX = (e.touches[0].clientX - rect.left) / rect.width;
        targetLightY = (e.touches[0].clientY - rect.top) / rect.height;
      }
    }, { passive: true });

    // Render loop for procedural physical material specular shader
    const renderMaterial = () => {
      // Lerp light position
      lightX += (targetLightX - lightX) * 0.1;
      lightY += (targetLightY - lightY) * 0.1;

      if (hudLightVector) {
        hudLightVector.textContent = `X: ${lightX.toFixed(2)} | Y: ${lightY.toFixed(2)}`;
      }

      const w = canvas.width;
      const h = canvas.height;
      const mat = materialsData[activeMaterialKey];

      // Base fill
      ctx.fillStyle = `rgb(${mat.baseColor[0]}, ${mat.baseColor[1]}, ${mat.baseColor[2]})`;
      ctx.fillRect(0, 0, w, h);

      // Light Glint Specular Field
      const gradX = lightX * w;
      const gradY = lightY * h;
      const gradRadius = Math.max(w, h) * 0.65;

      const lightGrad = ctx.createRadialGradient(gradX, gradY, 10, gradX, gradY, gradRadius);
      lightGrad.addColorStop(0, `rgba(${mat.accentGlint[0]}, ${mat.accentGlint[1]}, ${mat.accentGlint[2]}, 0.45)`);
      lightGrad.addColorStop(0.3, `rgba(${mat.accentGlint[0]}, ${mat.accentGlint[1]}, ${mat.accentGlint[2]}, 0.15)`);
      lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0.6)');

      ctx.fillStyle = lightGrad;
      ctx.fillRect(0, 0, w, h);

      // Procedural surface micro-texture
      ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
      if (mat.textureType === 'stone' || mat.textureType === 'basalt') {
        // High density mineral speckles
        for (let i = 0; i < 400; i++) {
          const px = (Math.sin(i * 12.9898) * 43758.5453 % 1) * w;
          const py = (Math.cos(i * 78.233) * 43758.5453 % 1) * h;
          const size = (i % 3 === 0) ? 2.5 : 1.2;
          ctx.fillRect(Math.abs(px), Math.abs(py), size, size);
        }
      } else if (mat.textureType === 'brushed') {
        // Directional hairline brush strokes
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let y = 0; y < h; y += 4) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y + (Math.sin(y) * 2));
          ctx.stroke();
        }
      } else if (mat.textureType === 'wood') {
        // Charcoal grain ridges
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = 2.5;
        for (let x = 0; x < w; x += 18) {
          ctx.beginPath();
          ctx.moveTo(x + Math.sin(x) * 10, 0);
          ctx.lineTo(x + Math.cos(x) * 15, h);
          ctx.stroke();
        }
      } else if (mat.textureType === 'quartz') {
        // Crystalline fracture veins
        ctx.strokeStyle = 'rgba(220, 210, 255, 0.12)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(w * 0.2, 0);
        ctx.lineTo(w * 0.45, h * 0.5);
        ctx.lineTo(w * 0.85, h);
        ctx.stroke();
      }

      requestAnimationFrame(renderMaterial);
    };
    requestAnimationFrame(renderMaterial);

    // Switch material selection
    materialBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        materialBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        activeMaterialKey = btn.getAttribute('data-mat');
        const mat = materialsData[activeMaterialKey];

        // Update HUD
        if (hudRoughness) hudRoughness.textContent = mat.roughness;

        // Update Dossier with smooth transition
        if (dossierTitle) dossierTitle.textContent = mat.title;
        if (dossierDesc) dossierDesc.textContent = mat.desc;
        if (dossierDensity) dossierDensity.textContent = mat.density;
        if (dossierStrength) dossierStrength.textContent = mat.strength;
        if (dossierAcoustic) dossierAcoustic.textContent = mat.acoustic;
      });
    });
  }

  /* ==========================================================================
     8. WEB AUDIO SPATIAL SOUNDSCAPE SYNTHESIZER (BINAURAL 432Hz RESONANCE)
     ========================================================================== */
  const soundscapeBtn = document.getElementById('soundscapeBtn');
  const soundscapeLabel = document.getElementById('soundscapeLabel');
  let audioCtx = null;
  let masterGain = null;
  let isSoundActive = false;

  const initAudioSoundscape = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();

      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);

      // Low fundamental drone (432 Hz transposed down 4 octaves to 27Hz & 54Hz for deep architectural acoustic rumble)
      const osc1 = audioCtx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(54.0, audioCtx.currentTime); // A1 note

      const osc2 = audioCtx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(81.0, audioCtx.currentTime); // E2 note (Fifth)

      // Soft warm lowpass filter (emulates subterranean stone vault resonance)
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, audioCtx.currentTime);
      filter.Q.setValueAtTime(3.0, audioCtx.currentTime);

      const gain1 = audioCtx.createGain();
      gain1.gain.setValueAtTime(0.35, audioCtx.currentTime);
      osc1.connect(gain1);
      gain1.connect(filter);

      const gain2 = audioCtx.createGain();
      gain2.gain.setValueAtTime(0.15, audioCtx.currentTime);
      osc2.connect(gain2);
      gain2.connect(filter);

      filter.connect(masterGain);

      osc1.start();
      osc2.start();
    } catch (e) {
      console.warn('Web Audio not allowed or unsupported in current environment', e);
    }
  };

  if (soundscapeBtn) {
    soundscapeBtn.addEventListener('click', () => {
      if (!isSoundActive) {
        if (!audioCtx) initAudioSoundscape();
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        if (masterGain && audioCtx) {
          masterGain.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 1.5);
        }
        soundscapeBtn.classList.add('active');
        if (soundscapeLabel) soundscapeLabel.textContent = 'Soundscape 432Hz: ON';
        isSoundActive = true;
      } else {
        if (masterGain && audioCtx) {
          masterGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.8);
        }
        soundscapeBtn.classList.remove('active');
        if (soundscapeLabel) soundscapeLabel.textContent = 'Soundscape 432Hz: OFF';
        isSoundActive = false;
      }
    });
  }

  /* ==========================================================================
     9. SYNCHRONIZED REAL-TIME WORLD CLOCKS
     ========================================================================== */
  const formatCityTime = (timeZone) => {
    try {
      const now = new Date();
      return new Intl.DateTimeFormat('en-GB', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(now);
    } catch (e) {
      return '--:--:--';
    }
  };

  const updateClocks = () => {
    const elZurich = document.querySelector('#clockZurich .clock-time');
    const elKyoto = document.querySelector('#clockKyoto .clock-time');
    const elReykjavik = document.querySelector('#clockReykjavik .clock-time');
    const elNY = document.querySelector('#clockNY .clock-time');

    if (elZurich) elZurich.textContent = formatCityTime('Europe/Zurich');
    if (elKyoto) elKyoto.textContent = formatCityTime('Asia/Tokyo');
    if (elReykjavik) elReykjavik.textContent = formatCityTime('Atlantic/Reykjavik');
    if (elNY) elNY.textContent = formatCityTime('America/New_York');
  };

  setInterval(updateClocks, 1000);
  updateClocks();

  /* ==========================================================================
     10. NAVIGATION DRAWER & COMMISSION SLIDE-OVER MODALS
     ========================================================================== */
  const drawerOverlay = document.getElementById('drawerOverlay');
  const navDrawer = document.getElementById('navDrawer');
  const menuToggleBtn = document.getElementById('menuToggleBtn');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');

  const commissionDrawer = document.getElementById('commissionDrawer');
  const commissionCloseBtn = document.getElementById('commissionCloseBtn');
  const openCommissionBtns = document.querySelectorAll('.open-commission-btn');

  const closeAllDrawers = () => {
    if (drawerOverlay) drawerOverlay.classList.remove('active');
    if (navDrawer) navDrawer.classList.remove('active');
    if (commissionDrawer) commissionDrawer.classList.remove('active');
  };

  // Nav Drawer
  if (menuToggleBtn) {
    menuToggleBtn.addEventListener('click', () => {
      drawerOverlay.classList.add('active');
      navDrawer.classList.add('active');
    });
  }

  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener('click', closeAllDrawers);
  }

  // Commission Drawer
  openCommissionBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      closeAllDrawers();
      drawerOverlay.classList.add('active');
      commissionDrawer.classList.add('active');
    });
  });

  if (commissionCloseBtn) {
    commissionCloseBtn.addEventListener('click', closeAllDrawers);
  }

  if (drawerOverlay) {
    drawerOverlay.addEventListener('click', closeAllDrawers);
  }

  // Handle Commission Form Submission
  const commissionForm = document.getElementById('commissionForm');
  const formSuccess = document.getElementById('formSuccessMessage');
  if (commissionForm) {
    commissionForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = commissionForm.querySelector('button[type="submit"]');
      submitBtn.innerHTML = '<span>Transmitting Dossier...</span>';
      submitBtn.disabled = true;

      setTimeout(() => {
        submitBtn.style.display = 'none';
        if (formSuccess) formSuccess.classList.add('active');
      }, 1000);
    });
  }

  // Quick Inquiry Form in Footer
  const quickForm = document.getElementById('quickInquiryForm');
  const quickFeedback = document.getElementById('quickFeedback');
  if (quickForm) {
    quickForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (quickFeedback) quickFeedback.classList.add('active');
      quickForm.querySelector('input').value = '';
    });
  }
});
