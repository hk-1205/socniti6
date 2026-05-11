import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { toast } from "react-hot-toast";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingOrganizers();
  }, []);

  const fetchPendingOrganizers = async () => {
    try {
      setLoading(true);
      const query = `
        query {
          pendingOrganizers {
            id
            fullName
            username
            email
            isVerified
            isOrganizerApproved
            role
          }
        }
      `;
      const response = await api.post("/graphql", { query });
      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }
      setOrganizers(response.data.data.pendingOrganizers);
    } catch (err) {
      toast.error(err.message || "Failed to fetch organizers");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (userId, status) => {
    try {
      const query = `
        mutation VerifyOrganizer($userId: ID!, $status: Boolean!) {
          verifyOrganizer(userId: $userId, status: $status) {
            id
            isOrganizerApproved
          }
        }
      `;
      const variables = { userId, status };
      const response = await api.post("/graphql", { query, variables });
      
      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }
      
      toast.success(status ? "Organizer approved!" : "Organizer rejected");
      fetchPendingOrganizers();
    } catch (err) {
      toast.error(err.message || "Verification failed");
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Access Denied
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            You do not have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            Admin Dashboard
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
            Manage platform users and organizer verifications.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-xl overflow-hidden mb-8 border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Pending Organizer Approvals
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Organizers who have verified their email but need admin approval to create events.
          </p>
        </div>
        
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-500 dark:text-gray-400">Loading organizers...</p>
          </div>
        ) : organizers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30">
              <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">All caught up!</h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">There are no pending organizer verifications at the moment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/80">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Organizer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {organizers.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold text-lg">
                          {org.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{org.fullName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">@{org.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{org.email}</div>
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Email Verified
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleVerify(org.id, true)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 mr-2 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleVerify(org.id, false)}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                      >
                        Reject
                      </button>
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
