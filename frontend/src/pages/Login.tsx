import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useState } from 'react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [errorMsg, setErrorMsg] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const res = await api.post('/auth/login', data);
      return res.data;
    },
    onSuccess: async (data) => {
      const payload = JSON.parse(atob(data.access_token.split('.')[1]));
      setAuth(data.access_token, { email: payload.email, sub: payload.sub });
      navigate('/dashboard');
    },
    onError: (error: any) => {
      setErrorMsg(error.response?.data?.message || 'Failed to login');
    },
  });

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity animate-pulse" />
            <div className="relative bg-gradient-to-br from-blue-500 via-cyan-500 to-purple-500 p-4 rounded-2xl">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>
        <h2 className="text-center text-4xl font-bold tracking-tight text-white mb-2">
          Welcome back
        </h2>
        <p className="text-center text-slate-400">Sign in to continue to FileFlow</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl py-10 px-6 shadow-2xl ring-1 ring-white/10 sm:rounded-2xl sm:px-12 border border-white/10">
            <form className="space-y-6" onSubmit={handleSubmit((data) => loginMutation.mutate(data))}>
              {errorMsg && (
                 <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-sm text-center backdrop-blur-sm animate-in slide-in-from-top duration-300">
                   {errorMsg}
                 </div>
              )}
              
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                error={errors.email?.message}
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                error={errors.password?.message}
              />

              <Button
                type="submit"
                className="w-full group shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all"
                isLoading={loginMutation.isPending}
              >
                Sign in
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </form>

            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 px-4 text-slate-400">
                    New to FileFlow?
                  </span>
                </div>
              </div>

              <div className="mt-6">
                 <Link 
                   to="/register" 
                   className="w-full inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/10 hover:border-white/20 transition-all group"
                 >
                   Create an account
                   <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                 </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
