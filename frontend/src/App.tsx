/**
 * Main Dashboard Application
 */

import { useDashboard } from './hooks/useDashboard';
import { MetricsCard } from './components/MetricsCard';
import { LineChart } from './components/LineChart';
import { AlertList } from './components/AlertList';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { WalletBalances } from './components/WalletBalances';

function App() {
  const {
    connected,
    metrics,
    alerts,
    performance,
    chartData,
    latency
  } = useDashboard();

  const formatEth = (weiString: string): string => {
    const wei = BigInt(weiString);
    const eth = Number(wei) / 1e18;
    return eth.toFixed(4);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">
              📊 Arbitrage Bot Dashboard
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    connected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-sm text-gray-600">
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {connected && latency > 0 && (
                <span className="text-sm text-gray-600">
                  Latency: {latency.toFixed(0)}ms
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {!metrics ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
            <p className="mt-4 text-gray-600">Loading dashboard data...</p>
          </div>
        ) : (
          <>
            {/* Wallet Balances */}
            {metrics.walletBalances && metrics.walletBalances.length > 0 && (
              <WalletBalances walletBalances={metrics.walletBalances} />
            )}

            {/* Hero Metrics */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Key Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricsCard
                  title="Net Profit"
                  value={`${formatEth(metrics.netProfit)} ETH`}
                  subtitle={`ROI: ${metrics.roi.toFixed(2)}%`}
                  color={parseFloat(metrics.netProfit) > 0 ? 'green' : 'red'}
                  trend={parseFloat(metrics.netProfit) > 0 ? 'up' : 'down'}
                />
                <MetricsCard
                  title="Success Rate"
                  value={`${metrics.successRate.toFixed(2)}%`}
                  subtitle={`${metrics.successfulTrades}/${metrics.totalTrades} trades`}
                  color={metrics.successRate >= 90 ? 'green' : metrics.successRate >= 70 ? 'yellow' : 'red'}
                />
                <MetricsCard
                  title="Avg Gas Cost"
                  value={`${formatEth(metrics.averageGasCost)} ETH`}
                  color="blue"
                />
                <MetricsCard
                  title="Sharpe Ratio"
                  value={metrics.sharpeRatio.toFixed(3)}
                  subtitle={`Drawdown: ${metrics.maxDrawdown.toFixed(2)}%`}
                  color={metrics.sharpeRatio > 1 ? 'green' : 'yellow'}
                />
              </div>
            </section>

            {/* Charts */}
            {chartData && (
              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Performance Charts</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <LineChart
                    data={chartData.profitOverTime}
                    title="Profit Over Time"
                    color="#10b981"
                    yAxisLabel="ETH"
                    formatValue={(v) => `${v.toFixed(4)} ETH`}
                  />
                  <LineChart
                    data={chartData.gasOverTime}
                    title="Gas Cost Over Time"
                    color="#ef4444"
                    yAxisLabel="ETH"
                    formatValue={(v) => `${v.toFixed(6)} ETH`}
                  />
                  <LineChart
                    data={chartData.successRateOverTime}
                    title="Success Rate Over Time"
                    color="#3b82f6"
                    yAxisLabel="%"
                    formatValue={(v) => `${v.toFixed(1)}%`}
                  />
                  <LineChart
                    data={chartData.volumeOverTime}
                    title="Trade Volume Over Time"
                    color="#8b5cf6"
                    yAxisLabel="Trades"
                    formatValue={(v) => v.toFixed(0)}
                  />
                </div>
              </section>
            )}

            {/* Performance Dashboard */}
            <section className="mb-8">
              <PerformanceDashboard performance={performance} wsLatency={latency} />
            </section>

            {/* Alerts */}
            <section>
              <AlertList alerts={alerts} />
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="container mx-auto px-6 py-4 text-center text-sm text-gray-600">
          Real-Time Analytics Dashboard v1.0.0 | Copilot-Consciousness
        </div>
      </footer>
    </div>
  );
}

export default App;
