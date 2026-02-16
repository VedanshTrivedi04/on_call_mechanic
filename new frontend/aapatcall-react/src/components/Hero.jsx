import heroVideo from "../assets/videos/homepage.mp4";
export default function Hero() {
    return (
      <section className="hero">
  
        <video autoPlay muted loop playsInline className="hero-video">
          <source src={heroVideo} type="video/mp4" />
        </video>
  
        <div className="hero-overlay"></div>
  
        <div className="hero-content">
          <h1>Instant Mechanic On Call 🚗</h1>
          <p>Fast • Trusted • Roadside Assistance in Minutes</p>
          <a href="/request" className="cta-btn">Find Mechanic Near You</a>
        </div>
  
      </section>
    );
  }
  