import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Loader2, PlayCircle, Plus, TrendingUp, Activity, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { format } from 'date-fns';

export function Dashboard() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/dashboard/summary');
      return res.data;
    },
    refetchInterval: 15000,
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'COMPLETED': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'FAILED': return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'PROCESSING': return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      default: return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
          <div className="absolute inset-0 blur-xl bg-blue-500/30 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-white tracking-tight bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text">
            Dashboard
          </h1>
          <p className="text-slate-400 text-lg flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Real-time overview of your workflow
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button 
            variant="ghost" 
            onClick={() => refetch()} 
            isLoading={isRefetching} 
            className="group"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500", isRefetching && "animate-spin")} />
            Refresh
          </Button>
          <Link to="/records/new" className="w-full sm:w-auto">
             <Button className="w-full shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-shadow">
               <Plus className="w-4 h-4 mr-2" />
               New Record
             </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Records - Larger Card */}
        <div className="lg:col-span-1 md:col-span-2 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm p-6 rounded-2xl border border-white/10 hover:border-blue-500/30 transition-all duration-300 shadow-xl hover:shadow-blue-500/10">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl border border-blue-500/20">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <div className="px-2 py-1 bg-blue-500/10 rounded-lg text-xs font-semibold text-blue-400 border border-blue-500/20">
                Total
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-400">Total Records</p>
              <p className="text-5xl font-bold text-white tracking-tight">{data?.totalRecords || 0}</p>
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm p-5 rounded-2xl border border-white/10 hover:border-amber-500/30 transition-all duration-300 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <Zap className="w-4 h-4 text-amber-400/50" />
            </div>
            <p className="text-xs font-medium text-slate-400 mb-1">Pending</p>
            <p className="text-3xl font-bold text-white">{data?.byProcessingStatus?.PENDING || 0}</p>
          </div>
        </div>

        {/* Processing */}
        <div className="group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm p-5 rounded-2xl border border-white/10 hover:border-blue-500/30 transition-all duration-300 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <PlayCircle className="w-5 h-5 text-blue-400" />
              </div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            </div>
            <p className="text-xs font-medium text-slate-400 mb-1">Processing</p>
            <p className="text-3xl font-bold text-white">{data?.byProcessingStatus?.PROCESSING || 0}</p>
          </div>
        </div>

        {/* Completed */}
        <div className="group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm p-5 rounded-2xl border border-white/10 hover:border-emerald-500/30 transition-all duration-300 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-emerald-400/30">✓</div>
            </div>
            <p className="text-xs font-medium text-slate-400 mb-1">Completed</p>
            <p className="text-3xl font-bold text-white">{data?.byProcessingStatus?.COMPLETED || 0}</p>
          </div>
        </div>

        {/* Failed */}
        <div className="group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm p-5 rounded-2xl border border-white/10 hover:border-rose-500/30 transition-all duration-300 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-rose-500/10 rounded-lg">
                <AlertCircle className="w-5 h-5 text-rose-400" />
              </div>
              <div className="text-rose-400/30">✕</div>
            </div>
            <p className="text-xs font-medium text-slate-400 mb-1">Failed</p>
            <p className="text-3xl font-bold text-white">{data?.byProcessingStatus?.FAILED || 0}</p>
          </div>
        </div>
      </div>

      {/* Recent Records Table */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
          <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-gray-800/50 to-gray-900/50">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full" />
              Recent Activity
            </h2>
          </div>
          
          {data?.recentRecords?.length === 0 ? (
            <div className="p-16 text-center">
              <div className="inline-flex p-4 bg-slate-800/50 rounded-2xl mb-4">
                <Activity className="w-12 h-12 text-slate-600" />
              </div>
              <p className="text-lg font-medium text-slate-400 mb-2">No records yet</p>
              <p className="text-slate-500 mb-6">Create your first record to get started</p>
              <Link to="/records/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Record
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-800/30 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">Title</th>
                    <th className="px-6 py-4 font-semibold">State</th>
                    <th className="px-6 py-4 font-semibold">Processing</th>
                    <th className="px-6 py-4 font-semibold">Created</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data?.recentRecords?.map((record: any, idx: number) => (
                    <tr 
                      key={record.id} 
                      className="hover:bg-white/5 transition-all duration-200 group/row"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-white font-medium group-hover/row:text-blue-400 transition-colors">
                            {record.title}
                          </span>
                          {record.file_name && (
                            <span className="text-xs text-slate-500 flex items-center gap-1.5">
                              📎 {record.file_name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-gray-700/50 text-slate-300 border border-gray-600/50">
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold border backdrop-blur-sm",
                          getStatusColor(record.processing_status)
                        )}>
                          {record.processing_status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-slate-400">
                          {format(new Date(record.created_at), 'MMM d, yyyy HH:mm')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          to={`/records/${record.id}`} 
                          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium text-sm opacity-0 group-hover/row:opacity-100 transition-opacity"
                        >
                          View
                          <span className="group-hover/row:translate-x-1 transition-transform">→</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
