import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/services.css";
import API from "../api";

export default function Services() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await API.get("services/");
      setServices(res.data.services || []);
    } catch (err) {
      console.error("Failed to fetch services:", err);
      // Fallback to default services if API fails - includes all services from ServicesCarousel
      setServices([
        {
          id: 1,
          name: "Flat Tire Repair",
          description: "Puncture repairs or spare tire installation at your location. We handle all vehicle types from hatchbacks to SUVs.",
          price: "Starts at ₹299",
          icon: "fas fa-tools",
          features: [
            "On-site Puncture Repair",
            "Spare Wheel Swapping",
            "Air Pressure Check"
          ],
          image: "/assets/images/service1.jpg"
        },
        {
          id: 2,
          name: "Battery Jumpstart",
          description: "Dead battery? Our mechanics carry heavy-duty jump cables and portable starters to get you moving instantly.",
          price: "Starts at ₹199",
          icon: "fas fa-bolt",
          features: [
            "Voltage Testing",
            "Terminal Cleaning",
            "New Battery Replacement (Optional)"
          ],
          image: "/assets/images/service2.jpg"
        },
        {
          id: 3,
          name: "Emergency Towing",
          description: "Safe and secure towing to the nearest workshop or your preferred destination when the car cannot be fixed on-site.",
          price: "Starts at ₹999",
          icon: "fas fa-truck-pickup",
          features: [
            "Flatbed Towing available",
            "24/7 Availability",
            "Long-distance Towing"
          ],
          image: "/assets/images/service3.jpg"
        },
        {
          id: 4,
          name: "Fluid Delivery",
          description: "Run out of engine oil, coolant, or other fluids? We'll deliver and top up fluids to get you back on the road.",
          price: "Starts at ₹399",
          icon: "fas fa-gas-pump",
          features: [
            "Engine Oil Delivery",
            "Coolant & Water Delivery",
            "Brake Fluid Top-up"
          ],
          image: "/assets/images/service4.jpg"
        },
        {
          id: 5,
          name: "Scanning & Diagnostics",
          description: "Professional scanning and diagnostics to identify engine issues and provide detailed reports for your vehicle.",
          price: "Starts at ₹499",
          icon: "fas fa-cog",
          features: [
            "OBD-II Scanning",
            "Error Code Reading",
            "Detailed Diagnostic Report"
          ],
          image: "/assets/images/service6.jpg"
        },
        {
          id: 6,
          name: "Brake Repair",
          description: "Brake issues? Our mechanics can diagnose and fix brake problems on-site when possible, ensuring your safety.",
          price: "Starts at ₹599",
          icon: "fas fa-circle-notch",
          features: [
            "Brake Pad Replacement",
            "Brake Fluid Check",
            "Brake System Inspection"
          ],
          image: "/assets/images/service6.jpg"
        },
        {
          id: 7,
          name: "Key & Lockout",
          description: "Locked out of your vehicle? Our experts can help you get back inside safely without damaging your car.",
          price: "Starts at ₹349",
          icon: "fas fa-key",
          features: [
            "Car Lockout Service",
            "Key Duplication",
            "Remote Programming"
          ],
          image: "/assets/images/service6.jpg"
        },
        {
          id: 8,
          name: "Minor On-site Fixes",
          description: "Quick fixes for minor issues like loose wires, fuses, belts, and other small repairs that can be done on-site.",
          price: "Starts at ₹249",
          icon: "fas fa-wrench",
          features: [
            "Fuse Replacement",
            "Belt Adjustments",
            "Minor Electrical Fixes"
          ],
          image: "/assets/images/service6.jpg"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleBookService = (serviceName) => {
    const serviceMap = {
      "Flat Tire Repair": "tire",
      "Battery Jumpstart": "battery",
      "Emergency Towing": "tow",
      "Fluid Delivery": "fluid",
      "Fuel Delivery": "fuel",
      "Scanning & Diagnostics": "diagnostics",
      "Engine Diagnostics": "diagnostics",
      "Brake Repair": "brake",
      "Key & Lockout": "lockout",
      "Minor On-site Fixes": "minor"
    };
    const serviceParam = serviceMap[serviceName] || "general";
    navigate(`/request?service=${serviceParam}`);
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      question: "How long does it take for a mechanic to arrive?",
      answer: "On average, our mechanics reach you within 15-30 minutes."
    },
    {
      question: "Do I need to pay a subscription fee?",
      answer: "No, there are no monthly fees. You only pay per service."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept cash, UPI, credit/debit cards, and digital wallets."
    },
    {
      question: "Are your mechanics certified?",
      answer: "Yes, all our mechanics are certified professionals with years of experience."
    },
    {
      question: "Do you service all vehicle types?",
      answer: "Yes, we service 2-wheelers, 4-wheelers, and EV vehicles."
    }
  ];

  return (
    <>
      <Navbar />
      
      {/* HERO */}
      <section className="services-hero">
        <div className="container">
          <h1>Reliable Roadside Services</h1>
          <p>From flat tires to engine failures, we've got you covered 24/7.</p>
        </div>
      </section>

      {/* SERVICES */}
      <section className="services-detail-section">
        <div className="container">
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <p>Loading services...</p>
            </div>
          ) : (
            <div className="services-grid">
              {services.map((service) => (
                <div key={service.id} className="service-detail-card">
                  <div className="service-img">
                    <img 
                      src={service.image || "/assets/images/service1.jpg"} 
                      alt={service.name}
                      onError={(e) => {
                        e.target.src = "/assets/images/service1.jpg";
                      }}
                    />
                    <span className="price-tag">{service.price}</span>
                  </div>
                  <div className="service-info">
                    <h3>
                      <i className={service.icon || "fas fa-wrench"}></i> {service.name}
                    </h3>
                    <p>{service.description}</p>
                    <ul className="service-features">
                      {service.features?.map((feature, idx) => (
                        <li key={idx}>
                          <i className="fas fa-check"></i> {feature}
                        </li>
                      ))}
                    </ul>
                    <button 
                      className="service-btn"
                      onClick={() => handleBookService(service.name)}
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section">
        <div className="container">
          <header className="section-header">
            <h2 className="section-title">Common Questions</h2>
            <p className="section-subtitle">
              Everything you need to know about our emergency roadside assistance.
            </p>
          </header>

          <div className="faq-container">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className={`faq-item ${openFaq === index ? "active" : ""}`}
              >
                <button 
                  className="faq-question"
                  onClick={() => toggleFaq(index)}
                >
                  <span>{faq.question}</span>
                  <i className="fas fa-chevron-down"></i>
                </button>
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
