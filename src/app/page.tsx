import React from "react";
import DomainEvaluator from "../components/DomainEvaluator";
import { Downasaur, Coin, Heart } from "@nsmr/pixelart-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-brand-surface min-h-[100vh]">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-brand-primary tracking-tighter mb-2 flex items-center justify-center gap-2">
            <Downasaur className="h-6 w-6" />
            Domainosaurr
          </h1>
          <p className="text-brand-secondary text-sm">
            World's best domain valuator <br/>Using 10 core factors
          </p>
        </div>
        <DomainEvaluator />

        {/* Animated Coin */}
        <div className="flex justify-center mt-12 px-4">
          <Coin className="h-24 w-24 opacity-80 hover:opacity-100 transition-opacity duration-300" />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-brand-primary/5 mt-16 py-4">
        <div className="container mx-auto px-4 text-center">
          <p className="text-brand-secondary text-sm flex items-center justify-center gap-1 mb-1">
            Built with
            <Heart className="h-4 w-4 text-red-500" />
            by{" "}
            <a
              href="https://github.com/madegit"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-primary hover:underline font-medium"
            >
              madé
            </a>
          </p>
          <p className="text-brand-secondary text-xs">
            © 2025 Domainosaurr - All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
