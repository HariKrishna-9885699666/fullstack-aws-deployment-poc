import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Loader2, PlayCircle } from 'lucide-react';
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
      case 'COMPLETED': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'FAILED': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'PROCESSING': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-400 mt-1">Summary of your tasks and processing queue</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button variant="ghost" onClick={() => refetch()} isLoading={isRefetching} className="hidden sm:inline-flex">
            <RefreshCw className={cn("w-4 h-4 mr-2", isRefetching && "animate-spin")} />
            Refresh
          </Button>
          <Link to="/records/new" className="w-full sm:w-auto">
             <Button className="w-full">New Record</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50 flex flex-col items-start gap-3 col-span-2 md:col-span-1">
          <div className="text-sm font-medium text-slate-400">Total Records</div>
          <div className="text-4xl font-semibold text-white">{data?.totalRecords || 0}</div>
        </div>

        <div className="bg-slate-800/40 p-5 rounded-xl border border-amber-500/20 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-amber-500">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Pending</span>
          </div>
          <div className="text-2xl font-semibold text-white">{data?.byProcessingStatus?.PENDING || 0}</div>
        </div>

        <div className="bg-slate-800/40 p-5 rounded-xl border border-blue-500/20 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-blue-500">
             <PlayCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Processing</span>
          </div>
          <div className="text-2xl font-semibold text-white">{data?.byProcessingStatus?.PROCESSING || 0}</div>
        </div>

        <div className="bg-slate-800/40 p-5 rounded-xl border border-green-500/20 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Completed</span>
          </div>
          <div className="text-2xl font-semibold text-white">{data?.byProcessingStatus?.COMPLETED || 0}</div>
        </div>

        <div className="bg-slate-800/40 p-5 rounded-xl border border-red-500/20 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Failed</span>
          </div>
          <div className="text-2xl font-semibold text-white">{data?.byProcessingStatus?.FAILED || 0}</div>
        </div>
      </div>

      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden mt-8">
        <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/50">
          <h2 className="text-lg font-medium text-white">Recent Records</h2>
        </div>
        
        {data?.recentRecords?.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No records found. Create one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-800/30 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 font-medium">Title</th>
                  <th className="px-6 py-3 font-medium">State</th>
                  <th className="px-6 py-3 font-medium">Processing</th>
                  <th className="px-6 py-3 font-medium">Created</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {data?.recentRecords?.map((record: any) => (
                  <tr key={record.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4 text-white font-medium max-w-xs truncate">
                       {record.title}
                       {record.file_name && (
                         <span className="ml-2 text-xs font-normal text-slate-400 block truncate mt-0.5">
                           📎 {record.file_name}
                         </span>
                       )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                        getStatusColor(record.processing_status)
                      )}>
                        {record.processing_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {format(new Date(record.created_at), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/records/${record.id}`} className="text-primary hover:text-blue-400 font-medium tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                        View Details
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
  );
}
