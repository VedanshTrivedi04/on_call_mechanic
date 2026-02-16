import { useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/about.css";

export default function About() {
  // (Optional) sidebar handlers if you later add sidebar div
  useEffect(() => {
    window.openSidebar = () => {
      const el = document.getElementById("sidebar");
      if (el) el.style.width = "250px";
    };
    window.closeSidebar = () => {
      const el = document.getElementById("sidebar");
      if (el) el.style.width = "0";
    };
  }, []);

  return (
    <>
      <Navbar />
      
      {/* HERO */}
      <section className="about-hero">
        <div className="container">
          <h1>Our Mission: Never Let You Be Stranded</h1>
          <p>Combining technology with traditional mechanical expertise to serve Central India.</p>
        </div>
      </section>

      {/* STORY */}
      <section className="story-section">
        <div className="container grid-2">
          <div className="story-text">
            <h2 className="section-title">
              The Story Behind <span>आपातCall</span>
            </h2>

            <p>
              Founded in 2026, <strong>आपातCall</strong> was born out of a simple observation:
              finding a reliable mechanic in the middle of the night or on a highway shouldn't be a matter of luck.
            </p>

            <p>
              We started in <strong>Indore</strong> with a small network of 10 verified mechanics.
              Today, we have expanded across <strong>Bhopal, Ujjain, and Ratlam</strong>,
              connecting thousands of motorists to help within minutes.
            </p>

            <div className="stats-grid">
              <div className="stat-item">
                <h3>500+</h3>
                <p>Verified Mechanics</p>
              </div>

              <div className="stat-item">
                <h3>15k+</h3>
                <p>Help Requests</p>
              </div>

              <div className="stat-item">
                <h3>20min</h3>
                <p>Avg. Response Time</p>
              </div>
            </div>
          </div>

          <div className="story-image">
            <img
              src="https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?q=80&w=1000"
              alt="Mechanic helping user"
            />
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="values-section">
        <div className="container">
          <h2 className="section-title text-center">Our Core Values</h2>

          <div className="values-grid">
            <div className="value-card">
              <i className="fas fa-shipping-fast"></i>
              <h3>Radical Speed</h3>
              <p>
                Every minute feels like an hour when you're stranded.
                We optimize every second of our dispatch process.
              </p>
            </div>

            <div className="value-card">
              <i className="fas fa-user-shield"></i>
              <h3>Absolute Trust</h3>
              <p>
                Safety first. Every mechanic on our platform is
                background-checked and vetted for technical skill.
              </p>
            </div>

            <div className="value-card">
              <i className="fas fa-hand-holding-usd"></i>
              <h3>Fair Pricing</h3>
              <p>
                No exploitation. We maintain transparent rates
                even during late-night emergencies.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
