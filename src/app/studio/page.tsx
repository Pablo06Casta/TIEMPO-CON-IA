import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import Studio from './studio';
export default async function StudioPage() { const user=await currentUser(); if(!user) redirect('/login'); return <Studio email={user.email}/>; }
