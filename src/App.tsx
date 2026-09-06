import { useState, useEffect, type FormEvent } from 'react';
import {
  Loader2,
  RotateCcw,
  Building2,
  User,
  CheckCircle2,
  XCircle,
  LogOut,
  ShieldCheck,
  Sun,
  Moon,
  ArrowRight,
  History,
  Search,
  X,
  Info,
  ArrowLeft,
  Clock,
  Layers,
  Landmark,
  Lock,
  Server,
  AlertCircle,
  Activity
} from 'lucide-react';

interface ClaimResult {
  claimId: string;
  flowType: 'Service Provider' | 'Member Reimbursement';
  hospital: string;
  hospitalBankAccount?: string;
  memberId: string;
  memberName?: string;
  payoutAccount?: string;
  amount: number;
  status: 'Approved' | 'Rejected';
  rejectionReason?: string;
  timestamp: string;
}

interface HistoryItem {
  id: string;
  claimId: string;
  flowType: 'Service Provider' | 'Member Reimbursement';
  hospital: string;
  hospitalBankAccount?: string;
  memberId: string;
  memberName?: string;
  payoutAccount?: string;
  amount: number;
  status: 'Approved' | 'Rejected';
  rejectionReason?: string;
  hospitalPayout?: number;
  memberPayout?: number;
  timestamp: string;
}

const REJECTION_REASONS = [
  'Member not active',
  'Service not covered',
  'Limit exceeded',
  'Missing documents',
  'Fraud suspected'
];

const INITIAL_HISTORY: HistoryItem[] = [
  {
    id: 'hist-1',
    claimId: 'CLM-2026-94810',
    flowType: 'Service Provider',
    hospital: 'Avenues Clinic',
    hospitalBankAccount: 'CBZ Bank (Acc: 01129384920)',
    memberId: 'CIM-77412',
    amount: 450.00,
    status: 'Approved',
    hospitalPayout: 436.50,
    timestamp: 'Sep 3, 2026 at 23:15:04'
  },
  {
    id: 'hist-2',
    claimId: 'RMB-2026-88102',
    flowType: 'Member Reimbursement',
    hospital: 'Parirenyatwa Hospital',
    memberId: 'CIM-55192',
    memberName: 'Tinashe Moyo',
    payoutAccount: 'EcoCash (+263 77 123 4567)',
    amount: 50.00,
    status: 'Approved',
    memberPayout: 50.00,
    timestamp: 'Sep 3, 2026 at 22:50:11'
  },
  {
    id: 'hist-3',
    claimId: 'CLM-2026-83194',
    flowType: 'Service Provider',
    hospital: 'Harare Central Hospital',
    hospitalBankAccount: 'Stanbic Bank (Acc: 0240019283)',
    memberId: 'CIM-44820',
    amount: 180.00,
    status: 'Rejected',
    rejectionReason: 'Limit exceeded',
    timestamp: 'Sep 3, 2026 at 22:48:30'
  },
  {
    id: 'hist-4',
    claimId: 'RMB-2026-77319',
    flowType: 'Member Reimbursement',
    hospital: 'Corporate 24 Medical',
    memberId: 'CIM-33104',
    memberName: 'Chipo Ndlovu',
    payoutAccount: 'CBZ Bank (Acc: 01129384920)',
    amount: 120.00,
    status: 'Rejected',
    rejectionReason: 'Service not covered',
    timestamp: 'Sep 3, 2026 at 22:15:00'
  },
  {
    id: 'hist-5',
    claimId: 'CLM-2026-72015',
    flowType: 'Service Provider',
    hospital: 'Parirenyatwa Hospital',
    hospitalBankAccount: 'Steward Bank (Acc: 1009823411)',
    memberId: 'CIM-99103',
    amount: 320.00,
    status: 'Approved',
    hospitalPayout: 310.40,
    timestamp: 'Sep 3, 2026 at 22:10:15'
  }
];

// Session Configuration (30 Minutes Expiration)
const SESSION_STORAGE_KEY = 'cimas_healthpay_session';
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

const checkValidSession = (): boolean => {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return false;
    const session = JSON.parse(raw);
    if (session && session.expiresAt && Date.now() < session.expiresAt) {
      return true;
    }
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return false;
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return false;
  }
};

export default function App() {
  // Navigation View State ('app' | 'about')
  const [currentView, setCurrentView] = useState<'app' | 'about'>('app');

  // Active Operating Mode/Tab State ('provider' | 'member')
  const [activeTab, setActiveTab] = useState<'provider' | 'member'>('provider');

  // Theme State (default: light mode with off-white background)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Synchronize documentElement class with theme state
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Authentication State with Session Persistence (30 mins)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => checkValidSession());
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginId, setLoginId] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Periodically check session expiration while application is open
  useEffect(() => {
    const interval = setInterval(() => {
      if (!checkValidSession()) {
        setIsAuthenticated(false);
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, []);

  // Provider Claims Form State
  const [hospitalName, setHospitalName] = useState<string>('Parirenyatwa Hospital');
  const [hospitalBankAccount, setHospitalBankAccount] = useState<string>('CBZ Bank (Acc: 109283746501)');
  const [memberId, setMemberId] = useState<string>('CIM-88213');
  const [claimAmount, setClaimAmount] = useState<number | string>(200);

  // Member Reimbursement Form State
  const [memberName, setMemberName] = useState<string>('Tinashe Moyo');
  const [memberCimasId, setMemberCimasId] = useState<string>('CIM-88213');
  const [reimburseHospital, setReimburseHospital] = useState<string>('Parirenyatwa Hospital');
  const [cashAmount, setCashAmount] = useState<number | string>(50);
  const [payoutAccount, setPayoutAccount] = useState<string>('EcoCash (+263 77 123 4567)');

  // Submission & Result State (Provider flow)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [processingStep, setProcessingStep] = useState<number>(0);
  const [processingStatusLabel, setProcessingStatusLabel] = useState<string>('');
  const [pendingClaim, setPendingClaim] = useState<ClaimResult | null>(null);

  // Submission & Result State (Member Reimbursement flow)
  const [isSubmittingMember, setIsSubmittingMember] = useState<boolean>(false);
  const [memberClaimResult, setMemberClaimResult] = useState<ClaimResult | null>(null);
  const [memberProcessingStep, setMemberProcessingStep] = useState<number>(0);
  const [memberProcessingStatusLabel, setMemberProcessingStatusLabel] = useState<string>('');

  // Payment History State (Pre-populated with items from both flows)
  const [paymentHistory, setPaymentHistory] = useState<HistoryItem[]>(INITIAL_HISTORY);

  // History Filtering State: Tab & Search Query
  const [historyTab, setHistoryTab] = useState<'All' | 'Approved' | 'Rejected'>('All');
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');

  // 10-Second Countdown State for Service Provider Payment Processing
  const [countdown, setCountdown] = useState<number>(10);

  // 8-Second Countdown State for Member Reimbursement Processing
  const [memberCountdown, setMemberCountdown] = useState<number>(8);

  // Toggle Light / Dark Mode
  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Handle Login Authentication with 30-Minute Session Saving
  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (loginUsername.trim() === 'admin' && loginId.trim() === '1234') {
      const expiresAt = Date.now() + SESSION_DURATION_MS;
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
        authenticated: true,
        username: 'admin',
        loginTime: Date.now(),
        expiresAt
      }));
      setIsAuthenticated(true);
      setLoginError(null);
    } else {
      setLoginError('Incorrect username or ID');
    }
  };

  // Handle Sign Out & Session Clearance
  const handleSignOut = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setIsAuthenticated(false);
    setLoginUsername('');
    setLoginId('');
    setLoginError(null);
    setCurrentView('app');
    handleReset();
    handleResetMember();
  };

  // Reset Provider claim form and result state
  const handleReset = () => {
    setHospitalName('Parirenyatwa Hospital');
    setHospitalBankAccount('CBZ Bank (Acc: 109283746501)');
    setMemberId('CIM-88213');
    setClaimAmount(200);
    setClaimResult(null);
    setIsSubmitting(false);
    setProcessingStep(0);
    setProcessingStatusLabel('');
    setPendingClaim(null);
    setCountdown(10);
  };

  // Reset Member Reimbursement form and result state
  const handleResetMember = () => {
    setMemberName('Tinashe Moyo');
    setMemberCimasId('CIM-88213');
    setReimburseHospital('Parirenyatwa Hospital');
    setCashAmount(50);
    setPayoutAccount('EcoCash (+263 77 123 4567)');
    setMemberClaimResult(null);
    setIsSubmittingMember(false);
    setMemberProcessingStep(0);
    setMemberProcessingStatusLabel('');
    setMemberCountdown(8);
  };

  // Manage 10-second countdown when a Provider claim is Approved
  useEffect(() => {
    if (claimResult && claimResult.status === 'Approved') {
      setCountdown(10);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [claimResult]);

  // Manage 8-second countdown when a Member Reimbursement claim is Approved
  useEffect(() => {
    if (memberClaimResult && memberClaimResult.status === 'Approved') {
      setMemberCountdown(8);
      const timer = setInterval(() => {
        setMemberCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [memberClaimResult]);

  // Provider Sequential Real-Time Submission Processing Handler
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!hospitalName || !hospitalBankAccount || !memberId || !claimAmount || Number(claimAmount) <= 0) return;

    setIsSubmitting(true);
    setClaimResult(null);

    const randomIdNum = Math.floor(10000 + Math.random() * 90000);
    const isApproved = Math.random() < 0.7; // 70% approval rate bias

    const now = new Date();
    const formattedTimestamp = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) + ' at ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const selectedReason = isApproved
      ? undefined
      : REJECTION_REASONS[Math.floor(Math.random() * REJECTION_REASONS.length)];

    const newClaim: ClaimResult = {
      claimId: `CLM-2026-${randomIdNum}`,
      flowType: 'Service Provider',
      hospital: hospitalName.trim(),
      hospitalBankAccount: hospitalBankAccount.trim(),
      memberId: memberId.trim(),
      amount: Number(claimAmount),
      status: isApproved ? 'Approved' : 'Rejected',
      rejectionReason: selectedReason,
      timestamp: formattedTimestamp
    };

    setPendingClaim(newClaim);

    // Step 1: Hospital (0ms)
    setProcessingStep(1);
    setProcessingStatusLabel('Submitting claim payload from Hospital...');

    // Step 2: Platform Gateway (+300ms)
    setTimeout(() => {
      setProcessingStep(2);
      setProcessingStatusLabel('Platform API Gateway validating structure & routing payload...');
    }, 300);

    // Step 3: CIMAS Medical Aid API (+600ms)
    setTimeout(() => {
      setProcessingStep(3);
      setProcessingStatusLabel('Connecting to CIMAS Medical Aid API...');
    }, 600);

    // Step 3 Response (+900ms)
    setTimeout(() => {
      if (isApproved) {
        setProcessingStatusLabel('CIMAS API responded: Approved');

        // Step 4: Bank Payment API (+1200ms)
        setTimeout(() => {
          setProcessingStep(4);
          setProcessingStatusLabel('Connecting to Bank Payment API...');
        }, 300);

        // Step 5: Bank Confirmation & Hospital Payout (+1500ms)
        setTimeout(() => {
          setProcessingStep(5);
          setProcessingStatusLabel('Bank API confirmed payment — 97% funds disbursed to Hospital');
        }, 600);

        // Finalize claim result & reveal Payment Processing section (+1800ms)
        setTimeout(() => {
          setClaimResult(newClaim);

          const historyEntry: HistoryItem = {
            id: `hist-${Date.now()}`,
            claimId: newClaim.claimId,
            flowType: 'Service Provider',
            hospital: newClaim.hospital,
            hospitalBankAccount: newClaim.hospitalBankAccount,
            memberId: newClaim.memberId,
            amount: newClaim.amount,
            status: newClaim.status,
            rejectionReason: newClaim.rejectionReason,
            hospitalPayout: newClaim.amount * 0.97,
            timestamp: newClaim.timestamp
          };

          setPaymentHistory((prev) => [historyEntry, ...prev].slice(0, 10));
          setIsSubmitting(false);
        }, 900);

      } else {
        setProcessingStatusLabel(`CIMAS API responded: Rejected (${selectedReason})`);

        setTimeout(() => {
          setClaimResult(newClaim);

          const historyEntry: HistoryItem = {
            id: `hist-${Date.now()}`,
            claimId: newClaim.claimId,
            flowType: 'Service Provider',
            hospital: newClaim.hospital,
            hospitalBankAccount: newClaim.hospitalBankAccount,
            memberId: newClaim.memberId,
            amount: newClaim.amount,
            status: newClaim.status,
            rejectionReason: newClaim.rejectionReason,
            hospitalPayout: undefined,
            timestamp: newClaim.timestamp
          };

          setPaymentHistory((prev) => [historyEntry, ...prev].slice(0, 10));
          setIsSubmitting(false);
        }, 800);
      }
    }, 900);
  };

  // Member Reimbursement Submission Handler
  const handleMemberSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!memberName || !memberCimasId || !reimburseHospital || !cashAmount || Number(cashAmount) <= 0 || !payoutAccount) return;

    setIsSubmittingMember(true);
    setMemberClaimResult(null);

    const randomIdNum = Math.floor(10000 + Math.random() * 90000);
    const isApproved = Math.random() < 0.7; // 70% approval rate bias

    const now = new Date();
    const formattedTimestamp = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) + ' at ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const selectedReason = isApproved
      ? undefined
      : REJECTION_REASONS[Math.floor(Math.random() * REJECTION_REASONS.length)];

    const newClaim: ClaimResult = {
      claimId: `RMB-2026-${randomIdNum}`,
      flowType: 'Member Reimbursement',
      hospital: reimburseHospital.trim(),
      memberId: memberCimasId.trim(),
      memberName: memberName.trim(),
      payoutAccount: payoutAccount.trim(),
      amount: Number(cashAmount),
      status: isApproved ? 'Approved' : 'Rejected',
      rejectionReason: selectedReason,
      timestamp: formattedTimestamp
    };

    // Step 1: Member Active Check (~1.2s)
    setMemberProcessingStep(1);
    setMemberProcessingStatusLabel('Checking CIMAS: is member active?');

    setTimeout(() => {
      // Step 2: Amount Covered Check (~1.2s)
      setMemberProcessingStep(2);
      setMemberProcessingStatusLabel('Checking CIMAS: is amount covered?');

      setTimeout(() => {
        if (isApproved) {
          setMemberProcessingStatusLabel('CIMAS verification complete: Claim Approved');

          setTimeout(() => {
            setMemberClaimResult(newClaim);

            const historyEntry: HistoryItem = {
              id: `hist-${Date.now()}`,
              claimId: newClaim.claimId,
              flowType: 'Member Reimbursement',
              hospital: newClaim.hospital,
              memberId: newClaim.memberId,
              memberName: newClaim.memberName,
              payoutAccount: newClaim.payoutAccount,
              amount: newClaim.amount,
              status: newClaim.status,
              rejectionReason: newClaim.rejectionReason,
              memberPayout: newClaim.amount,
              timestamp: newClaim.timestamp
            };

            setPaymentHistory((prev) => [historyEntry, ...prev].slice(0, 10));
            setIsSubmittingMember(false);
          }, 600);
        } else {
          setMemberProcessingStatusLabel(`CIMAS verification complete: Rejected (${selectedReason})`);

          setTimeout(() => {
            setMemberClaimResult(newClaim);

            const historyEntry: HistoryItem = {
              id: `hist-${Date.now()}`,
              claimId: newClaim.claimId,
              flowType: 'Member Reimbursement',
              hospital: newClaim.hospital,
              memberId: newClaim.memberId,
              memberName: newClaim.memberName,
              payoutAccount: newClaim.payoutAccount,
              amount: newClaim.amount,
              status: newClaim.status,
              rejectionReason: newClaim.rejectionReason,
              timestamp: newClaim.timestamp
            };

            setPaymentHistory((prev) => [historyEntry, ...prev].slice(0, 10));
            setIsSubmittingMember(false);
          }, 600);
        }
      }, 1200);
    }, 1200);
  };

  // Filter payment history based on active tab & search query
  const filteredHistory = paymentHistory.filter((item) => {
    if (historyTab === 'Approved' && item.status !== 'Approved') return false;
    if (historyTab === 'Rejected' && item.status !== 'Rejected') return false;

    if (!historySearchQuery.trim()) return true;
    const q = historySearchQuery.toLowerCase().trim();

    const matchesId = item.claimId.toLowerCase().includes(q);
    const matchesHospital = item.hospital.toLowerCase().includes(q);
    const matchesHospitalBank = item.hospitalBankAccount ? item.hospitalBankAccount.toLowerCase().includes(q) : false;
    const matchesMemberId = item.memberId.toLowerCase().includes(q);
    const matchesMemberName = item.memberName ? item.memberName.toLowerCase().includes(q) : false;
    const matchesPayoutAccount = item.payoutAccount ? item.payoutAccount.toLowerCase().includes(q) : false;
    const matchesFlowType = item.flowType.toLowerCase().includes(q);
    const matchesAmount = item.amount.toString().includes(q) || `$${item.amount.toFixed(2)}`.toLowerCase().includes(q);
    const matchesDate = item.timestamp.toLowerCase().includes(q);

    return matchesId || matchesHospital || matchesHospitalBank || matchesMemberId || matchesMemberName || matchesPayoutAccount || matchesFlowType || matchesAmount || matchesDate;
  });

  // Theme-dependent root container styling
  const themeContainerClass = isDarkMode
    ? 'bg-[#0a0e1a] text-slate-100'
    : 'bg-[#f4f6f8] text-slate-900';

  // Integration Status Component
  const IntegrationStatusPanel = () => (
    <div className={`p-6 rounded-2xl space-y-4 transition-colors ${isDarkMode ? 'bg-[#131b2e] shadow-xl' : 'bg-white shadow-sm'
      }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3">
        <div>
          <h3 className={`text-base font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Integration System Status
          </h3>
          <p className={`text-xs font-medium mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Live connectivity status of connected external partner APIs
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">All Systems Operational</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* CIMAS API Status Card */}
        <div className={`p-4 rounded-xl space-y-2 transition-all ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'
          }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-extrabold flex items-center gap-1.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              <span>CIMAS Medical Aid API</span>
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              Connected
            </span>
          </div>

          <div className="space-y-1 pt-1 text-xs">
            <div className="flex justify-between items-center">
              <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Mock Endpoint:</span>
              <span className="font-mono text-[11px] font-bold text-blue-500 truncate max-w-[200px]">
                https://api.cimas.co.zw/v2/claims/verify
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Mock Response Time:</span>
              <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                42 ms
              </span>
            </div>
          </div>
        </div>

        {/* Bank Payment API Status Card */}
        <div className={`p-4 rounded-xl space-y-2 transition-all ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'
          }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-extrabold flex items-center gap-1.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              <Landmark className="w-4 h-4 text-emerald-500" />
              <span>Bank Payment API</span>
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              Connected
            </span>
          </div>

          <div className="space-y-1 pt-1 text-xs">
            <div className="flex justify-between items-center">
              <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Mock Endpoint:</span>
              <span className="font-mono text-[11px] font-bold text-blue-500 truncate max-w-[200px]">
                https://api.cbz.co.zw/v1/settlement/disburse
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Mock Response Time:</span>
              <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                18 ms
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Security & Scale Section Component (Plain non-technical language)
  const SecurityAndScaleSection = () => (
    <section className={`rounded-2xl p-6 sm:p-8 space-y-6 transition-colors ${isDarkMode ? 'bg-[#131b2e] shadow-xl' : 'bg-white shadow-sm'
      }`}>
      <div className="space-y-1">
        <h2 className={`text-xl sm:text-2xl font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          Security & Scale
        </h2>
        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Built for privacy, data protection, and reliable healthcare settlement.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Data Security in Transit */}
        <div className={`p-5 rounded-2xl space-y-3 transition-colors ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'
          }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Data security in transit
            </h3>
          </div>
          <p className={`text-xs leading-relaxed font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            All claim and payment data is encrypted end-to-end between hospital, CIMAS, and the bank. Medical details and payout transaction records are safeguarded continuously during transmission.
          </p>
        </div>

        {/* System Scale */}
        <div className={`p-5 rounded-2xl space-y-3 transition-colors ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'
          }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              High-capacity scale
            </h3>
          </div>
          <p className={`text-xs leading-relaxed font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Built to handle claims from multiple hospitals simultaneously without slowdown. Healthcare providers experience consistent, rapid claim processing regardless of peak traffic volume.
          </p>
        </div>
      </div>
    </section>
  );

  // Render Real-Time Flow Diagram for Provider flow
  const renderFlowDiagram = (mode: 'live' | 'result') => {
    const activeStep = mode === 'live' ? processingStep : 5;
    const currentClaim = mode === 'live' ? pendingClaim : claimResult;
    const isRejected = currentClaim?.status === 'Rejected';

    return (
      <div className={`p-5 sm:p-6 rounded-2xl space-y-6 ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'
        }`}>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-blue-500 flex items-center gap-1.5">

              <span>Real-Time Processing Diagram</span>
            </span>
            <h4 className={`text-sm font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              System Architecture & Integration Pipeline
            </h4>
          </div>
          {mode === 'live' && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-500/15 text-blue-600 dark:text-blue-400">
              Live Processing
            </span>
          )}
        </div>

        {/* 5-Node Connected Flow Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center relative">

          {/* Node 1: Hospital */}
          <div className={`p-3.5 rounded-xl text-center space-y-1.5 transition-all ${activeStep >= 1
              ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold'
              : 'opacity-40'
            }`}>
            <div className="w-8 h-8 mx-auto rounded-lg bg-blue-600/15 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className={`text-xs font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              1. Hospital
            </div>
            <div className="text-[10px] font-medium text-slate-500">Submits Claim</div>
            <div className="text-[9px] font-mono font-bold text-blue-500">Origin</div>
          </div>

          {/* Node 2: HealthPay Platform */}
          <div className={`p-3.5 rounded-xl text-center space-y-1.5 transition-all ${activeStep >= 2
              ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold'
              : 'opacity-40'
            }`}>
            <div className="w-8 h-8 mx-auto rounded-lg bg-blue-600/15 flex items-center justify-center">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className={`text-xs font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              2. Platform
            </div>
            <div className="text-[10px] font-medium text-slate-500">API Gateway</div>
            <div className="text-[9px] font-mono font-bold text-blue-500">Router</div>
          </div>

          {/* Node 3: CIMAS Medical Aid API */}
          <div className={`p-3.5 rounded-xl text-center space-y-1.5 transition-all ${activeStep >= 3
              ? (isRejected
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold'
                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold')
              : 'opacity-40'
            }`}>
            <div className="w-8 h-8 mx-auto rounded-lg bg-current/15 flex items-center justify-center">
              {isRejected ? (
                <XCircle className="w-4 h-4 text-rose-500" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div className={`text-xs font-extrabold ${isRejected ? 'text-rose-500' : (isDarkMode ? 'text-white' : 'text-slate-900')
              }`}>
              3. CIMAS API
            </div>
            <div className="text-[10px] font-medium text-slate-500">Rules Engine</div>
            <div className={`text-[9px] font-mono font-extrabold ${isRejected ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'
              }`}>
              {isRejected ? 'Rejected' : (activeStep >= 3 ? 'Approved' : 'Pending')}
            </div>
          </div>

          {/* Node 4: Bank Payment API */}
          <div className={`p-3.5 rounded-xl text-center space-y-1.5 transition-all ${isRejected
              ? 'opacity-30 bg-slate-200/50 dark:bg-slate-800/30 text-slate-400 line-through'
              : (activeStep >= 4
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'opacity-40')
            }`}>
            <div className="w-8 h-8 mx-auto rounded-lg bg-current/15 flex items-center justify-center">
              <Landmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className={`text-xs font-extrabold ${isRejected ? 'text-slate-400' : (isDarkMode ? 'text-white' : 'text-slate-900')
              }`}>
              4. Bank API
            </div>
            <div className="text-[10px] font-medium text-slate-500">
              {isRejected ? 'No Payment' : 'Liquidity Partner'}
            </div>
            <div className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500">
              {isRejected ? 'Greyed Out' : (activeStep >= 4 ? 'Confirmed' : 'Pending')}
            </div>
          </div>

          {/* Node 5: Hospital (Payment) */}
          <div className={`p-3.5 rounded-xl text-center space-y-1.5 transition-all ${isRejected
              ? 'opacity-30 bg-slate-200/50 dark:bg-slate-800/30 text-slate-400 line-through'
              : (activeStep >= 5
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'opacity-40')
            }`}>
            <div className="w-8 h-8 mx-auto rounded-lg bg-current/15 flex items-center justify-center">
              {isRejected ? (
                <XCircle className="w-4 h-4 text-slate-400" />
              ) : (
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <div className={`text-xs font-extrabold ${isRejected ? 'text-slate-400' : (isDarkMode ? 'text-white' : 'text-slate-900')
              }`}>
              5. Hospital
            </div>
            <div className="text-[10px] font-medium text-slate-500">
              {isRejected ? 'No Payment' : 'Disbursement'}
            </div>
            <div className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500">
              {isRejected ? 'Greyed Out' : (activeStep >= 5 ? '97% Received' : 'Pending')}
            </div>
          </div>

        </div>

        {/* Live / Persisted Status Bar */}
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 ${isRejected
            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
            : (mode === 'live'
              ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400'
              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400')
          }`}>
          <div className="flex items-center gap-2.5">
            {mode === 'live' ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              isRejected ? <XCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>
              {mode === 'live'
                ? processingStatusLabel
                : (isRejected
                  ? `Claim Rejected at CIMAS API node: ${currentClaim?.rejectionReason}. Flow stopped before Bank & Hospital nodes.`
                  : 'Real-time pipeline completed: CIMAS API approved claim and Bank API confirmed instant payment to Hospital.')}
            </span>
          </div>

          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-black/10 shrink-0">
            {isRejected ? 'Flow Stopped' : (mode === 'live' ? `Step ${processingStep}/5` : 'Flow Completed')}
          </span>
        </div>
      </div>
    );
  };

  // Render Login Screen if user is not authenticated
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex flex-col justify-between px-4 py-8 font-['Plus_Jakarta_Sans',sans-serif] transition-colors duration-300 ${themeContainerClass}`}>

        {/* Top Header Bar with Theme Toggle */}
        <div className="w-full max-w-4xl mx-auto flex justify-end">
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2.5 rounded-full transition-colors cursor-pointer ${isDarkMode
              ? 'bg-[#182238] text-amber-400 hover:bg-[#202d4a]'
              : 'bg-white text-slate-700 hover:bg-slate-200 shadow-sm'
              }`}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        {/* Centered Login Box */}
        <div className="w-full max-w-md mx-auto my-auto space-y-8 py-6">

          {/* Logo & Product Name */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-md mb-1">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h1 className={`text-3xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Health Pay
            </h1>
            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Provider Portal Sign In
            </p>
          </div>

          {/* Login Card */}
          <div className={`rounded-2xl p-6 sm:p-8 space-y-6 ${isDarkMode ? 'bg-[#131b2e] shadow-xl' : 'bg-white shadow-md'
            }`}>
            <form onSubmit={handleLogin} className="space-y-5">

              {/* Field: Username */}
              <div className="space-y-2">
                <label htmlFor="loginUsername" className={`block text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                  Username
                </label>
                <input
                  id="loginUsername"
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Enter username"
                  className={`w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all ${isDarkMode
                    ? 'bg-[#0f172a] text-white placeholder-slate-500'
                    : 'bg-[#f8fafc] text-slate-900 placeholder-slate-400'
                    }`}
                />
              </div>

              {/* Field: ID */}
              <div className="space-y-2">
                <label htmlFor="loginId" className={`block text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                  ID
                </label>
                <input
                  id="loginId"
                  type="password"
                  required
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="Enter ID"
                  className={`w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all ${isDarkMode
                    ? 'bg-[#0f172a] text-white placeholder-slate-500'
                    : 'bg-[#f8fafc] text-slate-900 placeholder-slate-400'
                    }`}
                />
              </div>

              {/* Inline Error Message */}
              {loginError && (
                <div className="p-3.5 bg-rose-600 text-white rounded-xl text-xs font-bold text-center animate-pop-in">
                  {loginError}
                </div>
              )}

              {/* Sign In Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  <span>Sign In</span>
                </button>
              </div>

            </form>
          </div>

        </div>

        {/* Footer Copyright */}
        <p className={`text-center text-xs font-medium py-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
          &copy; {new Date().getFullYear()} CIMAS Health Group. All rights reserved.
        </p>

      </div>
    );
  }

  // Render About Page View if currentView is 'about'
  if (currentView === 'about') {
    return (
      <div className={`min-h-screen flex flex-col font-['Plus_Jakarta_Sans',sans-serif] transition-colors duration-300 ${themeContainerClass}`}>

        {/* Top Header / System Bar */}
        <div className={`text-xs font-medium py-3 px-4 transition-colors ${isDarkMode ? 'bg-[#0e1424] text-slate-400' : 'bg-slate-200/80 text-slate-700'
          }`}>
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Parirenyatwa General Hospital
              </span>
              <span className="hidden sm:inline opacity-40">•</span>
              <span className="hidden sm:inline">Provider No. PRY-9021</span>
            </div>
            <div className="flex items-center space-x-3 sm:space-x-4">
              <span className="hidden sm:flex items-center text-xs font-medium">
                <User className="w-3.5 h-3.5 mr-1" />
                Admin
              </span>
              <span className="hidden sm:inline opacity-30">|</span>

              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${isDarkMode
                  ? 'bg-[#1a243a] text-amber-400 hover:bg-[#22304d]'
                  : 'bg-white text-slate-700 hover:bg-slate-100 shadow-sm'
                  }`}
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>

              <span className="opacity-30">|</span>

              {/* Sign Out Button */}
              <button
                onClick={handleSignOut}
                className={`inline-flex items-center text-xs font-semibold hover:underline cursor-pointer ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Container */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">

          {/* Back Button */}
          <div>
            <button
              type="button"
              onClick={() => setCurrentView('app')}
              className={`inline-flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer ${isDarkMode
                ? 'bg-[#131b2e] hover:bg-[#1a253e] text-blue-400'
                : 'bg-white hover:bg-slate-100 text-blue-600 shadow-sm'
                }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to claims portal</span>
            </button>
          </div>

          {/* Hero Header */}
          <section className={`rounded-2xl p-6 sm:p-8 space-y-3 transition-colors ${isDarkMode ? 'bg-[#131b2e] shadow-xl' : 'bg-white shadow-sm'
            }`}>
            <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
              Health Pay
            </h1>
            <p className={`text-sm sm:text-base font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
              Instant medical claim verification and automated liquidity settlement infrastructure for healthcare providers and members.
            </p>
          </section>

          {/* Section 1: How Health Pay Works (Simplified Minimal Design) */}
          <section className={`rounded-2xl p-6 sm:p-8 space-y-6 transition-colors ${isDarkMode ? 'bg-[#131b2e] shadow-xl' : 'bg-white shadow-sm'
            }`}>
            
            <div className="space-y-1">
              <h2 className={`text-xl sm:text-2xl font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                How Health Pay works
              </h2>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                Detailed process flow for service provider settlements and member reimbursements.
              </p>
            </div>

            <div className="space-y-6 pt-1">

              {/* 1. Service Provider Payments */}
              <div className={`p-6 rounded-xl space-y-4 border ${isDarkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-[#f8fafc] border-slate-200/80'
                }`}>
                <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
                  <h3 className={`text-base font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    1. Service Provider Payments (Instant 97% Payout)
                  </h3>
                  <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Hospital Settlement Flow
                  </span>
                </div>

                <p className={`text-xs sm:text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Connects hospitals, CIMAS rule verification, and bank liquidity partners to eliminate 60–90 day payment delays.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                  <div className="space-y-1">
                    <span className="font-extrabold text-blue-600 dark:text-blue-400">Step 1: Payload Submission</span>
                    <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
                      Hospital enters claim details, patient CIMAS ID, claim amount, and hospital bank account.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-extrabold text-blue-600 dark:text-blue-400">Step 2: Gateway Routing</span>
                    <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
                      Health Pay API Gateway validates structure and securely routes request payload.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-extrabold text-blue-600 dark:text-blue-400">Step 3: CIMAS Verification</span>
                    <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
                      CIMAS API verifies active member status and benefit coverage limits in real time.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-extrabold text-blue-600 dark:text-blue-400">Step 4: Bank Disbursal</span>
                    <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
                      Bank API pays 97% net funds directly to the hospital bank account within seconds.
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Member Cash Reimbursement */}
              <div className={`p-6 rounded-xl space-y-4 border ${isDarkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-[#f8fafc] border-slate-200/80'
                }`}>
                <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
                  <h3 className={`text-base font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    2. Member Reimbursement (100% Direct Cash Refund)
                  </h3>
                  <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Patient Refund Flow
                  </span>
                </div>

                <p className={`text-xs sm:text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Direct cash refunds for members who paid cash out-of-pocket at clinics or medical centers.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
                  <div className="space-y-1">
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">Phase 1: Claim Entry</span>
                    <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
                      Member submits name, CIMAS ID, cash receipt amount, and EcoCash/Bank payout account.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">Phase 2: Eligibility Check</span>
                    <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
                      Staged verification confirms active member standing and covered policy limits.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">Phase 3: Direct Refund</span>
                    <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
                      Full 100% cash reimbursement is transferred with zero fee deductions directly to member.
                    </p>
                  </div>
                </div>
              </div>

            </div>

          </section>

          {/* Section 2: Integration Status Panel */}
          <IntegrationStatusPanel />

          {/* Section 3: Security & Scale Section */}
          <SecurityAndScaleSection />

        </main>

        {/* Footer */}
        <footer className={`py-8 mt-12 transition-colors ${isDarkMode ? 'bg-[#131b2e]' : 'bg-white shadow-sm'
          }`}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center text-xs font-medium text-slate-500">
            <p>&copy; {new Date().getFullYear()} CIMAS Health Group. All rights reserved. • Health Pay v2.4</p>
          </div>
        </footer>

      </div>
    );
  }

  // Render Main Claims App when authenticated & currentView === 'app'
  return (
    <div className={`min-h-screen flex flex-col font-['Plus_Jakarta_Sans',sans-serif] transition-colors duration-300 ${themeContainerClass}`}>

      {/* Provider Header / System Bar */}
      <div className={`text-xs font-medium py-3 px-4 transition-colors ${isDarkMode ? 'bg-[#0e1424] text-slate-400' : 'bg-slate-200/80 text-slate-700'
        }`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Parirenyatwa General Hospital
            </span>
            <span className="hidden sm:inline opacity-40">•</span>
            <span className="hidden sm:inline">Provider No. PRY-9021</span>
          </div>
          <div className="flex items-center space-x-3 sm:space-x-4">
            <span className="hidden sm:flex items-center text-xs font-medium">
              <User className="w-3.5 h-3.5 mr-1" />
              Admin
            </span>
            <span className="hidden sm:inline opacity-30">|</span>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${isDarkMode
                ? 'bg-[#1a243a] text-amber-400 hover:bg-[#22304d]'
                : 'bg-white text-slate-700 hover:bg-slate-100 shadow-sm'
                }`}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            <span className="opacity-30">|</span>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className={`inline-flex items-center text-xs font-semibold hover:underline cursor-pointer ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main App Header */}
      <header className={`py-8 sm:py-10 transition-colors ${isDarkMode ? 'bg-[#131b2e]' : 'bg-white shadow-sm'
        }`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
              Health Pay
            </h1>
            <button
              type="button"
              onClick={() => setCurrentView('about')}
              className={`p-2.5 rounded-xl flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${isDarkMode
                ? 'bg-[#1a243a] text-blue-400 hover:bg-[#22304d]'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
              title="About Health Pay"
            >
              <Info className="w-4 h-4" />
              <span className="hidden sm:inline">About</span>
            </button>
          </div>
          <p className={`text-base sm:text-lg font-medium mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'
            }`}>
            Instant medical claim verification and automated payment settlement
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">

        {/* MODE SWITCHER TAB NAVIGATOR */}
        <div className={`p-1.5 rounded-2xl flex items-center gap-2 transition-colors ${isDarkMode ? 'bg-[#131b2e] shadow-xl' : 'bg-white shadow-sm'
          }`}>
          <button
            type="button"
            onClick={() => setActiveTab('provider')}
            className={`flex-1 py-3.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${activeTab === 'provider'
                ? 'bg-blue-600 text-white shadow-md'
                : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-[#1a243a]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
              }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Service Provider Payments</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('member')}
            className={`flex-1 py-3.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${activeTab === 'member'
                ? 'bg-blue-600 text-white shadow-md'
                : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-[#1a243a]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
              }`}
          >
            <User className="w-4 h-4" />
            <span>Member Reimbursement</span>
          </button>
        </div>

        {/* TAB 1: SERVICE PROVIDER PAYMENTS FLOW */}
        {activeTab === 'provider' && (
          <>
            {/* Hospital Claim Form Section */}
            <section className={`rounded-2xl p-6 sm:p-8 space-y-6 transition-colors ${isDarkMode ? 'bg-[#131b2e] shadow-xl' : 'bg-white shadow-sm'
              }`}>

              <div className="flex items-center justify-between pb-2">
                <div>
                  <h2 className={`text-xl sm:text-2xl font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                    Hospital claim submission
                  </h2>
                  <p className={`text-sm font-medium mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                    Submit patient claim details for automated verification
                  </p>
                </div>

                {claimResult && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className={`flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer ${isDarkMode
                      ? 'bg-[#1e293b] text-blue-400 hover:bg-[#283750]'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset form</span>
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">

                <div className="flex flex-col gap-6">

                  {/* Field 1: Hospital Name */}
                  <div className="space-y-2">
                    <label htmlFor="hospitalName" className={`block text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                      Hospital name
                    </label>
                    <input
                      id="hospitalName"
                      type="text"
                      required
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      placeholder="e.g. Parirenyatwa Hospital"
                      className={`w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all ${isDarkMode
                        ? 'bg-[#0f172a] text-white'
                        : 'bg-[#f8fafc] text-slate-900'
                        }`}
                    />
                  </div>

                  {/* Field 2: Hospital Bank Account / Payout Destination */}
                  <div className="space-y-2">
                    <label htmlFor="hospitalBankAccount" className={`block text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                      Hospital bank account
                    </label>
                    <input
                      id="hospitalBankAccount"
                      type="text"
                      required
                      value={hospitalBankAccount}
                      onChange={(e) => setHospitalBankAccount(e.target.value)}
                      placeholder="e.g. CBZ Bank (Acc: 109283746501)"
                      className={`w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all ${isDarkMode
                        ? 'bg-[#0f172a] text-white'
                        : 'bg-[#f8fafc] text-slate-900'
                        }`}
                    />
                  </div>

                  {/* Field 3: Patient or Member ID */}
                  <div className="space-y-2">
                    <label htmlFor="memberId" className={`block text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                      Patient or member ID
                    </label>
                    <input
                      id="memberId"
                      type="text"
                      required
                      value={memberId}
                      onChange={(e) => setMemberId(e.target.value)}
                      placeholder="e.g. CIM-88213"
                      className={`w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all ${isDarkMode
                        ? 'bg-[#0f172a] text-white'
                        : 'bg-[#f8fafc] text-slate-900'
                        }`}
                    />
                  </div>

                  {/* Field 4: Claim Amount */}
                  <div className="space-y-2">
                    <label htmlFor="claimAmount" className={`block text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                      Claim amount ($ USD)
                    </label>
                    <input
                      id="claimAmount"
                      type="number"
                      min="1"
                      step="any"
                      required
                      value={claimAmount}
                      onChange={(e) => setClaimAmount(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all ${isDarkMode
                        ? 'bg-[#0f172a] text-white'
                        : 'bg-[#f8fafc] text-slate-900'
                        }`}
                    />
                  </div>

                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center space-x-2 py-4 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-white mr-2" />
                        <span>Processing live claim submission sequence...</span>
                      </>
                    ) : (
                      <span>Submit claim</span>
                    )}
                  </button>
                </div>

              </form>

            </section>

            {/* Real-time Submission Animation Diagram View (During Submission) */}
            {isSubmitting && (
              <section className={`rounded-2xl p-6 sm:p-8 space-y-6 animate-pop-in transition-colors ${isDarkMode ? 'bg-[#131b2e] shadow-xl' : 'bg-white shadow-sm'
                }`}>
                <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
                    <h3 className={`text-lg font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      Real-Time Claim Verification in Progress...
                    </h3>
                  </div>
                  <span className="font-mono text-xs font-bold text-blue-500">Live API Handshake</span>
                </div>

                {renderFlowDiagram('live')}
              </section>
            )}

            {/* Claim Result Section */}
            {claimResult && (
              <section className={`rounded-2xl p-6 sm:p-8 space-y-6 animate-pop-in transition-colors ${isDarkMode ? 'bg-[#131b2e] shadow-xl' : 'bg-white shadow-sm'
                }`}>

                {/* Bold Result Hero Banner */}
                <div className={`p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md ${claimResult.status === 'Approved'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-rose-600 text-white'
                  }`}>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
                      {claimResult.status === 'Approved' ? (
                        <CheckCircle2 className="w-7 h-7" />
                      ) : (
                        <XCircle className="w-7 h-7" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                        {claimResult.status === 'Approved' ? 'Claim Approved' : 'Claim Rejected'}
                      </h3>
                      <p className="text-xs sm:text-sm text-white/90 font-medium mt-0.5">
                        {claimResult.status === 'Approved'
                          ? 'Payment authorized for instant settlement'
                          : 'Claim verification failed automated business rules'}
                      </p>
                    </div>
                  </div>

                  <div className="self-start sm:self-center font-mono text-xs font-bold bg-black/20 px-3 py-1.5 rounded-lg text-white">
                    {claimResult.timestamp}
                  </div>
                </div>

                {/* Real-time System Flow Diagram (Completed Flow Visualizer) */}
                <div className="pt-2">
                  {renderFlowDiagram('result')}
                </div>

                {/* Hero Claim Amount & Details */}
                <div className="space-y-6 pt-2">

                  {/* Claim Amount Hero Display */}
                  <div className={`p-6 rounded-2xl text-center space-y-1 ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'
                    }`}>
                    <div className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                      Verified claim total
                    </div>
                    <div className={`text-3xl sm:text-5xl font-extrabold font-mono tracking-tight ${isDarkMode ? 'text-blue-400' : 'text-blue-600'
                      }`}>
                      ${claimResult.amount.toFixed(2)} <span className={`text-base font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'
                        }`}>USD</span>
                    </div>
                  </div>

                  {/* Detail Items Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                    <div className={`p-4 rounded-xl space-y-1 ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'
                      }`}>
                      <div className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                        Claim reference ID
                      </div>
                      <div className={`text-sm font-mono font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                        {claimResult.claimId}
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl space-y-1 ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'
                      }`}>
                      <div className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                        Hospital name
                      </div>
                      <div className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                        {claimResult.hospital}
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl space-y-1 ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'
                      }`}>
                      <div className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                        Hospital bank account
                      </div>
                      <div className={`text-sm font-bold truncate ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                        }`}>
                        {claimResult.hospitalBankAccount || 'CBZ Bank (Acc: 109283746501)'}
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl space-y-1 ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'
                      }`}>
                      <div className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                        Patient / member ID
                      </div>
                      <div className={`text-sm font-mono font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                        {claimResult.memberId}
                      </div>
                    </div>

                  </div>

                  {/* Rejection Reason Box (If Rejected) */}
                  {claimResult.status === 'Rejected' && (
                    <div className="p-4 bg-rose-600 text-white rounded-xl flex items-center justify-between font-medium text-sm shadow-md animate-pop-in">
                      <span className="font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>Rejection reason:</span>
                      </span>
                      <span className="font-extrabold bg-black/20 px-3 py-1 rounded-lg text-white">{claimResult.rejectionReason}</span>
                    </div>
                  )}

                </div>

              </section>
            )}

            {/* Payment Processing Section (Displayed when claim is Approved) */}
            {claimResult && claimResult.status === 'Approved' && (
              <section className={`rounded-2xl p-6 sm:p-8 space-y-6 animate-pop-in transition-colors ${isDarkMode ? 'bg-[#131b2e] shadow-xl' : 'bg-white shadow-sm'
                }`}>

                <div className="flex items-center justify-between pb-2">
                  <div>
                    <h2 className={`text-xl sm:text-2xl font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                      Payment processing
                    </h2>
                    <p className={`text-sm font-medium mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                      Direct settlement authorization pipeline
                    </p>
                  </div>
                </div>

                {/* Countdown or Revealed Financial Breakdown */}
                {countdown > 0 ? (
                  <div className="space-y-5 py-3">
                    <div className="flex items-center justify-between text-sm font-bold">
                      <span className={`flex items-center gap-2 font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'
                        }`}>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing payment settlement...</span>
                      </span>
                      <span className={`font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-600'
                        }`}>{countdown}s remaining</span>
                    </div>

                    {/* Progress Bar */}
                    <div className={`w-full rounded-full h-3 overflow-hidden ${isDarkMode ? 'bg-[#0f172a]' : 'bg-slate-200'
                      }`}>
                      <div
                        className="bg-blue-600 h-full transition-all duration-1000 ease-linear rounded-full"
                        style={{ width: `${((10 - countdown) / 10) * 100}%` }}
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setCountdown(0)}
                        className={`text-xs font-bold hover:underline cursor-pointer ${isDarkMode ? 'text-blue-400' : 'text-blue-600'
                          }`}
                      >
                        Fast-forward (0s)
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Revealed Financial Breakdown */
                  <div className="space-y-6 animate-pop-in">

                    <div className="space-y-4">
                      <div className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                        Automated settlement distribution
                      </div>

                      {/* Three Connected Hero Split Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                        {/* Box 1: Hospital (97%) */}
                        <div className={`p-5 rounded-2xl space-y-2 ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'
                          }`}>
                          <div className="text-xs font-extrabold flex items-center justify-between text-emerald-600">
                            <span>Bank → Hospital</span>
                            <span className={`px-2 py-0.5 rounded font-mono font-bold ${isDarkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
                              }`}>97%</span>
                          </div>
                          <div className={`text-2xl font-extrabold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'
                            }`}>
                            ${(claimResult.amount * 0.97).toFixed(2)}
                          </div>
                          <div className={`text-[11px] font-semibold truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {claimResult.hospitalBankAccount || 'CBZ Bank (Acc: 109283746501)'}
                          </div>
                        </div>

                        {/* Box 2: Platform (1%) */}
                        <div className={`p-5 rounded-2xl space-y-2 ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'
                          }`}>
                          <div className="text-xs font-extrabold flex items-center justify-between text-blue-600">
                            <span>Bank → Platform</span>
                            <span className={`px-2 py-0.5 rounded font-mono font-bold ${isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-800'
                              }`}>1%</span>
                          </div>
                          <div className={`text-2xl font-extrabold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'
                            }`}>
                            ${(claimResult.amount * 0.01).toFixed(2)}
                          </div>
                        </div>

                        {/* Box 3: Bank fee kept (2%) */}
                        <div className={`p-5 rounded-2xl space-y-2 ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'
                          }`}>
                          <div className={`text-xs font-extrabold flex items-center justify-between ${isDarkMode ? 'text-slate-400' : 'text-slate-700'
                            }`}>
                            <span>Bank fee kept</span>
                            <span className={`px-2 py-0.5 rounded font-mono font-bold ${isDarkMode ? 'bg-slate-500/20 text-slate-300' : 'bg-slate-200 text-slate-800'
                              }`}>2%</span>
                          </div>
                          <div className={`text-2xl font-extrabold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'
                            }`}>
                            ${(claimResult.amount * 0.02).toFixed(2)}
                          </div>
                        </div>

                      </div>

                      {/* Detailed Line Item List */}
                      <div className={`rounded-2xl p-5 space-y-3.5 text-sm font-medium ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'
                        }`}>

                        <div className={`pb-3 flex justify-between items-center border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-200'
                          }`}>
                          <span className={`font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Total Claim Value</span>
                          <span className={`font-mono font-extrabold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            ${claimResult.amount.toFixed(2)} USD
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'
                            }`}>
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                            Bank <ArrowRight className="w-3.5 h-3.5 inline opacity-60" /> Hospital (97%)
                          </span>
                          <div className="text-right">
                            <span className="font-mono text-emerald-600 font-extrabold block">
                              ${(claimResult.amount * 0.97).toFixed(2)} USD
                            </span>
                            <span className={`text-[10px] font-medium block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              {claimResult.hospitalBankAccount || 'CBZ Bank (Acc: 109283746501)'}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'
                            }`}>
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                            Bank <ArrowRight className="w-3.5 h-3.5 inline opacity-60" /> Platform (1%)
                          </span>
                          <span className="font-mono text-blue-600 font-extrabold">
                            ${(claimResult.amount * 0.01).toFixed(2)} USD
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'
                            }`}>
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                            Bank fee kept (2%)
                          </span>
                          <span className={`font-mono font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'
                            }`}>
                            ${(claimResult.amount * 0.02).toFixed(2)} USD
                          </span>
                        </div>

                      </div>

                    </div>

                  </div>
                )}

              </section>
            )}

            {/* Submit Another Claim Action */}
            {claimResult && (
              <div>
                <button
                  type="button"
                  onClick={handleReset}
                  className={`w-full flex items-center justify-center space-x-2 py-4 px-6 rounded-2xl font-extrabold text-sm shadow-sm transition-all cursor-pointer ${isDarkMode
                    ? 'bg-[#131b2e] hover:bg-[#1c2844] text-blue-400'
                    : 'bg-white hover:bg-slate-100 text-blue-600'
                    }`}
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  <span>Submit another claim</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* TAB 2: MEMBER REIMBURSEMENT FLOW */}
        {activeTab === 'member' && (
          <>
            {/* Member Claim Form Section */}
            <section className={`rounded-2xl p-6 sm:p-8 space-y-6 transition-colors ${isDarkMode ? 'bg-[#131b2e] shadow-xl' : 'bg-white shadow-sm'
              }`}>

              <div className="flex items-center justify-between pb-2">
                <div>
                  <h2 className={`text-xl sm:text-2xl font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                    Member reimbursement claim
                  </h2>
                  <p className={`text-sm font-medium mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                    Submit cash expense details for direct member cash reimbursement
                  </p>
                </div>

                {memberClaimResult && (
                  <button
                    type="button"
                    onClick={handleResetMember}
                    className={`flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer ${isDarkMode
                      ? 'bg-[#1e293b] text-blue-400 hover:bg-[#283750]'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset form</span>
                  </button>
                )}
              </div>

              <form onSubmit={handleMemberSubmit} className="space-y-6">

                <div className="flex flex-col gap-6">

                  {/* Field 1: Member Name */}
                  <div className="space-y-2">
                    <label htmlFor="memberName" className={`block text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                      Member name
                    </label>
                    <input
                      id="memberName"
                      type="text"
                      required
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      placeholder="e.g. Tinashe Moyo"
                      className={`w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all ${isDarkMode
                        ? 'bg-[#0f172a] text-white'
                        : 'bg-[#f8fafc] text-slate-900'
                        }`}
                    />
                  </div>

                  {/* Field 2: Member / CIMAS ID */}
                  <div className="space-y-2">
                    <label htmlFor="memberCimasId" className={`block text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                      Member / CIMAS ID
                    </label>
                    <input
                      id="memberCimasId"
                      type="text"
                      required
                      value={memberCimasId}
                      onChange={(e) => setMemberCimasId(e.target.value)}
                      placeholder="e.g. CIM-88213"
                      className={`w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all ${isDarkMode
                        ? 'bg-[#0f172a] text-white'
                        : 'bg-[#f8fafc] text-slate-900'
                        }`}
                    />
                  </div>

                  {/* Field 3: Hospital / Clinic Name */}
                  <div className="space-y-2">
                    <label htmlFor="reimburseHospital" className={`block text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                      Hospital / Clinic name
                    </label>
                    <input
                      id="reimburseHospital"
                      type="text"
                      required
                      value={reimburseHospital}
                      onChange={(e) => setReimburseHospital(e.target.value)}
                      placeholder="e.g. Parirenyatwa Hospital"
                      className={`w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all ${isDarkMode
                        ? 'bg-[#0f172a] text-white'
                        : 'bg-[#f8fafc] text-slate-900'
                        }`}
                    />
                  </div>

                  {/* Field 4: Amount Paid in Cash (default $50) */}
                  <div className="space-y-2">
                    <label htmlFor="cashAmount" className={`block text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                      Amount paid in cash ($ USD)
                    </label>
                    <input
                      id="cashAmount"
                      type="number"
                      min="1"
                      step="any"
                      required
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      placeholder="50"
                      className={`w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all ${isDarkMode
                        ? 'bg-[#0f172a] text-white'
                        : 'bg-[#f8fafc] text-slate-900'
                        }`}
                    />
                  </div>

                </div>

                {/* Field 5: Mobile Money / Bank Account for Payout */}
                <div className="space-y-2">
                  <label htmlFor="payoutAccount" className={`block text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                    Mobile Money / Bank Account for payout
                  </label>
                  <input
                    id="payoutAccount"
                    type="text"
                    required
                    value={payoutAccount}
                    onChange={(e) => setPayoutAccount(e.target.value)}
                    placeholder="e.g. EcoCash (+263 77 123 4567) or CBZ Bank Account"
                    className={`w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all ${isDarkMode
                      ? 'bg-[#0f172a] text-white'
                      : 'bg-[#f8fafc] text-slate-900'
                      }`}
                  />
                </div>

                {/* Submit Claim Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingMember}
                    className="w-full flex items-center justify-center space-x-2 py-4 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmittingMember ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-white mr-2" />
                        <span>Verifying member eligibility sequence...</span>
                      </>
                    ) : (
                      <span>Submit Claim</span>
                    )}
                  </button>
                </div>

              </form>

            </section>

            {/* Staged Loading Verification View (During Member Claim Verification) */}
            {isSubmittingMember && (
              <section className={`rounded-2xl p-6 sm:p-8 space-y-6 animate-pop-in transition-colors ${isDarkMode ? 'bg-[#131b2e] shadow-xl' : 'bg-white shadow-sm'
                }`}>
                <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
                    <h3 className={`text-lg font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      CIMAS Member Verification Sequence
                    </h3>
                  </div>
                  <span className="font-mono text-xs font-bold text-blue-500">Staged Handshake</span>
                </div>

                <div className={`p-6 rounded-2xl space-y-6 ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'}`}>

                  <div className="space-y-4">

                    {/* Stage 1 Check */}
                    <div className={`p-4 rounded-xl flex items-center justify-between transition-all ${memberProcessingStep >= 1
                        ? (memberProcessingStep > 1
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-blue-600/15 text-blue-600 dark:text-blue-400 font-bold')
                        : 'opacity-40'
                      }`}>
                      <div className="flex items-center gap-3">
                        {memberProcessingStep > 1 ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
                        )}
                        <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          Checking CIMAS: is member active?
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold">
                        {memberProcessingStep > 1 ? 'Verified' : 'Checking...'}
                      </span>
                    </div>

                    {/* Stage 2 Check */}
                    <div className={`p-4 rounded-xl flex items-center justify-between transition-all ${memberProcessingStep >= 2
                        ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400 font-bold'
                        : 'opacity-40'
                      }`}>
                      <div className="flex items-center gap-3">
                        {memberProcessingStep >= 2 ? (
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Clock className="w-5 h-5 text-slate-400" />
                        )}
                        <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          Checking CIMAS: is amount covered?
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold">
                        {memberProcessingStep >= 2 ? 'Checking...' : 'Pending'}
                      </span>
                    </div>

                  </div>

                  <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700'
                    }`}>
                    <Activity className="w-4 h-4 shrink-0" />
                    <span>{memberProcessingStatusLabel}</span>
                  </div>

                </div>
              </section>
            )}

            {/* Member Reimbursement Result Section */}
            {memberClaimResult && (
              <section className={`rounded-2xl p-6 sm:p-8 space-y-6 animate-pop-in transition-colors ${isDarkMode ? 'bg-[#131b2e] shadow-xl' : 'bg-white shadow-sm'
                }`}>

                {/* Result Hero Banner */}
                <div className={`p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md ${memberClaimResult.status === 'Approved'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-600 text-white'
                  }`}>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
                      {memberClaimResult.status === 'Approved' ? (
                        <CheckCircle2 className="w-7 h-7" />
                      ) : (
                        <XCircle className="w-7 h-7" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                        {memberClaimResult.status === 'Approved' ? 'Reimbursement Approved' : 'Reimbursement Rejected'}
                      </h3>
                      <p className="text-xs sm:text-sm text-white/90 font-medium mt-0.5">
                        {memberClaimResult.status === 'Approved'
                          ? 'Direct cash refund authorized for member'
                          : 'CIMAS automated checks did not pass'}
                      </p>
                    </div>
                  </div>

                  <div className="self-start sm:self-center font-mono text-xs font-bold bg-black/20 px-3 py-1.5 rounded-lg text-white">
                    {memberClaimResult.timestamp}
                  </div>
                </div>

                {/* Batching & Settlement Notice Line / Badge */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-blue-500/15 text-blue-600 dark:text-blue-400">
                    <Info className="w-4 h-4" />
                    <span>Batched for CIMAS reimbursement — settles every 2 weeks</span>
                  </div>
                  <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Claim Ref: <span className="font-mono font-bold">{memberClaimResult.claimId}</span>
                  </span>
                </div>

                {/* Hero Cash Amount Display */}
                <div className="space-y-6">
                  <div className={`p-6 rounded-2xl text-center space-y-1 ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'}`}>
                    <div className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      Cash Reimbursement Amount
                    </div>
                    <div className={`text-3xl sm:text-5xl font-extrabold font-mono tracking-tight ${memberClaimResult.status === 'Approved'
                        ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600')
                        : (isDarkMode ? 'text-rose-400' : 'text-rose-600')
                      }`}>
                      ${memberClaimResult.amount.toFixed(2)} <span className={`text-base font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>USD</span>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                    <div className={`p-4 rounded-xl space-y-1 ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'}`}>
                      <div className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Member name
                      </div>
                      <div className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {memberClaimResult.memberName}
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl space-y-1 ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'}`}>
                      <div className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Member / CIMAS ID
                      </div>
                      <div className={`text-sm font-mono font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {memberClaimResult.memberId}
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl space-y-1 ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'}`}>
                      <div className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Clinic / Hospital
                      </div>
                      <div className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {memberClaimResult.hospital}
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl space-y-1 ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'}`}>
                      <div className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Payout destination
                      </div>
                      <div className={`text-sm font-bold truncate ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {memberClaimResult.payoutAccount}
                      </div>
                    </div>

                  </div>

                  {/* Rejection Reason (If Rejected) */}
                  {memberClaimResult.status === 'Rejected' && (
                    <div className="p-4 bg-rose-600 text-white rounded-xl flex items-center justify-between font-medium text-sm shadow-md animate-pop-in">
                      <span className="font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>Rejection reason:</span>
                      </span>
                      <span className="font-extrabold bg-black/20 px-3 py-1 rounded-lg text-white">
                        {memberClaimResult.rejectionReason}
                      </span>
                    </div>
                  )}

                </div>

              </section>
            )}

            {/* Member Payment Processing Section (8-Second Countdown & Payout Confirmation) */}
            {memberClaimResult && memberClaimResult.status === 'Approved' && (
              <section className={`rounded-2xl p-6 sm:p-8 space-y-6 animate-pop-in transition-colors ${isDarkMode ? 'bg-[#131b2e] shadow-xl' : 'bg-white shadow-sm'
                }`}>

                <div className="flex items-center justify-between pb-2">
                  <div>
                    <h2 className={`text-xl sm:text-2xl font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      Instant member payout processing
                    </h2>
                    <p className={`text-sm font-medium mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      Sending direct cash reimbursement to member account
                    </p>
                  </div>
                </div>

                {memberCountdown > 0 ? (
                  <div className="space-y-5 py-3">
                    <div className="flex items-center justify-between text-sm font-bold">
                      <span className={`flex items-center gap-2 font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending payment to member...</span>
                      </span>
                      <span className={`font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {memberCountdown}s remaining
                      </span>
                    </div>

                    {/* Progress Bar (8s duration) */}
                    <div className={`w-full rounded-full h-3 overflow-hidden ${isDarkMode ? 'bg-[#0f172a]' : 'bg-slate-200'}`}>
                      <div
                        className="bg-blue-600 h-full transition-all duration-1000 ease-linear rounded-full"
                        style={{ width: `${((8 - memberCountdown) / 8) * 100}%` }}
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setMemberCountdown(0)}
                        className={`text-xs font-bold hover:underline cursor-pointer ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}
                      >
                        Fast-forward (0s)
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Revealed Direct Member Payment Confirmation */
                  <div className="space-y-6 animate-pop-in">

                    <div className={`p-6 rounded-2xl border space-y-4 ${isDarkMode ? 'bg-[#0f172a] border-emerald-500/30' : 'bg-emerald-50/50 border-emerald-200'
                      }`}>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            <h3 className={`text-lg font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              Full Reimbursement Transferred
                            </h3>
                          </div>
                          <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            Direct payout of ${memberClaimResult.amount.toFixed(2)} sent via mobile money/bank account with zero deductions.
                          </p>
                        </div>

                        <div className="text-right">
                          <div className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                            ${memberClaimResult.amount.toFixed(2)} USD
                          </div>
                          <div className="text-[11px] font-bold text-slate-500">100% Full Member Payout</div>
                        </div>
                      </div>

                      <div className={`pt-3 border-t text-xs font-medium flex flex-col sm:flex-row justify-between gap-2 ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
                        }`}>
                        <div>
                          <span>Paid To: </span>
                          <span className="font-bold text-slate-900 dark:text-white">{memberClaimResult.memberName}</span>
                          <span> ({memberClaimResult.payoutAccount})</span>
                        </div>
                        <div className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          Status: Direct Disbursed
                        </div>
                      </div>

                    </div>

                  </div>
                )}

              </section>
            )}

            {/* Submit Another Member Claim Action */}
            {memberClaimResult && (
              <div>
                <button
                  type="button"
                  onClick={handleResetMember}
                  className={`w-full flex items-center justify-center space-x-2 py-4 px-6 rounded-2xl font-extrabold text-sm shadow-sm transition-all cursor-pointer ${isDarkMode
                    ? 'bg-[#131b2e] hover:bg-[#1c2844] text-blue-400'
                    : 'bg-white hover:bg-slate-100 text-blue-600'
                    }`}
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  <span>Submit another reimbursement claim</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* Recent Payments Audit History Section */}
        <section className={`rounded-2xl p-6 sm:p-8 space-y-6 transition-colors ${isDarkMode ? 'bg-[#131b2e] shadow-xl' : 'bg-white shadow-sm'
          }`}>

          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800/80">
            <div>
              <h2 className={`text-xl sm:text-2xl font-extrabold flex items-center gap-2.5 ${isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                <History className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <span>Recent Payments</span>
              </h2>
              <p className={`text-sm font-medium mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                Audit history of provider disbursements and member cash reimbursements
              </p>
            </div>
            <span className={`self-start sm:self-center text-xs font-bold px-3 py-1 rounded-full ${isDarkMode ? 'bg-[#0f172a] text-slate-400' : 'bg-slate-100 text-slate-600'
              }`}>
              Showing {filteredHistory.length} of {paymentHistory.length} entries
            </span>
          </div>

          {/* Controls Bar: 3 Tabs & Search Input */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">

            {/* 3 Status Filter Tabs */}
            <div className={`flex items-center p-1 rounded-xl gap-1 self-start ${isDarkMode ? 'bg-[#0f172a]' : 'bg-slate-100'
              }`}>
              {(['All', 'Approved', 'Rejected'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setHistoryTab(tab)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${historyTab === tab
                    ? (tab === 'Approved'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : tab === 'Rejected'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-blue-600 text-white shadow-xs')
                    : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                    }`}
                >
                  {tab === 'Approved' ? 'Accepted' : tab}
                </button>
              ))}
            </div>

            {/* Search Input Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`} />
              <input
                type="text"
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                placeholder="Search by ID, hospital, member, flow type..."
                className={`w-full pl-10 pr-9 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all ${isDarkMode
                  ? 'bg-[#0f172a] text-white placeholder-slate-500'
                  : 'bg-[#f8fafc] text-slate-900 placeholder-slate-400 border border-slate-200/60'
                  }`}
              />
              {historySearchQuery && (
                <button
                  type="button"
                  onClick={() => setHistorySearchQuery('')}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-500/20 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          </div>

          {/* Table / List View */}
          {filteredHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[720px]">
                <thead>
                  <tr className={`text-xs font-bold uppercase tracking-wider border-b ${isDarkMode ? 'text-slate-400 border-slate-800' : 'text-slate-600 border-slate-200'
                    }`}>
                    <th className="pb-3 px-3">Flow Type</th>
                    <th className="pb-3 px-3">Reference ID</th>
                    <th className="pb-3 px-3">Hospital / Member</th>
                    <th className="pb-3 px-3 text-right">Claim Amount</th>
                    <th className="pb-3 px-3 text-center">Status</th>
                    <th className="pb-3 px-3 text-right">Payout Detail</th>
                    <th className="pb-3 px-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y-0">
                  {filteredHistory.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`transition-colors text-sm font-medium ${index % 2 === 0
                        ? (isDarkMode ? 'bg-[#0f172a]/60' : 'bg-[#f8fafc]')
                        : (isDarkMode ? 'bg-[#131b2e]' : 'bg-white')
                        } ${isDarkMode ? 'hover:bg-[#1a253e]' : 'hover:bg-slate-100/70'}`}
                    >
                      {/* Tag / Label for Flow Type */}
                      <td className="py-4 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-extrabold ${item.flowType === 'Member Reimbursement'
                            ? (isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-800')
                            : (isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-800')
                          }`}>
                          {item.flowType === 'Member Reimbursement' ? (
                            <User className="w-3 h-3" />
                          ) : (
                            <Building2 className="w-3 h-3" />
                          )}
                          <span>{item.flowType}</span>
                        </span>
                      </td>

                      <td className="py-4 px-3 font-mono font-bold text-xs">
                        <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>
                          {item.claimId}
                        </span>
                      </td>

                      <td className="py-4 px-3 font-semibold">
                        <div className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>
                          {item.hospital}
                        </div>
                        {item.flowType === 'Service Provider' && item.hospitalBankAccount && (
                          <div className={`text-xs font-normal ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Bank: {item.hospitalBankAccount}
                          </div>
                        )}
                        {item.memberName && (
                          <div className={`text-xs font-normal ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Member: {item.memberName}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-3 text-right font-mono font-extrabold">
                        <span className={isDarkMode ? 'text-blue-400' : 'text-blue-600'}>
                          ${item.amount.toFixed(2)}
                        </span>
                      </td>

                      <td className="py-4 px-3 text-center">
                        {item.status === 'Approved' ? (
                          <span className="inline-block px-2.5 py-1 rounded-md text-xs font-extrabold bg-emerald-600 text-white shadow-xs">
                            Accepted
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 rounded-md text-xs font-extrabold bg-rose-600 text-white shadow-xs" title={item.rejectionReason}>
                            Rejected
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-3 text-right font-mono font-bold">
                        {item.status === 'Approved' ? (
                          item.flowType === 'Member Reimbursement' ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              ${item.memberPayout?.toFixed(2) || item.amount.toFixed(2)} (Direct)
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              ${item.hospitalPayout?.toFixed(2)} (97%)
                            </span>
                          )
                        ) : (
                          <span className={isDarkMode ? 'text-slate-600' : 'text-slate-400'}>
                            $0.00
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-3 text-right text-xs font-medium">
                        <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                          {item.timestamp}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`p-8 rounded-xl text-center space-y-2 ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'
              }`}>
              <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                No payment entries found
              </p>
              <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                Try adjusting your status tab or search filter query.
              </p>
            </div>
          )}

        </section>

      </main>

      {/* Production Footer */}
      <footer className={`py-8 mt-12 transition-colors ${isDarkMode ? 'bg-[#131b2e]' : 'bg-white shadow-sm'
        }`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center text-xs font-medium text-slate-500">
          <p>&copy; {new Date().getFullYear()} CIMAS Health Group. All rights reserved. • Health Pay v2.4</p>
        </div>
      </footer>

    </div>
  );
}
