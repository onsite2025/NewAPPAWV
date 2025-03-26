import { Suspense } from 'react';
import Header from "@/components/dashboard/Header";
import Pagination from "@/components/dashboard/Pagination";
import UserTable from "./components/UserTable";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import the InviteUserButton component
const InviteUserButton = dynamic(() => import('./components/InviteUserButton'), {
  ssr: false,
  loading: () => <Button disabled>Loading...</Button>
});

export default function UsersPage() {
  return (
    <div className="p-6 space-y-4">
      <Header title="User Management" description="Manage user accounts and permissions" />
      
      <div className="flex justify-end space-x-2">
        <Link href="/dashboard/users/invitations">
          <Button variant="outline" className="flex items-center gap-1">
            <span>View Invitations</span>
          </Button>
        </Link>
        
        <Link href="/dashboard/users/new">
          <Button className="flex items-center gap-1">
            <UserPlus className="h-4 w-4" />
            <span>Add User</span>
          </Button>
        </Link>
        
        {/* Add the invite user button */}
        <Suspense fallback={<Button disabled>Loading...</Button>}>
          <InviteUserButton />
        </Suspense>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <Suspense fallback={<div>Loading user data...</div>}>
          <UserTable />
        </Suspense>
        <div className="mt-4">
          <Pagination totalPages={5} currentPage={1} />
        </div>
      </div>
    </div>
  );
} 