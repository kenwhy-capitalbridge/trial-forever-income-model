import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Download, Info, ShieldCheck, AlertTriangle, TrendingUp, Calendar, Clock, Landmark, ArrowRight, CheckCircle2, Wallet, BarChart3, Home, Loader2, Coins, Users, Timer } from 'lucide-react';
import SliderInput from './components/SliderInput';
import { ExpenseType, CalculationResult } from './types';
import { formatCurrency, formatPercent } from './utils/formatters';

// Updated currencies as per the latest request
const currencies = ['RM', 'SGD', 'USD', 'THB', 'AUD', 'PHP', 'RMB', 'HKD'];

const App: React.FC = () => {
const allowedDomains = [
  "www.thecapitalbridge.com",
  "thecapitalbridge.com",
  "https://forever-income-calculator.vercel.app",
  "localhost"
];

const isAllowed =
  typeof window === "undefined" ||
  allowedDomains.includes(window.location.hostname);

if (!isAllowed) {
  return (
    <div style={{
      display: "flex",
      height: "100vh",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "sans-serif"
    }}>
      Unauthorized domain
    </div>
  );
}


  // Global Currency State
  const [currency, setCurrency] = useState<string>('RM');
  
  // Expense & Market States
  const [expense, setExpense] = useState<number>(10000);
  const [expenseType, setExpenseType] = useState<ExpenseType>(ExpenseType.MONTHLY);
  const [familyContribution, setFamilyContribution] = useState<number>(0);
  const [expectedReturn, setExpectedReturn] = useState<number>(7);
  const [inflationRate, setInflationRate] = useState<number>(2);
  const [isGenerating, setIsGenerating] = useState(false);

  // Granular Asset States
  const [cash, setCash] = useState<number>(20000);
  const [investments, setInvestments] = useState<number>(250000);
  const [realEstate, setRealEstate] = useState<number>(500000);
  
  // Property Specific Sub-states
  const [propertyLoanCost, setPropertyLoanCost] = useState<number>(3.55);
  const [propertyTimeHorizon, setPropertyTimeHorizon] = useState<number>(20);

  // Dynamic Slider Configs based on Currency Groups
  const sliderConfigs = useMemo(() => {
    const isGroup1 = ['RM', 'SGD', 'USD', 'AUD'].includes(currency);
    const isAnnual = expenseType === ExpenseType.ANNUAL;
    const mult = isAnnual ? 12 : 1;
    
    if (isGroup1) {
      return {
        lifestyle: { max: 200000 * mult, step: 5000 * mult },
        cash: { max: 5000000, step: 25000 },
        investments: { max: 5000000, step: 25000 },
        property: { max: 5000000, step: 25000 },
        contribution: { max: 100000 * mult, step: 1000 * mult }
      };
    } else {
      return {
        lifestyle: { max: 500000 * mult, step: 10000 * mult },
        cash: { max: 30000000, step: 50000 },
        investments: { max: 30000000, step: 30000 },
        property: { max: 30000000, step: 50000 },
        contribution: { max: 500000 * mult, step: 5000 * mult }
      };
    }
  }, [currency, expenseType]);

  const results = useMemo((): CalculationResult & { runway: string } => {
    const baseAnnualExpense = expenseType === ExpenseType.MONTHLY ? expense * 12 : expense;
    
    let propertyMonthlyRepayment = 0;
    if (realEstate > 0 && propertyTimeHorizon > 0) {
      const annualRate = propertyLoanCost / 100;
      const monthlyRate = annualRate / 12;
      const totalMonths = propertyTimeHorizon * 12;
      
      if (monthlyRate === 0) {
        propertyMonthlyRepayment = realEstate / totalMonths;
      } else {
        propertyMonthlyRepayment = (realEstate * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalMonths));
      }
    }

    const annualContribution = expenseType === ExpenseType.MONTHLY ? familyContribution * 12 : familyContribution;
    const totalGrossAnnualExpense = baseAnnualExpense + (propertyMonthlyRepayment * 12);
    const netAnnualExpense = Math.max(0, totalGrossAnnualExpense - annualContribution);
    const netMonthlyExpense = netAnnualExpense / 12;

    const realReturnRateDecimal = (expectedReturn - inflationRate) / 100;
    const isSustainable = realReturnRateDecimal > 0;
    const capitalNeeded = isSustainable ? netAnnualExpense / realReturnRateDecimal : (netAnnualExpense > 0 ? Infinity : 0);
    
    const totalAssets = cash + investments + realEstate;
    const gap = isSustainable ? Math.max(0, capitalNeeded - totalAssets) : 0;
    const progressPercent = isSustainable ? (capitalNeeded === 0 ? 100 : Math.min(100, (totalAssets / capitalNeeded) * 100)) : 0;

    // Calculate Time Horizon / Runway (Standard financial engineering formula for capital depletion)
    let runway = "0 Years";
    if (netAnnualExpense <= 0) {
      runway = "Perpetual";
    } else {
      const C = totalAssets;
      const W = netAnnualExpense;
      const r = realReturnRateDecimal;

      if (r > 0) {
        if (C * r >= W) {
          runway = "Perpetual";
        } else {
          // n = ln( W / (W - C*r) ) / ln( 1 + r )
          const years = Math.log(W / (W - C * r)) / Math.log(1 + r);
          runway = years.toFixed(1) + " Years";
        }
      } else if (r === 0) {
        runway = (C / W).toFixed(1) + " Years";
      } else {
        // Handle negative real return rate
        const years = Math.log(W / (W - C * r)) / Math.log(1 + r);
        runway = !isNaN(years) ? years.toFixed(1) + " Years" : "0 Years";
      }
    }

    return {
      monthlyExpense: netMonthlyExpense,
      annualExpense: netAnnualExpense,
      propertyMonthlyRepayment,
      familyContribution: annualContribution / 12,
      expectedReturn,
      inflationRate,
      realReturnRate: realReturnRateDecimal * 100,
      capitalNeeded,
      currentAssets: totalAssets,
      assetBreakdown: { cash, investments, realEstate },
      gap,
      progressPercent,
      isSustainable,
      runway
    };
  }, [expense, expenseType, familyContribution, expectedReturn, inflationRate, cash, investments, realEstate, propertyLoanCost, propertyTimeHorizon]);

  const handleExpenseTypeChange = (newType: ExpenseType) => {
    if (newType === expenseType) return;
    if (newType === ExpenseType.ANNUAL) {
      setExpense(expense * 12);
      setFamilyContribution(familyContribution * 12);
    } else {
      setExpense(Math.round(expense / 12));
      setFamilyContribution(Math.round(familyContribution / 12));
    }
    setExpenseType(newType);
  };

  const chartData = [
    { name: 'Cash', value: results.assetBreakdown.cash },
    { name: 'Investments', value: results.assetBreakdown.investments },
    { name: 'Property Equity/Value', value: results.assetBreakdown.realEstate },
    { name: 'Remaining Gap', value: results.gap > 0 ? results.gap : 0 },
  ];

  const COLORS = ['#FFCC6A', '#F97316', '#22C55E', '#164d2a'];

  const isSurplusState = results.currentAssets >= results.capitalNeeded;
  const capitalDiff = results.isSustainable ? Math.abs(results.currentAssets - results.capitalNeeded) : 0;
  
  // Explicit "Annum" or "Monthly" toggle for income impact text
  const displayImpactLabel = expenseType === ExpenseType.MONTHLY ? 'Monthly' : 'Annum';
  const displayIncomeImpact = expenseType === ExpenseType.MONTHLY 
    ? (capitalDiff * (results.realReturnRate / 100)) / 12 
    : (capitalDiff * (results.realReturnRate / 100));

  const handleDownloadPDF = async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const jspdfModule = (window as any).jspdf;
      if (!jspdfModule || !jspdfModule.jsPDF) {
        throw new Error("jsPDF library not initialized");
      }
      
      const doc = new jspdfModule.jsPDF('p', 'mm', 'a4');
      doc.setFillColor(13, 58, 29);
      doc.rect(0, 0, 210, 45, 'F');
      doc.setTextColor(255, 204, 106);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('STRATEGIC WEALTH ROADMAP', 105, 25, { align: 'center' });
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('CAPITAL BRIDGE PRIVATE WEALTH ANALYTICS', 105, 33, { align: 'center' });

      doc.setTextColor(13, 58, 29);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('1. Cash Flow & Offset Profile', 20, 60);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(`Base Lifestyle Expense: ${formatCurrency(expenseType === ExpenseType.ANNUAL ? expense : expense * 12, currency)}/year`, 20, 70);
      doc.text(`Property Debt Service: ${formatCurrency(results.propertyMonthlyRepayment * 12, currency)}/year`, 20, 77);
      doc.text(`Family Contribution Offset: -${formatCurrency(results.familyContribution * 12, currency)}/year`, 20, 84);
      doc.text(`NET STRATEGIC WITHDRAWAL: ${formatCurrency(results.annualExpense, currency)}/year`, 20, 91);
      doc.text(`Yield Expected: ${results.expectedReturn}% | Inflation: ${results.inflationRate}%`, 20, 98);

      doc.setTextColor(13, 58, 29);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('2. Capital Reserves', 20, 112);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(`- LIQUID CASH: ${formatCurrency(cash, currency)}`, 30, 122);
      doc.text(`- MARKET INVESTMENTS: ${formatCurrency(investments, currency)}`, 30, 129);
      doc.text(`- Real Estate to be unlocked: ${formatCurrency(realEstate, currency)}`, 30, 136);
      doc.text(`  (House/land/shop/business)`, 30, 142);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(13, 58, 29);
      doc.text(`Aggregate Capital: ${formatCurrency(results.currentAssets, currency)}`, 20, 153);

      doc.setDrawColor(255, 204, 106);
      doc.setLineWidth(0.8);
      doc.setFillColor(248, 248, 248);
      doc.roundedRect(20, 166, 170, 85, 4, 4, 'FD');
      
      doc.setFontSize(11);
      doc.setTextColor(13, 58, 29);
      doc.setFont('helvetica', 'bold');
      doc.text('FOREVER CAPITAL TARGET (NET):', 105, 181, { align: 'center' });
      
      doc.setFontSize(24);
      doc.setTextColor(218, 165, 32);
      doc.text(results.isSustainable ? formatCurrency(results.capitalNeeded, currency) : 'Infinity (Negative Yield)', 105, 198, { align: 'center' });

      doc.setFontSize(11);
      doc.setTextColor(13, 58, 29);
      doc.text(isSurplusState ? `WEALTH SURPLUS (Portfolio):` : `CAPITAL DEPLETION (Portfolio):`, 105, 214, { align: 'center' });
      
      doc.setFontSize(16);
      const gapColor = isSurplusState ? [13, 120, 29] : [200, 50, 50];
      doc.setTextColor(...gapColor);
      doc.text(results.isSustainable ? formatCurrency(capitalDiff, currency) : 'UNSUSTAINABLE ROI', 105, 228, { align: 'center' });
      
      doc.setFontSize(9);
      doc.text(`${displayImpactLabel} Income Impact: ${formatCurrency(displayIncomeImpact, currency)}`, 105, 234, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text(`CAPITAL TIME HORIZON: ${results.runway.toUpperCase()}`, 105, 242, { align: 'center' });

      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      doc.setFont('helvetica', 'normal');
      doc.text('NON-PII SECURE REPORT | CAPITAL BRIDGE PRIVATE WEALTH ADVISORY', 105, 280, { align: 'center' });
      doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });

      doc.save(`Wealth-Roadmap-${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error("PDF Generation Error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const status = useMemo(() => {
    if (!results.isSustainable) {
      return { label: 'NEGATIVE YIELD', bgColor: 'bg-red-900/40', textColor: 'text-red-400', borderColor: 'border-red-500/30', icon: <AlertTriangle className="w-3.5 h-3.5" /> };
    }
    if (results.progressPercent < 50) return { label: 'CRITICAL GAP', bgColor: 'bg-red-900/40', textColor: 'text-red-400', borderColor: 'border-red-500/30', icon: <AlertTriangle className="w-3.5 h-3.5" /> };
    if (results.progressPercent < 90) return { label: 'GROWTH PHASE', bgColor: 'bg-amber-900/40', textColor: 'text-amber-400', borderColor: 'border-amber-500/30', icon: <TrendingUp className="w-3.5 h-3.5" /> };
    return { label: 'STRATEGY SECURED', bgColor: 'bg-emerald-900/40', textColor: 'text-emerald-400', borderColor: 'border-emerald-500/30', icon: <ShieldCheck className="w-3.5 h-3.5" /> };
  }, [results.isSustainable, results.progressPercent]);

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <main className="w-full max-w-[900px] bg-[#0D3A1D] rounded-3xl border-2 border-[#FFCC6A] shadow-[0_0_50px_rgba(255,204,106,0.1)] overflow-hidden">
        <div className="flex flex-col">
          <div className="p-6 md:p-10 bg-black/10 border-b border-[#FFCC6A]/20">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-8">
              <h2 className="text-xl font-semibold text-[#FFCC6A] flex items-center gap-2 flex-shrink-0">
                <Landmark className="w-5 h-5" /> Forever Income Calculator
              </h2>
              <div className="flex flex-wrap bg-emerald-950/50 rounded-lg p-0.5 border border-[#FFCC6A]/20 gap-0.5 max-w-full">
                {currencies.map((curr) => (
                  <button key={curr} onClick={() => setCurrency(curr)} className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all flex-shrink-0 ${currency === curr ? 'bg-[#FFCC6A] text-[#0D3A1D] shadow-sm' : 'text-gray-400 hover:text-white'}`}>
                    {curr}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8 space-y-6">
              <div className="relative flex p-1 bg-emerald-950/50 rounded-xl border border-white/5">
                <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#FFCC6A] rounded-lg transition-all duration-300 ease-in-out shadow-sm ${expenseType === ExpenseType.ANNUAL ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'}`} />
                <button onClick={() => handleExpenseTypeChange(ExpenseType.MONTHLY)} className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-[10px] sm:text-xs font-bold transition-colors ${expenseType === ExpenseType.MONTHLY ? 'text-[#0D3A1D]' : 'text-gray-400'}`}>
                  <Clock className="w-4 h-4" /> Monthly Expense
                </button>
                <button onClick={() => handleExpenseTypeChange(ExpenseType.ANNUAL)} className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-[10px] sm:text-xs font-bold transition-colors ${expenseType === ExpenseType.ANNUAL ? 'text-[#0D3A1D]' : 'text-gray-400'}`}>
                  <Calendar className="w-4 h-4" /> Annual Expense
                </button>
              </div>

              <div className="space-y-4">
                <SliderInput 
                  label={expenseType === ExpenseType.MONTHLY ? "Monthly Expenses" : "Base Annual Lifestyle Spend"} 
                  value={expense} 
                  min={0} 
                  max={sliderConfigs.lifestyle.max} 
                  step={sliderConfigs.lifestyle.step} 
                  unit="" 
                  prefix={currency} 
                  onChange={setExpense} 
                />
                <div className="pt-2">
                   <SliderInput label={expenseType === ExpenseType.MONTHLY ? "MONTHLY FAMILY CONTRIBUTION/INCOME/SALARY (Monthly Offset)" : "MONTHLY FAMILY CONTRIBUTION/INCOME/SALARY (Annual Offset)"} value={familyContribution} min={0} max={sliderConfigs.contribution.max} step={sliderConfigs.contribution.step} unit="" prefix={currency} onChange={setFamilyContribution} />
                  <p className="text-[10px] text-[#FFCC6A]/70 leading-relaxed italic px-1 opacity-80 flex items-center gap-1">
                    <Users className="w-3 h-3" /> External support reduces your net withdrawal from capital reserves.
                  </p>
                </div>
              </div>

              <div className="space-y-4 p-5 rounded-2xl bg-[#FFCC6A]/5 border border-[#FFCC6A]/20 mt-6">
                <h3 className="text-[10px] font-black uppercase text-[#FFCC6A]/60 tracking-[0.2em] mb-4">Capital Allocation</h3>
                <SliderInput label={"CASH:\nSALARY/SAVINGS/FD"} value={cash} min={0} max={sliderConfigs.cash.max} step={sliderConfigs.cash.step} unit="" prefix={currency} onChange={setCash} />
                <SliderInput label={"INVESTMENTS/SAVINGS:\nEquities, ETFs, Unit Trusts, Retirement Savings"} value={investments} min={0} max={sliderConfigs.investments.max} step={sliderConfigs.investments.step} unit="" prefix={currency} onChange={setInvestments} />
                <div className="pt-4 border-t border-[#FFCC6A]/10 mt-4 space-y-4">
                  <SliderInput label={"Real Estate to be unlocked:\nHouse/land/shop/business)"} value={realEstate} min={0} max={sliderConfigs.property.max} step={sliderConfigs.property.step} unit="" prefix={currency} onChange={setRealEstate} />
                  {realEstate > 0 && (
                    <div className="pl-4 border-l-2 border-[#FFCC6A]/20 transition-all duration-300 animate-in fade-in slide-in-from-left-2 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold text-[#FFCC6A] uppercase tracking-wider">Loan Amortization</span>
                        <div className="px-3 py-1 bg-[#FFCC6A] rounded-md text-[#0D3A1D] text-[10px] font-black shadow-lg">Repayment: {formatCurrency(results.propertyMonthlyRepayment, currency)}/mo</div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <SliderInput label="Loan Cost / EIR %" value={propertyLoanCost} min={0} max={10} step={0.05} unit="%" onChange={setPropertyLoanCost} />
                        <SliderInput label="Time Horizon" value={propertyTimeHorizon} min={0} max={30} step={0.5} unit=" Years" onChange={setPropertyTimeHorizon} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SliderInput label="Expected ROI %" value={expectedReturn} min={0.1} max={20} step={0.1} unit="%" onChange={setExpectedReturn} />
                <SliderInput label="Inflation Rate %" value={inflationRate} min={0} max={15} step={0.1} unit="%" onChange={setInflationRate} />
              </div>
            </div>
          </div>

          <div className="p-6 md:p-10 flex flex-col relative overflow-hidden">
            <div className="absolute right-[-10%] bottom-[-5%] opacity-[0.03] pointer-events-none transform rotate-[-15deg]">
              <img src="https://raw.githubusercontent.com/ai-studio-assets/lion-logo/main/lion-gold.png" alt="" className="w-96 h-96 grayscale invert" />
            </div>

            <div className="flex justify-between items-start mb-10 relative z-10">
              <h2 className="text-xl font-semibold text-[#FFCC6A]">Strategic Gap Analysis</h2>
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${status.bgColor} ${status.textColor} text-[10px] font-bold border ${status.borderColor}`}>
                {status.icon} {status.label}
              </span>
            </div>

            <div className="flex-1 flex flex-col relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Target Capital</p>
                  <p className="text-xl font-black text-[#FFCC6A]">{results.isSustainable ? formatCurrency(results.capitalNeeded, currency) : '∞'}</p>
                </div>
                <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Total Assets</p>
                  <p className="text-xl font-black text-white">{formatCurrency(results.currentAssets, currency)}</p>
                </div>
                <div className={`p-4 rounded-xl transition-colors duration-500 ${isSurplusState ? 'bg-emerald-950/40 border-emerald-500/30' : 'bg-[#164d2a]/30 border-[#FFCC6A]/20'} text-center relative overflow-hidden border flex flex-col justify-center min-h-[135px]`}>
                  <p className={`text-[10px] uppercase tracking-widest mb-0.5 font-bold ${isSurplusState ? 'text-emerald-400/70' : 'text-[#FFCC6A]/60'}`}>
                    {isSurplusState ? 'Wealth Surplus' : 'Capital Depletion'}
                  </p>
                  <p className={`text-lg font-black leading-tight ${isSurplusState ? 'text-emerald-400' : 'text-[#FFCC6A]'}`}>
                    {results.isSustainable ? formatCurrency(capitalDiff, currency) : 'UNSUSTAINABLE'}
                  </p>
                  <div className={`mt-2 border-t pt-2 ${isSurplusState ? 'border-emerald-500/20' : 'border-[#FFCC6A]/20'} flex flex-col gap-1`}>
                    <p className={`text-[9px] font-bold uppercase tracking-tight ${isSurplusState ? 'text-emerald-500/80' : 'text-amber-500/80'}`}>
                      {displayImpactLabel} Impact: {formatCurrency(displayIncomeImpact, currency)}
                    </p>
                    <div className="flex items-center justify-center gap-1.5 mt-0.5">
                       <Timer className={`w-3.5 h-3.5 ${isSurplusState ? 'text-emerald-400' : 'text-[#FFCC6A]'}`} />
                       <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isSurplusState ? 'text-emerald-400' : 'text-[#FFCC6A]'}`}>
                        Horizon: {results.runway}
                       </p>
                    </div>
                  </div>
                  {isSurplusState && <CheckCircle2 className="absolute -right-2 -bottom-2 w-10 h-10 text-emerald-400 opacity-20 rotate-12" />}
                </div>
              </div>

              <div className="mb-10">
                <div className="flex justify-between items-end mb-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Forever Capital Bridge</p>
                  <p className="text-3xl font-black text-[#FFCC6A]">{results.progressPercent.toFixed(1)}%</p>
                </div>
                <div className="h-5 w-full bg-emerald-950/80 rounded-full overflow-hidden border border-white/5 p-1">
                  <div className={`h-full bg-gradient-to-r from-[#FFCC6A] to-[#F97316] shadow-[0_0_20px_rgba(255,204,106,0.4)] transition-all duration-1000 ease-out rounded-full`} style={{ width: `${results.progressPercent}%` }} />
                </div>
              </div>

              <div className="flex-1 min-h-[350px] relative flex items-center justify-center">
                <div className="w-full h-full absolute inset-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, left: 0, right: 0, bottom: 0 }}>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={100} outerRadius={130} paddingAngle={8} dataKey="value" stroke="none" animationDuration={1200}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0D3A1D', borderRadius: '16px', border: '1px solid #FFCC6A', color: 'white' }} itemStyle={{ color: '#FFCC6A' }} formatter={(value: any) => formatCurrency(value, currency)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Net Withdrawal</span>
                  <span className="text-3xl font-black text-[#FFCC6A] leading-none mb-1">{formatCurrency(results.monthlyExpense, currency)}</span>
                  <span className="text-[10px] text-gray-500 uppercase font-medium leading-none">Monthly Dependency</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10 text-[10px] uppercase font-bold tracking-tighter">
                {chartData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 bg-black/10 rounded-lg min-h-[50px] border border-white/5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i] }}></div>
                    <span className="text-gray-400 leading-tight break-words">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 relative z-10">
              <button onClick={handleDownloadPDF} disabled={!results.isSustainable || isGenerating} className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-black text-lg transition-all ${results.isSustainable && !isGenerating ? 'bg-[#FFCC6A] text-[#0D3A1D] hover:bg-white hover:-translate-y-1 shadow-2xl shadow-[#FFCC6A]/10' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}>
                {isGenerating ? <><Loader2 className="w-6 h-6 animate-spin" /> Generating Roadmap...</> : <><Download className="w-6 h-6" /> Download Income Roadmap</>}
              </button>
              <p className="mt-3 text-center text-[10px] text-white font-medium italic px-4 leading-normal">
                *Please save or print a copy for your records. Capital Bridge does not save or store your personal information.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;