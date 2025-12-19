import React from "react";
import { useAuth } from "../contexts/AuthContext";
import GeminiLogoInline from "./icons/GeminiLogoInline";

export const WelcomeScreen: React.FC = () => {
  const { user } = useAuth();

  const getUserName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  return (
    <div className="w-full max-w-4xl flex flex-col mx-4 items-start gap-2">
      <div className="flex items-center gap-2 md:gap-3">
        <GeminiLogoInline size={32} duration={1.5} />
        <h1
          className="text-3xl md:text-5xl font-medium animate-slide-in-right opacity-0"
          style={{ animationDelay: '200ms' }}
        >
          <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 text-transparent bg-clip-text">
            Hi {getUserName()}
          </span>
        </h1>
      </div>

    </div>

  );
};