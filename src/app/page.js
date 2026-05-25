"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { loginAdmin, logoutAdmin } from "../lib/authService";
import HiringModal from "@/components/ui/Application/hiringmodal";

export default function Home() {
  const router = useRouter();
  const [credentials, setCredentials] = useState({
    staffId: "",
    password: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isHiringOpen, setIsHiringOpen] = useState(false);

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await loginAdmin(credentials.staffId, credentials.password);
      const userRole = result.role?.toUpperCase();

      const staffRoles = ["ADMIN", "MANAGER", "SUPERVISOR", "STAFF", "SECRETARY"];

      if (staffRoles.includes(userRole)) {
        router.push("/Pages/Admin");
      } else {
        setError("Access Denied: This portal is for staff only.");
        logoutAdmin();
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-6 font-sans">
      <div className="max-w-[1000px] w-full grid lg:grid-cols-2 gap-10 items-center">

        {/* Left Side: Branding */}
        <div className="hidden lg:flex flex-col pr-8 pb-16">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-[3.5rem] font-extrabold text-[#003580] tracking-tight leading-none">
              DreamHome
            </h1>
          </div>
          <h2 className="text-[1.75rem] font-medium text-gray-800 leading-tight pr-4">
            Manage properties and staff efficiently and securely.
          </h2>
        </div>

        {/* Right Side: Login Card */}
        <div className="w-full max-w-[400px] mx-auto lg:mx-0 lg:ml-auto">
          <div className="bg-white p-4 shadow-xl rounded-xl border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Error Message Display */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
                  {error}
                </div>
              )}

              <div>
                <input
                  type="text"
                  name="staffId"
                  placeholder="Email address or Staff ID"
                  value={credentials.staffId}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#003580] focus:border-[#003580] text-[17px]"
                  required
                />
              </div>

              <div>
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={credentials.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#003580] focus:border-[#003580] text-[17px]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#003580] hover:bg-[#00265c] text-white font-bold text-xl py-3 rounded-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? "Authenticating..." : "Log In"}
              </button>

              <div className="text-center pt-1">
                <a href="#" className="text-[#E11553] hover:underline text-sm font-medium">
                  Forgotten password?
                </a>
              </div>

              <hr className="my-5 border-gray-200" />

              <div className="flex justify-center pb-2">
                <button
                  type="button"
                  className="bg-[#E11553] hover:bg-[#C11246] text-white font-bold text-[17px] py-3 px-6 rounded-md transition-colors"
                  onClick={() => setIsHiringOpen(true)}
                >
                  Apply Here
                </button>
              </div>
            </form>
          </div>

          <div className="text-center mt-6 text-sm text-gray-600">
            <span className="font-bold text-gray-800">Admin Portal</span> is restricted to authorized personnel only.
          </div>
        </div>

      </div>

      <HiringModal isOpen={isHiringOpen} onClose={() => setIsHiringOpen(false)} />
    </div>
  );
}