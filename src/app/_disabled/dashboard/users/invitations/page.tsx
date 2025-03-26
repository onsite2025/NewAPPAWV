'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Copy, Trash, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Header from '@/components/dashboard/Header';

interface Invitation {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
  inviteLink: string;
}

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/.netlify/functions/api/invitations');
      const data = await response.json();

      if (data.success) {
        setInvitations(data.data || []);
      } else {
        setError(data.error || 'Failed to load invitations');
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
      setError('Failed to load invitations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link)
      .then(() => {
        toast({
          title: "Success",
          description: "Invitation link copied to clipboard",
        });
      })
      .catch(err => {
        console.error('Failed to copy link:', err);
        toast({
          title: "Error",
          description: "Failed to copy link",
          variant: "destructive",
        });
      });
  };

  // Format date string to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Check if invitation is expired
  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="p-6 space-y-4">
      <Header title="User Invitations" description="Manage pending user invitations" />
      
      <div className="flex justify-between">
        <Link href="/dashboard/users">
          <Button variant="outline" className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Users</span>
          </Button>
        </Link>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        {isLoading ? (
          <div className="py-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-500">Loading invitations...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500">{error}</p>
            <Button 
              onClick={fetchInvitations} 
              className="mt-4"
              variant="outline"
            >
              Try Again
            </Button>
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No active invitations found.</p>
            <p className="mt-2 text-sm text-gray-400">
              Create invitations from the User Management page.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3 rounded-tr-lg">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => (
                  <tr 
                    key={invitation.id} 
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium">{invitation.email}</td>
                    <td className="px-4 py-3">
                      {invitation.role === 'admin' && 'Administrator'}
                      {invitation.role === 'doctor' && 'Doctor/Provider'}
                      {invitation.role === 'nurse' && 'Nurse/Staff'}
                      {invitation.role === 'staff' && 'Staff'}
                      {!invitation.role && 'Staff'}
                    </td>
                    <td className="px-4 py-3">{formatDate(invitation.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <span className={isExpired(invitation.expiresAt) ? 'text-red-500' : ''}>
                          {formatDate(invitation.expiresAt)}
                        </span>
                        {isExpired(invitation.expiresAt) && (
                          <span className="ml-2 px-2 py-1 text-xs font-medium text-red-500 bg-red-50 rounded-full">
                            Expired
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleCopyLink(invitation.inviteLink)}
                          title="Copy invitation link"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
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