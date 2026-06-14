export default {
  presets: ["babel-preset-expo"],
  plugins: [
    "nativewind/babel",
    [
      "module-resolver",
      {
        root: ["./src"],
        alias: {
          "@navigation": "./src/navigation",
          "@services": "./src/services",
          "@screens": "./src/screens",
          "@components": "./src/components",
          "@hooks": "./src/hooks",
          "@lib": "./src/lib",
          "@store": "./src/store",
          "@constants": "./src/constants",
          "@utils": "./src/utils",
          "@db": "./src/db",
        },
      },
    ],
  ],
};
