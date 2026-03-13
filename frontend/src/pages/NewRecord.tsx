import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { api } from '../lib/axios';
import { useToast } from '../components/Toast';

const newRecordSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
});

type NewRecordForm = z.infer<typeof newRecordSchema>;

export function NewRecord() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<NewRecordForm>({
    resolver: zodResolver(newRecordSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: NewRecordForm) => {
      const res = await api.post('/records', data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      showToast('Record created successfully!', 'success');
      navigate(`/records/${data.id}`);
    },
    onError: () => {
      showToast('Failed to create record', 'error');
    },
  });

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">New Record</h1>
        <p className="text-slate-400 mt-1">Create a new task or document entry</p>
      </div>

      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-6">
        <form className="space-y-6" onSubmit={handleSubmit((data) => createMutation.mutate(data))}>
          <Input
            label="Title"
            placeholder="e.g., Monthly Expense Report"
            {...register('title')}
            error={errors.title?.message}
          />

          <div className="w-full">
            <label className="block text-sm font-medium text-slate-300 mb-1.5 cursor-default select-none">
              Description (Optional)
            </label>
            <textarea
              className="flex min-h-[120px] w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 transition-colors placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent resize-y cursor-text"
              placeholder="Add some details about this record..."
              {...register('description')}
            />
          </div>

          <div className="flex gap-4 pt-2">
             <Button
               type="button"
               variant="ghost"
               onClick={() => navigate('/records')}
               disabled={createMutation.isPending}
             >
               Cancel
             </Button>
            <Button
              type="submit"
              className="flex-1"
              isLoading={createMutation.isPending}
            >
              Create Record
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
