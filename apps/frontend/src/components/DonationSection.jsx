import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import toast from "react-hot-toast";
import { DollarSign, Package, Heart, Loader2, TrendingUp } from "lucide-react";

export default function DonationSection({ eventId }) {
  const [donationType, setDonationType] = useState("monetary");
  const [amount, setAmount] = useState("");
  const [item, setItem] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [donations, setDonations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingDonations, setLoadingDonations] = useState(true);
  const { user, token } = useAuth();

  // Fetch donations
  useEffect(() => {
    fetchDonations();
  }, [eventId]);

  const fetchDonations = async () => {
    try {
      const response = await api.post("/graphql", {
        query: `
          query EventDonations($eventId: ID!) {
            eventDonations(eventId: $eventId) {
              donations {
                id
                donorName
                amount
                item
                quantity
                type
                message
                createdAt
              }
              stats {
                totalMonetary
                totalItems
                totalDonations
              }
            }
          }
        `,
        variables: { eventId }
      });

      if (response.data.data?.eventDonations) {
        setDonations(response.data.data.eventDonations.donations);
        setStats(response.data.data.eventDonations.stats);
      }
    } catch (error) {
      console.error("Error fetching donations:", error);
    } finally {
      setLoadingDonations(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please log in to make a donation");
      return;
    }

    if (donationType === "monetary" && (!amount || parseFloat(amount) <= 0)) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (donationType === "item" && (!item || !quantity)) {
      toast.error("Please enter item details");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        "/graphql",
        {
          query: `
            mutation CreateDonation($input: CreateDonationInput!) {
              createDonation(input: $input) {
                id
                amount
                item
                donorName
                createdAt
              }
            }
          `,
          variables: {
            input: {
              eventId,
              type: donationType,
              amount: donationType === "monetary" ? parseFloat(amount) : null,
              item: donationType === "item" ? item : null,
              quantity: donationType === "item" ? parseInt(quantity) : null,
              message: message || null
            }
          }
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      toast.success("Thank you for your donation!");
      
      // Reset form
      setAmount("");
      setItem("");
      setQuantity("1");
      setMessage("");
      
      // Refresh donations
      fetchDonations();
    } catch (error) {
      console.error("Donation error:", error);
      toast.error(error.response?.data?.errors?.[0]?.message || error.message || "Donation failed");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Support This Event</h3>
        <p className="text-gray-600 mb-4">Please log in to make a donation</p>
        <a
          href="/login"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Sign In
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Monetary</span>
            </div>
            <p className="text-2xl font-bold text-green-600">${stats.totalMonetary.toFixed(2)}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Items</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{stats.totalItems}</p>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-900">Total</span>
            </div>
            <p className="text-2xl font-bold text-indigo-600">{stats.totalDonations}</p>
          </div>
        </div>
      )}

      {/* Donation Form */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Heart className="h-6 w-6 text-red-500" />
          Make a Donation
        </h3>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Donation Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Donation Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDonationType("monetary")}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                  donationType === "monetary"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <DollarSign className="h-5 w-5" />
                <span className="font-medium">Money</span>
              </button>
              <button
                type="button"
                onClick={() => setDonationType("item")}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                  donationType === "item"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Package className="h-5 w-5" />
                <span className="font-medium">Item</span>
              </button>
            </div>
          </div>

          {/* Monetary Donation */}
          {donationType === "monetary" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount ($)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="50.00"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Item Donation */}
          {donationType === "item" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Name
                </label>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="e.g., Water bottles, Food supplies"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  disabled={loading}
                />
              </div>
            </>
          )}

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
              placeholder="Add a message of support..."
              disabled={loading}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Heart className="h-5 w-5" />
                Donate Now
              </>
            )}
          </button>
        </form>
      </div>

      {/* Recent Donations */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Donations</h3>
        {loadingDonations ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
          </div>
        ) : donations.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No donations yet. Be the first!</p>
        ) : (
          <div className="space-y-3">
            {donations.slice(0, 5).map((donation) => (
              <div
                key={donation.id}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className={`p-2 rounded-lg ${
                  donation.type === "monetary" ? "bg-green-100" : "bg-purple-100"
                }`}>
                  {donation.type === "monetary" ? (
                    <DollarSign className="h-5 w-5 text-green-600" />
                  ) : (
                    <Package className="h-5 w-5 text-purple-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{donation.donorName}</p>
                  <p className="text-sm text-gray-600">
                    {donation.type === "monetary"
                      ? `$${donation.amount.toFixed(2)}`
                      : `${donation.quantity}x ${donation.item}`}
                  </p>
                  {donation.message && (
                    <p className="text-sm text-gray-500 mt-1 italic">"{donation.message}"</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
