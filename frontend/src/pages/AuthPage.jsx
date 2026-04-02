import { useState } from "react";
import axios from "axios";

export default function AuthPage() {
  const [mode, setMode] = useState("login");

  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "family",
    name: "",
  });

  const handleSubmit = async () => {
    try {
      if (mode === "signup") {
        await axios.post("https://noctisfinal.onrender.com/api/users/signup", form);
        alert("Account created. Please login.");
        setMode("login");
      } else {
        const res = await axios.post(
          "https://noctisfinal.onrender.com/api/users/login",
          form,
        );

        const user = res.data;

        // ✅ changed only this line
        sessionStorage.setItem("user", JSON.stringify(user));

        window.location.href = "/dashboard";
      }
    } catch (err) {
      alert(err.response?.data?.message || "Error");
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-[#020617] text-white relative overflow-hidden p-4">
      {/* background glow */}
      <div className="absolute w-[600px] h-[600px] bg-blue-500/10 blur-[120px] rounded-full -top-40 -left-40" />
      <div className="absolute w-[600px] h-[600px] bg-purple-500/10 blur-[120px] rounded-full -bottom-40 -right-40" />

      <div className="relative bg-gradient-to-br from-slate-900 to-[#020617] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col z-10">
        
        {/* Header */}
        <div className="p-8 border-b border-white/5 bg-white/5">
          <h2 className="text-2xl font-bold text-center text-white">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-sm text-gray-400 text-center mt-2">
            {mode === "login" ? "Enter your credentials to access your account" : "Sign up to get started"}
          </p>
        </div>

        {/* Body */}
        <div className="p-8 flex flex-col gap-5 bg-black/20">
          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Name</label>
              <input
                placeholder="Enter your name"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          )}

          <div>
             <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
             <input
               placeholder="name@example.com"
               className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
               onChange={(e) => setForm({ ...form, email: e.target.value })}
             />
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
             <input
               type="password"
               placeholder="Enter your password"
               className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
               onChange={(e) => setForm({ ...form, password: e.target.value })}
             />
          </div>



          <button
            onClick={handleSubmit}
            className="mt-4 w-full px-6 py-3.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold hover:bg-blue-500 hover:text-white hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all flex items-center justify-center gap-2"
          >
            {mode === "login" ? "Login" : "Create Account"}
          </button>

          <div
            className="text-sm cursor-pointer text-gray-400 text-center hover:text-white transition-colors mt-2 font-medium"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Login"}
          </div>
        </div>
      </div>
    </div>
  );
}

