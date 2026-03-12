import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Loader2, Plus, File as FileIcon, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { useState } from 'react';

export function RecordsList() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['records', page, statusFilter],
    queryFn: async () => {
      const res = await api.get('/records', {
        params: { page, limit: 10, status: statusFilter || undefined }
      });
      return res.data;
    },
  });

  const getProcessingColor = (status: string) => {
    switch(status) {
      case 'COMPLETED': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'FAILED': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'PROCESSING': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }
  };

  const deleteRecord = async (id: string) => {
    if (confirm('Are you sure you want to delete this record?')) {
      try {
        await api.delete(`/records/${id}`);
        refetch();
      } catch (err) {
        alert('Failed to delete record');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Records</h1>
          <p className="text-slate-400 mt-1">Manage your document tasks</p>
        </div>
        
        <div className="flex gap-4 w-full sm:w-auto">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border-slate-700 text-slate-100 text-sm rounded-lg focus:ring-primary focus:border-primary block p-2.5 outline-none w-full sm:w-auto"
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </select>

          <Link to="/records/new" className="shrink-0 w-full sm:w-auto">
            <Button className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              New Record
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
        {isLoading ? (
           <div className="flex items-center justify-center p-12">
             <Loader2 className="w-8 h-8 animate-spin text-primary" />
           </div>
        ) : data?.data?.length === 0 ? (
           <div className="p-12 text-center text-slate-400 flex flex-col items-center">
             <FileIcon className="w-12 h-12 text-slate-600 mb-4" />
             <p className="text-lg font-medium text-slate-300">No records found</p>
             <p className="mt-1">Create a new record or change your filters.</p>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 font-medium">Title</th>
                  <th className="px-6 py-3 font-medium">State</th>
                  <th className="px-6 py-3 font-medium">Processing</th>
                  <th className="px-6 py-3 font-medium">File</th>
                  <th className="px-6 py-3 font-medium">Created</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {data?.data?.map((record: any) => (
                  <tr key={record.id} className="hover:bg-slate-800/30 transition-colors group text-slate-300">
                    <td className="px-6 py-4 font-medium text-white max-w-[200px] truncate">
                      <Link to={`/records/${record.id}`} className="hover:text-primary transition-colors">
                        {record.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                        getProcessingColor(record.processing_status)
                      )}>
                        {record.processing_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       {record.file_name ? (
                         <span className="flex items-center gap-1.5 text-xs text-slate-400">
                           <FileIcon className="w-3.5 h-3.5" />
                           <span className="truncate max-w-[120px]">{record.file_name}</span>
                         </span>
                       ) : (
                         <span className="text-xs text-slate-500">—</span>
                       )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {format(new Date(record.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link to={`/records/${record.id}`} className="text-primary hover:text-blue-400 text-sm font-medium">
                          Edit
                        </Link>
                        <button 
                          onClick={() => deleteRecord(record.id)}
                          className="text-red-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination */}
            {data?.meta?.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-700/50 flex items-center justify-between text-sm">
                <div className="text-slate-400">
                  Showing page <span className="text-white font-medium">{page}</span> of <span className="text-white font-medium">{data.meta.totalPages}</span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="secondary" 
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="py-1.5 px-3"
                  >
                    Previous
                  </Button>
                  <Button 
                    variant="secondary" 
                    disabled={page === data.meta.totalPages}
                    onClick={() => setPage(page + 1)}
                    className="py-1.5 px-3"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
