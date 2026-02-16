import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import ServicesCarousel from "../components/ServicesCarousel";
import Footer from "../components/Footer";
import "../styles/style.css";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />

      <section className="section">
        <h2>Why Choose MechOnCall?</h2>
        <div className="grid">
          <div className="card">⚡ 10-Minute Response</div>
          <div className="card">✅ Verified Mechanics</div>
          <div className="card">💰 Transparent Pricing</div>
          <div className="card">📍 Live Tracking</div>
        </div>
      </section>

      <section className="section light">
        <h2>How It Works</h2>
        <div className="grid">
          <div className="card">1️⃣ Detect Your Location</div>
          <div className="card">2️⃣ Request a Mechanic</div>
          <div className="card">3️⃣ Get Instant Help</div>
        </div>
      </section>

      <ServicesCarousel />

      <section className="section">
        <h2>What Our Users Say</h2>
        <p className="testimonial">
          “My car stopped at midnight and a mechanic arrived in 8 minutes.
          Truly life-saving service!” ⭐⭐⭐⭐⭐
        </p>
      </section>

      <Footer />
    </>
  );
}
