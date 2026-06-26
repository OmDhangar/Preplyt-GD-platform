import { useAuthStore } from "@/lib/auth-store";
import { apiPost } from "@/lib/api";
import type { AuthResponse, Role } from "@/lib/types";
import { disconnectSocket } from "@/lib/socket";

export function useAuth() {
  const { user, accessToken, hydrated, setAuth, clear } = useAuthStore();

  const login = async (email: string, password: string) => {
    const data = await apiPost<AuthResponse>("/auth/login", {
      email,
      password,
    });
    setAuth(data);
    return data.user;
  };

  const register = async (input: {
    name: string;
    email: string;
    password: string;
    role: Role;
  }) => {
    const data = await apiPost<AuthResponse>("/auth/register", input);
    setAuth(data);
    return data.user;
  };

  const loginGoogle = async (token: string, role: Role) => {
    const data = await apiPost<AuthResponse>("/auth/google", {
      token,
      role,
    });
    setAuth(data);
    return data.user;
  };

  const logout = async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    try {
      if (refreshToken) await apiPost("/auth/logout", { refreshToken });
    } catch {
      // best effort
    }
    disconnectSocket();
    clear();
  };

  return {
    user,
    role: user?.role,
    isAuthenticated: !!accessToken && !!user,
    hydrated,
    login,
    register,
    loginGoogle,
    logout,
  };
}
