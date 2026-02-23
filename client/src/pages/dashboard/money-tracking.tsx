import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { DEFAULT_EXPENSE_CATEGORIES } from "@shared/schema";
import type { Expense, ExpenseCategory, Budget, Subscription, Bill, CreditCard, SavingsGoal, MoneySettings } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  LayoutDashboard, Receipt, Target, CreditCard as CreditCardIcon, FileBarChart, PiggyBank, Settings2,
  Plus, Trash2, Edit2, ChevronRight, TrendingUp, TrendingDown, DollarSign, Calendar, Bell,
  ArrowUpRight, ArrowDownRight, Wallet, IndianRupee, Check, X, Search, Filter, Download,
  BarChart3, RefreshCw, Clock, Star, AlertTriangle, Loader2,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, Legend,
} from "recharts";

// ===== MONEY FORMATTING HELPERS =====
function formatMoney(amountInPaise: number, symbol = "₹", position = "before", decimals = 0): string {
  const value = amountInPaise / 100;
  const formatted = value.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return position === "before" ? `${symbol}${formatted}` : `${formatted}${symbol}`;
}

function getCategoryInfo(key: string, categories: ExpenseCategory[]) {
  const cat = categories.find(c => c.key === key);
  if (cat) return { name: cat.name, emoji: cat.emoji, color: cat.color };
  const def = DEFAULT_EXPENSE_CATEGORIES.find(c => c.key === key);
  if (def) return { name: def.name, emoji: def.emoji, color: def.color };
  return { name: key, emoji: "📦", color: "#B2BEC3" };
}

// ===== TAB DEFINITIONS =====
const TABS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "expenses", label: "Expenses", icon: Receipt },
  { key: "budget", label: "Budget", icon: Target },
  { key: "subscriptions", label: "Subscriptions", icon: RefreshCw },
  { key: "bills", label: "Bills & Cards", icon: CreditCardIcon },
  { key: "reports", label: "Reports", icon: FileBarChart },
  { key: "goals", label: "Goals", icon: PiggyBank },
  { key: "settings", label: "Settings", icon: Settings2 },
] as const;

type TabKey = typeof TABS[number]["key"];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "debit_card", label: "Debit Card" },
  { value: "credit_card", label: "Credit Card" },
  { value: "upi", label: "UPI" },
  { value: "net_banking", label: "Net Banking" },
  { value: "other", label: "Other" },
];

const CURRENCIES = [
  { value: "INR", symbol: "₹", label: "INR (₹)" },
  { value: "USD", symbol: "$", label: "USD ($)" },
  { value: "EUR", symbol: "€", label: "EUR (€)" },
  { value: "GBP", symbol: "£", label: "GBP (£)" },
  { value: "AED", symbol: "د.إ", label: "AED (د.إ)" },
];

// ===== MAIN COMPONENT =====
export default function MoneyTrackingPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const { toast } = useToast();

  const { data: moneySettings } = useQuery<MoneySettings>({ queryKey: ["/api/money/settings"] });
  const { data: categories = [] } = useQuery<ExpenseCategory[]>({ queryKey: ["/api/money/categories"] });
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<any>({ queryKey: ["/api/money/dashboard"] });

  const currencySymbol = moneySettings?.currencySymbol || "₹";
  const symbolPosition = moneySettings?.symbolPosition || "before";
  const decimalPlaces = moneySettings?.decimalPlaces || 0;

  const fmt = (amount: number) => formatMoney(amount, currencySymbol, symbolPosition, decimalPlaces);

  return (
    <div className="flex flex-col h-full" data-testid="money-tracking-page">
      {/* Sub-navigation */}
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex overflow-x-auto scrollbar-hide gap-1 px-4 py-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap",
                  activeTab !== tab.key && "text-muted-foreground"
                )}
                data-testid={`tab-${tab.key}`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {activeTab === "dashboard" && (
          <DashboardTab data={dashboardData} loading={dashboardLoading} fmt={fmt} categories={categories} />
        )}
        {activeTab === "expenses" && (
          <ExpensesTab fmt={fmt} categories={categories} currencySymbol={currencySymbol} />
        )}
        {activeTab === "budget" && (
          <BudgetTab fmt={fmt} categories={categories} />
        )}
        {activeTab === "subscriptions" && (
          <SubscriptionsTab fmt={fmt} />
        )}
        {activeTab === "bills" && (
          <BillsCardsTab fmt={fmt} categories={categories} />
        )}
        {activeTab === "reports" && (
          <ReportsTab fmt={fmt} categories={categories} />
        )}
        {activeTab === "goals" && (
          <GoalsTab fmt={fmt} />
        )}
        {activeTab === "settings" && (
          <MoneySettingsTab />
        )}
      </div>
    </div>
  );
}

// ===== DASHBOARD TAB =====
function DashboardTab({ data, loading, fmt, categories }: { data: any; loading: boolean; fmt: (n: number) => string; categories: ExpenseCategory[] }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <IndianRupee className="w-16 h-16 mx-auto mb-4 opacity-30" />
        <h3 className="text-lg font-medium mb-2">Welcome to Money Tracking</h3>
        <p>Start by adding your monthly income in Settings and logging your first expense.</p>
      </div>
    );
  }

  const { income, totalSpent, remaining, savingsRate, categorySpending, dailySpending, upcomingPayments, recentTransactions, budgetProgress, quickStats, activeGoals } = data;

  const remainingColor = remaining >= income * 0.2 ? "text-emerald-400" : remaining >= 0 ? "text-yellow-400" : "text-red-400";

  const pieData = Object.entries(categorySpending as Record<string, number>)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => {
      const info = getCategoryInfo(key, categories);
      return { name: info.name, value, color: info.color, emoji: info.emoji };
    })
    .sort((a, b) => b.value - a.value);

  const dailyChartData = Object.entries(dailySpending as Record<string, number>)
    .map(([date, amount]) => ({ date: format(parseISO(date), "dd"), amount: amount / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const savingsMessage = savingsRate >= 30 ? "Excellent! You're saving like a pro!" :
    savingsRate >= 20 ? "Great! Saving above 20% is excellent." :
    savingsRate >= 10 ? "Good start. Try to push towards 20%." :
    savingsRate >= 0 ? "Try to cut back a little this month." :
    "You're overspending. Review your expenses.";

  return (
    <div className="space-y-6" data-testid="money-dashboard">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Total Income" value={fmt(income)} icon={<Wallet className="w-5 h-5" />} color="text-emerald-400" bgColor="bg-emerald-500/10" testId="card-income" />
        <SummaryCard title="Total Spent" value={fmt(totalSpent)} icon={<ArrowDownRight className="w-5 h-5" />} color="text-red-400" bgColor="bg-red-500/10" testId="card-spent" />
        <SummaryCard title="Remaining" value={fmt(remaining)} icon={<TrendingUp className="w-5 h-5" />} color={remainingColor} bgColor="bg-blue-500/10" testId="card-remaining" />
        <SummaryCard title="Upcoming (7 days)" value={`${upcomingPayments?.filter((p: any) => differenceInDays(parseISO(p.dueDate), new Date()) <= 7).length || 0} payments`} icon={<Bell className="w-5 h-5" />} color="text-orange-400" bgColor="bg-orange-500/10" testId="card-upcoming" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by Category - Donut */}
        <div className="bg-card border border-border/50 rounded-xl p-5" data-testid="chart-category-spending">
          <h3 className="text-sm font-semibold text-foreground mb-4">Spending by Category</h3>
          {pieData.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => fmt(val)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {pieData.slice(0, 6).map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.emoji} {d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground text-sm">No spending data yet</div>
          )}
        </div>

        {/* Daily Spending Trend */}
        <div className="bg-card border border-border/50 rounded-xl p-5" data-testid="chart-daily-spending">
          <h3 className="text-sm font-semibold text-foreground mb-4">Daily Spending Trend</h3>
          {dailyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#888" fontSize={11} />
                <YAxis stroke="#888" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Line type="monotone" dataKey="amount" stroke="#6C5CE7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-10 text-muted-foreground text-sm">No spending data yet</div>
          )}
        </div>
      </div>

      {/* Budget Progress */}
      {budgetProgress && budgetProgress.length > 0 && (
        <div className="bg-card border border-border/50 rounded-xl p-5" data-testid="section-budget-progress">
          <h3 className="text-sm font-semibold text-foreground mb-4">Budget Progress</h3>
          <div className="space-y-3">
            {budgetProgress.map((b: any) => {
              const info = getCategoryInfo(b.categoryKey, categories);
              const pct = b.percentage;
              const barColor = pct <= 70 ? "bg-emerald-500" : pct <= 90 ? "bg-yellow-500" : "bg-red-500";
              return (
                <div key={b.categoryKey} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{info.emoji} {info.name}</span>
                    <span className="text-muted-foreground">{fmt(b.spent)} / {fmt(b.limit)} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Row: Upcoming Payments + Recent Transactions + Savings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Payments */}
        <div className="bg-card border border-border/50 rounded-xl p-5" data-testid="section-upcoming">
          <h3 className="text-sm font-semibold text-foreground mb-3">Upcoming Payments</h3>
          {upcomingPayments?.length > 0 ? (
            <div className="space-y-2">
              {upcomingPayments.slice(0, 5).map((p: any, i: number) => {
                const daysLeft = differenceInDays(parseISO(p.dueDate), new Date());
                const urgency = daysLeft <= 1 ? "text-red-400" : daysLeft <= 3 ? "text-orange-400" : daysLeft <= 7 ? "text-yellow-400" : "text-muted-foreground";
                return (
                  <div key={i} className="flex items-center justify-between py-1.5 text-sm">
                    <div>
                      <span className="text-foreground">{p.name}</span>
                      <span className={cn("text-xs ml-2", urgency)}>
                        {daysLeft <= 0 ? "Due today" : `${daysLeft}d left`}
                      </span>
                    </div>
                    <span className="font-medium">{fmt(p.amount)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No upcoming payments</p>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-card border border-border/50 rounded-xl p-5" data-testid="section-recent-transactions">
          <h3 className="text-sm font-semibold text-foreground mb-3">Recent Transactions</h3>
          {recentTransactions?.length > 0 ? (
            <div className="space-y-2">
              {recentTransactions.slice(0, 5).map((t: any) => {
                const info = getCategoryInfo(t.categoryKey, categories);
                return (
                  <div key={t.id} className="flex items-center justify-between py-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span>{info.emoji}</span>
                      <div>
                        <span className="text-foreground">{t.merchant || info.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{format(parseISO(t.date), "MMM d")}</span>
                      </div>
                    </div>
                    <span className="font-medium text-red-400">-{fmt(t.amount)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No transactions yet</p>
          )}
        </div>

        {/* Savings Rate + Quick Stats */}
        <div className="space-y-4">
          <div className="bg-card border border-border/50 rounded-xl p-5" data-testid="section-savings-rate">
            <h3 className="text-sm font-semibold text-foreground mb-3">Savings Rate</h3>
            <div className="flex items-center justify-center">
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none"
                    stroke={savingsRate >= 20 ? "#00B894" : savingsRate >= 0 ? "#FFEAA7" : "#FF7675"} strokeWidth="3"
                    strokeDasharray={`${Math.max(0, Math.min(savingsRate, 100))}, 100`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold">{savingsRate}%</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">{savingsMessage}</p>
          </div>

          <div className="bg-card border border-border/50 rounded-xl p-5" data-testid="section-quick-stats">
            <h3 className="text-sm font-semibold text-foreground mb-3">Quick Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Daily</span>
                <span>{fmt(quickStats?.avgDailySpending || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Biggest Expense</span>
                <span>{fmt(quickStats?.biggestExpense || 0)}</span>
              </div>
              {quickStats?.topMerchant && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Top Merchant</span>
                  <span className="truncate ml-2">{quickStats.topMerchant}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active Goals Widget */}
      {activeGoals && activeGoals.length > 0 && (
        <div className="bg-card border border-border/50 rounded-xl p-5" data-testid="section-active-goals">
          <h3 className="text-sm font-semibold text-foreground mb-3">Active Savings Goals</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeGoals.map((g: any) => {
              const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
              return (
                <div key={g.id} className="bg-secondary/30 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{g.icon}</span>
                    <span className="text-sm font-medium">{g.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{fmt(g.currentAmount)} / {fmt(g.targetAmount)}</div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, value, icon, color, bgColor, testId }: { title: string; value: string; icon: React.ReactNode; color: string; bgColor: string; testId: string }) {
  return (
    <div className="bg-card border border-border/50 rounded-xl p-4" data-testid={testId}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium">{title}</span>
        <div className={cn("p-2 rounded-lg", bgColor, color)}>{icon}</div>
      </div>
      <p className={cn("text-xl font-bold", color)}>{value}</p>
    </div>
  );
}

// ===== EXPENSES TAB =====
function ExpensesTab({ fmt, categories, currencySymbol }: { fmt: (n: number) => string; categories: ExpenseCategory[]; currencySymbol: string }) {
  const { toast } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPayment, setFilterPayment] = useState<string>("all");

  const { data: allExpenses = [], isLoading } = useQuery<Expense[]>({ queryKey: ["/api/money/expenses"] });
  const { data: creditCards = [] } = useQuery<CreditCard[]>({ queryKey: ["/api/money/credit-cards"] });

  const createExpense = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/money/expenses", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/money/expenses"] }); queryClient.invalidateQueries({ queryKey: ["/api/money/dashboard"] }); setShowAddModal(false); toast({ title: "Expense added" }); },
  });

  const updateExpense = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/money/expenses/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/money/expenses"] }); queryClient.invalidateQueries({ queryKey: ["/api/money/dashboard"] }); setEditingExpense(null); toast({ title: "Expense updated" }); },
  });

  const deleteExpense = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/money/expenses/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/money/expenses"] }); queryClient.invalidateQueries({ queryKey: ["/api/money/dashboard"] }); toast({ title: "Expense deleted" }); },
  });

  const filteredExpenses = allExpenses
    .filter(e => {
      if (searchQuery && !e.merchant?.toLowerCase().includes(searchQuery.toLowerCase()) && !e.notes?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterCategory !== "all" && e.categoryKey !== filterCategory) return false;
      if (filterPayment !== "all" && e.paymentMethod !== filterPayment) return false;
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  return (
    <div className="space-y-4" data-testid="expenses-tab">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Expenses</h2>
        <Button onClick={() => setShowAddModal(true)} size="sm" data-testid="button-add-expense">
          <Plus className="w-4 h-4 mr-1" /> Add Expense
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search merchant, notes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" data-testid="input-search-expenses" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px]" data-testid="filter-category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.filter(c => c.isActive).map(c => (
              <SelectItem key={c.key} value={c.key}>{c.emoji} {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPayment} onValueChange={setFilterPayment}>
          <SelectTrigger className="w-[150px]" data-testid="filter-payment">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            {PAYMENT_METHODS.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Expense List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : filteredExpenses.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No expenses yet</p>
          <p className="text-sm mt-1">Add your first expense to get started</p>
        </div>
      ) : (
        <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map(expense => {
                const info = getCategoryInfo(expense.categoryKey, categories);
                const pm = PAYMENT_METHODS.find(m => m.value === expense.paymentMethod);
                return (
                  <TableRow key={expense.id} data-testid={`expense-row-${expense.id}`}>
                    <TableCell className="text-xs text-muted-foreground">{format(parseISO(expense.date), "MMM d, yy")}</TableCell>
                    <TableCell className="font-medium">{expense.merchant || "-"}</TableCell>
                    <TableCell><span className="text-sm">{info.emoji} {info.name}</span></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{pm?.label || expense.paymentMethod}</TableCell>
                    <TableCell className="text-right font-medium text-red-400">{fmt(expense.amount)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingExpense(expense)} data-testid={`button-edit-expense-${expense.id}`}><Edit2 className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteExpense.mutate(expense.id)} data-testid={`button-delete-expense-${expense.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <ExpenseModal
        open={showAddModal || !!editingExpense}
        onClose={() => { setShowAddModal(false); setEditingExpense(null); }}
        expense={editingExpense}
        categories={categories}
        creditCards={creditCards}
        onSave={(data) => {
          if (editingExpense) {
            updateExpense.mutate({ id: editingExpense.id, data });
          } else {
            createExpense.mutate(data);
          }
        }}
        isPending={createExpense.isPending || updateExpense.isPending}
        currencySymbol={currencySymbol}
      />
    </div>
  );
}

function ExpenseModal({ open, onClose, expense, categories, creditCards, onSave, isPending, currencySymbol }: {
  open: boolean; onClose: () => void; expense: Expense | null; categories: ExpenseCategory[];
  creditCards: CreditCard[]; onSave: (data: any) => void; isPending: boolean; currencySymbol: string;
}) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [categoryKey, setCategoryKey] = useState("other");
  const [merchant, setMerchant] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [creditCardId, setCreditCardId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (expense) {
      setAmount(String(expense.amount / 100));
      setDate(expense.date);
      setCategoryKey(expense.categoryKey);
      setMerchant(expense.merchant || "");
      setPaymentMethod(expense.paymentMethod);
      setCreditCardId(expense.creditCardId ? String(expense.creditCardId) : "");
      setNotes(expense.notes || "");
      setTags(expense.tags?.join(", ") || "");
    } else {
      setAmount(""); setDate(format(new Date(), "yyyy-MM-dd")); setCategoryKey("other");
      setMerchant(""); setPaymentMethod("cash"); setCreditCardId(""); setNotes(""); setTags("");
    }
  }, [expense, open]);

  const handleSubmit = () => {
    const amountPaise = Math.round(parseFloat(amount) * 100);
    if (!amountPaise || amountPaise <= 0) return;
    onSave({
      amount: amountPaise, date, categoryKey, merchant, paymentMethod,
      creditCardId: creditCardId ? parseInt(creditCardId) : null,
      notes, tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{expense ? "Edit Expense" : "Add Expense"}</DialogTitle>
          <DialogDescription>
            {expense ? "Update the expense details below." : "Enter the details of your expense."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Amount ({currencySymbol})</Label>
            <Input type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="input-expense-amount" />
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-expense-date" />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={categoryKey} onValueChange={setCategoryKey}>
              <SelectTrigger data-testid="select-expense-category"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.filter(c => c.isActive).map(c => (
                  <SelectItem key={c.key} value={c.key}>{c.emoji} {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Merchant / Description</Label>
            <Input placeholder="e.g. Swiggy, Amazon..." value={merchant} onChange={(e) => setMerchant(e.target.value)} data-testid="input-expense-merchant" />
          </div>
          <div>
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger data-testid="select-expense-payment"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {paymentMethod === "credit_card" && creditCards.length > 0 && (
            <div>
              <Label>Credit Card</Label>
              <Select value={creditCardId} onValueChange={setCreditCardId}>
                <SelectTrigger><SelectValue placeholder="Select card" /></SelectTrigger>
                <SelectContent>
                  {creditCards.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nickname} (****{c.lastFourDigits})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Notes (optional)</Label>
            <Textarea placeholder="Add a note..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Tags (comma-separated)</Label>
            <Input placeholder="work, food, family..." value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending} data-testid="button-save-expense">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {expense ? "Update" : "Add Expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== BUDGET TAB =====
function BudgetTab({ fmt, categories }: { fmt: (n: number) => string; categories: ExpenseCategory[] }) {
  const { toast } = useToast();
  const { data: budgetList = [] } = useQuery<Budget[]>({ queryKey: ["/api/money/budgets"] });
  const { data: dashboardData } = useQuery<any>({ queryKey: ["/api/money/dashboard"] });
  const categorySpending = dashboardData?.categorySpending || {};

  const upsertBudget = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/money/budgets", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/money/budgets"] }); queryClient.invalidateQueries({ queryKey: ["/api/money/dashboard"] }); toast({ title: "Budget saved" }); },
  });

  const activeCats = categories.filter(c => c.isActive);

  const getBudgetForCategory = (key: string) => budgetList.find(b => b.categoryKey === key);

  return (
    <div className="space-y-6" data-testid="budget-tab">
      <h2 className="text-lg font-bold">Budget Management</h2>

      {/* Budget vs Actual Table */}
      <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead className="text-right">Spent</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead className="text-right">% Used</TableHead>
              <TableHead className="w-[200px]">Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeCats.map(cat => {
              const budget = getBudgetForCategory(cat.key);
              const spent = categorySpending[cat.key] || 0;
              const limit = budget?.monthlyLimit || 0;
              const remaining = limit - spent;
              const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
              const barColor = pct <= 70 ? "bg-emerald-500" : pct <= 90 ? "bg-yellow-500" : pct <= 100 ? "bg-red-500" : "bg-red-700";

              return (
                <TableRow key={cat.key}>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <span>{cat.emoji}</span>
                      <span>{cat.name}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      className="w-24 inline-block text-right text-sm"
                      placeholder="0"
                      defaultValue={limit > 0 ? limit / 100 : ""}
                      onBlur={(e) => {
                        const val = Math.round(parseFloat(e.target.value || "0") * 100);
                        if (val !== limit) {
                          upsertBudget.mutate({ categoryKey: cat.key, monthlyLimit: val, isEnabled: val > 0 });
                        }
                      }}
                      data-testid={`budget-input-${cat.key}`}
                    />
                  </TableCell>
                  <TableCell className="text-right text-sm">{limit > 0 ? fmt(spent) : "-"}</TableCell>
                  <TableCell className={cn("text-right text-sm", remaining < 0 ? "text-red-400" : "text-emerald-400")}>
                    {limit > 0 ? fmt(remaining) : "-"}
                  </TableCell>
                  <TableCell className="text-right text-sm">{limit > 0 ? `${pct}%` : "-"}</TableCell>
                  <TableCell>
                    {limit > 0 ? (
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No budget set</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Smart Suggestions */}
      <div className="bg-card border border-border/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-3">Smart Suggestions</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          {budgetList.length === 0 ? (
            <p>Set budgets for your categories above to get personalized suggestions.</p>
          ) : (
            budgetList.filter(b => b.isEnabled).map(b => {
              const spent = categorySpending[b.categoryKey] || 0;
              const pct = b.monthlyLimit > 0 ? Math.round((spent / b.monthlyLimit) * 100) : 0;
              const info = getCategoryInfo(b.categoryKey, categories);
              if (pct > 100) return <p key={b.id} className="text-red-400">You've exceeded your {info.name} budget by {fmt(spent - b.monthlyLimit)}. Consider reducing spending in this category.</p>;
              if (pct > 80) return <p key={b.id} className="text-yellow-400">You've used {pct}% of your {info.name} budget. Be careful with remaining spending.</p>;
              if (pct < 30 && spent > 0) return <p key={b.id} className="text-emerald-400">Great job on {info.name}! You're well under budget. Consider moving some to Savings.</p>;
              return null;
            }).filter(Boolean)
          )}
        </div>
      </div>
    </div>
  );
}

// ===== SUBSCRIPTIONS TAB =====
function SubscriptionsTab({ fmt }: { fmt: (n: number) => string }) {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);

  const { data: subs = [], isLoading } = useQuery<Subscription[]>({ queryKey: ["/api/money/subscriptions"] });

  const createSub = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/money/subscriptions", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/money/subscriptions"] }); queryClient.invalidateQueries({ queryKey: ["/api/money/dashboard"] }); setShowAdd(false); toast({ title: "Subscription added" }); },
  });

  const updateSub = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/money/subscriptions/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/money/subscriptions"] }); queryClient.invalidateQueries({ queryKey: ["/api/money/dashboard"] }); setEditing(null); toast({ title: "Subscription updated" }); },
  });

  const deleteSub = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/money/subscriptions/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/money/subscriptions"] }); queryClient.invalidateQueries({ queryKey: ["/api/money/dashboard"] }); toast({ title: "Subscription deleted" }); },
  });

  const activeSubs = subs.filter(s => s.status === "active");
  const monthlyTotal = activeSubs.reduce((sum, s) => {
    const amt = s.amount;
    if (s.billingCycle === "yearly") return sum + Math.round(amt / 12);
    if (s.billingCycle === "quarterly") return sum + Math.round(amt / 3);
    if (s.billingCycle === "half-yearly") return sum + Math.round(amt / 6);
    return sum + amt;
  }, 0);
  const yearlyTotal = monthlyTotal * 12;

  return (
    <div className="space-y-6" data-testid="subscriptions-tab">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Subscriptions</h2>
        <Button onClick={() => setShowAdd(true)} size="sm" data-testid="button-add-subscription">
          <Plus className="w-4 h-4 mr-1" /> Add Subscription
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Monthly Cost</p>
          <p className="text-xl font-bold text-foreground mt-1">{fmt(monthlyTotal)}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Yearly Projection</p>
          <p className="text-xl font-bold text-foreground mt-1">{fmt(yearlyTotal)}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Active Subscriptions</p>
          <p className="text-xl font-bold text-foreground mt-1">{activeSubs.length}</p>
        </div>
      </div>

      {/* Subscription Cards */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : subs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No subscriptions yet</p>
          <p className="text-sm mt-1">Track your recurring subscriptions here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subs.map(sub => {
            const daysUntil = sub.nextDueDate ? differenceInDays(parseISO(sub.nextDueDate), new Date()) : null;
            return (
              <div key={sub.id} className={cn("bg-card border rounded-xl p-4 space-y-3", sub.status === "cancelled" ? "border-border/30 opacity-60" : "border-border/50")} data-testid={`subscription-card-${sub.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{sub.icon || "🔔"}</span>
                    <div>
                      <p className="font-medium text-sm">{sub.serviceName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{sub.category}</p>
                    </div>
                  </div>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", sub.status === "active" ? "bg-emerald-500/10 text-emerald-400" : sub.status === "paused" ? "bg-yellow-500/10 text-yellow-400" : "bg-red-500/10 text-red-400")}>
                    {sub.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-bold">{fmt(sub.amount)}</span>
                  <span className="text-muted-foreground capitalize">{sub.billingCycle}</span>
                </div>
                {sub.status === "active" && daysUntil !== null && (
                  <p className={cn("text-xs", daysUntil <= 3 ? "text-red-400" : daysUntil <= 7 ? "text-yellow-400" : "text-muted-foreground")}>
                    Next: {format(parseISO(sub.nextDueDate), "MMM d")} ({daysUntil <= 0 ? "Due today" : `${daysUntil}d left`})
                  </p>
                )}
                <div className="flex gap-1 pt-1 border-t border-border/30">
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setEditing(sub)}>Edit</Button>
                  {sub.status === "active" && (
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => updateSub.mutate({ id: sub.id, data: { status: "paused" } })}>Pause</Button>
                  )}
                  {sub.status === "paused" && (
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => updateSub.mutate({ id: sub.id, data: { status: "active" } })}>Resume</Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-xs h-7 text-red-400" onClick={() => updateSub.mutate({ id: sub.id, data: { status: "cancelled", cancelledDate: format(new Date(), "yyyy-MM-dd") } })}>Cancel</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <SubscriptionModal
        open={showAdd || !!editing}
        onClose={() => { setShowAdd(false); setEditing(null); }}
        subscription={editing}
        onSave={(data) => {
          if (editing) updateSub.mutate({ id: editing.id, data });
          else createSub.mutate(data);
        }}
        isPending={createSub.isPending || updateSub.isPending}
      />
    </div>
  );
}

function SubscriptionModal({ open, onClose, subscription, onSave, isPending }: {
  open: boolean; onClose: () => void; subscription: Subscription | null; onSave: (data: any) => void; isPending: boolean;
}) {
  const [serviceName, setServiceName] = useState("");
  const [category, setCategory] = useState("other");
  const [amount, setAmount] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [nextDueDate, setNextDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [autoRenews, setAutoRenews] = useState(true);
  const [notes, setNotes] = useState("");
  const [icon, setIcon] = useState("🔔");

  useEffect(() => {
    if (subscription) {
      setServiceName(subscription.serviceName); setCategory(subscription.category);
      setAmount(String(subscription.amount / 100)); setBillingCycle(subscription.billingCycle);
      setNextDueDate(subscription.nextDueDate); setAutoRenews(subscription.autoRenews);
      setNotes(subscription.notes || ""); setIcon(subscription.icon || "🔔");
    } else {
      setServiceName(""); setCategory("other"); setAmount(""); setBillingCycle("monthly");
      setNextDueDate(format(new Date(), "yyyy-MM-dd")); setAutoRenews(true); setNotes(""); setIcon("🔔");
    }
  }, [subscription, open]);

  const subCategories = ["streaming", "music", "software", "gaming", "news", "fitness", "education", "other"];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{subscription ? "Edit Subscription" : "Add Subscription"}</DialogTitle>
          <DialogDescription>{subscription ? "Update subscription details." : "Add a new recurring subscription."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div><Label>Service Name</Label><Input value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="e.g. Netflix, Spotify..." data-testid="input-sub-name" /></div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{subCategories.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Amount</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" data-testid="input-sub-amount" /></div>
          <div>
            <Label>Billing Cycle</Label>
            <Select value={billingCycle} onValueChange={setBillingCycle}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="half-yearly">Half-Yearly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Next Due Date</Label><Input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} /></div>
          <div className="flex items-center justify-between"><Label>Auto-renews</Label><Switch checked={autoRenews} onCheckedChange={setAutoRenews} /></div>
          <div><Label>Icon (emoji)</Label><Input value={icon} onChange={(e) => setIcon(e.target.value)} className="w-20" /></div>
          <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ serviceName, category, amount: Math.round(parseFloat(amount || "0") * 100), billingCycle, nextDueDate, autoRenews, notes, icon })} disabled={isPending || !serviceName} data-testid="button-save-subscription">
            {isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            {subscription ? "Update" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== BILLS & CARDS TAB =====
function BillsCardsTab({ fmt, categories }: { fmt: (n: number) => string; categories: ExpenseCategory[] }) {
  const { toast } = useToast();
  const [showAddBill, setShowAddBill] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [subTab, setSubTab] = useState<"bills" | "cards">("bills");

  const { data: billList = [] } = useQuery<Bill[]>({ queryKey: ["/api/money/bills"] });
  const { data: cardList = [] } = useQuery<CreditCard[]>({ queryKey: ["/api/money/credit-cards"] });

  const createBill = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/money/bills", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/money/bills"] }); queryClient.invalidateQueries({ queryKey: ["/api/money/dashboard"] }); setShowAddBill(false); toast({ title: "Bill added" }); },
  });

  const updateBill = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/money/bills/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/money/bills"] }); queryClient.invalidateQueries({ queryKey: ["/api/money/dashboard"] }); setEditingBill(null); toast({ title: "Bill updated" }); },
  });

  const markBillPaid = useMutation({
    mutationFn: async ({ bill }: { bill: Bill }) => {
      await apiRequest("POST", "/api/money/expenses", {
        amount: bill.amount, date: format(new Date(), "yyyy-MM-dd"), categoryKey: bill.categoryKey,
        merchant: bill.name, paymentMethod: bill.paymentMethod || "cash", notes: "Bill payment", sourceType: "bill", sourceId: bill.id,
      });
      await apiRequest("PUT", `/api/money/bills/${bill.id}`, { status: "paid", lastPaidDate: format(new Date(), "yyyy-MM-dd") });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/money/bills"] }); queryClient.invalidateQueries({ queryKey: ["/api/money/expenses"] }); queryClient.invalidateQueries({ queryKey: ["/api/money/dashboard"] }); toast({ title: "Bill marked as paid and expense logged" }); },
  });

  const createCard = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/money/credit-cards", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/money/credit-cards"] }); setShowAddCard(false); toast({ title: "Credit card added" }); },
  });

  const updateCard = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/money/credit-cards/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/money/credit-cards"] }); setEditingCard(null); toast({ title: "Card updated" }); },
  });

  const deleteCard = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/money/credit-cards/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/money/credit-cards"] }); toast({ title: "Card deleted" }); },
  });

  return (
    <div className="space-y-6" data-testid="bills-cards-tab">
      <div className="flex items-center gap-3">
        <Button variant={subTab === "bills" ? "default" : "outline"} size="sm" onClick={() => setSubTab("bills")}>Bills</Button>
        <Button variant={subTab === "cards" ? "default" : "outline"} size="sm" onClick={() => setSubTab("cards")}>Credit Cards</Button>
      </div>

      {subTab === "bills" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Bills</h2>
            <Button onClick={() => setShowAddBill(true)} size="sm" data-testid="button-add-bill"><Plus className="w-4 h-4 mr-1" /> Add Bill</Button>
          </div>

          {billList.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No bills tracked yet</p>
            </div>
          ) : (
            <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billList.sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(bill => {
                    const isOverdue = bill.status === "pending" && bill.dueDate < format(new Date(), "yyyy-MM-dd");
                    return (
                      <TableRow key={bill.id} className={isOverdue ? "bg-red-500/5" : ""}>
                        <TableCell className="font-medium">{bill.name}</TableCell>
                        <TableCell>{fmt(bill.amount)}</TableCell>
                        <TableCell className={cn("text-sm", isOverdue ? "text-red-400" : "")}>{format(parseISO(bill.dueDate), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-sm capitalize">{bill.frequency}</TableCell>
                        <TableCell>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full", bill.status === "paid" ? "bg-emerald-500/10 text-emerald-400" : isOverdue ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400")}>{isOverdue ? "Overdue" : bill.status}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {bill.status === "pending" && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-400" onClick={() => markBillPaid.mutate({ bill })} data-testid={`pay-bill-${bill.id}`}>
                                <Check className="w-3.5 h-3.5 mr-1" /> Pay
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingBill(bill)} data-testid={`button-edit-bill-${bill.id}`}><Edit2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <BillModal
            open={showAddBill || !!editingBill}
            onClose={() => { setShowAddBill(false); setEditingBill(null); }}
            bill={editingBill}
            categories={categories}
            onSave={(data) => editingBill ? updateBill.mutate({ id: editingBill.id, data }) : createBill.mutate(data)}
            isPending={createBill.isPending || updateBill.isPending}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Credit Cards</h2>
            <Button onClick={() => setShowAddCard(true)} size="sm" data-testid="button-add-card"><Plus className="w-4 h-4 mr-1" /> Add Card</Button>
          </div>

          {cardList.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CreditCardIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No credit cards added yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {cardList.map(card => {
                const utilization = card.creditLimit > 0 ? Math.round((card.currentBalance / card.creditLimit) * 100) : 0;
                const utilColor = utilization < 30 ? "text-emerald-400" : utilization < 60 ? "text-yellow-400" : "text-red-400";
                return (
                  <div key={card.id} className="bg-gradient-to-br from-zinc-800 to-zinc-900 border border-border/50 rounded-xl p-5 space-y-4" data-testid={`credit-card-${card.id}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-sm">{card.nickname}</p>
                        <p className="text-xs text-muted-foreground capitalize">{card.cardType}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingCard(card)} data-testid={`button-edit-card-${card.id}`}><Edit2 className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCard.mutate(card.id)} data-testid={`button-delete-card-${card.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                    <p className="text-lg tracking-[0.3em] font-mono text-muted-foreground">**** **** **** {card.lastFourDigits}</p>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div><span className="text-muted-foreground block">Credit Limit</span><span className="font-medium">{fmt(card.creditLimit)}</span></div>
                      <div><span className="text-muted-foreground block">Balance</span><span className="font-medium">{fmt(card.currentBalance)}</span></div>
                      <div><span className="text-muted-foreground block">Available</span><span className="font-medium text-emerald-400">{fmt(card.creditLimit - card.currentBalance)}</span></div>
                      <div><span className="text-muted-foreground block">Utilization</span><span className={cn("font-medium", utilColor)}>{utilization}%</span></div>
                    </div>
                    <div className="text-xs text-muted-foreground flex justify-between">
                      <span>Statement: {card.statementDate}th</span>
                      <span>Due: {card.dueDate}th</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <CreditCardModal
            open={showAddCard || !!editingCard}
            onClose={() => { setShowAddCard(false); setEditingCard(null); }}
            card={editingCard}
            onSave={(data) => editingCard ? updateCard.mutate({ id: editingCard.id, data }) : createCard.mutate(data)}
            isPending={createCard.isPending || updateCard.isPending}
          />
        </div>
      )}
    </div>
  );
}

function BillModal({ open, onClose, bill, categories, onSave, isPending }: {
  open: boolean; onClose: () => void; bill: Bill | null; categories: ExpenseCategory[]; onSave: (data: any) => void; isPending: boolean;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [frequency, setFrequency] = useState("monthly");
  const [categoryKey, setCategoryKey] = useState("utilities");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (bill) { setName(bill.name); setAmount(String(bill.amount / 100)); setDueDate(bill.dueDate); setFrequency(bill.frequency); setCategoryKey(bill.categoryKey); setNotes(bill.notes || ""); }
    else { setName(""); setAmount(""); setDueDate(format(new Date(), "yyyy-MM-dd")); setFrequency("monthly"); setCategoryKey("utilities"); setNotes(""); }
  }, [bill, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{bill ? "Edit Bill" : "Add Bill"}</DialogTitle><DialogDescription>{bill ? "Update bill details." : "Add a new bill to track."}</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div><Label>Bill Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Electricity, Rent..." data-testid="input-bill-name" /></div>
          <div><Label>Amount</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" data-testid="input-bill-amount" /></div>
          <div><Label>Due Date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          <div>
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="one-time">One-time</SelectItem><SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="half-yearly">Half-Yearly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={categoryKey} onValueChange={setCategoryKey}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{categories.filter(c => c.isActive).map(c => <SelectItem key={c.key} value={c.key}>{c.emoji} {c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ name, amount: Math.round(parseFloat(amount || "0") * 100), dueDate, frequency, categoryKey, notes })} disabled={isPending || !name} data-testid="button-save-bill">{isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}{bill ? "Update" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreditCardModal({ open, onClose, card, onSave, isPending }: {
  open: boolean; onClose: () => void; card: CreditCard | null; onSave: (data: any) => void; isPending: boolean;
}) {
  const [nickname, setNickname] = useState("");
  const [cardType, setCardType] = useState("visa");
  const [lastFour, setLastFour] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [statementDate, setStatementDate] = useState("1");
  const [dueDate, setDueDate] = useState("15");
  const [balance, setBalance] = useState("");
  const [minimumDue, setMinimumDue] = useState("");

  useEffect(() => {
    if (card) {
      setNickname(card.nickname); setCardType(card.cardType); setLastFour(card.lastFourDigits);
      setCreditLimit(String(card.creditLimit / 100)); setStatementDate(String(card.statementDate));
      setDueDate(String(card.dueDate)); setBalance(String(card.currentBalance / 100)); setMinimumDue(String(card.minimumDue / 100));
    } else {
      setNickname(""); setCardType("visa"); setLastFour(""); setCreditLimit(""); setStatementDate("1"); setDueDate("15"); setBalance(""); setMinimumDue("");
    }
  }, [card, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{card ? "Edit Credit Card" : "Add Credit Card"}</DialogTitle><DialogDescription>{card ? "Update card details." : "Add a credit card to track."}</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div><Label>Card Nickname</Label><Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. HDFC Millennia" data-testid="input-card-nickname" /></div>
          <div>
            <Label>Card Type</Label>
            <Select value={cardType} onValueChange={setCardType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="visa">Visa</SelectItem><SelectItem value="mastercard">Mastercard</SelectItem>
                <SelectItem value="amex">Amex</SelectItem><SelectItem value="rupay">RuPay</SelectItem><SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Last 4 Digits</Label><Input value={lastFour} onChange={(e) => setLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="1234" maxLength={4} data-testid="input-card-last-four" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Credit Limit</Label><Input type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} /></div>
            <div><Label>Current Balance</Label><Input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Statement Date (day)</Label><Input type="number" min="1" max="31" value={statementDate} onChange={(e) => setStatementDate(e.target.value)} /></div>
            <div><Label>Due Date (day)</Label><Input type="number" min="1" max="31" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          </div>
          <div><Label>Minimum Due</Label><Input type="number" value={minimumDue} onChange={(e) => setMinimumDue(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({
            nickname, cardType, lastFourDigits: lastFour,
            creditLimit: Math.round(parseFloat(creditLimit || "0") * 100),
            statementDate: parseInt(statementDate || "1"), dueDate: parseInt(dueDate || "15"),
            currentBalance: Math.round(parseFloat(balance || "0") * 100),
            minimumDue: Math.round(parseFloat(minimumDue || "0") * 100),
          })} disabled={isPending || !nickname || lastFour.length !== 4} data-testid="button-save-card">{isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}{card ? "Update" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== REPORTS TAB =====
function ReportsTab({ fmt, categories }: { fmt: (n: number) => string; categories: ExpenseCategory[] }) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));

  const { data: monthExpenses = [] } = useQuery<Expense[]>({
    queryKey: ["/api/money/expenses", { month: selectedMonth }],
    queryFn: () => fetch(`/api/money/expenses?month=${selectedMonth}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: moneySettings } = useQuery<MoneySettings>({ queryKey: ["/api/money/settings"] });

  const income = moneySettings?.monthlyIncome || 0;
  const totalSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const savings = income - totalSpent;
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;

  const categoryBreakdown: Record<string, number> = {};
  for (const e of monthExpenses) {
    categoryBreakdown[e.categoryKey] = (categoryBreakdown[e.categoryKey] || 0) + e.amount;
  }

  const dailyData: Record<string, number> = {};
  for (const e of monthExpenses) {
    dailyData[e.date] = (dailyData[e.date] || 0) + e.amount;
  }

  const barData = Object.entries(dailyData)
    .map(([date, amount]) => ({ date: format(parseISO(date), "dd"), amount: amount / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const categoryChartData = Object.entries(categoryBreakdown)
    .map(([key, value]) => {
      const info = getCategoryInfo(key, categories);
      return { name: info.name, value, color: info.color, emoji: info.emoji };
    })
    .sort((a, b) => b.value - a.value);

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") };
  });

  return (
    <div className="space-y-6" data-testid="reports-tab">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Monthly Report</h2>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]" data-testid="select-report-month"><SelectValue /></SelectTrigger>
          <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Income</p>
          <p className="text-lg font-bold text-emerald-400">{fmt(income)}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Expenses</p>
          <p className="text-lg font-bold text-red-400">{fmt(totalSpent)}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Net Savings</p>
          <p className={cn("text-lg font-bold", savings >= 0 ? "text-emerald-400" : "text-red-400")}>{fmt(savings)}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Savings Rate</p>
          <p className={cn("text-lg font-bold", savingsRate >= 20 ? "text-emerald-400" : savingsRate >= 0 ? "text-yellow-400" : "text-red-400")}>{savingsRate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-card border border-border/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Spending by Category</h3>
          {categoryChartData.length > 0 ? (
            <div className="space-y-2">
              {categoryChartData.map((cat, i) => {
                const pct = totalSpent > 0 ? Math.round((cat.value / totalSpent) * 100) : 0;
                return (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="w-5">{cat.emoji}</span>
                    <span className="flex-1 text-muted-foreground">{cat.name}</span>
                    <span className="font-medium">{fmt(cat.value)}</span>
                    <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No data for this month</p>
          )}
        </div>

        {/* Daily Bar Chart */}
        <div className="bg-card border border-border/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Daily Spending</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#888" fontSize={10} />
                <YAxis stroke="#888" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="amount" fill="#6C5CE7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No data for this month</p>
          )}
        </div>
      </div>

      {/* Transactions count */}
      <div className="bg-card border border-border/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-2">Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div><span className="text-muted-foreground block">Transactions</span><span className="font-medium">{monthExpenses.length}</span></div>
          <div><span className="text-muted-foreground block">Categories Used</span><span className="font-medium">{Object.keys(categoryBreakdown).length}</span></div>
          <div><span className="text-muted-foreground block">Avg per Transaction</span><span className="font-medium">{monthExpenses.length > 0 ? fmt(Math.round(totalSpent / monthExpenses.length)) : "-"}</span></div>
          <div><span className="text-muted-foreground block">Days with Spending</span><span className="font-medium">{Object.keys(dailyData).length}</span></div>
        </div>
      </div>
    </div>
  );
}

// ===== GOALS TAB =====
function GoalsTab({ fmt }: { fmt: (n: number) => string }) {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [addFundsGoalId, setAddFundsGoalId] = useState<number | null>(null);
  const [fundAmount, setFundAmount] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  const { data: goalList = [], isLoading } = useQuery<SavingsGoal[]>({ queryKey: ["/api/money/savings-goals"] });

  const createGoal = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/money/savings-goals", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/money/savings-goals"] }); queryClient.invalidateQueries({ queryKey: ["/api/money/dashboard"] }); setShowAdd(false); toast({ title: "Goal created" }); },
  });

  const updateGoal = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/money/savings-goals/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/money/savings-goals"] }); queryClient.invalidateQueries({ queryKey: ["/api/money/dashboard"] }); setEditing(null); setAddFundsGoalId(null); setFundAmount(""); toast({ title: "Goal updated" }); },
  });

  const deleteGoal = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/money/savings-goals/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/money/savings-goals"] }); queryClient.invalidateQueries({ queryKey: ["/api/money/dashboard"] }); toast({ title: "Goal deleted" }); },
  });

  const activeGoals = goalList.filter(g => g.status === "active");
  const completedGoals = goalList.filter(g => g.status === "completed");
  const totalTarget = activeGoals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = activeGoals.reduce((s, g) => s + g.currentAmount, 0);

  return (
    <div className="space-y-6" data-testid="goals-tab">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Savings Goals</h2>
        <Button onClick={() => setShowAdd(true)} size="sm" data-testid="button-add-goal"><Plus className="w-4 h-4 mr-1" /> Add Goal</Button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total Target</p>
          <p className="text-xl font-bold">{fmt(totalTarget)}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total Saved</p>
          <p className="text-xl font-bold text-emerald-400">{fmt(totalSaved)}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Remaining</p>
          <p className="text-xl font-bold text-orange-400">{fmt(totalTarget - totalSaved)}</p>
        </div>
      </div>

      {/* Goal Cards */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : activeGoals.length === 0 && completedGoals.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <PiggyBank className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No savings goals yet</p>
          <p className="text-sm mt-1">Set a goal to start saving!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {activeGoals.map(goal => {
            const pct = goal.targetAmount > 0 ? Math.round((goal.currentAmount / goal.targetAmount) * 100) : 0;
            const isOnTrack = !goal.targetDate || goal.currentAmount >= goal.targetAmount * 0.5;
            return (
              <div key={goal.id} className="bg-card border border-border/50 rounded-xl p-5 space-y-3" data-testid={`goal-card-${goal.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{goal.icon}</span>
                    <div>
                      <p className="font-medium">{goal.name}</p>
                      {goal.targetDate && <p className="text-xs text-muted-foreground">Target: {format(parseISO(goal.targetDate), "MMM d, yyyy")}</p>}
                    </div>
                  </div>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", isOnTrack ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-400")}>
                    {isOnTrack ? "On Track" : "Behind"}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{fmt(goal.currentAmount)}</span>
                    <span className="text-muted-foreground">{fmt(goal.targetAmount)}</span>
                  </div>
                  <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{pct}% complete</p>
                </div>
                <div className="flex gap-2 pt-2 border-t border-border/30">
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setAddFundsGoalId(goal.id)} data-testid={`add-funds-${goal.id}`}>
                    <Plus className="w-3 h-3 mr-1" /> Add Funds
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setEditing(goal)}>Edit</Button>
                  {pct >= 100 && (
                    <Button variant="ghost" size="sm" className="text-xs h-7 text-emerald-400" onClick={() => updateGoal.mutate({ id: goal.id, data: { status: "completed" } })}>
                      <Check className="w-3 h-3 mr-1" /> Complete
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-xs h-7 text-red-400" onClick={() => deleteGoal.mutate(goal.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>

                {/* Add Funds Inline */}
                {addFundsGoalId === goal.id && (
                  <div className="flex gap-2 items-center bg-secondary/30 rounded-lg p-2">
                    <Input type="number" placeholder="Amount" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} className="h-8 w-28" data-testid="input-fund-amount" />
                    <Button size="sm" className="h-8" onClick={() => {
                      const addAmt = Math.round(parseFloat(fundAmount || "0") * 100);
                      if (addAmt > 0) updateGoal.mutate({ id: goal.id, data: { currentAmount: goal.currentAmount + addAmt } });
                    }} data-testid="button-confirm-funds">Add</Button>
                    <Button variant="ghost" size="sm" className="h-8" onClick={() => { setAddFundsGoalId(null); setFundAmount(""); }}><X className="w-3 h-3" /></Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div>
          <button onClick={() => setShowCompleted(!showCompleted)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3">
            <ChevronRight className={cn("w-4 h-4 transition-transform", showCompleted && "rotate-90")} />
            Completed Goals ({completedGoals.length})
          </button>
          {showCompleted && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {completedGoals.map(g => (
                <div key={g.id} className="bg-card border border-border/30 rounded-xl p-4 opacity-70">
                  <div className="flex items-center gap-2"><span>{g.icon}</span><span className="font-medium">{g.name}</span><Check className="w-4 h-4 text-emerald-400" /></div>
                  <p className="text-xs text-muted-foreground mt-1">{fmt(g.targetAmount)} saved</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Goal Modal */}
      <GoalModal
        open={showAdd || !!editing}
        onClose={() => { setShowAdd(false); setEditing(null); }}
        goal={editing}
        onSave={(data) => editing ? updateGoal.mutate({ id: editing.id, data }) : createGoal.mutate(data)}
        isPending={createGoal.isPending || updateGoal.isPending}
      />
    </div>
  );
}

function GoalModal({ open, onClose, goal, onSave, isPending }: {
  open: boolean; onClose: () => void; goal: SavingsGoal | null; onSave: (data: any) => void; isPending: boolean;
}) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [icon, setIcon] = useState("🎯");

  useEffect(() => {
    if (goal) {
      setName(goal.name); setTargetAmount(String(goal.targetAmount / 100));
      setTargetDate(goal.targetDate || ""); setMonthlyContribution(String((goal.monthlyContribution || 0) / 100)); setIcon(goal.icon || "🎯");
    } else {
      setName(""); setTargetAmount(""); setTargetDate(""); setMonthlyContribution(""); setIcon("🎯");
    }
  }, [goal, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{goal ? "Edit Goal" : "Create Savings Goal"}</DialogTitle><DialogDescription>{goal ? "Update goal details." : "Set a new savings goal."}</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div><Label>Goal Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder='e.g. "Emergency Fund"' data-testid="input-goal-name" /></div>
          <div><Label>Target Amount</Label><Input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="0" data-testid="input-goal-target" /></div>
          <div><Label>Target Date (optional)</Label><Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} /></div>
          <div><Label>Monthly Contribution Plan</Label><Input type="number" value={monthlyContribution} onChange={(e) => setMonthlyContribution(e.target.value)} placeholder="0" /></div>
          <div><Label>Icon (emoji)</Label><Input value={icon} onChange={(e) => setIcon(e.target.value)} className="w-20" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({
            name, targetAmount: Math.round(parseFloat(targetAmount || "0") * 100),
            targetDate: targetDate || null, monthlyContribution: Math.round(parseFloat(monthlyContribution || "0") * 100), icon,
          })} disabled={isPending || !name} data-testid="button-save-goal">{isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}{goal ? "Update" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== MONEY SETTINGS TAB =====
function MoneySettingsTab() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<MoneySettings>({ queryKey: ["/api/money/settings"] });

  const updateSettings = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/money/settings", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/money/settings"] }); queryClient.invalidateQueries({ queryKey: ["/api/money/dashboard"] }); toast({ title: "Settings saved" }); },
  });

  const [currency, setCurrency] = useState("INR");
  const [income, setIncome] = useState("");
  const [symbolPosition, setSymbolPosition] = useState("before");
  const [decimalPlaces, setDecimalPlaces] = useState("0");

  useEffect(() => {
    if (settings) {
      setCurrency(settings.currency);
      setIncome(String(settings.monthlyIncome / 100));
      setSymbolPosition(settings.symbolPosition);
      setDecimalPlaces(String(settings.decimalPlaces));
    }
  }, [settings]);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const handleSave = () => {
    const currInfo = CURRENCIES.find(c => c.value === currency);
    updateSettings.mutate({
      currency,
      currencySymbol: currInfo?.symbol || "₹",
      monthlyIncome: Math.round(parseFloat(income || "0") * 100),
      symbolPosition,
      decimalPlaces: parseInt(decimalPlaces),
    });
  };

  return (
    <div className="space-y-6 max-w-2xl" data-testid="money-settings-tab">
      <h2 className="text-lg font-bold">Money Tracking Settings</h2>

      <div className="bg-card border border-border/50 rounded-xl p-5 space-y-5">
        <div>
          <Label>Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="mt-1" data-testid="select-currency"><SelectValue /></SelectTrigger>
            <SelectContent>{CURRENCIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div>
          <Label>Monthly Income</Label>
          <Input type="number" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="0" className="mt-1" data-testid="input-monthly-income" />
          <p className="text-xs text-muted-foreground mt-1">Enter your net monthly income</p>
        </div>

        <div>
          <Label>Currency Symbol Position</Label>
          <Select value={symbolPosition} onValueChange={setSymbolPosition}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="before">Before (₹100)</SelectItem>
              <SelectItem value="after">After (100₹)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Decimal Places</Label>
          <Select value={decimalPlaces} onValueChange={setDecimalPlaces}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">0 (₹100)</SelectItem>
              <SelectItem value="1">1 (₹100.0)</SelectItem>
              <SelectItem value="2">2 (₹100.00)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSave} disabled={updateSettings.isPending} data-testid="button-save-money-settings">
          {updateSettings.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
          Save Settings
        </Button>
      </div>

      {/* Notification Preferences */}
      <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold">Notification Preferences</h3>
        <div className="space-y-3">
          {[
            { key: "budgetAlerts", label: "Budget Alerts", desc: "Get notified when you approach or exceed budget limits" },
            { key: "billReminders", label: "Bill Reminders", desc: "Reminders before bill due dates" },
            { key: "subscriptionReminders", label: "Subscription Reminders", desc: "Reminders before subscription renewals" },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
              <Switch
                checked={settings?.[item.key as keyof MoneySettings] as boolean ?? true}
                onCheckedChange={(checked) => updateSettings.mutate({ [item.key]: checked })}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold">Data Management</h3>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={() => {
            fetch("/api/money/expenses", { credentials: "include" }).then(r => r.json()).then((expenses: Expense[]) => {
              const csv = "Date,Merchant,Category,Amount,Payment Method,Notes\n" +
                expenses.map(e => `${e.date},"${e.merchant}","${e.categoryKey}",${e.amount / 100},"${e.paymentMethod}","${e.notes || ""}"`).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = "money-tracking-expenses.csv"; a.click();
              toast({ title: "Expenses exported as CSV" });
            });
          }} data-testid="button-export-money-csv">
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            Promise.all([
              fetch("/api/money/expenses", { credentials: "include" }).then(r => r.json()),
              fetch("/api/money/budgets", { credentials: "include" }).then(r => r.json()),
              fetch("/api/money/subscriptions", { credentials: "include" }).then(r => r.json()),
              fetch("/api/money/bills", { credentials: "include" }).then(r => r.json()),
              fetch("/api/money/savings-goals", { credentials: "include" }).then(r => r.json()),
            ]).then(([expenses, budgets, subscriptions, bills, goals]) => {
              const blob = new Blob([JSON.stringify({ expenses, budgets, subscriptions, bills, goals }, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = "money-tracking-data.json"; a.click();
              toast({ title: "All data exported as JSON" });
            });
          }} data-testid="button-export-money-json">
            <Download className="w-4 h-4 mr-1" /> Export JSON
          </Button>
        </div>
      </div>
    </div>
  );
}
