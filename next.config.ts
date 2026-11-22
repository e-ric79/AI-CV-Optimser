import type { NextConfig } from "next";

type PromiseWithTry = typeof Promise & {
  try?: <T>(callback: (...args: unknown[]) => T | PromiseLike<T>, ...args: unknown[]) => Promise<T>;
};

const PromiseWithTrySupport = Promise as PromiseWithTry;

if (!PromiseWithTrySupport.try) {
  Object.defineProperty(PromiseWithTrySupport, "try", {
    configurable: true,
    writable: true,
    value: <T>(callback: (...args: unknown[]) => T | PromiseLike<T>, ...args: unknown[]) =>
      new Promise<T>((resolve, reject) => {
        try {
          resolve(callback(...args));
        } catch (error) {
          reject(error);
        }
      }),
  });
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
