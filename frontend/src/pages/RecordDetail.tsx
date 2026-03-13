import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, UploadCloud, FileIcon, Trash2, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useToast } from '../components/Toast';
import { ConfirmModal } from '../components/Modal';

export function RecordDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: record, isLoading } = useQuery({
    queryKey: ['record', id],
    queryFn: async () => {
      const res = await api.get(`/records/${id}`);
      return res.data;
    },
    refetchInterval: (query) => {
      const status = query.state?.data?.processing_status;
      return (status === 'PENDING' || status === 'PROCESSING') ? 5000 : false;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await api.patch(`/records/${id}`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['record', id] });
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      showToast('Status updated successfully', 'success');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/records/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      showToast('Record deleted successfully', 'success');
      navigate('/records');
    },
    onError: () => {
      showToast('Failed to delete record', 'error');
    }
  });

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('File must be smaller than 5MB', 'error');
      return;
    }

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      showToast('File type not allowed. Must be PDF, PNG, JPG or TXT.', 'error');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(10);

      const presignRes = await api.post('/uploads/presign', {
        recordId: id,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      });
      
      const { uploadUrl, fileKey } = presignRes.data;
      setUploadProgress(30);

      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type,
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(30 + (percentCompleted * 0.6));
          }
        }
      });
      setUploadProgress(90);

      await api.post('/uploads/complete', {
        recordId: id,
        fileKey,
        fileName: file.name,
        fileSize: file.size
      });

      setUploadProgress(100);
      showToast('File uploaded successfully! Processing...', 'success');
      queryClient.invalidateQueries({ queryKey: ['record', id] });
      
    } catch (error) {
      console.error('Upload failed', error);
      showToast('Upload failed. Please try again.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [id, queryClient, showToast]);

  const getProcessingColor = (status: string) => {
    switch(status) {
      case 'COMPLETED': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'FAILED': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'PROCESSING': return 'bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse';
      case 'PENDING': return 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-white">Record not found</h2>
        <Link to="/records" className="text-primary mt-4 inline-block">Back to records</Link>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/records" className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">{record.title}</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                {record.status}
              </span>
              {record.file_name && (
                <span className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                  getProcessingColor(record.processing_status)
                )}>
                  Processing: {record.processing_status}
                </span>
              )}
            </div>
            <p className="text-sm font-mono text-slate-500 mt-1">ID: {record.id}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={record.status}
              onChange={(e) => updateStatusMutation.mutate(e.target.value)}
              disabled={updateStatusMutation.isPending}
              className="bg-slate-800 border-slate-700 text-slate-100 text-sm rounded-lg focus:ring-primary focus:border-primary p-2 outline-none cursor-pointer disabled:cursor-not-allowed"
            >
              <option value="NEW">Status: New</option>
              <option value="IN_PROGRESS">Status: In Progress</option>
              <option value="DONE">Status: Done</option>
            </select>
            
            <Button 
              variant="danger" 
              onClick={() => setShowDeleteModal(true)}
              isLoading={deleteMutation.isPending}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-sm font-medium text-slate-400 mb-2">Description</h3>
              <p className="text-slate-200 whitespace-pre-wrap">
                {record.description || <span className="text-slate-600 italic">No description provided</span>}
              </p>
            </div>

            <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-sm font-medium text-slate-400 mb-4">File Attachment</h3>
              
              {record.file_name ? (
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 flex items-start gap-4">
                  <div className="p-3 bg-slate-700/50 rounded-lg text-primary">
                    <FileIcon className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-200 flex items-center gap-2">
                      {record.file_name}
                      {record.processing_status === 'COMPLETED' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    </div>
                    <div className="text-sm text-slate-400 mt-1">
                      {(record.file_size / 1024 / 1024).toFixed(2)} MB • Uploaded {format(new Date(record.updated_at), 'MMM d, yyyy')}
                    </div>
                    
                    {record.processing_error && (
                      <div className="mt-3 text-sm text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">
                        Processing Error: {record.processing_error}
                      </div>
                    )}
                    
                    {record.processing_metadata && (
                      <div className="mt-3 text-xs font-mono text-slate-400 bg-slate-900 p-2 rounded border border-slate-800 overflow-x-auto">
                        {JSON.stringify(record.processing_metadata, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center bg-slate-800/20 hover:bg-slate-800/40 transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    disabled={isUploading}
                  />
                  
                  {isUploading ? (
                    <div className="space-y-4 max-w-xs mx-auto">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                      <div className="text-sm font-medium text-slate-300">Uploading file...</div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                      <div className="p-4 bg-slate-800 rounded-full text-slate-400 mb-4 inline-flex">
                        <UploadCloud className="w-8 h-8" />
                      </div>
                      <span className="text-slate-200 font-medium block">Click to upload or drag and drop</span>
                      <span className="text-slate-500 text-sm mt-1 block">PDF, PNG, JPG or TXT (max 5MB)</span>
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-sm font-medium text-slate-400 mb-4">Metadata</h3>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-slate-500">Created</dt>
                  <dd className="text-slate-200 font-medium mt-1">
                    {format(new Date(record.created_at), 'MMM d, yyyy h:mm a')}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Last Modified</dt>
                  <dd className="text-slate-200 font-medium mt-1">
                    {format(new Date(record.updated_at), 'MMM d, yyyy h:mm a')}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Processing State</dt>
                  <dd className="mt-1">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border",
                      getProcessingColor(record.processing_status)
                    )}>
                      {record.processing_status}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          deleteMutation.mutate();
          setShowDeleteModal(false);
        }}
        title="Delete Record"
        message="Are you sure you want to delete this record? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
