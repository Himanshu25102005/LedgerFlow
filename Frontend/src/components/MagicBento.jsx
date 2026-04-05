"use client"
import { useRef, useEffect, useState, useCallback } from 'react';
import { gsap } from 'gsap';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

function formatMonthYear(month, year) {
  const m = Number(month);
  const y = Number(year);
  if (!Number.isFinite(m) || !Number.isFinite(y)) return '—';
  const label = MONTH_LABELS[m - 1] ?? String(month);
  return `${label} ${y}`;
}

async function fetchLedgerJson(path) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (res.status === 401) return { _unauthorized: true };
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

function todayInputDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DASHBOARD_CARDS = [
  { key: 'summary', label: 'Summary', title: 'Financial Summary', color: '#060010' },
  { key: 'records', label: 'Records', title: 'Recent Records', color: '#060010' },
  { key: 'admin', label: 'Admin', title: 'Admin Overview', color: '#060010' },
  { key: 'categories', label: 'Categories', title: 'Category Breakdown', color: '#060010' },
  { key: 'trends', label: 'Trends', title: 'Monthly Trends', color: '#060010' },
  { key: 'profile', label: 'Profile', title: 'Profile', color: '#060010' }
];

function CardEmptyState({ title, subtitle }) {
  return (
    <div className="flex w-full min-h-[9rem] flex-1 flex-col border-t border-white/[0.06] pt-3 sm:min-h-[10rem]">
      <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-2 pb-1 text-center">
        <p className="text-xs font-medium tracking-tight text-neutral-100">{title}</p>
        {subtitle ? (
          <p className="max-w-[17rem] text-[11px] leading-relaxed text-neutral-500">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

function CardLoadingState() {
  return (
    <div className="flex w-full min-h-[9rem] flex-1 flex-col border-t border-white/[0.06] pt-3 sm:min-h-[10rem]">
      <div className="flex flex-1 flex-col items-center justify-center px-2 pb-1">
        <p className="text-[11px] text-neutral-500">Loading...</p>
      </div>
    </div>
  );
}



const DEFAULT_PARTICLE_COUNT = 12;
const DEFAULT_SPOTLIGHT_RADIUS = 300;
const DEFAULT_GLOW_COLOR = '132, 0, 255';
const MOBILE_BREAKPOINT = 768;

const createParticleElement = (x, y, color = DEFAULT_GLOW_COLOR) => {
  const el = document.createElement('div');
  el.className = 'particle';
  el.style.cssText = `
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(${color}, 1);
    box-shadow: 0 0 6px rgba(${color}, 0.6);
    pointer-events: none;
    z-index: 100;
    left: ${x}px;
    top: ${y}px;
  `;
  return el;
};

const calculateSpotlightValues = radius => ({
  proximity: radius * 0.5,
  fadeDistance: radius * 0.75
});

const updateCardGlowProperties = (card, mouseX, mouseY, glow, radius) => {
  const rect = card.getBoundingClientRect();
  const relativeX = ((mouseX - rect.left) / rect.width) * 100;
  const relativeY = ((mouseY - rect.top) / rect.height) * 100;

  card.style.setProperty('--glow-x', `${relativeX}%`);
  card.style.setProperty('--glow-y', `${relativeY}%`);
  card.style.setProperty('--glow-intensity', glow.toString());
  card.style.setProperty('--glow-radius', `${radius}px`);
};

const ParticleCard = ({
  children,
  className = '',
  disableAnimations = false,
  style,
  particleCount = DEFAULT_PARTICLE_COUNT,
  glowColor = DEFAULT_GLOW_COLOR,
  enableTilt = true,
  clickEffect = false,
  enableMagnetism = false
}) => {
  const cardRef = useRef(null);
  const particlesRef = useRef([]);
  const timeoutsRef = useRef([]);
  const isHoveredRef = useRef(false);
  const memoizedParticles = useRef([]);
  const particlesInitialized = useRef(false);
  const magnetismAnimationRef = useRef(null);

  const initializeParticles = useCallback(() => {
    if (particlesInitialized.current || !cardRef.current) return;

    const { width, height } = cardRef.current.getBoundingClientRect();
    memoizedParticles.current = Array.from({ length: particleCount }, () =>
      createParticleElement(Math.random() * width, Math.random() * height, glowColor)
    );
    particlesInitialized.current = true;
  }, [particleCount, glowColor]);

  const clearAllParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    magnetismAnimationRef.current?.kill();

    particlesRef.current.forEach(particle => {
      gsap.to(particle, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'back.in(1.7)',
        onComplete: () => {
          particle.parentNode?.removeChild(particle);
        }
      });
    });
    particlesRef.current = [];
  }, []);

  const animateParticles = useCallback(() => {
    if (!cardRef.current || !isHoveredRef.current) return;

    if (!particlesInitialized.current) {
      initializeParticles();
    }

    memoizedParticles.current.forEach((particle, index) => {
      const timeoutId = setTimeout(() => {
        if (!isHoveredRef.current || !cardRef.current) return;

        const clone = particle.cloneNode(true);
        cardRef.current.appendChild(clone);
        particlesRef.current.push(clone);

        gsap.fromTo(clone, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' });

        gsap.to(clone, {
          x: (Math.random() - 0.5) * 100,
          y: (Math.random() - 0.5) * 100,
          rotation: Math.random() * 360,
          duration: 2 + Math.random() * 2,
          ease: 'none',
          repeat: -1,
          yoyo: true
        });

        gsap.to(clone, {
          opacity: 0.3,
          duration: 1.5,
          ease: 'power2.inOut',
          repeat: -1,
          yoyo: true
        });
      }, index * 100);

      timeoutsRef.current.push(timeoutId);
    });
  }, [initializeParticles]);

  useEffect(() => {
    if (disableAnimations || !cardRef.current) return;

    const element = cardRef.current;

    const handleMouseEnter = () => {
      isHoveredRef.current = true;
      animateParticles();

      if (enableTilt) {
        gsap.to(element, {
          rotateX: 5,
          rotateY: 5,
          duration: 0.3,
          ease: 'power2.out',
          transformPerspective: 1000
        });
      }
    };

    const handleMouseLeave = () => {
      isHoveredRef.current = false;
      clearAllParticles();

      if (enableTilt) {
        gsap.to(element, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
      }

      if (enableMagnetism) {
        gsap.to(element, {
          x: 0,
          y: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    };

    const handleMouseMove = e => {
      if (!enableTilt && !enableMagnetism) return;

      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      if (enableTilt) {
        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;

        gsap.to(element, {
          rotateX,
          rotateY,
          duration: 0.1,
          ease: 'power2.out',
          transformPerspective: 1000
        });
      }

      if (enableMagnetism) {
        const magnetX = (x - centerX) * 0.05;
        const magnetY = (y - centerY) * 0.05;

        magnetismAnimationRef.current = gsap.to(element, {
          x: magnetX,
          y: magnetY,
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    };

    const handleClick = e => {
      if (!clickEffect) return;

      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const maxDistance = Math.max(
        Math.hypot(x, y),
        Math.hypot(x - rect.width, y),
        Math.hypot(x, y - rect.height),
        Math.hypot(x - rect.width, y - rect.height)
      );

      const ripple = document.createElement('div');
      ripple.style.cssText = `
        position: absolute;
        width: ${maxDistance * 2}px;
        height: ${maxDistance * 2}px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(${glowColor}, 0.4) 0%, rgba(${glowColor}, 0.2) 30%, transparent 70%);
        left: ${x - maxDistance}px;
        top: ${y - maxDistance}px;
        pointer-events: none;
        z-index: 1000;
      `;

      element.appendChild(ripple);

      gsap.fromTo(
        ripple,
        {
          scale: 0,
          opacity: 1
        },
        {
          scale: 1,
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out',
          onComplete: () => ripple.remove()
        }
      );
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('click', handleClick);

    return () => {
      isHoveredRef.current = false;
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('click', handleClick);
      clearAllParticles();
    };
  }, [animateParticles, clearAllParticles, disableAnimations, enableTilt, enableMagnetism, clickEffect, glowColor]);

  return (
    <div
      ref={cardRef}
      className={`${className} relative min-h-0 overflow-hidden`}
      style={{ ...style, position: 'relative', overflow: 'hidden' }}
    >
      {children}
    </div>
  );
};

const GlobalSpotlight = ({
  gridRef,
  disableAnimations = false,
  enabled = true,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  glowColor = DEFAULT_GLOW_COLOR
}) => {
  const spotlightRef = useRef(null);
  const isInsideSection = useRef(false);

  useEffect(() => {
    if (disableAnimations || !gridRef?.current || !enabled) return;

    const spotlight = document.createElement('div');
    spotlight.className = 'global-spotlight';
    spotlight.style.cssText = `
      position: fixed;
      width: 800px;
      height: 800px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle,
        rgba(${glowColor}, 0.15) 0%,
        rgba(${glowColor}, 0.08) 15%,
        rgba(${glowColor}, 0.04) 25%,
        rgba(${glowColor}, 0.02) 40%,
        rgba(${glowColor}, 0.01) 65%,
        transparent 70%
      );
      z-index: 200;
      opacity: 0;
      transform: translate(-50%, -50%);
      mix-blend-mode: screen;
    `;
    document.body.appendChild(spotlight);
    spotlightRef.current = spotlight;

    const handleMouseMove = e => {
      if (!spotlightRef.current || !gridRef.current) return;

      const section = gridRef.current.closest('.bento-section');
      const rect = section?.getBoundingClientRect();
      const mouseInside =
        rect && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;

      isInsideSection.current = mouseInside || false;
      const cards = gridRef.current.querySelectorAll('.card');

      if (!mouseInside) {
        gsap.to(spotlightRef.current, {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
        cards.forEach(card => {
          card.style.setProperty('--glow-intensity', '0');
        });
        return;
      }

      const { proximity, fadeDistance } = calculateSpotlightValues(spotlightRadius);
      let minDistance = Infinity;

      cards.forEach(card => {
        const cardElement = card;
        const cardRect = cardElement.getBoundingClientRect();
        const centerX = cardRect.left + cardRect.width / 2;
        const centerY = cardRect.top + cardRect.height / 2;
        const distance =
          Math.hypot(e.clientX - centerX, e.clientY - centerY) - Math.max(cardRect.width, cardRect.height) / 2;
        const effectiveDistance = Math.max(0, distance);

        minDistance = Math.min(minDistance, effectiveDistance);

        let glowIntensity = 0;
        if (effectiveDistance <= proximity) {
          glowIntensity = 1;
        } else if (effectiveDistance <= fadeDistance) {
          glowIntensity = (fadeDistance - effectiveDistance) / (fadeDistance - proximity);
        }

        updateCardGlowProperties(cardElement, e.clientX, e.clientY, glowIntensity, spotlightRadius);
      });

      gsap.to(spotlightRef.current, {
        left: e.clientX,
        top: e.clientY,
        duration: 0.1,
        ease: 'power2.out'
      });

      const targetOpacity =
        minDistance <= proximity
          ? 0.8
          : minDistance <= fadeDistance
            ? ((fadeDistance - minDistance) / (fadeDistance - proximity)) * 0.8
            : 0;

      gsap.to(spotlightRef.current, {
        opacity: targetOpacity,
        duration: targetOpacity > 0 ? 0.2 : 0.5,
        ease: 'power2.out'
      });
    };

    const handleMouseLeave = () => {
      isInsideSection.current = false;
      gridRef.current?.querySelectorAll('.card').forEach(card => {
        card.style.setProperty('--glow-intensity', '0');
      });
      if (spotlightRef.current) {
        gsap.to(spotlightRef.current, {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      spotlightRef.current?.parentNode?.removeChild(spotlightRef.current);
    };
  }, [gridRef, disableAnimations, enabled, spotlightRadius, glowColor]);

  return null;
};

const BentoCardGrid = ({ children, gridRef }) => (
  <div
    className="bento-section grid gap-2 p-3 max-w-[54rem] select-none relative"
    style={{ fontSize: 'clamp(1rem, 0.9rem + 0.5vw, 1.5rem)' }}
    ref={gridRef}
  >
    {children}
  </div>
);

const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

const MagicBento = ({
  textAutoHide = true,
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  disableAnimations = false,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  particleCount = DEFAULT_PARTICLE_COUNT,
  enableTilt = false,
  glowColor = DEFAULT_GLOW_COLOR,
  clickEffect = true,
  enableMagnetism = true
}) => {
  const gridRef = useRef(null);
  const isMobile = useMobileDetection();
  const shouldDisableAnimations = disableAnimations || isMobile;

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [records, setRecords] = useState(null);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [categories, setCategories] = useState(null);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [trends, setTrends] = useState(null);
  const [trendsLoading, setTrendsLoading] = useState(true);
  const [adminSummary, setAdminSummary] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [profileUser, setProfileUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [formAmount, setFormAmount] = useState('');
  const [formType, setFormType] = useState('expense');
  const [formCategory, setFormCategory] = useState('');
  const [formDate, setFormDate] = useState(todayInputDate);
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const resetRecordForm = useCallback(() => {
    setFormAmount('');
    setFormType('expense');
    setFormCategory('');
    setFormDate(todayInputDate());
    setFormNotes('');
    setFormError('');
  }, []);

  const loadDashboardData = useCallback(async () => {
    const meJson = await fetchLedgerJson('/auth/me');

    if (meJson?._unauthorized) {
      setUnauthorized(true);
      setProfileUser(null);
      setProfileLoading(false);
      setSummaryLoading(false);
      setRecordsLoading(false);
      setCategoriesLoading(false);
      setTrendsLoading(false);
      setAdminLoading(false);
      return;
    }

    setUnauthorized(false);
    const user = meJson?.user ?? null;
    setProfileUser(user);
    setProfileLoading(false);

    const isAdmin = user?.role === 'admin';
    if (isAdmin) setAdminLoading(true);

    setSummaryLoading(true);
    setRecordsLoading(true);
    setCategoriesLoading(true);
    setTrendsLoading(true);

    const requests = [
      fetchLedgerJson('/api/dashboard/summary'),
      fetchLedgerJson('/api/records?limit=8&page=1'),
      fetchLedgerJson('/api/dashboard/categories'),
      fetchLedgerJson('/api/dashboard/trends'),
      isAdmin ? fetchLedgerJson('/api/admin/summary') : Promise.resolve(null)
    ];

    const [sumJ, recJ, catJ, trJ, adJ] = await Promise.all(requests);

    if (sumJ && !sumJ._unauthorized) setSummary(sumJ?.data ?? null);
    setSummaryLoading(false);

    if (recJ && !recJ._unauthorized) setRecords(Array.isArray(recJ?.data) ? recJ.data : []);
    setRecordsLoading(false);

    if (catJ && !catJ._unauthorized) setCategories(Array.isArray(catJ?.data) ? catJ.data : []);
    setCategoriesLoading(false);

    if (trJ && !trJ._unauthorized) setTrends(Array.isArray(trJ?.data) ? trJ.data : []);
    setTrendsLoading(false);

    if (isAdmin) {
      if (adJ && !adJ._unauthorized) setAdminSummary(adJ?.data ?? null);
      setAdminLoading(false);
    } else {
      setAdminSummary(null);
      setAdminLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const closeRecordModal = useCallback(() => {
    setRecordModalOpen(false);
    setFormError('');
    setSubmitLoading(false);
  }, []);

  useEffect(() => {
    if (!recordModalOpen) return;
    const onKey = e => {
      if (e.key === 'Escape') closeRecordModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [recordModalOpen, closeRecordModal]);

  const openRecordModal = useCallback(() => {
    resetRecordForm();
    setRecordModalOpen(true);
  }, [resetRecordForm]);

  const handleCreateRecord = useCallback(
    async e => {
      e.preventDefault();
      setFormError('');

      const trimmedCategory = formCategory.trim();
      const amountNum = Number(formAmount);

      if (formAmount === '' || formAmount == null || Number.isNaN(amountNum) || amountNum <= 0) {
        setFormError('Enter a valid amount.');
        return;
      }
      if (!formType || (formType !== 'income' && formType !== 'expense')) {
        setFormError('Select a type (income or expense).');
        return;
      }
      if (!trimmedCategory) {
        setFormError('Category is required.');
        return;
      }
      if (!formDate) {
        setFormError('Date is required.');
        return;
      }

      const parsedDate = new Date(`${formDate}T12:00:00`);
      if (Number.isNaN(parsedDate.getTime())) {
        setFormError('Invalid date.');
        return;
      }

      setSubmitLoading(true);

      try {
        const res = await fetch(`${API_BASE}/api/records`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: amountNum,
            type: formType,
            category: trimmedCategory,
            date: parsedDate.toISOString(),
            notes: formNotes.trim()
          })
        });

        const data = await res.json().catch(() => ({}));

        if (res.status === 401) {
          setFormError('Session expired. Please sign in again.');
          setSubmitLoading(false);
          return;
        }

        if (!res.ok) {
          setFormError(data?.error || data?.message || 'Could not save the record. Try again.');
          setSubmitLoading(false);
          return;
        }

        resetRecordForm();
        setRecordModalOpen(false);
        setSubmitLoading(false);

        const [sumJ, recJ, catJ] = await Promise.all([
          fetchLedgerJson('/api/dashboard/summary'),
          fetchLedgerJson('/api/records?limit=8&page=1'),
          fetchLedgerJson('/api/dashboard/categories')
        ]);

        if (sumJ && !sumJ._unauthorized) setSummary(sumJ?.data ?? null);
        if (recJ && !recJ._unauthorized) setRecords(Array.isArray(recJ?.data) ? recJ.data : []);
        if (catJ && !catJ._unauthorized) setCategories(Array.isArray(catJ?.data) ? catJ.data : []);
      } catch {
        setFormError('Network error. Check your connection and try again.');
        setSubmitLoading(false);
      }
    },
    [formAmount, formType, formCategory, formDate, formNotes, resetRecordForm]
  );

  const inputClass =
    'w-full rounded-lg border border-white/[0.08] bg-black/35 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-white/15 focus:outline-none focus:ring-1 focus:ring-white/10';
  const labelClass = 'mb-1 block text-[11px] font-medium uppercase tracking-wide text-neutral-500';

  const renderCardInner = card => {
    switch (card.key) {
      case 'summary':
        if (summaryLoading) return <CardLoadingState />;
        if (unauthorized) {
          return <CardEmptyState title="No financial data yet" subtitle="Log in to view your summary" />;
        }
        if (summary == null) {
          return (
            <CardEmptyState
              title="No financial data yet"
              subtitle="Add your first transaction to get started"
            />
          );
        }
        return (
          <div className="flex flex-1 flex-col justify-center space-y-2 border-t border-white/[0.06] pt-3 text-xs">
            <div className="flex justify-between gap-2 border-b border-white/[0.06] pb-1.5">
              <span className="text-neutral-500">Total Income</span>
              <span className="tabular-nums text-neutral-100">{formatMoney(summary.income)}</span>
            </div>
            <div className="flex justify-between gap-2 border-b border-white/[0.06] pb-1.5">
              <span className="text-neutral-500">Total Expense</span>
              <span className="tabular-nums text-neutral-300">{formatMoney(summary.expense)}</span>
            </div>
            <div className="flex justify-between gap-2 pt-0.5">
              <span className="text-neutral-500">Net Balance</span>
              <span className="tabular-nums font-medium text-neutral-100">{formatMoney(summary.balance)}</span>
            </div>
          </div>
        );
      case 'records':
        if (recordsLoading) return <CardLoadingState />;
        if (unauthorized) {
          return <CardEmptyState title="No records found" subtitle="Log in to view your transactions" />;
        }
        if (!records?.length) {
          return (
            <CardEmptyState title="No records found" subtitle="Start by adding a new transaction" />
          );
        }
        return (
          <div className="flex min-h-0 flex-1 flex-col border-t border-white/[0.06] pt-3">
            <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-white/[0.06] bg-black/25">
              <div className="max-h-[10rem] w-full overflow-x-auto overflow-y-auto text-[10px] sm:max-h-[11rem] sm:text-xs">
                <table className="w-full min-w-[200px] text-left">
                  <thead className="sticky top-0 bg-[#060010]/95 backdrop-blur-sm">
                    <tr className="border-b border-white/[0.08] text-[0.65rem] uppercase tracking-wide text-neutral-500">
                      <th className="py-1.5 pr-2 pl-2 font-medium">Amount</th>
                      <th className="py-1.5 pr-2 font-medium">Type</th>
                      <th className="py-1.5 pr-2 font-medium">Category</th>
                      <th className="py-1.5 pr-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, ri) => (
                      <tr key={r?._id != null ? String(r._id) : `row-${ri}`} className="border-b border-white/[0.04]">
                        <td className="py-1.5 pr-2 pl-2 tabular-nums text-neutral-200">{formatMoney(r?.amount)}</td>
                        <td className="py-1.5 pr-2 capitalize text-neutral-300">{r?.type ?? '—'}</td>
                        <td
                          className="py-1.5 pr-2 text-clamp-1 max-w-[5rem] text-neutral-300 sm:max-w-[7rem]"
                          title={r?.category}
                        >
                          {r?.category ?? '—'}
                        </td>
                        <td className="py-1.5 pr-2 tabular-nums whitespace-nowrap text-neutral-400">
                          {r?.date ? new Date(r.date).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'admin':
        if (profileLoading) return <CardLoadingState />;
        if (unauthorized) {
          return <CardEmptyState title="No system data available" subtitle="Log in to continue" />;
        }
        if (profileUser?.role !== 'admin') {
          return <CardEmptyState title="Available to administrators." />;
        }
        if (adminLoading) return <CardLoadingState />;
        if (adminSummary == null) {
          return <CardEmptyState title="No system data available" />;
        }
        return (
          <div className="flex flex-1 flex-col justify-center space-y-2 border-t border-white/[0.06] pt-3 text-xs">
            <div className="flex justify-between gap-2 border-b border-white/[0.06] pb-1.5">
              <span className="text-neutral-500">Global Income</span>
              <span className="tabular-nums text-neutral-100">{formatMoney(adminSummary.income)}</span>
            </div>
            <div className="flex justify-between gap-2 border-b border-white/[0.06] pb-1.5">
              <span className="text-neutral-500">Global Expense</span>
              <span className="tabular-nums text-neutral-300">{formatMoney(adminSummary.expense)}</span>
            </div>
            {adminSummary.totalUser != null && (
              <div className="flex justify-between gap-2 pt-0.5">
                <span className="text-neutral-500">Total Users</span>
                <span className="tabular-nums text-neutral-200">{String(adminSummary.totalUser)}</span>
              </div>
            )}
          </div>
        );
      case 'categories':
        if (categoriesLoading) return <CardLoadingState />;
        if (unauthorized) {
          return <CardEmptyState title="No category data available" subtitle="Log in to continue" />;
        }
        if (!categories?.length) {
          return <CardEmptyState title="No category data available" />;
        }
        return (
          <div className="flex min-h-0 flex-1 flex-col border-t border-white/[0.06] pt-3">
            <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-white/[0.06] bg-black/25">
              <ul className="max-h-[10rem] space-y-0 overflow-y-auto text-xs sm:max-h-[11rem]">
                {categories.map((row, i) => (
                  <li
                    key={`${row?.categoryName ?? 'c'}-${i}`}
                    className="flex justify-between gap-2 border-b border-white/[0.04] px-2 py-2 last:border-b-0"
                  >
                    <span className="truncate text-neutral-300" title={row?.categoryName}>
                      {row?.categoryName ?? '—'}
                    </span>
                    <span className="shrink-0 tabular-nums text-neutral-200">{formatMoney(row?.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      case 'trends':
        if (trendsLoading) return <CardLoadingState />;
        if (unauthorized) {
          return <CardEmptyState title="No trends available yet" subtitle="Log in to continue" />;
        }
        if (!trends?.length) {
          return <CardEmptyState title="No trends available yet" />;
        }
        return (
          <div className="flex min-h-0 flex-1 flex-col border-t border-white/[0.06] pt-3">
            <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-white/[0.06] bg-black/25">
              <div className="max-h-[10rem] overflow-x-auto overflow-y-auto text-[10px] sm:max-h-[11rem] sm:text-xs">
                <table className="w-full min-w-[180px] text-left">
                  <thead className="sticky top-0 bg-[#060010]/95 backdrop-blur-sm">
                    <tr className="border-b border-white/[0.08] text-[0.65rem] uppercase tracking-wide text-neutral-500">
                      <th className="py-1.5 pr-2 pl-2 font-medium">Month</th>
                      <th className="py-1.5 pr-2 font-medium">Income</th>
                      <th className="py-1.5 pr-2 font-medium">Expense</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trends.map((row, i) => (
                      <tr key={`${row?.year}-${row?.month}-${i}`} className="border-b border-white/[0.04]">
                        <td className="py-1.5 pr-2 pl-2 whitespace-nowrap text-neutral-300">
                          {formatMonthYear(row?.month, row?.year)}
                        </td>
                        <td className="py-1.5 pr-2 tabular-nums text-neutral-200">{formatMoney(row?.income)}</td>
                        <td className="py-1.5 pr-2 tabular-nums text-neutral-400">{formatMoney(row?.expense)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'profile':
        if (profileLoading) return <CardLoadingState />;
        if (unauthorized || !profileUser) {
          return (
            <CardEmptyState
              title="User data unavailable"
              subtitle={unauthorized ? 'Log in to continue' : undefined}
            />
          );
        }
        return (
          <div className="flex flex-1 flex-col justify-center space-y-3 border-t border-white/[0.06] pt-3 text-xs">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-neutral-500">Name</p>
              <p className="text-clamp-1 text-neutral-100">{profileUser.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-neutral-500">Email</p>
              <p className="text-clamp-1 break-all text-neutral-300">{profileUser.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-neutral-500">Role</p>
              <p className="capitalize text-neutral-200">{profileUser.role ?? '—'}</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <style>
        {`
          .bento-section {
            --glow-x: 50%;
            --glow-y: 50%;
            --glow-intensity: 0;
            --glow-radius: 200px;
            --glow-color: ${glowColor};
            --border-color: #392e4e;
            --background-dark: #060010;
            --white: hsl(0, 0%, 100%);
            --purple-primary: rgba(132, 0, 255, 1);
            --purple-glow: rgba(132, 0, 255, 0.2);
            --purple-border: rgba(132, 0, 255, 0.8);
          }
          
          .card-responsive {
            grid-template-columns: 1fr;
            width: 90%;
            margin: 0 auto;
            padding: 0.5rem;
          }
          
          @media (min-width: 600px) {
            .card-responsive {
              grid-template-columns: repeat(2, 1fr);
            }
          }
          
          @media (min-width: 1024px) {
            .card-responsive {
              grid-template-columns: repeat(4, 1fr);
            }
            
            .card-responsive .card:nth-child(3) {
              grid-column: span 2;
              grid-row: span 2;
            }
            
            .card-responsive .card:nth-child(4) {
              grid-column: 1 / span 2;
              grid-row: 2 / span 2;
            }
            
            .card-responsive .card:nth-child(6) {
              grid-column: 4;
              grid-row: 3;
            }
          }
          
          .card--border-glow::after {
            content: '';
            position: absolute;
            inset: 0;
            padding: 6px;
            background: radial-gradient(var(--glow-radius) circle at var(--glow-x) var(--glow-y),
                rgba(${glowColor}, calc(var(--glow-intensity) * 0.8)) 0%,
                rgba(${glowColor}, calc(var(--glow-intensity) * 0.4)) 30%,
                transparent 60%);
            border-radius: inherit;
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            mask-composite: exclude;
            pointer-events: none;
            opacity: 1;
            transition: opacity 0.3s ease;
            z-index: 1;
          }
          
          .card--border-glow:hover::after {
            opacity: 1;
          }
          
          .card--border-glow:hover {
            box-shadow: 0 4px 20px rgba(46, 24, 78, 0.4), 0 0 30px rgba(${glowColor}, 0.2);
          }
          
          .particle::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: rgba(${glowColor}, 0.2);
            border-radius: 50%;
            z-index: -1;
          }
          
          .particle-container:hover {
            box-shadow: 0 4px 20px rgba(46, 24, 78, 0.2), 0 0 30px rgba(${glowColor}, 0.2);
          }
          
          .text-clamp-1 {
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 1;
            line-clamp: 1;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .text-clamp-2 {
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            line-clamp: 2;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          @media (max-width: 599px) {
            .card-responsive {
              grid-template-columns: 1fr;
              width: 90%;
              margin: 0 auto;
              padding: 0.5rem;
            }
            
            .card-responsive .card {
              width: 100%;
              min-height: 240px;
            }
          }
        `}
      </style>

      {enableSpotlight && (
        <GlobalSpotlight
          gridRef={gridRef}
          disableAnimations={shouldDisableAnimations}
          enabled={enableSpotlight}
          spotlightRadius={spotlightRadius}
          glowColor={glowColor}
        />
      )}

      <div className="relative mx-auto w-full max-w-[54rem]">
        <div className="mb-2 flex justify-end px-3 sm:mb-3 sm:px-4">
          {!unauthorized && !profileLoading && (
            <button
              type="button"
              onClick={openRecordModal}
              className="pointer-events-auto rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs font-medium text-neutral-100 transition-colors hover:border-white/[0.16] hover:bg-white/[0.07]"
            >
              + Add Record
            </button>
          )}
        </div>

        <BentoCardGrid gridRef={gridRef}>
          <div className="card-responsive grid gap-3">
          {DASHBOARD_CARDS.map((card, index) => {
            const baseClassName = `card relative flex min-h-[240px] w-full max-w-full flex-col gap-3 overflow-hidden p-5 sm:min-h-[250px] md:min-h-[260px] md:p-6 rounded-[20px] border border-solid font-light transition-colors duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)] ${
              enableBorderGlow ? 'card--border-glow' : ''
            }`;

            const cardStyle = {
              backgroundColor: card.color || 'var(--background-dark)',
              borderColor: 'var(--border-color)',
              color: 'var(--white)',
              '--glow-x': '50%',
              '--glow-y': '50%',
              '--glow-intensity': '0',
              '--glow-radius': '200px'
            };

            if (enableStars) {
              return (
                <ParticleCard
                  key={card.key}
                  className={baseClassName}
                  style={cardStyle}
                  disableAnimations={shouldDisableAnimations}
                  particleCount={particleCount}
                  glowColor={glowColor}
                  enableTilt={enableTilt}
                  clickEffect={clickEffect}
                  enableMagnetism={enableMagnetism}
                >
                  <div className="card__header relative flex shrink-0 justify-between gap-3 text-white">
                    <span className="card__label text-base text-neutral-400">{card.label}</span>
                  </div>
                  <div className="card__content relative flex min-h-0 flex-1 flex-col gap-1 text-white">
                    <h3
                      className={`card__title m-0 shrink-0 text-base font-normal tracking-tight text-neutral-100 ${textAutoHide ? 'text-clamp-1' : ''}`}
                    >
                      {card.title}
                    </h3>
                    <div className="card__description flex min-h-0 flex-1 flex-col text-xs leading-5">
                      {renderCardInner(card)}
                    </div>
                  </div>
                </ParticleCard>
              );
            }

            return (
              <div
                key={card.key}
                className={baseClassName}
                style={cardStyle}
                ref={el => {
                  if (!el) return;

                  const handleMouseMove = e => {
                    if (shouldDisableAnimations) return;

                    const rect = el.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;

                    if (enableTilt) {
                      const rotateX = ((y - centerY) / centerY) * -10;
                      const rotateY = ((x - centerX) / centerX) * 10;

                      gsap.to(el, {
                        rotateX,
                        rotateY,
                        duration: 0.1,
                        ease: 'power2.out',
                        transformPerspective: 1000
                      });
                    }

                    if (enableMagnetism) {
                      const magnetX = (x - centerX) * 0.05;
                      const magnetY = (y - centerY) * 0.05;

                      gsap.to(el, {
                        x: magnetX,
                        y: magnetY,
                        duration: 0.3,
                        ease: 'power2.out'
                      });
                    }
                  };

                  const handleMouseLeave = () => {
                    if (shouldDisableAnimations) return;

                    if (enableTilt) {
                      gsap.to(el, {
                        rotateX: 0,
                        rotateY: 0,
                        duration: 0.3,
                        ease: 'power2.out'
                      });
                    }

                    if (enableMagnetism) {
                      gsap.to(el, {
                        x: 0,
                        y: 0,
                        duration: 0.3,
                        ease: 'power2.out'
                      });
                    }
                  };

                  const handleClick = e => {
                    if (!clickEffect || shouldDisableAnimations) return;

                    const rect = el.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    const maxDistance = Math.max(
                      Math.hypot(x, y),
                      Math.hypot(x - rect.width, y),
                      Math.hypot(x, y - rect.height),
                      Math.hypot(x - rect.width, y - rect.height)
                    );

                    const ripple = document.createElement('div');
                    ripple.style.cssText = `
                      position: absolute;
                      width: ${maxDistance * 2}px;
                      height: ${maxDistance * 2}px;
                      border-radius: 50%;
                      background: radial-gradient(circle, rgba(${glowColor}, 0.4) 0%, rgba(${glowColor}, 0.2) 30%, transparent 70%);
                      left: ${x - maxDistance}px;
                      top: ${y - maxDistance}px;
                      pointer-events: none;
                      z-index: 1000;
                    `;

                    el.appendChild(ripple);

                    gsap.fromTo(
                      ripple,
                      {
                        scale: 0,
                        opacity: 1
                      },
                      {
                        scale: 1,
                        opacity: 0,
                        duration: 0.8,
                        ease: 'power2.out',
                        onComplete: () => ripple.remove()
                      }
                    );
                  };

                  el.addEventListener('mousemove', handleMouseMove);
                  el.addEventListener('mouseleave', handleMouseLeave);
                  el.addEventListener('click', handleClick);
                }}
              >
                <div className="card__header relative flex shrink-0 justify-between gap-3 text-white">
                  <span className="card__label text-base text-neutral-400">{card.label}</span>
                </div>
                <div className="card__content relative flex min-h-0 flex-1 flex-col gap-1 text-white">
                  <h3
                    className={`card__title m-0 shrink-0 text-base font-normal tracking-tight text-neutral-100 ${textAutoHide ? 'text-clamp-1' : ''}`}
                  >
                    {card.title}
                  </h3>
                  <div className="card__description flex min-h-0 flex-1 flex-col text-xs leading-5">{renderCardInner(card)}</div>
                </div>
              </div>
            );
          })}
          </div>
        </BentoCardGrid>
      </div>

      {recordModalOpen ? (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center p-3 sm:p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/75"
            aria-label="Close dialog"
            onClick={closeRecordModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="record-modal-title"
            className="relative z-[1] max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-white/[0.1] bg-[#0c0814] p-4 shadow-2xl sm:p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <h2 id="record-modal-title" className="text-base font-medium text-neutral-100">
                New record
              </h2>
              <button
                type="button"
                onClick={closeRecordModal}
                className="shrink-0 rounded-md p-1 text-lg leading-none text-neutral-500 hover:bg-white/[0.05] hover:text-neutral-300"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="flex flex-col gap-3">
              <datalist id="ledger-category-suggestions">
                {Array.isArray(categories) &&
                  categories.map((c, i) => (
                    <option key={`${String(c?.categoryName)}-${i}`} value={c?.categoryName ?? ''} />
                  ))}
              </datalist>

              <div>
                <label htmlFor="record-amount" className={labelClass}>
                  Amount
                </label>
                <input
                  id="record-amount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  required
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value)}
                  className={inputClass}
                  placeholder="0.00"
                  disabled={submitLoading}
                />
              </div>

              <div>
                <label htmlFor="record-type" className={labelClass}>
                  Type
                </label>
                <select
                  id="record-type"
                  value={formType}
                  onChange={e => setFormType(e.target.value)}
                  className={inputClass}
                  disabled={submitLoading}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>

              <div>
                <label htmlFor="record-category" className={labelClass}>
                  Category
                </label>
                <input
                  id="record-category"
                  type="text"
                  list="ledger-category-suggestions"
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Groceries"
                  disabled={submitLoading}
                />
              </div>

              <div>
                <label htmlFor="record-date" className={labelClass}>
                  Date
                </label>
                <input
                  id="record-date"
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className={inputClass}
                  required
                  disabled={submitLoading}
                />
              </div>

              <div>
                <label htmlFor="record-notes" className={labelClass}>
                  Notes (optional)
                </label>
                <textarea
                  id="record-notes"
                  rows={3}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className={`${inputClass} min-h-[4.5rem] resize-y`}
                  placeholder="Optional details"
                  disabled={submitLoading}
                />
              </div>

              {formError ? (
                <p className="text-xs text-rose-300/90" role="alert">
                  {formError}
                </p>
              ) : null}

              <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeRecordModal}
                  className="rounded-lg border border-white/[0.1] px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/[0.05]"
                  disabled={submitLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="rounded-lg border border-white/[0.12] bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-neutral-100 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {submitLoading ? 'Submitting…' : 'Save record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default MagicBento;
