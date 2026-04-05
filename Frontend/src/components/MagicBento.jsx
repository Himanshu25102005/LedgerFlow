"use client"
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { gsap } from 'gsap';

// Default /express proxies to Express (see src/app/express/[[...path]]/route.js) so
// session cookies stay on the Next.js origin. Override for a remote API in production.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/express';

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

async function fetchLedgerJson(path, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include', ...init });
  if (res.status === 401) return { _unauthorized: true };
  if (!res.ok) {
    let message = res.statusText || 'Request failed';
    try {
      const j = await res.json();
      message = j.error || j.message || message;
    } catch {
      /* ignore */
    }
    return { _fetchError: true, message: String(message) };
  }
  return res.json().catch(() => ({ _fetchError: true, message: 'Invalid response' }));
}

function todayInputDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const RECENT_RECORDS_LIMIT = 5;

const RANGE_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: 'last7days', label: 'Last 7 days' },
  { value: 'last30days', label: 'Last 30 days' },
  { value: 'last6months', label: 'Last 6 months' }
];

const PRESET_CATEGORIES = ['Food', 'Salary', 'Hobby'];

function buildDashboardQuery(filterCategory, filterRange) {
  const q = new URLSearchParams();
  if (filterCategory && filterCategory !== 'All') q.set('category', filterCategory);
  if (filterRange && filterRange !== 'all') q.set('range', filterRange);
  const s = q.toString();
  return s ? `?${s}` : '';
}

function buildRecordsQuery(filterCategory, filterRange, page = 1, limit = RECENT_RECORDS_LIMIT) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (filterCategory && filterCategory !== 'All') q.set('category', filterCategory);
  if (filterRange && filterRange !== 'all') q.set('range', filterRange);
  return `?${q.toString()}`;
}

function formatRoleLabel(role) {
  if (!role) return 'User';
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

/** True when summary has no transaction totals (API returns zeros or missing). */
function isLedgerEmpty(summary) {
  if (summary == null) return true;
  const inc = Number(summary.income);
  const exp = Number(summary.expense);
  if (!Number.isFinite(inc) || !Number.isFinite(exp)) return true;
  return inc === 0 && exp === 0;
}

/** Highest expense category from dashboard breakdown (sorted desc by API). */
function getTopCategoryInsight(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => Number(b?.total) - Number(a?.total));
  const top = sorted[0];
  const total = Number(top?.total);
  const name = top?.categoryName != null ? String(top.categoryName).trim() : '';
  if (!name || !Number.isFinite(total) || total <= 0) return null;
  return { name, total };
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
    className="bento-section relative grid max-w-7xl gap-3 p-4 select-none sm:p-5"
    style={{ fontSize: 'clamp(1.05rem, 1rem + 0.4vw, 1.25rem)' }}
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
  const [adminUserPreview, setAdminUserPreview] = useState([]);
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
  const [toastMessage, setToastMessage] = useState('');

  const [filterCategory, setFilterCategory] = useState('All');
  const [filterRange, setFilterRange] = useState('all');
  const [categoryOptions, setCategoryOptions] = useState(['All', ...PRESET_CATEGORIES]);

  const [sectionErrors, setSectionErrors] = useState({
    summary: '',
    records: '',
    categories: '',
    trends: '',
    admin: ''
  });

  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminUsersError, setAdminUsersError] = useState('');
  const [adminRecords, setAdminRecords] = useState([]);
  const [adminRecordsLoading, setAdminRecordsLoading] = useState(false);
  const [adminRecordsError, setAdminRecordsError] = useState('');
  const [adminActionLoadingId, setAdminActionLoadingId] = useState('');
  const [adminDeleteLoadingId, setAdminDeleteLoadingId] = useState('');

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

    if (meJson?._fetchError) {
      const msg = meJson.message || 'Could not load profile';
      setUnauthorized(false);
      setProfileUser(null);
      setProfileLoading(false);
      setSummaryLoading(false);
      setRecordsLoading(false);
      setCategoriesLoading(false);
      setTrendsLoading(false);
      setAdminLoading(false);
      setSectionErrors({
        summary: msg,
        records: msg,
        categories: msg,
        trends: msg,
        admin: msg
      });
      return;
    }

    if (meJson?._unauthorized) {
      setUnauthorized(true);
      setProfileUser(null);
      setProfileLoading(false);
      setSummaryLoading(false);
      setRecordsLoading(false);
      setCategoriesLoading(false);
      setTrendsLoading(false);
      setAdminLoading(false);
      setSectionErrors({
        summary: '',
        records: '',
        categories: '',
        trends: '',
        admin: ''
      });
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

    const dashQ = buildDashboardQuery(filterCategory, filterRange);
    const recQ = buildRecordsQuery(filterCategory, filterRange, 1, RECENT_RECORDS_LIMIT);
    const catOptionsQ = buildDashboardQuery('All', filterRange);

    const requests = [
      fetchLedgerJson(`/api/dashboard/summary${dashQ}`),
      fetchLedgerJson(`/api/records${recQ}`),
      fetchLedgerJson(`/api/dashboard/categories${dashQ}`),
      fetchLedgerJson(`/api/dashboard/trends${dashQ}`),
      fetchLedgerJson(`/api/dashboard/categories${catOptionsQ}`),
      isAdmin ? fetchLedgerJson(`/api/admin/summary${dashQ}`) : Promise.resolve(null),
      isAdmin ? fetchLedgerJson('/api/admin/user-summary?page=1&limit=5') : Promise.resolve(null)
    ];

    const [sumJ, recJ, catJ, trJ, catOptJ, adJ, userSumJ] = await Promise.all(requests);

    const nextErrors = {
      summary: '',
      records: '',
      categories: '',
      trends: '',
      admin: ''
    };

    if (sumJ?._fetchError) {
      nextErrors.summary = sumJ.message;
      setSummary(null);
    } else if (sumJ && !sumJ._unauthorized) {
      setSummary(sumJ?.data ?? null);
    }
    setSummaryLoading(false);

    if (recJ?._fetchError) {
      nextErrors.records = recJ.message;
      setRecords([]);
    } else if (recJ && !recJ._unauthorized) {
      setRecords(Array.isArray(recJ?.data) ? recJ.data : []);
    }
    setRecordsLoading(false);

    if (catJ?._fetchError) {
      nextErrors.categories = catJ.message;
      setCategories([]);
    } else if (catJ && !catJ._unauthorized) {
      setCategories(Array.isArray(catJ?.data) ? catJ.data : []);
    }
    setCategoriesLoading(false);

    if (trJ?._fetchError) {
      nextErrors.trends = trJ.message;
      setTrends([]);
    } else if (trJ && !trJ._unauthorized) {
      setTrends(Array.isArray(trJ?.data) ? trJ.data : []);
    }
    setTrendsLoading(false);

    if (catOptJ && !catOptJ._unauthorized && !catOptJ._fetchError && Array.isArray(catOptJ?.data)) {
      const names = catOptJ.data
        .map(row => row?.categoryName)
        .filter(Boolean)
        .map(String);
      const merged = ['All', ...PRESET_CATEGORIES];
      for (const n of names) {
        if (!merged.includes(n)) merged.push(n);
      }
      setCategoryOptions(merged);
    }

    if (isAdmin) {
      if (adJ?._fetchError) {
        nextErrors.admin = adJ.message;
        setAdminSummary(null);
      } else if (adJ && !adJ._unauthorized) {
        setAdminSummary(adJ?.data ?? null);
      }
      if (userSumJ && !userSumJ._unauthorized && !userSumJ._fetchError && Array.isArray(userSumJ?.data)) {
        setAdminUserPreview(userSumJ.data);
      } else {
        setAdminUserPreview([]);
      }
      setAdminLoading(false);
    } else {
      setAdminSummary(null);
      setAdminUserPreview([]);
      setAdminLoading(false);
    }

    setSectionErrors(nextErrors);
  }, [filterCategory, filterRange]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const loadAdminPanelData = useCallback(async () => {
    setAdminUsersLoading(true);
    setAdminRecordsLoading(true);
    setAdminUsersError('');
    setAdminRecordsError('');

    const uJ = await fetchLedgerJson('/api/users');
    const rJ = await fetchLedgerJson(`/api/records${buildRecordsQuery('All', 'all', 1, 100)}`);

    if (uJ?._fetchError || uJ?._unauthorized) {
      setAdminUsersError(uJ?.message || 'Could not load users');
      setAdminUsers([]);
    } else {
      setAdminUsers(Array.isArray(uJ?.data) ? uJ.data : []);
    }
    setAdminUsersLoading(false);

    if (rJ?._fetchError || rJ?._unauthorized) {
      setAdminRecordsError(rJ?.message || 'Could not load records');
      setAdminRecords([]);
    } else {
      setAdminRecords(Array.isArray(rJ?.data) ? rJ.data : []);
    }
    setAdminRecordsLoading(false);
  }, []);

  useEffect(() => {
    if (!adminPanelOpen) return;
    loadAdminPanelData();
  }, [adminPanelOpen, loadAdminPanelData]);

  const closeAdminPanel = useCallback(() => {
    setAdminPanelOpen(false);
  }, []);

  const patchUserStatus = useCallback(
    async (userId, nextStatus) => {
      setAdminActionLoadingId(`s-${userId}`);
      try {
        const res = await fetch(`${API_BASE}/api/users/${userId}/status`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setAdminUsersError(data?.error || data?.message || 'Could not update status');
        } else {
          await loadAdminPanelData();
          await loadDashboardData();
        }
      } catch {
        setAdminUsersError('Network error while updating user');
      } finally {
        setAdminActionLoadingId('');
      }
    },
    [loadAdminPanelData, loadDashboardData]
  );

  const patchUserRole = useCallback(
    async (userId, role) => {
      setAdminActionLoadingId(`r-${userId}`);
      try {
        const res = await fetch(`${API_BASE}/api/users/${userId}/role`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setAdminUsersError(data?.error || data?.message || 'Could not update role');
        } else {
          await loadAdminPanelData();
        }
      } catch {
        setAdminUsersError('Network error while updating role');
      } finally {
        setAdminActionLoadingId('');
      }
    },
    [loadAdminPanelData]
  );

  const adminSoftDeleteRecord = useCallback(
    async recordId => {
      setAdminDeleteLoadingId(String(recordId));
      try {
        const res = await fetch(`${API_BASE}/api/records/${recordId}/delete`, {
          method: 'DELETE',
          credentials: 'include'
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setAdminRecordsError(data?.error || data?.message || 'Could not delete record');
        } else {
          await loadAdminPanelData();
          await loadDashboardData();
          setToastMessage('Record removed.');
        }
      } catch {
        setAdminRecordsError('Network error while deleting record');
      } finally {
        setAdminDeleteLoadingId('');
      }
    },
    [loadAdminPanelData, loadDashboardData]
  );

  useEffect(() => {
    if (!adminPanelOpen) return;
    const onKey = e => {
      if (e.key === 'Escape') closeAdminPanel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [adminPanelOpen, closeAdminPanel]);

  useEffect(() => {
    if (profileLoading) return;
    if (!profileUser || profileUser.role !== 'admin') {
      setAdminPanelOpen(false);
    }
  }, [profileLoading, profileUser]);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(''), 4200);
    return () => clearTimeout(t);
  }, [toastMessage]);

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

        const dashQ = buildDashboardQuery(filterCategory, filterRange);
        const recQ = buildRecordsQuery(filterCategory, filterRange, 1, RECENT_RECORDS_LIMIT);
        const [sumJ, recJ, catJ, trJ] = await Promise.all([
          fetchLedgerJson(`/api/dashboard/summary${dashQ}`),
          fetchLedgerJson(`/api/records${recQ}`),
          fetchLedgerJson(`/api/dashboard/categories${dashQ}`),
          fetchLedgerJson(`/api/dashboard/trends${dashQ}`)
        ]);

        if (sumJ && !sumJ._unauthorized && !sumJ._fetchError) setSummary(sumJ?.data ?? null);
        if (recJ && !recJ._unauthorized && !recJ._fetchError)
          setRecords(Array.isArray(recJ?.data) ? recJ.data : []);
        if (catJ && !catJ._unauthorized && !catJ._fetchError)
          setCategories(Array.isArray(catJ?.data) ? catJ.data : []);
        if (trJ && !trJ._unauthorized && !trJ._fetchError)
          setTrends(Array.isArray(trJ?.data) ? trJ.data : []);
        setToastMessage('Record saved successfully.');
      } catch {
        setFormError('Network error. Check your connection and try again.');
        setSubmitLoading(false);
      }
    },
    [formAmount, formType, formCategory, formDate, formNotes, resetRecordForm, filterCategory, filterRange]
  );

  const inputClass =
    'w-full rounded-lg border border-white/[0.08] bg-black/35 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-white/15 focus:outline-none focus:ring-1 focus:ring-white/10';
  const labelClass = 'mb-1 block text-[11px] font-medium uppercase tracking-wide text-neutral-500';

  const isAdmin = profileUser?.role === 'admin';
  const isAnalyst = profileUser?.role === 'analyst';
  const isViewer = profileUser?.role === 'viewer';
  const showRecordOwner = isAdmin || isAnalyst;

  const showAdminCard = Boolean(!profileLoading && isAdmin);
  const visibleCards = DASHBOARD_CARDS.filter(c => c.key !== 'admin' || showAdminCard);
  const canAddRecord =
    !unauthorized && !profileLoading && profileUser && !isAnalyst;

  const topCategoryInsight = useMemo(() => getTopCategoryInsight(categories), [categories]);

  const displayName = profileUser?.name || profileUser?.username || 'User';

  const renderCardInner = card => {
    switch (card.key) {
      case 'summary':
        if (summaryLoading) return <CardLoadingState />;
        if (sectionErrors.summary) {
          return <CardEmptyState title="Error" subtitle={sectionErrors.summary} />;
        }
        if (unauthorized) {
          return <CardEmptyState title="No financial data yet" subtitle="Log in to view your summary" />;
        }
        if (isLedgerEmpty(summary)) {
          return <CardEmptyState title="No transactions yet" />;
        }
        {
          const bal = Number(summary.balance);
          const netClass =
            bal > 0
              ? 'text-emerald-400/95'
              : bal < 0
                ? 'text-rose-400/95'
                : 'text-neutral-200';
          return (
            <div className="flex flex-1 flex-col justify-center space-y-4 border-t border-white/[0.06] pt-4 text-sm">
              <div className="flex items-baseline justify-between gap-3 border-b border-white/[0.06] pb-3">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Total Income</span>
                <span className="text-base font-medium tabular-nums tracking-tight text-neutral-100 sm:text-lg">
                  {formatMoney(summary.income)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-b border-white/[0.06] pb-3">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Total Expense</span>
                <span className="text-base font-medium tabular-nums tracking-tight text-neutral-300 sm:text-lg">
                  {formatMoney(summary.expense)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3 pt-1">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Net Balance</span>
                <span className={`text-lg font-semibold tabular-nums tracking-tight sm:text-xl ${netClass}`}>
                  {formatMoney(summary.balance)}
                </span>
              </div>
              {isAnalyst && topCategoryInsight ? (
                <p className="mt-3 border-t border-white/[0.08] pt-3 text-[11px] leading-snug text-amber-100/85">
                  <span className="text-neutral-500">Top category: </span>
                  <span className="font-medium text-neutral-100">{topCategoryInsight.name}</span>
                  <span className="tabular-nums text-neutral-300"> ({formatMoney(topCategoryInsight.total)})</span>
                </p>
              ) : null}
            </div>
          );
        }
      case 'records':
        if (recordsLoading) return <CardLoadingState />;
        if (sectionErrors.records) {
          return <CardEmptyState title="Error" subtitle={sectionErrors.records} />;
        }
        if (unauthorized) {
          return <CardEmptyState title="No records found" subtitle="Log in to view your transactions" />;
        }
        {
          const filterSelectClass =
            'w-full rounded-lg border border-white/[0.08] bg-black/35 px-2 py-2 text-xs text-neutral-100 focus:border-white/15 focus:outline-none focus:ring-1 focus:ring-white/10 sm:max-w-[11rem]';
          const rangeBtnClass = (active) =>
            `rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors ${
              active
                ? 'border-white/20 bg-white/[0.1] text-neutral-100'
                : 'border-white/[0.08] bg-black/25 text-neutral-400 hover:border-white/12 hover:text-neutral-200'
            }`;
          const recent = records?.length ? records.slice(0, RECENT_RECORDS_LIMIT) : [];
          return (
            <div className="flex min-h-0 flex-1 flex-col gap-3 border-t border-white/[0.06] pt-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
                <label className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-[12rem]">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                    Category
                  </span>
                  <select
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                    className={filterSelectClass}
                    aria-label="Filter by category"
                  >
                    {categoryOptions.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                    Date range
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {RANGE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        className={rangeBtnClass(filterRange === opt.value)}
                        onClick={() => setFilterRange(opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {!recent.length ? (
                <CardEmptyState title="No records found for selected filters" />
              ) : (
            <div className="records-scroll-area min-h-0 max-h-[11.5rem] flex-1 overflow-y-auto overflow-x-hidden rounded-lg border border-white/[0.06] bg-black/25 px-2 py-2 sm:max-h-[12.5rem]">
                <ul className="flex flex-col gap-2.5 pb-0.5">
                  {recent.map((r, ri) => (
                    <li
                      key={r?._id != null ? String(r._id) : `row-${ri}`}
                      className="shrink-0 rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2.5 sm:px-3.5 sm:py-3"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-base font-medium tabular-nums text-neutral-100">
                          {formatMoney(r?.amount)}
                        </span>
                        <span className="shrink-0 rounded bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium capitalize text-neutral-400">
                          {r?.type ?? '—'}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-neutral-500">
                        <span className="min-w-0 truncate text-neutral-400" title={r?.category}>
                          {r?.category ?? '—'}
                        </span>
                        <span className="shrink-0 tabular-nums text-neutral-500">
                          {r?.date ? new Date(r.date).toLocaleDateString() : '—'}
                        </span>
                      </div>
                      {showRecordOwner && (r?.user?.name || r?.user?.email) ? (
                        <div
                          className="mt-1 truncate text-[10px] text-neutral-600"
                          title={r?.user?.email || r?.user?.name || ''}
                        >
                          {r?.user?.name || r?.user?.email}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
              )}
            </div>
          );
        }
      case 'admin':
        if (profileLoading) return <CardLoadingState />;
        if (sectionErrors.admin) {
          return <CardEmptyState title="Error" subtitle={sectionErrors.admin} />;
        }
        if (unauthorized) {
          return <CardEmptyState title="No system data available" subtitle="Log in to continue" />;
        }
        if (adminLoading) return <CardLoadingState />;
        if (adminSummary == null) {
          return <CardEmptyState title="No system data available" />;
        }
        return (
          <div className="flex min-h-0 flex-1 flex-col justify-start overflow-y-auto border-t border-white/[0.06] pt-3 text-xs">
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-2 border-b border-white/[0.06] pb-2">
                <span className="text-neutral-500">Global Income</span>
                <span className="tabular-nums text-sm font-medium text-neutral-100 sm:text-base">
                  {formatMoney(adminSummary.income)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2 border-b border-white/[0.06] pb-2">
                <span className="text-neutral-500">Global Expense</span>
                <span className="tabular-nums text-sm font-medium text-neutral-300 sm:text-base">
                  {formatMoney(adminSummary.expense)}
                </span>
              </div>
              {adminSummary.totalUser != null && (
                <div className="flex items-baseline justify-between gap-2 pt-0.5">
                  <span className="text-neutral-500">Total Users</span>
                  <span className="tabular-nums text-sm font-medium text-neutral-200">
                    {String(adminSummary.totalUser)}
                  </span>
                </div>
              )}
            </div>
            {adminUserPreview?.length > 0 ? (
              <div className="mt-4 border-t border-white/[0.08] pt-3">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                  Users summary
                </p>
                <ul className="space-y-2">
                  {adminUserPreview.map((u, idx) => (
                    <li
                      key={u?.user != null ? String(u.user) : `u-${idx}`}
                      className="flex items-start justify-between gap-2 rounded-md border border-white/[0.06] bg-black/25 px-2.5 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-neutral-200">{u?.name ?? '—'}</p>
                        <p className="truncate text-[10px] text-neutral-500">{u?.email ?? '—'}</p>
                      </div>
                      <span className="shrink-0 text-xs font-medium tabular-nums text-neutral-300">
                        {formatMoney(u?.balance)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        );
      case 'categories':
        if (categoriesLoading) return <CardLoadingState />;
        if (sectionErrors.categories) {
          return <CardEmptyState title="Error" subtitle={sectionErrors.categories} />;
        }
        if (unauthorized) {
          return <CardEmptyState title="No category data available" subtitle="Log in to continue" />;
        }
        if (!categories?.length) {
          return <CardEmptyState title="No category data available" />;
        }
        return (
          <div className={`flex flex-1 flex-col border-t border-white/[0.06] ${isAnalyst ? 'pt-3' : 'pt-4'}`}>
            {isAnalyst ? (
              <p className="mb-3 text-[10px] font-medium uppercase tracking-wide text-amber-200/70">
                Expense breakdown (all users)
              </p>
            ) : null}
            <ul className={`flex flex-col divide-y divide-white/[0.06] ${isAnalyst ? 'gap-0.5' : ''}`}>
              {categories.map((row, i) => (
                <li
                  key={`${row?.categoryName ?? 'c'}-${i}`}
                  className={`flex items-center justify-between gap-4 first:pt-1 ${isAnalyst ? 'py-3.5' : 'py-3'}`}
                >
                  <span
                    className={`min-w-0 flex-1 leading-snug text-neutral-200 ${isAnalyst ? 'text-[15px]' : 'text-sm'}`}
                    title={row?.categoryName}
                  >
                    {row?.categoryName ?? '—'}
                  </span>
                  <span className="shrink-0 text-right text-sm font-medium tabular-nums text-neutral-100">
                    {formatMoney(row?.total)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      case 'trends':
        if (trendsLoading) return <CardLoadingState />;
        if (sectionErrors.trends) {
          return <CardEmptyState title="Error" subtitle={sectionErrors.trends} />;
        }
        if (unauthorized) {
          return <CardEmptyState title="No trends available yet" subtitle="Log in to continue" />;
        }
        if (!trends?.length) {
          return <CardEmptyState title="No trends available for selected range" />;
        }
        return (
          <div className={`flex flex-1 flex-col border-t border-white/[0.06] ${isAnalyst ? 'pt-3' : 'pt-4'}`}>
            {isAnalyst ? (
              <p className="mb-3 text-[10px] font-medium uppercase tracking-wide text-amber-200/70">
                Monthly income vs expense (all users)
              </p>
            ) : null}
            <ul className={`flex flex-col ${isAnalyst ? 'gap-3' : 'gap-2.5'}`}>
              {trends.map((row, i) => (
                <li
                  key={`${row?.year}-${row?.month}-${i}`}
                  className={`rounded-lg border bg-black/30 px-3 py-3 sm:px-3.5 ${
                    isAnalyst ? 'border-amber-500/25' : 'border-white/[0.08]'
                  }`}
                >
                  <p className="text-sm font-medium text-neutral-200">{formatMonthYear(row?.month, row?.year)}</p>
                  <div className="mt-2 flex flex-col gap-1.5 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="flex items-baseline justify-between gap-2 sm:block sm:text-left">
                      <span className="text-neutral-500">Income</span>
                      <span className="tabular-nums text-sm font-medium text-neutral-100">
                        {formatMoney(row?.income)}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2 sm:block sm:text-right">
                      <span className="text-neutral-500">Expense</span>
                      <span className="tabular-nums text-sm font-medium text-neutral-400">
                        {formatMoney(row?.expense)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
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
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
            padding: 0.5rem;
          }
          
          @media (min-width: 600px) {
            .card-responsive {
              grid-template-columns: repeat(2, 1fr);
              width: 100%;
            }
          }
          
          @media (min-width: 1024px) {
            .card-responsive {
              grid-template-columns: repeat(4, 1fr);
              width: 100%;
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

            .card-responsive--no-admin .card:nth-child(3) {
              grid-column: span 2;
              grid-row: span 2;
            }

            .card-responsive--no-admin .card:nth-child(4) {
              grid-column: 1 / span 2;
              grid-row: 2 / span 2;
            }

            .card-responsive--no-admin .card:nth-child(5) {
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

          .records-scroll-area {
            scroll-behavior: smooth;
            scrollbar-gutter: stable;
            scrollbar-width: thin;
            scrollbar-color: transparent transparent;
          }

          .records-scroll-area:hover {
            scrollbar-color: rgba(255, 255, 255, 0.28) transparent;
          }

          .records-scroll-area::-webkit-scrollbar {
            width: 5px;
          }

          .records-scroll-area::-webkit-scrollbar-track {
            background: transparent;
            margin: 4px 0;
          }

          .records-scroll-area::-webkit-scrollbar-thumb {
            background-color: transparent;
            border-radius: 999px;
            transition: background-color 0.3s ease;
          }

          .records-scroll-area:hover::-webkit-scrollbar-thumb {
            background-color: rgba(255, 255, 255, 0.22);
          }

          .records-scroll-area::-webkit-scrollbar-thumb:active {
            background-color: rgba(255, 255, 255, 0.35);
          }
          
          @media (max-width: 599px) {
            .card-responsive {
              grid-template-columns: 1fr;
              width: 100%;
              margin: 0 auto;
              padding: 0.5rem;
            }
            
            .card-responsive .card {
              width: 100%;
              min-height: 270px;
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

      <div className="relative mx-auto w-full max-w-7xl px-2 sm:px-4">
        <div className="mb-3 flex flex-col gap-3 px-3 sm:mb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-4">
          <div className="min-w-0 space-y-1">
            {!unauthorized && profileUser && (
              <>
                <p className="text-base font-medium leading-snug text-neutral-100 sm:text-lg">
                  {displayName}
                  <span className="ml-2 text-sm font-normal text-violet-300/85">
                    ({formatRoleLabel(profileUser.role)})
                  </span>
                </p>
                {isAnalyst ? (
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium tracking-tight text-amber-200/90">
                      Analyst Mode: Insights Only
                    </p>
                    <p className="text-[11px] leading-relaxed text-neutral-500">
                      Full visibility of your financial data without modification access
                    </p>
                  </div>
                ) : null}
                <p className="text-xs text-neutral-500">
                  {isAdmin
                    ? 'Viewing: System-wide Data'
                    : isAnalyst
                      ? 'Viewing: All users — read-only analytics'
                      : isViewer
                        ? 'Basic View Mode · Personal data'
                        : 'Viewing: Personal Data'}
                </p>
              </>
            )}
            {unauthorized && !profileLoading ? (
              <p className="text-sm text-neutral-500">Sign in to continue</p>
            ) : null}
            {profileLoading ? (
              <p className="text-xs text-neutral-500">Loading profile…</p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            {canAddRecord ? (
              <button
                type="button"
                onClick={openRecordModal}
                className="pointer-events-auto rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs font-medium text-neutral-100 transition-colors hover:border-white/[0.16] hover:bg-white/[0.07]"
              >
                + Add Record
              </button>
            ) : null}
            {!unauthorized && !profileLoading && isViewer ? (
              <p className="max-w-[16rem] text-right text-[10px] leading-relaxed text-neutral-600 sm:max-w-none">
                You can add records; edits and deletes require an admin.
              </p>
            ) : null}
          </div>
        </div>

        <BentoCardGrid gridRef={gridRef}>
          <div
            className={`card-responsive grid gap-4 sm:gap-5 ${showAdminCard ? '' : 'card-responsive--no-admin'}`}
          >
          {visibleCards.map((card, index) => {
            const analystInsightsCard =
              isAnalyst && (card.key === 'categories' || card.key === 'trends');
            const baseClassName = `card relative flex min-h-[270px] w-full max-w-full flex-col gap-3.5 overflow-hidden p-5 sm:min-h-[280px] sm:p-6 md:min-h-[280px] md:p-7 rounded-[20px] border border-solid font-light transition-colors duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)] ${
              enableBorderGlow ? 'card--border-glow' : ''
            } ${analystInsightsCard ? 'ring-1 ring-amber-500/20' : ''}`;

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
                  <div className="card__header relative flex shrink-0 flex-wrap items-center justify-between gap-2 text-white">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="card__label text-base text-neutral-400">{card.label}</span>
                      {analystInsightsCard ? (
                        <span className="shrink-0 rounded bg-amber-500/12 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-200/85">
                          Insights
                        </span>
                      ) : null}
                    </div>
                    {card.key === 'admin' && showAdminCard ? (
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setAdminPanelOpen(true)}
                          className="rounded-md border border-white/[0.1] bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-neutral-100 hover:border-white/[0.16] hover:bg-white/[0.07]"
                        >
                          Manage
                        </button>
                        <span className="rounded border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-violet-200/90">
                          Admin Panel
                        </span>
                      </div>
                    ) : null}
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
                <div className="card__header relative flex shrink-0 flex-wrap items-center justify-between gap-2 text-white">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="card__label text-base text-neutral-400">{card.label}</span>
                    {analystInsightsCard ? (
                      <span className="shrink-0 rounded bg-amber-500/12 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-200/85">
                        Insights
                      </span>
                    ) : null}
                  </div>
                  {card.key === 'admin' && showAdminCard ? (
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setAdminPanelOpen(true)}
                        className="rounded-md border border-white/[0.1] bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-neutral-100 hover:border-white/[0.16] hover:bg-white/[0.07]"
                      >
                        Manage
                      </button>
                      <span className="rounded border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-violet-200/90">
                        Admin Panel
                      </span>
                    </div>
                  ) : null}
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

      {adminPanelOpen && isAdmin ? (
        <div
          className="fixed inset-0 z-[520] flex items-center justify-center p-3 sm:p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/75"
            aria-label="Close admin panel"
            onClick={closeAdminPanel}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-panel-title"
            className="relative z-[1] max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-white/[0.1] bg-[#0c0814] p-4 shadow-2xl sm:p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <h2 id="admin-panel-title" className="text-base font-medium text-neutral-100">
                Admin management
              </h2>
              <button
                type="button"
                onClick={closeAdminPanel}
                className="shrink-0 rounded-md p-1 text-lg leading-none text-neutral-500 hover:bg-white/[0.05] hover:text-neutral-300"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <section>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Users</h3>
                {adminUsersError ? (
                  <p className="text-xs text-rose-300/90" role="alert">
                    {adminUsersError}
                  </p>
                ) : null}
                {adminUsersLoading ? (
                  <p className="text-[11px] text-neutral-500">Loading...</p>
                ) : !adminUsers?.length ? (
                  <p className="text-[11px] text-neutral-500">No data available</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-white/[0.08]">
                    <table className="w-full min-w-[28rem] border-collapse text-left text-[11px] text-neutral-300">
                      <thead>
                        <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-wide text-neutral-500">
                          <th className="px-2 py-2 font-medium">Name</th>
                          <th className="px-2 py-2 font-medium">Email</th>
                          <th className="px-2 py-2 font-medium">Role</th>
                          <th className="px-2 py-2 font-medium">Status</th>
                          <th className="px-2 py-2 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminUsers.map(u => {
                          const uid = u?._id != null ? String(u._id) : '';
                          const busy = adminActionLoadingId === `s-${uid}` || adminActionLoadingId === `r-${uid}`;
                          return (
                            <tr key={uid || u?.email} className="border-b border-white/[0.06] last:border-0">
                              <td className="px-2 py-2 align-top text-neutral-200">{u?.name ?? '—'}</td>
                              <td className="max-w-[10rem] truncate px-2 py-2 align-top text-neutral-400" title={u?.email}>
                                {u?.email ?? '—'}
                              </td>
                              <td className="px-2 py-2 align-top">
                                <select
                                  value={u?.role ?? 'viewer'}
                                  disabled={busy}
                                  onChange={e => patchUserRole(uid, e.target.value)}
                                  className="w-full max-w-[6.5rem] rounded border border-white/[0.1] bg-black/40 px-1 py-1 text-[11px] text-neutral-100"
                                  aria-label={`Role for ${u?.name || 'user'}`}
                                >
                                  <option value="viewer">Viewer</option>
                                  <option value="analyst">Analyst</option>
                                  <option value="admin">Admin</option>
                                </select>
                              </td>
                              <td className="px-2 py-2 align-top capitalize text-neutral-400">{u?.status ?? '—'}</td>
                              <td className="px-2 py-2 align-top">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    patchUserStatus(uid, u?.status === 'active' ? 'inactive' : 'active')
                                  }
                                  className="rounded border border-white/[0.1] px-2 py-1 text-[10px] text-neutral-200 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {u?.status === 'active' ? 'Deactivate' : 'Activate'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Records</h3>
                {adminRecordsError ? (
                  <p className="text-xs text-rose-300/90" role="alert">
                    {adminRecordsError}
                  </p>
                ) : null}
                {adminRecordsLoading ? (
                  <p className="text-[11px] text-neutral-500">Loading...</p>
                ) : !adminRecords?.length ? (
                  <p className="text-[11px] text-neutral-500">No data available</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-white/[0.08]">
                    <table className="w-full min-w-[32rem] border-collapse text-left text-[11px] text-neutral-300">
                      <thead>
                        <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-wide text-neutral-500">
                          <th className="px-2 py-2 font-medium">Amount</th>
                          <th className="px-2 py-2 font-medium">Type</th>
                          <th className="px-2 py-2 font-medium">Category</th>
                          <th className="px-2 py-2 font-medium">Created by</th>
                          <th className="px-2 py-2 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminRecords.map(r => {
                          const rid = r?._id != null ? String(r._id) : '';
                          const creator =
                            r?.user?.name || r?.user?.email || (r?.user ? String(r.user) : '—');
                          const delBusy = adminDeleteLoadingId === rid;
                          return (
                            <tr key={rid || `${r?.category}-${r?.date}`} className="border-b border-white/[0.06] last:border-0">
                              <td className="px-2 py-2 align-top tabular-nums text-neutral-100">
                                {formatMoney(r?.amount)}
                              </td>
                              <td className="px-2 py-2 align-top capitalize text-neutral-400">{r?.type ?? '—'}</td>
                              <td className="max-w-[8rem] truncate px-2 py-2 align-top" title={r?.category}>
                                {r?.category ?? '—'}
                              </td>
                              <td className="max-w-[10rem] truncate px-2 py-2 align-top text-neutral-500" title={creator}>
                                {creator}
                              </td>
                              <td className="px-2 py-2 align-top">
                                <button
                                  type="button"
                                  disabled={delBusy}
                                  onClick={() => adminSoftDeleteRecord(rid)}
                                  className="rounded border border-rose-500/25 px-2 py-1 text-[10px] text-rose-200/90 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {delBusy ? '…' : 'Delete'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      ) : null}

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

      {toastMessage ? (
        <div
          className="pointer-events-auto fixed bottom-6 left-1/2 z-[600] max-w-[min(100vw-2rem,22rem)] -translate-x-1/2 rounded-lg border border-white/[0.12] bg-[#121018]/95 px-4 py-3 text-center text-sm text-neutral-100 shadow-lg backdrop-blur-sm"
          role="status"
        >
          {toastMessage}
        </div>
      ) : null}
    </>
  );
};

export default MagicBento;
