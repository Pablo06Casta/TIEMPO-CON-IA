import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import LoginForm from './login-form';
export default async function Login() { if (await currentUser()) redirect('/studio'); return <LoginForm />; }
