import { QueryClient } from "@tanstack/react-query";
import axios from "axios";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (tentativa, erro) => {
        if (!axios.isAxiosError(erro)) return tentativa < 1;
        const status = erro.response?.status ?? 0;
        if (status >= 400 && status < 500) return false;
        return tentativa < 2;
      },
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
});
