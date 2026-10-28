import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Field } from '../components/ui';
import { useAuth } from '../lib/auth';
import {
  loginSchema,
  publicRoles,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from '../lib/schemas';
import type { Role } from '../types/api';

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md">
      <Card>
        <h1 className="mb-4 text-xl font-semibold">{title}</h1>
        {children}
      </Card>
    </div>
  );
}

const ErrorBox = ({ message }: { message?: string }) =>
  message ? (
    <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
      {message}
    </p>
  ) : null;

const demoRoles: { label: string; email: string; role: Role }[] = [
  { label: 'Farmer', email: 'farmer@demo.agritrace.test', role: 'FARMER' },
  { label: 'Distributor', email: 'distributor@demo.agritrace.test', role: 'DISTRIBUTOR' },
  { label: 'Wholesaler', email: 'wholesaler@demo.agritrace.test', role: 'WHOLESALER' },
  { label: 'Processor', email: 'processor@demo.agritrace.test', role: 'PROCESSOR' },
  { label: 'Retailer', email: 'retailer1@demo.agritrace.test', role: 'RETAILER' },
  { label: 'Auditor', email: 'auditor@demo.agritrace.test', role: 'AUDITOR' },
  { label: 'Admin', email: 'admin@demo.agritrace.test', role: 'ADMIN' },
  { label: 'Consumer', email: 'consumer@demo.agritrace.test', role: 'CONSUMER' },
];

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/app';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const m = useMutation({
    mutationFn: (v: LoginInput) => login(v.email, v.password),
    onSuccess: () => navigate(from, { replace: true }),
  });

  const fillDemo = (email: string) => {
    setValue('email', email);
    setValue('password', 'Demo-Only-Password-1!');
  };

  return (
    <Shell title="Sign in">
      <form className="space-y-4" onSubmit={handleSubmit((v) => m.mutate(v))} noValidate>
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <ErrorBox message={m.error?.message} />
        <Button type="submit" loading={m.isPending} className="w-full">
          Sign in
        </Button>
        <p className="text-center text-sm">
          No account?{' '}
          <Link to="/register" className="text-leaf-700 underline">
            Register
          </Link>
        </p>

        <div className="mt-6 border-t border-stone-200 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
            Quick demo sign-in:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {demoRoles.map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => fillDemo(d.email)}
                className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-stone-700 hover:bg-stone-100"
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </form>
    </Shell>
  );
}

export function Register() {
  const navigate = useNavigate();
  const { register: registerAuth } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'CONSUMER' },
  });

  const m = useMutation({
    mutationFn: ({ name, email, password, role }: RegisterInput) =>
      registerAuth(name, email, password, role),
    onSuccess: () => navigate('/app'),
  });

  return (
    <Shell title="Create an account">
      <form className="space-y-4" onSubmit={handleSubmit((v) => m.mutate(v))} noValidate>
        <Field
          label="Full name"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="role-select" className="text-sm font-medium text-stone-700">
            Role
          </label>
          <select
            id="role-select"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-leaf-600 focus:outline-none"
            {...register('role')}
          >
            {publicRoles.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0) + r.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          {errors.role && <p className="text-xs text-red-600">{errors.role.message}</p>}
        </div>

        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Field
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.confirm?.message}
          {...register('confirm')}
        />
        <ErrorBox message={m.error?.message} />
        <Button type="submit" loading={m.isPending} className="w-full">
          Register
        </Button>
        <p className="text-center text-sm">
          Already registered?{' '}
          <Link to="/login" className="text-leaf-700 underline">
            Sign in
          </Link>
        </p>
      </form>
    </Shell>
  );
}
