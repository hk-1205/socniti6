export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#112A22",
        leaf: "#4A7C59",
        clay: "#E18D58",
        mist: "#F7F3E9",
        ember: "#D44727"
      },
      fontFamily: {
        display: ["Poppins", "sans-serif"],
        body: ["Manrope", "sans-serif"]
      },
      boxShadow: {
        soft: "0 20px 60px rgba(17, 42, 34, 0.12)"
      }
    }
  },
  plugins: []
};
