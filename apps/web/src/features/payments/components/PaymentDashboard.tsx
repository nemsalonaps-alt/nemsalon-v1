// Payment Dashboard - Main payment management interface

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { Badge } from '../../../components/ui/Badge';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  RefreshCcw,
  AlertCircle,
  CheckCircle,
  Clock,
  MoreHorizontal,
  Download,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Shield,
  Zap,
} from 'lucide-react';
import {
  PaymentAnalyticsSkeleton,
  RecentTransactionsSkeleton,
  StatsCardsSkeleton,
} from './PaymentSkeletons';
import { PaymentEmptyState, PaymentErrorState } from './PaymentStates';
import { usePaymentAnalytics, usePayments, useMRR, useGatewayHealth } from '../hooks';
import type { Payment, PaymentFilters } from '../types';

interface PaymentDashboardProps {
  salonId: string;
}

export function PaymentDashboard({ salonId }: PaymentDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<PaymentFilters>({ status: 'all' });

  const {
    analytics,
    loading: analyticsLoading,
    error: analyticsError,
  } = usePaymentAnalytics(salonId);
  const { payments, loading: paymentsLoading, error: paymentsError } = usePayments(filters);
  const { mrr, loading: mrrLoading } = useMRR(salonId, { includeGrowth: true });
  const { health, loading: healthLoading } = useGatewayHealth();

  const handleExport = () => {
    // Export functionality
    console.log('Exporting payments...');
  };

  const handleRefresh = () => {
    // Refresh functionality
    window.location.reload();
  };

  if (analyticsError || paymentsError) {
    return <PaymentErrorState onRetry={handleRefresh} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground mt-1">
            Manage transactions, refunds, and payment analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <DollarSign className="mr-2 h-4 w-4" />
            Create Payment
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {analyticsLoading ? (
        <StatsCardsSkeleton />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={analytics ? formatCurrency(analytics.averageTransactionValue * 100) : '0'}
            trend="+12.5%"
            trendUp={true}
            icon={DollarSign}
            description="vs last month"
          />
          <StatCard
            title="Success Rate"
            value={`${analytics?.successRate ?? 0}%`}
            trend="+2.1%"
            trendUp={true}
            icon={CheckCircle}
            description="Payment completion"
          />
          <StatCard
            title="MRR"
            value={mrr ? formatCurrency(mrr.mrr) : '0'}
            trend={`${mrr?.growthRate ? `${mrr.growthRate > 0 ? '+' : ''}${mrr.growthRate}%` : '0%'}`}
            trendUp={(mrr?.growthRate ?? 0) >= 0}
            icon={TrendingUp}
            description="Monthly recurring revenue"
          />
          <StatCard
            title="Gateway Status"
            value={health?.status === 'healthy' ? 'Healthy' : 'Issues'}
            trend={health ? `${health.uptime}% uptime` : 'N/A'}
            trendUp={health?.status === 'healthy'}
            icon={health?.status === 'healthy' ? Zap : AlertCircle}
            description={`${health?.latency ?? 0}ms latency`}
            alert={health?.status !== 'healthy'}
          />
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="refunds">Refunds</TabsTrigger>
          <TabsTrigger value="disputes">Disputes</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Recent Transactions */}
            <Card className="lg:col-span-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <RecentTransactionsSkeleton />
                ) : payments.length === 0 ? (
                  <PaymentEmptyState type="transactions" />
                ) : (
                  <div className="space-y-4">
                    {payments.slice(0, 5).map((payment) => (
                      <TransactionRow key={payment.id} payment={payment} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <QuickActionButton
                  icon={RefreshCcw}
                  label="Process Refund"
                  description="Refund a recent payment"
                  onClick={() => setActiveTab('refunds')}
                />
                <QuickActionButton
                  icon={Shield}
                  label="Review Disputes"
                  description={`${0} need attention`}
                  onClick={() => setActiveTab('disputes')}
                  alert={false}
                />
                <QuickActionButton
                  icon={Wallet}
                  label="Payment Methods"
                  description="Manage saved cards"
                  onClick={() => {}}
                />
                <QuickActionButton
                  icon={Download}
                  label="Export Data"
                  description="Download payment reports"
                  onClick={handleExport}
                />
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods Breakdown */}
          {analyticsLoading ? (
            <PaymentAnalyticsSkeleton />
          ) : analytics ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {Object.entries(analytics.paymentMethods).map(([method, percentage]) => (
                    <div
                      key={method}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <CreditCard className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium capitalize">{method}</p>
                          <p className="text-sm text-muted-foreground">{percentage}% of payments</p>
                        </div>
                      </div>
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionsTab
            payments={payments}
            loading={paymentsLoading}
            filters={filters}
            onFilterChange={setFilters}
          />
        </TabsContent>

        <TabsContent value="refunds">
          <RefundsTab salonId={salonId} />
        </TabsContent>

        <TabsContent value="disputes">
          <DisputesTab salonId={salonId} />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab salonId={salonId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== SUB-COMPONENTS ====================

interface StatCardProps {
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: React.ElementType;
  description: string;
  alert?: boolean;
}

function StatCard({ title, value, trend, trendUp, icon: Icon, description, alert }: StatCardProps) {
  return (
    <Card className={alert ? 'border-red-500' : undefined}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
            <div className="flex items-center gap-1 mt-1">
              {trendUp ? (
                <ArrowUpRight className="h-3 w-3 text-green-500" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500" />
              )}
              <span className={`text-xs ${trendUp ? 'text-green-500' : 'text-red-500'}`}>
                {trend}
              </span>
              <span className="text-xs text-muted-foreground">{description}</span>
            </div>
          </div>
          <div className={`p-3 rounded-full ${alert ? 'bg-red-100' : 'bg-primary/10'}`}>
            <Icon className={`h-5 w-5 ${alert ? 'text-red-600' : 'text-primary'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickActionButtonProps {
  icon: React.ElementType;
  label: string;
  description: string;
  onClick: () => void;
  alert?: boolean;
}

function QuickActionButton({
  icon: Icon,
  label,
  description,
  onClick,
  alert,
}: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors text-left"
    >
      <div className={`p-2 rounded-lg ${alert ? 'bg-red-100' : 'bg-muted'}`}>
        <Icon className={`h-4 w-4 ${alert ? 'text-red-600' : 'text-muted-foreground'}`} />
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function TransactionRow({ payment }: { payment: Payment }) {
  const statusColors = {
    succeeded: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };

  const statusIcons = {
    succeeded: CheckCircle,
    failed: AlertCircle,
    refunded: RefreshCcw,
    pending: Clock,
    cancelled: AlertCircle,
  };

  const Icon = statusIcons[payment.status as keyof typeof statusIcons] || Clock;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-lg ${statusColors[payment.status as keyof typeof statusColors] || 'bg-gray-100'}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="font-medium text-sm">{payment.id.slice(0, 8)}...</p>
          <p className="text-xs text-muted-foreground">
            {new Date(payment.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold">{formatCurrency(payment.amount)}</p>
        <Badge
          variant={payment.status === 'succeeded' ? 'default' : 'secondary'}
          className="text-xs"
        >
          {payment.status}
        </Badge>
      </div>
    </div>
  );
}

// ==================== TAB COMPONENTS ====================

function TransactionsTab({
  payments,
  loading,
  filters,
  onFilterChange,
}: {
  payments: Payment[];
  loading: boolean;
  filters: PaymentFilters;
  onFilterChange: (filters: PaymentFilters) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>All Transactions</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <RecentTransactionsSkeleton count={10} />
        ) : payments.length === 0 ? (
          <PaymentEmptyState type="transactions" />
        ) : (
          <div className="space-y-2">
            {payments.map((payment) => (
              <TransactionRow key={payment.id} payment={payment} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RefundsTab({ salonId }: { salonId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Refund Management</CardTitle>
      </CardHeader>
      <CardContent>
        <PaymentEmptyState
          type="refunds"
          action={{ label: 'Process New Refund', onClick: () => {} }}
        />
      </CardContent>
    </Card>
  );
}

function DisputesTab({ salonId }: { salonId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Disputes & Chargebacks</CardTitle>
      </CardHeader>
      <CardContent>
        <PaymentEmptyState
          type="disputes"
          description="No active disputes. When customers dispute charges, they will appear here."
        />
      </CardContent>
    </Card>
  );
}

function AnalyticsTab({ salonId }: { salonId: string }) {
  const { analytics, loading } = usePaymentAnalytics(salonId);
  const { mrr } = useMRR(salonId, { groupByPlan: true });

  if (loading) {
    return <PaymentAnalyticsSkeleton />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Revenue Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">MRR by Plan</h4>
              {mrr?.plans ? (
                <div className="space-y-2">
                  {Object.entries(mrr.plans).map(([plan, amount]) => (
                    <div key={plan} className="flex justify-between">
                      <span className="capitalize">{plan}</span>
                      <span className="font-medium">{formatCurrency(amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No plan data available</p>
              )}
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Decline Reasons</h4>
              {analytics?.declineReasons ? (
                <div className="space-y-2">
                  {Object.entries(analytics.declineReasons).map(([reason, count]) => (
                    <div key={reason} className="flex justify-between">
                      <span className="capitalize">{reason.replace('_', ' ')}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No decline data</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== UTILS ====================

function formatCurrency(amount: number, currency = 'DKK'): string {
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency,
  }).format(amount / 100);
}
